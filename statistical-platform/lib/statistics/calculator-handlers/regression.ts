/**
 * 회귀/상관분석 핸들러
 *
 * 단순/다중 회귀, 로지스틱 회귀, 상관분석 핸들러
 */

import type { CalculatorContext, HandlerMap, CalculationResult, DataRow, MethodParameters } from '../calculator-types'
import {
  extractNumericColumn,
  extractMatrixData,
  formatPValue,
  interpretAUC,
  interpretCorrelationStrength,
  getMinimumRegressionSampleSize,
  ERROR_MESSAGES
} from './common-utils'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type {
  LinearRegressionResult,
  MultipleRegressionResult,
  LogisticRegressionResult
} from '@/types/pyodide-results'

export const createRegressionHandlers = (context: CalculatorContext): HandlerMap => ({
  simpleLinearRegression: (data: DataRow[], parameters: MethodParameters) => simpleLinearRegression(context, data, parameters),
  multipleRegression: (data: DataRow[], parameters: MethodParameters) => multipleRegression(context, data, parameters),
  logisticRegression: (data: DataRow[], parameters: MethodParameters) => logisticRegression(context, data, parameters),
  correlationAnalysis: (data: DataRow[], parameters: MethodParameters) => correlationAnalysis(context, data, parameters)
})

/**
 * 단순 선형 회귀
 */
const simpleLinearRegression = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const independentColumn = parameters.independentColumn
  const dependentColumn = parameters.dependentColumn
  const alpha = parameters.alpha || 0.05
  const predictValues = parameters.predictValues

  if (!independentColumn || !dependentColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMNS(['독립변수', '종속변수']) }
  }

  // 데이터 추출 (결측값 제거)
  const validData: Array<{ x: number; y: number }> = []
  data.forEach(row => {
    const x = parseFloat(row[independentColumn])
    const y = parseFloat(row[dependentColumn])
    if (!isNaN(x) && !isNaN(y)) {
      validData.push({ x, y })
    }
  })

  if (validData.length < 3) {
    return { success: false, error: ERROR_MESSAGES.INSUFFICIENT_DATA(3) }
  }

  const xValues = validData.map(d => d.x)
  const yValues = validData.map(d => d.y)

  const result = await context.pyodideCore.callWorkerMethod<LinearRegressionResult>(
    PyodideWorker.RegressionAdvanced,
    'linear_regression',
    { x: xValues, y: yValues }
  )

  // 예측값 계산
  const predictions: Array<{ X: number; 예측값: string }> = []
  if (predictValues) {
    const predX = predictValues
      .split(',')
      .map((v: string) => parseFloat(v.trim()))
      .filter((v: number) => !isNaN(v))
    predictions.push(
      ...predX.map((x: number) => ({
        X: x,
        예측값: (result.slope * x + result.intercept).toFixed(4)
      }))
    )
  }

  const tables = [
    {
      name: '회귀계수',
      data: [
        { 계수: '절편 (Intercept)', 값: result.intercept.toFixed(4) },
        { 계수: `기울기 (${independentColumn})`, 값: result.slope.toFixed(4) }
      ]
    },
    {
      name: '모형 적합도',
      data: [
        { 측정치: '결정계수 (R²)', 값: result.rSquared.toFixed(4) },
        { 측정치: 'p-value', 값: formatPValue(result.pValue) },
        { 측정치: '표준오차', 값: result.stdErr.toFixed(4) },
        { 측정치: '관측치 수', 값: result.nPairs }
      ]
    }
  ]

  if (predictions.length > 0) {
    tables.push({
      name: '예측값',
      data: predictions as any  // 예측값 테이블은 다른 구조
    })
  }

  return {
    success: true,
    data: {
      metrics: [
        { name: '결정계수 (R²)', value: result.rSquared.toFixed(4) },
        { name: 'p-value', value: formatPValue(result.pValue) },
        { name: '표준오차', value: result.stdErr.toFixed(4) }
      ],
      tables,
      charts: [
        {
          type: 'scatter',
          data: {
            x: xValues,
            y: yValues,
            regression: {
              slope: result.slope,
              intercept: result.intercept
            }
          }
          // title은 ChartDatum에 없음
        } as any
      ],
      interpretation: interpretSimpleRegression(result, independentColumn, dependentColumn, alpha)
    }
  }
}

/**
 * 다중 회귀분석
 */
