# 자료 작성 상태/저장/동시성 계약

작성일: 2026-04-24  
대상: `DocumentBlueprint`, `writingState`, autosave, background drafting, retry, cross-tab 동작

## 1. 목적

자료 작성 기능은 사용자 편집과 background drafting이 같은 문서 레코드를 공유한다.  
따라서 registry 분리보다 먼저 아래를 고정해야 한다.

1. 저장 단위
2. 충돌 도메인
3. `jobId` 의미
4. autosave와 background patch 우선순위
5. retry와 stale write 차단 규칙

이 문서는 문서 작성 기능의 상태/저장/동시성 계약을 정의한다.

## 2. 저장 단위

기본 저장 단위는 `DocumentBlueprint` 1건이다.

포함 범위:

1. 문서 메타데이터
2. 섹션 본문
3. `plateValue`
4. `tables`
5. `figures`
6. `sourceRefs`
7. `writingState`

규칙:

1. `writingState`는 별도 store로 분리하지 않는다.
2. `updatedAt` 기반 optimistic lock은 유지한다.
3. 문서 저장과 상태 저장은 논리적으로 같은 레코드에서 다룬다.

## 3. 세 가지 실행 모드

### 3.1 `manualBlank`

의미:

1. 사용자가 source 없이 빈 문서를 연다.
2. 자동 drafting job은 바로 시작하지 않는다.

invariant:

1. 최소 하나의 section을 가진 문서가 생성된다.
2. `writingState.status`는 `idle`이다.
3. source binding 부족은 오류가 아니다.

### 3.2 `sourceBoundDraft`

의미:

1. 결과 화면/프로젝트 허브/`/papers`에서 source를 바인딩해 문서를 연다.
2. 문서 생성 직후 background drafting이 가능해야 한다.

invariant:

1. `sourceRefs` 또는 `figures`가 실제로 연결되어야 한다.
2. 연결 실패 시 drafting 문서를 만들지 않는다.
3. 초기 상태는 `collecting`에서 시작한다.

### 3.3 `retry`

의미:

1. 기존 문서를 유지한 채 writing job만 다시 시작한다.

invariant:

1. 문서 ID는 바뀌지 않는다.
2. retry는 새 `jobId`를 부여한다.
3. 이전 `jobId`에서 늦게 도착한 patch는 stale write로 폐기한다.

## 4. `jobId` 계약

`jobId`는 “현재 문서에 유효한 background writing run”의 식별자다.

규칙:

1. 문서당 활성 `jobId`는 하나만 유효하다.
2. retry가 시작되면 새 `jobId`가 persisted `writingState`에 먼저 기록된다.
3. 그 후 도착하는 모든 patch는 자신의 `jobId`가 현재 persisted `jobId`와 같은지 확인해야 한다.
4. 일치하지 않으면 patch를 버린다.

구현 수준 의미:

1. persisted `jobId`: 정답 기준
2. in-memory running job map: 중복 실행 방지용 로컬 최적화

즉, in-memory guard는 성능 장치이고, stale 여부의 진짜 기준은 persisted `jobId`다.

## 5. 충돌 도메인

기본 원칙:

1. 사용자 본문 편집과 background patch는 같은 `DocumentBlueprint` 충돌 도메인을 공유한다.
2. hidden last-write-wins는 금지한다.

허용 방식:

1. 저장 직전 최신 문서를 다시 로드한다.
2. 최신 persisted `jobId`가 다르면 stale write로 폐기한다.
3. 최신 문서를 기준으로 merge 가능한 필드만 다시 계산해 저장한다.

금지:

1. background writer가 오래된 snapshot을 그대로 덮어쓰기
2. autosave가 `writingState`를 통째로 비우거나 되돌리기

## 6. autosave vs background drafting 우선순위

기본 원칙:

1. 사용자 편집이 본문 우선이다.
2. background drafting은 생성된 section에만 보수적으로 patch한다.

실무 규칙:

1. 사용자가 drafting 중인 section을 최초 편집하는 순간 해당 section은 사용자 소유로 전환된다.
2. 그 section의 body patch는 즉시 `skipped`된다.
3. structured sidecar는 merge 정책이 허용하는 범위에서만 반영된다.

즉, background drafting은 사용자 소유로 승격된 section의 본문을 건드리지 않는다.

## 7. cross-tab 계약

현재 방침:

1. cross-tab은 persisted `jobId` + `updatedAt` 기준의 best-effort 동작으로 유지한다.
2. 별도 lease/owner 모델은 아직 도입하지 않는다.

이 의미는:

1. 동시에 두 탭이 문서를 열어도 최종 유효성 기준은 persisted state다.
2. 특정 탭이 “작성 owner”임을 강제하지 않는다.
3. 추후 multi-tab 문제가 실제로 커지면 lease 모델을 재검토한다.

## 8. 문서/섹션 상태 전이

### 8.1 문서 상태

허용 전이:

1. `idle -> collecting`
2. `collecting -> drafting`
3. `drafting -> patching`
4. `patching -> completed`
5. `collecting | drafting | patching -> failed`
6. `failed -> collecting` (`retry`)

### 8.2 섹션 상태

허용 전이:

1. `idle -> drafting`
2. `drafting -> patched`
3. `drafting -> skipped`
4. `drafting -> failed`
5. `failed -> drafting` (`retry`)

## 9. 실패 계약

실패는 세 층으로 구분한다.

1. 세션 시작 실패
2. 섹션 patch 실패
3. 문서 저장 실패

원칙:

1. source binding이 안 되면 세션 시작 자체를 실패시킨다.
2. source 하나 또는 section 하나가 실패해도 가능한 범위에서 나머지는 계속 진행한다.
3. 저장 실패는 문서 레벨 `failed`로 올릴 수 있다.
4. 실패 이유는 toast만이 아니라 persisted 상태 또는 화면 배너에서도 확인 가능해야 한다.

## 10. 테스트 게이트

registry 추출 전 최소 회귀 게이트:

1. `manualBlank`는 `idle` 문서를 만든다.
2. `sourceBoundDraft`는 source binding 없는 경우 실패한다.
3. retry는 새 `jobId`를 발급하고 stale write를 차단한다.
4. user edit 이후 같은 section 본문은 background patch되지 않는다.
5. 하나의 source 실패가 전체 drafting을 불필요하게 중단시키지 않는다.
6. export는 migrated 문서에서도 계속 동작한다.

## 11. 보류 항목

1. `writingState`를 별도 저장소로 분리할지 여부
2. cross-tab lease/owner 모델 도입 여부
3. section별 partial 상태를 `partial`로 명시적으로 올릴지 여부
