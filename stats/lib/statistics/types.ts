/**
 * 통계 분석 공통 타입 정의
 */

export interface StatisticalResult {
  testName: string
  statistic: number
  pValue: number
  degreesOfFreedom?: number
  effectSize?: number
  confidenceInterval?: [number, number]
  interpretation: string
  details?: Record<string, unknown>
}

export interface DescriptiveStats {
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
  cv: number
  sem: number
  ci95: [number, number]
  outliers: number[]
  normalTest: {
    statistic: number
    pValue: number
    isNormal: boolean
  }
}

export interface RegressionResult {
  slope: number
  intercept: number
  rSquared: number
  pValue: number
  standardError: number
  residuals: number[]
  fittedValues: number[]
  confidenceInterval: {
    slope: [number, number]
    intercept: [number, number]
  }
}

export interface ANOVAResult {
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  msBetween: number
  msWithin: number
  groupMeans: number[]
  grandMean: number
  etaSquared: number
  interpretation: string
}

export interface CorrelationResult {
  correlation: number
  pValue: number
  confidence95: [number, number]
  interpretation: string
  strength: 'very weak' | 'weak' | 'moderate' | 'strong' | 'very strong'
}

export interface PostHocResult {
  group1: string
  group2: string
  meanDiff: number
  pValue: number
  ciLower: number
  ciUpper: number
  significant: boolean
}

export interface ClusteringResult {
  labels: number[]
  centers: number[][]
  inertia: number
  silhouetteScore: number
  nClusters: number
}

export interface PCAResult {
  components: number[][]
  explainedVariance: number[]
  explainedVarianceRatio: number[]
  cumulativeVariance: number[]
  loadings: number[][]
  scores: number[][]
}

export interface TimeSeriesResult {
  trend: number[]
  seasonal: number[]
  residual: number[]
  forecast?: number[]
  forecastLower?: number[]
  forecastUpper?: number[]
}

export interface SurvivalResult {
  time: number[]
  survivalProbability: number[]
  confidenceInterval: {
    lower: number[]
    upper: number[]
  }
  medianSurvival: number | null
  events: number
  censored: number
}

export type TestType =
  | 'descriptive'
  | 't-test'
  | 'anova'
  | 'regression'
  | 'correlation'
  | 'nonparametric'
  | 'post-hoc'
  | 'advanced'

export interface TestCategory {
  id: string
  name: string
  nameEn: string
  type: TestType
  description: string
  assumptions?: string[]
  whenToUse?: string[]
  example?: string
}