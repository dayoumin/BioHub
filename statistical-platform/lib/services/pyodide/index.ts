/**
 * Pyodide 통계 서비스 메인 통합 클래스
 *
 * 모든 통계 계산은 Python의 SciPy/NumPy를 통해 수행되어야 합니다.
 * JavaScript 통계 라이브러리는 신뢰성이 검증되지 않았으므로 사용하지 않습니다.
 */

import { DescriptiveService } from './descriptive'
import { HypothesisService } from './hypothesis'
import { ANOVAService } from './anova'
import { RegressionService } from './regression'
import { NonparametricService } from './nonparametric'
import { AdvancedService } from './advanced'

import type {
  DescriptiveStatsResult,
  NormalityTestResult,
  HomogeneityTestResult,
  OutlierResult,
  StatisticalTestResult,
  CorrelationResult,
  ANOVAResult,
  TukeyHSDResult,
  MANOVAResult,
  RegressionResult,
  PCAResult,
  ClusteringResult,
  TimeSeriesResult,
  SurvivalResult
} from './types'

export class PyodideStatisticsService {
  private static instance: PyodideStatisticsService | null = null

  // 각 서비스 모듈의 인스턴스
  private descriptiveService: DescriptiveService
  private hypothesisService: HypothesisService
  private anovaService: ANOVAService
  private regressionService: RegressionService
  private nonparametricService: NonparametricService
  private advancedService: AdvancedService

  private constructor() {
    this.descriptiveService = DescriptiveService.getInstance()
    this.hypothesisService = HypothesisService.getInstance()
    this.anovaService = ANOVAService.getInstance()
    this.regressionService = RegressionService.getInstance()
    this.nonparametricService = NonparametricService.getInstance()
    this.advancedService = AdvancedService.getInstance()
  }

  static getInstance(): PyodideStatisticsService {
    if (!PyodideStatisticsService.instance) {
      PyodideStatisticsService.instance = new PyodideStatisticsService()
    }
    return PyodideStatisticsService.instance
  }

  /**
   * Pyodide 초기화
   */
  async initialize(): Promise<void> {
    // 모든 서비스는 같은 Pyodide 인스턴스를 공유하므로 하나만 초기화하면 됨
    await this.descriptiveService.initialize()
  }

  // =================
  // 기술통계 메서드들
  // =================

  async calculateDescriptiveStats(data: number[]): Promise<DescriptiveStatsResult> {
    return this.descriptiveService.calculateDescriptiveStats(data)
  }

  async calculateDescriptiveStatistics(data: number[]): Promise<DescriptiveStatsResult> {
    return this.descriptiveService.calculateDescriptiveStats(data)
  }

  async descriptiveStats(data: number[]): Promise<DescriptiveStatsResult> {
    return this.descriptiveService.calculateDescriptiveStats(data)
  }

  async normalityTest(data: number[], alpha?: number): Promise<NormalityTestResult> {
    return this.descriptiveService.normalityTest(data, alpha)
  }

  async testNormality(data: number[], alpha?: number): Promise<NormalityTestResult> {
    return this.descriptiveService.normalityTest(data, alpha)
  }

  async homogeneityTest(groups: number[][], method?: string): Promise<HomogeneityTestResult> {
    return this.descriptiveService.homogeneityTest(groups, method)
  }

  async testHomogeneity(groups: number[][], method?: string): Promise<HomogeneityTestResult> {
    return this.descriptiveService.homogeneityTest(groups, method)
  }

  async outlierDetection(data: number[]): Promise<OutlierResult> {
    return this.descriptiveService.outlierDetection(data)
  }

  // 기존 API 호환성 메서드들
  async shapiroWilkTest(data: number[]): Promise<{ statistic: number; pValue: number; isNormal: boolean }> {
    return this.descriptiveService.shapiroWilkTest(data)
  }

  async detectOutliersIQR(data: number[]): Promise<{ q1: number; q3: number; iqr: number; lowerBound: number; upperBound: number; mildOutliers: number[]; extremeOutliers: number[] }> {
    return this.descriptiveService.detectOutliersIQR(data)
  }

  async leveneTest(groups: number[][]): Promise<{ statistic: number; pValue: number; isHomogeneous: boolean }> {
    return this.descriptiveService.leveneTest(groups)
  }

  async bartlettTest(groups: number[][]): Promise<{ statistic: number; pValue: number; isHomogeneous: boolean }> {
    return this.descriptiveService.bartlettTest(groups)
  }

