/**
 * Statistics Results Type Definitions
 *
 * Centralized type definitions for all statistics analysis results.
 * Ensures naming consistency (camelCase) and type safety.
 *
 * Migration Guide:
 * 1. Import from this file instead of defining inline
 * 2. Extend BaseTestResult for common fields
 * 3. Use shared interfaces (EffectSize, DescriptiveStats, etc.)
 *
 * @see STATISTICS_CODING_STANDARDS.md - Section 17
 */

// ============================================================================
// Common Shared Types
// ============================================================================

/**
 * Effect size with interpretation
 * Used by: t-test, Mann-Whitney, ANOVA, etc.
 */
export interface EffectSize {
  value: number
  interpretation: 'negligible' | 'small' | 'medium' | 'large' | string
  /** Effect size metric name (e.g., "Cohen's d", "r", "eta-squared") */
  metric?: string
}

/**
 * Effect size with Cohen's d (t-tests)
 */
export interface CohensDEffect {
  cohensD: number
  interpretation: string
}

/**
 * Basic descriptive statistics
 * Used by: Mann-Whitney, Kruskal-Wallis, descriptive analysis, etc.
 */
export interface DescriptiveStats {
  mean: number
  median: number
  std?: number
  min: number
  max: number
  q1?: number
  q3?: number
  iqr?: number
  n?: number
}

/**
 * Result interpretation structure
 * Used by most test results for user-friendly explanations
 */
export interface ResultInterpretation {
  summary: string
  comparison?: string
  recommendations?: string[]
}

/**
 * Post-hoc comparison result (pairwise comparisons)
 * Used by: ANOVA, Kruskal-Wallis, Friedman, etc.
 */
export interface PostHocComparison {
  group1: string
  group2: string
  statistic?: number
  pValue: number
  significant: boolean
  meanDiff?: number
  ci?: [number, number]
}

// ============================================================================
// Base Result Interfaces
// ============================================================================

/**
 * Base interface for all statistical test results
 * All specific Result types should extend this
 */
export interface BaseTestResult {
  /** Test statistic value */
  statistic: number
  /** P-value (always camelCase) */
  pValue: number
  /** Sample size(s) */
  n?: number
  /** Effect size (optional) - can be specialized in derived interfaces */
  effectSize?: EffectSize | Record<string, unknown>
  /** Human-readable interpretation */
  interpretation?: ResultInterpretation | string
}

/**
 * Base interface for parametric tests
 * Extends BaseTestResult with degrees of freedom
 */
export interface ParametricTestResult extends BaseTestResult {
  /** Degrees of freedom */
  df: number | [number, number]
  /** Confidence interval */
  ci?: [number, number]
  /** Confidence level (default: 0.95) */
  confidenceLevel?: number
}

/**
 * Base interface for non-parametric tests
 */
export interface NonParametricTestResult extends BaseTestResult {
  /** Rank-based statistic */
  rankSum?: number
  /** Median difference */
  medianDiff?: number
}

// ============================================================================
// T-Test Results
// ============================================================================

export interface TTestResult extends Omit<ParametricTestResult, "effectSize"> {
  type: 'one-sample' | 'two-sample' | 'paired'
  tStatistic: number
  meanDiff?: number
  sampleMean?: number
  sampleStd?: number
  sampleN?: number
  /** Group statistics for two-sample */
  group1?: { mean: number; std: number; n: number }
  group2?: { mean: number; std: number; n: number }
  effectSize?: CohensDEffect
}

export interface WelchTResult extends Omit<ParametricTestResult, "effectSize"> {
  tStatistic: number
  meanDiff: number
  pooledStd: number
  effectSize?: CohensDEffect
}

// ============================================================================
// Non-parametric Test Results
// ============================================================================

export interface MannWhitneyResult extends NonParametricTestResult {
  uValue: number
  nobs1: number
  nobs2: number
  rankSum1: number
  rankSum2: number
  descriptives: {
    group1: DescriptiveStats
    group2: DescriptiveStats
  }
}

export interface WilcoxonResult extends NonParametricTestResult {
  wStatistic: number
  zStatistic?: number
  nPairs: number
  nTies?: number
}

export interface KruskalWallisResult extends NonParametricTestResult {
  hStatistic: number
  df: number
  groupStats: Array<{
    group: string
    n: number
    median: number
    meanRank: number
  }>
  postHoc?: PostHocComparison[]
}

export interface FriedmanResult extends NonParametricTestResult {
  chiSquare: number
  df: number
  conditionStats: Array<{
    condition: string
    meanRank: number
    median: number
  }>
  postHoc?: PostHocComparison[]
}

// ============================================================================
// ANOVA Results
// ============================================================================

export interface ANOVAGroupStats {
  group: string
  n: number
  mean: number
  std: number
  se?: number
}

export interface ANOVAFactorResult {
  source: string
  sumOfSquares: number
  df: number
  meanSquare: number
  fStatistic: number
  pValue: number
  etaSquared?: number
  partialEtaSquared?: number
}

