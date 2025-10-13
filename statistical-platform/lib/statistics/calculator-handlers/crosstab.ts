/**
 * 교차표 분석 핸들러
 *
 * 두 범주형 변수 간의 교차 빈도 분석
 */

import type { CalculatorContext, HandlerMap, CalculationResult } from '../calculator-types'
import { ERROR_MESSAGES } from './common-utils'

export const createCrosstabHandlers = (context: CalculatorContext): HandlerMap => ({
  crosstabAnalysis: (data, parameters) => crosstabAnalysis(context, data, parameters)
})

/**
 * 교차표 분석 (Crosstab Analysis)
 *
 * 두 범주형 변수 간의 교차 빈도를 계산하고, 선택적으로 카이제곱 독립성 검정을 수행합니다.
 *
 * @param context - 계산 컨텍스트
 * @param data - 분석 데이터
 * @param parameters - 분석 파라미터
 * @param parameters.rowVariable - 행 변수 (범주형) (필수)
 * @param parameters.columnVariable - 열 변수 (범주형) (필수)
 * @param parameters.performChiSquare - 카이제곱 검정 수행 여부 (선택, 기본값: true)
 * @param parameters.alpha - 유의수준 (선택, 기본값: 0.05)
 *
 * @returns 교차표 및 카이제곱 검정 결과
 *
 * @example
 * ```typescript
 * // 성별과 선호도 간의 관계 분석
 * const data = [
 *   { gender: '남', preference: '좋아함' },
 *   { gender: '여', preference: '싫어함' }
 * ]
 *
 * const result = await crosstabAnalysis(context, data, {
 *   rowVariable: 'gender',
 *   columnVariable: 'preference',
 *   performChiSquare: true
 * })
 * ```
 */