  async kolmogorovSmirnovTest(data: number[]): Promise<{ statistic: number; pValue: number; isNormal: boolean }> {
    return this.descriptiveService.kolmogorovSmirnovTest(data)
  }

  // 추가: 개별 정규성 검정 메서드 노출
  async andersonDarlingTest(data: number[]): Promise<{ statistic: number; criticalValues: number[]; significanceLevels: number[]; pValue: number; isNormal: boolean }> {
    return this.descriptiveService.andersonDarlingTest(data)
  }

  async dagostinoPearsonTest(data: number[]): Promise<{ statistic: number; pValue: number; isNormal: boolean }> {
    return this.descriptiveService.dagostinoPearsonTest(data)
  }

  // =================
  // 가설검정 메서드들
  // =================

  async oneSampleTTest(data: number[], popmean: number, alternative?: string): Promise<StatisticalTestResult> {
    return this.hypothesisService.oneSampleTTest(data, popmean, alternative)
  }

  async twoSampleTTest(group1: number[], group2: number[], equalVar?: boolean): Promise<StatisticalTestResult> {
    return this.hypothesisService.twoSampleTTest(group1, group2, equalVar)
  }

  async pairedTTest(values1: number[], values2: number[], alternative?: string): Promise<StatisticalTestResult> {
    return this.hypothesisService.pairedTTest(values1, values2, alternative)
  }

  async correlation(x: number[], y: number[], method?: string): Promise<CorrelationResult> {
    return this.hypothesisService.correlation(x, y, method)
  }

  async partialCorrelation(data: number[][], xCol: number, yCol: number, controlCols: number[]): Promise<CorrelationResult> {
    return this.hypothesisService.partialCorrelation(data, xCol, yCol, controlCols)
  }

  async oneSampleProportionTest(successes: number, n: number, targetProportion?: number, alternative?: string): Promise<StatisticalTestResult> {
    return this.hypothesisService.oneSampleProportionTest(successes, n, targetProportion, alternative)
  }

  async calculateCorrelation(columnsData: Record<string, number[]>, method?: string): Promise<any> {
    return this.hypothesisService.calculateCorrelation(columnsData, method)
  }

  // =================
  // ANOVA 및 사후검정
  // =================

  async oneWayANOVA(groups: number[][]): Promise<ANOVAResult> {
    return this.anovaService.oneWayANOVA(groups)
  }

  async twoWayANOVA(data: number[][], factor1: string[], factor2: string[]): Promise<ANOVAResult> {
    return this.anovaService.twoWayANOVA(data, factor1, factor2)
  }

  async repeatedMeasuresANOVA(data: number[][]): Promise<ANOVAResult> {
    return this.anovaService.repeatedMeasuresANOVA(data)
  }

  async manova(dependentVars: number[][], groups: string[]): Promise<MANOVAResult> {
    return this.anovaService.manova(dependentVars, groups)
  }

  async tukeyHSD(groups: number[][], groupNames?: string[], alpha?: number): Promise<TukeyHSDResult> {
    return this.anovaService.tukeyHSD(groups, groupNames, alpha)
  }

  async gamesHowell(groups: number[][], groupNames?: string[], alpha?: number): Promise<TukeyHSDResult> {
    return this.anovaService.gamesHowell(groups, groupNames, alpha)
  }

  async bonferroni(groups: number[][], groupNames?: string[], alpha?: number): Promise<TukeyHSDResult> {
    return this.anovaService.bonferroni(groups, groupNames, alpha)
  }

  async performBonferroni(groups: number[][], groupNames: string[], alpha?: number): Promise<TukeyHSDResult> {
    return this.anovaService.bonferroni(groups, groupNames, alpha)
  }

  async gamesHowellTest(groups: number[][], groupNames?: string[], alpha?: number): Promise<TukeyHSDResult> {
    return this.anovaService.gamesHowell(groups, groupNames, alpha)
  }

  // =================
  // 회귀분석 메서드들
  // =================

  async simpleRegression(xValues: number[], yValues: number[]): Promise<RegressionResult> {
    return this.regressionService.simpleRegression(xValues, yValues)
  }

  async simpleLinearRegression(xValues: number[], yValues: number[]): Promise<RegressionResult> {
    return this.regressionService.simpleRegression(xValues, yValues)
  }

  async multipleRegression(xMatrix: number[][], yValues: number[], variableNames?: string[]): Promise<RegressionResult> {
    return this.regressionService.multipleRegression(xMatrix, yValues, variableNames)
  }

