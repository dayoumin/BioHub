/**
 * Auto-generated from methods-registry.json
 * DO NOT EDIT MANUALLY
 *
 * Generated: 2025-12-16T23:56:17.223Z
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

import { PyodideCoreService, type WorkerMethodParam } from '@/lib/services/pyodide/core/pyodide-core.service'

// ========================================
// Worker 번호 상수
// ========================================

export const WORKER = {
  DESCRIPTIVE: 1,
  HYPOTHESIS: 2,
  NONPARAMETRIC_ANOVA: 3,
  REGRESSION_ADVANCED: 4
} as const

export type WorkerNumber = typeof WORKER[keyof typeof WORKER]

/**
 * undefined 값을 제거한 파라미터 객체 생성
 */
function filterParams(params: Record<string, WorkerMethodParam | undefined>): Record<string, WorkerMethodParam> {
  const result: Record<string, WorkerMethodParam> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) {
      result[key] = value
    }
  }
  return result
}

/**
 * PyodideCore 싱글톤 인스턴스를 통해 Worker 메서드 호출
 */
async function callWorkerMethod<T>(
  workerNum: WorkerNumber,
  methodName: string,
  params: Record<string, WorkerMethodParam | undefined>
): Promise<T> {
  const core = PyodideCoreService.getInstance()
  return core.callWorkerMethod<T>(workerNum, methodName, filterParams(params))
}


// ========================================
// Worker 1: descriptive
// 기술통계 및 기본 검정
// ========================================

export interface DescriptiveStatsResult {
  mean: number
  median: number
  mode: unknown
  std: number
  variance: number
  min: unknown
  max: unknown
  q1: unknown
  q3: unknown
  iqr: unknown
  skewness: unknown
  kurtosis: unknown
  n: number
}

export interface NormalityTestResult {
  statistic: number
  pValue: number
  isNormal: boolean
  interpretation: string
}

export interface OutlierDetectionResult {
  outlierIndices: unknown
  outlierValues: unknown
  lowerBound: unknown
  upperBound: unknown
  method: string
}

export interface FrequencyAnalysisResult {
  categories: string[]
  frequencies: unknown
  percentages: unknown
  cumulativePercentages: unknown
  total: unknown
  uniqueCount: unknown
}

export interface CrosstabAnalysisResult {
  rowCategories: string[]
  colCategories: string[]
  observedMatrix: number[][]
  rowTotals: unknown
  colTotals: unknown
  grandTotal: unknown
}

export interface OneSampleProportionTestResult {
  sampleProportion: unknown
  nullProportion: unknown
  pValue: number
  zStatistic: number
  pValueExact: unknown
  pValueApprox: unknown
  significant: boolean
  alpha: unknown
}

export interface CronbachAlphaResult {
  alpha: unknown
  nItems: unknown
  nRespondents: unknown
}

export interface KolmogorovSmirnovTestResult {
  statistic: number
  pValue: number
  isNormal: boolean
}

export interface KsTestOneSampleResult {
  statistic: number
  pValue: number
  n: number
  significant: boolean
  interpretation: string
}

export interface KsTestTwoSampleResult {
  statistic: number
  pValue: number
  n1: number
  n2: number
  significant: boolean
}

export interface MannKendallTestResult {
  trend: string
  statistic: number
  pValue: number
  tau: unknown
  slope: number
  intercept: number
}

export interface BonferroniCorrectionResult {
  adjustedPValues: unknown
  significantResults: unknown
  alpha: unknown
  correctedAlpha: unknown
}

export interface MeansPlotDataResult {
  descriptives: unknown
  plotData: unknown
  interpretation: string
}


/**
 * 기술통계량 계산
 * @worker Worker 1
 */
export async function descriptiveStats(data: number[], confidenceLevel?: number): Promise<DescriptiveStatsResult> {
  return callWorkerMethod<DescriptiveStatsResult>(1, 'descriptive_stats', { data, confidenceLevel })
}

/**
 * Shapiro-Wilk 정규성 검정
 * @worker Worker 1
 */
export async function normalityTest(data: number[], alpha?: number): Promise<NormalityTestResult> {
  return callWorkerMethod<NormalityTestResult>(1, 'normality_test', { data, alpha })
}

