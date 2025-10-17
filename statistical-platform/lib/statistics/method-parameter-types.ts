/**
 * 메서드별 파라미터 타입 정의
 *
 * 모든 통계 메서드의 입력 파라미터를 명확하게 정의하여
 * 타입 안전성을 확보합니다.
 */

// ============================================================================
// 공통 타입
// ============================================================================

/**
 * 데이터 행 타입
 */
export interface DataRow {
  [columnName: string]: string | number | boolean | null | undefined
}

/**
 * 기본 파라미터 (모든 메서드 공통)
 */
export interface BaseParameters {
  alpha?: number  // 유의수준 (기본값: 0.05)
}

// ============================================================================
// 기술통계/진단
// ============================================================================

export interface DescriptiveStatsParams extends BaseParameters {
  column: string
  columns?: string[]
}

export interface NormalityTestParams extends BaseParameters {
  column: string
  method?: 'shapiro' | 'anderson' | 'ks'
}

export interface HomogeneityTestParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
  method?: 'levene' | 'bartlett'
}

// ============================================================================
// 가설검정 (t-test, 비율검정)
// ============================================================================

export interface OneSampleTTestParams extends BaseParameters {
  column: string
  popmean: number
  alternative?: 'two-sided' | 'less' | 'greater'
}

export interface TwoSampleTTestParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
  equal_var?: boolean
  alternative?: 'two-sided' | 'less' | 'greater'
}

export interface PairedTTestParams extends BaseParameters {
  column1: string
  column2: string
  alternative?: 'two-sided' | 'less' | 'greater'
}

export interface WelchTTestParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
  alternative?: 'two-sided' | 'less' | 'greater'
}

export interface OneSampleProportionTestParams extends BaseParameters {
  variable: string
  successValue: string | number
  nullProportion?: number  // 0 < p < 1, 기본값: 0.5
  alternative?: 'two-sided' | 'greater' | 'less'
}

// ============================================================================
// 회귀/상관 분석
// ============================================================================

export interface SimpleLinearRegressionParams extends BaseParameters {
  independentColumn: string
  dependentColumn: string
  predictValues?: number[]
}

export interface MultipleRegressionParams extends BaseParameters {
  independentColumns: string[]
  dependentColumn: string
  predictValues?: number[][]
}

export interface LogisticRegressionParams extends BaseParameters {
  independentColumns: string[]
  dependentColumn: string
  maxIterations?: number
  tolerance?: number
}

export interface CorrelationAnalysisParams extends BaseParameters {
  columns: string[]
  method?: 'pearson' | 'spearman' | 'kendall'
}

export interface PartialCorrelationParams extends BaseParameters {
  xColumn: string
  yColumn: string
  controlColumns: string[]
  method?: 'pearson' | 'spearman'
}

// ============================================================================
// 비모수 검정
// ============================================================================

export interface MannWhitneyUParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
  alternative?: 'two-sided' | 'less' | 'greater'
}

export interface WilcoxonSignedRankParams extends BaseParameters {
  column1: string
  column2: string
  alternative?: 'two-sided' | 'less' | 'greater'
}

export interface KruskalWallisParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
}

export interface DunnTestParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
  pAdjustMethod?: 'bonferroni' | 'holm' | 'hochberg' | 'hommel'
}

export interface ChiSquareTestParams extends BaseParameters {
  observedColumn: string
  expectedColumn?: string
  testType?: 'independence' | 'goodness-of-fit'
}

export interface SignTestParams extends BaseParameters {
  column1: string
  column2: string
  alternative?: "two-sided" | "greater" | "less"
}

export interface RunsTestParams extends BaseParameters {
  column: string
  cutoff?: number | 'median' | 'mean'
}

export interface KSTestParams extends BaseParameters {
  column?: string  // one-sample
  column1?: string  // two-sample
  column2?: string  // two-sample
  distribution?: "normal" | "uniform" | "exponential"
}
export interface McNemarTestParams extends BaseParameters {
  before: string
  after: string
  successValue?: string | number
  correction?: boolean
}

