/**
 * 통계 분석 실행 매핑 서비스
 * 29개 통계 메서드를 실제 Pyodide 함수와 연결
 */

import { pyodideStats } from './pyodide-statistics'
import { StatisticalMethod } from '../statistics/method-mapping'
import { logger } from '../utils/logger'

export interface AnalysisResult {
  // 메타 정보
  metadata: {
    method: string
    methodName: string
    timestamp: string
    duration: number
    dataInfo: {
      totalN: number
      missingRemoved: number
      groups?: number
    }
  }

  // 주 결과
  mainResults: {
    statistic: number
    pvalue: number
    df?: number
    significant: boolean
    interpretation?: string
  }

  // 부가 정보
  additionalInfo: {
    effectSize?: {
      type: string
      value: number
      interpretation: string
    }
    confidenceInterval?: {
      level: number
      lower: number
      upper: number
    }
    assumptions?: {
      passed: boolean
      details: any[]
    }
    postHoc?: any
  }

  // 시각화용 데이터
  visualizationData?: {
    type: string
    data: any
  }

  // 원시 결과 (디버깅용)
  rawResults?: any
}

export class StatisticalExecutor {
  private static instance: StatisticalExecutor
  private startTime: number = 0

  static getInstance(): StatisticalExecutor {
    if (!this.instance) {
      this.instance = new StatisticalExecutor()
    }
    return this.instance
  }

  /**
   * 선택된 통계 메서드 실행
   */
  async executeMethod(
    method: StatisticalMethod,
    data: any,
    variables: {
      dependent?: string[]
      independent?: string[]
      group?: string
      time?: string
      // 고급 변수 역할
      covariate?: string | string[]
      within?: string[]
      between?: string[]
      blocking?: string | string[]
      event?: string
      censoring?: string
      weight?: string
    }
  ): Promise<AnalysisResult> {
    this.startTime = Date.now()
    logger.info(`통계 분석 시작: ${method.name}`, { methodId: method.id })

    try {
      // 데이터 준비
      const preparedData = this.prepareData(data, variables, method)

      // 메서드별 실행
      let result: AnalysisResult

      switch (method.category) {
        case 'descriptive':
          result = await this.executeDescriptive(method, preparedData)
          break
        case 't-test':
          result = await this.executeTTest(method, preparedData)
          break
        case 'anova':
          result = await this.executeANOVA(method, preparedData)
          break
        case 'regression':
          result = await this.executeRegression(method, preparedData)
          break
        case 'correlation':
          result = await this.executeCorrelation(method, preparedData)
          break
        case 'nonparametric':
          result = await this.executeNonparametric(method, preparedData)
          break
        case 'chi-square':
          result = await this.executeChiSquare(method, preparedData)
          break
        case 'multivariate':
          result = await this.executeMultivariate(method, preparedData)
          break
        case 'time-series':
          result = await this.executeTimeSeries(method, preparedData)
          break
        case 'reliability':
          result = await this.executeReliability(method, preparedData)
          break
        default:
          throw new Error(`지원되지 않는 분석 카테고리: ${method.category}`)
      }

      // 메타데이터 추가
      result.metadata.duration = (Date.now() - this.startTime) / 1000
      result.metadata.timestamp = new Date().toISOString()

      logger.info(`통계 분석 완료: ${method.name}`, {
        duration: result.metadata.duration,
        significant: result.mainResults.significant
      })

      return result
    } catch (error) {
      logger.error('통계 분석 실행 오류', error)
      throw error
    }
  }

