/**
 * 통계 분석을 위한 타입 정의
 */

/**
 * 데이터 행 타입
 */
export interface DataRow {
  [key: string]: string | number | boolean | null
}

/**
 * 숫자 데이터 배열
 */
export type NumericArray = number[]

/**
 * 2차원 숫자 배열 (행렬)
 */
export type NumericMatrix = number[][]

/**
 * 범주형 데이터 배열
 */
export type CategoricalArray = string[]

/**
 * 통계 검정 결과
 */
export interface StatisticalTestResult {
  statistic: number
  pvalue: number
  df?: number
  method?: string
  alternative?: string
  confidenceInterval?: {
    lower: number
    upper: number
    level: number
  }
}

/**
 * 기술통계 결과
 */
export interface DescriptiveStatistics {
  mean: number
  median: number
  mode: number | null
  std: number
  variance: number
  min: number
  max: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  kurtosis: number
  count: number
  sum: number
}

/**
 * ANOVA 결과
 */
export interface ANOVAResult extends StatisticalTestResult {
  betweenSS?: number
  withinSS?: number
  totalSS?: number
  fStatistic?: number
  etaSquared?: number
  omegaSquared?: number
}

/**
 * 회귀분석 결과
 */
export interface RegressionResult extends StatisticalTestResult {
  slope?: number
  intercept?: number
  rSquared: number
  adjustedRSquared?: number
  standardError?: number
  residuals: number[]
  predictions?: number[]
  coefficients?: Array<{
    name: string
    value: number
    stdError: number
    tValue: number
    pvalue: number
  }>
}

/**
 * 상관분석 결과
 */
export interface CorrelationResult {
  correlation: number
  pvalue: number
  method: 'pearson' | 'spearman' | 'kendall'
  confidenceInterval?: {
    lower: number
    upper: number
    level: number
  }
}

/**
 * 사후검정 결과
 */
export interface PostHocResult {
  comparisons: Array<{
    group1: string
    group2: string
    meanDiff: number
    pvalue: number
    pvalueAdj?: number
    significant: boolean
    confidenceInterval?: {
      lower: number
      upper: number
    }
  }>
  method: string
  adjustment?: string
}

/**
 * 정규성 검정 결과
 */
export interface NormalityTestResult {
  statistic: number
  pvalue: number
  isNormal: boolean
  method: 'shapiro' | 'kolmogorov-smirnov' | 'anderson-darling'
}

/**
 * 등분산성 검정 결과
 */
export interface HomogeneityTestResult {
  statistic: number
  pvalue: number
  isHomogeneous: boolean
  method: 'levene' | 'bartlett' | 'fligner'
}

/**
 * 효과 크기
 */
export interface EffectSize {
  value: number
  type: 'cohens_d' | 'hedges_g' | 'glass_delta' | 'eta_squared' | 'omega_squared' | 'epsilon_squared' | 'r'
  interpretation: 'negligible' | 'small' | 'medium' | 'large'
  confidenceInterval?: {
    lower: number
    upper: number
    level: number
  }
}

/**
 * 검정력 분석 결과
 */
export interface PowerAnalysisResult {
  power: number
  effectSize: number
  sampleSize: number
  alpha: number
  beta: number
  testType: string
  tails: 1 | 2
  requiredSampleSize?: number
}

/**
 * PCA 결과
 */
export interface PCAResult {
  components: NumericMatrix
  explainedVarianceRatio: number[]
  singularValues: number[]
  mean: number[]
  transformedData?: NumericMatrix
  nComponents: number
}

/**
 * 요인분석 결과
 */
export interface FactorAnalysisResult {
  loadings: NumericMatrix
  communalities: number[]
  uniqueness: number[]
  eigenvalues: number[]
  explainedVariance: number[]
  rotation?: 'varimax' | 'promax' | 'quartimax' | 'oblimin'
  nFactors: number
}

/**
 * 군집분석 결과
 */
export interface ClusterAnalysisResult {
  clusters: number[]
  centers?: NumericMatrix
  silhouetteScore?: number
  inertia?: number
  nClusters: number
  method: 'kmeans' | 'hierarchical' | 'dbscan' | 'gaussian_mixture'
}

/**
 * 시계열 분석 결과
 */
export interface TimeSeriesResult {
  trend?: number[]
  seasonal?: number[]
  residual?: number[]
  forecast?: number[]
  forecastIntervals?: Array<{
    lower: number
    upper: number
  }>
  acf?: number[]
  pacf?: number[]
  seasonalPeriod?: number
  model?: string
}

/**
 * 신뢰도 분석 결과
 */
export interface ReliabilityResult {
  alpha: number
  standardizedAlpha?: number
  averageInterItemCorrelation?: number
  itemTotalCorrelations?: number[]
  alphaIfDeleted?: number[]
  interpretation: 'poor' | 'questionable' | 'acceptable' | 'good' | 'excellent'
}

// VariableMapping은 @/lib/statistics/variable-mapping에서 import하세요
// 중복 정의 제거됨 (2025-11-20)