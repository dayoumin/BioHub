# Pyodide Service 메서드 구현 요청

## 📋 개요

다음 32개 통계 메서드를 `PyodideStatisticsService` 클래스에 Python (SciPy, NumPy, Statsmodels) 기반으로 구현해주세요.

**파일 위치**: `lib/services/pyodide-statistics.ts`

---

## 🎯 구현 요구사항

### 기본 원칙
1. **Python 라이브러리 사용**: SciPy, NumPy, Statsmodels, Sklearn만 사용
2. **JavaScript 통계 금지**: JavaScript로 통계 계산 절대 금지 (신뢰성 문제)
3. **타입 안전성**: TypeScript 인터페이스 정의 필수
4. **에러 처리**: Python 에러를 TypeScript로 안전하게 변환
5. **JSON 직렬화**: 결과는 JSON 직렬화 가능한 객체로 반환

### 코드 패턴 (기존 메서드 참고)

```typescript
/**
 * 메서드명 (Method Name)
 *
 * 설명 및 용도
 *
 * @param param1 - 파라미터 설명
 * @returns 결과 객체
 */
async methodName(
  param1: number[],
  param2?: string
): Promise<{
  statistic: number
  pValue: number
  // ... 기타 결과
}> {
  if (!this.pyodide) {
    throw new Error('Pyodide가 초기화되지 않았습니다')
  }

  const result = await this.pyodide.runPythonAsync(`
import numpy as np
from scipy import stats
import json

# Python 계산 코드
data = ${JSON.stringify(param1)}
# ... 계산 로직

result = {
    "statistic": float(test_stat),
    "pValue": float(p_value)
}

json.dumps(result)
  `)

  return this.parsePythonResult(result)
}
```

---

## 🔴 우선순위 1: 기본 통계 (11개)

### 1. frequency (빈도분석)
```typescript
/**
 * 빈도분석 (Frequency Analysis)
 *
 * 범주형 변수의 빈도표 생성
 */
async frequency(
  values: (string | number)[]
): Promise<{
  categories: string[]
  frequencies: number[]
  percentages: number[]
  cumulativePercentages: number[]
}>
```
**Python**: `np.unique(return_counts=True)` 사용

### 2. crosstab (교차표)
```typescript
/**
 * 교차표 분석 (Crosstab Analysis)
 *
 * 두 범주형 변수의 교차 빈도표
 */
async crosstab(
  rowValues: (string | number)[],
  colValues: (string | number)[]
): Promise<{
  rowCategories: string[]
  colCategories: string[]
  observedMatrix: number[][]
  rowTotals: number[]
  colTotals: number[]
  grandTotal: number
}>
```
**Python**: `pandas.crosstab()` 또는 NumPy 직접 구현

### 3. proportionTest (일표본 비율검정)
```typescript
/**
 * 일표본 비율검정 (One-Sample Proportion Test)
 *
 * 표본 비율이 특정 값과 같은지 검정
 */
async oneSampleProportionTest(
  successCount: number,
  totalCount: number,
  nullProportion: number = 0.5,
  alternative: 'two-sided' | 'greater' | 'less' = 'two-sided',
  alpha: number = 0.05
): Promise<{
  sampleProportion: number
  nullProportion: number
  zStatistic: number
  pValueExact: number        // 이항검정 (정확)
  pValueApprox: number       // Z-검정 (정규근사)
  confidenceInterval: { lower: number; upper: number; level: number }
  significant: boolean
}>
```
**Python**: `stats.binomtest()` + `stats.norm` 사용

### 4. zTest (Z-검정)
```typescript
/**
 * Z-검정 (Z-Test)
 *
 * 모표준편차를 아는 경우의 평균 검정
 */
async zTest(
  values: number[],
  popmean: number,
  popstd: number
): Promise<{
  sampleMean: number
  sampleSize: number
  zStatistic: number
  pValue: number
  confidenceInterval: { lower: number; upper: number }
}>
```
**Python**: `statsmodels.stats.weightstats.ztest()` 사용

### 5. binomialTest (이항검정)
```typescript
/**
 * 이항검정 (Binomial Test)
 *
 * 이항분포 기반 정확 검정
 */
async binomialTest(
  successCount: number,
  totalCount: number,
  probability: number = 0.5,
  alternative: 'two-sided' | 'greater' | 'less' = 'two-sided'
): Promise<{
  successCount: number
  totalCount: number
  observedProportion: number
  expectedProportion: number
  pValue: number
}>
```
**Python**: `stats.binomtest()` 사용