  async logisticRegression(xMatrix: number[][], yValues: number[], variableNames?: string[]): Promise<RegressionResult> {
    return this.regressionService.logisticRegression(xMatrix, yValues, variableNames)
  }

  // =================
  // 비모수 검정 메서드들
  // =================

  async mannWhitneyU(group1: number[], group2: number[], alternative?: string): Promise<StatisticalTestResult> {
    return this.nonparametricService.mannWhitneyU(group1, group2, alternative)
  }

  async wilcoxonSignedRank(values1: number[], values2: number[], alternative?: string): Promise<StatisticalTestResult> {
    return this.nonparametricService.wilcoxonSignedRank(values1, values2, alternative)
  }

  async kruskalWallis(groups: number[][]): Promise<StatisticalTestResult> {
    return this.nonparametricService.kruskalWallis(groups)
  }

  async friedman(data: number[][]): Promise<StatisticalTestResult> {
    return this.nonparametricService.friedman(data)
  }

  async friedmanTest(data: number[][]): Promise<StatisticalTestResult> {
    return this.nonparametricService.friedman(data)
  }

  async chiSquareTest(observedMatrix: number[][], correction?: boolean): Promise<StatisticalTestResult> {
    return this.nonparametricService.chiSquareTest(observedMatrix, correction)
  }

  async dunnTest(groups: number[][], groupNames?: string[], alpha?: number): Promise<any> {
    return this.nonparametricService.dunnTest(groups, groupNames, alpha)
  }

  // 기존 API 호환성 메서드들
  async wilcoxon(group1: number[], group2: number[]): Promise<{ statistic: number; pvalue: number }> {
    const result = await this.nonparametricService.wilcoxonSignedRank(group1, group2)
    return { statistic: result.statistic, pvalue: result.pValue }
  }

  async chiSquare(contingencyTable: number[][]): Promise<{ statistic: number; pvalue: number; df: number }> {
    const result = await this.nonparametricService.chiSquareTest(contingencyTable)
    return { statistic: result.statistic, pvalue: result.pValue, df: result.df || 0 }
  }

  // =================
  // 고급 분석 메서드들
  // =================

  async pca(dataMatrix: number[][], columns?: string[], nComponents?: number, standardize?: boolean): Promise<PCAResult> {
    return this.advancedService.pca(dataMatrix, columns, nComponents, standardize)
  }

  async performPCA(dataMatrix: number[][], columns: string[], nComponents?: number, standardize?: boolean): Promise<PCAResult> {
    return this.advancedService.pca(dataMatrix, columns, nComponents, standardize)
  }

  async clustering(data: number[][], nClusters: number, method?: string): Promise<ClusteringResult> {
    return this.advancedService.clustering(data, nClusters, method)
  }

  async kMeansClustering(data: number[][], nClusters: number): Promise<ClusteringResult> {
    return this.advancedService.clustering(data, nClusters, 'kmeans')
  }

  async timeSeriesDecomposition(data: number[], period?: number): Promise<TimeSeriesResult> {
    return this.advancedService.timeSeriesDecomposition(data, period)
  }

  async cronbachAlpha(items: number[][]): Promise<{ alpha: number; itemTotalCorrelations: number[]; alphaIfDeleted: number[]; nItems: number; nObservations: number }> {
    return this.advancedService.cronbachAlpha(items)
  }

  async arimaForecast(data: number[], p: number, d: number, q: number, steps: number): Promise<TimeSeriesResult> {
    return this.advancedService.arimaForecast(data, p, d, q, steps)
  }

  async kaplanMeierSurvival(times: number[], events: number[]): Promise<SurvivalResult> {
    return this.advancedService.kaplanMeierSurvival(times, events)
  }

  // =================
  // 기존 내부 메서드들 (호환성)
  // =================

  async tTest(group1: number[], group2: number[], options: any = {}): Promise<any> {
    if (options.type === 'one-sample') {
      return this.oneSampleTTest(group1, options.mu || 0, options.alternative)
    } else if (options.paired || options.type === 'paired') {
      return this.pairedTTest(group1, group2, options.alternative)
    } else {
      return this.twoSampleTTest(group1, group2, options.equal_var !== false)
    }
  }

  async anova(groups: number[][], options: any = {}): Promise<any> {
    return this.oneWayANOVA(groups)
  }

  async regression(x: number[], y: number[], options: any = {}): Promise<any> {
    const result = await this.simpleRegression(x, y)
    return {
      slope: result.slope,
      intercept: result.intercept,
      rSquared: result.rSquared,
      pvalue: result.pValues?.[1] || 0,
      fStatistic: result.fStatistic,
      tStatistic: result.tStatistics?.[1] || 0,
      predictions: result.fitted,
      df: result.degreesOfFreedom
    }
  }