const multipleRegression = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const independentColumns = parameters.independentColumns
  const dependentColumn = parameters.dependentColumn
  const alpha = parameters.alpha || 0.05

  if (!independentColumns || independentColumns.length === 0) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('독립변수') }
  }

  if (!dependentColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('종속변수') }
  }

  // 데이터 추출
  const { xMatrix, yValues, validCount } = extractMatrixData(
    data,
    independentColumns,
    dependentColumn
  )

  const minSampleSize = getMinimumRegressionSampleSize(independentColumns.length)
  if (validCount < minSampleSize) {
    return {
      success: false,
      error: ERROR_MESSAGES.INSUFFICIENT_DATA(minSampleSize)
    }
  }

  const result = await context.pyodideCore.callWorkerMethod<MultipleRegressionResult>(
    PyodideWorker.RegressionAdvanced,
    'multiple_regression',
    { X: xMatrix, y: yValues }
  )

  // 계수 테이블 생성
  const coefficientTable = [
    {
      변수: '절편 (Intercept)',
      계수: result.intercept.toFixed(4),
      't-통계량': '-',
      'p-value': '-'
    }
  ]

  independentColumns.forEach((col: string, idx: number) => {
    coefficientTable.push({
      변수: col,
      계수: result.coefficients[idx].toFixed(4),
      't-통계량': result.tStatistics[idx].toFixed(4),
      'p-value': formatPValue(result.pValues[idx])
    })
  })

  return {
    success: true,
    data: {
      metrics: [
        { name: '결정계수 (R²)', value: result.rSquared.toFixed(4) },
        { name: '수정 R²', value: result.adjustedRSquared.toFixed(4) },
        { name: 'F-통계량', value: result.fStatistic.toFixed(4) },
        { name: 'p-value', value: formatPValue(result.pValue) }
      ],
      tables: [
        {
          name: '회귀계수',
          data: coefficientTable
        },
        {
          name: '모형 적합도',
          data: [
            { 측정치: '결정계수 (R²)', 값: result.rSquared.toFixed(4) },
            {
              측정치: '수정 R²',
              값: result.adjustedRSquared.toFixed(4)
            },
            { 측정치: 'F-통계량', 값: result.fStatistic.toFixed(4) },
            { 측정치: 'p-value', 값: formatPValue(result.pValue) }
          ]
        }
      ],
      interpretation: interpretMultipleRegression(result, independentColumns, dependentColumn, alpha)
    }
  }
}

/**
 * 로지스틱 회귀분석
 */
const logisticRegression = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const independentColumns = parameters.independentColumns
  const dependentColumn = parameters.dependentColumn
  const method = parameters.method || 'lbfgs'
  const maxIter = parameters.maxIter || 100

  if (!independentColumns || independentColumns.length === 0) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('독립변수') }
  }

  if (!dependentColumn) {
    return { success: false, error: ERROR_MESSAGES.MISSING_COLUMN('종속변수') }
  }

  // 데이터 추출
  const { xMatrix, yValues, validCount } = extractMatrixData(
    data,
    independentColumns,
    dependentColumn
  )

  const minSampleSize = getMinimumRegressionSampleSize(independentColumns.length)
  if (validCount < minSampleSize) {
    return {
      success: false,
      error: ERROR_MESSAGES.INSUFFICIENT_DATA(minSampleSize)
    }
  }

  const result = await context.pyodideCore.callWorkerMethod<LogisticRegressionResult>(
    PyodideWorker.RegressionAdvanced,
    'logistic_regression',
    { X: xMatrix, y: yValues }
  )

  // 계수 테이블
  const coefficientTable = [
    {
      변수: '절편 (Intercept)',
      계수: result.intercept.toFixed(4),
      'Odds Ratio': '-'
    }
  ]

  independentColumns.forEach((col: string, idx: number) => {
    const coef = result.coefficients[idx]
    const oddsRatio = result.oddsRatios[idx]
    const pVal = result.pValues[idx]
    coefficientTable.push({
      변수: col,
      계수: coef.toFixed(4),
      'Odds Ratio': oddsRatio.toFixed(4),
      'p-value': formatPValue(pVal)
    } as any)  // 테이블 구조는 동적
  })

  return {
    success: true,
    data: {
      metrics: [
        { name: '정확도', value: (result.accuracy * 100).toFixed(2) + '%' }
      ],
      tables: [
        {
          name: '회귀계수',
          data: coefficientTable
        },
        {
          name: '모형 평가',
          data: [
            { 측정치: '정확도 (Accuracy)', 값: (result.accuracy * 100).toFixed(2) + '%' }
          ]
        }
      ],
      interpretation: interpretLogisticRegression(result, independentColumns, dependentColumn)
    }
  }
}

/**
 * 상관분석
 */
