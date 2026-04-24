# 자료 작성 아키텍처 계획

작성일: 2026-04-24  
범위: 논문/보고서/기술노트 등 자료 작성 기능 전반의 공통 모듈, 공통 컴포넌트, 확장 전략

## 1. 목적

자료 작성 기능은 앞으로 문서 종류, 분석 도메인, 결과 타입이 계속 바뀔 가능성이 높다.  
따라서 특정 분석 화면이나 특정 논문 형식에 맞춘 구현보다, 다음 두 가지를 먼저 고정해야 한다.

1. 변하는 도메인 결과를 문서 작성 파이프라인에 연결하는 공통 계약
2. 문서 작성 상태, 편집, patch, export를 처리하는 공통 플랫폼

핵심 원칙은 다음과 같다.

1. 새 분석 도구가 들어와도 `DocumentEditor`와 문서 상태 모델은 최대한 그대로 유지한다.
2. 새 논문 종류가 들어와도 writer registry와 preset registry 확장만으로 대응한다.
3. 특정 도메인 제거 시에도 adapter/writer만 제거하고 문서 코어는 흔들지 않는다.

## 2. 목표 상태

사용자 흐름은 어떤 결과 타입에서 시작하든 동일해야 한다.

1. 결과 화면 또는 프로젝트 허브에서 `자료 작성` 시작
2. 빈 `DocumentBlueprint` 생성
3. 에디터 즉시 진입
4. `writingState`에 따라 `collecting/drafting/patching/completed/failed` 표시
5. 섹션별 writer가 초안을 patch
6. 사용자가 직접 수정
7. export는 별도 계층에서 처리

즉, “문서를 만드는 기능”과 “도메인 결과를 문서에 연결하는 기능”을 분리해야 한다.

## 2.1 Agent 리뷰 반영 핵심 결론

agent 검토 결과, 현재 계획의 큰 방향은 맞지만 registry 추출보다 먼저 잠가야 할 계약이 더 중요하다는 점이 확인되었다.

우선 확정해야 할 항목은 다음과 같다.

1. `DocumentBlueprint` 저장/충돌/동시성 계약
2. `DocumentSection` 필드별 merge matrix
3. adapter와 writer 사이의 정규화 중간 모델
4. `manualBlank`와 `sourceBoundDraft`의 모드 분리
5. registry 추출 전 behavior baseline 테스트 게이트

즉, 지금의 우선순위는 “구조 분리”보다 “행동 계약 고정”이다.

## 3. 아키텍처 원칙

### 3.1 변하지 않아야 하는 코어

아래는 도메인 변경과 무관하게 유지해야 하는 공통 코어다.

1. `DocumentBlueprint`
2. `DocumentSection`
3. `writingState`
4. `sourceRefs`
5. section patch / merge 규칙
6. editor 상태 UI

이 계층은 통계, 그래프, bio-tools, genetics, 향후 신규 분석 종류를 알지 않아야 한다.

### 3.2 자주 변하는 도메인 계층

아래는 변동 가능성이 큰 영역이다.

1. 결과 타입별 저장 구조
2. 결과 타입별 요약/해석 방식
3. 논문 종류별 section 구성
4. 결과 타입별 methods/results/caption writer

이 계층은 registry + adapter + writer 구조로 흡수해야 한다.

## 4. 공통 모듈 계획

### 4.1 Document Core

역할:

1. 문서 타입과 section 타입 정의
2. writing state / section state 정의
3. normalize / storage / conflict 처리
4. source usage 추적

후보 파일:

1. `stats/lib/research/document-blueprint-types.ts`
2. `stats/lib/research/document-blueprint-storage.ts`
3. `stats/lib/research/document-writing.ts`

규칙:

1. 새 도메인 결과 추가 시 core 타입 수정은 최소화한다.
2. `DocumentSourceRef.kind`는 꼭 필요한 경우에만 늘린다.
3. 사용자 편집 보존 규칙은 core helper에 둔다.

추가 결정 필요:

1. `writingState` 갱신과 사용자 본문 편집이 같은 conflict domain을 공유하는지
2. background drafting job과 editor autosave가 어떤 우선순위로 충돌을 해결하는지
3. cross-tab 동작을 best-effort로 둘지, persisted lease/owner 모델까지 둘지
4. `sourceRefs`가 provenance 모델인지 writer hint인지, 또는 둘 다인지

권장 방침:

1. `DocumentBlueprint` 단위 저장은 유지하되, 동시성 계약을 문서로 먼저 고정한다.
2. `jobId`는 persisted state와 in-memory guard의 역할을 분리해서 정의한다.
3. `writingState` 전이는 허용 상태 전이표로 명시한다.

### 4.2 Writing Session

역할:

1. 결과 화면/프로젝트 허브/`/papers`에서 공통 진입점 제공
2. 빈 문서 생성
3. source binding 연결
4. 문서 생성 실패 조건 검증

후보 파일:

1. `stats/lib/research/document-writing-session.ts`

필수 요구:

