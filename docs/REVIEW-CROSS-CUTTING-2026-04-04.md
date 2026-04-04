# 횡단 아키텍처 리뷰 (2026-04-04)

통계 · 유전적 분석 · Graph Studio 3개 영역 정비 후 도출된 시스템 레벨 관찰.
관련 기존 리뷰: `RESULT_TYPE_ANALYSIS_REVIEW.md`, `REVIEW_IMPROVEMENTS_TODO.md`

---

## 1. Python Worker 결과 타입 경계 (높음)

**현상:** 새로 배선한 14개 메서드 전부 `Record<string, unknown>`을 반환. executor에서 매번 `typeof result.pValue === 'number'` 가드를 반복.

**근본 원인:** Python worker ↔ TS 사이에 계약(contract)이 없음. `Generated.*Result` 타입이 일부 존재하지만 신규 메서드는 전부 untyped.

**기존 분석:** `stats/docs/technical/RESULT_TYPE_ANALYSIS_REVIEW.md` — core common 필드 80%+ 후보 도출 완료 (pValue, statistic, df 등). 그러나 실행 안 됨.

**조치 방향:**
- [ ] 주요 10개 wrapper에 대해 `Generated.*Result` 타입 정의 추가 (arima, mannKendall, logistic, poisson, ordinal, stepwise, doseResponse, responseSurface, manova, mixedModel)
- [ ] `callWorkerMethod<T>`는 이미 제네릭 (`pyodide-core.service.ts:602`). 문제는 wrapper 레벨에서 `Promise<Record<string, unknown>>`을 선택한 것 — 기존 `Generated.*Result` 패턴으로 교체
- [ ] 기존 타입 있는 wrapper (`descriptiveStats`, `shapiroWilkTest`, `binomialTest` 등)와 동일 패턴 적용

**예상:** 2시간 (타입 정의 + executor 리팩터)

---

## 2. Sub-executor 아키텍처 결정 (높음)

**현상:** 두 가지 executor 아키텍처가 공존:
- `StatisticalExecutor` (2700줄, inline 분기, 대부분의 카테고리 처리)
- `executors/AnovaExecutor`, `RegressionExecutor`, `NonparametricExecutor` 등 (부분 사용)

**정정:** `StatisticalExecutor`가 sub-executor를 완전히 무시하는 것은 아님. `CorrelationExecutor`는 활성 사용 중 (`statistical-executor.ts:1737`). 나머지 sub-executor는 `executors/index.ts`에서 export되며 테스트에서 직접 import됨 (`executor-data-extraction.test.ts:36`). "미사용"이 아닌 "부분 채택" 상태.

**기존 분석:** `REVIEW_IMPROVEMENTS_TODO.md` §2.2 handleAnalysis 비대화와 관련.

**조치 방향 (택 1):**
- **A) Sub-executor 전면 활성화:** StatisticalExecutor를 thin dispatcher로 축소, 모든 카테고리를 sub-executor에 위임. CorrelationExecutor 패턴을 나머지에도 적용. 2700줄 → ~300줄 + 카테고리별 ~200줄.
- **B) Sub-executor 정리 + 분할:** 미사용 sub-executor 제거, StatisticalExecutor를 카테고리별 파일로 분할. 단, CorrelationExecutor는 유지하고, 기존 테스트 영향 범위 확인 필요.
- **C) 현상 유지:** 작동하므로 건드리지 않음.

**권장:** A (전면 활성화). CorrelationExecutor가 이미 패턴을 증명함. B는 부분 채택을 제거하는 것이라 오히려 후퇴.

**예상:** A=4시간, B=3시간 (테스트 영향 포함), C=0

---

## 3. 이력 저장소 파편화 (중간)

**현상:** 4개의 독립적 이력/저장 시스템:

| 영역 | 저장소 | 키/스토어 | 동기화 |
|---|---|---|---|
| 통계 분석 | localStorage + IndexedDB | `analysis-history` | CustomEvent + StorageEvent |
| 유전 분석 | localStorage | `genetics-history` (discriminated union) | CustomEvent + StorageEvent |
| Bio-Tools | localStorage | `bio-tool-history` | CustomEvent + StorageEvent |
| Graph Studio 프로젝트 | localStorage | `graph_studio_projects` | 없음 (단일 탭) |
| Graph Studio 스냅샷 | IndexedDB | `chart-snapshots` | 없음 |

