/**
 * Pyodide Python Worker 결과 타입 정의
 *
 * Phase 6: 공통 타입 정의
 * - 모든 handler에서 재사용 가능
 * - 타입 중복 방지
 * - 타입 일관성 보장
 *
 * @module PyodideResults
 */

// ========================================
// Worker 1: 기술통계
// ========================================

/**
 * 기술통계량 결과
 */
export interface DescriptiveStatsResult {
  mean: number
  median: number
  std: number
  min: number
  max: number
  q1: number
  q3: number
  iqr: number
  variance: number
  skewness: number
  kurtosis: number
  mode?: number
  n: number
}

/**
 * 정규성 검정 결과 (Shapiro-Wilk)
 */
export interface NormalityTestResult {
  statistic: number
  pValue: number
  isNormal: boolean
  alpha: number
}

/**
 * 이상치 탐지 결과
 */
export interface OutlierDetectionResult {
  outlierIndices: number[]
  outlierCount: number
  method: string
}

/**
 * 빈도 분석 결과
 */
export interface FrequencyAnalysisResult {
  categories: Array<{
    value: string | number
    count: number
    percentage: number
  }>
  totalCount: number
}

/**
 * 교차표 분석 결과
 */
export interface CrosstabAnalysisResult {
  crosstab: number[][]
  rowLabels: string[]
  columnLabels: string[]
  rowTotals: number[]
  columnTotals: number[]
  grandTotal: number
}

// ========================================
// Worker 2: 가설검정
// ========================================

/**
 * t-검정 결과 (일표본)
 */
export interface OneSampleTTestResult {
  statistic: number
  pValue: number
  df: number
  sampleMean: number
  std: number
  ci_lower: number
  ci_upper: number
  cohensD: number
}

/**
 * t-검정 결과 (독립표본)
 */
export interface TwoSampleTTestResult {
  statistic: number
  pValue: number
  df: number
  mean1: number
  mean2: number
  std1: number
  std2: number
  ci_lower: number
  ci_upper: number
  cohensD: number
}

/**
 * t-검정 결과 (대응표본)
 */
export interface PairedTTestResult {
  statistic: number
  pValue: number
  df: number
  mean1: number
  mean2: number
  std1: number
  std2: number
  meanDiff: number
  stdDiff: number
  ci_lower: number
  ci_upper: number
  cohensD: number
}

/**
 * 카이제곱 검정 결과
 */
export interface ChiSquareTestResult {
  statistic: number
  pValue: number
  degreesOfFreedom: number
  expectedFrequencies: number[]
}

/**
 * z-검정 결과
 */
export interface ZTestResult {
  statistic: number
  pValue: number
  sampleMean: number
  populationMean: number
  standardError: number
  ci_lower: number
  ci_upper: number
}

/**
 * 이항검정 결과
 */
export interface BinomialTestResult {
  statistic: number
  pValue: number
  observedProportion: number
  expectedProportion: number
  sampleSize: number
  ci_lower: number
  ci_upper: number
}

/**
 * 부분상관분석 결과
 */
export interface PartialCorrelationResult {
  coefficient: number
  pValue: number
  df: number
}

/**
 * 등분산 검정 결과 (Bartlett, Levene)
 */
export interface HomogeneityTestResult {
  statistic: number
  pValue: number
  equalVariance: boolean
}

// ========================================
// Worker 3: 비모수 검정 + ANOVA
// ========================================

/**
 * Mann-Whitney U 검정 결과
 */
export interface MannWhitneyUTestResult {
  statistic: number
  pValue: number
  effectSize: number
}

/**
 * Wilcoxon 부호순위 검정 결과
 */
export interface WilcoxonTestResult {
  statistic: number
  pValue: number
  effectSize: number
}

/**
 * Kruskal-Wallis 검정 결과
 */
export interface KruskalWallisTestResult {
  statistic: number
  pValue: number
  df: number
}

/**
 * Friedman 검정 결과
 */
export interface FriedmanTestResult {
  statistic: number
  pValue: number
  df: number
  rankings: number[]
}

/**
 * 일원 분산분석 (One-way ANOVA) 결과
 */
export interface OneWayAnovaResult {
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  sumSquaresBetween: number
  sumSquaresWithin: number
  meanSquaresBetween: number
  meanSquaresWithin: number
}

/**
 * 이원 분산분석 (Two-way ANOVA) 결과
 */
export interface TwoWayAnovaResult {
  mainEffect1: {
    fStatistic: number
    pValue: number
  }
  mainEffect2: {
    fStatistic: number
    pValue: number
  }
  interaction: {
    fStatistic: number
    pValue: number
  }
}

/**
 * 반복측정 분산분석 결과
 */