### 6. partialCorrelation (부분상관)
```typescript
/**
 * 부분상관분석 (Partial Correlation)
 *
 * 통제변수의 영향을 제거한 상관계수
 */
async partialCorrelation(
  dataMatrix: number[][],
  varIndex1: number,
  varIndex2: number,
  controlIndices: number[]
): Promise<{
  correlation: number
  pValue: number
  df: number
  confidenceInterval: { lower: number; upper: number }
}>
```
**Python**: `pingouin.partial_corr()` 또는 회귀 잔차 상관

### 7. signTest (부호검정)
```typescript
/**
 * 부호검정 (Sign Test)
 *
 * 비모수 대응표본 검정
 */
async signTest(
  before: number[],
  after: number[]
): Promise<{
  nPositive: number
  nNegative: number
  nTies: number
  pValue: number
}>
```
**Python**: `stats.binomtest()` 응용

### 8. runsTest (연속성 검정)
```typescript
/**
 * Runs 검정 (Runs Test)
 *
 * 데이터의 무작위성 검정
 */
async runsTest(
  sequence: number[]
): Promise<{
  nRuns: number
  expectedRuns: number
  zStatistic: number
  pValue: number
}>
```
**Python**: `statsmodels.sandbox.stats.runs.runstest_1samp()` 사용

### 9. mcNemarTest (McNemar 검정)
```typescript
/**
 * McNemar 검정
 *
 * 대응표본 범주형 데이터 검정
 */
async mcNemarTest(
  contingencyTable: number[][]  // 2x2 분할표
): Promise<{
  statistic: number
  pValue: number
  continuityCorrection: boolean
}>
```
**Python**: `statsmodels.stats.contingency_tables.mcnemar()` 사용

### 10. cochranQTest (Cochran Q 검정)
```typescript
/**
 * Cochran Q 검정
 *
 * 3개 이상 대응표본 이분형 데이터 검정
 */
async cochranQTest(
  dataMatrix: number[][]  // n명 × k시점 (0/1)
): Promise<{
  qStatistic: number
  pValue: number
  df: number
}>
```
**Python**: `statsmodels.stats.contingency_tables.cochrans_q()` 사용

### 11. moodMedianTest (Mood Median 검정)
```typescript
/**
 * Mood Median 검정
 *
 * 비모수 다중그룹 중앙값 검정
 */
async moodMedianTest(
  groups: number[][]
): Promise<{
  statistic: number
  pValue: number
  grandMedian: number
}>
```
**Python**: `stats.median_test()` 사용

---

## 🟡 우선순위 2: 고급 회귀/분산분석 (13개)

### 12. curveEstimation (곡선추정)
```typescript
async curveEstimation(
  xValues: number[],
  yValues: number[],
  model: 'linear' | 'quadratic' | 'cubic' | 'exponential' | 'logarithmic' | 'power'
): Promise<{
  modelType: string
  coefficients: number[]
  rSquared: number
  predictions: number[]
}>
```
**Python**: `np.polyfit()` + `scipy.optimize.curve_fit()`

### 13. nonlinearRegression (비선형회귀)
```typescript
async nonlinearRegression(
  xValues: number[],
  yValues: number[],
  modelFunction: string,  // 예: "a * np.exp(-b * x) + c"
  initialGuess: number[]
): Promise<{
  parameters: number[]
  parameterErrors: number[]
  rSquared: number
  residuals: number[]
}>
```
**Python**: `scipy.optimize.curve_fit()`

### 14. stepwiseRegression (단계적 회귀)
```typescript
async stepwiseRegression(
  yValues: number[],
  xMatrix: number[][],
  variableNames: string[],
  method: 'forward' | 'backward' | 'both' = 'forward',
  entryThreshold: number = 0.05,
  stayThreshold: number = 0.10
): Promise<{
  selectedVariables: string[]
  selectedIndices: number[]
  rSquaredAtStep: number[]
  finalCoefficients: number[]
  finalPValues: number[]
  finalRSquared: number
  adjustedRSquared: number
}>
```
**Python**: statsmodels 또는 F-statistic 기반 직접 구현

### 15-20. 로지스틱 회귀 변형 (6개)
```typescript
// binaryLogistic, multinomialLogistic, ordinalLogistic
// probitRegression, poissonRegression, negativeBinomial
```
**Python**: `statsmodels.api.Logit()`, `GLM()`, `MNLogit()`, `OrderedModel()` 등