/**
 * 이상치 탐지 (IQR/Z-score)
 * @worker Worker 1
 */
export async function outlierDetection(data: number[], method?: string): Promise<OutlierDetectionResult> {
  return callWorkerMethod<OutlierDetectionResult>(1, 'outlier_detection', { data, method })
}

/**
 * 빈도분석
 * @worker Worker 1
 */
export async function frequencyAnalysis(values: number[] | number[][]): Promise<FrequencyAnalysisResult> {
  return callWorkerMethod<FrequencyAnalysisResult>(1, 'frequency_analysis', { values })
}

/**
 * 교차분석
 * @worker Worker 1
 */
export async function crosstabAnalysis(rowValues: number[] | number[][], colValues: number[] | number[][]): Promise<CrosstabAnalysisResult> {
  return callWorkerMethod<CrosstabAnalysisResult>(1, 'crosstab_analysis', { rowValues, colValues })
}

/**
 * 일표본 비율검정
 * @worker Worker 1
 */
export async function oneSampleProportionTest(successCount: number, totalCount: number, nullProportion?: number, alternative?: string, alpha?: number): Promise<OneSampleProportionTestResult> {
  return callWorkerMethod<OneSampleProportionTestResult>(1, 'one_sample_proportion_test', { successCount, totalCount, nullProportion, alternative, alpha })
}

/**
 * 크론바흐 알파 신뢰도
 * @worker Worker 1
 */
export async function cronbachAlpha(itemsMatrix: number[][]): Promise<CronbachAlphaResult> {
  return callWorkerMethod<CronbachAlphaResult>(1, 'cronbach_alpha', { itemsMatrix })
}

/**
 * K-S 정규성 검정
 * @worker Worker 1
 */
export async function kolmogorovSmirnovTest(data: number[]): Promise<KolmogorovSmirnovTestResult> {
  return callWorkerMethod<KolmogorovSmirnovTestResult>(1, 'kolmogorov_smirnov_test', { data })
}

/**
 * 일표본 K-S 검정
 * @worker Worker 1
 */
export async function ksTestOneSample(values: number[] | number[][]): Promise<KsTestOneSampleResult> {
  return callWorkerMethod<KsTestOneSampleResult>(1, 'ks_test_one_sample', { values })
}

/**
 * 이표본 K-S 검정
 * @worker Worker 1
 */
export async function ksTestTwoSample(values1: number[], values2: number[]): Promise<KsTestTwoSampleResult> {
  return callWorkerMethod<KsTestTwoSampleResult>(1, 'ks_test_two_sample', { values1, values2 })
}

/**
 * Mann-Kendall 추세 검정
 * @worker Worker 1
 */
export async function mannKendallTest(data: number[]): Promise<MannKendallTestResult> {
  return callWorkerMethod<MannKendallTestResult>(1, 'mann_kendall_test', { data })
}

/**
 * Bonferroni 다중비교 보정
 * @worker Worker 1
 */
export async function bonferroniCorrection(pValues: number[] | number[][], alpha?: number): Promise<BonferroniCorrectionResult> {
  return callWorkerMethod<BonferroniCorrectionResult>(1, 'bonferroni_correction', { pValues, alpha })
}

/**
 * 평균 플롯 데이터
 * @worker Worker 1
 */
export async function meansPlotData(data: number[], dependentVar: string, factorVar: string): Promise<MeansPlotDataResult> {
  return callWorkerMethod<MeansPlotDataResult>(1, 'means_plot_data', { data, dependentVar, factorVar })
}

// ========================================
// Worker 2: hypothesis
// 가설검정 및 상관분석
// ========================================

export interface TTestTwoSampleResult {
  statistic: number
  pValue: number
  cohensD: number
  mean1: unknown
  mean2: unknown
  std1: unknown
  std2: unknown
  n1: number
  n2: number
}

export interface TTestPairedResult {
  statistic: number
  pValue: number
  meanDiff: unknown
  nPairs: number
}

export interface TTestOneSampleResult {
  statistic: number
  pValue: number
  sampleMean: unknown
  sampleStd: unknown
  n: number
}

