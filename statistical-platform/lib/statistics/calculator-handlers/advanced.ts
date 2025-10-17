/**
 * 고급 분석 핸들러
 *
 * PCA, K-means, 계층적 군집, 시계열 분석, 생존 분석 등
 *
 * Phase 6: PyodideCore 직접 연결
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow, MethodParameters } from '../calculator-types'
import type {
  PCAParams,
  KMeansClusteringParams,
  HierarchicalClusteringParams,
  TimeSeriesDecompositionParams,
  ARIMAForecastParams,
  KaplanMeierSurvivalParams,
  MixedEffectsModelParams,
  SARIMAForecastParams,
  VARModelParams,
  CoxRegressionParams
} from '../method-parameter-types'
import {
  extractNumericColumn,
  formatPValue,
  ERROR_MESSAGES
} from './common-utils'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type {
  PCAAnalysisResult,
  ClusterAnalysisResult,
  TimeSeriesDecompositionResult,
  ARIMAForecastResult,
  KaplanMeierSurvivalResult,
  MixedEffectsModelResult,
  SARIMAForecastResult,
  VARModelResult,
  CoxRegressionResult
} from '@/types/pyodide-results'

export const createAdvancedHandlers = (context: CalculatorContext): HandlerMap => ({
  pca: (data: DataRow[], parameters: MethodParameters) => principalComponentAnalysis(context, data, parameters),
  kMeansClustering: (data: DataRow[], parameters: MethodParameters) => kMeansClustering(context, data, parameters),
  hierarchicalClustering: (data: DataRow[], parameters: MethodParameters) => hierarchicalClustering(context, data, parameters),
  timeSeriesDecomposition: (data: DataRow[], parameters: MethodParameters) => timeSeriesDecomposition(context, data, parameters),
  arimaForecast: (data: DataRow[], parameters: MethodParameters) => arimaForecast(context, data, parameters),
  kaplanMeierSurvival: (data: DataRow[], parameters: MethodParameters) => kaplanMeierSurvival(context, data, parameters),
  mixedEffectsModel: (data: DataRow[], parameters: MethodParameters) => mixedEffectsModel(context, data, parameters),
  sarimaForecast: (data: DataRow[], parameters: MethodParameters) => sarimaForecast(context, data, parameters),
  varModel: (data: DataRow[], parameters: MethodParameters) => varModel(context, data, parameters),
  coxRegression: (data: DataRow[], parameters: MethodParameters) => coxRegression(context, data, parameters)
})

/**
 * 주성분 분석 (PCA)
 */
