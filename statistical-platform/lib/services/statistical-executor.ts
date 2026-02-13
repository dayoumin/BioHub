/**
 * 통계 분석 실행 매핑 서비스
 * 29개 통계 메서드를 실제 Pyodide 함수와 연결
 */

import { pyodideStats } from './pyodide-statistics'
import { StatisticalMethod } from '../statistics/method-mapping'
import type { SuggestedSettings } from '@/types/smart-flow'
import { logger } from '../utils/logger'
import { CorrelationExecutor } from './executors/correlation-executor'

/**
 * PreparedData: prepareData() 메서드의 반환 타입
 * unknown[] 데이터를 분석 가능한 형태로 변환
 */
export interface PreparedData {
  data: Array<Record<string, unknown>>
  variables: Record<string, unknown>
  arrays: PreparedArrays
  totalN: number
  missingRemoved: number
  groups?: unknown[]
  withinFactors?: string[]
  betweenFactors?: string[]
}

/**
 * PreparedArrays: prepareData()에서 추출한 숫자 배열들
 */
export interface PreparedArrays {
  dependent?: number[]
  independent?: number[][]
  byGroup?: Record<string, number[]>
  group?: unknown[]
  covariate?: number[][]
  within?: number[][]
  between?: unknown[][]
  blocking?: unknown[][]
  event?: number[]
  censoring?: number[]
  weight?: number[]
  contingencyTable?: number[][]
}

/**
 * VisualizationData: 시각화용 데이터 구조
 */
export interface VisualizationData {
  type: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

/**
 * StatisticalExecutor 전용 분석 결과 인터페이스
 * (레거시 - 향후 ExecutorAnalysisResult로 통합 예정)
 *
 * 주의: types/smart-flow.ts의 AnalysisResult와는 다른 구조
 */
export interface StatisticalExecutorResult {
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
    clusters?: number[]
    centers?: number[][]
    silhouetteScore?: number
    inertia?: number
    nClusters?: number
    confidenceInterval?: {
      level: number
      lower: number
      upper: number
    }
    assumptions?: {
      passed: boolean
      details: unknown[]
    }
    postHoc?: unknown
    discriminantFunctions?: {
      count: number
      totalVariance: number
      firstFunctionVariance: number
    }
    // 정규성 검정
    isNormal?: boolean
    // 일표본 t 기술통계
    descriptive?: {
      mean: number
      sd: number
      n: number
      testValue: number
    }
    // 시계열 분석
    isStationary?: boolean
    trendSlope?: number
    seasonalPeriod?: number
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }

  // 시각화용 데이터
  visualizationData?: VisualizationData

  // 원시 결과 (디버깅용)
  rawResults?: Record<string, unknown> | object
}

/**
 * 호환성 별칭 (기존 코드 호환)
 * @deprecated StatisticalExecutorResult 사용 권장
 */