export interface ZTestResult {
  statistic: number
  pValue: number
  sampleMean: unknown
  n: number
}

export interface ChiSquareTestResult {
  statistic: number
  pValue: number
  df: number
  expectedMatrix: number[][]
}

export interface BinomialTestResult {
  pValue: number
  successCount: unknown
  totalCount: unknown
  proportion: unknown
  expectedProportion: unknown
}

export interface CorrelationTestResult {
  correlation: number
  pValue: number
  n: number
}

export interface PartialCorrelationResult {
  correlation: number
  pValue: number
  df: number
  confidenceInterval: { lower: number; upper: number }[]
}

export interface LeveneTestResult {
  statistic: number
  pValue: number
  homogeneous: boolean
}

export interface BartlettTestResult {
  statistic: number
  pValue: number
  homogeneous: boolean
}

export interface ChiSquareGoodnessTestResult {
  statistic: number
  pValue: number
  df: number
}

export interface ChiSquareIndependenceTestResult {
  chiSquare: number
  pValue: number
  df: number
  criticalValue: unknown
  reject: boolean
  cramersV: number
  observedMatrix: number[][]
  expectedMatrix: number[][]
}

export interface FisherExactTestResult {
  pValue: number
  oddsRatio: unknown
}

export interface PowerAnalysisResult {
  requiredSampleSize: unknown
  achievedPower: unknown
  effectSize: unknown
  alpha: unknown
  interpretation: string
}


/**
 * 독립표본 t-검정
 * @worker Worker 2
 */
export async function tTestTwoSample(group1: number[], group2: number[], equalVar?: boolean): Promise<TTestTwoSampleResult> {
  return callWorkerMethod<TTestTwoSampleResult>(2, 't_test_two_sample', { group1, group2, equalVar })
}

/**
 * 대응표본 t-검정
 * @worker Worker 2
 */
export async function tTestPaired(values1: number[], values2: number[]): Promise<TTestPairedResult> {
  return callWorkerMethod<TTestPairedResult>(2, 't_test_paired', { values1, values2 })
}

/**
 * 일표본 t-검정
 * @worker Worker 2
 */
export async function tTestOneSample(data: number[], popmean?: number): Promise<TTestOneSampleResult> {
  return callWorkerMethod<TTestOneSampleResult>(2, 't_test_one_sample', { data, popmean })
}

/**
 * Z-검정
 * @worker Worker 2
 */
export async function zTest(data: number[], popmean: number, popstd: number): Promise<ZTestResult> {
  return callWorkerMethod<ZTestResult>(2, 'z_test', { data, popmean, popstd })
}

/**
 * 카이제곱 검정
 * @worker Worker 2
 */
export async function chiSquareTest(observedMatrix: number[][], yatesCorrection?: boolean): Promise<ChiSquareTestResult> {
  return callWorkerMethod<ChiSquareTestResult>(2, 'chi_square_test', { observedMatrix, yatesCorrection })
}

/**
 * 이항검정
 * @worker Worker 2
 */
export async function binomialTest(successCount: number, totalCount: number, probability?: number, alternative?: string): Promise<BinomialTestResult> {
  return callWorkerMethod<BinomialTestResult>(2, 'binomial_test', { successCount, totalCount, probability, alternative })
}

/**
 * 상관계수 검정
 * @worker Worker 2
 */
export async function correlationTest(x: number[], y: number[], method?: string): Promise<CorrelationTestResult> {
  return callWorkerMethod<CorrelationTestResult>(2, 'correlation_test', { x, y, method })
}

/**
 * 편상관분석
 * @worker Worker 2
 */
export async function partialCorrelation(dataMatrix: number[][], xIdx: number, yIdx: number, controlIndices: (string | number)[]): Promise<PartialCorrelationResult> {
  return callWorkerMethod<PartialCorrelationResult>(2, 'partial_correlation', { dataMatrix, xIdx, yIdx, controlIndices })
}

/**
 * Levene 등분산 검정
 * @worker Worker 2
 */
export async function leveneTest(groups: number[] | number[][]): Promise<LeveneTestResult> {
  return callWorkerMethod<LeveneTestResult>(2, 'levene_test', { groups })
}

