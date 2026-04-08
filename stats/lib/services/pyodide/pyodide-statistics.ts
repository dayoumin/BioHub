/**
 * ⚠️⚠️⚠️ IMPORTANT: Python Worker 호출 래퍼 전용 파일 ���️⚠️⚠️
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
 *
 * ========================================
 * pyodideStats 래퍼 사용 범위 (하이브리드 전략)
 * ========================================
 *
 * ✅ 래퍼 사용 권장 (단일 Worker 호출 + 단순 타입):
 *    - binomial-test, sign-test, runs-test, mcnemar
 *    - 테스트 코드에서 Worker 호출 시
 *
 * ❌ 직접 callWorkerMethod 사용 (복잡 페이지):
 *    - anova (다중 Worker 호출 + JS 후처리)
 *    - ancova, arima (복잡한 타입 변환 필요)
 *    - 페이지에서 결과 타입을 세밀하게 제어해야 할 때
 *
 * 이유: 래퍼 타입과 페이지 기대 타입 불일치 시 이중 유지보수 발생
 */

import type { PyodideInterface } from '@/types/pyodide'
import { PyodideCoreService, type WorkerMethodParam } from './core/pyodide-core.service'
import * as Generated from '@/lib/generated/method-types.generated'
import {
  clusterAnalysisAdapter,
  type ClusterAnalysisAdapterResult,
  type ClusterAnalysisOptions
} from './pyodide-statistics.adapters'
import { assertWorkerResultFields } from '@/lib/utils/type-guards'

interface BonferroniComparison {
  group1: string
  group2: string
  mean_diff: number
  tStatistic: number
  pValue: number
  adjusted_p: number
  significant: boolean
}

interface BonferroniResult {
  comparisons: BonferroniComparison[]
  num_comparisons: number
  original_alpha: number
  adjusted_alpha: number
  significant_count: number
}

// ─── Worker2 ANCOVA 결과 타입 ─────────────────────────────────
// worker2-hypothesis.py ancova_analysis() 반환 구조

interface Worker2AncovaMainEffect {
  factor: string
  statistic: number
  pValue: number
  degreesOfFreedom: [number, number]
  partialEtaSquared: number
  observedPower: number
}

interface Worker2AncovaCovariate {
  covariate: string
  statistic: number
  pValue: number
  degreesOfFreedom: [number, number]
  partialEtaSquared: number
  coefficient: number
  standardError: number
}

interface Worker2AncovaPostHoc {
  comparison: string  // "Group1 vs Group2"
  meanDiff: number
  standardError: number
  tValue: number
  pValue: number
  adjustedPValue: number
  cohensD: number
  lowerCI: number
  upperCI: number
}

export interface Worker2AncovaResult {
  mainEffects: Worker2AncovaMainEffect[]
  covariates: Worker2AncovaCovariate[]
  adjustedMeans: Array<{ group: string; adjustedMean: number; standardError: number; ci95Lower: number; ci95Upper: number }>
  postHoc: Worker2AncovaPostHoc[]
  assumptions: Record<string, unknown>
  modelFit: { rSquared: number; adjustedRSquared: number; fStatistic: number; fPValue: number; rmse: number; residualStandardError: number }
  interpretation: Record<string, unknown>
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
   * Pyodide 인스턴스에 접근 (테스트용)
   * @internal
   */
  get pyodide(): PyodideInterface | null {
    return this.core.getPyodideInstance()
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
   * Levene 등분산성 검정 - Worker 2 사용
   */
  async leveneTest(groups: number[][]): Promise<Generated.LeveneTestResult> {
    return Generated.leveneTest(groups)
  }

  /**
   * Bartlett's test for homogeneity of variances - Worker 2 사용
   * Levene's test보다 정규성에 민감하지만 더 강력한 검정
   */
  async bartlettTest(groups: number[][]): Promise<Generated.BartlettTestResult> {
    return Generated.bartlettTest(groups)
  }

  /**
   * Kolmogorov-Smirnov test for normality - Worker 1 사용
   * Shapiro-Wilk보다 큰 표본에 적합
   */
  async kolmogorovSmirnovTest(data: number[]): Promise<Generated.KolmogorovSmirnovTestResult> {
    return Generated.kolmogorovSmirnovTest(data)
  }

  /**
   * Anderson-Darling 정규성 검정
   * @throws Python Worker에 미구현 — scipy.stats.anderson은 pValue를 직접 반환하지 않아 변환 로직 필요
   */
  async andersonDarlingTest(_data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    throw new Error('Anderson-Darling test is not yet implemented in Python Worker. Use shapiroWilkTest() or kolmogorovSmirnovTest() instead.')
  }

  /**
   * D'Agostino-Pearson 정규성 검정
   * @throws Python Worker에 미구현 — scipy.stats.normaltest로 구현 예정
   */
  async dagostinoPearsonTest(_data: number[]): Promise<{
    statistic: number
    pValue: number
    isNormal: boolean
  }> {
    throw new Error('D\'Agostino-Pearson test is not yet implemented in Python Worker. Use shapiroWilkTest() or kolmogorovSmirnovTest() instead.')
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
      shapiroWilk?: Generated.NormalityTestResult
    }
    homogeneity?: {
      levene?: Generated.LeveneTestResult
      bartlett?: { statistic: number; pValue: number; equalVariance: boolean }
    }
    independence?: {
      durbin?: { statistic: number; interpretation: string; isIndependent: boolean }
    }
    summary: {
      canUseParametric: boolean
      reasons: string[]
      recommendations: string[]
      testError?: boolean
    }
  }> {
    const results: {
      normality: {
        shapiroWilk?: Generated.NormalityTestResult & { isNormal: boolean }
      }
      homogeneity: {
        levene?: Generated.LeveneTestResult
        bartlett?: { statistic: number; pValue: number; equalVariance: boolean }
      }
      independence: {
        durbin?: { statistic: number; interpretation: string; isIndependent: boolean }
      }
      summary: { canUseParametric: boolean; reasons: string[]; recommendations: string[]; testError?: boolean }
    } = {
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
        // Shapiro-Wilk (n ≤ 5000). n > 5000은 CLT 적용 — 검정 생략
        if (data.values.length <= 5000) {
          results.normality.shapiroWilk = await this.testNormality(data.values)
          if (!results.normality.shapiroWilk.isNormal) {
            results.summary.canUseParametric = false
            results.summary.reasons.push('정규성 가정 위반 (Shapiro-Wilk)')
            results.summary.recommendations.push('비모수 검정 사용 권장')
          }
        }
      } catch (error) {
        console.error('정규성 검정 실패:', error)
        results.summary.testError = true
        results.summary.reasons.push('정규성 검정 실패 — 결과 신뢰 불가')
      }
    }

