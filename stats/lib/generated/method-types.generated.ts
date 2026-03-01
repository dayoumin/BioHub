/**
 * Auto-generated from methods-registry.json
 * DO NOT EDIT MANUALLY
 *
 * Generated: 2026-02-26T02:17:51.757Z
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
  REGRESSION_ADVANCED: 4,
  SURVIVAL: 5
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
  mode: number
  std: number
  variance: number
  min: number
  max: number
  q1: number
  q3: number
  iqr: number
  skewness: number
  kurtosis: number
  n: number
}

export interface NormalityTestResult {
  statistic: number
  pValue: number
  isNormal: boolean
  interpretation: string
}

export interface OutlierDetectionResult {
  outlierIndices: number[]
  outlierValues: number[]
  lowerBound: number
  upperBound: number
  method: string
}

export interface FrequencyAnalysisResult {
  categories: string[]
  frequencies: number[]
  percentages: number[]
  cumulativePercentages: number[]
  total: number
  uniqueCount: number
}

export interface CrosstabAnalysisResult {
  rowCategories: string[]
  colCategories: string[]
  observedMatrix: number[][]
  rowTotals: number[]
  colTotals: number[]
  grandTotal: number
}

export interface OneSampleProportionTestResult {
  sampleProportion: number
  nullProportion: number
  pValue: number
  zStatistic: number
  pValueExact: number
  pValueApprox: number
  significant: boolean
  alpha: number
}

export interface CronbachAlphaResult {
  alpha: number
  nItems: number
  nRespondents: number
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
  tau: number
  slope: number
  intercept: number
}

export interface BonferroniCorrectionResult {
  adjustedPValues: number[]
  significantResults: Array<{ group1: string; group2: string; meanDiff?: number; pValue: number; significant: boolean }>
  alpha: number
  correctedAlpha: number
}

export interface MeansPlotDataResult {
  descriptives: Record<string, unknown>
  plotData: { x: number[]; y: number[]; labels?: string[] }
  interpretation: string
}


/**
 * 기술통계량 계산
 * @worker Worker 1
 */
export async function descriptiveStats(data: number[] | number[][], confidenceLevel?: number): Promise<DescriptiveStatsResult> {
  return callWorkerMethod<DescriptiveStatsResult>(1, 'descriptive_stats', { data, confidenceLevel })
}

/**
 * Shapiro-Wilk 정규성 검정
 * @worker Worker 1
 */
export async function normalityTest(data: number[] | number[][], alpha?: number): Promise<NormalityTestResult> {
  return callWorkerMethod<NormalityTestResult>(1, 'normality_test', { data, alpha })
}

/**
 * 이상치 탐지 (IQR/Z-score)
 * @worker Worker 1
 */
export async function outlierDetection(data: number[] | number[][], method?: string): Promise<OutlierDetectionResult> {
  return callWorkerMethod<OutlierDetectionResult>(1, 'outlier_detection', { data, method })
}

/**
 * 빈도분석
 * @worker Worker 1
 */
export async function frequencyAnalysis(values: (string | number)[]): Promise<FrequencyAnalysisResult> {
  return callWorkerMethod<FrequencyAnalysisResult>(1, 'frequency_analysis', { values })
}

/**
 * 교차분석
 * @worker Worker 1
 */
