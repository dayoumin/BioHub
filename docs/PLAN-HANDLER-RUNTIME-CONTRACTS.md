# Handler Runtime Contract 명시화 계획

> **상태**: P1 완료 (2026-04-04) — mannKendall, arima, t-test, regression GLM/stepwise 계약 고정  
> **잔여**: dose-response, response-surface (Record 유지), logistic llrStatistic (worker 미반환)  
> **마지막 리뷰**: 2026-04-04 — 실행 후 갱신  
> **목표**: `Record<string, unknown>`으로 남아 있는 경로만 선별해 타입 + runtime assertion으로 고정

## 배경

핸들러는 Python worker raw dict → `StatisticalExecutorResult` 변환을 담당하는 경계 계층.
현재 문제: worker가 반환하는 필드와 handler가 기대하는 필드 사이에 명시적 계약이 없는 **일부 경로**에서
필드 누락 시 `?? 0`, `?? 1` 등 silent fallback으로 잘못된 값이 UI에 표시됨.

## 현재 계약 현황

대부분의 메서드는 이미 `pyodide-statistics.ts`에서 `Generated.*Result` 타입 + `assertWorkerResultFields()`로
계약이 형성되어 있다. **새 `types/worker-contracts.ts`는 만들지 않는다** — 소스 오브 트루스 이중화 방지.

### 이미 계약화된 경로 (변경 불필요)

| 래퍼 메서드 | 반환 타입 | assertion |
|-------------|-----------|-----------|
| `tTestOneSample()` | `Generated.TTestOneSampleResult` | `assertWorkerResultFields(['statistic', 'pValue', ...])` |
| `tTestTwoSample()` | `Generated.TTestTwoSampleResult` | `assertWorkerResultFields` |
| `tTestPaired()` | `Generated.TTestPairedResult` | `assertWorkerResultFields` |
| `normalityTest()` | `Generated.NormalityTestResult` | `assertWorkerResultFields(['statistic', 'pValue', 'isNormal'])` |
| `chiSquareTestWorker()` | `Generated.ChiSquareTestResult` | `assertWorkerResultFields(['statistic', 'pValue', 'df'])` |
| `zTestWorker()` | `Generated.ZTestResult` | `assertWorkerResultFields(['statistic', 'pValue'])` |
| `wilcoxonSignedRankTest()` | `Generated.WilcoxonTestResult` | Generated 래퍼 |
| `binomialTestWorker()` | `Generated.BinomialTestResult` | Generated 래퍼 |
| `partialCorrelationWorker()` | `Generated.PartialCorrelationResult` | Generated 래퍼 |
| `timeSeriesAnalysis()` | `Generated.TimeSeriesAnalysisResult` | Generated 래퍼 |
| `factorAnalysis()` | `Generated.FactorAnalysisResult` | Generated 래퍼 |
| `descriptiveStats()` | `Generated.DescriptiveStatsResult` | Generated 래퍼 |

### 아직 `Record<string, unknown>` (계약화 필요)

| 래퍼 메서드 | 현재 반환 | 핸들러 |
|-------------|-----------|--------|
| `mannKendallTest()` | `Record<string, unknown>` | handle-timeseries |
| `arimaForecast()` | `Record<string, unknown>` | handle-timeseries |
| `clusterAnalysis()` | `ClusterAnalysisAdapterResult` (커스텀, Generated 아님) | handle-multivariate |

## 접근 방식

1. **기존 `Generated.*` 타입 + `assertWorkerResultFields()` 패턴을 확장** — 새 파일 아님
2. `Record<string, unknown>` 경로에 대해서만 `Generated.*Result` 타입 추가 (codegen) 또는 수동 인터페이스
3. 핸들러 진입부에서 필수 필드 존재 여부를 runtime assertion
4. 기존 `?? 0`, `?? 1` 패턴을 assertion 후 안전한 접근으로 교체

## 핸들러별 계약 갭 목록

### 심각도 높음 (잘못된 값 표시)

#### handle-regression.ts
- **GLM 공통 (`buildGlmResult`)**: `raw.llrPValue ?? 1`, `raw.chiSquare ?? raw.llrStatistic ?? 0`
  - logistic: OK (llrPValue 반환)
  - ordinal: `llrPValue` 미반환 → p=1 고정 **(P0에서 수정)**
  - poisson: `llrPValue` 미반환 → p=1 고정 **(P0에서 수정)**