const correlationAnalysis = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const columns = parameters.columns

  if (!columns || columns.length < 2) {
    return { success: false, error: '최소 2개 이상의 변수를 선택하세요' }
  }

  // 각 열의 데이터 추출
  const columnsData: Record<string, number[]> = {}
  columns.forEach((col: string) => {
    columnsData[col] = extractNumericColumn(data, col)
  })

  const method = parameters.method || 'pearson'
  const result = await context.pyodideCore.callWorkerMethod<{
    matrix: number[][]
  }>(
    PyodideWorker.Hypothesis,
    'correlation_test',
    { columns_data: JSON.stringify(columnsData), method }  // JSON으로 직렬화
  )

  // 상관계수 행렬을 테이블 형식으로 변환
  const correlationTable: any[] = []
  columns.forEach((col1: string, i: number) => {
    const row: Record<string, any> = { 변수: col1 }
    columns.forEach((col2: string, j: number) => {
      row[col2] = result.matrix[i][j].toFixed(4)
    })
    correlationTable.push(row)
  })

  // 상관계수 방법 이름
  const methodName =
    method === 'pearson' ? 'Pearson' : method === 'spearman' ? 'Spearman' : 'Kendall'

  return {
    success: true,
    data: {
      tables: [
        {
          name: `${methodName} 상관계수`,
          data: correlationTable
        }
      ],
      interpretation: interpretCorrelation(result.matrix, columns, method)
    }
  }
}

// ============================================================================
// 해석 함수들
// ============================================================================

const interpretSimpleRegression = (
  result: LinearRegressionResult,
  independentColumn: string,
  dependentColumn: string,
  alpha: number
): string => {
  const rSquaredPercent = (result.rSquared * 100).toFixed(2)
  const isSignificant = result.pValue < alpha

  return (
    `${independentColumn}는 ${dependentColumn}의 분산 중 ${rSquaredPercent}%를 설명합니다. ` +
    `회귀 모형은 통계적으로 ${isSignificant ? '유의합니다' : '유의하지 않습니다'} ` +
    `(p-value = ${formatPValue(result.pValue)}). ` +
    `회귀식: ${dependentColumn} = ${result.intercept.toFixed(4)} + ${result.slope.toFixed(4)} × ${independentColumn}`
  )
}

const interpretMultipleRegression = (
  result: MultipleRegressionResult,
  independentColumns: string[],
  dependentColumn: string,
  alpha: number
): string => {
  const rSquaredPercent = (result.rSquared * 100).toFixed(2)
  const adjRSquaredPercent = (result.adjustedRSquared * 100).toFixed(2)
  const isSignificant = result.pValue < alpha

  return (
    `${independentColumns.length}개 독립변수들이 ${dependentColumn}의 분산 중 ${rSquaredPercent}%를 설명합니다 ` +
    `(수정 R² = ${adjRSquaredPercent}%). ` +
    `모형은 통계적으로 ${isSignificant ? '유의합니다' : '유의하지 않습니다'} ` +
    `(F-검정 p-value = ${formatPValue(result.pValue)}).`
  )
}

const interpretLogisticRegression = (
  result: LogisticRegressionResult,
  independentColumns: string[],
  dependentColumn: string
): string => {
  const accuracyPercent = (result.accuracy * 100).toFixed(2)

  return (
    `로지스틱 회귀 모형의 정확도는 ${accuracyPercent}%입니다. ` +
    `${independentColumns.length}개 독립변수로 ${dependentColumn}을(를) 예측합니다.`
  )
}

const interpretCorrelation = (matrix: number[][], columns: string[], method: string): string => {
  const methodName =
    method === 'pearson' ? 'Pearson' : method === 'spearman' ? 'Spearman' : 'Kendall'

  // 가장 강한 상관관계 찾기 (대각선 제외)
  let maxCorr = 0
  let maxPair = ['', '']

  for (let i = 0; i < columns.length; i++) {
    for (let j = i + 1; j < columns.length; j++) {
      const corr = Math.abs(matrix[i][j])
      if (corr > maxCorr) {
        maxCorr = corr
        maxPair = [columns[i], columns[j]]
      }
    }
  }

  const actualCorr = matrix[columns.indexOf(maxPair[0])][columns.indexOf(maxPair[1])] ?? 0
  const strength = interpretCorrelationStrength(actualCorr)

  return (
    `${methodName} 상관분석 결과, ${maxPair[0]}와 ${maxPair[1]} 간 ` +
    `${strength} 상관관계 (r = ${actualCorr.toFixed(4)})가 가장 두드러집니다.`
  )
}