  /**
   * 데이터 준비
   */
  private prepareData(
    data: any[],
    variables: any,
    method: StatisticalMethod
  ): any {
    // 변수 추출
    const prepared: any = {
      data: data,
      variables: variables,
      arrays: {}
    }

    // 종속변수 추출
    if (variables.dependent && variables.dependent.length > 0) {
      prepared.arrays.dependent = data.map(row =>
        Number(row[variables.dependent[0]])
      ).filter(v => !isNaN(v))
    }

    // 독립변수 추출
    if (variables.independent && variables.independent.length > 0) {
      prepared.arrays.independent = variables.independent.map((col: string) =>
        data.map(row => Number(row[col])).filter(v => !isNaN(v))
      )
    }

    // 그룹변수로 데이터 분할
    if (variables.group) {
      const groups = [...new Set(data.map(row => row[variables.group]))]
      prepared.groups = groups
      prepared.arrays.byGroup = {}

      groups.forEach(group => {
        prepared.arrays.byGroup[group] = data
          .filter(row => row[variables.group] === group)
          .map(row => {
            const val = variables.dependent ?
              Number(row[variables.dependent[0]]) :
              Object.values(row).find(v => !isNaN(Number(v)))
            return typeof val === 'number' ? val : Number(val)
          })
          .filter((v: number) => !isNaN(v))
      })
    }

    // 고급 변수 역할 처리
    // 공변량 (ANCOVA 등)
    if (variables.covariate) {
      const covariates = Array.isArray(variables.covariate)
        ? variables.covariate
        : [variables.covariate]
      prepared.arrays.covariate = covariates.map((col: string) =>
        data.map(row => Number(row[col])).filter(v => !isNaN(v))
      )
    }

    // Within-subject 요인 (반복측정)
    if (variables.within && variables.within.length > 0) {
      prepared.arrays.within = variables.within.map((col: string) =>
        data.map(row => Number(row[col])).filter(v => !isNaN(v))
      )
      prepared.withinFactors = variables.within
    }

    // Between-subject 요인 (혼합모형)
    if (variables.between && variables.between.length > 0) {
      prepared.arrays.between = variables.between.map((col: string) =>
        data.map(row => row[col])
      )
      prepared.betweenFactors = variables.between
    }

    // 블록 변수 (블록설계)
    if (variables.blocking) {
      const blocking = Array.isArray(variables.blocking)
        ? variables.blocking
        : [variables.blocking]
      prepared.arrays.blocking = blocking.map((col: string) =>
        data.map(row => row[col])
      )
    }

    // 사건 변수 (생존분석)
    if (variables.event) {
      prepared.arrays.event = data.map(row =>
        Number(row[variables.event])
      ).filter(v => !isNaN(v))
    }

    // 중도절단 변수 (생존분석)
    if (variables.censoring) {
      prepared.arrays.censoring = data.map(row =>
        Number(row[variables.censoring])
      ).filter(v => !isNaN(v))
    }

    // 가중치 변수
    if (variables.weight) {
      prepared.arrays.weight = data.map(row =>
        Number(row[variables.weight])
      ).filter(v => !isNaN(v))
    }

    prepared.totalN = data.length
    prepared.missingRemoved = 0 // TODO: 실제 결측값 계산

    return prepared
  }

