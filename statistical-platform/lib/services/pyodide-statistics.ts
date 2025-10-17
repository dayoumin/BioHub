/**
 * ⚠️⚠️⚠️ IMPORTANT: Python Worker 호출 래퍼 전용 파일 ⚠️⚠️⚠️
 *
 * 이 파일은 Python Worker를 호출하는 TypeScript 래퍼만 포함합니다.
 *
 * ❌ 새 메서드를 이 파일에 직접 추가하지 마세요!
 * ✅ 올바른 방법:
 *    1. Python Worker 파일에 함수 추가 (public/workers/python/worker*.py)
 *    2. 이 파일에 callWorkerMethod 래퍼만 추가
 *    3. Registry 메타데이터 추가 (lib/statistics/registry/method-metadata.ts)
 *    4. Groups 핸들러 추가 (lib/statistics/groups/*.group.ts)
 *
 * 모든 통계 계산은 Python의 SciPy/statsmodels를 통해 수행됩니다.
 * JavaScript로 통계 알고리즘을 직접 구현하지 마세요!
 */

import type {
  PyodideInterface,
  StatisticalTestResult,
  DescriptiveStatsResult,
  NormalityTestResult,
  OutlierResult,
  CorrelationResult,
  HomogeneityTestResult,
  ANOVAResult,
  TukeyHSDResult,
  RegressionResult
} from '@/types/pyodide'
import { PyodideCoreService } from './pyodide/core/pyodide-core.service'

// ========================================
// Worker 4 타입 정의
// ========================================

// Priority 1 메서드 타입 (3개)

/**
 * 선형 회귀분석 결과 타입 (linear_regression)
 */
type LinearRegressionResult = {
  slope: number
  intercept: number
  rSquared: number
  pValue: number
  stdErr: number
  nPairs: number
}

/**
 * 주성분 분석 결과 타입 (pca_analysis)
 */
type PCAAnalysisResult = {
  components: number[][]
  explainedVariance: number[]
  explainedVarianceRatio: number[]
  cumulativeVariance: number[]
}

/**
 * Durbin-Watson 검정 결과 타입 (durbin_watson_test)
 */
type DurbinWatsonTestResult = {
  statistic: number
  interpretation: string
  isIndependent: boolean
}

// Priority 2 메서드 타입 (9개)

/**
 * 곡선 추정 결과 타입
 */
type CurveEstimationResult = {
  modelType: string
  coefficients: number[]
  rSquared: number
  predictions: number[]
  residuals: number[]
  nPairs: number
}

/**
 * 비선형 회귀 결과 타입
 */
type NonlinearRegressionResult = {
  modelType: string
  parameters: number[]
  parameterErrors: number[]
  rSquared: number
  predictions: number[]
  residuals: number[]
  nPairs: number
}

/**
 * 단계적 회귀 결과 타입
 */
type StepwiseRegressionResult = {
  selectedVariables: string[]
  selectedIndices?: number[]
  rSquaredHistory?: number[]
  coefficients: number[]
  stdErrors?: number[]
  tValues?: number[]
  pValues?: number[]
  rSquared: number
  adjustedRSquared?: number
}

/**
 * 이항 로지스틱 회귀 결과 타입
 */
type BinaryLogisticResult = {
  coefficients: number[]
  stdErrors: number[]
  zValues: number[]
  pValues: number[]
  predictions: number[]
  accuracy: number
  aic: number
  bic: number
  pseudoRSquared: number
}

/**
 * 다항 로지스틱 회귀 결과 타입
 */
type MultinomialLogisticResult = {
  coefficients: number[][]
  pValues: number[][]
  predictions: number[][]
  accuracy: number
  aic: number
  bic: number
}

/**
 * 순서형 로지스틱 회귀 결과 타입
 */
type OrdinalLogisticResult = {
  coefficients: number[]
  stdErrors: number[]
  zValues: number[]
  pValues: number[]
  aic: number
  bic: number
}

/**
 * 프로빗 회귀 결과 타입
 */
type ProbitRegressionResult = {
  coefficients: number[]
  stdErrors: number[]
  zValues: number[]
  pValues: number[]
  predictions: number[]
  accuracy: number
  aic: number
  bic: number
}

/**
 * 포아송 회귀 결과 타입
 */
type PoissonRegressionResult = {
  coefficients: number[]
  stdErrors: number[]
  zValues: number[]
  pValues: number[]
  deviance: number
  pearsonChi2: number
  aic: number
  bic: number
}

/**
 * 음이항 회귀 결과 타입
 */
type NegativeBinomialRegressionResult = {
  coefficients: number[]
  stdErrors: number[]
  zValues: number[]
  pValues: number[]
  aic: number
  bic: number
}

export class PyodideStatisticsService {
  private static instance: PyodideStatisticsService | null = null
  private core: PyodideCoreService

  private constructor() {
    this.core = PyodideCoreService.getInstance()
  }

  static getInstance(): PyodideStatisticsService {
    if (!PyodideStatisticsService.instance) {
      PyodideStatisticsService.instance = new PyodideStatisticsService()
    }
    return PyodideStatisticsService.instance
  }

  /**
   * Pyodide 초기화 (PyodideCoreService에 위임)
   */
  async initialize(): Promise<void> {
    return this.core.initialize()
  }