### 21. repeatedMeasuresAnova (반복측정 분산분석)
```typescript
async repeatedMeasuresAnova(
  dataMatrix: number[][],  // subjects × timepoints
  subjectIds: string[]
): Promise<{
  fStatistic: number
  pValue: number
  df: { numerator: number; denominator: number }
  sphericityTest: { statistic: number; pValue: number }
}>
```
**Python**: `statsmodels.stats.anova.AnovaRM()`

### 22. ancova (공분산분석)
```typescript
async ancova(
  yValues: number[],
  groupValues: string[],
  covariates: number[][]
): Promise<{
  fStatisticGroup: number
  pValueGroup: number
  fStatisticCovariate: number[]
  pValueCovariate: number[]
  adjustedMeans: { group: string; mean: number }[]
}>
```
**Python**: `statsmodels.formula.api.ols()` + ANCOVA 설계

### 23. manova (다변량 분산분석)
```typescript
async manova(
  dataMatrix: number[][],  // n observations × p variables
  groupValues: string[]
): Promise<{
  wilksLambda: number
  pillaiTrace: number
  hotellingLawley: number
  royMaxRoot: number
  pValue: number
  df: { hypothesis: number; error: number }
}>
```
**Python**: `statsmodels.multivariate.manova.MANOVA()`

### 24. scheffeTest (Scheffe 사후검정)
```typescript
async scheffeTest(
  groups: number[][]
): Promise<{
  comparisons: Array<{
    group1: number
    group2: number
    meanDiff: number
    fStatistic: number
    pValue: number
  }>
}>
```
**Python**: `scipy.stats` + Scheffe 공식 직접 구현

---

## 🟢 우선순위 3: 고급 분석 (8개)

### 25. discriminantAnalysis (판별분석)
```typescript
async discriminantAnalysis(
  xMatrix: number[][],
  yGroups: string[]
): Promise<{
  coefficients: number[][]
  accuracy: number
  confusionMatrix: number[][]
  predictions: string[]
}>
```
**Python**: `sklearn.discriminant_analysis.LinearDiscriminantAnalysis()`

### 26-32. 기타 고급 분석
- `canonicalCorrelation`: `sklearn.cross_decomposition.CCA()`
- `survivalAnalysis`: `lifelines` 라이브러리 (Kaplan-Meier)
- `metaAnalysis`: 효과크기 통합 직접 구현
- `sem`: `statsmodels.stats.mediation` 또는 경로분석
- `multilevelModel`: `statsmodels.regression.mixed_linear_model.MixedLM()`
- `mediation`: Sobel test 또는 Bootstrap
- `moderation`: 상호작용항 회귀분석

---

## 📝 구현 시 참고사항

### 1. 기존 메서드 참고
파일에 이미 구현된 42개 메서드를 참고하세요:
- `descriptiveStats()`: 기본 통계량
- `twoSampleTTest()`: t-검정
- `oneWayANOVA()`: 일원분산분석
- `cronbachAlpha()`: 신뢰도 분석

### 2. Python 라이브러리 로딩
패키지는 이미 `initialize()` 메서드에서 로드됨:
```python
await self.pyodide.loadPackage(['numpy', 'scipy', 'statsmodels', 'scikit-learn'])
```

### 3. 에러 처리
```typescript
try {
  const result = await this.pyodide.runPythonAsync(`...`)
  return this.parsePythonResult(result)
} catch (error) {
  throw new Error(`메서드명 실패: ${error}`)
}
```

### 4. TypeScript 인터페이스
각 메서드의 반환 타입을 `@/types/pyodide.d.ts`에 추가하세요.

---

## 🎯 최종 목표

- **32개 메서드 구현 완료**
- **모든 메서드 TypeScript 타입 정의**
- **Python 코드 검증 (R/SPSS와 동일한 결과)**
- **에러 처리 완비**

---

## 📚 참고 문서

- SciPy: https://docs.scipy.org/doc/scipy/reference/stats.html
- Statsmodels: https://www.statsmodels.org/stable/index.html
- Scikit-learn: https://scikit-learn.org/stable/
- Pingouin: https://pingouin-stats.org/

---

**작성일**: 2025-10-10
**대상 AI**: Claude, GPT-4, 기타 코딩 어시스턴트