  // =================
  // 통합 가정 검정 메서드
  // =================

  async checkAllAssumptions(data: any, options: { alpha?: number; normalityRule?: string } = {}): Promise<any> {
    const { alpha = 0.05, normalityRule = 'shapiro' } = options
    const results: any = {
      normality: {},
      homogeneity: null,
      outliers: {},
      summary: {
        canUseParametric: true,
        violations: []
      }
    }

    try {
      // 데이터 구조 파악 (단일 열 또는 여러 열)
      let columns: any[] = []
      if (Array.isArray(data) && data.length > 0) {
        if (typeof data[0] === 'object' && !Array.isArray(data[0])) {
          // 객체 배열인 경우 (DataRow[])
          const keys = Object.keys(data[0])
          for (const key of keys) {
            const values = data.map((row: any) => row[key]).filter((v: any) => typeof v === 'number' && !isNaN(v))
            if (values.length > 0) {
              columns.push({ name: key, values })
            }
          }
        } else if (typeof data[0] === 'number') {
          // 단일 숫자 배열
          columns.push({ name: 'data', values: data })
        } else if (Array.isArray(data[0])) {
          // 2차원 배열 (여러 그룹)
          data.forEach((group: any[], idx: number) => {
            columns.push({ name: `group${idx + 1}`, values: group })
          })
        }
      }

      // 1. 정규성 검정
      for (const col of columns) {
        if (col.values.length >= 3) {
          const normalityTest = await this.shapiroWilk(col.values)
          results.normality[col.name] = {
            ...normalityTest,
            summary: {
              isNormal: normalityTest.pValue > alpha,
              method: 'Shapiro-Wilk'
            }
          }

          if (normalityTest.pValue <= alpha) {
            results.summary.canUseParametric = false
            if (!results.summary.violations.includes('정규성 위반')) {
              results.summary.violations.push('정규성 위반')
            }
          }
        }
      }

      // 2. 등분산성 검정 (그룹이 2개 이상일 때)
      if (columns.length >= 2) {
        const groups = columns.map(col => col.values)
        const homogeneityTest = await this.leveneTest(groups)
        results.homogeneity = homogeneityTest

        if (homogeneityTest.pValue <= alpha) {
          results.summary.canUseParametric = false
          if (!results.summary.violations.includes('등분산성 위반')) {
            results.summary.violations.push('등분산성 위반')
          }
        }
      }

      // 3. 이상치 검정
      for (const col of columns) {
        if (col.values.length >= 4) {
          const outlierTest = await this.detectOutliers(col.values)
          results.outliers[col.name] = outlierTest

          if (outlierTest.outliers.length > col.values.length * 0.1) {
            if (!results.summary.violations.includes('이상치 과다')) {
              results.summary.violations.push('이상치 과다')
            }
          }
        }
      }

      // 4. 표본 크기 확인
      const minSampleSize = Math.min(...columns.map(col => col.values.length))
      if (minSampleSize < 30) {
        if (!results.summary.violations.includes('표본 크기 부족')) {
          results.summary.violations.push('표본 크기 부족')
        }
      }

      return results
    } catch (error) {
      console.error('Error in checkAllAssumptions:', error)
      return {
        ...results,
        error: error instanceof Error ? error.message : '가정 검정 중 오류 발생'
      }
    }
  }

  // =================
  // 상태 관리 메서드들
  // =================

  isInitialized(): boolean {
    return this.descriptiveService.isInitialized()
  }

  dispose(): void {
    this.descriptiveService.dispose()
    this.hypothesisService.dispose()
    this.anovaService.dispose()
    this.regressionService.dispose()
    this.nonparametricService.dispose()
    this.advancedService.dispose()
  }
}

// 기본 export
export default PyodideStatisticsService

// 타입들도 re-export
export type {
  DescriptiveStatsResult,
  NormalityTestResult,
  HomogeneityTestResult,
  OutlierResult,
  StatisticalTestResult,
  CorrelationResult,
  ANOVAResult,
  TukeyHSDResult,
  RegressionResult,
  PCAResult,
  ClusteringResult,
  TimeSeriesResult
}

// 개별 서비스들도 export (필요한 경우)
export {
  DescriptiveService,
  HypothesisService,
  ANOVAService,
  RegressionService,
  NonparametricService,
  AdvancedService
}