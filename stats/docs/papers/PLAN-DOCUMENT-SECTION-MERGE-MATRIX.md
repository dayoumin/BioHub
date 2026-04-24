# DocumentSection Merge Matrix

작성일: 2026-04-24  
대상: `DocumentSection` field별 writer/autosave merge 규칙

## 1. 목적

문서 작성에서 가장 위험한 부분은 user edit와 background patch가 같은 section을 갱신할 때다.  
이 문서는 `DocumentSection` 각 필드별 허용 동작을 고정한다.

기본 원칙:

1. 사용자 본문은 최우선 보존
2. background patch는 보수적으로 적용
3. provenance와 structured sidecar는 field별 정책에 따라 별도 판단

## 2. Merge Matrix

| Field | User edit 이후 writer 허용 동작 | 기본 정책 | 비고 |
| --- | --- | --- | --- |
| `title` | 수정 금지 | `never-touch` | section schema가 관리 |
| `content` | 본문 수정 금지 | `skip-after-user-edit` | 가장 강한 보호 대상 |
| `plateValue` | 본문 수정 금지 | `skip-after-user-edit` | `content`와 같은 취급 |
| `sourceRefs` | 보수적 병합 허용 | `merge-dedupe` | provenance 유지 목적 |
| `tables` | 신규/갱신 병합 허용 | `merge-by-id` | 사용자 수동 삭제 정책은 추후 결정 |
| `figures` | 신규/갱신 병합 허용 | `merge-by-entityId` | label/caption drift 주의 |
| `editable` | 수정 금지 | `never-touch` | preset/schema 관리 |
| `generatedBy` | user 승격만 허용 | `user-wins` | 되돌리지 않음 |
| `writingState.sectionStates` | status/message 업데이트 허용 | `state-only` | 본문과 별도 판단 |

## 3. 정책 정의

### 3.1 `never-touch`

writer가 field를 수정하지 않는다.

### 3.2 `skip-after-user-edit`

section이 사용자 소유로 전환된 뒤에는 writer가 해당 field를 수정하지 않는다.

### 3.3 `merge-dedupe`

기존 값과 새 값을 합치되, source identity 기준으로 dedupe한다.

### 3.4 `merge-by-id`

table ID 기준으로 merge한다.

원칙:

1. 기존 user-added table을 함부로 지우지 않는다.
2. 같은 ID의 generated table은 최신 값으로 교체할 수 있다.

### 3.5 `merge-by-entityId`

figure `entityId` 기준으로 merge한다.

원칙:

1. 같은 figure source는 최신 metadata로 갱신 가능
2. unrelated figure는 유지

### 3.6 `user-wins`

한 번 `generatedBy: 'user'`가 되면 template/llm으로 되돌리지 않는다.

## 4. section ownership 규칙

section ownership은 다음 사건으로 user로 승격된다.

1. 사용자가 body를 직접 입력
2. 사용자가 “직접 편집”을 명시적으로 선택

user 소유 section에서는:

1. `content` patch 금지
2. `plateValue` patch 금지
3. `sourceRefs/tables/figures`는 policy 허용 범위만 적용

## 5. 저장 실패/충돌 시 우선순위

1. 최신 persisted 문서를 다시 로드한다.
2. merge 가능한 필드만 재계산한다.
3. body 보호 정책이 적용되면 writer patch를 축소한다.
4. 여전히 충돌하면 writer patch를 포기하고 상태만 `failed/skipped`로 남길 수 있다.

## 6. 테스트 포인트

1. user edit 후 `content`가 덮어써지지 않는지
2. generated table update가 ID 기준으로 교체되는지
3. unrelated table/figure가 유지되는지
4. `generatedBy`가 다시 template로 떨어지지 않는지
5. `sourceRefs`가 중복 없이 누적되는지