1. `startWritingSession(...)` 수준의 단일 진입 API 유지
2. 진입 컴포넌트는 직접 source binding 로직을 갖지 않음
3. source가 실제로 연결되지 않으면 빈 drafting 문서를 만들지 않음

추가 결정:

1. `manualBlank`: 사용자가 직접 빈 문서를 여는 모드
2. `sourceBoundDraft`: 결과 source를 바인딩해 자동 작성 세션을 여는 모드
3. `retry`: 기존 source binding을 유지한 채 writing job만 다시 시작하는 모드

위 세 모드는 이름과 invariant를 분리해서 관리한다.

### 4.3 Source Adapter Layer

역할:

1. 통계/그래프/bio/genetics 결과를 공통 문서 입력 구조로 변환
2. 결과 저장소 차이를 editor/orchestrator로 누수시키지 않음

권장 구조:

1. `DocumentSourceAdapterRegistry`
2. `supports(ref)`
3. `load(ref, ctx)`
4. `summarize(source)`

중간 정규화 모델:

registry 분리 전에 `NormalizedWritingSource` 계약을 먼저 고정한다.

필수 필드 예시:

1. `sourceId`
2. `sourceType`
3. `entityKind`
4. `title`
5. `provenance`
6. `capabilities`
7. `artifacts`

`capabilities` 예시:

1. `canWriteMethods`
2. `canWriteResults`
3. `canWriteCaptions`
4. `canWriteSupplement`

`artifacts` 예시:

1. `analysisDraft`
2. `resultNarrative`
3. `tables`
4. `figures`
5. `metrics`
6. `attachments`

확장 전략:

1. 새 결과 타입 추가 시 adapter 1개 추가
2. 기존 editor/orchestrator 수정은 최소화

원칙:

1. adapter는 storage 차이를 흡수한다.
2. writer는 raw storage를 직접 읽지 않고 `NormalizedWritingSource`만 받는다.
3. `unknown` fallback는 마지막 방어선으로만 허용한다.

### 4.4 Section Writer Registry

역할:

1. section별 초안 생성
2. 결과 타입별 문장/표/caption 생성
3. fallback writer 제공

권장 구조:

1. `DocumentSectionWriterRegistry`
2. `supports(section, source)`
3. `write(context)`
4. `priority`

writer 선택 기준:

`sourceKinds`만으로 고르지 않고, `NormalizedWritingSource.sourceType`, `capabilities`, `artifacts`를 기준으로 선택한다.

writer 결과 계약 예시:

1. `bodyPatch`
2. `tables`
3. `figures`
4. `sourceRefs`
5. `status: patched | skipped | failed`
6. `message`

writer 종류 예시:

1. `analysis-methods-writer`
2. `analysis-results-writer`
3. `figure-caption-writer`
4. `blast-results-writer`
5. `protein-results-writer`
6. `supplementary-fallback-writer`

규칙:

1. orchestrator는 writer를 선택하고 patch만 수행
2. writer 내부에서 storage 직접 접근 금지에 가깝게 제한
3. writer 실패가 전체 문서를 망치지 않도록 source 단위 skip 허용
4. source 단위 결과를 집계해 section 상태를 `complete / partial / failed` 수준으로 해석 가능하게 한다

### 4.5 Export Layer

역할:

1. HTML / DOCX / Markdown / 패키지 export
2. 작성 파이프라인과 독립된 output 변환

규칙:

1. writer는 export 형식을 몰라야 한다.
2. export는 `DocumentBlueprint` 또는 assembled document만 받는다.
3. 특정 논문 형식 요구는 export preset으로 푼다.

## 5. 공통 컴포넌트 계획

### 5.1 Editor Control UI

공통 컴포넌트 후보:

1. `DocumentEditorToolbar`
2. `DocumentWritingStatusBadge`
3. `DocumentWritingBanner`
4. `RetryWritingButton`
5. `SectionWritingPanel`
6. `SectionWritingBadge`
7. `SectionWritingControl`

역할:

1. 작성 중 상태 노출
2. 자동 작성 중단
3. 직접 편집 전환
4. 실패 재시도

원칙:

1. badge/button 같은 leaf component만 추출하지 않는다.
2. toolbar 단위와 section panel 단위의 상위 경계를 먼저 정의한다.

### 5.2 Writing Entry UI

공통 컴포넌트 후보:

1. `WritingEntrySurface`
2. `StartWritingButton`
3. `WritingSourceCard`
4. `WritingSourceList`

역할:

1. 결과 타입과 무관하게 같은 CTA 제공
2. loading / disabled / error 처리 통일

원칙:

1. 단순 버튼 공통화만으로는 충분하지 않다.
2. 결과 화면 / 프로젝트 허브 / `/papers` / Graph Studio가 서로 다른 레이아웃을 가져도 prerequisite, pending, error, source summary 규칙은 같은 surface가 책임진다.
3. disabled 상태에는 반드시 이유를 보여준다.

### 5.3 Material/Source UI

공통 컴포넌트 후보:

1. `DocumentSourceBadge`
2. `DocumentSourceUsageList`
3. `FigureSourceCard`
4. `SupplementarySourceBlock`

역할:

