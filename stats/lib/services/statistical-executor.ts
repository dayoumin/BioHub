/**
 * 통계 분석 실행 매핑 서비스
 * 29개 통계 메서드를 실제 Pyodide 함수와 연결
 */

import type { StatisticalMethod } from '@/types/analysis'
import type { SuggestedSettings } from '@/types/analysis'
import { logger } from '../utils/logger'
import {
  handleDescriptive,
  handleTTest,
  handleANOVA,
  handleRegression,
  handleCorrelation,
  handleNonparametric,
  handleChiSquare,
  handleMultivariate,
  handleTimeSeries,
  handleReliability,
  handleSurvival,
  handleDesign,
} from './handlers'
import type { NormalizedPostHocComparison } from './handlers/shared-helpers'

// Re-export for backward compatibility (used in StatisticalExecutorResult.additionalInfo.postHoc)
export type { NormalizedPostHocComparison }

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
    statisticName?: string
    pvalue: number
    df?: number | [number, number]
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
    postHoc?: NormalizedPostHocComparison[]
    postHocMethod?: string
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
 * TD-2: 슬롯 출력 키 → executor/handler 기대 키 정규화
 *
 * 슬롯 UI는 사용자 친화적 mappingKey를 쓰지만 handler는 다른 키를 기대:
 * - survival: timeVar → dependentVar (handler는 dependent에서 시간 변수 읽음)
 * - repeated-measures: variables → within (handler는 within 배열 기대)
 * - manova: variables → dependent (handler는 dependent 배열 기대)
 */
export function normalizeSlotMapping(
  variables: Record<string, unknown>,
  methodId: string
): Record<string, unknown> {
  const result = { ...variables }

  switch (methodId) {
    case 'kaplan-meier':
    case 'cox-regression':
      // survival: timeVar → dependent (handler는 variables.dependent에서 시간 읽음)
      if (result.timeVar && !result.dependent && !result.dependentVar) {
        result.dependentVar = result.timeVar
        delete result.timeVar
      }
      // cox: independentVar가 comma-joined string이면 split
      if (typeof result.independentVar === 'string' && result.independentVar.includes(',')) {
        result.independentVar = (result.independentVar as string).split(',')
      }
      break

    case 'repeated-measures-anova':
      // repeated-measures: variables[] → within[] (handler는 within에서 반복측정 변수 읽음)
      if (Array.isArray(result.variables) && !result.within) {
        result.within = result.variables
        delete result.variables
      }
      break

    // friedman: variables[] 유지 — prepareData의 friedman 특수 분기가
    // variablesArray → arrays.independent로 변환함 (line 451-456)

    case 'manova':
      // manova: variables[] → dependent[] (handler는 data.variables.dependent 직접 읽음)
      if (Array.isArray(result.variables) && !result.dependent && !result.dependentVar) {
        result.dependent = result.variables
        delete result.variables
      }
      // manova: groupVar → group (handler는 data.variables.group 직접 읽음)
      if (result.groupVar && !result.group) {
        result.group = result.groupVar
        delete result.groupVar
      }
      break

    case 'mixed-model':
      if (result.dependentVar && !result.dependent) {
        result.dependent = [result.dependentVar]
        delete result.dependentVar
      }
      if (typeof result.groupVar === 'string' && !result.independent) {
        result.independent = result.groupVar.split(',').map((value) => value.trim()).filter(Boolean)
        delete result.groupVar
      }
      if (typeof result.blocking === 'string') {
        result.blocking = result.blocking.split(',').map((value) => value.trim()).filter(Boolean)
      }
      break

    case 'discriminant':
    case 'discriminant-analysis':
      if (result.dependentVar && !result.group && !result.groupVar) {
        result.groupVar = result.dependentVar
        delete result.dependentVar
      }
      if (typeof result.independentVar === 'string' && result.independentVar.includes(',')) {
        result.independentVar = result.independentVar.split(',').map((value) => value.trim()).filter(Boolean)
      }
      break
  }

  return result
}

export class StatisticalExecutor {
  private static instance: StatisticalExecutor

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
   *   - alpha: 유의수준 (기본 0.05)
   *   - postHoc: 사후검정 방법 (tukey, games-howell, bonferroni, scheffe)
   *   - alternative: 검정 방향 (two-sided, less, greater) — t-test 계열
   */
  async executeMethod(
    method: StatisticalMethod,
    data: unknown[],
    variables: Record<string, unknown> = {},
    settings?: SuggestedSettings | null
  ): Promise<StatisticalExecutorResult> {
    const startTime = Date.now()
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
      let result: StatisticalExecutorResult

      // 레거시 카테고리명 마이그레이션 (sessionStorage에 잔존 가능)
      const rawCategory = method.category as string
      const category = (
        rawCategory === 'advanced' || rawCategory === 'pca' || rawCategory === 'clustering'
      ) ? 'multivariate' : method.category

      switch (category) {
        case 'descriptive':
          result = await handleDescriptive(method, preparedData)
          break
        case 't-test':
          result = await handleTTest(method, preparedData, settings)
          break
        case 'anova':
          result = await handleANOVA(method, preparedData, settings)
          break
        case 'regression':
          result = await handleRegression(method, preparedData)
          break
        case 'correlation':
          result = await handleCorrelation(method, preparedData)
          break
        case 'nonparametric':
          result = await handleNonparametric(method, preparedData, settings)
          break
        case 'chi-square':
          result = await handleChiSquare(method, preparedData)
          break
        case 'multivariate':
          result = await handleMultivariate(method, preparedData)
          break
        case 'timeseries':
          result = await handleTimeSeries(method, preparedData)
          break
        case 'psychometrics':
          result = await handleReliability(method, preparedData)
          break
        case 'survival':
          result = await handleSurvival(method, preparedData)
          break
        case 'design':
          result = await handleDesign(method, preparedData, settings)
          break
        default:
          throw new Error(`지원되지 않는 분석 카테고리: ${category}`)
      }

      // 메타데이터 추가
      result.metadata.duration = (Date.now() - startTime) / 1000
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
    // TD-2: 슬롯 출력 → executor 기대 키 정규화
    // slot-configs는 UI 친화적 키(timeVar, variables)를 쓰지만,
    // handler는 다른 키(dependent, within)를 기대함
    variables = normalizeSlotMapping(variables, method.id)

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
      if (variablesArray.length === 2 && (method.id === 'paired-t' || method.id === 'wilcoxon' || method.id === 'wilcoxon-signed-rank' || method.id === 'sign-test' || method.id === 'mcnemar')) {
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
      // Friedman: 모든 variables → independent (반복측정 변수 3개 이상)
      else if (method.id === 'friedman') {
        arrays.independent = variablesArray.map((col: string) =>
          data.map(row => Number(row[col])).filter(v => !isNaN(v))
        )
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
      // null/undefined 그룹 제외 — String(null)="null" 문자열 그룹 생성 방지
      const groups = [...new Set(data.map(row => row[group]))].filter(
        grp => grp != null && grp !== ''
      )
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
    // 주요 변수(dependent → variables[0] 순)에서 NaN인 행 수 계산
    const primaryCol = dependent.length > 0 ? dependent[0] : variablesArray[0]
    prepared.missingRemoved = primaryCol
      ? data.filter(row => isNaN(Number(row[primaryCol]))).length
      : 0

    return prepared
  }
}