export type AnalysisResult = StatisticalExecutorResult

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
   *
   * @param method - 통계 방법 정의
   * @param data - 원본 데이터 (객체 배열)
   * @param variables - 변수 매핑 (VariableMapping 호환)
   *   - dependentVar/dependent: 종속변수
   *   - independentVar/independent: 독립변수
   *   - groupVar/group: 그룹변수
   *   - 기타 고급 변수 역할 지원
   * @param settings - LLM 추천 분석 설정 (선택)
   *   - alpha: 유의수준 (기본 0.05) — 현재 적용됨
   *   - postHoc: 사후검정 방법 — 향후 지원 예정
   *   - alternative: 검정 방향 — 향후 지원 예정
   */
  async executeMethod(
    method: StatisticalMethod,
    data: unknown[],
    variables: Record<string, unknown> = {},
    settings?: SuggestedSettings | null
  ): Promise<AnalysisResult> {
    this.startTime = Date.now()
    const alpha = settings?.alpha ?? 0.05
    logger.info(`통계 분석 시작: ${method.name}`, { methodId: method.id, alpha, settings: settings ? Object.keys(settings) : [] })

    try {
      // 데이터 준비 (unknown[] -> Record<string, unknown>[]로 캐스팅)
      const preparedData = this.prepareData(
        data as Array<Record<string, unknown>>,
        variables,
        method
      )

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
        case 'pca':
        case 'clustering':
        case 'advanced':
          result = await this.executeMultivariate(method, preparedData)
          break
        case 'timeseries':
          result = await this.executeTimeSeries(method, preparedData)
          break
        case 'psychometrics':
          result = await this.executeReliability(method, preparedData)
          break
        case 'survival':
          result = await this.executeSurvival(method, preparedData)
          break
        case 'design':
          result = await this.executeDesign(method, preparedData)
          break
        default:
          throw new Error(`지원되지 않는 분석 카테고리: ${method.category}`)
      }

      // 메타데이터 추가
      result.metadata.duration = (Date.now() - this.startTime) / 1000
      result.metadata.timestamp = new Date().toISOString()

      // Custom alpha 적용: p-value가 의미있는 값일 때만 (기술통계 등 p=1은 제외)
      if (alpha !== 0.05 && result.mainResults.pvalue < 1) {
        const wasSignificant = result.mainResults.significant
        result.mainResults.significant = result.mainResults.pvalue < alpha
        // significance 판정이 바뀌면 원본 해석에 alpha 기준 보충 문구 추가
        if (wasSignificant !== result.mainResults.significant && result.mainResults.interpretation) {
          const pStr = result.mainResults.pvalue < 0.001 ? '<.001' : result.mainResults.pvalue.toFixed(4)
          const alphaNote = result.mainResults.significant
            ? `단, 유의수준 α=${alpha} 기준으로는 유의합니다 (p=${pStr}).`
            : `단, 유의수준 α=${alpha} 기준으로는 유의하지 않습니다 (p=${pStr}).`
          result.mainResults.interpretation = `${result.mainResults.interpretation} ${alphaNote}`
        }
        logger.info(`Custom alpha 적용: α=${alpha}, significant=${result.mainResults.significant}`)
      }

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
   * VariableMapping (dependentVar, independentVar, groupVar, variables) 호환
   *
   * 지원하는 변수 매핑 형식:
   * - groupVar/group: 그룹 변수 (t-test, ANOVA)
   * - dependentVar/dependent: 종속 변수
   * - independentVar/independent: 독립 변수
   * - variables: [var1, var2, ...] (PairedSelector, CorrelationSelector)
   */
  private prepareData(
    data: Array<Record<string, unknown>>,
    variables: Record<string, unknown>,
    method: StatisticalMethod
  ): PreparedData {
    // VariableMapping 호환 - 여러 네이밍 컨벤션 지원
    const getDependent = (): string[] => {
      const dep = variables.dependent || variables.dependentVar
      if (!dep) return []
      return Array.isArray(dep) ? dep as string[] : [dep as string]
    }

    const getIndependent = (): string[] => {
      const ind = variables.independent || variables.independentVar
      if (!ind) return []
      return Array.isArray(ind) ? ind as string[] : [ind as string]
    }

    const getGroup = (): string | undefined => {
      return (variables.group || variables.groupVar) as string | undefined
    }

    // PairedSelector, CorrelationSelector에서 사용하는 variables 배열 지원
    const getVariablesArray = (): string[] => {
      const vars = variables.variables
      if (!vars) return []
      return Array.isArray(vars) ? vars as string[] : []
    }

    const dependent = getDependent()
    const independent = getIndependent()
    const group = getGroup()
    const variablesArray = getVariablesArray()

    // 디버깅: 변수 추출 결과 로깅
    logger.info('prepareData: Variable extraction', {
      methodId: method.id,
      variables,
      extracted: { dependent, independent, group, variablesArray },
      dataColumns: data.length > 0 ? Object.keys(data[0]) : []
    })

    // 변수 추출
    const arrays: PreparedArrays = {}
    const prepared: PreparedData = {
      data: data,
      variables: variables,
      arrays: arrays,
      totalN: data.length,
      missingRemoved: 0
    }

    // Two-way ANOVA 특수 처리: group을 "factor1,factor2" 형태로 유지
    if (method.id === 'two-way-anova') {
      logger.info('[two-way-anova] prepareData: Preserving group as factor string', {
        group,
        dependent,
        dataSize: data.length
      })
      // group과 dependent를 그대로 prepared.variables에 유지
      prepared.variables = {
        ...variables,
        group: group,
        dependent: dependent
      }
      // 원본 데이터 유지 (executeANOVA에서 직접 처리)
      return prepared
    }

    // 종속변수 추출
    if (dependent.length > 0) {
      arrays.dependent = data.map(row =>
        Number(row[dependent[0]])
      ).filter(v => !isNaN(v))
    }

    // 독립변수 추출
    if (independent.length > 0) {
      arrays.independent = independent.map((col: string) =>
        data.map(row => Number(row[col])).filter(v => !isNaN(v))
      )
    }

    // variables 배열 처리 (PairedSelector, CorrelationSelector)
    // dependent/independent가 없고 variables가 있으면 자동 변환
    if (variablesArray.length > 0 && dependent.length === 0 && independent.length === 0) {
      // 대응표본 검정 (paired-t, wilcoxon, mcnemar): variables[0] -> dependent, variables[1] -> independent
      if (variablesArray.length === 2 && (method.id === 'paired-t' || method.id === 'paired-t-test' || method.id === 'wilcoxon' || method.id === 'wilcoxon-signed-rank' || method.id === 'sign-test' || method.id === 'mcnemar')) {
        arrays.dependent = data.map(row =>
          Number(row[variablesArray[0]])
        ).filter(v => !isNaN(v))
        arrays.independent = [data.map(row =>
          Number(row[variablesArray[1]])
        ).filter(v => !isNaN(v))]
      }
      // 상관분석 (correlation): 최소 2개 변수 필요
      else if (method.category === 'correlation') {
        if (variablesArray.length < 2) {
          throw new Error('상관분석을 위해 최소 2개의 변수가 필요합니다')
        }
        arrays.independent = variablesArray.map((col: string) =>
          data.map(row => Number(row[col])).filter(v => !isNaN(v))
        )
        // 첫 두 변수를 dependent/independent로도 설정 (executeCorrelation 호환)
        arrays.dependent = data.map(row =>
          Number(row[variablesArray[0]])
        ).filter(v => !isNaN(v))
      }
      // 기타: 첫 변수를 dependent, 나머지를 independent로
      else {
        if (variablesArray.length >= 1) {
          arrays.dependent = data.map(row =>
            Number(row[variablesArray[0]])
          ).filter(v => !isNaN(v))
        }
        if (variablesArray.length >= 2) {
          arrays.independent = variablesArray.slice(1).map((col: string) =>
            data.map(row => Number(row[col])).filter(v => !isNaN(v))
          )
        }
      }
    }

    // 그룹변수로 데이터 분할
    if (group) {
      const groups = [...new Set(data.map(row => row[group]))]
      prepared.groups = groups
      arrays.byGroup = {} as Record<string, number[]>

      // Group labels array for discriminant analysis (aligned with row indices)
      arrays.group = data.map(row => row[group])

      const byGroup = arrays.byGroup as Record<string, number[]>
      groups.forEach(grp => {
        byGroup[String(grp)] = data
          .filter(row => row[group] === grp)
          .map(row => {
            const val = dependent.length > 0 ?
              Number(row[dependent[0]]) :
              Object.values(row).find(v => !isNaN(Number(v)))
            return typeof val === 'number' ? val : Number(val)
          })
          .filter((v: number) => !isNaN(v))
      })

      // 디버깅: 그룹 분할 결과 로깅
      logger.info('prepareData: Group split result', {
        groupColumn: group,
        uniqueGroups: groups,
        groupSizes: Object.entries(byGroup).map(([k, v]) => ({ group: k, count: v.length }))
      })
    }

    // 고급 변수 역할 처리
    // 공변량 (ANCOVA 등)
    if (variables.covariate) {
      const covariates = Array.isArray(variables.covariate)
        ? variables.covariate as string[]
        : [variables.covariate as string]
      arrays.covariate = covariates.map((col: string) =>
        data.map(row => Number(row[col])).filter(v => !isNaN(v))
      )
    }

    // Within-subject 요인 (반복측정)
    const within = variables.within as string[] | undefined
    if (within && within.length > 0) {
      arrays.within = within.map((col: string) =>
        data.map(row => Number(row[col])).filter(v => !isNaN(v))
      )
      prepared.withinFactors = within
    }

    // Between-subject 요인 (혼합모형)
    const between = variables.between as string[] | undefined
    if (between && between.length > 0) {
      arrays.between = between.map((col: string) =>
        data.map(row => row[col])
      )
      prepared.betweenFactors = between
    }

    // 블록 변수 (블록설계)
    if (variables.blocking) {
      const blocking = Array.isArray(variables.blocking)
        ? variables.blocking as string[]
        : [variables.blocking as string]
      arrays.blocking = blocking.map((col: string) =>
        data.map(row => row[col])
      )
    }

    // 사건 변수 (생존분석)
    const event = variables.event as string | undefined
    if (event) {
      arrays.event = data.map(row =>
        Number(row[event])
      ).filter(v => !isNaN(v))
    }

    // 중도절단 변수 (생존분석)
    const censoring = variables.censoring as string | undefined
    if (censoring) {
      arrays.censoring = data.map(row =>
        Number(row[censoring])
      ).filter(v => !isNaN(v))
    }

    // 가중치 변수
    const weight = variables.weight as string | undefined
    if (weight) {
      arrays.weight = data.map(row =>
        Number(row[weight])
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
    data: PreparedData
  ): Promise<AnalysisResult> {
    const values = data.arrays.dependent || data.arrays.independent?.[0] || []

    // 정규성 검정: Shapiro-Wilk 실행
    if (method.id === 'normality-test' || method.id === 'shapiro-wilk') {
      const normResult = await pyodideStats.shapiroWilkTest(values)
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
          statistic: normResult.statistic,
          pvalue: normResult.pValue,
          significant: normResult.pValue < 0.05,
          interpretation: normResult.pValue < 0.05
            ? `Shapiro-Wilk W = ${normResult.statistic.toFixed(4)}, p = ${normResult.pValue.toFixed(4)} → 정규성 가정을 기각합니다 (정규분포가 아닐 수 있음)`
            : `Shapiro-Wilk W = ${normResult.statistic.toFixed(4)}, p = ${normResult.pValue.toFixed(4)} → 정규성 가정을 유지합니다`
        },
        additionalInfo: {
          isNormal: normResult.isNormal
        },
        visualizationData: {
          type: 'histogram',
          data: { values }
        },
        rawResults: normResult
      }
    }

    // 기본 기술통계
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
    data: PreparedData
  ): Promise<AnalysisResult> {
    // 일표본 t-검정 분기
    if (method.id === 'one-sample-t' || method.id === 'one-sample-t-test') {
      const values = data.arrays.dependent || data.arrays.independent?.[0] || []
      if (values.length < 2) {
        throw new Error('일표본 t-검정을 위해 최소 2개 이상의 관측치가 필요합니다')
      }
      const testValue = Number(data.variables.testValue ?? 0)
      if (isNaN(testValue)) {
        throw new Error('기준값(μ₀)이 유효한 숫자가 아닙니다')
      }
      const result = await pyodideStats.oneSampleTTest(values, testValue)

      // Cohen's d = (mean - mu) / sd
      const mean = values.reduce((s, v) => s + v, 0) / values.length
      const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1))
      const cohensD = sd > 0 ? Math.abs(mean - testValue) / sd : 0

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: values.length,
            missingRemoved: 0,
            groups: 1
          }
        },
        mainResults: {
          statistic: result.statistic ?? 0,
          pvalue: result.pValue ?? 1,
          df: result.df,
          significant: (result.pValue ?? 1) < 0.05,
          interpretation: (result.pValue ?? 1) < 0.05
            ? `표본 평균이 기준값(${testValue})과 유의한 차이가 있습니다`
            : `표본 평균이 기준값(${testValue})과 유의한 차이가 없습니다`
        },
        additionalInfo: {
          effectSize: {
            type: "Cohen's d",
            value: cohensD,
            interpretation: this.interpretCohensD(cohensD)
          },
          descriptive: {
            mean,
            sd,
            n: values.length,
            testValue
          }
        },
        visualizationData: {
          type: 'histogram',
          data: [{ values, label: '표본' }]
        },
        rawResults: result
      }
    }

    let group1: number[], group2: number[]
    let groupNames: string[] = []

    // 그룹 데이터 준비
    if (data.arrays.byGroup) {
      const byGroup = data.arrays.byGroup as Record<string, number[]>
      groupNames = Object.keys(byGroup)
      if (groupNames.length !== 2) {
        const groupsLabel = groupNames.length > 0 ? groupNames.map(name => `"${name}"`).join(', ') : '(없음)'
        throw new Error(
          `t-검정을 위해 정확히 2개 그룹이 필요합니다. 현재: ${groupNames.length}개 (${groupsLabel}). ` +
          '그룹 변수 선택이 올바른지 확인하세요.'
        )
      }
      const groups = Object.values(byGroup) as number[][]
      group1 = groups[0] || []
      group2 = groups[1] || []
    } else if (data.arrays.independent) {
      group1 = data.arrays.dependent || []
      group2 = data.arrays.independent[0] || []
      groupNames = ['그룹 1', '그룹 2']
    } else {
      throw new Error('t-검정을 위한 두 그룹 데이터가 필요합니다')
    }

    // 데이터 검증 - Python으로 보내기 전에 검증
    if (group1.length < 2 || group2.length < 2) {
      const groupInfo = groupNames.length >= 2
        ? `그룹 "${groupNames[0]}": ${group1.length}개, 그룹 "${groupNames[1]}": ${group2.length}개`
        : `그룹 1: ${group1.length}개, 그룹 2: ${group2.length}개`
      throw new Error(
        `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${groupInfo}. ` +
        '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
      )
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
    data: PreparedData
  ): Promise<AnalysisResult> {
    // Two-way ANOVA는 별도 처리
    if (method.id === 'two-way-anova') {
      const groupVar = data.variables.group as string | undefined
      const dependentVar = (data.variables.dependent as string[] | undefined)?.[0]
      const rawData = data.data as Array<Record<string, unknown>>

      logger.info('[two-way-anova] Debug variables:', {
        groupVar,
        dependentVar,
        rawDataLength: rawData?.length,
        allVariables: JSON.stringify(data.variables)
      })

      if (!groupVar || !dependentVar || !rawData) {
        logger.error('[two-way-anova] Missing variables:', {
          hasGroupVar: !!groupVar,
          hasDependentVar: !!dependentVar,
          hasRawData: !!rawData,
          rawDataLength: rawData?.length
        })
        throw new Error(`이원 ANOVA 변수 누락: groupVar=${!!groupVar}, dependent=${!!dependentVar}, rawData=${!!rawData && rawData.length > 0}`)
      }

      // groupVar format: "factor1,factor2"
      const factors = groupVar.split(',').map(f => f.trim())
      logger.info('[two-way-anova] Parsed factors:', { factors, factorCount: factors.length })

      if (factors.length !== 2) {
        throw new Error(`이원 ANOVA를 위해 정확히 2개의 요인이 필요합니다 (현재: ${factors.length}개, groupVar="${groupVar}")`)
      }

      const [factor1Name, factor2Name] = factors

      // 데이터 포맷팅: { factor1, factor2, value }[]
      const formattedData = rawData
        .map(row => {
          const factor1Value = row[factor1Name]
          const factor2Value = row[factor2Name]
          const depValue = row[dependentVar]

          if (factor1Value == null || factor2Value == null || depValue == null) return null

          const numValue = typeof depValue === 'number' ? depValue : Number(depValue)
          if (!Number.isFinite(numValue)) return null

          return {
            factor1: String(factor1Value),
            factor2: String(factor2Value),
            value: numValue
          }
        })
        .filter((item): item is { factor1: string; factor2: string; value: number } => item !== null)

      if (formattedData.length === 0) {
        throw new Error('유효한 데이터가 없습니다. 모든 행이 null 또는 유효하지 않은 값입니다.')
      }

      type TwoWayAnovaResult = {
        factor1: { fStatistic: number; pValue: number; df: number }
        factor2: { fStatistic: number; pValue: number; df: number }
        interaction: { fStatistic: number; pValue: number; df: number }
        residual: { df: number }
        anovaTable: Record<string, unknown>
      }

      let rawResult: unknown = await pyodideStats.twoWayAnova(formattedData)

      logger.info('[two-way-anova] Raw Python worker result:', {
        hasResult: !!rawResult,
        resultType: typeof rawResult,
        rawResultPreview: String(rawResult).slice(0, 300)
      })

      // Worker may return JSON string instead of object
      if (typeof rawResult === 'string') {
        logger.info('[two-way-anova] Result is string, parsing JSON')
        try {
          rawResult = JSON.parse(rawResult)
        } catch (e) {
          throw new Error(`이원 ANOVA 결과 JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`)
        }
      }

      // Type guard
      if (!rawResult || typeof rawResult !== 'object') {
        throw new Error(`이원 ANOVA 결과가 올바르지 않습니다 (type=${typeof rawResult})`)
      }

      const parsed = rawResult as Record<string, unknown>
      if (!parsed.factor1 || !parsed.factor2 || !parsed.interaction) {
        throw new Error(
          `이원 ANOVA 결과 구조 오류 (factor1=${!!parsed.factor1}, ` +
          `factor2=${!!parsed.factor2}, interaction=${!!parsed.interaction})`
        )
      }

      const result = rawResult as TwoWayAnovaResult

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: formattedData.length,
            missingRemoved: rawData.length - formattedData.length,
            groups: 0
          }
        },
        mainResults: {
          statistic: result.factor1.fStatistic,
          pvalue: result.factor1.pValue,
          df: result.factor1.df,
          significant: result.factor1.pValue < 0.05,
          interpretation: result.factor1.pValue < 0.05 ?
            '주 효과 또는 상호작용 효과가 유의합니다' :
            '주 효과 및 상호작용 효과가 유의하지 않습니다'
        },
        additionalInfo: {
          factor1: {
            name: factor1Name,
            fStatistic: result.factor1.fStatistic,
            pvalue: result.factor1.pValue,
            df: result.factor1.df
          },
          factor2: {
            name: factor2Name,
            fStatistic: result.factor2.fStatistic,
            pvalue: result.factor2.pValue,
            df: result.factor2.df
          },
          interaction: {
            fStatistic: result.interaction.fStatistic,
            pvalue: result.interaction.pValue,
            df: result.interaction.df
          }
        },
        visualizationData: {
          type: 'interaction-plot',
          data: formattedData
        },
        rawResults: result
      }
    }

    const byGroup = data.arrays.byGroup || {}
    const groupNames = Object.keys(byGroup)
    const groups = Object.values(byGroup) as number[][]

    if (groups.length < 2) {
      throw new Error('ANOVA를 위해 최소 2개 그룹이 필요합니다')
    }

    // 각 그룹에 최소 2개 이상의 관측치 필요
    const insufficientGroups = groupNames.filter((name, i) => groups[i].length < 2)
    if (insufficientGroups.length > 0) {
      const details = groupNames.map((name, i) => `"${name}": ${groups[i].length}개`).join(', ')
      throw new Error(
        `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${details}. ` +
        '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
      )
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
      // 행 단위로 종속변수·그룹·모든 공변량이 동시에 유효한 경우만 포함
      const dependentVar = (data.variables.dependent as string[] | undefined)?.[0] || ''
      const groupVar = data.variables.group as string
      const covariateVars = Array.isArray(data.variables.covariate)
        ? data.variables.covariate
        : [data.variables.covariate]

      const yValues: number[] = []
      const groupValues: (string | number)[] = []
      const covariateArrays: number[][] = covariateVars.map(() => [] as number[])

      for (const row of data.data as Record<string, unknown>[]) {
        const yVal = Number(row[dependentVar])
        const gVal = row[groupVar]
        const covVals = covariateVars.map((col: string) => Number(row[col]))

        // 모든 값이 유효한 경우만 포함
        if (!isNaN(yVal) && gVal != null && covVals.every((v: number) => !isNaN(v))) {
          yValues.push(yVal)
          groupValues.push(gVal as string | number)
          covVals.forEach((v: number, i: number) => covariateArrays[i].push(v))
        }
      }

      if (yValues.length === 0) {
        throw new Error('ANCOVA: 모든 변수에 유효한 값이 있는 행이 없습니다')
      }

      const covariates = covariateArrays

      // Worker 실제 반환 타입으로 캐스팅 (pyodide-statistics.ts 선언과 다름)
      const ancovaResult = await pyodideStats.ancovaWorker(yValues, groupValues, covariates) as unknown as {
        fStatisticGroup: number
        pValueGroup: number
        fStatisticCovariate: number[]
        pValueCovariate: number[]
        adjustedMeans: Array<{ group: string | number; mean: number }>
        anovaTable: Record<string, unknown>
      }

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
          statistic: ancovaResult.fStatisticGroup,
          pvalue: ancovaResult.pValueGroup,
          df: 0,
          significant: ancovaResult.pValueGroup < 0.05,
          interpretation: ancovaResult.pValueGroup < 0.05 ?
            `공변량 통제 후 그룹 간 유의한 차이가 있습니다 (F=${ancovaResult.fStatisticGroup.toFixed(2)})` :
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
      // 행 단위로 모든 시점에 유효한 값이 있는 피험자만 포함
      const withinVars = data.variables.within as string[]
      const nTimePoints = withinVars.length
      const rawData = data.data as Record<string, unknown>[]

      // 모든 시점에 유효한 값이 있는 행만 수집
      const validMatrix: number[][] = []
      for (const row of rawData) {
        const values = withinVars.map(col => Number(row[col]))
        if (values.every(v => !isNaN(v))) {
          validMatrix.push(values)
        }
      }

      if (validMatrix.length === 0) {
        throw new Error('반복측정 ANOVA: 모든 시점에 유효한 값이 있는 피험자가 없습니다')
      }

      // validMatrix는 이미 [subject][timepoint] 형태
      const dataMatrix = validMatrix
      const nSubjects = dataMatrix.length

      const subjectIds = Array.from({ length: nSubjects }, (_, i) => `S${i + 1}`)
      const timeLabels = data.withinFactors || Array.from({ length: nTimePoints }, (_, i) => `T${i + 1}`)

      // Worker 실제 반환 타입으로 캐스팅 (pyodide-statistics.ts 선언과 다름)
      const rmResult = await pyodideStats.repeatedMeasuresAnovaWorker(
        dataMatrix,
        subjectIds,
        timeLabels
      ) as unknown as {
        fStatistic: number
        pValue: number
        df: { numerator: number; denominator: number }
        sphericityEpsilon: number
        anovaTable: Record<string, unknown>
      }

      // df 처리: { numerator, denominator } 객체에서 값 추출
      const dfValue = rmResult.df.numerator || 0

      return {
        metadata: {
          method: method.id,
          methodName: method.name,
          timestamp: '',
          duration: 0,
          dataInfo: {
            totalN: nSubjects * nTimePoints,
            missingRemoved: 0,
            groups: nTimePoints
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
            // dataMatrix는 [subject][timepoint] 형태이므로 각 시점별 평균 계산
            means: Array.from({ length: nTimePoints }, (_, t) => {
              const values = dataMatrix.map(subject => subject[t])
              return values.reduce((a, b) => a + b, 0) / values.length
            })
          }
        },
        rawResults: {
          ...rmResult,
          subjects: nSubjects,
          timePoints: nTimePoints
        }
      }
    }

    const result = await pyodideStats.anova(groups, {
      type: method.id === 'two-way-anova' ? 'two-way' : 'one-way'
    })

    // 유의한 경우 사후검정
    // Games-Howell: 이분산 가정 (등분산 가정 불필요) - 더 robust
    // Tukey HSD: 등분산 가정 (fallback)
    let postHoc: unknown = null
    if (result.pValue < 0.05 && groups.length > 2) {
      try {
        // Games-Howell 사용 (이분산에 robust)
        const ghResult = await pyodideStats.gamesHowellTest(groups, groupNames)
        // comparisons 배열 추출 (transformer에서 Array.isArray 기대)
        postHoc = ghResult?.comparisons ?? ghResult
      } catch (ghError) {
        logger.warn('Games-Howell 사후검정 실패, Tukey HSD로 시도합니다', ghError)
        try {
          const tukeyResult = await pyodideStats.tukeyHSD(groups)
          // tukeyHSD도 { comparisons: [...] } 형태 → 배열 추출
          const comps = tukeyResult?.comparisons
          if (Array.isArray(comps)) {
            postHoc = comps.map(c => ({
              group1: c.group1,
              group2: c.group2,
              meanDiff: 0,
              pvalue: c.pValue,
              significant: c.significant
            }))
          }
        } catch (tukeyError) {
          logger.warn('Tukey HSD 사후검정도 실패, 사후검정 없이 진행합니다', tukeyError)
          postHoc = null
        }
      }
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
    data: PreparedData
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
   * 상관분석 실행 - CorrelationExecutor에 위임
   *
   * 지원하는 method.id:
   * - correlation: 종합 상관분석 (Pearson + Spearman + Kendall)
   * - pearson, pearson-correlation: Pearson 상관분석
   * - spearman, spearman-correlation: Spearman 상관분석
   * - kendall, kendall-correlation: Kendall 상관분석
   * - partial-correlation: 편상관분석 (공변량 통제)
   */
  private async executeCorrelation(
    method: StatisticalMethod,
    data: PreparedData
  ): Promise<AnalysisResult> {
    const var1 = data.arrays.dependent || data.arrays.independent?.[0]
    const var2 = data.arrays.independent?.[1] || data.arrays.independent?.[0]

    if (!var1 || !var2) {
      throw new Error('상관분석을 위한 두 변수가 필요합니다')
    }

    const executor = new CorrelationExecutor()

    // method.id에 따라 적절한 상관분석 실행
    const methodId = method.id.toLowerCase()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let executorResult: any

    if (methodId === 'partial-correlation') {
      // 편상관분석: 공변량(통제변수) 처리
      // Note: prepareData에서 arrays.covariate로 저장됨 (covariates 아님)
      const covariates = data.arrays.covariate || []
      const dataMatrix = [var1, var2, ...covariates]
      const controlIndices = covariates.length > 0
        ? Array.from({ length: covariates.length }, (_, i) => i + 2)
        : []
      executorResult = await executor.executePartialCorrelation(dataMatrix, 0, 1, controlIndices)
    } else if (methodId.includes('spearman')) {
      executorResult = await executor.executeSpearman(var1, var2)
    } else if (methodId.includes('kendall')) {
      executorResult = await executor.executeKendall(var1, var2)
    } else if (methodId.includes('pearson') && !methodId.includes('correlation')) {
      // 명시적으로 pearson만 지정된 경우
      executorResult = await executor.executePearson(var1, var2)
    } else {
      // 기본: 종합 상관분석 (correlation 또는 pearson-correlation)
      executorResult = await executor.executeCorrelation(var1, var2)
    }

    // CorrelationExecutor 결과를 StatisticalExecutor 형식으로 변환
    return {
      metadata: {
        method: method.id,
        methodName: method.name,
        timestamp: executorResult.metadata?.timestamp || '',
        duration: executorResult.metadata?.duration || 0,
        dataInfo: {
          totalN: var1.length,
          missingRemoved: 0
        }
      },
      mainResults: {
        statistic: executorResult.mainResults.statistic,
        pvalue: executorResult.mainResults.pvalue,
        significant: executorResult.mainResults.pvalue < 0.05,
        interpretation: executorResult.mainResults.interpretation
      },
      additionalInfo: executorResult.additionalInfo || {},
      visualizationData: {
        type: 'scatter',
        data: {
          x: var1,
          y: var2
        }
      },
      rawResults: executorResult
    }
  }

  /**
   * 비모수 검정 실행
   */
  private async executeNonparametric(
    method: StatisticalMethod,
    data: PreparedData
  ): Promise<AnalysisResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result: any

    switch (method.id) {
      case 'mann-whitney': {
        const byGroup = data.arrays.byGroup || {}
        const mwGroupNames = Object.keys(byGroup)
        const mwGroups = Object.values(byGroup) as number[][]

        // 데이터 검증
        if (mwGroups.length !== 2) {
          const groupsLabel = mwGroupNames.length > 0 ? mwGroupNames.map(name => `"${name}"`).join(', ') : '(없음)'
          throw new Error(
            `Mann-Whitney U 검정을 위해 정확히 2개 그룹이 필요합니다. 현재: ${mwGroups.length}개 (${groupsLabel}). ` +
            '그룹 변수 선택이 올바른지 확인하세요.'
          )
        }
        if (mwGroups[0].length < 2 || mwGroups[1].length < 2) {
          const details = mwGroupNames.length >= 2
            ? `그룹 "${mwGroupNames[0]}": ${mwGroups[0]?.length || 0}개, 그룹 "${mwGroupNames[1]}": ${mwGroups[1]?.length || 0}개`
            : `그룹 1: ${mwGroups[0]?.length || 0}개, 그룹 2: ${mwGroups[1]?.length || 0}개`
          throw new Error(
            `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${details}. ` +
            '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
          )
        }

        result = await pyodideStats.mannWhitneyU(mwGroups[0], mwGroups[1])
        break
      }
      case 'wilcoxon':
        result = await pyodideStats.wilcoxon(
          data.arrays.dependent || [],
          data.arrays.independent?.[0] || []
        )
        break
      case 'kruskal-wallis': {
        const kwByGroup = data.arrays.byGroup || {}
        const kwGroupNames = Object.keys(kwByGroup)
        const kwGroups = Object.values(kwByGroup) as number[][]

        // 데이터 검증
        if (kwGroups.length < 2) {
          throw new Error('Kruskal-Wallis 검정을 위해 최소 2개 그룹이 필요합니다')
        }
        const insufficientKwGroups = kwGroupNames.filter((_, i) => kwGroups[i].length < 2)
        if (insufficientKwGroups.length > 0) {
          const details = kwGroupNames.map((name, i) => `"${name}": ${kwGroups[i].length}개`).join(', ')
          throw new Error(
            `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${details}. ` +
            '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
          )
        }

        result = await pyodideStats.kruskalWallis(kwGroups)
        break
      }
      case 'friedman':
        result = await pyodideStats.friedman(data.arrays.independent || [])
        break
      case 'chi-square':
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result = await pyodideStats.chiSquare(data.data as any)
        break
      case 'sign-test': {
        const signResult = await pyodideStats.signTestWorker(
          data.arrays.dependent || [],
          data.arrays.independent?.[0] || []
        )
        result = {
          statistic: signResult.statistic,
          pvalue: signResult.pValue,
          nPositive: signResult.nPositive,
          nNegative: signResult.nNegative
        }
        break
      }
      case 'mcnemar': {
        // 2x2 분할표 필요
        const contingencyTable = data.arrays.contingencyTable || [[0, 0], [0, 0]]
        const mcnemarResult = await pyodideStats.mcnemarTestWorker(contingencyTable)
        result = {
          statistic: mcnemarResult.statistic,
          pvalue: mcnemarResult.pValue
        }
        break
      }
      case 'cochran-q': {
        // 이진 데이터 행렬 필요
        const dataMatrix = data.arrays.independent || []
        const cochranResult = await pyodideStats.cochranQTestWorker(dataMatrix)
        result = {
          statistic: cochranResult.qStatistic,
          pvalue: cochranResult.pValue,
          df: cochranResult.df
        }
        break
      }
      case 'binomial-test': {
        const successCount = data.variables?.successCount as number || 0
        const totalCount = data.totalN || 1
        const probability = data.variables?.probability as number || 0.5
        const binomialResult = await pyodideStats.binomialTestWorker(
          successCount,
          totalCount,
          probability
        )
        result = {
          statistic: binomialResult.successCount,
          pvalue: binomialResult.pValue,
          proportion: binomialResult.successCount / binomialResult.totalCount
        }
        break
      }
      case 'runs-test': {
        const sequence = data.arrays.dependent || []
        const runsResult = await pyodideStats.runsTestWorker(sequence)
        result = {
          statistic: runsResult.zStatistic,
          pvalue: runsResult.pValue,
          nRuns: runsResult.nRuns,
          expectedRuns: runsResult.expectedRuns
        }
        break
      }
      case 'ks-test': {
        // pyodideStats 래퍼 사용
        const values1 = data.arrays.dependent || []
        const values2 = data.arrays.independent?.[0]

        if (values2 && values2.length > 0) {
          // 이표본 K-S 검정
          const ksResult = await pyodideStats.ksTestTwoSample(values1, values2)
          result = { statistic: ksResult.statistic, pvalue: ksResult.pValue }
        } else {
          // 일표본 K-S 검정 (정규성)
          const ksResult = await pyodideStats.ksTestOneSample(values1)
          result = { statistic: ksResult.statistic, pvalue: ksResult.pValue }
        }
        break
      }
      case 'mood-median': {
        const moodByGroup = data.arrays.byGroup || {}
        const moodGroupNames = Object.keys(moodByGroup)
        const moodGroups = Object.values(moodByGroup) as number[][]

        // 데이터 검증
        if (moodGroups.length < 2) {
          throw new Error('Mood Median 검정을 위해 최소 2개 그룹이 필요합니다')
        }
        const insufficientMoodGroups = moodGroupNames.filter((_, i) => moodGroups[i].length < 2)
        if (insufficientMoodGroups.length > 0) {
          const details = moodGroupNames.map((name, i) => `"${name}": ${moodGroups[i].length}개`).join(', ')
          throw new Error(
            `각 그룹에 최소 2개 이상의 관측치가 필요합니다. 현재: ${details}. ` +
            '그룹 변수와 종속 변수가 올바르게 선택되었는지 확인하세요.'
          )
        }

        const moodResult = await pyodideStats.moodMedianTestWorker(moodGroups)
        result = {
          statistic: moodResult.statistic,
          pvalue: moodResult.pValue,
          grandMedian: moodResult.grandMedian
        }
        break
      }
      case 'proportion-test': {
        const successCount = data.variables?.successCount as number || 0
        const totalCount = data.totalN || 1
        const nullProportion = data.variables?.nullProportion as number || 0.5
        const propResult = await pyodideStats.oneSampleProportionTest(
          successCount,
          totalCount,
          nullProportion
        )
        result = {
          statistic: propResult.zStatistic,
          pvalue: propResult.pValueExact,
          proportion: propResult.sampleProportion
        }
        break
      }
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
    data: PreparedData
  ): Promise<AnalysisResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      case 'discriminant': {
        // Build row-major matrix from raw data, filtering rows jointly
        // This ensures features and group labels are aligned
        const rawData = data.data as Array<Record<string, unknown>>
        const indVars = (data.variables?.independent || data.variables?.independentVar) as string | string[] | undefined
        const groupVar = (data.variables?.group || data.variables?.groupVar) as string | undefined
        const indNames = indVars ? (Array.isArray(indVars) ? indVars : [indVars]) : []

        // Build aligned arrays from raw data - filter rows where all features AND group are valid
        const alignedRows: { features: number[]; group: unknown }[] = []

        for (const row of rawData) {
          const features: number[] = []
          let allValid = true

          // Check all feature values
          for (const varName of indNames) {
            const val = Number(row[varName])
            if (isNaN(val)) {
              allValid = false
              break
            }
            features.push(val)
          }

          // Check group value
          const groupVal = groupVar ? row[groupVar] : undefined
          if (groupVar && (groupVal === undefined || groupVal === null || groupVal === '')) {
            allValid = false
          }

          if (allValid) {
            alignedRows.push({ features, group: groupVal })
          }
        }

        if (alignedRows.length === 0) {
          throw new Error('Discriminant analysis requires feature data')
        }

        const rowMajorMatrix = alignedRows.map(r => r.features)
        const groupLabels = alignedRows.map(r => r.group)

        if (groupLabels.some(g => g === undefined || g === null)) {
          throw new Error('Discriminant analysis requires a group variable')
        }

        const ldaResult = await pyodideStats.discriminantAnalysis(rowMajorMatrix, groupLabels as (string | number)[])

        result = {
          ...ldaResult,
          accuracy: ldaResult.accuracy || 0
        }
        break
      }
      default:
        throw new Error(`지원되지 않는 다변량 분석: ${method.id}`)
    }

    // Build result based on method type
    if (method.id === 'discriminant') {
      // LDA-specific result mapping
      const ldaAccuracy = result.accuracy || 0
      const ldaTotalVariance = result.totalVariance || 0
      const ldaFunctions = result.functions || []
      const firstFunctionVariance = ldaFunctions.length > 0 ? ldaFunctions[0].varianceExplained || 0 : 0

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
          statistic: ldaAccuracy,
          pvalue: 1, // LDA does not produce p-value directly
          significant: ldaAccuracy > 0.5,
          interpretation: result.interpretation || `Classification accuracy: ${(ldaAccuracy * 100).toFixed(1)}%`
        },
        additionalInfo: {
          effectSize: {
            type: 'Classification Accuracy',
            value: ldaAccuracy,
            interpretation: ldaAccuracy >= 0.9 ? 'Excellent' :
                           ldaAccuracy >= 0.8 ? 'Good' :
                           ldaAccuracy >= 0.7 ? 'Acceptable' : 'Poor'
          },
          discriminantFunctions: {
            count: ldaFunctions.length,
            totalVariance: ldaTotalVariance,
            firstFunctionVariance: firstFunctionVariance
          }
        },
        visualizationData: {
          type: 'discriminant-plot',
          data: result
        },
        rawResults: result
      }
    }

    if (method.id === 'cluster-analysis') {
      const clusters = (result.clusters || result.clusterAssignments || []) as number[]
      const centers = (result.centers || result.centroids || []) as number[][]
      const silhouetteScore = Number(result.silhouetteScore || 0)
      const inertia = Number(result.inertia || 0)
      const nClusters = Number(result.nClusters || new Set(clusters).size || 0)

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
          statistic: silhouetteScore,
          pvalue: 1,
          significant: false,
          interpretation: `${nClusters}개 군집 형성. Silhouette score: ${silhouetteScore.toFixed(3)}`
        },
        additionalInfo: {
          clusters,
          centers,
          silhouetteScore,
          inertia,
          nClusters
        },
        visualizationData: {
          type: 'cluster-plot',
          data: {
            points: data.arrays.independent || [],
            clusters,
            centers
          }
        },
        rawResults: result
      }
    }

    // PCA, Factor Analysis - use explainedVariance fields
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
    data: PreparedData
  ): Promise<AnalysisResult> {
    const timeData = data.arrays.dependent || []
    // time_series_analysis는 seasonalPeriods만 받음 (method 파라미터 없음)
    const result = await pyodideStats.timeSeriesAnalysis(timeData, {
      seasonalPeriods: 12
    })

    const baseMeta = {
      method: method.id,
      methodName: method.name,
      timestamp: '',
      duration: 0,
      dataInfo: {
        totalN: timeData.length,
        missingRemoved: 0
      }
    }

    // method.id별 결과 표현 분기
    switch (method.id) {
      case 'stationarity-test': {
        // ADF 검정 결과가 rawResults에 이미 반환됨
        const adfStat = result.adfStatistic ?? 0
        const adfP = result.adfPValue ?? 1
        const isStationary = result.isStationary ?? adfP < 0.05
        return {
          metadata: baseMeta,
          mainResults: {
            statistic: adfStat,
            pvalue: adfP,
            significant: isStationary,
            interpretation: isStationary
              ? `ADF 통계량 = ${Number(adfStat).toFixed(4)}, p = ${Number(adfP).toFixed(4)} → 시계열이 정상 (stationary)입니다`
              : `ADF 통계량 = ${Number(adfStat).toFixed(4)}, p = ${Number(adfP).toFixed(4)} → 시계열이 비정상 (non-stationary)입니다`
          },
          additionalInfo: { isStationary },
          visualizationData: {
            type: 'time-series',
            data: { values: timeData, trend: result.trend }
          },
          rawResults: result
        }
      }

      case 'seasonal-decompose': {
        // 계절 분해: trend, seasonal, residual 컴포넌트
        const trendSlope = Array.isArray(result.trend) && result.trend.length >= 2
          ? (result.trend[result.trend.length - 1] - result.trend[0]) / result.trend.length
          : 0
        return {
          metadata: baseMeta,
          mainResults: {
            statistic: trendSlope,
            pvalue: 1, // 계절 분해는 가설검정이 아님
            significant: false,
            interpretation: `추세 기울기: ${trendSlope.toFixed(4)}. 시계열이 추세, 계절성, 잔차 성분으로 분해되었습니다.`
          },
          additionalInfo: {
            trendSlope,
            seasonalPeriod: 12
          },
          visualizationData: {
            type: 'time-series',
            data: {
              values: timeData,
              trend: result.trend,
              seasonal: result.seasonal,
              residual: result.residual
            }
          },
          rawResults: result
        }
      }

      default: {
        // 기본 시계열 분석 (ARIMA 등)
        return {
          metadata: baseMeta,
          mainResults: {
            statistic: Array.isArray(result.trend) ? result.trend[0] : (result.trend || 0),
            pvalue: 1,
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
    }
  }

  /**
   * 신뢰도 분석 실행
   */
  private async executeReliability(
    method: StatisticalMethod,
    data: PreparedData
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
   * 생존 분석 실행
   */
  private async executeSurvival(
    method: StatisticalMethod,
    data: PreparedData
  ): Promise<AnalysisResult> {
    switch (method.id) {
      case 'kaplan-meier': {
        const rawTimes = data.arrays.dependent || []
        const rawEvents = data.arrays.event || []

        // Validate event variable is provided
        if (rawEvents.length === 0) {
          throw new Error('Kaplan-Meier analysis requires an event variable (0=censored, 1=event)')
        }

        // Build aligned arrays - filter NaN values while keeping indices aligned
        const alignedData: { time: number; event: number }[] = []
        const rawData = data.data as Array<Record<string, unknown>>
        const depVar = (data.variables?.dependent || data.variables?.dependentVar) as string | string[] | undefined
        const eventVar = data.variables?.event as string | undefined
        const depName = Array.isArray(depVar) ? depVar[0] : depVar

        if (depName && eventVar && rawData) {
          for (const row of rawData) {
            const time = Number(row[depName])
            const event = Number(row[eventVar])
            if (!isNaN(time) && !isNaN(event)) {
              alignedData.push({ time, event })
            }
          }
        } else {
          // Missing variable names - cannot align properly
          throw new Error('Kaplan-Meier requires time (dependent) and event variable names')
        }

        if (alignedData.length === 0) {
          throw new Error('No valid time-event pairs found')
        }

        const times = alignedData.map(d => d.time)
        const events = alignedData.map(d => d.event)

        // Validate events are binary (0 or 1)
        const uniqueEvents = [...new Set(events)]
        if (!uniqueEvents.every(e => e === 0 || e === 1)) {
          throw new Error('Event variable must be binary (0=censored, 1=event)')
        }

        // pyodideStats 래퍼 사용
        const result = await pyodideStats.kaplanMeierSurvival(times, events)

        const totalEvents = events.filter((e: number) => e === 1).length

        return {
          metadata: {
            method: method.id,
            methodName: method.name,
            timestamp: '',
            duration: 0,
            dataInfo: {
              totalN: times.length,
              missingRemoved: 0
            }
          },
          mainResults: {
            statistic: result.medianSurvival || 0,
            pvalue: 1, // Kaplan-Meier는 p-value 없음
            significant: false,
            interpretation: result.medianSurvival
              ? `중앙 생존 시간: ${result.medianSurvival.toFixed(2)}`
              : '중앙 생존 시간을 계산할 수 없습니다'
          },
          additionalInfo: {},
          visualizationData: {
            type: 'survival-curve',
            data: {
              timePoints: result.times,
              survivalProbabilities: result.survivalFunction
            }
          },
          rawResults: { ...result, totalEvents, sampleSize: times.length }
        }
      }
      case 'cox-regression': {
        const rawEvents = data.arrays.event || []

        // Validate event variable is provided
        if (rawEvents.length === 0) {
          throw new Error('Cox regression requires an event variable (0=censored, 1=event)')
        }

        const rawData = data.data as Array<Record<string, unknown>>
        const depVar = (data.variables?.dependent || data.variables?.dependentVar) as string | string[] | undefined
        const eventVar = data.variables?.event as string | undefined
        const indVars = (data.variables?.independent || data.variables?.independentVar) as string | string[] | undefined
        const depName = Array.isArray(depVar) ? depVar[0] : depVar
        const indNames = indVars ? (Array.isArray(indVars) ? indVars : [indVars]) : []

        // Build aligned arrays from raw data
        const alignedData: { time: number; event: number; covariates: number[] }[] = []

        if (depName && eventVar && indNames.length > 0) {
          for (const row of rawData) {
            const time = Number(row[depName])
            const event = Number(row[eventVar])
            const covs = indNames.map(name => Number(row[name]))

            if (!isNaN(time) && !isNaN(event) && covs.every(c => !isNaN(c))) {
              alignedData.push({ time, event, covariates: covs })
            }
          }
        }

        if (alignedData.length === 0) {
          throw new Error('No valid time-event-covariate tuples found')
        }

        const times = alignedData.map(d => d.time)
        const events = alignedData.map(d => d.event)

        // Validate events are binary
        const uniqueEvents = [...new Set(events)]
        if (!uniqueEvents.every(e => e === 0 || e === 1)) {
          throw new Error('Event variable must be binary (0=censored, 1=event)')
        }

        // Build covariate matrix (column-major for pyodideStats)
        const nCovariates = indNames.length
        const covariateData: number[][] = []
        for (let j = 0; j < nCovariates; j++) {
          covariateData.push(alignedData.map(d => d.covariates[j]))
        }

        const covariateNames = (data.variables?.independentNames as string[]) ||
          (indNames.length > 0 ? indNames : covariateData.map((_: unknown, i: number) => `X${i + 1}`))

        // pyodideStats 래퍼 사용
        const result = await pyodideStats.coxRegression(times, events, covariateData, covariateNames)

        // 가장 유의한 변수의 p-value
        const minPValue = Math.min(...result.pValues)

        return {
          metadata: {
            method: method.id,
            methodName: method.name,
            timestamp: '',
            duration: 0,
            dataInfo: {
              totalN: times.length,
              missingRemoved: 0
            }
          },
          mainResults: {
            statistic: result.concordance || 0,
            pvalue: minPValue,
            significant: minPValue < 0.05,
            interpretation: `Concordance: ${(result.concordance || 0).toFixed(3)}, ${result.pValues.filter(p => p < 0.05).length}개 변수가 유의함`
          },
          additionalInfo: {},
          visualizationData: {
            type: 'forest-plot',
            data: {
              covariateNames,
              hazardRatios: result.hazardRatios,
              confidenceIntervals: result.confidenceIntervals
            }
          },
          rawResults: { ...result, covariateNames, sampleSize: times.length }
        }
      }
      default:
        throw new Error(`지원되지 않는 생존 분석: ${method.id}`)
    }
  }

  /**
   * 실험 설계 분석 실행 (검정력 분석 등)
   */
  private async executeDesign(
    method: StatisticalMethod,
    data: PreparedData
  ): Promise<AnalysisResult> {
    switch (method.id) {
      case 'power-analysis': {
        // pyodideStats 래퍼 사용
        const testType = (data.variables?.testType as string) || 't-test'
        const analysisType = (data.variables?.analysisType as string) || 'a-priori'
        const alpha = (data.variables?.alpha as number) || 0.05
        const power = (data.variables?.power as number) || 0.8
        const effectSize = (data.variables?.effectSize as number) || 0.5
        const sampleSize = data.totalN || 30
        const sides = (data.variables?.sides as string) || 'two-sided'

        const result = await pyodideStats.powerAnalysis(
          testType as 't-test' | 'anova' | 'correlation' | 'chi-square' | 'regression',
          analysisType as 'a-priori' | 'post-hoc' | 'compromise' | 'criterion',
          { alpha, power, effectSize, sampleSize, sides: sides as 'two-sided' | 'one-sided' }
        )

        return {
          metadata: {
            method: method.id,
            methodName: method.name,
            timestamp: '',
            duration: 0,
            dataInfo: {
              totalN: sampleSize,
              missingRemoved: 0
            }
          },
          mainResults: {
            statistic: result.achievedPower || result.requiredSampleSize || 0,
            pvalue: typeof result.alpha === 'number' ? result.alpha : 0.05,
            significant: (result.achievedPower || 0) >= 0.8,
            interpretation: `${analysisType} 분석 완료: ${result.requiredSampleSize ? `필요 표본 크기 ${result.requiredSampleSize}` : `검정력 ${(result.achievedPower || 0).toFixed(3)}`}`
          },
          additionalInfo: {
            effectSize: result.effectSize ? {
              type: "Cohen's d",
              value: result.effectSize,
              interpretation: this.interpretCohensD(result.effectSize)
            } : undefined
          },
          rawResults: result
        }
      }
      default:
        throw new Error(`지원되지 않는 실험 설계 분석: ${method.id}`)
    }
  }

  /**
   * 카이제곱 검정 실행
   * raw data에서 contingency table을 구성한 후 chi_square_independence_test 호출
   */
  private async executeChiSquare(
    method: StatisticalMethod,
    data: PreparedData
  ): Promise<AnalysisResult> {
    // 독립변수(행)와 종속변수(열) 추출 - VariableMapping 호환 (independentVar/independent 모두 지원)
    const rawIndependent = data.variables.independentVar || data.variables.independent || data.variables.groupVar || data.variables.group
    const independentVar = rawIndependent
      ? (Array.isArray(rawIndependent) ? (rawIndependent as string[])[0] : rawIndependent as string)
      : undefined

    const rawDependent = data.variables.dependentVar || data.variables.dependent
    const dependentVar = rawDependent
      ? (Array.isArray(rawDependent) ? (rawDependent as string[])[0] : rawDependent as string)
      : undefined

    if (!independentVar || !dependentVar) {
      throw new Error('카이제곱 검정을 위해 독립변수와 종속변수가 필요합니다')
    }

    // raw data에서 contingency table 구성
    const crosstab = new Map<string, Map<string, number>>()
    data.data.forEach(row => {
      const rowVal = String(row[independentVar] ?? '')
      const colVal = String(row[dependentVar] ?? '')
      if (!rowVal || !colVal) return

      if (!crosstab.has(rowVal)) {
        crosstab.set(rowVal, new Map())
      }
      const innerMap = crosstab.get(rowVal)!
      innerMap.set(colVal, (innerMap.get(colVal) || 0) + 1)
    })

    // 모든 고유 열 값 수집
    const colLabels: string[] = []
    const allColValues = new Set<string>()
    crosstab.forEach(innerMap => {
      innerMap.forEach((_, col) => allColValues.add(col))
    })
    colLabels.push(...Array.from(allColValues))

    // contingency table 배열 구성
    const contingencyTable: number[][] = []
    const rowLabels: string[] = []
    crosstab.forEach((innerMap, rowLabel) => {
      rowLabels.push(rowLabel)
      const row: number[] = colLabels.map(col => innerMap.get(col) || 0)
      contingencyTable.push(row)
    })

    if (contingencyTable.length === 0 || contingencyTable[0].length === 0) {
      throw new Error('유효한 교차표를 생성할 수 없습니다')
    }

    // chi_square_independence_test 호출 (Cramer's V 포함)
    const result = await pyodideStats.chiSquareIndependenceTest(contingencyTable)

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
        statistic: result.chiSquare,
        pvalue: result.pValue,
        df: result.degreesOfFreedom,
        significant: result.reject,
        interpretation: result.reject ?
          '변수 간 유의한 연관성이 있습니다' :
          '변수 간 유의한 연관성이 없습니다'
      },
      additionalInfo: {
        effectSize: {
          type: "Cramer's V",
          value: result.cramersV,
          interpretation: this.interpretCramersV(result.cramersV)
        }
      },
      visualizationData: {
        type: 'contingency-table',
        data: {
          matrix: contingencyTable,
          expected: result.expectedMatrix,
          rowLabels,
          colLabels
        }
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