export interface RepeatedMeasuresAnovaResult {
  fStatistic: number
  pValue: number
  df: number
  sphericity: {
    mauchlysW: number
    pValue: number
    greenwoodGeisserEpsilon: number
  }
}

/**
 * 사후검정 결과 (Bonferroni, Tukey HSD, Games-Howell)
 */
export interface PostHocTestResult {
  comparisons: Array<{
    group1: string
    group2: string
    meanDiff: number
    pValue: number
    ci_lower: number
    ci_upper: number
    significant: boolean
  }>
}

// ========================================
// Worker 4: 회귀분석 + 고급분석
// ========================================

/**
 * 선형 회귀분석 결과
 */
export interface LinearRegressionResult {
  slope: number
  intercept: number
  rSquared: number
  pValue: number
  stdErr: number
  nPairs: number
}

/**
 * 다중 회귀분석 결과
 */
export interface MultipleRegressionResult {
  coefficients: number[]
  intercept: number
  rSquared: number
  adjustedRSquared: number
  fStatistic: number
  pValue: number
  standardErrors: number[]
  tStatistics: number[]
  pValues: number[]
}

/**
 * 로지스틱 회귀분석 결과
 */
export interface LogisticRegressionResult {
  coefficients: number[]
  intercept: number
  oddsRatios: number[]
  pValues: number[]
  accuracy: number
  confusionMatrix: number[][]
}

/**
 * 다항 회귀분석 결과
 */
export interface PolynomialRegressionResult {
  coefficients: number[]
  rSquared: number
  predictions: number[]
  residuals: number[]
}

/**
 * 주성분 분석 (PCA) 결과
 */
export interface PCAAnalysisResult {
  components: number[][]
  explainedVariance: number[]
  explainedVarianceRatio: number[]
  cumulativeVariance: number[]
}

/**
 * 요인 분석 결과
 */
export interface FactorAnalysisResult {
  loadings: number[][]
  communalities: number[]
  eigenvalues: number[]
  explainedVariance: number[]
}

/**
 * 판별 분석 결과
 */
export interface DiscriminantAnalysisResult {
  coefficients: number[][]
  groupMeans: number[][]
  accuracy: number
  confusionMatrix: number[][]
}

/**
 * 군집 분석 결과 (K-Means)
 */
export interface ClusterAnalysisResult {
  labels: number[]
  centers: number[][]
  inertia: number
  silhouetteScore: number
}

/**
 * Durbin-Watson 검정 결과
 */
export interface DurbinWatsonTestResult {
  statistic: number
  interpretation: string
  isIndependent: boolean
}

/**
 * 시계열 분해 결과
 */
export interface TimeSeriesDecompositionResult {
  trend: number[]
  seasonal: number[]
  residual: number[]
  observed: number[]
}

/**
 * ARIMA 예측 결과
 */
export interface ARIMAForecastResult {
  forecast: number[]
  confidenceIntervals?: {
    lower: number[]
    upper: number[]
  }
  aic?: number
  bic?: number
}

/**
 * SARIMA 예측 결과
 */
export interface SARIMAForecastResult {
  forecast: number[]
  confidenceIntervals?: {
    lower: number[]
    upper: number[]
  }
  aic?: number
  bic?: number
}

/**
 * VAR 모형 결과
 */
export interface VARModelResult {
  coefficients: number[][][]  // [equation][variable][lag]
  residuals: number[][]
  aic: number
  bic: number
  forecast?: number[][]
}

/**
 * Kaplan-Meier 생존분석 결과
 */
export interface KaplanMeierSurvivalResult {
  survivalFunction: number[]
  times: number[]
  events: number[]
  nRisk: number[]
  medianSurvival?: number
}

/**
 * Cox 비례위험 회귀 결과
 */
export interface CoxRegressionResult {
  coefficients: number[]
  hazardRatios: number[]
  pValues: number[]
  confidenceIntervals?: Array<{
    lower: number
    upper: number
  }>
  concordance?: number
}

/**
 * 혼합 효과 모형 결과
 */
export interface MixedEffectsModelResult {
  fixedEffects: {
    coefficients: number[]
    standardErrors: number[]
    pValues: number[]
  }
  randomEffects: {
    variances: number[]
  }
  aic: number
  bic: number
  logLikelihood: number
}

// ========================================
// 공통 타입
// ========================================

/**
 * 상관분석 결과 (Pearson, Spearman, Kendall)
 */
export interface CorrelationResult {
  pearson: {
    r: number
    pValue: number
  }
  spearman: {
    r: number
    pValue: number
  }
  kendall: {
    r: number
    pValue: number
  }
}

/**
 * Python 에러 응답
 */
export interface PythonErrorResponse {
  error: string
}