    // 등분산성 검정
    if (data.groups && data.groups.length >= 2) {
      try {
        // Levene's test (정규성 가정에 강건)
        results.homogeneity.levene = await this.leveneTest(data.groups)
        if (!results.homogeneity.levene.equalVariance) {
          // canUseParametric 변경 없음 — Welch's t-test는 모수 검정
          results.summary.reasons.push('등분산성 가정 위반 (Levene) — Welch 권장')
          results.summary.recommendations.push("Welch's t-test 또는 Games-Howell 사용")
        }

        // Bartlett's test (정규분포일 때 더 강력)
        if (results.normality.shapiroWilk?.isNormal) {
          results.homogeneity.bartlett = await this.bartlettTest(data.groups)
        }
      } catch (error) {
        console.error('등분산성 검정 실패:', error)
        results.summary.testError = true
        results.summary.reasons.push('등분산성 검정 실패 — 결과 신뢰 불가')
      }
    }

    // 독립성 검정
    if (data.residuals && data.residuals.length >= 2) {
      try {
        results.independence.durbin = await this.durbinWatsonTest(data.residuals)
        if (!results.independence.durbin.isIndependent) {
          results.summary.canUseParametric = false
          results.summary.reasons.push('독립성 가정 위반')
          results.summary.recommendations.push('시계열 분석 방법 사용')
        }
      } catch (error) {
        console.error('독립성 검정 실패:', error)
        results.summary.testError = true
        results.summary.reasons.push('독립성 검정 실패 — 결과 신뢰 불가')
      }
    }

