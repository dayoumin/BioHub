/**
 * Regression Analysis Group
 *
 * 회귀분석 그룹 (12개 메서드)
 * - Worker 4 전용 (Advanced와 함께)
 * - 패키지: NumPy, SciPy, Statsmodels
 */

import type { GroupModule, MethodHandler, CalculationResult } from '../registry/types'
import type { CalculatorContext } from '../calculator-types'

export function createRegressionGroup(context: CalculatorContext): GroupModule {
  return {
    id: 'regression',
    methods: [
      'linearRegression',
      'multipleRegression',
      'logisticRegression',
      'curveEstimation',
      'nonlinearRegression',
      'stepwiseRegression',
      'binaryLogistic',
      'multinomialLogistic',
      'ordinalLogistic',
      'probitRegression',
      'poissonRegression',
      'negativeBinomial'
    ],
    handlers: {
      linearRegression: createLinearRegressionHandler(context),
      multipleRegression: createMultipleRegressionHandler(context),
      logisticRegression: createLogisticRegressionHandler(context),
      curveEstimation: createCurveEstimationHandler(context),
      nonlinearRegression: createNonlinearRegressionHandler(context),
      stepwiseRegression: createStepwiseRegressionHandler(context),
      binaryLogistic: createBinaryLogisticHandler(context),
      multinomialLogistic: createMultinomialLogisticHandler(context),
      ordinalLogistic: createOrdinalLogisticHandler(context),
      probitRegression: createProbitRegressionHandler(context),
      poissonRegression: createPoissonRegressionHandler(context),
      negativeBinomial: createNegativeBinomialHandler(context)
    }
  }
}

function createLinearRegressionHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const xColumn = paramsObj.xColumn
    const yColumn = paramsObj.yColumn

    if (typeof xColumn !== 'string' || typeof yColumn !== 'string') {
      return { success: false, error: 'X와 Y 변수를 선택하세요' }
    }

    const xValues: number[] = []
    const yValues: number[] = []
    extractDataRows(data).forEach(row => {
      const x = parseFloat(String(row[xColumn] ?? ''))
      const y = parseFloat(String(row[yColumn] ?? ''))
      if (!isNaN(x) && !isNaN(y)) {
        xValues.push(x)
        yValues.push(y)
      }
    })

    const result = await context.pyodideCore.simpleLinearRegression(xValues, yValues)

    if (!context.pyodideCore.hasStatisticFields(result, ['slope', 'intercept', 'rSquared', 'pValue'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const slope = context.pyodideCore.getStatisticValue(result, 'slope')
    const intercept = context.pyodideCore.getStatisticValue(result, 'intercept')
    const rSquared = context.pyodideCore.getStatisticValue(result, 'rSquared')
    const pValue = context.pyodideCore.getStatisticValue(result, 'pValue')

    return {
      success: true,
      data: {
        metrics: [
          { name: '기울기 (Slope)', value: slope.toFixed(4) },
          { name: '절편 (Intercept)', value: intercept.toFixed(4) },
          { name: 'R²', value: rSquared.toFixed(4) },
          { name: 'p-value', value: pValue.toFixed(4) }
        ],
        interpretation: `회귀식: Y = ${slope.toFixed(3)}X + ${intercept.toFixed(3)}, R² = ${rSquared.toFixed(3)}`
      }
    }
  }
}

function createMultipleRegressionHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    const result = await context.pyodideCore.multipleRegression(X, y)

    if (!context.pyodideCore.hasStatisticFields(result, ['rSquared', 'adjRSquared', 'fStatistic'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const rSquared = context.pyodideCore.getStatisticValue(result, 'rSquared')
    const adjRSquared = context.pyodideCore.getStatisticValue(result, 'adjRSquared')
    const fStatistic = context.pyodideCore.getStatisticValue(result, 'fStatistic')

    return {
      success: true,
      data: {
        metrics: [
          { name: 'R²', value: rSquared.toFixed(4) },
          { name: '조정된 R²', value: adjRSquared.toFixed(4) },
          { name: 'F-통계량', value: fStatistic.toFixed(4) }
        ],
        interpretation: `다중회귀분석 결과 R² = ${rSquared.toFixed(3)}`
      }
    }
  }
}

function createLogisticRegressionHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    const result = await context.pyodideCore.logisticRegression(X, y)

    if (!context.pyodideCore.hasStatisticFields(result, ['accuracy', 'auc'])) {
      return { success: false, error: '필수 통계량이 누락되었습니다' }
    }

    const accuracy = context.pyodideCore.getStatisticValue(result, 'accuracy')
    const auc = context.pyodideCore.getStatisticValue(result, 'auc')

    return {
      success: true,
      data: {
        metrics: [
          { name: '정확도', value: (accuracy * 100).toFixed(2) + '%' },
          { name: 'AUC', value: auc.toFixed(4) }
        ],
        interpretation: `로지스틱 회귀 모델 정확도 ${(accuracy * 100).toFixed(1)}%`
      }
    }
  }
}

function createCurveEstimationHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const x = paramsObj.x
    const y = paramsObj.y
    const model = paramsObj.model

    if (!Array.isArray(x) || !Array.isArray(y) || typeof model !== 'string') {
      return { success: false, error: 'x, y 데이터와 모델을 제공하세요' }
    }

    // curveEstimation method will be added to PyodideService later
    // For now, keep the call as is (will cause type error until method is added)
    const result = await (context.pyodideCore as any).curveEstimation(x, y, model)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'R²', value: result.rSquared.toFixed(4) }
        ],
        interpretation: `곡선 추정 결과`
      }
    }
  }
}

function createNonlinearRegressionHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const x = paramsObj.x
    const y = paramsObj.y
    const func = paramsObj.func

    if (!Array.isArray(x) || !Array.isArray(y) || typeof func !== 'string') {
      return { success: false, error: 'x, y 데이터와 함수를 제공하세요' }
    }

    // nonlinearRegression method will be added to PyodideService later
    const result = await (context.pyodideCore as any).nonlinearRegression(x, y, func)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'R²', value: result.rSquared.toFixed(4) }
        ],
        interpretation: `비선형 회귀 결과`
      }
    }
  }
}

function createStepwiseRegressionHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    // stepwiseRegression method will be added to PyodideService later
    const result = await (context.pyodideCore as any).stepwiseRegression(X, y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '선택된 변수 수', value: result.selectedVars.length },
          { name: '최종 R²', value: result.rSquared.toFixed(4) }
        ],
        interpretation: `단계적 회귀분석 결과`
      }
    }
  }
}

function createBinaryLogisticHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    // binaryLogistic method will be added to PyodideService later
    const result = await (context.pyodideCore as any).binaryLogistic(X, y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '정확도', value: (result.accuracy * 100).toFixed(2) + '%' }
        ],
        interpretation: `이항 로지스틱 회귀 결과`
      }
    }
  }
}

function createMultinomialLogisticHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    // multinomialLogistic method will be added to PyodideService later
    const result = await (context.pyodideCore as any).multinomialLogistic(X, y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '정확도', value: (result.accuracy * 100).toFixed(2) + '%' }
        ],
        interpretation: `다항 로지스틱 회귀 결과`
      }
    }
  }
}

function createOrdinalLogisticHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    // ordinalLogistic method will be added to PyodideService later
    const result = await (context.pyodideCore as any).ordinalLogistic(X, y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '정확도', value: (result.accuracy * 100).toFixed(2) + '%' }
        ],
        interpretation: `순서형 로지스틱 회귀 결과`
      }
    }
  }
}

function createProbitRegressionHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    // probitRegression method will be added to PyodideService later
    const result = await (context.pyodideCore as any).probitRegression(X, y)
    return {
      success: true,
      data: {
        metrics: [
          { name: '정확도', value: (result.accuracy * 100).toFixed(2) + '%' }
        ],
        interpretation: `프로빗 회귀 결과`
      }
    }
  }
}

function createPoissonRegressionHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    // poissonRegression method will be added to PyodideService later
    const result = await (context.pyodideCore as any).poissonRegression(X, y)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'Pseudo R²', value: result.pseudoRSquared.toFixed(4) }
        ],
        interpretation: `포아송 회귀 결과`
      }
    }
  }
}

function createNegativeBinomialHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const X = paramsObj.X
    const y = paramsObj.y

    if (!Array.isArray(X) || !Array.isArray(y)) {
      return { success: false, error: 'X와 Y 데이터를 제공하세요' }
    }

    // negativeBinomial method will be added to PyodideService later
    const result = await (context.pyodideCore as any).negativeBinomial(X, y)
    return {
      success: true,
      data: {
        metrics: [
          { name: 'Pseudo R²', value: result.pseudoRSquared.toFixed(4) }
        ],
        interpretation: `음이항 회귀 결과`
      }
    }
  }
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * unknown[] 데이터를 Record<string, unknown>[] 타입으로 안전하게 변환
 */
function extractDataRows(data: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((row): row is Record<string, unknown> => {
    return row !== null && typeof row === 'object' && !Array.isArray(row)
  })
}
