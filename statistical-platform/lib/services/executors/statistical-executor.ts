import { DescriptiveExecutor } from './descriptive-executor'
import { TTestExecutor } from './t-test-executor'
import { AnovaExecutor } from './anova-executor'
import { RegressionExecutor } from './regression-executor'
import { NonparametricExecutor } from './nonparametric-executor'
import { AdvancedExecutor } from './advanced-executor'
import { AnalysisResult } from './types'
import { StatisticalMethod } from '@/lib/statistics/method-mapping'
import { logger } from '@/lib/utils/logger'

/**
 * 통합 통계 실행자
 * 모든 통계 방법을 실행하는 중앙 컨트롤러
 */
export class StatisticalExecutor {
  private static instance: StatisticalExecutor | null = null

  // 카테고리별 실행자
  private descriptiveExecutor: DescriptiveExecutor
  private tTestExecutor: TTestExecutor
  private anovaExecutor: AnovaExecutor
  private regressionExecutor: RegressionExecutor
  private nonparametricExecutor: NonparametricExecutor
  private advancedExecutor: AdvancedExecutor

  private constructor() {
    this.descriptiveExecutor = new DescriptiveExecutor()
    this.tTestExecutor = new TTestExecutor()
    this.anovaExecutor = new AnovaExecutor()
    this.regressionExecutor = new RegressionExecutor()
    this.nonparametricExecutor = new NonparametricExecutor()
    this.advancedExecutor = new AdvancedExecutor()
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): StatisticalExecutor {
    if (!StatisticalExecutor.instance) {
      StatisticalExecutor.instance = new StatisticalExecutor()
    }
    return StatisticalExecutor.instance
  }

  /**
   * 통계 방법 실행
   */
  async executeMethod(
    method: StatisticalMethod,
    data: any[],
    variableMapping?: any
  ): Promise<AnalysisResult> {
    logger.info(`통계 분석 실행: ${method.name}`)

    try {
      // 카테고리별로 적절한 실행자 선택
      switch (method.category) {
        case '기술통계':
          return this.executeDescriptive(method, data, variableMapping)

        case 't-검정':
          return this.executeTTest(method, data, variableMapping)

        case '분산분석':
        case '사후검정':
          return this.executeAnova(method, data, variableMapping)

        case '상관/회귀':
          return this.executeRegression(method, data, variableMapping)

        case '비모수':
          return this.executeNonparametric(method, data, variableMapping)

        case '고급분석':
          return this.executeAdvanced(method, data, variableMapping)

        case '정규성검정':
        case '등분산검정':
          return this.executeAssumptionTest(method, data, variableMapping)

        default:
          throw new Error(`지원하지 않는 카테고리: ${method.category}`)
      }
    } catch (error) {
      logger.error(`통계 분석 실행 오류: ${method.name}`, error)
      throw error
    }
  }

  /**
   * 기술통계 실행
   */
  private async executeDescriptive(
    method: StatisticalMethod,
    data: any[],
    variableMapping?: any
  ): Promise<AnalysisResult> {
    switch (method.id) {
      case 'desc_basic':
        const numericCol = variableMapping?.variables?.[0] || 'value'
        const numericData = data.map(row => Number(row[numericCol]))
        return this.descriptiveExecutor.executeBasicStats(numericData)

      case 'desc_frequency':
        const categoricalCol = variableMapping?.variables?.[0] || 'category'
        const categoricalData = data.map(row => String(row[categoricalCol]))
        return this.descriptiveExecutor.executeFrequencyAnalysis(categoricalData)

      case 'desc_crosstab':
        const var1 = variableMapping?.variables?.[0] || 'var1'
        const var2 = variableMapping?.variables?.[1] || 'var2'
        return this.descriptiveExecutor.executeCrossTab(data, var1, var2)

      default:
        throw new Error(`Unknown descriptive method: ${method.id}`)
    }
  }

  /**
   * t-검정 실행
   */
  private async executeTTest(
    method: StatisticalMethod,
    data: any[],
    variableMapping?: any
  ): Promise<AnalysisResult> {
    switch (method.id) {
      case 't_one_sample':
        const values = this.extractNumericColumn(data, variableMapping?.dependent?.[0])
        const populationMean = variableMapping?.populationMean || 0
        return this.tTestExecutor.executeOneSample(values, populationMean)

      case 't_independent':
        const groups = this.extractGroupedData(data, variableMapping)
        if (groups.length !== 2) throw new Error('독립표본 t-검정은 정확히 2개 그룹이 필요합니다')
        return this.tTestExecutor.executeIndependent(groups[0], groups[1])

      case 't_paired':
        const before = this.extractNumericColumn(data, variableMapping?.dependent?.[0])
        const after = this.extractNumericColumn(data, variableMapping?.dependent?.[1])
        return this.tTestExecutor.executePaired(before, after)

      case 't_welch':
        const welchGroups = this.extractGroupedData(data, variableMapping)
        if (welchGroups.length !== 2) throw new Error('Welch t-검정은 정확히 2개 그룹이 필요합니다')
        return this.tTestExecutor.executeWelch(welchGroups[0], welchGroups[1])

      default:
        throw new Error(`Unknown t-test method: ${method.id}`)
    }
  }

