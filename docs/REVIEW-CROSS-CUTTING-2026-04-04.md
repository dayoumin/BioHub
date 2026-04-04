# 횡단 아키텍처 리뷰 (2026-04-04)

통계 · 유전적 분석 · Graph Studio 3개 영역 정비 후 도출된 시스템 레벨 관찰.
관련 기존 리뷰: `RESULT_TYPE_ANALYSIS_REVIEW.md`, `REVIEW_IMPROVEMENTS_TODO.md`

---

## 1. Python Worker 결과 타입 경계 (높음)

**현상:** 새로 배선한 14개 메서드 전부 `Record<string, unknown>`을 반환. executor에서 매번 `typeof result.pValue === 'number'` 가드를 반복.

**근본 원인:** Python worker ↔ TS 사이에 계약(contract)이 없음. `Generated.*Result` 타입이 일부 존재하지만 신규 메서드는 전부 untyped.

**기존 분석:** `stats/docs/technical/RESULT_TYPE_ANALYSIS_REVIEW.md` — core common 필드 80%+ 후보 도출 완료 (pValue, statistic, df 등). 그러나 실행 안 됨.

**조치 방향:**
- [ ] 주요 10개 worker 함수에 대해 TS 결과 타입 정의 (arima, mannKendall, logistic, poisson, ordinal, stepwise, doseResponse, responseSurface, manova, mixedModel)
- [ ] `callWorkerMethod<T>` 제네릭 반환으로 typeof 가드 제거
- [ ] 기존 `Generated.*Result` 패턴 따르기

**예상:** 2시간 (타입 정의 + executor 리팩터)

---

## 2. Sub-executor 아키텍처 결정 (높음)

**현상:** 두 가지 executor 아키텍처가 공존:
- `StatisticalExecutor` (2700줄, inline 분기, **실제 사용**)
- `executors/AnovaExecutor`, `RegressionExecutor`, `NonparametricExecutor` 등 (**미사용**)

Sub-executor 파일들이 `AnalysisResult` 타입(deprecated alias)에 의존하며, `StatisticalExecutor`는 이들을 import하지 않음.

**기존 분석:** `REVIEW_IMPROVEMENTS_TODO.md` §2.2 handleAnalysis 비대화와 관련.

**조치 방향 (택 1):**
- **A) Sub-executor 활성화:** StatisticalExecutor를 thin dispatcher로 축소, 각 카테고리를 sub-executor에 위임. 2700줄 → ~300줄 + 카테고리별 ~200줄.
- **B) Sub-executor 제거:** 미사용 코드 삭제, StatisticalExecutor를 카테고리별 파일로 분할 (executor 인터페이스 없이).
- **C) 현상 유지:** 작동하므로 건드리지 않음.

**권장:** B (제거 후 분할). Sub-executor 인터페이스가 현재 executor 패턴과 맞지 않음.

**예상:** A=4시간, B=2시간, C=0

---

## 3. 이력 저장소 파편화 (중간)

**현상:** 4개의 독립적 이력/저장 시스템:

| 영역 | 저장소 | 키/스토어 | 동기화 |
|---|---|---|---|
| 통계 분석 | localStorage + IndexedDB | `analysis-history` | CustomEvent + StorageEvent |
| 유전 분석 | localStorage | `genetics-history` (discriminated union) | CustomEvent + StorageEvent |
| Bio-Tools | localStorage | `bio-tool-history` | CustomEvent + StorageEvent |
| Graph Studio | IndexedDB | `chart-snapshots`, `graph-projects` | 없음 (단일 탭) |

`entity-resolver.ts`가 이들을 프로젝트 entity ref로 연결하지만, CRUD는 각각 독립.

**리스크:** 프로젝트 삭제 시 다른 영역의 entity ref가 orphan 될 수 있음. `deleteProjectCascade`가 Graph Studio만 커버.

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
| Graph Studio | ~250개 (23파일) | **0개** | 가장 복잡한 UI인데 컴포넌트 테스트 없음 |

**리스크:** Graph Studio UI 회귀를 자동으로 감지할 수 없음.

**조치 방향:**
- [ ] Graph Studio 핵심 3개 컴포넌트 (ChartPreview, ExportDialog, DataTab) L2 테스트
- [ ] 유전 MultiSequenceInput, ResultView L2 테스트

**예상:** 컴포넌트당 1시간, 총 5시간

---

## 5. common/ 카탈로그 감사 (낮음)

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