// ============================================================================
// 분산분석 (ANOVA)
// ============================================================================

export interface OneWayANOVAParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
  postHoc?: 'tukey' | 'bonferroni' | 'games-howell' | 'none'
}

export interface TwoWayANOVAParams extends BaseParameters {
  factor1Column: string
  factor2Column: string
  valueColumn: string
  interaction?: boolean
}

export interface ThreeWayANOVAParams extends BaseParameters {
  factor1Column: string
  factor2Column: string
  factor3Column: string
  valueColumn: string
  interactions?: boolean
}

export interface MANOVAParams extends BaseParameters {
  groupColumn: string
  dependentColumns: string[]
}

export interface ANCOVAParams extends BaseParameters {
  groupColumn: string
  dependentColumn: string
  covariateColumns: string[]
}

export interface RepeatedMeasuresANOVAParams extends BaseParameters {
  subjectColumn: string
  withinFactorColumns: string[]
  valueColumn: string
}

export interface TukeyHSDParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
}

export interface BonferroniParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
}

export interface GamesHowellParams extends BaseParameters {
  groupColumn: string
  valueColumn: string
}

// ============================================================================
// 고급 분석
// ============================================================================

export interface PCAParams extends BaseParameters {
  columns: string[]
  nComponents?: number
  standardize?: boolean
}

export interface KMeansClusteringParams extends BaseParameters {
  columns: string[]
  k?: number  // Alias for nClusters
  nClusters?: number
  maxIterations?: number
  randomState?: number
}

export interface HierarchicalClusteringParams extends BaseParameters {
  columns: string[]
  method?: 'ward' | 'complete' | 'average' | 'single'
  metric?: 'euclidean' | 'manhattan' | 'cosine'
}

export interface FactorAnalysisParams extends BaseParameters {
  columns: string[]
  nFactors?: number
  rotation?: 'varimax' | 'promax' | 'none'
}

export interface DiscriminantAnalysisParams extends BaseParameters {
  groupColumn: string
  predictorColumns: string[]
}

export interface TimeSeriesDecompositionParams extends BaseParameters {
  timeColumn: string
  valueColumn: string
  period?: number
  model?: 'additive' | 'multiplicative'
}

export interface ARIMAForecastParams extends BaseParameters {
  valueColumn: string
  order: [number, number, number]  // (p, d, q)
  steps?: number  // Alias for nForecast
  nForecast?: number
}

export interface SARIMAForecastParams extends BaseParameters {
  valueColumn: string
  order: [number, number, number]  // (p, d, q)
  seasonalOrder: [number, number, number, number]  // (P, D, Q, s)
  steps?: number  // Alias for nForecast
  nForecast?: number
}

export interface VARModelParams extends BaseParameters {
  columns: string[]
  lag?: number  // Alias for maxLags
  maxLags?: number
  nForecast?: number
}

export interface KaplanMeierSurvivalParams extends BaseParameters {
  timeColumn: string
  eventColumn: string
  groupColumn?: string
}

export interface CoxRegressionParams extends BaseParameters {
  timeColumn: string
  eventColumn: string
  covariates?: string[]  // Alias for covariateColumns
  covariateColumns?: string[]
}

export interface MixedEffectsModelParams extends BaseParameters {
  dependentColumn: string
  fixedEffects?: string[]  // Alias for fixedEffectColumns
  randomEffects?: string[]  // Alias for randomEffectColumns
  fixedEffectColumns?: string[]
  randomEffectColumns?: string[]
  groupColumn?: string
}

export interface PowerAnalysisParams extends BaseParameters {
  effectSize?: number
  sampleSize?: number
  power?: number
  testType: 't-test' | 'anova' | 'correlation' | 'proportion'
}

export interface MannKendallTestParams extends BaseParameters {
  timeColumn: string
  valueColumn: string
}

// ============================================================================
// 회귀분석 확장 (Group 5)
// ============================================================================

