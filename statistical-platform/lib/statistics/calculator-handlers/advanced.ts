/**
 * 고급 분석 핸들러
 *
 * PCA, K-means, 계층적 군집, 시계열 분석, 생존 분석 등
 */

import type { CalculatorContext, HandlerMap, CalculationResult } from '../calculator-types'
import {
  extractNumericColumn,
  formatPValue,
  ERROR_MESSAGES
} from './common-utils'

export const createAdvancedHandlers = (context: CalculatorContext): HandlerMap => ({
  pca: (data, parameters) => principalComponentAnalysis(context, data, parameters),
  kMeansClustering: (data, parameters) => kMeansClustering(context, data, parameters),
  hierarchicalClustering: (data, parameters) => hierarchicalClustering(context, data, parameters),
  timeSeriesDecomposition: (data, parameters) => timeSeriesDecomposition(context, data, parameters),
  arimaForecast: (data, parameters) => arimaForecast(context, data, parameters),
  kaplanMeierSurvival: (data, parameters) => kaplanMeierSurvival(context, data, parameters),
  mixedEffectsModel: (data, parameters) => mixedEffectsModel(context, data, parameters),
  sarimaForecast: (data, parameters) => sarimaForecast(context, data, parameters),
  varModel: (data, parameters) => varModel(context, data, parameters),
  coxRegression: (data, parameters) => coxRegression(context, data, parameters)
})

/**
 * 주성분 분석 (PCA)
 */
const principalComponentAnalysis = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const columns = parameters.columns
  const nComponents = parameters.nComponents || 2

  if (!columns || columns.length < 2) {
    return { success: false, error: '최소 2개 이상의 변수가 필요합니다' }
  }

  // 데이터 행렬 구성
  const dataMatrix: number[][] = []
  data.forEach(row => {
    const values: number[] = []
    let valid = true

    columns.forEach((col: string) => {
      const value = parseFloat(row[col])
      if (isNaN(value)) {
        valid = false
      } else {
        values.push(value)
      }
    })

    if (valid) {
      dataMatrix.push(values)
    }
  })

  if (dataMatrix.length < 3) {
    return { success: false, error: ERROR_MESSAGES.INSUFFICIENT_DATA(3) }
  }

  const result = await context.pyodideService.performPCA(dataMatrix, columns, nComponents)

  // 분산 설명률 테이블
  const varianceTable = result.components.map((comp: any, idx: number) => ({
    '주성분': `PC${idx + 1}`,
    '고유값': comp.eigenvalue?.toFixed(4) ?? '-',
    '분산 비율': `${(comp.varianceRatio * 100).toFixed(2)}%`,
    '누적 분산': `${(comp.cumulativeVariance * 100).toFixed(2)}%`
  }))

  // 적재량 테이블
  const loadingsTable = columns.map((col: string, idx: number) => {
    const row: Record<string, any> = { 변수: col }
    result.components.forEach((comp: any, pcIdx: number) => {
      row[`PC${pcIdx + 1}`] = comp.loadings?.[idx]?.toFixed(4) ?? '-'
    })
    return row
  })

  return {
    success: true,
    data: {
      metrics: [
        { name: '주성분 개수', value: result.components.length.toString() },
        { name: '누적 분산 설명률', value: `${(result.totalVarianceExplained * 100).toFixed(2)}%` }
      ],
      tables: [
        { name: '주성분 분산', data: varianceTable },
        { name: '주성분 적재량', data: loadingsTable }
      ],
      charts: result.scores ? [
        {
          type: 'scatter',
          data: {
            x: result.scores.map((s: any) => s[0]),
            y: result.scores.map((s: any) => s[1])
          },
          title: 'PCA Score Plot (PC1 vs PC2)'
        }
      ] : [],
      interpretation: `주성분 분석 결과, ${result.components.length}개의 주성분이 원 변수들의 분산 중 ${(result.totalVarianceExplained * 100).toFixed(2)}%를 설명합니다.`
    }
  }
}

/**
 * K-means 군집분석
 */