/**
 * Bartlett 등분산 검정
 * @worker Worker 2
 */
export async function bartlettTest(groups: number[] | number[][]): Promise<BartlettTestResult> {
  return callWorkerMethod<BartlettTestResult>(2, 'bartlett_test', { groups })
}

/**
 * 카이제곱 적합도 검정
 * @worker Worker 2
 */
export async function chiSquareGoodnessTest(observed: number[], expected?: number[], alpha?: number): Promise<ChiSquareGoodnessTestResult> {
  return callWorkerMethod<ChiSquareGoodnessTestResult>(2, 'chi_square_goodness_test', { observed, expected, alpha })
}

/**
 * 카이제곱 독립성 검정
 * @worker Worker 2
 */
export async function chiSquareIndependenceTest(observedMatrix: number[][], yatesCorrection?: boolean, alpha?: number): Promise<ChiSquareIndependenceTestResult> {
  return callWorkerMethod<ChiSquareIndependenceTestResult>(2, 'chi_square_independence_test', { observedMatrix, yatesCorrection, alpha })
}

/**
 * Fisher 정확검정
 * @worker Worker 2
 */
export async function fisherExactTest(table: number[][], alternative?: string, alpha?: number): Promise<FisherExactTestResult> {
  return callWorkerMethod<FisherExactTestResult>(2, 'fisher_exact_test', { table, alternative, alpha })
}

/**
 * 검정력 분석
 * @worker Worker 2
 */
export async function powerAnalysis(testType: string, analysisType: string, alpha?: number, power?: number, effectSize?: number, sampleSize?: number, sides?: number): Promise<PowerAnalysisResult> {
  return callWorkerMethod<PowerAnalysisResult>(2, 'power_analysis', { testType, analysisType, alpha, power, effectSize, sampleSize, sides })
}

// ========================================
// Worker 3: nonparametric-anova
// 비모수 검정 및 분산분석
// ========================================

export interface MannWhitneyTestResult {
  statistic: number
  pValue: number
  effectSize: unknown
}

export interface WilcoxonTestResult {
  statistic: number
  pValue: number
  effectSize: unknown
}

export interface KruskalWallisTestResult {
  statistic: number
  pValue: number
  df: number
}

export interface FriedmanTestResult {
  statistic: number
  pValue: number
  df: number
}

export interface OneWayAnovaResult {
  fStatistic: number
  pValue: number
  dfBetween: number
  dfWithin: number
  etaSquared: number
  omegaSquared: number
}

export interface TwoWayAnovaResult {
  factor1: unknown
  factor2: unknown
  interaction: unknown
  residual: number[]
  anovaTable: unknown
}

export interface TukeyHsdResult {
  comparisons: unknown[]
}

export interface SignTestResult {
  statistic: number
  pValue: number
  nPositive: unknown
  nNegative: unknown
  nTies: unknown
}

export interface RunsTestResult {
  statistic: number
  pValue: number
  nRuns: unknown
  expectedRuns: unknown
}

export interface McnemarTestResult {
  statistic: number
  pValue: number
  continuityCorrection: unknown
  discordantPairs: unknown
}

export interface CochranQTestResult {
  qStatistic: unknown
  pValue: number
  df: number
}

export interface MoodMedianTestResult {
  statistic: number
  pValue: number
  grandMedian: unknown
}

export interface RepeatedMeasuresAnovaResult {
  fStatistic: number
  pValue: number
  df: number
}

export interface AncovaResult {
  fStatistic: number
  pValue: number
  adjustedMeans: unknown
}

export interface ManovaResult {
  wilksLambda: unknown
  fStatistic: number
  pValue: number
}

export interface ScheffeTestResult {
  comparisons: unknown[]
}

export interface DunnTestResult {
  comparisons: unknown[]
}

export interface GamesHowellTestResult {
  comparisons: unknown[]
}


/**
 * Mann-Whitney U 검정
 * @worker Worker 3
 */
export async function mannWhitneyTest(group1: number[], group2: number[]): Promise<MannWhitneyTestResult> {
  return callWorkerMethod<MannWhitneyTestResult>(3, 'mann_whitney_test', { group1, group2 })
}

/**
 * Wilcoxon 부호순위 검정
 * @worker Worker 3
 */