export interface ANOVAResult extends Omit<ParametricTestResult, "effectSize"> {
  fStatistic: number
  sumOfSquares: {
    between: number
    within: number
    total: number
  }
  meanSquares: {
    between: number
    within: number
  }
  groupStats: ANOVAGroupStats[]
  postHoc?: PostHocComparison[]
  effectSize?: {
    etaSquared: number
    omegaSquared?: number
    interpretation: string
  }
  homogeneityTest?: {
    statistic: number
    pValue: number
    method: string
    assumption: 'met' | 'violated'
  }
}

export interface ANCOVAResult extends ANOVAResult {
  adjustedMeans: Array<{
    group: string
    adjustedMean: number
    se: number
  }>
  covariateEffects: Array<{
    covariate: string
    coefficient: number
    se: number
    tStatistic: number
    pValue: number
  }>
}

export interface RepeatedMeasuresANOVAResult extends ANOVAResult {
  sphericityTest?: {
    mauchlyW: number
    pValue: number
    assumption: 'met' | 'violated'
    correction?: {
      greenhouseGeisser: number
      huynhFeldt: number
    }
  }
  withinSubjectEffects: ANOVAFactorResult[]
  betweenSubjectEffects?: ANOVAFactorResult[]
}

// ============================================================================
// Correlation Results
// ============================================================================

export interface CorrelationResult extends BaseTestResult {
  r: number
  rSquared: number
  method: 'pearson' | 'spearman' | 'kendall'
  n: number
  ci?: [number, number]
}

export interface CorrelationMatrixResult {
  variables: string[]
  correlationMatrix: number[][]
  pValueMatrix: number[][]
  method: 'pearson' | 'spearman' | 'kendall'
  n: number
}

export interface PartialCorrelationResult extends BaseTestResult {
  r: number
  controlVariables: string[]
  df: number
}

// ============================================================================
// Chi-Square Results
// ============================================================================

export interface ChiSquareResult extends BaseTestResult {
  chiSquare: number
  df: number
  expectedFrequencies?: number[] | number[][]
  observedFrequencies?: number[] | number[][]
  cramersV?: number
  phiCoefficient?: number
}

export interface ChiSquareGoodnessResult extends ChiSquareResult {
  categories: string[]
  observed: number[]
  expected: number[]
}

export interface ChiSquareIndependenceResult extends ChiSquareResult {
  contingencyTable: number[][]
  rowLabels: string[]
  colLabels: string[]
  standardizedResiduals?: number[][]
}

// ============================================================================
// Regression Results
// ============================================================================

export interface RegressionCoefficient {
  variable: string
  coefficient: number
  se: number
  tStatistic: number
  pValue: number
  ci?: [number, number]
  vif?: number
}

export interface RegressionResult extends BaseTestResult {
  rSquared: number
  adjustedRSquared: number
  fStatistic: number
  coefficients: RegressionCoefficient[]
  residualStats?: {
    mean: number
    std: number
    skewness?: number
    kurtosis?: number
  }
  diagnostics?: {
    durbinWatson?: number
    normality?: { statistic: number; pValue: number }
    heteroscedasticity?: { statistic: number; pValue: number }
  }
}

// ============================================================================
// Time Series Results
// ============================================================================

export interface StationarityTestResult extends BaseTestResult {
  method: 'adf' | 'kpss' | 'pp'
  criticalValues: Record<string, number>
  isStationary: boolean
  nLags?: number
}

export interface ARIMAResult {
  order: [number, number, number]
  seasonalOrder?: [number, number, number, number]
  coefficients: {
    ar?: number[]
    ma?: number[]
    constant?: number
  }
  aic: number
  bic: number
  logLikelihood: number
  residualStats: {
    mean: number
    std: number
    ljungBox?: { statistic: number; pValue: number }
  }
  forecast?: {
    values: number[]
    ci: Array<[number, number]>
    dates?: string[]
  }
}

// ============================================================================
// Survival Analysis Results
// ============================================================================

export interface KaplanMeierResult {
  survivalCurve: Array<{
    time: number
    survival: number
    ci: [number, number]
    nAtRisk: number
    nEvents: number
  }>
  medianSurvival?: number
  meanSurvival?: number
}

export interface CoxRegressionResult extends BaseTestResult {
  coefficients: Array<{
    variable: string
    coef: number
    se: number
    hazardRatio: number
    zStatistic: number
    pValue: number
    ci: [number, number]
  }>
  concordance: number
  logLikelihood: number
  aic: number
  globalTest: {
    statistic: number
    df: number
    pValue: number
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Common data row type for uploaded data
 */
export interface DataRow {
  [key: string]: string | number | null | undefined
}

/**
 * Type guard helper for checking result types
 */
export function hasEffectSize<T extends BaseTestResult>(
  result: T
): result is T & { effectSize: EffectSize } {
  return result.effectSize !== undefined && result.effectSize !== null
}

export function hasPostHoc<T extends { postHoc?: PostHocComparison[] }>(
  result: T
): result is T & { postHoc: PostHocComparison[] } {
  return Array.isArray(result.postHoc) && result.postHoc.length > 0
}