1. 문서가 어떤 결과를 기반으로 쓰였는지 시각화
2. 결과 변경 시 refresh/relink 판단 보조

## 6. Registry 중심 확장 전략

앞으로의 변동은 대부분 registry에서 흡수해야 한다.

필요 registry:

1. `document-preset-registry`
2. `document-source-adapter-registry`
3. `document-section-writer-registry`
4. `document-export-preset-registry`
5. `document-writing-entry-registry` (선택)

원칙:

1. 새 논문 종류 추가 = preset 등록
2. 새 결과 타입 추가 = adapter + writer 등록
3. 새 export 형식 추가 = export preset 등록
4. UI는 registry metadata를 읽어 렌더

## 7. 반드시 지켜야 할 불변 조건

1. 사용자 편집 섹션은 자동 patch가 덮어쓰지 않는다.
2. drafting job은 stale write를 차단한다.
3. source binding 없는 문서는 자동 작성 세션으로 시작하지 않는다.
4. editor는 도메인별 결과 저장 구조를 직접 해석하지 않는다.
5. export는 writer 내부 로직과 결합하지 않는다.
6. 결과 타입 하나가 실패해도 가능한 범위에서 부분 작성은 계속된다.

추가 불변 조건:

1. `manualBlank`와 `sourceBoundDraft`는 서로 다른 entry invariant를 가진다.
2. section field별 merge 정책은 문서화된 표를 따른다.
3. background job progress와 user autosave의 우선순위는 암묵적 last-write-wins로 두지 않는다.
4. transient toast만으로 실패를 설명하지 않고, editor/entry surface에 persistent 상태를 남긴다.

## 8. 단계별 실행 계획

### Phase 0. behavior baseline 고정

registry 추출 전에 현재 동작을 테스트 기준선으로 잠근다.

최소 게이트:

1. 결과 화면 / 프로젝트 허브 / `/papers` 진입점이 동일한 session contract를 사용하는지
2. blank `DocumentBlueprint` 생성 → editor 진입 → writing state 전이 흐름이 유지되는지
3. user edit 섹션이 background patch에 덮어써지지 않는지
4. stale write가 최신 job을 되돌리지 못하는지
5. partial failure가 전체 drafting을 불필요하게 중단시키지 않는지
6. migrated 문서가 기존 export 경로와 호환되는지

### Phase 1. 코어 안정화

1. `DocumentBlueprint` / `writingState` / merge 규칙 고정
2. session 생성 경로 공통화
3. editor 상태 UI 공통 컴포넌트화
4. 상태/저장 계약 문서와 merge matrix 문서를 함께 잠금

### Phase 1.5. 정규화 source 계약 고정

1. `NormalizedWritingSource` 타입 정의
2. orchestrator input/output 계약 고정
3. writer가 raw storage를 직접 보지 않게 경계 확정

### Phase 2. Adapter / Writer 분리

1. 현재 orchestrator 내부 분기 로직을 writer registry로 이동
2. 첫 대상은 `blast/protein` 전용 writer로 제한
3. 나머지 analysis/figure/bio/genetics는 단계적으로 이동
4. 한 번에 전체 registry migration을 하지 않는다

### Phase 3. Preset / 문서 종류 확장

1. paper / report / note / submission preset 분리
2. preset별 section 세트와 필수 metadata 정의

### Phase 4. Export / 패키지 계층 정리

1. export 계층 공통화
2. `ReportComposer`, `PackageBuilder`, 문서 export 역할 재정의

## 9. 당장 고려할 리스크

1. 결과 타입별 raw schema 차이로 인해 writer가 storage 의존으로 커질 수 있음
2. registry 도입 전까지 orchestrator 파일 비대화가 빠르게 진행될 수 있음
3. 문서 종류를 너무 일찍 세분화하면 preset만 늘고 구조는 오히려 복잡해질 수 있음
4. source kind를 과하게 세분화하면 core 타입 churn이 커질 수 있음
5. export 요구를 writer에 섞으면 향후 DOCX/HTML 차이가 문서 작성 로직을 오염시킬 수 있음

## 10. 바로 이어질 작업

1. 상태/저장/동시성 계약 1장 추가
2. `DocumentSection` 필드별 merge matrix 작성
3. `NormalizedWritingSource` 최소 타입 정의
4. `startWritingSession(input)` + `manualBlank/sourceBoundDraft/retry` 모드 명시
5. behavior baseline 테스트 게이트 추가
6. 그 다음 `blast/protein`을 첫 registry migration 대상으로 분리

참조 문서:

1. [`PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md`](./PLAN-DOCUMENT-WRITING-STATE-CONTRACT.md)
2. [`PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md`](./PLAN-DOCUMENT-SECTION-MERGE-MATRIX.md)

## 11. 결정 보류 항목

1. `DocumentSourceRef.kind`를 어디까지 세분화할지
2. preset별 section schema를 얼마나 강하게 강제할지
3. `discussion` 자동 작성 범위를 1차에 넣을지
4. export preset과 document preset을 분리할지 결합할지
5. bio-tools 결과를 generic fallback 중심으로 갈지 도구별 writer까지 갈지