  /**
   * 기술통계 실행
   */
  private async executeDescriptive(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    const values = data.arrays.dependent || data.arrays.independent?.[0] || []
    const stats = await pyodideStats.descriptiveStats(values)

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: values.length,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: stats.mean,
        pvalue: 1, // 기술통계는 p-value 없음
        significant: false,
        interpretation: `평균: ${stats.mean.toFixed(2)}, 표준편차: ${stats.std.toFixed(2)}`
      },
      additionalInfo: {
        confidenceInterval: {
          level: 0.95,
          lower: stats.mean - 1.96 * stats.std / Math.sqrt(values.length),
          upper: stats.mean + 1.96 * stats.std / Math.sqrt(values.length)
        }
      },
      visualizationData: {
        type: 'histogram',
        data: { values, stats }
      },
      rawResults: stats
    }
  }

  /**
   * t-검정 실행
   */
  private async executeTTest(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    let group1: number[], group2: number[]

    // 그룹 데이터 준비
    if (data.arrays.byGroup) {
      const groups = Object.values(data.arrays.byGroup) as number[][]
      group1 = groups[0] || []
      group2 = groups[1] || []
    } else if (data.arrays.independent) {
      group1 = data.arrays.dependent || []
      group2 = data.arrays.independent[0] || []
    } else {
      throw new Error('t-검정을 위한 두 그룹 데이터가 필요합니다')
    }

    // Pyodide로 t-검정 실행
    // Welch t-검정: equalVar = false, 일반 t-검정: equalVar = true
    const isWelch = method.id === 'welch-t'
    const result = await pyodideStats.tTest(group1, group2, {
      paired: method.id === 'paired-t',
      equalVar: !isWelch // Welch t-검정은 등분산 가정하지 않음
    })

    // 효과크기 계산 (Cohen's d)
    const cohensD = await this.calculateCohensD(group1, group2)

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: group1.length + group2.length,
          missingRemoved: 0,
          groups: 2
        }
      },
      mainResults: {
        statistic: result.statistic,
        pvalue: result.pvalue,
        df: result.df,
        significant: result.pvalue < 0.05,
        interpretation: result.pvalue < 0.05 ?
          '두 그룹 간 유의한 차이가 있습니다' :
          '두 그룹 간 유의한 차이가 없습니다'
      },
      additionalInfo: {
        effectSize: {
          type: "Cohen's d",
          value: cohensD,
          interpretation: this.interpretCohensD(cohensD)
        },
        confidenceInterval: result.confidenceInterval ? {
          ...result.confidenceInterval,
          level: 95
        } : undefined
      },
      visualizationData: {
        type: 'boxplot',
        data: {
          group1: { values: group1, label: 'Group 1' },
          group2: { values: group2, label: 'Group 2' }
        }
      },
      rawResults: result
    }
  }

  /**
   * ANOVA 실행
   */
  private async executeANOVA(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    const byGroup = data.arrays.byGroup || {}
    const groupNames = Object.keys(byGroup)
    const groups = Object.values(byGroup) as number[][]

    if (groups.length < 2) {
      throw new Error('ANOVA를 위해 최소 2개 그룹이 필요합니다')
    }

    // Games-Howell 직접 호출 (사후검정만)
    if (method.id === 'games-howell') {
      const ghResult = await pyodideStats.gamesHowellTest(groups, groupNames)
      const significantCount = ghResult.significant_count || 0

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: groups.reduce((sum, g) => sum + g.length, 0),
            missingRemoved: 0,
            groups: groups.length
          }
        },
        mainResults: {
          statistic: significantCount,
          pvalue: ghResult.comparisons?.[0]?.pValue || 1,
          df: 0,
          significant: significantCount > 0,
          interpretation: significantCount > 0 ?
            `${significantCount}개의 유의한 차이가 발견되었습니다` :
            '유의한 차이가 없습니다'
        },
        additionalInfo: {
          postHoc: ghResult
        },
        visualizationData: {
          type: 'boxplot-multiple',
          data: groups.map((g, i) => ({
            values: g,
            label: groupNames[i] || `Group ${i + 1}`
          }))
        },
        rawResults: ghResult
      }
    }

    // ANCOVA: 공변량이 있는 경우
    if (method.id === 'ancova' && data.arrays.covariate && data.arrays.covariate.length > 0) {
      const yValues = data.arrays.dependent || groups.flat()
      const groupValues = data.raw.map((row: Record<string, unknown>) =>
        row[data.variables.groupVar as string]
      ).filter((v: unknown) => v != null) as (string | number)[]
      const covariates = data.arrays.covariate as number[][]

      const ancovaResult = await pyodideStats.ancovaWorker(yValues, groupValues, covariates)

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: yValues.length,
            missingRemoved: 0,
            groups: groups.length
          }
        },
        mainResults: {
          statistic: ancovaResult.fStatistic,
          pvalue: ancovaResult.pValue,
          df: 0,
          significant: ancovaResult.pValue < 0.05,
          interpretation: ancovaResult.pValue < 0.05 ?
            `공변량 통제 후 그룹 간 유의한 차이가 있습니다 (F=${ancovaResult.fStatistic.toFixed(2)})` :
            '공변량 통제 후 그룹 간 유의한 차이가 없습니다'
        },
        additionalInfo: {},
        visualizationData: {
          type: 'boxplot-multiple',
          data: groups.map((g, i) => ({
            values: g,
            label: groupNames[i] || `Group ${i + 1}`
          }))
        },
        rawResults: {
          ...ancovaResult,
          covariatesCount: covariates.length
        }
      }
    }

    // 반복측정 ANOVA: within 요인이 있는 경우
    if (method.id === 'repeated-measures-anova' && data.arrays.within && data.arrays.within.length > 0) {
      const dataMatrix = data.arrays.within as number[][]
      const nSubjects = dataMatrix[0]?.length || 0
      const subjectIds = Array.from({ length: nSubjects }, (_, i) => `S${i + 1}`)
      const timeLabels = data.withinFactors || dataMatrix.map((_, i) => `T${i + 1}`)

      const rmResult = await pyodideStats.repeatedMeasuresAnovaWorker(
        dataMatrix,
        subjectIds,
        timeLabels
      )

      // df 처리: { between, within } 객체에서 값 추출
      const dfValue = typeof rmResult.df === 'object' && rmResult.df !== null
        ? rmResult.df.within || rmResult.df.between || 0
        : rmResult.df

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: nSubjects * dataMatrix.length,
            missingRemoved: 0,
            groups: dataMatrix.length
          }
        },
        mainResults: {
          statistic: rmResult.fStatistic,
          pvalue: rmResult.pValue,
          df: dfValue,
          significant: rmResult.pValue < 0.05,
          interpretation: rmResult.pValue < 0.05 ?
            `시간에 따른 유의한 변화가 있습니다 (F=${rmResult.fStatistic.toFixed(2)})` :
            '시간에 따른 유의한 변화가 없습니다'
        },
        additionalInfo: {},
        visualizationData: {
          type: 'line',
          data: {
            labels: timeLabels,
            means: dataMatrix.map(col =>
              col.reduce((a, b) => a + b, 0) / col.length
            )
          }
        },
        rawResults: {
          ...rmResult,
          subjects: nSubjects,
          timePoints: dataMatrix.length
        }
      }
    }

    const result = await pyodideStats.anova(groups, {
      type: method.id === 'two-way-anova' ? 'two-way' : 'one-way'
    })

    // 유의한 경우 사후검정
    // Games-Howell: 이분산 가정 (등분산 가정 불필요) - 더 robust
    // Tukey HSD: 등분산 가정
    let postHoc = null
    if (result.pValue < 0.05 && groups.length > 2) {
      // Games-Howell 사용 (이분산에 robust)
      postHoc = await pyodideStats.gamesHowellTest(groups, groupNames)
    }

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: groups.reduce((sum, g) => sum + g.length, 0),
          missingRemoved: 0,
          groups: groups.length
        }
      },
      mainResults: {
        statistic: result.fStatistic,
        pvalue: result.pValue,
        df: Array.isArray(result.df) ? result.df[0] : result.df,
        significant: result.pValue < 0.05,
        interpretation: result.pValue < 0.05 ?
          `그룹 간 유의한 차이가 있습니다 (F=${result.fStatistic.toFixed(2)})` :
          '그룹 간 유의한 차이가 없습니다'
      },
      additionalInfo: {
        effectSize: {
          type: 'eta-squared',
          value: result.etaSquared || 0,
          interpretation: this.interpretEtaSquared(result.etaSquared || 0)
        },
        postHoc: postHoc
      },
      visualizationData: {
        type: 'boxplot-multiple',
        data: groups.map((g, i) => ({
          values: g,
          label: groupNames[i] || `Group ${i + 1}`
        }))
      },
      rawResults: result
    }
  }

  /**
   * 회귀분석 실행
   */
  private async executeRegression(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    const dependent = data.arrays.dependent
    const independent = data.arrays.independent?.[0]

    if (!dependent || !independent) {
      throw new Error('회귀분석을 위한 종속변수와 독립변수가 필요합니다')
    }

    const result = await pyodideStats.regression(independent, dependent, {
      type: method.id === 'multiple-regression' ? 'multiple' : 'simple'
    })

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: dependent.length,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: result.fStatistic ?? result.tStatistic ?? 0,
        pvalue: result.pvalue,
        df: result.df,
        significant: result.pvalue < 0.05,
        interpretation: `R² = ${result.rSquared.toFixed(3)}, 회귀식이 ${result.pvalue < 0.05 ? '유의합니다' : '유의하지 않습니다'}`
      },
      additionalInfo: {
        effectSize: {
          type: 'R-squared',
          value: result.rSquared,
          interpretation: this.interpretRSquared(result.rSquared)
        }
      },
      visualizationData: {
        type: 'scatter-regression',
        data: {
          x: independent,
          y: dependent,
          regression: result.predictions
        }
      },
      rawResults: result
    }
  }

  /**
   * 상관분석 실행
   */
  private async executeCorrelation(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    const var1 = data.arrays.dependent || data.arrays.independent?.[0]
    const var2 = data.arrays.independent?.[1] || data.arrays.independent?.[0]

    if (!var1 || !var2) {
      throw new Error('상관분석을 위한 두 변수가 필요합니다')
    }

    const result = await pyodideStats.correlation(var1, var2)
    const methodType = method.id === 'spearman' ? 'spearman' : 'pearson'
    const selectedResult = result[methodType as keyof typeof result]

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: var1.length,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: selectedResult.r,
        pvalue: selectedResult.pValue,
        significant: selectedResult.pValue < 0.05,
        interpretation: `상관계수 = ${selectedResult.r.toFixed(3)} (${this.interpretCorrelation(selectedResult.r)})`
      },
      additionalInfo: {
        postHoc: {
          pearson: result.pearson,
          spearman: result.spearman,
          kendall: result.kendall
        }
      },
      visualizationData: {
        type: 'scatter',
        data: {
          x: var1,
          y: var2
        }
      },
      rawResults: result
    }
  }

  /**
   * 비모수 검정 실행
   */
  private async executeNonparametric(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    let result: any

    switch (method.id) {
      case 'mann-whitney':
        const groups = Object.values(data.arrays.byGroup || {}) as number[][]
        result = await pyodideStats.mannWhitneyU(groups[0], groups[1])
        break
      case 'wilcoxon':
        result = await pyodideStats.wilcoxon(
          data.arrays.dependent,
          data.arrays.independent?.[0]
        )
        break
      case 'kruskal-wallis':
        const allGroups = Object.values(data.arrays.byGroup || {}) as number[][]
        result = await pyodideStats.kruskalWallis(allGroups)
        break
      case 'friedman':
        result = await pyodideStats.friedman(data.arrays.independent || [])
        break
      case 'chi-square':
        result = await pyodideStats.chiSquare(data.data)
        break
      default:
        throw new Error(`지원되지 않는 비모수 검정: ${method.id}`)
    }

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: data.totalN,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: result.statistic,
        pvalue: result.pvalue,
        df: result.df,
        significant: result.pvalue < 0.05,
        interpretation: result.pvalue < 0.05 ?
          '그룹 간 유의한 차이가 있습니다 (비모수)' :
          '그룹 간 유의한 차이가 없습니다'
      },
      additionalInfo: {},
      visualizationData: {
        type: 'boxplot',
        data: data.arrays.byGroup
      },
      rawResults: result
    }
  }

  /**
   * 다변량 분석 실행
   */
  private async executeMultivariate(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    let result: any

    switch (method.id) {
      case 'pca':
        result = await pyodideStats.pca(data.arrays.independent || [])
        break
      case 'factor-analysis':
        result = await pyodideStats.factorAnalysis(data.arrays.independent || [])
        break
      case 'cluster-analysis':
        result = await pyodideStats.clusterAnalysis(data.arrays.independent || [])
        break
      default:
        throw new Error(`지원되지 않는 다변량 분석: ${method.id}`)
    }

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: data.totalN,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: result.explainedVariance?.[0] || 0,
        pvalue: 1, // 다변량 분석은 p-value 없음
        significant: false,
        interpretation: method.id === 'pca' ?
          `첫 주성분이 전체 분산의 ${(result.explainedVariance[0] * 100).toFixed(1)}% 설명` :
          '분석 완료'
      },
      additionalInfo: {
        effectSize: {
          type: 'Explained Variance',
          value: result.totalExplainedVariance || 0,
          interpretation: `총 ${(result.totalExplainedVariance * 100).toFixed(1)}% 분산 설명`
        }
      },
      visualizationData: {
        type: method.id === 'pca' ? 'scree-plot' : 'dendrogram',
        data: result
      },
      rawResults: result
    }
  }

  /**
   * 시계열 분석 실행
   */
  private async executeTimeSeries(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    const timeData = data.arrays.dependent || []
    const validMethods: ('decomposition' | 'arima' | 'exponential')[] = ['decomposition', 'arima', 'exponential']
    const methodId = validMethods.includes(method.id as any) ? (method.id as 'decomposition' | 'arima' | 'exponential') : 'decomposition'
    const result = await pyodideStats.timeSeriesAnalysis(timeData, {
      method: methodId
    })

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: timeData.length,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: Array.isArray(result.trend) ? result.trend[0] : (result.trend || 0),
        pvalue: 1, // Time series doesn't have p-value
        significant: false,
        interpretation: '시계열 분석 완료'
      },
      additionalInfo: {},
      visualizationData: {
        type: 'time-series',
        data: {
          values: timeData,
          trend: result.trend,
          seasonal: result.seasonal
        }
      },
      rawResults: result
    }
  }

  /**
   * 신뢰도 분석 실행
   */
  private async executeReliability(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    const items = data.arrays.independent || []
    const result = await pyodideStats.cronbachAlpha(items)

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: items[0]?.length || 0,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: result.alpha,
        pvalue: 1, // 신뢰도 분석은 p-value 없음
        significant: result.alpha > 0.7,
        interpretation: `Cronbach's α = ${result.alpha.toFixed(3)} (${this.interpretCronbachAlpha(result.alpha)})`
      },
      additionalInfo: {},
      visualizationData: {
        type: 'item-total',
        data: result.itemTotalCorrelations
      },
      rawResults: result
    }
  }

  /**
   * 카이제곱 검정 실행
   */
  private async executeChiSquare(
    method: StatisticalMethod,
    data: any
  ): Promise<AnalysisResult> {
    const result = await pyodideStats.chiSquare(data.data) as {
      statistic: number
      pvalue: number
      df: number
      cramersV?: number
      contingencyTable?: number[][]
    }

    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: '',
        duration: 0,
        dataInfo: {
          totalN: data.totalN,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: result.statistic,
        pvalue: result.pvalue,
        df: result.df,
        significant: result.pvalue < 0.05,
        interpretation: result.pvalue < 0.05 ?
          '변수 간 유의한 연관성이 있습니다' :
          '변수 간 유의한 연관성이 없습니다'
      },
      additionalInfo: {
        effectSize: result.cramersV ? {
          type: "Cramer's V",
          value: result.cramersV,
          interpretation: this.interpretCramersV(result.cramersV)
        } : undefined
      },
      visualizationData: {
        type: 'contingency-table',
        data: result.contingencyTable
      },
      rawResults: result
    }
  }

  /**
   * Cohen's d 계산
   */
  private async calculateCohensD(group1: number[], group2: number[]): Promise<number> {
    const mean1 = group1.reduce((a, b) => a + b, 0) / group1.length
    const mean2 = group2.reduce((a, b) => a + b, 0) / group2.length

    const var1 = group1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0) / (group1.length - 1)
    const var2 = group2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0) / (group2.length - 1)

    const pooledSD = Math.sqrt(((group1.length - 1) * var1 + (group2.length - 1) * var2) /
                               (group1.length + group2.length - 2))

    return Math.abs(mean1 - mean2) / pooledSD
  }

  /**
   * 효과크기 해석
   */
  private interpretCohensD(d: number): string {
    if (d < 0.2) return '매우 작음'
    if (d < 0.5) return '작음'
    if (d < 0.8) return '중간'
    return '큼'
  }

  private interpretEtaSquared(eta: number): string {
    if (eta < 0.01) return '매우 작음'
    if (eta < 0.06) return '작음'
    if (eta < 0.14) return '중간'
    return '큼'
  }

  private interpretRSquared(r2: number): string {
    if (r2 < 0.1) return '매우 약함'
    if (r2 < 0.3) return '약함'
    if (r2 < 0.5) return '중간'
    if (r2 < 0.7) return '강함'
    return '매우 강함'
  }

  private interpretCorrelation(r: number): string {
    const absR = Math.abs(r)
    let strength = ''

    if (absR < 0.3) strength = '약한'
    else if (absR < 0.7) strength = '중간'
    else strength = '강한'

    const direction = r > 0 ? '양의' : '음의'
    return `${direction} ${strength} 상관관계`
  }

  private interpretCronbachAlpha(alpha: number): string {
    if (alpha < 0.6) return '수용 불가'
    if (alpha < 0.7) return '의문'
    if (alpha < 0.8) return '수용 가능'
    if (alpha < 0.9) return '양호'
    return '우수'
  }

  private interpretCramersV(v: number): string {
    if (v < 0.1) return '매우 약함'
    if (v < 0.3) return '약함'
    if (v < 0.5) return '중간'
    return '강함'
  }
}