  /**
   * Shapiro-Wilk 정규성 검정 - Worker 1 사용
   */
  async shapiroWilkTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    const result = await this.normalityTest(data)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      isNormal: result.isNormal
    }
  }


  /**
   * IQR 방법으로 이상치 탐지 - Worker 1 사용
   */
  async detectOutliersIQR(data: number[]): Promise<{
    q1: number
    q3: number
    iqr: number
    lowerBound: number
    upperBound: number
    mildOutliers: number[]
    extremeOutliers: number[]
  }> {
    const stats = await this.descriptiveStats(data)
    const outliers = await this.outlierDetection(data, 'iqr')

    return {
      q1: stats.q1,
      q3: stats.q3,
      iqr: stats.q3 - stats.q1,
      lowerBound: stats.q1 - 1.5 * (stats.q3 - stats.q1),
      upperBound: stats.q3 + 1.5 * (stats.q3 - stats.q1),
      mildOutliers: [],  // Worker 1에서 세부 분류 미제공
      extremeOutliers: []
    }
  }


  /**
   * Levene 등분산성 검정
   * @param groups 그룹별 데이터 배열
   * @returns 검정 결과
   */
  /**
   * Levene 등분산성 검정 - Worker 2 사용
   */
  async leveneTest(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    equalVariance: boolean
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      equalVariance: boolean
    }>(
      2,
      'levene_test',
      { groups },
      { errorMessage: 'Levene test 실행 실패' }
    )
  }

  /**
   * 독립성 검정 (Durbin-Watson test) - Worker 4 사용
   * 시계열 데이터나 회귀분석 잔차의 자기상관성 검정
   * @param residuals 잔차 또는 시계열 데이터
   * @returns DW 통계량 (2에 가까울수록 독립적)
   */
  /**
   * Durbin-Watson 검정 (레거시 API)
   * @see durbinWatsonTest - 새 메서드 사용 권장
   */
  async testIndependence(residuals: number[]): Promise<{
    statistic: number
    interpretation: string
    isIndependent: boolean
  }> {
    return this.durbinWatsonTest(residuals)
  }

  /**
   * Bartlett's test for homogeneity of variances - Worker 2 사용
   * Levene's test보다 정규성에 민감하지만 더 강력한 검정
   */
  async bartlettTest(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    equalVariance: boolean
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      equalVariance: boolean
    }>(
      2,
      'bartlett_test',
      { groups },
      { errorMessage: 'Bartlett test 실행 실패' }
    )
  }

  /**
   * Kolmogorov-Smirnov test for normality - Worker 1 사용
   * Shapiro-Wilk보다 큰 표본에 적합
   */
  async kolmogorovSmirnovTest(data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      isNormal: boolean
    }>(
      1,
      'kolmogorov_smirnov_test',
      { data },
      { errorMessage: 'K-S test 실행 실패' }
    )
  }

  /**
   * 통계적 가정 종합 검정
   * 데이터의 모든 통계적 가정을 한 번에 검정
   */
  async checkAllAssumptions(data: {
    values?: number[]
    groups?: number[][]
    residuals?: number[]
  }): Promise<{
    normality?: {
      shapiroWilk?: NormalityTestResult
      kolmogorovSmirnov?: { statistic: number; pValue: number; isNormal: boolean }
    }
    homogeneity?: {
      levene?: HomogeneityTestResult
      bartlett?: { statistic: number; pValue: number; equalVariance: boolean }
    }
    independence?: {
      durbinWatson?: { statistic: number; interpretation: string; isIndependent: boolean }
    }
    summary: {
      canUseParametric: boolean
      reasons: string[]
      recommendations: string[]
    }
    }> {
    const results: any = {
      normality: {},
      homogeneity: {},
      independence: {},
      summary: {
        canUseParametric: true,
        reasons: [],
        recommendations: []
      }
    }


    // 정규성 검정
    if (data.values && data.values.length >= 3) {
      try {
        // Shapiro-Wilk (작은 표본에 적합)
        if (data.values.length <= 5000) {
          results.normality.shapiroWilk = await this.testNormality(data.values)
          if (!results.normality.shapiroWilk.isNormal) {
            results.summary.canUseParametric = false
            results.summary.reasons.push('정규성 가정 위반 (Shapiro-Wilk)')
            results.summary.recommendations.push('비모수 검정 사용 권장')
          }
        }


        // K-S test (큰 표본에 적합)
        if (data.values.length > 30) {
          results.normality.kolmogorovSmirnov = await this.kolmogorovSmirnovTest(data.values)
        }
      } catch (error) {
        console.error('정규성 검정 실패:', error)
      }
    }


    // 등분산성 검정
    if (data.groups && data.groups.length >= 2) {
      try {
        // Levene's test (정규성 가정에 강건)
        results.homogeneity.levene = await this.testHomogeneity(data.groups)
        if (!results.homogeneity.levene.equalVariance) {
          results.summary.canUseParametric = false
          results.summary.reasons.push('등분산성 가정 위반 (Levene)')
          results.summary.recommendations.push("Welch's t-test 또는 Games-Howell 사용")
        }


        // Bartlett's test (정규분포일 때 더 강력)
        if (results.normality.shapiroWilk?.isNormal) {
          results.homogeneity.bartlett = await this.bartlettTest(data.groups)
        }
      } catch (error) {
        console.error('등분산성 검정 실패:', error)
      }
    }


    // 독립성 검정
    if (data.residuals && data.residuals.length >= 2) {
      try {
        results.independence.durbinWatson = await this.testIndependence(data.residuals)
        if (!results.independence.durbinWatson.isIndependent) {
          results.summary.canUseParametric = false
          results.summary.reasons.push('독립성 가정 위반')
          results.summary.recommendations.push('시계열 분석 방법 사용')
        }
      } catch (error) {
        console.error('독립성 검정 실패:', error)
      }
    }


    // 종합 권장사항
    if (results.summary.canUseParametric) {
      results.summary.recommendations.push('모수 검정 사용 가능')
    } else {
      results.summary.recommendations.push('비모수 검정 우선 권장')
    }


    return results
  }

  /**
   * 기술통계 계산
   * @param data 숫자 배열
   * @returns 평균, 중앙값, 표준편차 등
   */
  async descriptiveStats(data: number[]): Promise<{
    mean: number
    median: number
    std: number
    min: number
    max: number
    q1: number
    q3: number
    skewness: number
    kurtosis: number
  }> {
    return this.core.callWorkerMethod<{
      mean: number
      median: number
      std: number
      min: number
      max: number
      q1: number
      q3: number
      skewness: number
      kurtosis: number
    }>(
      1,
      'descriptive_stats',
      { data },
      { errorMessage: 'Descriptive stats 실행 실패' }
    )
  }

  /**
   * 정규성 검정 (Normality Test - Shapiro-Wilk)
   */
  async normalityTest(data: number[], alpha: number = 0.05): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
    alpha: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      isNormal: boolean
      alpha: number
    }>(
      1,
      'normality_test',
      { data, alpha },
      { errorMessage: 'Normality test 실행 실패' }
    )
  }

  /**
   * 이상치 탐지 (Outlier Detection)
   */
  async outlierDetection(data: number[], method: 'iqr' | 'zscore' = 'iqr'): Promise<{
    outlierIndices: number[]
    outlierCount: number
    method: string
  }> {
    return this.core.callWorkerMethod<{
      outlierIndices: number[]
      outlierCount: number
      method: string
    }>(
      1,
      'outlier_detection',
      { data, method },
      { errorMessage: 'Outlier detection 실행 실패' }
    )
  }

  /**
   * 빈도분석 (Frequency Analysis)
   */
  async frequencyAnalysis(values: (string | number)[]): Promise<{
    categories: string[]
    frequencies: number[]
    percentages: number[]
    cumulativePercentages: number[]
    total: number
    uniqueCount: number
  }> {
    return this.core.callWorkerMethod<{
      categories: string[]
      frequencies: number[]
      percentages: number[]
      cumulativePercentages: number[]
      total: number
      uniqueCount: number
    }>(
      1,
      'frequency_analysis',
      { values },
      { errorMessage: 'Frequency analysis 실행 실패' }
    )
  }

  /**
   * 교차표 분석 (Crosstab Analysis)
   */
  async crosstabAnalysis(rowValues: (string | number)[], colValues: (string | number)[]): Promise<{
    rowCategories: string[]
    colCategories: string[]
    observedMatrix: number[][]
    rowTotals: number[]
    colTotals: number[]
    grandTotal: number
  }> {
    return this.core.callWorkerMethod<{
      rowCategories: string[]
      colCategories: string[]
      observedMatrix: number[][]
      rowTotals: number[]
      colTotals: number[]
      grandTotal: number
    }>(
      1,
      'crosstab_analysis',
      { row_values: rowValues, col_values: colValues },
      { errorMessage: 'Crosstab analysis 실행 실패' }
    )
  }

  /**
   * 일표본 비율검정 (One-Sample Proportion Test)
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
    pValueExact: number
    pValueApprox: number
    significant: boolean
    alpha: number
  }> {
    return this.core.callWorkerMethod<{
      sampleProportion: number
      nullProportion: number
      zStatistic: number
      pValueExact: number
      pValueApprox: number
      significant: boolean
      alpha: number
    }>(
      1,
      'one_sample_proportion_test',
      { success_count: successCount, total_count: totalCount, null_proportion: nullProportion, alternative, alpha },
      { errorMessage: 'One-sample proportion test 실행 실패' }
    )
  }

  /**
   * 신뢰도 분석 (Cronbach's Alpha) - Worker 1 버전
   */
  async cronbachAlphaWorker(itemsMatrix: number[][]): Promise<{
    alpha: number
    nItems: number
    nRespondents: number
  }> {
    return this.core.callWorkerMethod<{
      alpha: number
      nItems: number
      nRespondents: number
    }>(
      1,
      'cronbach_alpha',
      { items_matrix: itemsMatrix },
      { errorMessage: "Cronbach's alpha 실행 실패" }
    )
  }

  /**
   * 상관계수 계산 (Correlation Test) - Worker 2
   */
  async correlationTest(x: number[], y: number[], method: 'pearson' | 'spearman' | 'kendall' = 'pearson'): Promise<{
    correlation: number
    pValue: number
    method: string
  }> {
    return this.core.callWorkerMethod<{
      correlation: number
      pValue: number
      method: string
    }>(
      2,
      'correlation_test',
      { x, y, method },
      { errorMessage: 'Correlation test 실행 실패' }
    )
  }

  /**
   * 상관계수 계산 (Pearson & Spearman) - 기존 메서드 유지
   * @param x 첫 번째 변수
   * @param y 두 번째 변수
   * @returns 상관계수와 p-value
   */
  async correlation(x: number[], y: number[]): Promise<{
    pearson: { r: number; pValue: number }
    spearman: { r: number; pValue: number }
    kendall: { r: number; pValue: number }
  }> {
    await this.initialize()
    await this.core.ensureWorker2Loaded()

    // Worker 2의 correlation_test를 3번 호출
    const pearsonResult = await this.correlationTest(x, y, 'pearson')
    const spearmanResult = await this.correlationTest(x, y, 'spearman')
    const kendallResult = await this.correlationTest(x, y, 'kendall')

    return {
      pearson: {
        r: pearsonResult.correlation,
        pValue: pearsonResult.pValue
      },
      spearman: {
        r: spearmanResult.correlation,
        pValue: spearmanResult.pValue
      },
      kendall: {
        r: kendallResult.correlation,
        pValue: kendallResult.pValue
      }
    }
  }


  /**
   * 이표본 t-검정 (Two-Sample t-Test) - Worker 2
   */
  async tTestTwoSample(group1: number[], group2: number[], equalVar: boolean = true): Promise<{
    statistic: number
    pValue: number
    df: number
    mean1: number
    mean2: number
    meanDiff: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      df: number
      mean1: number
      mean2: number
      meanDiff: number
    }>(
      2,
      't_test_two_sample',
      { group1, group2, equal_var: equalVar },
      { errorMessage: 'Two-sample t-test 실행 실패' }
    )
  }

  /**
   * 대응표본 t-검정 (Paired t-Test) - Worker 2
   */
  async tTestPaired(values1: number[], values2: number[]): Promise<{
    statistic: number
    pValue: number
    df: number
    meanDiff: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      df: number
      meanDiff: number
    }>(
      2,
      't_test_paired',
      { values1, values2 },
      { errorMessage: 'Paired t-test 실행 실패' }
    )
  }

  /**
   * 일표본 t-검정 (One-Sample t-Test) - Worker 2
   */
  async tTestOneSample(data: number[], popmean: number = 0): Promise<{
    statistic: number
    pValue: number
    df: number
    sampleMean: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      df: number
      sampleMean: number
    }>(
      2,
      't_test_one_sample',
      { data, popmean },
      { errorMessage: 'One-sample t-test 실행 실패' }
    )
  }

  /**
   * Z-검정 (Z-Test) - Worker 2
   */
  async zTestWorker(data: number[], popmean: number, popstd: number): Promise<{
    zStatistic: number
    pValue: number
    sampleMean: number
  }> {
    return this.core.callWorkerMethod<{
      zStatistic: number
      pValue: number
      sampleMean: number
    }>(
      2,
      'z_test',
      { data, popmean, popstd },
      { errorMessage: 'Z-test 실행 실패' }
    )
  }

  /**
   * 카이제곱 검정 (Chi-Square Test) - Worker 2
   */
  async chiSquareTestWorker(observedMatrix: number[][], yatesCorrection: boolean = false): Promise<{
    chiSquare: number
    pValue: number
    df: number
    expectedMatrix: number[][]
  }> {
    return this.core.callWorkerMethod<{
      chiSquare: number
      pValue: number
      df: number
      expectedMatrix: number[][]
    }>(
      2,
      'chi_square_test',
      { observed_matrix: observedMatrix, yates_correction: yatesCorrection },
      { errorMessage: 'Chi-square test 실행 실패' }
    )
  }

  /**
   * 이항검정 (Binomial Test) - Worker 2
   */
  async binomialTestWorker(
    successCount: number,
    totalCount: number,
    probability: number = 0.5,
    alternative: 'two-sided' | 'greater' | 'less' = 'two-sided'
  ): Promise<{
    pValue: number
    successCount: number
    totalCount: number
  }> {
    return this.core.callWorkerMethod<{
      pValue: number
      successCount: number
      totalCount: number
    }>(
      2,
      'binomial_test',
      {
        success_count: successCount,
        total_count: totalCount,
        probability,
        alternative
      },
      { errorMessage: 'Binomial test 실행 실패' }
    )
  }

  /**
   * 편상관 (Partial Correlation) - Worker 2
   */
  async partialCorrelationWorker(
    dataMatrix: number[][],
    xIdx: number,
    yIdx: number,
    controlIndices: number[]
  ): Promise<{
    correlation: number
    pValue: number
    df: number
    nObservations: number
    confidenceInterval: {
      lower: number
      upper: number
    }
    }> {
    return this.core.callWorkerMethod<{
      correlation: number
      pValue: number
      df: number
      nObservations: number
      confidenceInterval: {
        lower: number
        upper: number
      }
    }>(
      2,
      'partial_correlation',
      {
        data_matrix: dataMatrix,
        x_idx: xIdx,
        y_idx: yIdx,
        control_indices: controlIndices
      },
      { errorMessage: 'Partial correlation 실행 실패' }
    )
  }

  /**
   * t-검정 수행
   * @param group1 첫 번째 그룹 데이터
   * @param group2 두 번째 그룹 데이터
   * @param options 검정 옵션
   */
  async tTest(
    group1: number[],
    group2: number[],
    options: { paired?: boolean; equalVar?: boolean; type?: 'one-sample' | 'independent' | 'paired'; mu?: number; alternative?: 'two-sided' | 'less' | 'greater' } = {}
  ): Promise<{
    statistic: number
    pvalue: number
    df: number
    confidenceInterval?: { lower: number; upper: number }
  }> {
    // Worker 2 호출로 간소화
    if (options.type === 'one-sample' || (group2.length === 0 && options.mu !== undefined)) {
      const result = await this.tTestOneSample(group1, options.mu ?? 0)
      return {
        statistic: result.statistic,
        pvalue: result.pValue,
        df: result.df
      }
    } else if (options.paired) {
      const result = await this.tTestPaired(group1, group2)
      return {
        statistic: result.statistic,
        pvalue: result.pValue,
        df: result.df
      }
    } else {
      const result = await this.tTestTwoSample(group1, group2, options.equalVar !== false)
      return {
        statistic: result.statistic,
        pvalue: result.pValue,
        df: result.df
      }
    }
  }


  /**
   * 일원분산분석 (One-way ANOVA)
   * @param groups 그룹별 데이터 배열
   */
  async anova(
    groups: number[][],
    options: { type?: 'one-way' | 'two-way' } = {}
  ): Promise<{
    fStatistic: number
    pvalue: number
    df: number[]
    etaSquared?: number
  }> {
    // Worker 3 호출로 간소화
    const result = await this.oneWayAnovaWorker(groups)
    return {
      fStatistic: result.fStatistic,
      pvalue: result.pValue,
      df: [result.dfBetween, result.dfWithin]
    }
  }


  /**
   * 단순선형회귀분석 (레거시 API)
   * @see linearRegression - 새 메서드 사용 권장
   */
  async regression(
    x: number[],
    y: number[],
    options: { type?: 'simple' | 'multiple' } = {}
  ): Promise<{
    slope?: number
    intercept?: number
    rSquared: number
    pvalue: number
    fStatistic?: number
    tStatistic?: number
    predictions?: number[]
    df?: number
  }> {
    const result = await this.linearRegression(x, y)
    return {
      slope: result.slope,
      intercept: result.intercept,
      rSquared: result.rSquared,
      pvalue: result.pValue,
      fStatistic: undefined,
      tStatistic: undefined,
      predictions: undefined,
      df: result.nPairs - 2
    }
  }

  /**
   * Mann-Whitney U 검정 (레거시 API)
   * @see mannWhitneyTestWorker - 새 메서드 사용 권장
   */
  async mannWhitneyU(
    group1: number[],
    group2: number[]
  ): Promise<{
    statistic: number
    pvalue: number
  }> {
    const result = await this.mannWhitneyTestWorker(group1, group2)
    return {
      statistic: result.statistic,
      pvalue: result.pValue
    }
  }


  /**
   * Wilcoxon 부호순위 검정 (레거시 API)
   * @see wilcoxonTestWorker - 새 메서드 사용 권장
   */
  async wilcoxon(
    group1: number[],
    group2: number[]
  ): Promise<{
    statistic: number
    pvalue: number
  }> {
    const result = await this.wilcoxonTestWorker(group1, group2)
    return {
      statistic: result.statistic,
      pvalue: result.pValue
    }
  }


  /**
   * Kruskal-Wallis H 검정 (레거시 API)
   * @see kruskalWallisTestWorker - 새 메서드 사용 권장
   */
  async kruskalWallis(groups: number[][]): Promise<{
    statistic: number
    pvalue: number
    df: number
  }> {
    const result = await this.kruskalWallisTestWorker(groups)
    return {
      statistic: result.statistic,
      pvalue: result.pValue,
      df: result.df
    }
  }


  /**
   * Tukey HSD 사후검정 (레거시 API)
   * @see tukeyHSDWorker - 새 메서드 사용 권장
   */
  async tukeyHSD(groups: number[][]): Promise<any> {
    const result = await this.tukeyHSDWorker(groups)
    return {
      comparisons: result.comparisons
    }
  }


  /**
   * Chi-square 검정 - Worker 2
   */
  async chiSquare(contingencyTable: number[][]): Promise<{
    statistic: number
    pvalue: number
    df: number
  }> {
    const result = await this.chiSquareTestWorker(contingencyTable)
    return {
      statistic: result.chiSquare,
      pvalue: result.pValue,
      df: result.df
    }
  }


  /**
   * PCA (주성분분석) - 레거시 API
   * @see pcaAnalysis - 새 메서드 사용 권장
   */
  async pca(data: number[][]): Promise<{
    explainedVariance: number[]
    totalExplainedVariance: number
    components: number[][]
  }> {
    const result = await this.pcaAnalysis(data, 2)
    return {
      components: result.components,
      explainedVariance: result.explainedVariance,
      totalExplainedVariance: result.cumulativeVariance[result.cumulativeVariance.length - 1]
    }
  }

  /**
   * Cronbach's Alpha (신뢰도 계수) - Worker 1 사용
   */
  async cronbachAlpha(items: number[][]): Promise<{
    alpha: number
    itemTotalCorrelations?: number[]
  }> {
    // Worker 1의 cronbach_alpha 호출
    const result = await this.cronbachAlphaWorker(items)
    return {
      alpha: result.alpha,
      itemTotalCorrelations: undefined  // Worker 1은 itemTotalCorrelations 미제공
    }
  }


  /**
   * Friedman 검정 (레거시 API)
   * @see friedmanTestWorker - 새 메서드 사용 권장
   */
  async friedman(data: number[][]): Promise<{
    statistic: number
    pvalue: number
    rankings: number[]
  }> {
    const result = await this.friedmanTestWorker(data)
    return {
      statistic: result.statistic,
      pvalue: result.pValue,
      rankings: result.rankings
    }
  }


  /**
   * 요인분석 (Factor Analysis) - Worker 4 사용
   */
  async factorAnalysis(data: number[][], options: {
    nFactors?: number
    rotation?: 'varimax' | 'quartimax' | 'oblimin'
  } = {}): Promise<{
    loadings: number[][]
    communalities: number[]
    explainedVariance: number[]
    eigenvalues: number[]
  }> {
    const { nFactors = 2, rotation = 'varimax' } = options
    return this.core.callWorkerMethod<{
      loadings: number[][]
      communalities: number[]
      explainedVariance: number[]
      eigenvalues: number[]
    }>(
      4,
      'factor_analysis',
      { data_matrix: data, n_factors: nFactors, rotation },
      { errorMessage: 'Factor analysis 실행 실패' }
    )
  }

  /**
   * 군집분석 (Cluster Analysis) - Worker 4 사용
   */
  async clusterAnalysis(data: number[][], options: {
    nClusters?: number
    method?: 'kmeans' | 'hierarchical' | 'dbscan'
    linkage?: 'ward' | 'complete' | 'average' | 'single'
  } = {}): Promise<{
    clusters: number[]
    centers?: number[][]
    silhouetteScore: number
    inertia?: number
  }> {
    const { nClusters = 3, method = 'kmeans', linkage = 'ward' } = options
    return this.core.callWorkerMethod<{
      clusters: number[]
      centers?: number[][]
      silhouetteScore: number
      inertia?: number
    }>(
      4,
      'cluster_analysis',
      { data_matrix: data, n_clusters: nClusters, method, linkage },
      { errorMessage: 'Cluster analysis 실행 실패' }
    )
  }

  /**
   * 시계열 분석 (Time Series Analysis) - Worker 4 사용
   */
  async timeSeriesAnalysis(data: number[], options: {
    seasonalPeriod?: number
    forecastPeriods?: number
    method?: 'decomposition' | 'arima' | 'exponential'
  } = {}): Promise<{
    trend?: number[]
    seasonal?: number[]
    residual?: number[]
    forecast?: number[]
    acf?: number[]
    pacf?: number[]
  }> {
    const { seasonalPeriod = 12, forecastPeriods = 6, method = 'decomposition' } = options
    return this.core.callWorkerMethod<{
      trend?: number[]
      seasonal?: number[]
      residual?: number[]
      forecast?: number[]
      acf?: number[]
      pacf?: number[]
    }>(
      4,
      'time_series_analysis',
      { data_values: data, seasonal_periods: seasonalPeriod, forecast_periods: forecastPeriods, method },
      { errorMessage: 'Time series analysis 실행 실패' }
    )
  }

  // ========== Wrapper 메서드들 (StatisticalCalculator와의 호환성) ==========

  /**
   * 기술통계 계산
   */
  async calculateDescriptiveStatistics(data: number[]): Promise<any> {
    return this.descriptiveStats(data)
  }

  /**
   * 정규성 검정
   */
  async testNormality(data: number[], alpha: number = 0.05): Promise<any> {
    const result = await this.shapiroWilkTest(data)
    return {
      ...result,
      isNormal: result.pValue > alpha
    }
  }


  /**
   * 등분산 검정
   */
  async testHomogeneity(groups: number[][], method: string = 'levene'): Promise<any> {
    return this.leveneTest(groups)
  }

  /**
   * 일표본 t-검정 - Worker 2 래퍼
   */
  async oneSampleTTest(data: number[], popmean: number, alternative: string = 'two-sided'): Promise<any> {
    const result = await this.tTestOneSample(data, popmean)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      df: result.df
    }
  }


  /**
   * 독립표본 t-검정 - Worker 2 래퍼
   */
  async twoSampleTTest(group1: number[], group2: number[], equalVar: boolean = true): Promise<any> {
    const result = await this.tTestTwoSample(group1, group2, equalVar)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      df: result.df,
      mean1: result.mean1,
      mean2: result.mean2,
      meanDiff: result.meanDiff
    }
  }


  /**
   * 대응표본 t-검정 - Worker 2 래퍼
   */
  async pairedTTest(values1: number[], values2: number[], alternative: string = 'two-sided'): Promise<any> {
    const result = await this.tTestPaired(values1, values2)
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      df: result.df,
      meanDiff: result.meanDiff
    }
  }


  /**
   * 일원분산분석 - Worker 3 래퍼
   */
  async oneWayANOVA(groups: number[][]): Promise<any> {
    const result = await this.oneWayAnovaWorker(groups)
    return {
      fStatistic: result.fStatistic,
      pValue: result.pValue,
      dfBetween: result.dfBetween,
      dfWithin: result.dfWithin
    }
  }


  /**
   * 단순선형회귀 - 기존 regression 래퍼
   */
  async simpleLinearRegression(xValues: number[], yValues: number[]): Promise<any> {
    const result = await this.regression(xValues, yValues)
    return {
      slope: result.slope,
      intercept: result.intercept,
      rSquared: result.rSquared,
      fStatistic: result.fStatistic,
      pvalue: result.pvalue
    }
  }


  /**
   * 카이제곱 검정 - Worker 2 래퍼
   */
  async chiSquareTest(observedMatrix: number[][], correction: boolean = false): Promise<any> {
    const result = await this.chiSquareTestWorker(observedMatrix, correction)
    return {
      statistic: result.chiSquare,
      pValue: result.pValue,
      df: result.df
    }
  }


  /**
   * 주성분 분석 - 기존 pca 래퍼
   */
  async performPCA(dataMatrix: number[][], columns: string[], nComponents?: number, standardize: boolean = true): Promise<any> {
    const result = await this.pca(dataMatrix)

    // 누적 분산 계산
    const cumulativeVariance = []
    let cumSum = 0
    for (const ratio of result.explainedVariance) {
      cumSum += ratio
      cumulativeVariance.push(cumSum)
    }


    return {
      components: result.components,
      explainedVarianceRatio: result.explainedVariance,
      cumulativeVariance,
      totalExplainedVariance: result.totalExplainedVariance
    }
  }


  /**
   * 이원분산분석 (Two-way ANOVA) - Worker 3 사용
   */
  async twoWayAnova(
    data: Array<{ factor1: string; factor2: string; value: number }>
  ): Promise<{
    factor1: { fStatistic: number; pValue: number; df: number }
    factor2: { fStatistic: number; pValue: number; df: number }
    interaction: { fStatistic: number; pValue: number; df: number }
    residual: { df: number }
    anovaTable: Record<string, any>
  }> {
    // 데이터 변환: { factor1, factor2, value }[] → data_values, factor1_values, factor2_values
    const dataValues = data.map(d => d.value)
    const factor1Values = data.map(d => d.factor1)
    const factor2Values = data.map(d => d.factor2)

    return this.core.callWorkerMethod<{
      factor1: { fStatistic: number; pValue: number; df: number }
      factor2: { fStatistic: number; pValue: number; df: number }
      interaction: { fStatistic: number; pValue: number; df: number }
      residual: { df: number }
      anovaTable: Record<string, any>
    }>(
      3,
      'two_way_anova',
      { data_values: dataValues, factor1_values: factor1Values, factor2_values: factor2Values },
      { errorMessage: 'Two-way ANOVA 실행 실패' }
    )
  }

  /**
   * Tukey HSD 사후검정 (실제 구현)
   */
  async performTukeyHSD(
    groups: number[][],
    groupNames: string[],
    alpha: number = 0.05
  ): Promise<any> {
    // Worker 3의 tukeyHSD 사용
    const result = await this.tukeyHSD(groups)
    return {
      comparisons: result.comparisons,
      alpha,
      reject_count: result.comparisons.filter((c: any) => c.reject || c.pValue < alpha).length
    }
  }


  /**
   * 다중회귀분석 (Multiple Linear Regression)
   */
  async multipleRegression(
    X: number[][],  // 독립변수들
    y: number[],    // 종속변수
    variableNames: string[] = []
  ): Promise<any> {
    return this.core.callWorkerMethod<any>(
      4,
      'multiple_regression',
      { X, y },
      { errorMessage: 'Multiple regression 실행 실패' }
    )
  }

  /**
   * 로지스틱 회귀분석 - Worker 4
   */
  async logisticRegression(
    X: number[][],  // 독립변수들
    y: number[],    // 종속변수 (0 또는 1)
    variableNames: string[] = []
  ): Promise<any> {
    return this.core.callWorkerMethod<any>(
      4,
      'logistic_regression',
      { X, y },
      { errorMessage: 'Logistic regression 실행 실패' }
    )
  }

  /**
   * 상관 분석
   */
  async calculateCorrelation(columnsData: Record<string, number[]>, method: string = 'pearson'): Promise<any> {
    const columns = Object.keys(columnsData)
    const matrix = []

    for (let i = 0; i < columns.length; i++) {
      const row = []
      for (let j = 0; j < columns.length; j++) {
        if (i === j) {
          row.push(1)
        } else {
          const result = await this.correlation(
            columnsData[columns[i]],
            columnsData[columns[j]]
          )
          if (method == 'spearman') {
            row.push(result.spearman.r)
          } else if (method == 'kendall') {
            row.push(result.kendall.r)
          } else {
            row.push(result.pearson.r)
          }
        }
      }
      matrix.push(row)
    }


    return { matrix }
  }

  /**
   * Dunn Test (비모수 사후검정) - 직접 구현
   *
   * 구현 기준: Dunn, O.J. (1964). "Multiple comparisons using rank sums". Technometrics, 6(3), 241-252.
   *
   * 검증 방법:
   * - R: dunn.test::dunn.test(x, g, method="holm", kw=TRUE, label=TRUE)
   * - Python: scikit_posthocs.posthoc_dunn(data, val_col='values', group_col='groups', p_adjust='holm')
   * - 온라인 계산기: https://www.statskingdom.com/kruskal-wallis-test-calculator.html
   *
   * 참고: 본 구현은 원논문의 공식을 정확히 따르며, ties 보정을 포함합니다.
   * p-value 보정 방법: Bonferroni, Holm, FDR(Benjamini-Hochberg) 지원
   */
  async dunnTest(
    groups: number[][],
    groupNames: string[],
    pAdjust: string = 'holm',
    alpha: number = 0.05
  ): Promise<any> {
    const baseResult = await this.core.callWorkerMethod<any>(
      3,
      'dunn_test',
      { groups, p_adjust: pAdjust },
      { errorMessage: 'Dunn test 실행 실패' }
    )

    // groupNames 맵핑 추가
    const comparisons = baseResult.comparisons.map((comp: any) => ({
      ...comp,
      group1: groupNames[comp.group1] || comp.group1,
      group2: groupNames[comp.group2] || comp.group2
    }))

    return {
      ...baseResult,
      comparisons,
      alpha
    }
  }


  /**
   * Games-Howell Test (등분산 가정하지 않는 사후검정) - 직접 구현
   *
   * 구현 기준: Games, P.A., & Howell, J.F. (1976). "Pairwise multiple comparison procedures
   * with unequal n's and/or variances: A Monte Carlo study". Journal of Educational Statistics, 1(2), 113-125.
   *
   * 검증 방법:
   * - R: PMCMRplus::gamesHowellTest(x ~ g, data = mydata)
   * - R: rstatix::games_howell_test(data, value ~ group)
   * - Python: scikit_posthocs.posthoc_games_howell(data, val_col='values', group_col='groups')
   * - SPSS: Analyze > Compare Means > One-Way ANOVA > Post Hoc > Games-Howell
   *
   * 참고:
   * - Welch-Satterthwaite 자유도 근사 사용
   * - 본 구현은 Studentized range distribution 대신 t-distribution을 사용 (더 보수적)
   * - 등분산을 가정하지 않아 Tukey HSD보다 robust함
   */

  async gamesHowellTest(
    groups: number[][],
    groupNames: string[],
    alpha: number = 0.05
  ): Promise<any> {
    const baseResult = await this.core.callWorkerMethod<any>(
      3,
      'games_howell_test',
      { groups },
      { errorMessage: 'Games-Howell test 실행 실패' }
    )

    // groupNames 맵핑 추가
    const comparisons = baseResult.comparisons.map((comp: any) => ({
      ...comp,
      group1: groupNames[comp.group1] || comp.group1,
      group2: groupNames[comp.group2] || comp.group2
    }))

    return {
      ...baseResult,
      comparisons,
      alpha,
      significant_count: comparisons.filter((c: any) => c.pValue < alpha).length
    }
  }

  /**
   * Bonferroni 사후검정 - Worker 2 t-test 사용
   */
  async performBonferroni(groups: number[][], groupNames: string[], alpha: number = 0.05): Promise<any> {
    await this.initialize()
    await this.core.ensureWorker2Loaded()

    const n_groups = groups.length
    const num_comparisons = n_groups * (n_groups - 1) / 2
    const adjusted_alpha = alpha / num_comparisons

    const comparisons = []

    // 모든 쌍 비교
    for (let i = 0; i < n_groups; i++) {
      for (let j = i + 1; j < n_groups; j++) {
        const result = await this.tTestTwoSample(groups[i], groups[j])

        // Bonferroni 보정
        const adjusted_p = Math.min(result.pValue * num_comparisons, 1.0)

        comparisons.push({
          group1: groupNames[i],
          group2: groupNames[j],
          mean_diff: result.meanDiff,
          t_statistic: result.statistic,
          p_value: result.pValue,
          adjusted_p: adjusted_p,
          significant: adjusted_p < alpha
        })
      }
    }


    return {
      comparisons,
      num_comparisons,
      original_alpha: alpha,
      adjusted_alpha,
      significant_count: comparisons.filter(c => c.significant).length
    }
  }


  // ========================================
  // Worker 3: Nonparametric & ANOVA Methods
  // ========================================

  async mannWhitneyTestWorker(group1: number[], group2: number[]): Promise<{
    statistic: number
    pValue: number
    uStatistic: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      uStatistic: number
    }>(
      3,
      'mann_whitney_test',
      { group1, group2 },
      { errorMessage: 'Mann-Whitney test 실행 실패' }
    )
  }

  async wilcoxonTestWorker(values1: number[], values2: number[]): Promise<{
    statistic: number
    pValue: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
    }>(
      3,
      'wilcoxon_test',
      { values1, values2 },
      { errorMessage: 'Wilcoxon test 실행 실패' }
    )
  }

  async kruskalWallisTestWorker(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    df: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      df: number
    }>(
      3,
      'kruskal_wallis_test',
      { groups },
      { errorMessage: 'Kruskal-Wallis test 실행 실패' }
    )
  }

  async friedmanTestWorker(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    rankings: number[]
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      rankings: number[]
    }>(
      3,
      'friedman_test',
      { groups },
      { errorMessage: 'Friedman test 실행 실패' }
    )
  }

  async oneWayAnovaWorker(groups: number[][]): Promise<{
    fStatistic: number
    pValue: number
    dfBetween: number
    dfWithin: number
  }> {
    return this.core.callWorkerMethod<{
      fStatistic: number
      pValue: number
      dfBetween: number
      dfWithin: number
    }>(
      3,
      'one_way_anova',
      { groups },
      { errorMessage: 'One-way ANOVA 실행 실���' }
    )
  }

  async twoWayAnovaWorker(dataValues: number[], factor1Values: (string | number)[], factor2Values: (string | number)[]): Promise<{
    mainEffect1: { fStatistic: number; pValue: number }
    mainEffect2: { fStatistic: number; pValue: number }
    interaction: { fStatistic: number; pValue: number }
  }> {
    return this.core.callWorkerMethod<{
      mainEffect1: { fStatistic: number; pValue: number }
      mainEffect2: { fStatistic: number; pValue: number }
      interaction: { fStatistic: number; pValue: number }
    }>(
      3,
      'two_way_anova',
      { data_values: dataValues, factor1_values: factor1Values, factor2_values: factor2Values },
      { errorMessage: 'Two-way ANOVA 실행 실패' }
    )
  }

  async tukeyHSDWorker(groups: number[][]): Promise<{
    comparisons: Array<{
      group1: number
      group2: number
      meanDiff: number
      pValue: number
      reject: boolean
    }>
  }> {
    return this.core.callWorkerMethod<{
      comparisons: Array<{
        group1: number
        group2: number
        meanDiff: number
        pValue: number
        reject: boolean
      }>
    }>(
      3,
      'tukey_hsd',
      { groups },
      { errorMessage: 'Tukey HSD test 실행 실패' }
    )
  }

  async signTestWorker(before: number[], after: number[]): Promise<{
    statistic: number
    pValue: number
    nPositive: number
    nNegative: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      nPositive: number
      nNegative: number
    }>(
      3,
      'sign_test',
      { before, after },
      { errorMessage: 'Sign test 실행 실패' }
    )
  }

  async runsTestWorker(sequence: (number | string)[]): Promise<{
    nRuns: number
    expectedRuns: number
    zStatistic: number
    pValue: number
  }> {
    return this.core.callWorkerMethod<{
      nRuns: number
      expectedRuns: number
      zStatistic: number
      pValue: number
    }>(
      3,
      'runs_test',
      { sequence },
      { errorMessage: 'Runs test 실행 실패' }
    )
  }

  async mcnemarTestWorker(contingencyTable: number[][]): Promise<{
    statistic: number
    pValue: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
    }>(
      3,
      'mcnemar_test',
      { contingency_table: contingencyTable },
      { errorMessage: 'McNemar test 실행 실패' }
    )
  }

  async cochranQTestWorker(dataMatrix: number[][]): Promise<{
    qStatistic: number
    pValue: number
    df: number
  }> {
    return this.core.callWorkerMethod<{
      qStatistic: number
      pValue: number
      df: number
    }>(
      3,
      'cochran_q_test',
      { data_matrix: dataMatrix },
      { errorMessage: 'Cochran Q test 실행 실패' }
    )
  }

  async moodMedianTestWorker(groups: number[][]): Promise<{
    statistic: number
    pValue: number
    grandMedian: number
  }> {
    return this.core.callWorkerMethod<{
      statistic: number
      pValue: number
      grandMedian: number
    }>(
      3,
      'mood_median_test',
      { groups },
      { errorMessage: 'Mood median test 실행 실패' }
    )
  }

  async repeatedMeasuresAnovaWorker(
    dataMatrix: number[][],
    subjectIds: (string | number)[],
    timeLabels: (string | number)[]
  ): Promise<{
    fStatistic: number
    pValue: number
    df: { between: number; within: number }
  }> {
    return this.core.callWorkerMethod<{
      fStatistic: number
      pValue: number
      df: { between: number; within: number }
    }>(
      3,
      'repeated_measures_anova',
      { data_matrix: dataMatrix, subject_ids: subjectIds, time_labels: timeLabels },
      { errorMessage: 'Repeated measures ANOVA 실행 실패' }
    )
  }

  async ancovaWorker(yValues: number[], groupValues: (string | number)[], covariates: number[][]): Promise<{
    fStatistic: number
    pValue: number
    adjustedMeans: number[]
  }> {
    return this.core.callWorkerMethod<{
      fStatistic: number
      pValue: number
      adjustedMeans: number[]
    }>(
      3,
      'ancova',
      { y_values: yValues, group_values: groupValues, covariates },
      { errorMessage: 'ANCOVA 실행 실패' }
    )
  }

  async manovaWorker(
    dataMatrix: number[][],
    groupValues: (string | number)[],
    varNames: string[]
  ): Promise<{
    wilksLambda: number
    fStatistic: number
    pValue: number
  }> {
    return this.core.callWorkerMethod<{
      wilksLambda: number
      fStatistic: number
      pValue: number
    }>(
      3,
      'manova',
      { data_matrix: dataMatrix, group_values: groupValues, var_names: varNames },
      { errorMessage: 'MANOVA 실행 실패' }
    )
  }

  async scheffeTestWorker(groups: number[][]): Promise<{
    comparisons: Array<{
      group1: number
      group2: number
      meanDiff: number
      fStatistic: number
      pValue: number
      reject: boolean
    }>
  }> {
    return this.core.callWorkerMethod<{
      comparisons: Array<{
        group1: number
        group2: number
        meanDiff: number
        fStatistic: number
        pValue: number
        reject: boolean
      }>
    }>(
      3,
      'scheffe_test',
      { groups },
      { errorMessage: 'Scheffe test 실행 실패' }
    )
  }

  // ========================================
  // Worker 4: Priority 2 Regression Methods
  // ========================================

  /**
   * 곡선 추정 (Curve Estimation)
   *
   * 다양한 모델 타입으로 데이터를 피팅:
   * - linear: 선형 (y = ax + b)
   * - quadratic: 2차 (y = ax^2 + bx + c)
   * - cubic: 3차 (y = ax^3 + bx^2 + cx + d)
   * - exponential: 지수 (y = a * exp(bx))
   * - logarithmic: 로그 (y = a + b*ln(x))
   * - power: 거듭제곱 (y = a * x^b)
   *
   * @param xValues 독립변수
   * @param yValues 종속변수
   * @param modelType 모델 타입
   * @returns 곡선 추정 결과
   */
  async curveEstimation(
    xValues: number[],
    yValues: number[],
    modelType: 'linear' | 'quadratic' | 'cubic' | 'exponential' | 'logarithmic' | 'power' = 'linear'
  ): Promise<CurveEstimationResult> {
    return this.core.callWorkerMethod<CurveEstimationResult>(
      4,
      'curve_estimation',
      { x_values: xValues, y_values: yValues, model_type: modelType },
      { errorMessage: 'Curve estimation 실행 실패' }
    )
  }

  /**
   * 비선형 회귀분석 (Nonlinear Regression)
   *
   * scipy.optimize.curve_fit을 사용한 비선형 최적화:
   * - exponential: a * exp(bx)
   * - logistic: L / (1 + exp(-k(x - x0)))
   * - gompertz: a * exp(-b * exp(-cx))
   * - power: a * x^b
   * - hyperbolic: (a * x) / (b + x)
   *
   * @param xValues 독립변수
   * @param yValues 종속변수
   * @param modelType 모델 타입
   * @param initialGuess 초기값 (선택)
   * @returns 비선형 회귀 결과
   */
  async nonlinearRegression(
    xValues: number[],
    yValues: number[],
    modelType: 'exponential' | 'logistic' | 'gompertz' | 'power' | 'hyperbolic' = 'exponential',
    initialGuess: number[] | null = null
  ): Promise<NonlinearRegressionResult> {
    return this.core.callWorkerMethod<NonlinearRegressionResult>(
      4,
      'nonlinear_regression',
      {
        x_values: xValues,
        y_values: yValues,
        model_type: modelType,
        initial_guess: initialGuess
      },
      { errorMessage: 'Nonlinear regression 실행 실패' }
    )
  }

  /**
   * 단계적 회귀분석 (Stepwise Regression)
   *
   * 변수 선택을 자동화하는 회귀분석:
   * - forward: 전진 선택법 (변수를 하나씩 추가)
   * - backward: 후진 제거법 (변수를 하나씩 제거)
   *
   * @param yValues 종속변수
   * @param xMatrix 독립변수 행렬
   * @param variableNames 변수 이름 (선택)
   * @param method 선택 방법
   * @param entryThreshold 진입 p-value 임계값
   * @param stayThreshold 유지 p-value 임계값
   * @returns 단계적 회귀 결과
   */
  async stepwiseRegression(
    yValues: number[],
    xMatrix: number[][],
    variableNames: string[] | null = null,
    method: 'forward' | 'backward' = 'forward',
    entryThreshold: number = 0.05,
    stayThreshold: number = 0.10
  ): Promise<StepwiseRegressionResult> {
    return this.core.callWorkerMethod<StepwiseRegressionResult>(
      4,
      'stepwise_regression',
      {
        y_values: yValues,
        x_matrix: xMatrix,
        variable_names: variableNames,
        method,
        entry_threshold: entryThreshold,
        stay_threshold: stayThreshold
      },
      { errorMessage: 'Stepwise regression 실행 실패' }
    )
  }

  /**
   * 이항 로지스틱 회귀 (Binary Logistic Regression)
   *
   * 종속변수가 0/1 이진 변수인 로지스틱 회귀
   * logisticRegression과 유사하지만 별도 구현
   *
   * @param xMatrix 독립변수 행렬
   * @param yValues 종속변수 (0 또는 1)
   * @returns 이항 로지스틱 회귀 결과
   */
  async binaryLogistic(
    xMatrix: number[][],
    yValues: number[]
  ): Promise<BinaryLogisticResult> {
    return this.core.callWorkerMethod<BinaryLogisticResult>(
      4,
      'binary_logistic',
      { x_matrix: xMatrix, y_values: yValues },
      { errorMessage: 'Binary logistic regression 실행 실패' }
    )
  }

  /**
   * 다항 로지스틱 회귀 (Multinomial Logistic Regression)
   *
   * 종속변수가 3개 이상의 범주를 가지는 로지스틱 회귀
   * 예: 선호도(낮음/중간/높음), 등급(A/B/C/D/F)
   *
   * @param xMatrix 독립변수 행렬
   * @param yValues 종속변수 (0, 1, 2, ...)
   * @returns 다항 로지스틱 회귀 결과
   */
  async multinomialLogistic(
    xMatrix: number[][],
    yValues: number[]
  ): Promise<MultinomialLogisticResult> {
    return this.core.callWorkerMethod<MultinomialLogisticResult>(
      4,
      'multinomial_logistic',
      { x_matrix: xMatrix, y_values: yValues },
      { errorMessage: 'Multinomial logistic regression 실행 실패' }
    )
  }

  /**
   * 순서형 로지스틱 회귀 (Ordinal Logistic Regression)
   *
   * 종속변수가 순서가 있는 범주형 변수인 로지스틱 회귀
   * 예: 만족도(매우 불만족 < 불만족 < 보통 < 만족 < 매우 만족)
   *
   * @param xMatrix 독립변수 행렬
   * @param yValues 종속변수 (0, 1, 2, ... 순서 있음)
   * @returns 순서형 로지스틱 회귀 결과
   */
  async ordinalLogistic(
    xMatrix: number[][],
    yValues: number[]
  ): Promise<OrdinalLogisticResult> {
    return this.core.callWorkerMethod<OrdinalLogisticResult>(
      4,
      'ordinal_logistic',
      { x_matrix: xMatrix, y_values: yValues },
      { errorMessage: 'Ordinal logistic regression 실행 실패' }
    )
  }

  /**
   * 프로빗 회귀분석 (Probit Regression)
   *
   * 로지스틱 회귀와 유사하지만 정규분포 누적분포함수(CDF) 사용
   * 극단값에 대해 로지스틱보다 민감하지 않음
   *
   * @param xMatrix 독립변수 행렬
   * @param yValues 종속변수 (0 또는 1)
   * @returns 프로빗 회귀 결과
   */
  async probitRegression(
    xMatrix: number[][],
    yValues: number[]
  ): Promise<ProbitRegressionResult> {
    return this.core.callWorkerMethod<ProbitRegressionResult>(
      4,
      'probit_regression',
      { x_matrix: xMatrix, y_values: yValues },
      { errorMessage: 'Probit regression 실행 실패' }
    )
  }

  /**
   * 포아송 회귀분석 (Poisson Regression)
   *
   * 종속변수가 카운트 데이터(0, 1, 2, ...)인 경우
   * 예: 하루 방문자 수, 사고 발생 건수, 이메일 수신 개수
   *
   * @param xMatrix 독립변수 행렬
   * @param yValues 종속변수 (0 이상 정수)
   * @returns 포아송 회귀 결과
   */
  async poissonRegression(
    xMatrix: number[][],
    yValues: number[]
  ): Promise<PoissonRegressionResult> {
    return this.core.callWorkerMethod<PoissonRegressionResult>(
      4,
      'poisson_regression',
      { x_matrix: xMatrix, y_values: yValues },
      { errorMessage: 'Poisson regression 실행 실패' }
    )
  }

  /**
   * 음이항 회귀분석 (Negative Binomial Regression)
   *
   * 과대산포(overdispersion)가 있는 카운트 데이터
   * 포아송 회귀의 가정(평균=분산)을 만족하지 않을 때 사용
   *
   * @param xMatrix 독립변수 행렬
   * @param yValues 종속변수 (0 이상 정수)
   * @returns 음이항 회귀 결과
   */
  async negativeBinomialRegression(
    xMatrix: number[][],
    yValues: number[]
  ): Promise<NegativeBinomialRegressionResult> {
    return this.core.callWorkerMethod<NegativeBinomialRegressionResult>(
      4,
      'negative_binomial_regression',
      { x_matrix: xMatrix, y_values: yValues },
      { errorMessage: 'Negative binomial regression 실행 실패' }
    )
  }

  // ========================================
  // Worker 4: Priority 1 Methods (3개)
  // ========================================

  /**
   * 선형 회귀분석 (Linear Regression)
   *
   * scipy.stats.linregress를 사용한 단순선형회귀
   * - 기울기, 절편, R², p-value, 표준오차 계산
   * - 최소 3개의 유효한 데이터 쌍 필요
   *
   * @param x 독립변수
   * @param y 종속변수
   * @returns 선형 회귀분석 결과
   */
  async linearRegression(
    x: number[],
    y: number[]
  ): Promise<LinearRegressionResult> {
    return this.core.callWorkerMethod<LinearRegressionResult>(
      4,
      'linear_regression',
      { x, y },
      { errorMessage: 'Linear regression 실행 실패' }
    )
  }

  /**
   * 주성분 분석 (PCA - Principal Component Analysis)
   *
   * numpy.linalg.svd를 사용한 주성분 분석
   * - 차원 축소 및 데이터 시각화
   * - 설명된 분산 비율 계산
   * - 누적 분산 제공
   *
   * @param dataMatrix 데이터 행렬 (행: 관측치, 열: 변수)
   * @param nComponents 추출할 주성분 개수 (기본값: 2)
   * @returns PCA 분석 결과
   */
  async pcaAnalysis(
    dataMatrix: number[][],
    nComponents: number = 2
  ): Promise<PCAAnalysisResult> {
    return this.core.callWorkerMethod<PCAAnalysisResult>(
      4,
      'pca_analysis',
      { data_matrix: dataMatrix, n_components: nComponents },
      { errorMessage: 'PCA analysis 실행 실패' }
    )
  }

  /**
   * Durbin-Watson 검정 (Durbin-Watson Test)
   *
   * 회귀분석 잔차의 자기상관(autocorrelation) 검정
   * - DW 통계량: 0 ~ 4 범위
   * - 2에 가까울수록 독립적 (자기상관 없음)
   * - < 1.5: 양의 자기상관 (Positive autocorrelation)
   * - > 2.5: 음의 자기상관 (Negative autocorrelation)
   *
   * @param residuals 회귀분석 잔차 또는 시계열 데이터
   * @returns Durbin-Watson 검정 결과
   */
  async durbinWatsonTest(
    residuals: number[]
  ): Promise<DurbinWatsonTestResult> {
    return this.core.callWorkerMethod<DurbinWatsonTestResult>(
      4,
      'durbin_watson_test',
      { residuals },
      { errorMessage: 'Durbin-Watson test 실행 실패' }
    )
  }

  /**
   * Pyodide 초기화 여부 확인
   */

  /**
   * 카이제곱 적합도 검정 (Chi-Square Goodness of Fit Test)
   */
  async chiSquareGoodnessTest(
    observed: number[],
    expected?: number[] | null,
    alpha: number = 0.05
  ): Promise<{
    chiSquare: number
    pValue: number
    degreesOfFreedom: number
    criticalValue: number
    reject: boolean
    observed: number[]
    expected: number[]
  }> {
    return this.core.callWorkerMethod<{
      chiSquare: number
      pValue: number
      degreesOfFreedom: number
      criticalValue: number
      reject: boolean
      observed: number[]
      expected: number[]
    }>(
      2,
      'chi_square_goodness_test',
      { observed, expected: expected ?? null, alpha },
      { errorMessage: 'Chi-square goodness of fit test 실행 실패' }
    )
  }

  /**
   * 카이제곱 독립성 검정 (Chi-Square Test of Independence)
   */
  async chiSquareIndependenceTest(
    observedMatrix: number[][],
    yatesCorrection: boolean = false,
    alpha: number = 0.05
  ): Promise<{
    chiSquare: number
    pValue: number
    degreesOfFreedom: number
    criticalValue: number
    reject: boolean
    cramersV: number
    observedMatrix: number[][]
    expectedMatrix: number[][]
  }> {
    return this.core.callWorkerMethod<{
      chiSquare: number
      pValue: number
      degreesOfFreedom: number
      criticalValue: number
      reject: boolean
      cramersV: number
      observedMatrix: number[][]
      expectedMatrix: number[][]
    }>(
      2,
      'chi_square_independence_test',
      { observed_matrix: observedMatrix, yates_correction: yatesCorrection, alpha },
      { errorMessage: 'Chi-square independence test 실행 실패' }
    )
  }


  // ========================================
  // 메서드 별칭 (Method Aliases)
  // 레거시 코드 호환성을 위한 별칭
  // ========================================

  /**
   * 별칭: calculateDescriptiveStats → descriptiveStats
   */
  async calculateDescriptiveStats(data: number[]): Promise<any> {
    return this.descriptiveStats(data)
  }

  /**
   * 별칭: twoWayANOVA → twoWayAnovaWorker
   */
  async twoWayANOVA(...args: Parameters<typeof this.twoWayAnovaWorker>): Promise<ReturnType<typeof this.twoWayAnovaWorker>> {
    return this.twoWayAnovaWorker(...args)
  }

  /**
   * 별칭: repeatedMeasuresAnova → repeatedMeasuresAnovaWorker
   */
  async repeatedMeasuresAnova(...args: Parameters<typeof this.repeatedMeasuresAnovaWorker>): Promise<ReturnType<typeof this.repeatedMeasuresAnovaWorker>> {
    return this.repeatedMeasuresAnovaWorker(...args)
  }

  isInitialized(): boolean {
    return this.core.isInitialized()
  }

  /**
   * Pyodide 인스턴스 정리
   */
  dispose(): void {
    this.core.dispose()
    PyodideStatisticsService.instance = null
  }
}

// 싱글톤 인스턴스 export
export const pyodideStats = PyodideStatisticsService.getInstance()