export interface PoissonRegressionParams extends BaseParameters {
  dependentColumn: string
  independentColumns: string[]
}

export interface OrdinalRegressionParams extends BaseParameters {
  dependentColumn: string
  independentColumns: string[]
}

export interface StepwiseRegressionParams extends BaseParameters {
  dependentColumn: string
  candidateColumns: string[]
  method?: "forward" | "backward" | "both"
  entryThreshold?: number
  stayThreshold?: number
}

export interface DoseResponseParams extends BaseParameters {
  doseColumn: string
  responseColumn: string
  model?: "logistic" | "probit" | "weibull"
}

export interface ResponseSurfaceParams extends BaseParameters {
  factorColumns: string[]  // 최소 2개 이상
  responseColumn: string
  order?: number  // 1차 또는 2차 모델
}

export interface ThreeWayANOVAParams extends BaseParameters {
  factor1: string
  factor2: string
  factor3: string
  dependentColumn: string
}
// ============================================================================
// 신뢰도 분석
// ============================================================================

export interface CronbachAlphaParams extends BaseParameters {
  columns: string[]  // 최소 2개 이상의 항목(문항)
}

// ============================================================================
// 교차표 분석
// ============================================================================

export interface CrosstabAnalysisParams extends BaseParameters {
  rowVariable: string
  columnVariable: string
  performChiSquare?: boolean  // 카이제곱 검정 수행 여부 (기본값: true)
}

// ============================================================================
// 통합 파라미터 타입 (Union Type)
// ============================================================================

export type MethodParameters =
  // 기술통계/진단
  | DescriptiveStatsParams
  | NormalityTestParams
  | HomogeneityTestParams
  // 가설검정
  | OneSampleTTestParams
  | TwoSampleTTestParams
  | PairedTTestParams
  | WelchTTestParams
  | OneSampleProportionTestParams
  // 회귀/상관
  | SimpleLinearRegressionParams
  | MultipleRegressionParams
  | LogisticRegressionParams
  | CorrelationAnalysisParams
  | PartialCorrelationParams
  // 비모수
  | MannWhitneyUParams
  | WilcoxonSignedRankParams
  | KruskalWallisParams
  | DunnTestParams
  | ChiSquareTestParams
  | SignTestParams
  | RunsTestParams
  | KSTestParams
  | McNemarTestParams
  // ANOVA
  | OneWayANOVAParams
  | TwoWayANOVAParams
  | ThreeWayANOVAParams
  | MANOVAParams
  | ANCOVAParams
  | RepeatedMeasuresANOVAParams
  | TukeyHSDParams
  | BonferroniParams
  | GamesHowellParams
  // 고급분석
  | PCAParams
  | KMeansClusteringParams
  | HierarchicalClusteringParams
  | FactorAnalysisParams
  | DiscriminantAnalysisParams
  | TimeSeriesDecompositionParams
  | ARIMAForecastParams
  | SARIMAForecastParams
  | VARModelParams
  | KaplanMeierSurvivalParams
  | CoxRegressionParams
  | MixedEffectsModelParams
  | PowerAnalysisParams
  | MannKendallTestParams
  | PoissonRegressionParams
  | OrdinalRegressionParams
  | StepwiseRegressionParams
  | DoseResponseParams
  | ResponseSurfaceParams
  | CronbachAlphaParams
  | CrosstabAnalysisParams

// ============================================================================
// 타입 가드 함수 (런타임 검증)
// ============================================================================

export function isOneSampleTTestParams(
  params: unknown
): params is OneSampleTTestParams {
  const p = params as OneSampleTTestParams
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.column === 'string' &&
    typeof p.popmean === 'number'
  )
}

export function isTwoSampleTTestParams(
  params: unknown
): params is TwoSampleTTestParams {
  const p = params as TwoSampleTTestParams
  return (
    typeof p === 'object' &&
    p !== null &&
    typeof p.groupColumn === 'string' &&
    typeof p.valueColumn === 'string'
  )
}

// ... 필요시 다른 타입 가드 함수 추가 가능