export async function wilcoxonTest(values1: number[], values2: number[]): Promise<WilcoxonTestResult> {
  return callWorkerMethod<WilcoxonTestResult>(3, 'wilcoxon_test', { values1, values2 })
}

/**
 * Kruskal-Wallis H 검정
 * @worker Worker 3
 */
export async function kruskalWallisTest(groups: number[] | number[][]): Promise<KruskalWallisTestResult> {
  return callWorkerMethod<KruskalWallisTestResult>(3, 'kruskal_wallis_test', { groups })
}

/**
 * Friedman 검정
 * @worker Worker 3
 */
export async function friedmanTest(groups: number[] | number[][]): Promise<FriedmanTestResult> {
  return callWorkerMethod<FriedmanTestResult>(3, 'friedman_test', { groups })
}

/**
 * 일원 분산분석
 * @worker Worker 3
 */
export async function oneWayAnova(groups: number[] | number[][]): Promise<OneWayAnovaResult> {
  return callWorkerMethod<OneWayAnovaResult>(3, 'one_way_anova', { groups })
}

/**
 * 이원 분산분석
 * @worker Worker 3
 */
export async function twoWayAnova(dataValues: number[] | number[][], factor1Values: number[] | number[][], factor2Values: number[] | number[][]): Promise<TwoWayAnovaResult> {
  return callWorkerMethod<TwoWayAnovaResult>(3, 'two_way_anova', { dataValues, factor1Values, factor2Values })
}

/**
 * Tukey HSD 사후검정
 * @worker Worker 3
 */
export async function tukeyHsd(groups: number[] | number[][]): Promise<TukeyHsdResult> {
  return callWorkerMethod<TukeyHsdResult>(3, 'tukey_hsd', { groups })
}

/**
 * 부호 검정
 * @worker Worker 3
 */
export async function signTest(before: number[], after: number[]): Promise<SignTestResult> {
  return callWorkerMethod<SignTestResult>(3, 'sign_test', { before, after })
}

/**
 * 런 검정
 * @worker Worker 3
 */
export async function runsTest(sequence: number[]): Promise<RunsTestResult> {
  return callWorkerMethod<RunsTestResult>(3, 'runs_test', { sequence })
}

/**
 * McNemar 검정
 * @worker Worker 3
 */
export async function mcnemarTest(contingencyTable: number[][]): Promise<McnemarTestResult> {
  return callWorkerMethod<McnemarTestResult>(3, 'mcnemar_test', { contingencyTable })
}

/**
 * Cochran Q 검정
 * @worker Worker 3
 */
export async function cochranQTest(dataMatrix: number[][]): Promise<CochranQTestResult> {
  return callWorkerMethod<CochranQTestResult>(3, 'cochran_q_test', { dataMatrix })
}

/**
 * Mood 중앙값 검정
 * @worker Worker 3
 */
export async function moodMedianTest(groups: number[] | number[][]): Promise<MoodMedianTestResult> {
  return callWorkerMethod<MoodMedianTestResult>(3, 'mood_median_test', { groups })
}

/**
 * 반복측정 분산분석
 * @worker Worker 3
 */
export async function repeatedMeasuresAnova(dataMatrix: number[][], subjectIds: (string | number)[], timeLabels: (string | number)[]): Promise<RepeatedMeasuresAnovaResult> {
  return callWorkerMethod<RepeatedMeasuresAnovaResult>(3, 'repeated_measures_anova', { dataMatrix, subjectIds, timeLabels })
}

/**
 * 공분산분석
 * @worker Worker 3
 */
export async function ancova(yValues: number[] | number[][], groupValues: number[] | number[][], covariates: number[]): Promise<AncovaResult> {
  return callWorkerMethod<AncovaResult>(3, 'ancova', { yValues, groupValues, covariates })
}

/**
 * 다변량 분산분석
 * @worker Worker 3
 */
export async function manova(dataMatrix: number[][], groupValues: number[] | number[][], varNames: string[]): Promise<ManovaResult> {
  return callWorkerMethod<ManovaResult>(3, 'manova', { dataMatrix, groupValues, varNames })
}