  /**
   * 분산분석 실행
   */
  private async executeAnova(
    method: StatisticalMethod,
    data: any[],
    variableMapping?: any
  ): Promise<AnalysisResult> {
    switch (method.id) {
      case 'anova_one_way':
        const groups = this.extractGroupedData(data, variableMapping)
        return this.anovaExecutor.executeOneWay(groups)

      case 'anova_two_way':
        const factor1 = variableMapping?.independent?.[0] || 'factor1'
        const factor2 = variableMapping?.independent?.[1] || 'factor2'
        const dependent = variableMapping?.dependent?.[0] || 'value'
        return this.anovaExecutor.executeTwoWay(data, factor1, factor2, dependent)

      case 'anova_repeated':
        const repeatedData = this.extractRepeatedMeasures(data, variableMapping)
        return this.anovaExecutor.executeRepeatedMeasures(repeatedData)

      case 'post_tukey':
        const tukeyGroups = this.extractGroupedData(data, variableMapping)
        return this.anovaExecutor.executeTukeyHSD(tukeyGroups)

      case 'post_games_howell':
        const ghGroups = this.extractGroupedData(data, variableMapping)
        return this.anovaExecutor.executeGamesHowell(ghGroups)

      default:
        throw new Error(`Unknown ANOVA method: ${method.id}`)
    }
  }

  /**
   * 회귀분석 실행
   */
  private async executeRegression(
    method: StatisticalMethod,
    data: any[],
    variableMapping?: any
  ): Promise<AnalysisResult> {
    switch (method.id) {
      case 'reg_linear_simple':
        const x = this.extractNumericColumn(data, variableMapping?.independent?.[0])
        const y = this.extractNumericColumn(data, variableMapping?.dependent?.[0])
        return this.regressionExecutor.executeSimpleLinear(x, y)

      case 'reg_multiple':
        const X = this.extractMultipleColumns(data, variableMapping?.independent)
        const yMultiple = this.extractNumericColumn(data, variableMapping?.dependent?.[0])
        return this.regressionExecutor.executeMultiple(X, yMultiple)

      case 'reg_logistic':
        const XLogistic = this.extractMultipleColumns(data, variableMapping?.independent)
        const yLogistic = this.extractNumericColumn(data, variableMapping?.dependent?.[0])
        return this.regressionExecutor.executeLogistic(XLogistic, yLogistic)

      case 'reg_polynomial':
        const xPoly = this.extractNumericColumn(data, variableMapping?.independent?.[0])
        const yPoly = this.extractNumericColumn(data, variableMapping?.dependent?.[0])
        const degree = variableMapping?.degree || 2
        return this.regressionExecutor.executePolynomial(xPoly, yPoly, degree)

      default:
        throw new Error(`Unknown regression method: ${method.id}`)
    }
  }

  /**
   * 비모수 검정 실행
   */
  private async executeNonparametric(
    method: StatisticalMethod,
    data: any[],
    variableMapping?: any
  ): Promise<AnalysisResult> {
    switch (method.id) {
      case 'non_mann_whitney':
        const mwGroups = this.extractGroupedData(data, variableMapping)
        if (mwGroups.length !== 2) throw new Error('Mann-Whitney U 검정은 정확히 2개 그룹이 필요합니다')
        return this.nonparametricExecutor.executeMannWhitneyU(mwGroups[0], mwGroups[1])

      case 'non_wilcoxon':
        const wilcoxonX = this.extractNumericColumn(data, variableMapping?.dependent?.[0])
        const wilcoxonY = variableMapping?.dependent?.[1]
          ? this.extractNumericColumn(data, variableMapping.dependent[1])
          : undefined
        return this.nonparametricExecutor.executeWilcoxon(wilcoxonX, wilcoxonY)

      case 'non_kruskal':
        const kwGroups = this.extractGroupedData(data, variableMapping)
        return this.nonparametricExecutor.executeKruskalWallis(kwGroups)

      case 'non_friedman':
        const friedmanData = this.extractRepeatedMeasures(data, variableMapping)
        return this.nonparametricExecutor.executeFriedman(friedmanData)

      case 'post_dunn':
        const dunnGroups = this.extractGroupedData(data, variableMapping)
        return this.nonparametricExecutor.executeDunn(dunnGroups)

      default:
        throw new Error(`Unknown nonparametric method: ${method.id}`)
    }
  }

