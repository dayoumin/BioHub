/**
 * Pyodide 통계 서비스 타입 정의
 */

export interface PyodideInterface {
  loadPackage: (packages: string | string[]) => Promise<void>
  runPython: (code: string) => any
  globals: {
    get: (name: string) => any
    set: (name: string, value: any) => void
  }
  toPy: (obj: any) => any
  FS: {
    writeFile: (filename: string, data: string | Uint8Array) => void
    readFile: (filename: string, options?: { encoding?: string }) => string | Uint8Array
  }
}

export interface StatisticalTestResult {
  statistic: number
  pValue: number
  alternative?: string
  method?: string
  [key: string]: any
}

export interface DescriptiveStatsResult {
  count: number
  mean: number
  std: number
  min: number
  max: number
  q25: number
  median: number
  q75: number
  skewness: number
  kurtosis: number
  variance: number
  sem: number
  cv: number
  range: number
  iqr: number
  [key: string]: any
}

export interface NormalityTestResult {
  shapiroWilk: {
    statistic: number
    pValue: number
    isNormal: boolean
  }
  andersonDarling: {
    statistic: number
    criticalValues: number[]
    significanceLevels: number[]
    isNormal: boolean
  }
  jarqueBera: {
    statistic: number
    pValue: number
    isNormal: boolean
  }
  [key: string]: any
}

export interface OutlierResult {
  outlierIndices: number[]
  outlierValues: number[]
  method: string
  threshold?: number
  bounds?: {
    lower: number
    upper: number
  }
  [key: string]: any
}

export interface CorrelationResult {
  coefficient: number
  pValue: number
  method: string
  confidenceInterval?: [number, number]
  [key: string]: any
}

export interface HomogeneityTestResult {
  statistic: number
  pValue: number
  method: string
  isHomogeneous: boolean
  [key: string]: any
}

export interface ANOVAResult {
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  dfTotal: number
  msBetween: number
  msWithin: number
  ssBetween: number
  ssWithin: number
  ssTotal: number
  etaSquared: number
  omegaSquared: number
  partialEtaSquared: number
  [key: string]: any
}

export interface MANOVAResult {
  test_statistics: {
    wilks_lambda: {
      statistic: number
      f_value: number
      df_num: number
      df_den: number
      p_value: number
    }
    pillai_trace: {
      statistic: number
      f_value: number
      df_num: number
      df_den: number
      p_value: number
    }
    hotelling_trace: {
      statistic: number
      f_value: number
      df_num: number
      df_den: number
      p_value: number
    }
    roy_greatest_root: {
      statistic: number
      f_value: number
      df_num: number
      df_den: number
      p_value: number
    }
  }
  univariate_anovas?: Array<{
    variable: string
    f_statistic: number
    p_value: number
    df: [number, number]
  }>
  n_groups: number
  n_dependent_vars: number
  n_observations: number
}

export interface TukeyHSDResult {
  comparisons: Array<{
    group1: string
    group2: string
    meanDiff: number
    pValue: number
    reject: boolean
    lowerCI: number
    upperCI: number
  }>
  criticalValue: number
  alpha: number
  [key: string]: any
}

export interface RegressionResult {
  coefficients: number[]
  intercept: number
  rSquared: number
  adjustedRSquared: number
  fStatistic: number
  fPValue: number
  residuals: number[]
  fitted: number[]
  standardErrors: number[]
  tStatistics: number[]
  pValues: number[]
  confidenceIntervals: Array<[number, number]>
  [key: string]: any
}

export interface PCAResult {
  components: number[][]
  explainedVariance: number[]
  explainedVarianceRatio: number[]
  cumulativeVarianceRatio: number[]
  loadings: number[][]
  scores: number[][]
  eigenvalues: number[]
  [key: string]: any
}

export interface ClusteringResult {
  labels: number[]
  centers: number[][]
  inertia: number
  silhouetteScore: number
  [key: string]: any
}

export interface TimeSeriesResult {
  trend: number[]
  seasonal: number[]
  residual: number[]
  period: number
  forecast?: number[]
  lower_bound?: number[]
  upper_bound?: number[]
  aic?: number
  bic?: number
  mae?: number
  rmse?: number
  model_params?: any
  fitted_values?: number[]
  residuals?: number[]
  confidence_level?: number
  [key: string]: any
}

export interface SurvivalResult {
  survival_function: {
    time: number[]
    survival_probability: number[]
    confidence_interval_lower: number[]
    confidence_interval_upper: number[]
  }
  median_survival_time?: number
  events_count: number
  censored_count: number
  risk_table?: Array<{
    time: number
    at_risk: number
    events: number
    censored: number
  }>
}

// 각 모듈별 서비스 인터페이스
export interface IDescriptiveService {
  calculateDescriptiveStats(data: number[]): Promise<DescriptiveStatsResult>
  normalityTest(data: number[], alpha?: number): Promise<NormalityTestResult>
  homogeneityTest(groups: number[][], method?: string): Promise<HomogeneityTestResult>
  outlierDetection(data: number[]): Promise<OutlierResult>
}