const kMeansClustering = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const columns = parameters.columns
  const k = parameters.k || 3

  if (!columns || columns.length < 1) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('변수') }
  }

  // 데이터 행렬 구성
  const dataMatrix: number[][] = []
  data.forEach(row => {
    const values: number[] = []
    let valid = true

    columns.forEach((col: string) => {
      const value = parseFloat(row[col])
      if (isNaN(value)) {
        valid = false
      } else {
        values.push(value)
      }
    })

    if (valid) {
      dataMatrix.push(values)
    }
  })

  const result = await context.pyodideService.kMeansClustering(dataMatrix, k, columns)

  // 군집별 크기
  const clusterSizes = result.labels.reduce((acc: Record<number, number>, label: number) => {
    acc[label] = (acc[label] || 0) + 1
    return acc
  }, {})

  const clusterTable = Object.entries(clusterSizes).map(([cluster, size]) => ({
    군집: `군집 ${parseInt(cluster) + 1}`,
    크기: size
  }))

  return {
    success: true,
    data: {
      metrics: [
        { name: '군집 수 (k)', value: k.toString() },
        { name: 'Inertia', value: result.inertia?.toFixed(4) ?? '-' }
      ],
      tables: [
        { name: '군집별 크기', data: clusterTable }
      ],
      interpretation: `K-means 군집분석 결과, ${k}개 군집으로 데이터를 분류했습니다. Inertia = ${result.inertia?.toFixed(4) ?? 'N/A'}`
    }
  }
}

/**
 * 계층적 군집분석
 */
const hierarchicalClustering = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const columns = parameters.columns
  const method = parameters.method || 'ward'
  const metric = parameters.metric || 'euclidean'

  if (!columns || columns.length < 1) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('변수') }
  }

  // 데이터 행렬 구성
  const dataMatrix: number[][] = []
  data.forEach(row => {
    const values: number[] = []
    let valid = true

    columns.forEach((col: string) => {
      const value = parseFloat(row[col])
      if (isNaN(value)) {
        valid = false
      } else {
        values.push(value)
      }
    })

    if (valid) {
      dataMatrix.push(values)
    }
  })

  const result = await context.pyodideService.hierarchicalClustering(dataMatrix, method, metric, columns)

  return {
    success: true,
    data: {
      metrics: [
        { name: '연결 방법', value: method },
        { name: '거리 측정', value: metric },
        { name: '샘플 수', value: dataMatrix.length.toString() }
      ],
      tables: [],
      interpretation: `계층적 군집분석을 ${method} 연결법과 ${metric} 거리로 수행했습니다.`
    }
  }
}

/**
 * 시계열 분해
 */
const timeSeriesDecomposition = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const valueColumn = parameters.valueColumn
  const period = parameters.period || 12
  const model = parameters.model || 'additive'

  if (!valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('시계열 값') }
  }

  const values = extractNumericColumn(data, valueColumn)

  if (values.length < period * 2) {
    return { success: false, error: `최소 ${period * 2}개 이상의 데이터가 필요합니다` }
  }

  const result = await context.pyodideService.timeSeriesDecomposition(values, period, model)

  return {
    success: true,
    data: {
      metrics: [
        { name: '주기', value: period.toString() },
        { name: '모형', value: model },
        { name: '데이터 수', value: values.length.toString() }
      ],
      tables: [],
      charts: [
        {
          type: 'line',
          data: { x: Array.from({ length: values.length }, (_, i) => i), y: values },
          title: '원 시계열'
        }
      ],
      interpretation: `시계열을 ${model} 모형으로 분해했습니다 (주기 = ${period}).`
    }
  }
}

/**
 * ARIMA 예측
 */
const arimaForecast = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const valueColumn = parameters.valueColumn
  const order = parameters.order || [1, 1, 1]
  const steps = parameters.steps || 10

  if (!valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('시계열 값') }
  }

  const values = extractNumericColumn(data, valueColumn)

  const result = await context.pyodideService.arimaForecast(values, order, steps)

  return {
    success: true,
    data: {
      metrics: [
        { name: 'ARIMA 차수', value: `(${order.join(', ')})` },
        { name: '예측 단계', value: steps.toString() },
        { name: 'AIC', value: result.aic?.toFixed(4) ?? '-' }
      ],
      tables: [],
      interpretation: `ARIMA${order} 모형으로 ${steps}단계 예측을 수행했습니다.`
    }
  }
}

/**
 * Kaplan-Meier 생존분석
 */