/**
 * Scheffe 사후검정
 * @worker Worker 3
 */
export async function scheffeTest(groups: number[] | number[][]): Promise<ScheffeTestResult> {
  return callWorkerMethod<ScheffeTestResult>(3, 'scheffe_test', { groups })
}

/**
 * Dunn 사후검정
 * @worker Worker 3
 */
export async function dunnTest(groups: number[] | number[][], pAdjust?: string): Promise<DunnTestResult> {
  return callWorkerMethod<DunnTestResult>(3, 'dunn_test', { groups, pAdjust })
}

/**
 * Games-Howell 사후검정
 * @worker Worker 3
 */
export async function gamesHowellTest(groups: number[] | number[][]): Promise<GamesHowellTestResult> {
  return callWorkerMethod<GamesHowellTestResult>(3, 'games_howell_test', { groups })
}

// ========================================
// Worker 4: regression-advanced
// 회귀분석 및 고급 통계
// ========================================

export interface LinearRegressionResult {
  slope: number
  intercept: number
  rSquared: number
  adjRSquared: number
  pValue: number
  standardError: unknown
}

export interface MultipleRegressionResult {
  coefficients: number[]
  rSquared: number
  adjRSquared: number
  fStatistic: number
  pValue: number
}

export interface LogisticRegressionResult {
  coefficients: number[]
  accuracy: unknown
  auc: unknown
  confusionMatrix: number[][]
}

export interface PcaAnalysisResult {
  components: unknown
  explainedVariance: unknown
  explainedVarianceRatio: unknown
  cumulativeVariance: unknown
  loadings: number[]
  scores: unknown
}

export interface CurveEstimationResult {
  parameters: unknown
  rSquared: number
  equation: string
  predictions: number[]
}

export interface NonlinearRegressionResult {
  parameters: unknown
  rSquared: number
  equation: string
  predictions: number[]
}

export interface StepwiseRegressionResult {
  selectedVariables: unknown
  coefficients: number[]
  rSquared: number
  steps: unknown
}

export interface BinaryLogisticResult {
  coefficients: number[]
  oddsRatios: unknown
  pValues: unknown
  accuracy: unknown
  auc: unknown
}

export interface MultinomialLogisticResult {
  coefficients: number[]
  accuracy: unknown
}

export interface OrdinalLogisticResult {
  coefficients: number[]
  thresholds: unknown
}

export interface ProbitRegressionResult {
  coefficients: number[]
  pValues: unknown
  marginalEffects: unknown
}

export interface PoissonRegressionResult {
  coefficients: number[]
  pValues: unknown
  incidenceRateRatios: unknown
}

export interface NegativeBinomialRegressionResult {
  coefficients: number[]
  pValues: unknown
  dispersion: unknown
}

export interface FactorAnalysisResult {
  loadings: number[]
  communalities: unknown
  explainedVariance: unknown
  eigenvalues: number[]
}

export interface ClusterAnalysisResult {
  clusters: number[]
  centers: unknown
  silhouetteScore: unknown
  inertia: unknown
}

export interface TimeSeriesAnalysisResult {
  trend: string
  seasonal: number[]
  residual: number[]
  forecast: number[]
  acf: number[]
  pacf: number[]
}

export interface DurbinWatsonTestResult {
  statistic: number
  interpretation: string
}

export interface DiscriminantAnalysisResult {
  coefficients: number[]
  totalVariance: unknown
  functions: unknown
  predictions: number[]
  confusionMatrix: number[][]
  interpretation: string
}

export interface KaplanMeierSurvivalResult {
  survivalProbabilities: unknown
  confidenceIntervals: { lower: number; upper: number }[]
  medianSurvival: unknown
}

export interface CoxRegressionResult {
  coefficients: number[]
  hazardRatios: unknown
  pValues: unknown
  confidenceIntervals: { lower: number; upper: number }[]
  concordance: unknown
}


/**
 * 단순 선형회귀
 * @worker Worker 4
 */
export async function linearRegression(x: number[], y: number[]): Promise<LinearRegressionResult> {
  return callWorkerMethod<LinearRegressionResult>(4, 'linear_regression', { x, y })
}

/**
 * 다중 회귀분석
 * @worker Worker 4
 */