export interface IHypothesisService {
  oneSampleTTest(data: number[], popmean: number, alternative?: string): Promise<StatisticalTestResult>
  twoSampleTTest(group1: number[], group2: number[], equalVar?: boolean): Promise<StatisticalTestResult>
  pairedTTest(values1: number[], values2: number[], alternative?: string): Promise<StatisticalTestResult>
  correlation(x: number[], y: number[], method?: string): Promise<CorrelationResult>
  partialCorrelation(data: number[][], xCol: number, yCol: number, controlCols: number[]): Promise<CorrelationResult>
}

export interface IANOVAService {
  oneWayANOVA(groups: number[][]): Promise<ANOVAResult>
  twoWayANOVA(data: number[][], factor1: string[], factor2: string[]): Promise<ANOVAResult>
  repeatedMeasuresANOVA(data: number[][]): Promise<ANOVAResult>
  manova(dependentVars: number[][], groups: string[]): Promise<MANOVAResult>
  tukeyHSD(groups: number[][], groupNames?: string[], alpha?: number): Promise<TukeyHSDResult>
  gamesHowell(groups: number[][], groupNames?: string[], alpha?: number): Promise<TukeyHSDResult>
  bonferroni(groups: number[][], groupNames?: string[], alpha?: number): Promise<TukeyHSDResult>
}

export interface IRegressionService {
  simpleRegression(xValues: number[], yValues: number[]): Promise<RegressionResult>
  multipleRegression(xMatrix: number[][], yValues: number[], variableNames?: string[]): Promise<RegressionResult>
  logisticRegression(xMatrix: number[][], yValues: number[], variableNames?: string[]): Promise<RegressionResult>
}

export interface INonparametricService {
  mannWhitneyU(group1: number[], group2: number[], alternative?: string): Promise<StatisticalTestResult>
  wilcoxonSignedRank(values1: number[], values2: number[], alternative?: string): Promise<StatisticalTestResult>
  kruskalWallis(groups: number[][]): Promise<StatisticalTestResult>
  friedman(data: number[][]): Promise<StatisticalTestResult>
  chiSquareTest(observedMatrix: number[][], correction?: boolean): Promise<StatisticalTestResult>
}

export interface MixedEffectsResult {
  fixed_effects: {
    [key: string]: {
      coefficient: number
      std_error: number
      z_value: number
      p_value: number
      ci_lower: number
      ci_upper: number
    }
  }
  random_effects: {
    [key: string]: {
      variance: number
      std_dev: number
    }
  }
  model_fit: {
    log_likelihood: number
    aic: number
    bic: number
    converged: boolean
  }
  icc?: number  // Intraclass correlation
  r_squared?: {
    marginal: number
    conditional: number
  }
}

export interface SARIMAResult extends TimeSeriesResult {
  seasonal_order: {
    P: number
    D: number
    Q: number
    s: number
  }
}

export interface VARResult {
  coefficients: number[][]
  lag_order: number
  granger_causality?: {
    [key: string]: {
      test_statistic: number
      p_value: number
      df: number
    }
  }
  forecast: number[][]
  residuals: number[][]
  aic: number
  bic: number
}

export interface CoxRegressionResult {
  coefficients: {
    [key: string]: {
      coef: number
      exp_coef: number  // Hazard ratio
      se_coef: number
      z: number
      p_value: number
      ci_lower: number
      ci_upper: number
    }
  }
  concordance: number
  log_likelihood: number
  likelihood_ratio_test: {
    test_statistic: number
    df: number
    p_value: number
  }
  n_observations: number
  n_events: number
}

export interface IAdvancedService {
  pca(dataMatrix: number[][], columns?: string[], nComponents?: number, standardize?: boolean): Promise<PCAResult>
  clustering(data: number[][], nClusters: number, method?: string): Promise<ClusteringResult>
  timeSeriesDecomposition(data: number[], period?: number): Promise<TimeSeriesResult>
  arimaForecast(data: number[], p: number, d: number, q: number, steps: number): Promise<TimeSeriesResult>
  kaplanMeierSurvival(times: number[], events: number[]): Promise<SurvivalResult>
  mixedEffectsModel(data: any[], formula: string, groups: string): Promise<MixedEffectsResult>
  sarimaForecast(data: number[], order: [number, number, number], seasonal_order: [number, number, number, number], steps: number): Promise<SARIMAResult>
  varModel(data: number[][], maxlags?: number, steps?: number): Promise<VARResult>
  coxRegression(data: any[], duration_col: string, event_col: string, covariates: string[]): Promise<CoxRegressionResult>
}

declare global {
  interface Window {
    pyodide?: PyodideInterface
    loadPyodide?: (config: { indexURL: string }) => Promise<PyodideInterface>
  }
}