const principalComponentAnalysis = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { columns, nComponents = 2 } = parameters as PCAParams

  if (!columns || columns.length < 2) {
    return { success: false, error: '최소 2개 이상의 변수가 필요합니다' }
  }

  // 데이터 행렬 구성
  const dataMatrix: number[][] = []
  data.forEach(row => {
    const values: number[] = []
    let valid = true

    columns.forEach((col: string) => {
      const cellValue = row[col]
      const value = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue ?? ''))
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

  const result = await context.pyodideCore.callWorkerMethod<PCAAnalysisResult>(
    PyodideWorker.RegressionAdvanced,
    'pca_analysis',
    {
      data_matrix: dataMatrix,
      column_names: columns,
      n_components: nComponents
    }
  )

  // 분산 설명률 테이블
  const varianceTable = result.explainedVarianceRatio.map((ratio: number, idx: number) => ({
    '주성분': `PC${idx + 1}`,
    '고유값': result.explainedVariance[idx]?.toFixed(4) ?? '-',
    '분산 비율': `${(ratio * 100).toFixed(2)}%`,
    '누적 분산': `${(result.cumulativeVariance[idx] * 100).toFixed(2)}%`
  }))

  // 적재량 테이블
  const loadingsTable = columns.map((col: string, idx: number) => {
    const row: Record<string, string | number> = { 변수: col }
    result.components.forEach((comp: number[], pcIdx: number) => {
      row[`PC${pcIdx + 1}`] = comp[idx]?.toFixed(4) ?? '-'
    })
    return row
  })

  const totalVariance = result.cumulativeVariance[result.cumulativeVariance.length - 1] ?? 0

  return {
    success: true,
    data: {
      metrics: [
        { name: '주성분 개수', value: result.components.length.toString() },
        { name: '누적 분산 설명률', value: `${(totalVariance * 100).toFixed(2)}%` }
      ],
      tables: [
        { name: '주성분 분산', data: varianceTable },
        { name: '주성분 적재량', data: loadingsTable }
      ],
      interpretation: `주성분 분석 결과, ${result.components.length}개의 주성분이 원 변수들의 분산 중 ${(totalVariance * 100).toFixed(2)}%를 설명합니다.`
    }
  }
}

/**
 * K-means 군집분석
 */
const kMeansClustering = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { columns, k = 3 } = parameters as KMeansClusteringParams

  if (!columns || columns.length < 1) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('변수') }
  }

  // 데이터 행렬 구성
  const dataMatrix: number[][] = []
  data.forEach(row => {
    const values: number[] = []
    let valid = true

    columns.forEach((col: string) => {
      const cellValue = row[col]
      const value = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue ?? ''))
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

  // ✅ K-means 제약: n_samples >= n_clusters
  if (dataMatrix.length < k) {
    return { success: false, error: `유효한 데이터 수(${dataMatrix.length})가 군집 수(${k})보다 작습니다. 최소 ${k}개 이상의 유효한 데이터가 필요합니다.` }
  }

  const result = await context.pyodideCore.callWorkerMethod<ClusterAnalysisResult>(
    PyodideWorker.RegressionAdvanced,
    'kmeans_clustering',
    {
      data_matrix: dataMatrix,
      n_clusters: k,
      column_names: columns
    }
  )

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
        { name: 'Inertia', value: result.inertia.toFixed(4) },
        { name: 'Silhouette Score', value: result.silhouetteScore.toFixed(4) }
      ],
      tables: [
        { name: '군집별 크기', data: clusterTable }
      ],
      interpretation: `K-means 군집분석 결과, ${k}개 군집으로 데이터를 분류했습니다. Inertia = ${result.inertia.toFixed(4)}, Silhouette Score = ${result.silhouetteScore.toFixed(4)}`
    }
  }
}

/**
 * 계층적 군집분석
 */
