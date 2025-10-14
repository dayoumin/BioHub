/**
 * Advanced Statistics Group
 *
 * 고급 통계 그룹 (12개 메서드)
 * - Worker 4 전용 (Regression과 함께)
 * - 패키지: NumPy, SciPy, Statsmodels, Sklearn
 */

import type { GroupModule, MethodHandler, CalculationResult } from '../registry/types'
import type { CalculatorContext } from '../calculator-types'

export function createAdvancedGroup(context: CalculatorContext): GroupModule {
  return {
    id: 'advanced',
    methods: [
      'pca',
      'factorAnalysis',
      'clusterAnalysis',
      'discriminantAnalysis',
      'canonicalCorrelation',
      'survivalAnalysis',
      'timeSeries',
      'metaAnalysis',
      'sem',
      'multilevelModel',
      'mediation',
      'moderation'
    ],
    handlers: {
      pca: createPCAHandler(context),
      factorAnalysis: createFactorAnalysisHandler(context),
      clusterAnalysis: createClusterAnalysisHandler(context),
      discriminantAnalysis: createDiscriminantAnalysisHandler(context),
      canonicalCorrelation: createCanonicalCorrelationHandler(context),
      survivalAnalysis: createSurvivalAnalysisHandler(context),
      timeSeries: createTimeSeriesHandler(context),
      metaAnalysis: createMetaAnalysisHandler(context),
      sem: createSEMHandler(context),
      multilevelModel: createMultilevelModelHandler(context),
      mediation: createMediationHandler(context),
      moderation: createModerationHandler(context)
    }
  }
}

function createPCAHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const dataMatrix = paramsObj.dataMatrix
    const nComponents = paramsObj.nComponents

    if (!Array.isArray(dataMatrix)) {
      return { success: false, error: '데이터 행렬을 제공하세요' }
    }

    const result = await context.pyodideService.pca(dataMatrix)
    return {
      success: true,
      data: {
        metrics: [
          { name: '주성분 개수', value: result.components.length },
          { name: '누적 설명 분산', value: (result.totalExplainedVariance * 100).toFixed(2) + '%' }
        ],
        interpretation: `주성분 분석 결과`
      }
    }
  }
}

function createFactorAnalysisHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const dataMatrix = paramsObj.dataMatrix
    const nFactors = paramsObj.nFactors

    if (!Array.isArray(dataMatrix)) {
      return { success: false, error: '데이터 행렬을 제공하세요' }
    }

    const nFactorsNum = typeof nFactors === 'number' ? nFactors : 2

    const result = await context.pyodideService.factorAnalysis(dataMatrix, { nFactors: nFactorsNum })
    return {
      success: true,
      data: {
        metrics: [
          { name: '요인 개수', value: result.loadings.length }
        ],
        interpretation: `요인분석 결과`
      }
    }
  }
}

function createClusterAnalysisHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const dataMatrix = paramsObj.dataMatrix
    const nClusters = paramsObj.nClusters

    if (!Array.isArray(dataMatrix)) {
      return { success: false, error: '데이터 행렬을 제공하세요' }
    }

    const nClustersNum = typeof nClusters === 'number' ? nClusters : 3

    const result = await context.pyodideService.clusterAnalysis(dataMatrix, { nClusters: nClustersNum })
    return {
      success: true,
      data: {
        metrics: [
          { name: '군집 개수', value: new Set(result.clusters).size },
          { name: 'Silhouette Score', value: result.silhouetteScore.toFixed(4) }
        ],
        interpretation: `군집분석 결과`
      }
    }
  }
}

function createDiscriminantAnalysisHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X)) {
      return { success: false, error: '독립변수 행렬(X)을 제공하세요' }
    }

    if (!Array.isArray(y)) {
      return { success: false, error: '종속변수 배열(y)을 제공하세요' }
    }

    // Note: discriminantAnalysis method will be added to PyodideService later
    const result = await (context.pyodideService as any).discriminantAnalysis(X, y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '정확도', value: (result.accuracy * 100).toFixed(2) + '%' }
        ],
        interpretation: `판별분석 결과`
      }
    }
  }
}

function createCanonicalCorrelationHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const Y = paramsObj.Y

    if (!Array.isArray(X)) {
      return { success: false, error: '첫 번째 변수 집합(X)을 제공하세요' }
    }

    if (!Array.isArray(Y)) {
      return { success: false, error: '두 번째 변수 집합(Y)을 제공하세요' }
    }

    // Note: canonicalCorrelation method will be added to PyodideService later
    const result = await (context.pyodideService as any).canonicalCorrelation(X, Y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '정준상관계수', value: result.correlation.toFixed(4) }
        ],
        interpretation: `정준상관분석 결과`
      }
    }
  }
}

function createSurvivalAnalysisHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const times = paramsObj.times
    const events = paramsObj.events

    if (!Array.isArray(times)) {
      return { success: false, error: '생존 시간 배열을 제공하세요' }
    }

    if (!Array.isArray(events)) {
      return { success: false, error: '이벤트 발생 배열을 제공하세요' }
    }

    // Note: survivalAnalysis method will be added to PyodideService later
    const result = await (context.pyodideService as any).survivalAnalysis(times, events)
    return {
      success: true,
      data: {
        metrics: [
          { name: '중앙 생존 시간', value: result.medianSurvival.toFixed(2) }
        ],
        interpretation: `생존분석 결과`
      }
    }
  }
}

function createTimeSeriesHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const timeSeriesData = paramsObj.data
    const order = paramsObj.order

    if (!Array.isArray(timeSeriesData)) {
      return { success: false, error: '시계열 데이터 배열을 제공하세요' }
    }

    // Note: timeSeries method will be added to PyodideService later
    const result = await (context.pyodideService as any).timeSeries(timeSeriesData, order)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'AIC', value: result.aic.toFixed(2) }
        ],
        interpretation: `시계열 분석 결과`
      }
    }
  }
}

function createMetaAnalysisHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const effectSizes = paramsObj.effectSizes
    const variances = paramsObj.variances

    if (!Array.isArray(effectSizes)) {
      return { success: false, error: '효과 크기 배열을 제공하세요' }
    }

    if (!Array.isArray(variances)) {
      return { success: false, error: '분산 배열을 제공하세요' }
    }

    // Note: metaAnalysis method will be added to PyodideService later
    const result = await (context.pyodideService as any).metaAnalysis(effectSizes, variances)
    return {
      success: true,
      data: {
        metrics: [
          { name: '통합 효과 크기', value: result.pooledEffect.toFixed(4) }
        ],
        interpretation: `메타분석 결과`
      }
    }
  }
}

function createSEMHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const model = paramsObj.model
    const semData = paramsObj.data

    if (!model) {
      return { success: false, error: '모형을 제공하세요' }
    }

    if (!semData) {
      return { success: false, error: '데이터를 제공하세요' }
    }

    // Note: sem method will be added to PyodideService later
    const result = await (context.pyodideService as any).sem(model, semData)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'CFI', value: result.cfi.toFixed(4) },
          { name: 'RMSEA', value: result.rmsea.toFixed(4) }
        ],
        interpretation: `구조방정식 모형 결과`
      }
    }
  }
}

function createMultilevelModelHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const multilevelData = paramsObj.data
    const formula = paramsObj.formula

    if (!multilevelData) {
      return { success: false, error: '데이터를 제공하세요' }
    }

    if (!formula || typeof formula !== 'string') {
      return { success: false, error: '모형 공식을 제공하세요' }
    }

    // Note: multilevelModel method will be added to PyodideService later
    const result = await (context.pyodideService as any).multilevelModel(multilevelData, formula)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'ICC', value: result.icc.toFixed(4) }
        ],
        interpretation: `다층모형 분석 결과`
      }
    }
  }
}

function createMediationHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const M = paramsObj.M
    const Y = paramsObj.Y

    if (!Array.isArray(X)) {
      return { success: false, error: '독립변수(X)를 제공하세요' }
    }

    if (!Array.isArray(M)) {
      return { success: false, error: '매개변수(M)를 제공하세요' }
    }

    if (!Array.isArray(Y)) {
      return { success: false, error: '종속변수(Y)를 제공하세요' }
    }

    // Note: mediation method will be added to PyodideService later
    const result = await (context.pyodideService as any).mediation(X, M, Y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '간접효과', value: result.indirectEffect.toFixed(4) },
          { name: '직접효과', value: result.directEffect.toFixed(4) }
        ],
        interpretation: `매개효과 분석 결과`
      }
    }
  }
}

function createModerationHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const M = paramsObj.M
    const Y = paramsObj.Y

    if (!Array.isArray(X)) {
      return { success: false, error: '독립변수(X)를 제공하세요' }
    }

    if (!Array.isArray(M)) {
      return { success: false, error: '조절변수(M)를 제공하세요' }
    }

    if (!Array.isArray(Y)) {
      return { success: false, error: '종속변수(Y)를 제공하세요' }
    }

    // Note: moderation method will be added to PyodideService later
    const result = await (context.pyodideService as any).moderation(X, M, Y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '상호작용 효과', value: result.interactionEffect.toFixed(4) }
        ],
        interpretation: `조절효과 분석 결과`
      }
    }
  }
}