    // 종합 권장사항 (testError 우선)
    if (results.summary.testError) {
      results.summary.recommendations.push('검정 실패 — 가정 판정 불가, 전문가 확인 권장')
    } else if (results.summary.canUseParametric) {
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
  async descriptiveStats(data: number[]): Promise<Generated.DescriptiveStatsResult> {
    return Generated.descriptiveStats(data)
  }

  /**
   * 집단별 평균 플롯 데이터 생성 (Worker 1 means_plot_data)
   * @param data 원시 행 데이터 (List[Dict])
   * @param dependentVar 종속변수 이름
   * @param factorVar 요인변수 이름
   * @returns descriptives, plotData, interpretation
   */
  async meansPlotData(
    data: Array<Record<string, unknown>>,
    dependentVar: string,
    factorVar: string,
  ): Promise<Record<string, unknown>> {
    return this.core.callWorkerMethod<Record<string, unknown>>(
      1, 'means_plot_data',
      { data: data as unknown as WorkerMethodParam, dependentVar, factorVar }
    )
  }

  /**
   * 정규성 검정 (Normality Test - Shapiro-Wilk)
   */
  async normalityTest(data: number[], alpha: number = 0.05): Promise<Generated.NormalityTestResult> {
    const result = await Generated.normalityTest(data, alpha)
    assertWorkerResultFields(result, ['statistic', 'pValue', 'isNormal'], 'normality_test')
    return result
  }

  /**
   * 이상치 탐지 (Outlier Detection)
   */
  async outlierDetection(data: number[], method: 'iqr' | 'zscore' = 'iqr'): Promise<{
    outlierIndices: number[]
    outlierCount: number
    method: string
  }> {
    const result = await Generated.outlierDetection(data, method)
    assertWorkerResultFields(result, ['outlierIndices', 'outlierCount', 'method'], 'outlier_detection')
    return {
      outlierIndices: result.outlierIndices,
      outlierCount: result.outlierCount,
      method: result.method
    }
  }

  /**
   * 빈도분석 (Frequency Analysis)
   */
  async frequencyAnalysis(values: (string | number)[]): Promise<Generated.FrequencyAnalysisResult> {
    return Generated.frequencyAnalysis(values)
  }

  /**
   * 교차표 분석 (Crosstab Analysis)
   */
  async crosstabAnalysis(rowValues: (string | number)[], colValues: (string | number)[]): Promise<Generated.CrosstabAnalysisResult> {
    return Generated.crosstabAnalysis(rowValues, colValues)
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
  ): Promise<Generated.OneSampleProportionTestResult> {
    return Generated.oneSampleProportionTest(successCount, totalCount, nullProportion, alternative, alpha)
  }

  /**
   * 신뢰도 분석 (Cronbach's Alpha) - Worker 1 버전
   */
  async cronbachAlphaWorker(itemsMatrix: number[][]): Promise<Generated.CronbachAlphaResult> {
    return Generated.cronbachAlpha(itemsMatrix)
  }

  /**
   * 상관계수 계산 (Correlation Test) - Worker 2
   */
  async correlationTest(x: number[], y: number[], method: 'pearson' | 'spearman' | 'kendall' = 'pearson'): Promise<Generated.CorrelationTestResult & { method: string }> {
    const result = await Generated.correlationTest(x, y, method)
    assertWorkerResultFields(result, ['correlation', 'pValue'], 'correlation_test')
    return { ...result, method }
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

    // Worker 2의 correlation_test를 병렬 호출
    const [pearsonResult, spearmanResult, kendallResult] = await Promise.all([
      this.correlationTest(x, y, 'pearson'),
      this.correlationTest(x, y, 'spearman'),
      this.correlationTest(x, y, 'kendall'),
    ])

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
  async tTestTwoSample(group1: number[], group2: number[], equalVar: boolean = true, alternative?: 'two-sided' | 'less' | 'greater'): Promise<Generated.TTestTwoSampleResult & { df: number; meanDiff: number }> {
    const result = await Generated.tTestTwoSample(group1, group2, equalVar, alternative)
    assertWorkerResultFields(result, ['statistic', 'pValue', 'n1', 'n2', 'mean1', 'mean2'], 't_test_two_sample')
    return {
      ...result,
      df: result.n1 + result.n2 - 2,
      meanDiff: result.mean1 - result.mean2
    }
  }

  /**
   * 대응표본 t-검정 (Paired t-Test) - Worker 2
   */
  async tTestPaired(values1: number[], values2: number[], alternative?: 'two-sided' | 'less' | 'greater'): Promise<Generated.TTestPairedResult & { df: number }> {
    const result = await Generated.tTestPaired(values1, values2, alternative)
    assertWorkerResultFields(result, ['statistic', 'pValue', 'nPairs'], 't_test_paired')
    return {
      ...result,
      df: result.nPairs - 1
    }
  }

  /**
   * Wilcoxon 부호순위 검정 (Wilcoxon Signed-Rank Test) - Worker 3
   * 대응표본의 중위수 차이를 비모수적으로 검정
   */
  async wilcoxonSignedRankTest(values1: number[], values2: number[]): Promise<Generated.WilcoxonTestResult> {
    return Generated.wilcoxonTest(values1, values2)
  }

  /**
   * 일표본 t-검정 (One-Sample t-Test) - Worker 2
   */
  async tTestOneSample(data: number[], popmean: number = 0, alternative?: 'two-sided' | 'less' | 'greater'): Promise<Generated.TTestOneSampleResult & { df: number }> {
    const result = await Generated.tTestOneSample(data, popmean, alternative)
    assertWorkerResultFields(result, ['statistic', 'pValue', 'sampleMean', 'n'], 't_test_one_sample')
    return {
      ...result,
      df: result.n - 1
    }
  }

  /**
   * Z-검정 (Z-Test) - Worker 2
   */
  async zTestWorker(data: number[], popmean: number, popstd: number): Promise<Generated.ZTestResult & { zStatistic: number }> {
    const result = await Generated.zTest(data, popmean, popstd)
    assertWorkerResultFields(result, ['statistic', 'pValue'], 'z_test')
    return {
      ...result,
      zStatistic: result.statistic,
    }
  }

  /**
   * 카이제곱 검정 (Chi-Square Test) - Worker 2
   */
  async chiSquareTestWorker(observedMatrix: number[][], yatesCorrection: boolean = false): Promise<Generated.ChiSquareTestResult & { chiSquare: number }> {
    const result = await Generated.chiSquareTest(observedMatrix, yatesCorrection)
    assertWorkerResultFields(result, ['statistic', 'pValue', 'df'], 'chi_square_test')
    return {
      ...result,
      chiSquare: result.statistic
    }
  }

  /**
   * 이항검정 (Binomial Test) - Worker 2
   */
  async binomialTestWorker(
    successCount: number,
    totalCount: number,
    probability: number = 0.5,
    alternative: 'two-sided' | 'greater' | 'less' = 'two-sided'
  ): Promise<Generated.BinomialTestResult> {
    return Generated.binomialTest(successCount, totalCount, probability, alternative)
  }

  /**
   * 편상관 (Partial Correlation) - Worker 2
   */
  async partialCorrelationWorker(
    dataMatrix: number[][],
    xIdx: number,
    yIdx: number,
    controlIndices: number[]
  ): Promise<Generated.PartialCorrelationResult> {
    return Generated.partialCorrelation(dataMatrix, xIdx, yIdx, controlIndices)
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
    pValue: number
    df: number
    confidenceInterval?: { lower: number; upper: number }
  }> {
    // Worker 2 호출로 간소화
    const alt = options.alternative
    if (options.type === 'one-sample' || (group2.length === 0 && options.mu !== undefined)) {
      const result = await this.tTestOneSample(group1, options.mu ?? 0, alt)
      return {
        statistic: result.statistic,
        pValue: result.pValue,
        df: result.df
      }
    } else if (options.paired) {
      const result = await this.tTestPaired(group1, group2, alt)
      return {
        statistic: result.statistic,
        pValue: result.pValue,
        df: result.df
      }
    } else {
      const result = await this.tTestTwoSample(group1, group2, options.equalVar !== false, alt)
      return {
        statistic: result.statistic,
        pValue: result.pValue,
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
    _options: { type?: 'one-way' | 'two-way' } = {}
  ): Promise<{
    fStatistic: number
    pValue: number
    df: number[]
    etaSquared: number
    omegaSquared: number
    ssBetween: number
    ssWithin: number
    ssTotal: number
  }> {
    // Worker 3 호출로 간소화
    const result = await this.oneWayAnovaWorker(groups)
    return {
      fStatistic: result.fStatistic,
      pValue: result.pValue,
      df: [result.dfBetween, result.dfWithin],
      etaSquared: result.etaSquared,
      omegaSquared: result.omegaSquared,
      ssBetween: result.ssBetween,
      ssWithin: result.ssWithin,
      ssTotal: result.ssTotal
    }
  }

  async oneWayAnovaWorker(groups: number[][]): Promise<Generated.OneWayAnovaResult> {
    return Generated.oneWayAnova(groups)
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
   * 요인분석 (Factor Analysis) - Worker 4 사용
   */
  async factorAnalysis(data: number[][], options: {
    nFactors?: number
    rotation?: 'varimax' | 'quartimax' | 'oblimin'
  } = {}): Promise<Generated.FactorAnalysisResult> {
    const { nFactors = 2, rotation = 'varimax' } = options
    return Generated.factorAnalysis(data, nFactors, rotation)
  }

  /**
   * 군집분석 (Cluster Analysis) - Worker 4 사용
   */
  async clusterAnalysis(
    data: number[][],
    options: ClusterAnalysisOptions = {}
  ): Promise<ClusterAnalysisAdapterResult> {
    return clusterAnalysisAdapter(data, options)
  }

  /**
   * 시계열 분석 (Time Series Analysis) - Worker 4 사용
   * Python time_series_analysis(dataValues, seasonalPeriods=12)
   */
  async timeSeriesAnalysis(data: number[], options: {
    seasonalPeriods?: number
  } = {}): Promise<Generated.TimeSeriesAnalysisResult> {
    const { seasonalPeriods = 12 } = options
    return Generated.timeSeriesAnalysis(data, seasonalPeriods)
  }

  /**
   * ARIMA 예측 - Worker 4 사용
   * Python arima_forecast(values, order=(1,1,1), nForecast=10)
   */
  async arimaForecast(
    values: number[],
    order?: [number, number, number],
    nForecast?: number,
  ): Promise<Generated.ArimaForecastResult> {
    const result = await Generated.arimaForecast(
      values,
      order ?? [1, 1, 1],
      nForecast ?? 10,
    )
    assertWorkerResultFields(result, ['forecast', 'confidenceIntervals'], 'arima_forecast')
    return result
  }

  /**
   * Mann-Kendall 추세 검정 - Worker 1 사용
   * Python mann_kendall_test(data)
   */
  async mannKendallTest(
    data: number[],
  ): Promise<Generated.MannKendallTestResult> {
    const result = await Generated.mannKendallTest(data)
    assertWorkerResultFields(result, ['tau', 'pValue', 'trend', 'senSlope'], 'mann_kendall_test')
    return result
  }

  // ========== Wrapper 메서드들 (StatisticalCalculator와의 호환성) ==========

  /**
   * 기술통계 계산
   */
  async calculateDescriptiveStatistics(data: number[]): Promise<Generated.DescriptiveStatsResult> {
    return this.descriptiveStats(data)
  }

  /**
   * 정규성 검정
   */
  async testNormality(data: number[], alpha: number = 0.05): Promise<Generated.NormalityTestResult> {
    return this.normalityTest(data, alpha)
  }


  /**
   * 이원분산분석 (Two-way ANOVA) - Worker 3 사용
   */
  async twoWayAnova(
    data: Array<{ factor1: string; factor2: string; value: number }>
  ): Promise<Generated.TwoWayAnovaResult> {
    // 데이터 변환: { factor1, factor2, value }[] → dataValues, factor1Values, factor2Values
    const dataValues = data.map(d => d.value)
    const factor1Values = data.map(d => d.factor1)
    const factor2Values = data.map(d => d.factor2)
    return Generated.twoWayAnova(dataValues, factor1Values, factor2Values)
  }

  /**
   * Tukey HSD 사후검정 (실제 구현)
   */
  async performTukeyHSD(
    groups: number[][],
    groupNames: string[],
    alpha: number = 0.05
  ): Promise<{
    comparisons: Generated.TukeyHsdResult['comparisons']
    alpha: number
    reject_count: number
  }> {
    // Note: tukeyHSDWorker는 alpha를 받지 않음 (Python Worker 제약).
    // Worker 내부에서 p-value 기반 significant 필드를 계산하며,
    // 여기서는 사용자 alpha로 reject_count를 추가 계산함.
    const result = await this.tukeyHSDWorker(groups)

    // groupNames 맵핑 추가 (Python Worker는 int 인덱스 반환)
    const comparisons = result.comparisons.map((comp) => ({
      ...comp,
      group1: groupNames[Number(comp.group1)] ?? String(comp.group1),
      group2: groupNames[Number(comp.group2)] ?? String(comp.group2)
    }))

    return {
      comparisons,
      alpha,
      reject_count: comparisons.filter(c => c.significant || c.pValue < alpha).length
    }
  }


  /**
   * 다중회귀분석 (Multiple Linear Regression)
   */
  async multipleRegression(
    X: number[][],  // 독립변수들
    y: number[],    // 종속변수
    _variableNames: string[] = []
  ): Promise<Generated.MultipleRegressionResult> {
    return Generated.multipleRegression(X, y)
  }

  /**
   * 로지스틱 회귀분석 - Worker 4
   */
  async logisticRegression(
    X: number[][],  // 독립변수들
    y: number[],    // 종속변수 (0 또는 1)
    _variableNames: string[] = []
  ): Promise<Generated.LogisticRegressionResult> {
    return Generated.logisticRegression(X, y)
  }

  /**
   * 상관 분석
   *
   * @remarks
   * 다중 컬럼 입력을 받아 N×N 상관계수 행렬을 구성하는 집계 API입니다.
   * Worker 단일 메서드(Generated) 결과와 1:1 매핑되지 않는 의도된 커스텀 반환 타입입니다.
   */
  async calculateCorrelation(columnsData: Record<string, number[]>, method: string = 'pearson'): Promise<{ matrix: number[][] }> {
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
          if (method === 'spearman') {
            row.push(result.spearman.r)
          } else if (method === 'kendall') {
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
  ): Promise<Generated.DunnTestResult & { alpha: number }> {
    const baseResult = await Generated.dunnTest(groups, pAdjust)

    // groupNames 맵핑 추가 (Python Worker는 int 인덱스 반환)
    const comparisons = baseResult.comparisons.map((comp) => ({
      ...comp,
      group1: groupNames[Number(comp.group1)] ?? String(comp.group1),
      group2: groupNames[Number(comp.group2)] ?? String(comp.group2)
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
  ): Promise<Generated.GamesHowellTestResult & { alpha: number; significant_count: number }> {
    const baseResult = await Generated.gamesHowellTest(groups)

    // groupNames 맵핑 추가 (Python Worker는 int 인덱스 반환)
    const comparisons = baseResult.comparisons.map((comp) => ({
      ...comp,
      group1: groupNames[Number(comp.group1)] ?? String(comp.group1),
      group2: groupNames[Number(comp.group2)] ?? String(comp.group2)
    }))

    return {
      ...baseResult,
      comparisons,
      alpha,
      significant_count: comparisons.filter((c) => c.pValue < alpha).length
    }
  }

  /**
   * Bonferroni 사후검정 - Worker 2 t-test 사용
   */
  async performBonferroni(groups: number[][], groupNames: string[], alpha: number = 0.05): Promise<BonferroniResult> {

    const n_groups = groups.length
    const num_comparisons = n_groups * (n_groups - 1) / 2
    const adjusted_alpha = alpha / num_comparisons

    const comparisons: BonferroniComparison[] = []

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
          tStatistic: result.statistic,
          pValue: result.pValue,
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
    const result = await Generated.mannWhitneyTest(group1, group2)
    assertWorkerResultFields(result, ['statistic', 'pValue'], 'mann_whitney_test')
    return {
      statistic: result.statistic,
      pValue: result.pValue,
      uStatistic: result.statistic
    }
  }

  async wilcoxonTestWorker(values1: number[], values2: number[]): Promise<Generated.WilcoxonTestResult> {
    return Generated.wilcoxonTest(values1, values2)
  }

  async kruskalWallisTestWorker(groups: number[][]): Promise<Generated.KruskalWallisTestResult> {
    return Generated.kruskalWallisTest(groups)
  }

  async friedmanTestWorker(groups: number[][]): Promise<Generated.FriedmanTestResult> {
    return Generated.friedmanTest(groups)
  }



  async twoWayAnovaWorker(dataValues: number[], factor1Values: (string | number)[], factor2Values: (string | number)[]): Promise<{
    mainEffect1: { fStatistic: number; pValue: number }
    mainEffect2: { fStatistic: number; pValue: number }
    interaction: { fStatistic: number; pValue: number }
  }> {
    const result = await Generated.twoWayAnova(dataValues, factor1Values, factor2Values)
    assertWorkerResultFields(result, ['factor1', 'factor2', 'interaction'], 'two_way_anova')
    return {
      mainEffect1: { fStatistic: result.factor1.fStatistic, pValue: result.factor1.pValue },
      mainEffect2: { fStatistic: result.factor2.fStatistic, pValue: result.factor2.pValue },
      interaction: { fStatistic: result.interaction.fStatistic, pValue: result.interaction.pValue }
    }
  }

  async tukeyHSDWorker(groups: number[][]): Promise<Generated.TukeyHsdResult> {
    return Generated.tukeyHsd(groups)
  }

  async signTestWorker(before: number[], after: number[]): Promise<Generated.SignTestResult> {
    return Generated.signTest(before, after)
  }

  async runsTestWorker(sequence: (number | string)[]): Promise<Generated.RunsTestResult> {
    return Generated.runsTest(sequence)
  }

  async mcnemarTestWorker(contingencyTable: number[][]): Promise<Generated.McnemarTestResult> {
    return Generated.mcnemarTest(contingencyTable)
  }

  async cochranQTestWorker(dataMatrix: number[][]): Promise<Generated.CochranQTestResult> {
    return Generated.cochranQTest(dataMatrix)
  }

  async moodMedianTestWorker(groups: number[][]): Promise<Generated.MoodMedianTestResult> {
    return Generated.moodMedianTest(groups)
  }

  async repeatedMeasuresAnovaWorker(
    dataMatrix: number[][],
    subjectIds: (string | number)[],
    timeLabels: (string | number)[]
  ): Promise<Generated.RepeatedMeasuresAnovaResult> {
    return Generated.repeatedMeasuresAnova(dataMatrix, subjectIds, timeLabels)
  }


  /**
   * Worker2 ANCOVA (postHoc 포함)
   * Worker3 ancova()는 postHoc 미지원 → Worker2 ancova_analysis()로 전환
   */
  async ancovaAnalysisWorker(
    dependentVar: string,
    factorVars: string[],
    covariateVars: string[],
    data: Array<Record<string, unknown>>
  ): Promise<Worker2AncovaResult> {
    return this.core.callWorkerMethod<Worker2AncovaResult>(
      2, 'ancova_analysis',
      {
        dependent_var: dependentVar,
        factor_vars: factorVars,
        covariate_vars: covariateVars,
        data: data as WorkerMethodParam,
      }
    )
  }

  async manovaWorker(
    dataMatrix: number[][],
    groupValues: (string | number)[],
    varNames: string[]
  ): Promise<Generated.ManovaResult> {
    return Generated.manova(dataMatrix, groupValues, varNames)
  }

  async scheffeTestWorker(groups: number[][]): Promise<Generated.ScheffeTestResult> {
    return Generated.scheffeTest(groups)
  }

  /**
   * 혼합 모형 (Mixed Model) — Worker2 mixed_model
   *
   * @param dependentVar 종속변수명
   * @param fixedEffects 고정 효과 변수명 목록
   * @param randomEffects 랜덤 효과 변수명 목록
   * @param data 행 단위 딕셔너리 배열
   */
  async mixedModelAnalysis(
    dependentVar: string,
    fixedEffects: string[],
    randomEffects: string[],
    data: Array<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    return this.core.callWorkerMethod<Record<string, unknown>>(
      2, 'mixed_model',
      {
        dependent_var: dependentVar,
        fixed_effects: fixedEffects,
        random_effects: randomEffects,
        data: data as WorkerMethodParam,
      }
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
  ): Promise<Generated.CurveEstimationResult> {
    return Generated.curveEstimation(xValues, yValues, modelType)
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
  ): Promise<Generated.NonlinearRegressionResult> {
    return Generated.nonlinearRegression(xValues, yValues, modelType, initialGuess)
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
  ): Promise<Generated.StepwiseRegressionResult> {
    return Generated.stepwiseRegression(
      yValues,
      xMatrix,
      variableNames ?? undefined,
      method,
      entryThreshold,
      stayThreshold
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
  ): Promise<Generated.BinaryLogisticResult> {
    return Generated.binaryLogistic(xMatrix, yValues)
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
  ): Promise<Generated.MultinomialLogisticResult> {
    return Generated.multinomialLogistic(xMatrix, yValues)
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
  ): Promise<Generated.OrdinalLogisticResult> {
    return Generated.ordinalLogistic(xMatrix, yValues)
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
  ): Promise<Generated.ProbitRegressionResult> {
    return Generated.probitRegression(xMatrix, yValues)
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
  ): Promise<Generated.PoissonRegressionResult> {
    return Generated.poissonRegression(xMatrix, yValues)
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
  ): Promise<Generated.NegativeBinomialRegressionResult> {
    return Generated.negativeBinomialRegression(xMatrix, yValues)
  }

  /**
   * 용량-반응 분석 (Dose-Response Analysis)
   *
   * 용량(농도)에 따른 반응 곡선 피팅
   * 4-parameter logistic (4PL) 등 비선형 모델 사용
   *
   * @param doseData 용량(농도) 값 배열
   * @param responseData 반응 값 배열
   * @param modelType 모델 유형 ('logistic4' 기본)
   * @returns 용량-반응 분석 결과
   */
  async doseResponseAnalysis(
    doseData: number[],
    responseData: number[],
    modelType: string = 'logistic4',
    constraints: Record<string, number> | null = null,
  ): Promise<Generated.DoseResponseAnalysisResult> {
    return Generated.doseResponseAnalysis(doseData, responseData, modelType, constraints)
  }

  /**
   * 반응표면 분석 (Response Surface Analysis)
   *
   * 다수 예측변수와 반응변수 간 2차 모델 피팅
   * 최적 조건 탐색에 사용
   *
   * @param data 원시 데이터 행 배열
   * @param dependentVar 종속변수 컬럼명
   * @param predictorVars 예측변수 컬럼명 배열
   * @param modelType 모델 유형 ('secondOrder' 기본)
   * @returns 반응표면 분석 결과
   */
  async responseSurfaceAnalysis(
    data: Array<Record<string, unknown>>,
    dependentVar: string,
    predictorVars: string[],
    modelType: string = 'secondOrder',
    includeInteraction?: boolean,
    includeQuadratic?: boolean,
  ): Promise<Generated.ResponseSurfaceAnalysisResult> {
    return Generated.responseSurfaceAnalysis(
      data,
      dependentVar,
      predictorVars,
      modelType,
      includeInteraction,
      includeQuadratic,
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
  ): Promise<Generated.LinearRegressionResult> {
    return Generated.linearRegression(x, y)
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
    data: number[][],
    nComponents: number = 2
  ): Promise<Generated.PcaAnalysisResult> {
    return Generated.pcaAnalysis(data, nComponents)
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
  ): Promise<Generated.DurbinWatsonTestResult & { isIndependent: boolean }> {
    const result = await Generated.durbinWatsonTest(residuals)
    assertWorkerResultFields(result, ['statistic', 'pValue'], 'durbin_watson_test')
    return {
      ...result,
      isIndependent: result.statistic >= 1.5 && result.statistic <= 2.5
    }
  }

  /**
   * 카이제곱 적합도 검정 (Chi-Square Goodness of Fit Test)
   */
  async chiSquareGoodnessTest(
    observed: number[],
    expected?: number[] | null,
    alpha: number = 0.05
  ): Promise<Generated.ChiSquareGoodnessTestResult> {
    return Generated.chiSquareGoodnessTest(observed, expected ?? undefined, alpha)
  }

  /**
   * 카이제곱 독립성 검정 (Chi-Square Test of Independence)
   */
  async chiSquareIndependenceTest(
    observedMatrix: number[][],
    yatesCorrection: boolean = false,
    alpha: number = 0.05
  ): Promise<Generated.ChiSquareIndependenceTestResult> {
    return Generated.chiSquareIndependenceTest(observedMatrix, yatesCorrection, alpha)
  }


  // ========================================
  // 메서드 별칭 (Method Aliases)
  // 레거시 코드 호환성을 위한 별칭
  // ========================================

  /**
   * 별칭: calculateDescriptiveStats → descriptiveStats
   */
  async calculateDescriptiveStats(data: number[]): Promise<Generated.DescriptiveStatsResult> {
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


  // ========================================
  // K-S 검정 (Kolmogorov-Smirnov Test)
  // ========================================

  /**
   * K-S 일표본 검정 (정규성 검정) - Worker 1
   * Python ks_test_one_sample(values)
   */
  async ksTestOneSample(values: number[]): Promise<Generated.KsTestOneSampleResult> {
    return Generated.ksTestOneSample(values)
  }

  /**
   * K-S 이표본 검정 - Worker 1
   * Python ks_test_two_sample(values1, values2)
   */
  async ksTestTwoSample(values1: number[], values2: number[]): Promise<Generated.KsTestTwoSampleResult> {
    return Generated.ksTestTwoSample(values1, values2)
  }

  // ========================================
  // 판별분석 (Discriminant Analysis)
  // ========================================

  /**
   * 선형 판별분석 (LDA) - Worker 4
   * Python discriminant_analysis(data, groups)
   */
  async discriminantAnalysis(
    data: number[][],
    groups: (string | number)[]
  ): Promise<Generated.DiscriminantAnalysisResult> {
    return Generated.discriminantAnalysis(data, groups)
  }

  // ========================================
  // 생존 분석 (Survival Analysis)
  // ========================================

  /**
   * Kaplan-Meier 생존 분석 - Worker 4
   */
  async kaplanMeierSurvival(
    times: number[],
    events: number[]
  ): Promise<Generated.KaplanMeierSurvivalResult> {
    return Generated.kaplanMeierSurvival(times, events)
  }

  /**
   * 그룹 인식 Kaplan-Meier 생존 분석 - Worker 5
   * Python kaplan_meier_analysis(time, event, group?) — scipy 기반 (lifelines 불사용)
   */
  async kaplanMeierAnalysis(
    time: number[],
    event: number[],
    group?: string[]
  ): Promise<Generated.KaplanMeierAnalysisResult> {
    return Generated.kaplanMeierAnalysis(time, event, group)
  }

  /**
   * ROC 곡선 분석 - Worker 5
   * Python roc_curve_analysis(actualClass, predictedProb)
   */
  async rocCurveAnalysis(
    actualClass: number[],
    predictedProb: number[]
  ): Promise<Generated.RocCurveAnalysisResult> {
    return Generated.rocCurveAnalysis(actualClass, predictedProb)
  }

  /**
   * Cox 비례위험 회귀분석 - Worker 4
   * Python cox_regression(times, events, covariateData, covariateNames)
   */
  async coxRegression(
    times: number[],
    events: number[],
    covariateData: number[][],
    covariateNames: string[]
  ): Promise<Generated.CoxRegressionResult> {
    return Generated.coxRegression(times, events, covariateData, covariateNames)
  }

  // ========================================
  // 검정력 분석 (Power Analysis)
  // ========================================

  /**
   * 검정력 분석 - Worker 2
   */
  async powerAnalysis(
    testType: 't-test' | 'anova' | 'correlation' | 'chi-square' | 'regression',
    analysisType: 'a-priori' | 'post-hoc' | 'compromise' | 'criterion',
    params: {
      alpha: number
      power: number
      effectSize: number
      sampleSize?: number
      sides?: 'two-sided' | 'one-sided'
    }
  ): Promise<Generated.PowerAnalysisResult> {
    return Generated.powerAnalysis(
      testType,
      analysisType,
      params.alpha,
      params.power,
      params.effectSize,
      params.sampleSize,
      params.sides === 'one-sided' ? 'one-sided' : 'two-sided'
    )
  }

  isInitialized(): boolean {
    return this.core.isInitialized()
  }

  /**
   * Pyodide 인스턴스 정리 (싱글톤 초기화)
   */
  dispose(): void {
    this.core.dispose()
    PyodideStatisticsService.instance = null
  }
}

// 싱글톤 인스턴스 export
export const pyodideStats = PyodideStatisticsService.getInstance()