const hierarchicalClustering = async (
  context: CalculatorContext,
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { columns, method = 'ward', metric = 'euclidean' } = parameters as HierarchicalClusteringParams

  if (!columns || columns.length < 1) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('변수') }
  }

  // 데이터 행렬 구성
  const dataMatrix: number[][] = []
  data.forEach(row => {
    const values: number[] = []
    let valid = true

    columns.forEach((col: string) => {
      const cellValue = row[col]
      const value = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue ?? ''))
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

  // ✅ 계층적 군집 제약: 최소 2개 이상
  if (dataMatrix.length < 2) {
    return { success: false, error: ERROR_MESSAGES.INSUFFICIENT_DATA(2) }
  }

  const result = await context.pyodideCore.callWorkerMethod<{ method: string; metric: string; nSamples: number }>(
    PyodideWorker.RegressionAdvanced,
    'hierarchical_clustering',
    {
      data_matrix: dataMatrix,
      method,
      metric,
      column_names: columns
    }
  )

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
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { valueColumn, period = 12, model = 'additive' } = parameters as TimeSeriesDecompositionParams

  if (!valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('시계열 값') }
  }

  const values = extractNumericColumn(data, valueColumn)

  if (values.length < period * 2) {
    return { success: false, error: `최소 ${period * 2}개 이상의 데이터가 필요합니다` }
  }

  const result = await context.pyodideCore.callWorkerMethod<TimeSeriesDecompositionResult>(
    PyodideWorker.RegressionAdvanced,
    'time_series_decomposition',
    {
      values,
      period,
      model
    }
  )

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
          data: { x: Array.from({ length: values.length }, (_, i) => i), y: values }
        } as any  // Chart title는 동적 구조
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
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { valueColumn, order = [1, 1, 1], steps = 10 } = parameters as ARIMAForecastParams

  if (!valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('시계열 값') }
  }

  const values = extractNumericColumn(data, valueColumn)

  // ✅ ARIMA 최소 길이 검증: p + d + q + 1 이상
  const minLength = order[0] + order[1] + order[2] + 1
  if (values.length < minLength) {
    return { success: false, error: `ARIMA(${order.join(',')}) 모형은 최소 ${minLength}개 이상의 데이터가 필요합니다 (현재: ${values.length}개)` }
  }

  const result = await context.pyodideCore.callWorkerMethod<ARIMAForecastResult>(
    PyodideWorker.RegressionAdvanced,
    'arima_forecast',
    {
      values,
      order,
      n_forecast: steps
    }
  )

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
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { timeColumn, eventColumn } = parameters as KaplanMeierSurvivalParams

  if (!timeColumn || !eventColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['시간', '사건']) }
  }

  // ✅ 행 단위 필터링: times와 events가 정렬 유지
  const times: number[] = []
  const events: number[] = []

  data.forEach(row => {
    const timeValue = row[timeColumn]
    const eventValue = row[eventColumn]
    const time = typeof timeValue === 'number' ? timeValue : parseFloat(String(timeValue ?? ''))
    const event = typeof eventValue === 'number' ? eventValue : parseFloat(String(eventValue ?? ''))

    // 둘 다 유효한 경우에만 추가 (행 순서 유지)
    if (!isNaN(time) && !isNaN(event)) {
      times.push(time)
      events.push(event)
    }
  })

  if (times.length < 2) {
    return { success: false, error: ERROR_MESSAGES.INSUFFICIENT_DATA(2) }
  }

  const result = await context.pyodideCore.callWorkerMethod<KaplanMeierSurvivalResult>(
    PyodideWorker.RegressionAdvanced,
    'kaplan_meier_survival',
    {
      times,
      events
    }
  )

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
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { dependentColumn, fixedEffects = [], randomEffects = [] } = parameters as MixedEffectsModelParams

  if (!dependentColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('종속변수') }
  }

  const result = await context.pyodideCore.callWorkerMethod<MixedEffectsModelResult>(
    PyodideWorker.RegressionAdvanced,
    'mixed_effects_model',
    {
      data: JSON.stringify(data),
      dependent_column: dependentColumn,
      fixed_effects: fixedEffects,
      random_effects: randomEffects
    }
  )

  return {
    success: true,
    data: {
      metrics: [
        { name: 'AIC', value: result.aic.toFixed(4) },
        { name: 'BIC', value: result.bic.toFixed(4) },
        { name: 'Log-Likelihood', value: result.logLikelihood.toFixed(4) }
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
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { valueColumn, order = [1, 1, 1], seasonalOrder = [1, 1, 1, 12], steps = 10 } =
    parameters as SARIMAForecastParams

  if (!valueColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('시계열 값') }
  }

  const values = extractNumericColumn(data, valueColumn)

  // ✅ SARIMA 최소 길이 검증: p + d + q + P + D + Q + s 이상
  const minLength = order[0] + order[1] + order[2] + seasonalOrder[0] + seasonalOrder[1] + seasonalOrder[2] + seasonalOrder[3]
  if (values.length < minLength) {
    return { success: false, error: `SARIMA${order}×${seasonalOrder} 모형은 최소 ${minLength}개 이상의 데이터가 필요합니다 (현재: ${values.length}개)` }
  }

  const result = await context.pyodideCore.callWorkerMethod<SARIMAForecastResult>(
    PyodideWorker.RegressionAdvanced,
    'sarima_forecast',
    {
      values,
      order,
      seasonal_order: seasonalOrder,
      n_forecast: steps
    }
  )

  return {
    success: true,
    data: {
      metrics: [
        { name: 'SARIMA 차수', value: `${order} × ${seasonalOrder}` },
        { name: '예측 단계', value: steps.toString() },
        { name: 'AIC', value: result.aic?.toFixed(4) ?? '-' }
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
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { columns, lag = 1 } = parameters as VARModelParams

  if (!columns || columns.length < 2) {
    return { success: false, error: '최소 2개 이상의 시계열 변수가 필요합니다' }
  }

  // ✅ 행 단위 필터링: 모든 열이 유효한 행만 포함
  // 결과: [[row1_col1, row1_col2, ...], [row2_col1, row2_col2, ...]]
  const dataMatrix: number[][] = []

  data.forEach(row => {
    const rowValues: number[] = []
    let allValid = true

    for (const col of columns) {
      const cellValue = row[col]
      const value = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue ?? ''))
      if (isNaN(value)) {
        allValid = false
        break
      }
      rowValues.push(value)
    }

    // 모든 열이 유효한 경우에만 추가 (행 순서 유지)
    if (allValid) {
      dataMatrix.push(rowValues)
    }
  })

  if (dataMatrix.length < lag + 2) {
    return { success: false, error: `최소 ${lag + 2}개 이상의 유효한 시계열 데이터가 필요합니다` }
  }

  const result = await context.pyodideCore.callWorkerMethod<VARModelResult>(
    PyodideWorker.RegressionAdvanced,
    'var_model',
    {
      data_matrix: dataMatrix,
      max_lags: lag,
      column_names: columns
    }
  )

  return {
    success: true,
    data: {
      metrics: [
        { name: '변수 수', value: columns.length.toString() },
        { name: '시차 (lag)', value: lag.toString() },
        { name: 'AIC', value: result.aic.toFixed(4) },
        { name: 'BIC', value: result.bic.toFixed(4) }
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
  data: DataRow[],
  parameters: MethodParameters
): Promise<CalculationResult> => {
  const { timeColumn, eventColumn, covariates = [] } = parameters as CoxRegressionParams

  if (!timeColumn || !eventColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['시간', '사건']) }
  }

  if (covariates.length === 0) {
    return { success: false, error: '최소 1개 이상의 공변량이 필요합니다' }
  }

  // ✅ 행 단위 필터링: 모든 값이 유효한 행만 포함
  const times: number[] = []
  const events: number[] = []
  const covariateData: number[][] = covariates.map(() => [])

  data.forEach(row => {
    const timeValue = row[timeColumn]
    const eventValue = row[eventColumn]
    const time = typeof timeValue === 'number' ? timeValue : parseFloat(String(timeValue ?? ''))
    const event = typeof eventValue === 'number' ? eventValue : parseFloat(String(eventValue ?? ''))

    // 공변량 값 추출
    const covValues: number[] = []
    let allValid = !isNaN(time) && !isNaN(event)

    for (const col of covariates) {
      const covValue = row[col]
      const cov = typeof covValue === 'number' ? covValue : parseFloat(String(covValue ?? ''))
      if (isNaN(cov)) {
        allValid = false
        break
      }
      covValues.push(cov)
    }

    // 모든 값이 유효한 경우에만 추가 (행 순서 유지)
    if (allValid) {
      times.push(time)
      events.push(event)
      covValues.forEach((val, idx) => covariateData[idx].push(val))
    }
  })

  if (times.length < covariates.length + 1) {
    return { success: false, error: `최소 ${covariates.length + 1}개 이상의 유효한 데이터가 필요합니다` }
  }

  const result = await context.pyodideCore.callWorkerMethod<CoxRegressionResult>(
    PyodideWorker.RegressionAdvanced,
    'cox_regression',
    {
      times,
      events,
      covariate_data: covariateData,
      covariate_names: covariates
    }
  )

  // 계수 테이블
  const coeffTable = covariates.map((covariate: string, idx: number) => ({
    공변량: covariate,
    계수: result.coefficients[idx].toFixed(4),
    '위험비 (HR)': result.hazardRatios[idx].toFixed(4),
    'p-value': formatPValue(result.pValues[idx])
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