`entity-resolver.ts`가 이들을 프로젝트 entity ref로 연결하지만, CRUD는 각각 독립.

**리스크:** 프로젝트 삭제는 `removeProjectEntityRefsByEntityIds`로 entity ref를 정리하므로 orphan이 발생하지 않음 (`research/project-storage.ts:31-35`). **실제 orphan 위험은 소스 엔트리 삭제/eviction 시** — genetics history에서 오래된 엔트리가 MAX_PER_TYPE 초과로 밀려날 때, 해당 entity ref가 남을 수 있음.

**조치 방향:**
- [ ] entity ref 정합성 검증 유틸 추가 (orphan 감지)
- [ ] 장기: 통합 history adapter 패턴 (CRUD 인터페이스 공유)

**예상:** 검증 유틸 1시간, 통합 adapter 4시간+

---

## 4. 테스트 커버리지 불균형 (중간)

| 영역 | 로직 테스트 | 컴포넌트 테스트 | 비고 |
|---|---|---|---|
| 통계 | 7090개 | 있음 | 풍부 |
| 유전 | 88개 | 0개 | 로직은 충분, UI 없음 |
| Graph Studio | ~250개 (23파일) | **0개 (단위)** | E2E는 있음 (`graph-studio-e2e.spec.ts`, `graph-studio-phase3.spec.ts`) |

**리스크:** Graph Studio는 Playwright E2E로 업로드→설정→편집→패널 토글 등 주요 흐름을 커버하고 있어 "자동 감지 불가"는 아님. 다만 **컴포넌트 단위 격리 테스트가 없어** 개별 패널의 상태 변화나 엣지 케이스 검증이 어려움.

**조치 방향:**
- [ ] Graph Studio 핵심 3개 컴포넌트 (ChartPreview, ExportDialog, DataTab) L2 테스트
- [ ] 유전 MultiSequenceInput, ResultView L2 테스트

**예상:** 컴포넌트당 1시간, 총 5시간

---

## 5. Genetics Entity Resolver generic-only 처리 (중간)

**현상:** genetics history가 `seq-stats-result`, `similarity-result`, `phylogeny-result`, `bold-result` entity ref를 실제로 저장하지만 (`analysis-history.ts:176, :525`), entity-resolver에서는 이들이 `_GENERIC_ONLY_KINDS` 처리 (`entity-resolver.ts:362-365`).

**영향:** 프로젝트 상세 화면에서 이 entity들이 제네릭 표시됨. 각 도구의 결과를 풍부하게 표시하려면 full support (EntityKindDescriptors + *Like 인터페이스 + entity-loader) 로 승격 필요. 현재는 기능 문제가 아닌 **UX 품질 문제**.

**조치:**
- [ ] 사용 빈도 높은 `blast-result`, `bold-result`부터 full support 승격 검토
- [ ] 나머지는 generic-only 유지 (충분한 메타데이터가 없으면 승격 불필요)

**예상:** entity당 1시간

---

## 6. common/ 카탈로그 감사 (낮음)

이번 정비에서 `CollapsibleButton`, `StepIndicator` 2개가 미사용으로 삭제됨. **common/ 카탈로그에 export되지만 실제로 import되지 않는 컴포넌트**가 더 있을 수 있음.

**조치:**
- [ ] `components/common/index.ts` 각 export에 대해 import 검색
- [ ] 미사용 항목 제거

**예상:** 30분

---

## 정비 세션 시작 시 횡단 체크리스트

다음 정비 때 이 파일을 참조하여 시스템 레벨 이슈를 먼저 점검:

```
□ 저장 패턴: 각 영역의 저장소가 일관적인가?
□ 타입 경계: 외부 시스템(Worker, API)과의 계약이 타입으로 보호되는가?
□ 테스트 밸런스: 영역별 테스트 비율이 균형 잡혀 있는가?
□ 아키텍처 중복: 같은 목적의 다른 구현이 공존하는가?
□ 공통 모듈: 실제로 사용되는가?
```

---

## 우선순위 요약

| # | 항목 | 예상 시간 | 의존성 |
|---|---|---|---|
| 1 | Worker 결과 타입 정의 (10개) | 2h | 없음 |
| 2 | Sub-executor 결정 (B 권장) | 2h | #1 완료 후 |
| 3 | Entity ref orphan 검증 유틸 | 1h | 없음 |
| 4 | Graph Studio 컴포넌트 테스트 3개 | 3h | 없음 |
| 5 | common/ 카탈로그 감사 | 0.5h | 없음 |