const crosstabAnalysis = async (
  context: CalculatorContext,
  data: any[],
  parameters: Record<string, any>
): Promise<CalculationResult> => {
  const rowVariable = parameters.rowVariable
  const columnVariable = parameters.columnVariable
  const performChiSquare = parameters.performChiSquare !== false
  const alpha = parameters.alpha || 0.05

  if (!rowVariable || !columnVariable) {
    return {
      success: false,
      error: '행 변수와 열 변수를 모두 선택하세요'
    }
  }

  if (rowVariable === columnVariable) {
    return {
      success: false,
      error: '행 변수와 열 변수는 서로 달라야 합니다'
    }
  }

  // 데이터 추출
  const rowValues: (string | number)[] = []
  const colValues: (string | number)[] = []

  data.forEach(row => {
    const rowVal = row[rowVariable]
    const colVal = row[columnVariable]

    if (rowVal !== null && rowVal !== undefined && colVal !== null && colVal !== undefined) {
      rowValues.push(rowVal)
      colValues.push(colVal)
    }
  })

  if (rowValues.length === 0) {
    return {
      success: false,
      error: ERROR_MESSAGES.NO_VALID_DATA
    }
  }

  // JavaScript에서 직접 교차표 계산 (Pyodide 호출 대신)
  const crosstabResult = calculateCrosstab(rowValues, colValues)

  // 카이제곱 검정 수행 (선택적)
  let chiSquareResult = null
  if (performChiSquare && crosstabResult.observedMatrix.length > 1 && crosstabResult.observedMatrix[0].length > 1) {
    try {
      chiSquareResult = await context.pyodideService.chiSquareTest(
        crosstabResult.observedMatrix,
        false
      )
    } catch (error) {
      console.error('카이제곱 검정 실패:', error)
    }
  }

  // 교차표를 표 형식으로 변환
  const crosstabTableData = crosstabResult.rowCategories.map((rowCat, rowIdx) => {
    const rowData: any = { [rowVariable]: rowCat }

    crosstabResult.colCategories.forEach((colCat, colIdx) => {
      rowData[colCat] = crosstabResult.observedMatrix[rowIdx][colIdx]
    })

    rowData['합계'] = crosstabResult.rowTotals[rowIdx]
    return rowData
  })

  // 열 합계 행 추가
  const totalRow: any = { [rowVariable]: '합계' }
  crosstabResult.colCategories.forEach((colCat, idx) => {
    totalRow[colCat] = crosstabResult.colTotals[idx]
  })
  totalRow['합계'] = crosstabResult.grandTotal
  crosstabTableData.push(totalRow)

  // 비율 테이블 (백분율)
  const percentageTableData = crosstabResult.rowCategories.map((rowCat, rowIdx) => {
    const rowData: any = { [rowVariable]: rowCat }

    crosstabResult.colCategories.forEach((colCat, colIdx) => {
      const count = crosstabResult.observedMatrix[rowIdx][colIdx]
      const percentage = ((count / crosstabResult.grandTotal) * 100).toFixed(1)
      rowData[colCat] = `${count} (${percentage}%)`
    })

    return rowData
  })

  // 결과 구성
  const metrics = [
    { name: '총 관측치 수', value: crosstabResult.grandTotal },
    { name: '행 범주 수', value: crosstabResult.rowCategories.length },
    { name: '열 범주 수', value: crosstabResult.colCategories.length }
  ]

  if (chiSquareResult) {
    metrics.push(
      { name: '카이제곱 통계량', value: chiSquareResult.statistic.toFixed(4) },
      { name: 'p-value', value: chiSquareResult.pValue.toFixed(4) },
      { name: '자유도', value: chiSquareResult.df }
    )
  }

  const tables = [
    {
      name: '교차표 (빈도)',
      data: crosstabTableData
    },
    {
      name: '교차표 (빈도 및 백분율)',
      data: percentageTableData
    }
  ]

  if (chiSquareResult) {
    tables.push({
      name: '카이제곱 독립성 검정',
      data: [
        { 항목: '검정 통계량 (χ²)', 값: chiSquareResult.statistic.toFixed(4) },
        { 항목: 'p-value', 값: chiSquareResult.pValue.toFixed(4) },
        { 항목: '자유도', 값: chiSquareResult.df },
        { 항목: '유의수준 (α)', 값: alpha },
        {
          항목: '결론',
          값: chiSquareResult.pValue < alpha
            ? '두 변수는 독립적이지 않습니다 (관련성 있음)'
            : '두 변수는 독립적입니다 (관련성 없음)'
        }
      ]
    })
  }

  // 해석 생성
  let interpretation = `${rowVariable}과(와) ${columnVariable} 간의 교차표를 분석했습니다. `
  interpretation += `총 ${crosstabResult.grandTotal}개의 관측치가 ${crosstabResult.rowCategories.length}×${crosstabResult.colCategories.length} 교차표로 분류되었습니다.`

  if (chiSquareResult) {
    interpretation += `\n\n카이제곱 독립성 검정 결과, p-value는 ${chiSquareResult.pValue.toFixed(4)}이며, `
    interpretation += chiSquareResult.pValue < alpha
      ? `이는 유의수준 ${alpha}보다 작으므로 두 변수 간에 통계적으로 유의한 관련성이 있습니다.`
      : `이는 유의수준 ${alpha}보다 크므로 두 변수는 독립적이라고 볼 수 있습니다.`
  }

  return {
    success: true,
    data: {
      metrics,
      tables,
      interpretation
    }
  }
}

/**
 * JavaScript로 교차표 직접 계산
 */
function calculateCrosstab(
  rowValues: (string | number)[],
  colValues: (string | number)[]
): {
  rowCategories: string[]
  colCategories: string[]
  observedMatrix: number[][]
  rowTotals: number[]
  colTotals: number[]
  grandTotal: number
} {
  // 고유 범주 추출
  const rowSet = new Set(rowValues.map(String))
  const colSet = new Set(colValues.map(String))

  const rowCategories = Array.from(rowSet).sort()
  const colCategories = Array.from(colSet).sort()

  // 교차표 행렬 초기화
  const observedMatrix: number[][] = Array(rowCategories.length)
    .fill(0)
    .map(() => Array(colCategories.length).fill(0))

  // 빈도 계산
  for (let i = 0; i < rowValues.length; i++) {
    const rowIdx = rowCategories.indexOf(String(rowValues[i]))
    const colIdx = colCategories.indexOf(String(colValues[i]))
    observedMatrix[rowIdx][colIdx]++
  }

  // 행/열 합계 계산
  const rowTotals = observedMatrix.map(row => row.reduce((a, b) => a + b, 0))
  const colTotals = colCategories.map((_, colIdx) =>
    observedMatrix.reduce((sum, row) => sum + row[colIdx], 0)
  )
  const grandTotal = rowTotals.reduce((a, b) => a + b, 0)

  return {
    rowCategories,
    colCategories,
    observedMatrix,
    rowTotals,
    colTotals,
    grandTotal
  }
}