export async function multipleRegression(X: number[][], y: number[]): Promise<MultipleRegressionResult> {
  return callWorkerMethod<MultipleRegressionResult>(4, 'multiple_regression', { X, y })
}

/**
 * 로지스틱 회귀
 * @worker Worker 4
 */
export async function logisticRegression(X: number[][], y: number[]): Promise<LogisticRegressionResult> {
  return callWorkerMethod<LogisticRegressionResult>(4, 'logistic_regression', { X, y })
}

/**
 * 주성분 분석
 * @worker Worker 4
 */
export async function pcaAnalysis(data: number[], nComponents?: number): Promise<PcaAnalysisResult> {
  return callWorkerMethod<PcaAnalysisResult>(4, 'pca_analysis', { data, nComponents })
}

/**
 * 곡선 추정
 * @worker Worker 4
 */
export async function curveEstimation(xValues: number[] | number[][], yValues: number[] | number[][], modelType?: string): Promise<CurveEstimationResult> {
  return callWorkerMethod<CurveEstimationResult>(4, 'curve_estimation', { xValues, yValues, modelType })
}

/**
 * 비선형 회귀
 * @worker Worker 4
 */
export async function nonlinearRegression(xValues: number[] | number[][], yValues: number[] | number[][], modelType?: string, initialGuess?: number[] | null): Promise<NonlinearRegressionResult> {
  return callWorkerMethod<NonlinearRegressionResult>(4, 'nonlinear_regression', { xValues, yValues, modelType, initialGuess })
}

/**
 * 단계적 회귀
 * @worker Worker 4
 */
export async function stepwiseRegression(yValues: number[] | number[][], xMatrix: number[][], variableNames?: string[], method?: string, entryThreshold?: number, stayThreshold?: number): Promise<StepwiseRegressionResult> {
  return callWorkerMethod<StepwiseRegressionResult>(4, 'stepwise_regression', { yValues, xMatrix, variableNames, method, entryThreshold, stayThreshold })
}

/**
 * 이항 로지스틱 회귀
 * @worker Worker 4
 */
export async function binaryLogistic(xMatrix: number[][], yValues: number[] | number[][]): Promise<BinaryLogisticResult> {
  return callWorkerMethod<BinaryLogisticResult>(4, 'binary_logistic', { xMatrix, yValues })
}

/**
 * 다항 로지스틱 회귀
 * @worker Worker 4
 */
export async function multinomialLogistic(xMatrix: number[][], yValues: number[] | number[][]): Promise<MultinomialLogisticResult> {
  return callWorkerMethod<MultinomialLogisticResult>(4, 'multinomial_logistic', { xMatrix, yValues })
}

/**
 * 순서형 로지스틱 회귀
 * @worker Worker 4
 */
export async function ordinalLogistic(xMatrix: number[][], yValues: number[] | number[][]): Promise<OrdinalLogisticResult> {
  return callWorkerMethod<OrdinalLogisticResult>(4, 'ordinal_logistic', { xMatrix, yValues })
}

/**
 * 프로빗 회귀
 * @worker Worker 4
 */
export async function probitRegression(xMatrix: number[][], yValues: number[] | number[][]): Promise<ProbitRegressionResult> {
  return callWorkerMethod<ProbitRegressionResult>(4, 'probit_regression', { xMatrix, yValues })
}

/**
 * 포아송 회귀
 * @worker Worker 4
 */
export async function poissonRegression(xMatrix: number[][], yValues: number[] | number[][]): Promise<PoissonRegressionResult> {
  return callWorkerMethod<PoissonRegressionResult>(4, 'poisson_regression', { xMatrix, yValues })
}

/**
 * 음이항 회귀
 * @worker Worker 4
 */
export async function negativeBinomialRegression(xMatrix: number[][], yValues: number[] | number[][]): Promise<NegativeBinomialRegressionResult> {
  return callWorkerMethod<NegativeBinomialRegressionResult>(4, 'negative_binomial_regression', { xMatrix, yValues })
}

/**
 * 요인분석
 * @worker Worker 4
 */