  /**
   * 고급 분석 실행
   */
  private async executeAdvanced(
    method: StatisticalMethod,
    data: any[],
    variableMapping?: any
  ): Promise<AnalysisResult> {
    switch (method.id) {
      case 'adv_pca':
        const pcaData = this.extractMultipleColumns(data, variableMapping?.variables)
        const nComponents = variableMapping?.nComponents || 2
        return this.advancedExecutor.executePCA(pcaData, nComponents)

      case 'adv_factor':
        const factorData = this.extractMultipleColumns(data, variableMapping?.variables)
        return this.advancedExecutor.executeFactorAnalysis(factorData, variableMapping)

      case 'adv_cluster':
        const clusterData = this.extractMultipleColumns(data, variableMapping?.variables)
        return this.advancedExecutor.executeClusterAnalysis(clusterData, variableMapping)

      case 'adv_time_series':
        const tsData = this.extractNumericColumn(data, variableMapping?.time)
        return this.advancedExecutor.executeTimeSeriesAnalysis(tsData, variableMapping)

      case 'adv_cronbach':
        const reliabilityData = this.extractMultipleColumns(data, variableMapping?.variables)
        return this.advancedExecutor.executeCronbachAlpha(reliabilityData)

      case 'adv_power':
        const { effectSize, sampleSize, alpha, testType } = variableMapping || {}
        return this.advancedExecutor.executePowerAnalysis(effectSize, sampleSize, alpha, testType)

      default:
        throw new Error(`Unknown advanced method: ${method.id}`)
    }
  }

  /**
   * 가정 검정 실행
   */
  private async executeAssumptionTest(
    method: StatisticalMethod,
    data: any[],
    variableMapping?: any
  ): Promise<AnalysisResult> {
    // 간단한 구현 - 실제로는 pyodideStats의 검정 메서드 사용
    return {
      metadata: {
        method: method.name,
        timestamp: new Date().toISOString(),
        duration: 0,
        dataSize: data.length,
      },
      mainResults: {
        statistic: 0,
        pvalue: 0.05,
        interpretation: '가정 검정 결과'
      },
      additionalInfo: {}
    }
  }

  /**
   * 헬퍼 메서드: 단일 숫자 컬럼 추출
   */
  private extractNumericColumn(data: any[], columnName?: string): number[] {
    if (!columnName && data.length > 0 && typeof data[0] === 'number') {
      return data as number[]
    }

    const col = columnName || Object.keys(data[0])[0]
    return data.map(row => Number(row[col]))
  }

  /**
   * 헬퍼 메서드: 여러 컬럼 추출
   */
  private extractMultipleColumns(data: any[], columnNames?: string[]): number[][] {
    if (!columnNames || columnNames.length === 0) {
      // 모든 숫자형 컬럼 추출
      const firstRow = data[0]
      columnNames = Object.keys(firstRow).filter(key =>
        typeof firstRow[key] === 'number'
      )
    }

    return data.map(row =>
      columnNames!.map((col: string) => Number(row[col]))
    )
  }

  /**
   * 헬퍼 메서드: 그룹화된 데이터 추출
   */
  private extractGroupedData(data: any[], variableMapping?: any): number[][] {
    const groupCol = variableMapping?.group || variableMapping?.independent?.[0]
    const valueCol = variableMapping?.dependent?.[0] || 'value'

    if (!groupCol) {
      throw new Error('그룹 변수가 지정되지 않았습니다')
    }

    const groups = new Map<string, number[]>()

    data.forEach(row => {
      const groupKey = String(row[groupCol])
      const value = Number(row[valueCol])

      if (!groups.has(groupKey)) {
        groups.set(groupKey, [])
      }
      groups.get(groupKey)!.push(value)
    })

    return Array.from(groups.values())
  }

  /**
   * 헬퍼 메서드: 반복측정 데이터 추출
   */
  private extractRepeatedMeasures(data: any[], variableMapping?: any): number[][] {
    const measureCols = variableMapping?.variables || variableMapping?.dependent

    if (!measureCols || measureCols.length === 0) {
      throw new Error('반복측정 변수가 지정되지 않았습니다')
    }

    return data.map(row =>
      measureCols.map((col: string) => Number(row[col]))
    )
  }
}