- **stepwise**: `fStatistic ?? 0`, `pValue ?? 1`, `selectedVariableCount ?? '?'` — 3개 모두 미반환 **(P0에서 수정)**
- **dose-response**: `doseRaw.pValue ?? 1`, `doseRaw.rSquared ?? 0`
- **response-surface**: `rsRaw.pValue ?? 1`, `rsRaw.fStatistic ?? 0`
- **linear (default)**: `result.fStatistic ?? result.tStatistic ?? 0` — 둘 다 undefined 가능

#### handle-t-test.ts — 래퍼 레이어 키 불일치
- **문제 위치**: `pyodide-statistics.ts`의 래퍼, worker가 아님
- `tTestOneSample()` (L484): `Generated.TTestOneSampleResult` → 필드 `pValue` (대문자 V)
- `tTest()` (L547): 래퍼가 반환 타입을 `{ pvalue: number }` (소문자 v)로 정규화
- 결과적으로 핸들러에서:
  - one-sample 경로 (L38): `result.pValue` 읽음 (tTestOneSample 직접 호출)
  - two-sample 경로 (L127): `result.pvalue` 읽음 (tTest 래퍼 경유)
- **수정 방향**: `tTest()` 래퍼의 반환 타입을 `pValue`로 통일 (Generated 타입과 일치)

#### handle-timeseries.ts — raw 경로만 대상
- **Mann-Kendall** (`mannKendallTest()`): `Record<string, unknown>` — typeof 가드로 `tau`, `pValue`, `trend`, `senSlope` 접근. **계약화 필요**
- **ARIMA** (`arimaForecast()`): `Record<string, unknown>` — **계약화 필요**
- ~~Stationarity/Seasonal~~: `timeSeriesAnalysis()`로 이미 `Generated.TimeSeriesAnalysisResult` — 변경 불필요

### 심각도 중간 (silent fallback)

#### handle-anova.ts
- mixed-model: 모든 필드에 typeof 가드 (worker 타입 불안정)
- postHoc 폴백 순서: **games-howell → tukey → bonferroni** (이분산에 robust한 순서 우선)
  - 3중 폴백 전부 실패 시 undefined
- ANCOVA: `mainEffect?.statistic ?? 0`, `mainEffect?.pValue ?? 1`

#### handle-survival.ts
- Kaplan-Meier: `medianSurvivalTime`, `logRankP` nullable → `?? 0`, `?? 1`
- Cox: `result.pValues` 배열 존재 가정 → `Math.min()` 호출
- ROC: `result.aucCI.lower`/`.upper` 객체 구조 가정

#### handle-multivariate.ts
- Cluster: `clusters`/`clusterAssignments`, `centers`/`centroids` 필드 별칭 (adapter 경유)
- PCA screeData: 아이템이 number 또는 `{ varianceExplained, eigenvalue }` 객체
- FA/PCA: `totalVarianceExplained` 또는 `totalExplainedVariance` 필드명 불일치

### 심각도 낮음 (동작하지만 느슨)

#### handle-nonparametric.ts
- Cochran-Q: `qStatistic` (비표준 키) → `statistic`으로 매핑
- Sign-test: `nPositive`, `nNegative` 반환되지만 mainResults에 미사용
- Proportion: `pValueExact` (비표준 키)

#### handle-descriptive.ts
- explore-data: `normality?.pValue ?? 1`
- means-plot: `plotData?.length ?? 0`, `result.interpretation`을 객체로 캐스팅

#### handle-design.ts
- `result.achievedPower || result.requiredSampleSize || 0` — 분석 유형에 따라 하나만 존재
- `typeof result.alpha === 'number'` 가드

#### handle-reliability.ts
- `result.alpha`, `result.itemTotalCorrelations` — 폴백 없이 직접 접근 (단순)

#### handle-correlation.ts
- CorrelationExecutor에 위임 — handler 자체는 raw worker 접근 안 함
- executor 내부 계약은 별도 확인 필요

## 실행 순서 제안

1. `Record<string, unknown>` 경로 3개 타입 고정 (mannKendall, arima, cluster)
2. 심각도 높음: regression (GLM 필드), t-test (래퍼 pValue 통일)
3. 심각도 중간: anova, survival, multivariate
4. 심각도 낮음: 나머지
5. 필드명 불일치 정리 (`totalVarianceExplained`/`totalExplainedVariance`, `clusters`/`clusterAssignments` 등)

## 판단 기준

- **Zod vs 수동 assertion**: 12개 핸들러 전체에 Zod 스키마를 넣으면 번들 증가.
  기존 `assertWorkerResultFields()` (`type-guards.ts:389`) 패턴 확장이 더 가벼움.
- **필드 별칭 정리**: worker 반환 키를 표준화할지, handler에서 양쪽 다 받을지는
  worker 변경 범위에 따라 결정.