export async function factorAnalysis(dataMatrix: number[][], nFactors?: number, rotation?: string): Promise<FactorAnalysisResult> {
  return callWorkerMethod<FactorAnalysisResult>(4, 'factor_analysis', { dataMatrix, nFactors, rotation })
}

/**
 * 군집분석
 * @worker Worker 4
 */
export async function clusterAnalysis(data: number[], method?: string, numClusters?: number, linkage?: string, distance?: string): Promise<ClusterAnalysisResult> {
  return callWorkerMethod<ClusterAnalysisResult>(4, 'cluster_analysis', { data, method, numClusters, linkage, distance })
}

/**
 * 시계열 분석
 * @worker Worker 4
 */
export async function timeSeriesAnalysis(dataValues: number[] | number[][], seasonalPeriods?: number): Promise<TimeSeriesAnalysisResult> {
  return callWorkerMethod<TimeSeriesAnalysisResult>(4, 'time_series_analysis', { dataValues, seasonalPeriods })
}

/**
 * Durbin-Watson 자기상관 검정
 * @worker Worker 4
 */
export async function durbinWatsonTest(residuals: number[]): Promise<DurbinWatsonTestResult> {
  return callWorkerMethod<DurbinWatsonTestResult>(4, 'durbin_watson_test', { residuals })
}

/**
 * 판별분석
 * @worker Worker 4
 */
export async function discriminantAnalysis(data: number[], groups: number[] | number[][]): Promise<DiscriminantAnalysisResult> {
  return callWorkerMethod<DiscriminantAnalysisResult>(4, 'discriminant_analysis', { data, groups })
}

/**
 * Kaplan-Meier 생존분석
 * @worker Worker 4
 */
export async function kaplanMeierSurvival(times: number[], events: number[]): Promise<KaplanMeierSurvivalResult> {
  return callWorkerMethod<KaplanMeierSurvivalResult>(4, 'kaplan_meier_survival', { times, events })
}

/**
 * Cox 비례위험모형
 * @worker Worker 4
 */
export async function coxRegression(times: number[], events: number[], covariateData: number[][], covariateNames: string[]): Promise<CoxRegressionResult> {
  return callWorkerMethod<CoxRegressionResult>(4, 'cox_regression', { times, events, covariateData, covariateNames })
}

// ========================================
// 메서드 이름 유니온 타입
// ========================================

export type Worker1Method = 'descriptive_stats' | 'normality_test' | 'outlier_detection' | 'frequency_analysis' | 'crosstab_analysis' | 'one_sample_proportion_test' | 'cronbach_alpha' | 'kolmogorov_smirnov_test' | 'ks_test_one_sample' | 'ks_test_two_sample' | 'mann_kendall_test' | 'bonferroni_correction' | 'means_plot_data'
export type Worker2Method = 't_test_two_sample' | 't_test_paired' | 't_test_one_sample' | 'z_test' | 'chi_square_test' | 'binomial_test' | 'correlation_test' | 'partial_correlation' | 'levene_test' | 'bartlett_test' | 'chi_square_goodness_test' | 'chi_square_independence_test' | 'fisher_exact_test' | 'power_analysis'
export type Worker3Method = 'mann_whitney_test' | 'wilcoxon_test' | 'kruskal_wallis_test' | 'friedman_test' | 'one_way_anova' | 'two_way_anova' | 'tukey_hsd' | 'sign_test' | 'runs_test' | 'mcnemar_test' | 'cochran_q_test' | 'mood_median_test' | 'repeated_measures_anova' | 'ancova' | 'manova' | 'scheffe_test' | 'dunn_test' | 'games_howell_test'
export type Worker4Method = 'linear_regression' | 'multiple_regression' | 'logistic_regression' | 'pca_analysis' | 'curve_estimation' | 'nonlinear_regression' | 'stepwise_regression' | 'binary_logistic' | 'multinomial_logistic' | 'ordinal_logistic' | 'probit_regression' | 'poisson_regression' | 'negative_binomial_regression' | 'factor_analysis' | 'cluster_analysis' | 'time_series_analysis' | 'durbin_watson_test' | 'discriminant_analysis' | 'kaplan_meier_survival' | 'cox_regression'

export type AllMethodName = Worker1Method | Worker2Method | Worker3Method | Worker4Method
