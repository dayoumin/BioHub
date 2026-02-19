# Result Contract Map (Track A Seed)

## 목적

`Generated -> Service -> Executor -> Transformer -> UI` 경로에서
필드 드리프트를 줄이기 위한 최소 계약 맵입니다.

이 문서는 Phase 5-3의 우선 범위(정규성/상관/다변량/사후검정)만 다룹니다.

---

## 계층별 책임

1. Generated (`lib/generated/method-types.generated.ts`)
- Python Worker 계약의 타입 표현
- 가공 없이 Worker 반환 구조를 반영

2. Service (`lib/services/pyodide-statistics.ts`)
- 레거시 API 호환, 얕은 alias/어댑팅
- 계산 로직은 Worker/Generated에 위임

3. Executor (`lib/services/executors/*`, `lib/services/statistical-executor.ts`)
- 도메인별 해석/조합
- `mainResults`, `additionalInfo`, `visualizationData` 구성

4. Transformer (`lib/utils/result-transformer.ts`)
- Executor 결과를 `types/smart-flow.ts::AnalysisResult`로 변환
- `pvalue -> pValue`, alias 정리(`adjustedRSquared -> adjRSquared`)

5. UI (`types/smart-flow.ts`)
- 렌더링 계약의 최종 소비자

---

## 필드 규약 (현재 기준)

1. p-value 규약
- Executor: `mainResults.pvalue`
- UI: `AnalysisResult.pValue`
- Transformer에서 키 변환 수행

2. 군집 규약
- Canonical raw: `clusterAssignments`, `centroids`
- UI 호환 alias: `clusters`, `centers`

3. 차원축소 규약
- Worker `pca_analysis.screeData[].varianceExplained`는 **percentage(0~100)** 를 반환
- Executor는 이를 **ratio(0~1)** 로 정규화하여 UI 계약으로 전달
- UI 해석/시각화는 `additional.explainedVarianceRatio` 의존이 큼
- PCA 경로에서 ratio/percent 단위를 명시적으로 관리해야 함

---

## 메서드 계약 맵 (핵심)

| Method ID | Generated/Worker 계약 | Service 계약 | Executor additionalInfo | UI additional (transform 후) | 비고 |
|---|---|---|---|---|---|
| `normality-test`, `shapiro-wilk` | `normality_test` -> `{ statistic, pValue, isNormal }` | `shapiroWilkTest()` | `isNormal` | `additional.isNormal`으로 매핑됨 | 정상성 UI 활용 정책만 결정 필요 |
| `correlation` 계열 | `correlation_test` -> `{ correlation, pValue }` | `correlationTest()`, `correlation()` | `pearson/spearman/kendall`, `rSquared` | `rSquared`만 직접 매핑 | 상세 계수 객체 매핑 전략 필요 |
| `pca` | `pca_analysis` raw: `screeData`, `rotationMatrix` 등 | `pcaAnalysis()` 중심 (executor에서 legacy `pca()` 비의존화) | `explainedVarianceRatio(0~1)`, `totalExplainedVariance(0~1)` 파생 후 사용 | `explainedVarianceRatio` 의존 | unit 정규화 적용 완료 |
| `factor-analysis` | `factor_analysis` -> `explainedVariance`, `explainedVarianceRatio` | `factorAnalysis()` | 경로별 필드 차이 존재 | `loadings`, `eigenvalues` 중심 소비 | PCA와 계약 정렬 필요 |
| `cluster-analysis` | `cluster_analysis` -> `clusterAssignments`, `centroids` | `clusterAnalysisAdapter()`로 alias 부여 | `clusters`, `centers`, `silhouetteScore`, `inertia` | 동일 키 매핑 | 현재 Phase 5-3에서 안정화 완료 |
| `bonferroni` (service utility) | `bonferroni_correction`(p-value list 보정) | `performBonferroni()`은 pairwise t-test 기반 커스텀 | ANOVA fallback 경로에서 `postHoc[]` 표준 키(`pvalue`, `pvalueAdjusted`)로 정규화 | `postHoc` 렌더 가능 | utility와 post-hoc orchestration 의미 분리는 계속 유지 |
| `andersonDarlingTest`, `dagostinoPearsonTest` | Worker 미구현 | Service에서 `throw` | UI 훅에서 warning 처리 | 결과 미생성 | Registry v2에서 상태 메타로 추적 예정 |

---

## 확인된 드리프트/리스크

1. PCA 경로 단일화 및 단위 정규화 적용 완료
- `statistical-executor`도 `pyodideStats.pcaAnalysis()` 경로로 전환됨
- worker 반환 percentage는 executor에서 ratio로 정규화됨

2. 정규성 지표 활용 정책 미정
- `isNormal` 전달은 가능하나, 어떤 화면에서 기본 노출할지 정책 정합이 필요

3. Bonferroni 의미 혼재
- Worker의 `bonferroni_correction`은 p-value 보정 유틸
- Service의 `performBonferroni`는 pairwise test orchestration
- 명명은 유사하지만 계약 의미가 다름

---

## Track A 후속 작업 항목

1. `factor-analysis`/`pca`의 `additional` 표준 키셋 정의(메서드군별)
2. Transformer/UI 표시 정책 확정(`isNormal`, 다중 상관 상세)
3. 계약 검증 스크립트 도입 완료: `pnpm validate:result-contracts`
4. 상관 계열(`correlation`, `pearson-correlation`, `pearson`) 계약 가드 반영 완료
5. `bonferroni_correction` utility 계약 가드 반영 완료 (`adjustedPValues`, `significantResults`, `correctedAlpha`)
6. `performBonferroni` executor 경로 표준화 1차 완료(ANOVA fallback), 나머지 실행 경로 확장 필요