---

## 구조적 확장성 점검 (8대 원칙 대조)

이번 정비에서 발견한 사실을 장기 확장성 관점에서 재평가.

### 1. 도메인 경계 규칙 — 현재 암묵적, 강제 없음

지금: genetics가 papers 내부를 참조하지 않고, graph-studio도 bio-tools를 침범하지 않음. **우연히 잘 분리된 상태**.
문제: eslint/dependency-cruiser 같은 강제 규칙 없음. 규모 커지면 누군가 shortcut을 만들고, 한 파일 고치면 7개 도메인이 깨지는 상황 발생.

**조치:** 각 도메인에 public entry (index.ts barrel) 명시 + 내부 파일 직접 import 금지 린트 규칙.
Graph Studio는 이미 `index.ts` barrel이 있으나 `deleteProjectCascade`가 빠져 있었음 (이번에 수정). 다른 영역은 barrel 자체가 없음.

### 2. common/ 비대화 위험 — 초기 징후 있음

이번에 `CollapsibleButton`, `StepIndicator` 미사용 삭제. `useLocalStorageSync` 훅, `indexeddb-helpers`, `togglePinId`를 추출해서 넣었는데 — **공통이 커지고 있음**.
"2곳에서 쓴다"가 아니라 "도메인 의미가 사라져도 되는 것만 shared"라는 기준 필요.

`indexeddb-helpers`는 범용 → shared 적절.
`togglePinId`는 분석 이력 전용 → 경계 판단 필요.

### 3. 테스트 전략 — 수는 많으나 층위 불균형

현재: unit 7090개 (풍부), e2e 존재하지만 범위 불명확, Graph Studio 컴포넌트 테스트 0개.
핵심 사용자 흐름 10-20개를 **고정 e2e**로 관리해야 함:
- 데이터 업로드 → 분석 실행 → 결과 확인
- 서열 입력 → BLAST/BOLD 실행 → 결과 조회
- 그래프 생성 → 편집 → 내보내기

### 4. 상태 분리 — Graph Studio가 가장 위험

Graph Studio는 편집형 UI인데 `useState`/`zustand` 기반. undo/redo, autosave, 충돌 복구가 필요해질 때 현재 구조로는 어려움.
통계/유전은 "입력 → 실행 → 결과" 단방향이라 현재 패턴으로 충분.
**Graph Studio만 state machine 또는 command 패턴 검토 필요.**

### 5. 타입을 문서로 — Python 경계가 가장 취약

이번 정비에서 확인: 14개 메서드가 `Record<string, unknown>` 반환.
브랜드 타입 (`ProjectId`, `MethodId` 등)은 아직 없음. string으로 ID를 다루는 곳 다수.
외부 입력(Worker, API) → zod 검증 → 내부 모델 분리가 필요. 현재는 Worker 결과를 그대로 쓰고 있음.

### 6. 기능 추가 표준화 — CLAUDE.md에 부분적으로 존재

`CLAUDE.md`에 "프로젝트 Entity 확장 체크리스트", "Bio-Tools 코딩 규칙" 등이 있음. 그러나:
- 통계 메서드 추가 절차는 없음 (이번에 14개 배선하면서 체감)
- genetics 도구 추가 절차도 없음
- feature scaffold/generator 없음

**조치:** 최소한 "새 통계 메서드 추가 시" 체크리스트 작성.

### 7. 빌드/테스트 성능 — 현재 허용 범위, 주시 필요

`pnpm test`: 105초 (7090개), `tsc --noEmit`: ~60초. 현재는 괜찮으나:
- 파일 수 증가 시 tsc가 병목
- Pyodide 환경 setup이 테스트 시간의 60% 차지 (setup 160초 vs tests 73초)
- affected-only 테스트 실행 미구현

### 8. 의사결정 기록 (ADR) — 부분적으로 존재

`docs/` 아래 PLAN-*, REVIEW-* 파일들이 ADR 역할을 일부 수행. 그러나:
- "왜 이 패턴을 선택했는가"가 아닌 "무엇을 했는가" 위주
- executor에 왜 sub-executor와 inline 분기가 공존하는지 기록 없음
- registry 패턴을 왜 선택했는지 기록 없음

**조치:** 핵심 결정 5개에 대해 간단한 ADR 작성 (각 10줄 이내).