const kaplanMeierSurvival = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const timeColumn = parameters.timeColumn
  const eventColumn = parameters.eventColumn

  if (!timeColumn || !eventColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['시간', '사건']) }
  }

  const times = extractNumericColumn(data, timeColumn)
  const events = extractNumericColumn(data, eventColumn)

  const result = await context.pyodideService.kaplanMeierSurvival(times, events)

  return {
    success: true,
    data: {
      metrics: [
        { name: '중앙 생존시간', value: result.medianSurvival?.toFixed(2) ?? '-' },
        { name: '관측 수', value: times.length.toString() },
        { name: '사건 수', value: events.filter((e: number) => e === 1).length.toString() }
      ],
      tables: [],
      interpretation: `Kaplan-Meier 생존분석 결과, 중앙 생존시간은 ${result.medianSurvival?.toFixed(2) ?? 'N/A'}입니다.`
    }
  }
}

/**
 * 혼합 효과 모형
 */
const mixedEffectsModel = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const dependentColumn = parameters.dependentColumn
  const fixedEffects = parameters.fixedEffects || []
  const randomEffects = parameters.randomEffects || []

  if (!dependentColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('종속변수') }
  }

  const result = await context.pyodideService.mixedEffectsModel(
    data,
    dependentColumn,
    fixedEffects,
    randomEffects
  )

  return {
    success: true,
    data: {
      metrics: [
        { name: 'AIC', value: result.aic?.toFixed(4) ?? '-' },
        { name: 'BIC', value: result.bic?.toFixed(4) ?? '-' }
      ],
      tables: [],
      interpretation: `혼합 효과 모형 분석을 완료했습니다.`
    }
  }
}

/**
 * SARIMA 예측
 */
const sarimaForecast = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const valueColumn = parameters.valueColumn
  const order = parameters.order || [1, 1, 1]
  const seasonalOrder = parameters.seasonalOrder || [1, 1, 1, 12]
  const steps = parameters.steps || 10

  if (!valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('시계열 값') }
  }

  const values = extractNumericColumn(data, valueColumn)

  const result = await context.pyodideService.sarimaForecast(values, order, seasonalOrder, steps)

  return {
    success: true,
    data: {
      metrics: [
        { name: 'SARIMA 차수', value: `${order} × ${seasonalOrder}` },
        { name: '예측 단계', value: steps.toString() }
      ],
      tables: [],
      interpretation: `SARIMA 모형으로 ${steps}단계 계절 예측을 수행했습니다.`
    }
  }
}

/**
 * VAR 모형
 */
const varModel = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const columns = parameters.columns
  const lag = parameters.lag || 1

  if (!columns || columns.length < 2) {
    return { success: false, error: '최소 2개 이상의 시계열 변수가 필요합니다' }
  }

  const dataMatrix = columns.map((col: string) => extractNumericColumn(data, col))

  const result = await context.pyodideService.varModel(dataMatrix, lag, columns)

  return {
    success: true,
    data: {
      metrics: [
        { name: '변수 수', value: columns.length.toString() },
        { name: '시차 (lag)', value: lag.toString() }
      ],
      tables: [],
      interpretation: `VAR(${lag}) 모형으로 ${columns.length}개 시계열을 분석했습니다.`
    }
  }
}

/**
 * Cox 비례위험 회귀
 */
const coxRegression = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const timeColumn = parameters.timeColumn
  const eventColumn = parameters.eventColumn
  const covariates = parameters.covariates || []

  if (!timeColumn || !eventColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['시간', '사건']) }
  }

  if (covariates.length === 0) {
    return { success: false, error: '최소 1개 이상의 공변량이 필요합니다' }
  }

  const times = extractNumericColumn(data, timeColumn)
  const events = extractNumericColumn(data, eventColumn)
  const covariateData = covariates.map((col: string) => extractNumericColumn(data, col))

  const result = await context.pyodideService.coxRegression(times, events, covariateData, covariates)

  // 계수 테이블
  const coeffTable = covariates.map((covariate: string, idx: number) => ({
    공변량: covariate,
    계수: result.coefficients?.[idx]?.toFixed(4) ?? '-',
    '위험비 (HR)': result.hazardRatios?.[idx]?.toFixed(4) ?? '-',
    'p-value': formatPValue(result.pValues?.[idx] ?? 1)
  }))

  return {
    success: true,
    data: {
      metrics: [
        { name: '공변량 수', value: covariates.length.toString() },
        { name: 'Concordance', value: result.concordance?.toFixed(4) ?? '-' }
      ],
      tables: [
        { name: 'Cox 회귀 계수', data: coeffTable }
      ],
      interpretation: `Cox 비례위험 회귀분석으로 ${covariates.length}개 공변량의 생존 영향을 분석했습니다.`
    }
  }
}