export async function crosstabAnalysis(rowValues: (string | number)[], colValues: (string | number)[]): Promise<CrosstabAnalysisResult> {
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
export async function kolmogorovSmirnovTest(data: number[] | number[][]): Promise<KolmogorovSmirnovTestResult> {
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
export async function mannKendallTest(data: number[] | number[][]): Promise<MannKendallTestResult> {
  return callWorkerMethod<MannKendallTestResult>(1, 'mann_kendall_test', { data })
}

/**
 * Bonferroni 다중비교 보정
 * @worker Worker 1
 */
export async function bonferroniCorrection(pValues: number[], alpha?: number): Promise<BonferroniCorrectionResult> {
  return callWorkerMethod<BonferroniCorrectionResult>(1, 'bonferroni_correction', { pValues, alpha })
}

/**
 * 평균 플롯 데이터
 * @worker Worker 1
 */
export async function meansPlotData(data: number[] | number[][], dependentVar: string, factorVar: string): Promise<MeansPlotDataResult> {
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
  mean1: number
  mean2: number
  std1: number
  std2: number
  n1: number
  n2: number
}

export interface TTestPairedResult {
  statistic: number
  pValue: number
  meanDiff: number
  nPairs: number
}

export interface TTestOneSampleResult {
  statistic: number
  pValue: number
  sampleMean: number
  sampleStd: number
  n: number
}

export interface TTestOneSampleSummaryResult {
  statistic: number
  pValue: number
  df: number
  meanDiff: number
  ciLower: number[]
  ciUpper: number[]
  cohensD: number
  n: number
  mean: number
  std: number
  reject: boolean
}

export interface TTestTwoSampleSummaryResult {
  statistic: number
  pValue: number
  df: number
  meanDiff: number
  ciLower: number[]
  ciUpper: number[]
  cohensD: number
  mean1: number
  mean2: number
  std1: number
  std2: number
  n1: number
  n2: number
  reject: boolean
}

export interface TTestPairedSummaryResult {
  statistic: number
  pValue: number
  df: number
  meanDiff: number
  ciLower: number[]
  ciUpper: number[]
  cohensD: number
  nPairs: number
  stdDiff: number
  reject: boolean
}

export interface ZTestResult {
  statistic: number
  pValue: number
  sampleMean: number
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
  successCount: number
  totalCount: number
  proportion: number
  expectedProportion: number
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
  nObservations: number
  confidenceInterval: { lower: number; upper: number }
}

export interface LeveneTestResult {
  statistic: number
  pValue: number
  equalVariance: boolean
}

export interface BartlettTestResult {
  statistic: number
  pValue: number
  equalVariance: boolean
}

export interface ChiSquareGoodnessTestResult {
  chiSquare: number
  pValue: number
  degreesOfFreedom: number
  criticalValue: number
  reject: boolean
  observed: number[]
  expected: number[]
}

export interface ChiSquareIndependenceTestResult {
  chiSquare: number
  pValue: number
  degreesOfFreedom: number
  criticalValue: number
  reject: boolean
  cramersV: number
  observedMatrix: number[][]
  expectedMatrix: number[][]
}

export interface FisherExactTestResult {
  pValue: number
  oddsRatio: number
}

export interface PowerAnalysisResult {
  requiredSampleSize: number
  achievedPower: number
  effectSize: number
  alpha: number
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
export async function tTestOneSample(data: number[] | number[][], popmean?: number): Promise<TTestOneSampleResult> {
  return callWorkerMethod<TTestOneSampleResult>(2, 't_test_one_sample', { data, popmean })
}

/**
 * 일표본 t-검정 (요약통계)
 * @worker Worker 2
 */
export async function tTestOneSampleSummary(mean: number, std: number, n: number, popmean?: number, alpha?: number): Promise<TTestOneSampleSummaryResult> {
  return callWorkerMethod<TTestOneSampleSummaryResult>(2, 't_test_one_sample_summary', { mean, std, n, popmean, alpha })
}

/**
 * 독립표본 t-검정 (요약통계)
 * @worker Worker 2
 */
export async function tTestTwoSampleSummary(mean1: number, std1: number, n1: number, mean2: number, std2: number, n2: number, equalVar?: boolean, alpha?: number): Promise<TTestTwoSampleSummaryResult> {
  return callWorkerMethod<TTestTwoSampleSummaryResult>(2, 't_test_two_sample_summary', { mean1, std1, n1, mean2, std2, n2, equalVar, alpha })
}

/**
 * 대응표본 t-검정 (요약통계)
 * @worker Worker 2
 */
export async function tTestPairedSummary(meanDiff: number, stdDiff: number, nPairs: number, alpha?: number): Promise<TTestPairedSummaryResult> {
  return callWorkerMethod<TTestPairedSummaryResult>(2, 't_test_paired_summary', { meanDiff, stdDiff, nPairs, alpha })
}

/**
 * Z-검정
 * @worker Worker 2
 */
export async function zTest(data: number[] | number[][], popmean: number, popstd: number): Promise<ZTestResult> {
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
export async function partialCorrelation(dataMatrix: number[][], xIdx: number, yIdx: number, controlIndices: number[]): Promise<PartialCorrelationResult> {
  return callWorkerMethod<PartialCorrelationResult>(2, 'partial_correlation', { dataMatrix, xIdx, yIdx, controlIndices })
}

/**
 * Levene 등분산 검정
 * @worker Worker 2
 */
export async function leveneTest(groups: number[][] | number[]): Promise<LeveneTestResult> {
  return callWorkerMethod<LeveneTestResult>(2, 'levene_test', { groups })
}

/**
 * Bartlett 등분산 검정
 * @worker Worker 2
 */
export async function bartlettTest(groups: number[][] | number[]): Promise<BartlettTestResult> {
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
  effectSize: number
}

export interface WilcoxonTestResult {
  statistic: number
  pValue: number
  nobs: number
  zScore: number
  medianDiff: number
  effectSize: number
  descriptives: Record<string, unknown>
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
  ssBetween: number
  ssWithin: number
  ssTotal: number
}

export interface TwoWayAnovaResult {
  factor1: { fStatistic: number; pValue: number; df: number }
  factor2: { fStatistic: number; pValue: number; df: number }
  interaction: { fStatistic: number; pValue: number; df: number }
  residual: { df: number; sumSq: number; meanSq: number; fStatistic: number; pValue: number }
  anovaTable: Record<string, unknown>
}

export interface TukeyHsdResult {
  comparisons: Array<{ group1: string; group2: string; meanDiff?: number; pValue: number; significant: boolean }>
}

export interface SignTestResult {
  statistic: number
  pValue: number
  nPositive: number
  nNegative: number
  nTies: number
}

export interface RunsTestResult {
  nRuns: number
  expectedRuns: number
  n1: number
  n2: number
  zStatistic: number
  pValue: number
}

export interface McnemarTestResult {
  statistic: number
  pValue: number
  continuityCorrection: boolean
  discordantPairs: { b: number; c: number }
}

export interface CochranQTestResult {
  qStatistic: number
  pValue: number
  df: number
}

export interface MoodMedianTestResult {
  statistic: number
  pValue: number
  grandMedian: number
}

export interface RepeatedMeasuresAnovaResult {
  fStatistic: number
  pValue: number
  df: { numerator: number; denominator: number }
  sphericityEpsilon: number
  sphericity: Record<string, unknown>
  anovaTable: Record<string, unknown>
}

export interface AncovaResult {
  fStatisticGroup: number
  pValueGroup: number
  fStatisticCovariate: number[]
  pValueCovariate: number[]
  adjustedMeans: Array<{ group: string | number; mean: number }>
  anovaTable: Record<string, unknown>
}

export interface ManovaResult {
  wilksLambda: number
  fStatistic: number
  pValue: number
}

export interface ScheffeTestResult {
  comparisons: Array<{ group1: string; group2: string; meanDiff?: number; pValue: number; significant: boolean }>
}

export interface DunnTestResult {
  comparisons: Array<{ group1: string; group2: string; meanDiff?: number; pValue: number; significant: boolean }>
}

export interface GamesHowellTestResult {
  comparisons: Array<{ group1: string; group2: string; meanDiff?: number; pValue: number; significant: boolean }>
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
export async function kruskalWallisTest(groups: number[][] | number[]): Promise<KruskalWallisTestResult> {
  return callWorkerMethod<KruskalWallisTestResult>(3, 'kruskal_wallis_test', { groups })
}

/**
 * Friedman 검정
 * @worker Worker 3
 */
export async function friedmanTest(groups: number[][] | number[]): Promise<FriedmanTestResult> {
  return callWorkerMethod<FriedmanTestResult>(3, 'friedman_test', { groups })
}

/**
 * 일원 분산분석
 * @worker Worker 3
 */
export async function oneWayAnova(groups: number[][] | number[]): Promise<OneWayAnovaResult> {
  return callWorkerMethod<OneWayAnovaResult>(3, 'one_way_anova', { groups })
}

/**
 * 이원 분산분석
 * @worker Worker 3
 */
export async function twoWayAnova(dataValues: number[] | number[][], factor1Values: (string | number)[], factor2Values: (string | number)[]): Promise<TwoWayAnovaResult> {
  return callWorkerMethod<TwoWayAnovaResult>(3, 'two_way_anova', { dataValues, factor1Values, factor2Values })
}

/**
 * Tukey HSD 사후검정
 * @worker Worker 3
 */
export async function tukeyHsd(groups: number[][] | number[]): Promise<TukeyHsdResult> {
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
export async function runsTest(sequence: (string | number)[]): Promise<RunsTestResult> {
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
export async function moodMedianTest(groups: number[][] | number[]): Promise<MoodMedianTestResult> {
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
export async function ancova(yValues: number[] | number[][], groupValues: (string | number)[], covariates: number[] | number[][]): Promise<AncovaResult> {
  return callWorkerMethod<AncovaResult>(3, 'ancova', { yValues, groupValues, covariates })
}

/**
 * 다변량 분산분석
 * @worker Worker 3
 */
export async function manova(dataMatrix: number[][], groupValues: (string | number)[], varNames: string[]): Promise<ManovaResult> {
  return callWorkerMethod<ManovaResult>(3, 'manova', { dataMatrix, groupValues, varNames })
}

/**
 * Scheffe 사후검정
 * @worker Worker 3
 */
export async function scheffeTest(groups: number[][] | number[]): Promise<ScheffeTestResult> {
  return callWorkerMethod<ScheffeTestResult>(3, 'scheffe_test', { groups })
}

/**
 * Dunn 사후검정
 * @worker Worker 3
 */
export async function dunnTest(groups: number[][] | number[], pAdjust?: string): Promise<DunnTestResult> {
  return callWorkerMethod<DunnTestResult>(3, 'dunn_test', { groups, pAdjust })
}

/**
 * Games-Howell 사후검정
 * @worker Worker 3
 */
export async function gamesHowellTest(groups: number[][] | number[]): Promise<GamesHowellTestResult> {
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
  pValue: number
  stdErr: number
  nPairs: number
  slopeCi: { lower: number; upper: number }
  interceptCi: { lower: number; upper: number }
  slopeTValue: number
  interceptTValue: number
  residuals: number[]
  fittedValues: number[]
  equation: string
  confidenceInterval: { lower: number[]; upper: number[] }
  interpretation: string
  isSignificant: boolean
  assumptions: Record<string, unknown>
}

export interface MultipleRegressionResult {
  coefficients: number[]
  stdErrors: number[]
  tValues: number[]
  pValues: number[]
  ciLower: number[]
  ciUpper: number[]
  rSquared: number
  adjustedRSquared: number
  fStatistic: number
  fPValue: number
  residualStdError: number
  residuals: number[]
  fittedValues: number[]
  vif: number[]
  nObservations: number
  nPredictors: number
  assumptions: Record<string, unknown>
}

export interface LogisticRegressionResult {
  coefficients: number[]
  stdErrors: number[]
  zValues: number[]
  pValues: number[]
  ciLower: number[]
  ciUpper: number[]
  predictions: number[]
  predictedClass: number[]
  accuracy: number
  confusionMatrix: { tp: number; fp: number; tn: number; fn: number; precision: number; recall: number; f1Score: number }
  sensitivity: number
  specificity: number
  rocCurve: Array<{ fpr: number; tpr: number }>
  auc: number
  aic: number
  bic: number
  pseudoRSquared: number
  llrPValue: number
  nObservations: number
  nPredictors: number
}

export interface PcaAnalysisResult {
  components: Array<{ componentNumber: number; eigenvalue: number; varianceExplained: number; cumulativeVariance: number; loadings: Record<string, number> }>
  totalVariance: number
  selectedComponents: number
  rotationMatrix: number[][]
  transformedData: Array<Record<string, number>>
  variableContributions: Record<string, number[]>
  qualityMetrics: { kmo: number | null; bartlett: { statistic: number | null; pValue: number | null; significant: boolean | null; error?: string } }
  screeData: Array<{ component: number; eigenvalue: number; varianceExplained: number }>
  interpretation: string
}

export interface CurveEstimationResult {
  parameters: number[]
  rSquared: number
  equation: string
  predictions: number[]
}

export interface NonlinearRegressionResult {
  parameters: number[]
  rSquared: number
  equation: string
  predictions: number[]
}

export interface StepwiseRegressionResult {
  selectedVariables: string[]
  coefficients: number[]
  rSquared: number
  steps: Array<{ step: number; variable: string; action: string; rSquared: number }> | undefined
}

export interface BinaryLogisticResult {
  coefficients: number[]
  oddsRatios: number[]
  pValues: number[]
  accuracy: number
  auc: number
}

export interface MultinomialLogisticResult {
  coefficients: number[]
  accuracy: number
}

export interface OrdinalLogisticResult {
  coefficients: number[]
  thresholds: number[]
}

export interface ProbitRegressionResult {
  coefficients: number[]
  pValues: number[]
  marginalEffects: number[] | undefined
}

export interface PoissonRegressionResult {
  coefficients: number[]
  pValues: number[]
  incidenceRateRatios: number[]
}

export interface NegativeBinomialRegressionResult {
  coefficients: number[]
  pValues: number[]
  dispersion: number
}

export interface FactorAnalysisResult {
  loadings: number[][]
  communalities: number[]
  explainedVariance: number[]
  explainedVarianceRatio: number[]
  totalVarianceExplained: number
  nFactors: number
  eigenvalues: number[]
}

export interface ClusterAnalysisResult {
  nClusters: number
  clusterAssignments: number[]
  centroids: number[][]
  inertia: number
  silhouetteScore: number
  clusterSizes: number[]
}

export interface TimeSeriesAnalysisResult {
  trend: number[]
  seasonal: number[]
  residual: number[]
  acf: number[]
  pacf: number[]
  adfStatistic: number
  adfPValue: number
  isStationary: boolean
}

export interface DurbinWatsonTestResult {
  statistic: number
  interpretation: string
}

export interface DiscriminantAnalysisResult {
  functions: Array<{ functionNumber: number; eigenvalue: number; varianceExplained: number; cumulativeVariance: number; canonicalCorrelation: number; coefficients: Record<string, number> }>
  totalVariance: number
  selectedFunctions: number
  groupCentroids: Array<{ group: string; centroids: Record<string, number> }>
  classificationResults: Array<{ originalGroup: string; predictedGroup: string; probability: number; correct: boolean }>
  accuracy: number
  confusionMatrix: Record<string, Record<string, number>>
  equalityTests: { boxM: { statistic: number; pValue: number; significant: boolean }; wilksLambda: { statistic: number; pValue: number; significant: boolean } }
  interpretation: string
}

export interface KaplanMeierSurvivalResult {
  survivalFunction: number[]
  times: number[]
  events: number[]
  nRisk: number[]
  medianSurvival: number
}

export interface CoxRegressionResult {
  coefficients: number[]
  hazardRatios: number[]
  pValues: number[]
  confidenceIntervals: { lower: number; upper: number }[]
  concordance: number
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
export async function pcaAnalysis(data: number[] | number[][], nComponents?: number): Promise<PcaAnalysisResult> {
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
export async function clusterAnalysis(data: number[] | number[][], method?: string, nClusters?: number, linkage?: string, distance?: string): Promise<ClusterAnalysisResult> {
  return callWorkerMethod<ClusterAnalysisResult>(4, 'cluster_analysis', { data, method, nClusters, linkage, distance })
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
export async function discriminantAnalysis(data: number[] | number[][], groups: (string | number)[]): Promise<DiscriminantAnalysisResult> {
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
// Worker 5: 생존 분석 + ROC 곡선
// ========================================

export interface KmCurveData {
  time: number[]
  survival: number[]
  ciLo: number[]
  ciHi: number[]
  atRisk: number[]
  medianSurvival: number | null
  censored: number[]  // 중도절단 시점 목록 (event=0)
}

export interface KaplanMeierAnalysisResult {
  curves: Record<string, KmCurveData>
  logRankP: number | null
  medianSurvivalTime: number | null
}

export interface RocPoint {
  fpr: number
  tpr: number
}

export interface RocCurveAnalysisResult {
  rocPoints: RocPoint[]
  auc: number
  aucCI: { lower: number; upper: number }
  optimalThreshold: number
  sensitivity: number
  specificity: number
}

/**
 * 그룹 인식 Kaplan-Meier 생존 분석 (scipy 기반)
 * @worker Worker 5
 */
export async function kaplanMeierAnalysis(
  time: number[],
  event: number[],
  group?: string[]
): Promise<KaplanMeierAnalysisResult> {
  return callWorkerMethod<KaplanMeierAnalysisResult>(5, 'kaplan_meier_analysis', { time, event, group })
}

/**
 * ROC 곡선 분석 (AUC, 최적 임계값, CI)
 * @worker Worker 5
 */
export async function rocCurveAnalysis(
  actualClass: number[],
  predictedProb: number[]
): Promise<RocCurveAnalysisResult> {
  return callWorkerMethod<RocCurveAnalysisResult>(5, 'roc_curve_analysis', { actualClass, predictedProb })
}

// ========================================
// 메서드 이름 유니온 타입
// ========================================

export type Worker1Method ='descriptive_stats' | 'normality_test' | 'outlier_detection' | 'frequency_analysis' | 'crosstab_analysis' | 'one_sample_proportion_test' | 'cronbach_alpha' | 'kolmogorov_smirnov_test' | 'ks_test_one_sample' | 'ks_test_two_sample' | 'mann_kendall_test' | 'bonferroni_correction' | 'means_plot_data'
export type Worker2Method = 't_test_two_sample' | 't_test_paired' | 't_test_one_sample' | 't_test_one_sample_summary' | 't_test_two_sample_summary' | 't_test_paired_summary' | 'z_test' | 'chi_square_test' | 'binomial_test' | 'correlation_test' | 'partial_correlation' | 'levene_test' | 'bartlett_test' | 'chi_square_goodness_test' | 'chi_square_independence_test' | 'fisher_exact_test' | 'power_analysis'
export type Worker3Method = 'mann_whitney_test' | 'wilcoxon_test' | 'kruskal_wallis_test' | 'friedman_test' | 'one_way_anova' | 'two_way_anova' | 'tukey_hsd' | 'sign_test' | 'runs_test' | 'mcnemar_test' | 'cochran_q_test' | 'mood_median_test' | 'repeated_measures_anova' | 'ancova' | 'manova' | 'scheffe_test' | 'dunn_test' | 'games_howell_test'
export type Worker4Method = 'linear_regression' | 'multiple_regression' | 'logistic_regression' | 'pca_analysis' | 'curve_estimation' | 'nonlinear_regression' | 'stepwise_regression' | 'binary_logistic' | 'multinomial_logistic' | 'ordinal_logistic' | 'probit_regression' | 'poisson_regression' | 'negative_binomial_regression' | 'factor_analysis' | 'cluster_analysis' | 'time_series_analysis' | 'durbin_watson_test' | 'discriminant_analysis' | 'kaplan_meier_survival' | 'cox_regression'
export type Worker5Method = 'kaplan_meier_analysis' | 'roc_curve_analysis'

export type AllMethodName = Worker1Method | Worker2Method | Worker3Method | Worker4Method | Worker5Method
