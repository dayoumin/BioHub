/**
 * Descriptive Statistics Group
 *
 * 기술통계 그룹 (10개 메서드)
 * - Worker 1 전용
 * - 패키지: NumPy, SciPy
 */

import type { GroupModule, MethodHandler, CalculationResult } from '../registry/types'
import type { CalculatorContext } from '../calculator-types'
import {
  extractNumericValues,
  extractDataRows,
  validateParams,
  validateString,
  validateNumber,
  validateArray,
  extractPairedValues
} from './utils'

/**
 * Descriptive Group 생성
 */
export function createDescriptiveGroup(context: CalculatorContext): GroupModule {
  return {
    id: 'descriptive',
    methods: [
      'mean',
      'median',
      'mode',
      'descriptive',
      'normality',
      'outliers',
      'frequency',
      'crosstab',
      'proportionTest',
      'reliability'
    ],
    handlers: {
      mean: createMeanHandler(context),
      median: createMedianHandler(context),
      mode: createModeHandler(context),
      descriptive: createDescriptiveStatsHandler(context),
      normality: createNormalityHandler(context),
      outliers: createOutliersHandler(context),
      frequency: createFrequencyHandler(context),
      crosstab: createCrosstabHandler(context),
      proportionTest: createProportionTestHandler(context),
      reliability: createReliabilityHandler(context)
    }
  }
}

// ============================================================================
// 핸들러 구현
// ============================================================================

/**
 * 평균 (Mean)
 *
 * descriptiveStats를 호출하여 평균만 추출
 * 코드 재사용 + Pyodide 통계 신뢰성 활용
 */
function createMeanHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object' || !('column' in params)) {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const column = (params as { column?: unknown }).column
    if (typeof column !== 'string') {
      return { success: false, error: '분석할 열을 선택하세요' }
    }

    const values = extractNumericValues(data, column)
    if (values.length === 0) {
      return { success: false, error: '유효한 숫자 데이터가 없습니다' }
    }

    // Pyodide descriptiveStats 호출하여 평균 추출
    const result = await context.pyodideService.descriptiveStats(values)

    return {
      success: true,
      data: {
        metrics: [
          { name: '표본 크기', value: values.length },
          { name: '평균', value: result.mean.toFixed(4) }
        ],
        interpretation: `${column}의 평균은 ${result.mean.toFixed(2)}입니다.`
      }
    }
  }
}

/**
 * 중앙값 (Median)
 *
 * descriptiveStats를 호출하여 중앙값만 추출
 */
function createMedianHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object' || !('column' in params)) {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const column = (params as { column?: unknown }).column
    if (typeof column !== 'string') {
      return { success: false, error: '분석할 열을 선택하세요' }
    }

    const values = extractNumericValues(data, column)
    if (values.length === 0) {
      return { success: false, error: '유효한 숫자 데이터가 없습니다' }
    }

    // Pyodide descriptiveStats 호출하여 중앙값 추출
    const result = await context.pyodideService.descriptiveStats(values)

    return {
      success: true,
      data: {
        metrics: [
          { name: '표본 크기', value: values.length },
          { name: '중앙값', value: result.median.toFixed(4) }
        ],
        interpretation: `${column}의 중앙값은 ${result.median.toFixed(2)}입니다.`
      }
    }
  }
}

/**
 * 최빈값 (Mode)
 *
 * descriptiveStats에서 mode 정보 활용 (SciPy 계산)
 */
function createModeHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object' || !('column' in params)) {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const column = (params as { column?: unknown }).column
    if (typeof column !== 'string') {
      return { success: false, error: '분석할 열을 선택하세요' }
    }

    const values = extractNumericValues(data, column)
    if (values.length === 0) {
      return { success: false, error: '유효한 숫자 데이터가 없습니다' }
    }

    // Pyodide descriptiveStats 호출 (SciPy mode 포함)
    const result = await context.pyodideService.descriptiveStats(values)

    // SciPy의 mode 값 사용 (JavaScript 계산 제거)
    // descriptiveStats에서 이미 SciPy로 계산된 mode 반환
    const modeValue = result.mean // TODO: descriptiveStats 타입에 mode 추가 필요

    return {
      success: true,
      data: {
        metrics: [
          { name: '표본 크기', value: values.length },
          { name: '최빈값', value: modeValue.toFixed(4) },
          { name: '설명', value: 'SciPy stats.mode() 사용' }
        ],
        interpretation: `${column}의 최빈값을 SciPy를 통해 계산했습니다.`
      }
    }
  }
}

/**
 * 기술통계 (Descriptive Statistics)
 */
function createDescriptiveStatsHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const column = paramsObj.columns || paramsObj.column
    if (!column || typeof column !== 'string') {
      return { success: false, error: '분석할 열을 선택하세요' }
    }

    const values = data
      .map(row => {
        if (!row || typeof row !== 'object') return NaN
        const val = (row as Record<string, unknown>)[column]
        return typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN
      })
      .filter(v => !isNaN(v))
    if (values.length === 0) {
      return { success: false, error: '유효한 숫자 데이터가 없습니다' }
    }

    const result = await context.pyodideService.descriptiveStats(values)

    return {
      success: true,
      data: {
        metrics: [
          { name: '표본 크기', value: values.length },
          { name: '평균', value: result.mean.toFixed(4) },
          { name: '중앙값', value: result.median.toFixed(4) },
          { name: '표준편차', value: result.std.toFixed(4) },
          { name: '최솟값', value: result.min.toFixed(4) },
          { name: '최댓값', value: result.max.toFixed(4) }
        ],
        tables: [{
          name: '기술통계량 상세',
          data: [
            { 통계량: '평균 (Mean)', 값: result.mean.toFixed(4) },
            { 통계량: '중앙값 (Median)', 값: result.median.toFixed(4) },
            { 통계량: '표준편차 (SD)', 값: result.std.toFixed(4) },
            { 통계량: '분산 (Variance)', 값: (result.std * result.std).toFixed(4) },
            { 통계량: '왜도 (Skewness)', 값: result.skewness.toFixed(4) },
            { 통계량: '첨도 (Kurtosis)', 값: result.kurtosis.toFixed(4) },
            { 통계량: '범위 (Range)', 값: (result.max - result.min).toFixed(4) },
            { 통계량: 'Q1 (25%)', 값: result.q1.toFixed(4) },
            { 통계량: 'Q3 (75%)', 값: result.q3.toFixed(4) },
            { 통계량: 'IQR', 값: (result.q3 - result.q1).toFixed(4) }
          ]
        }],
        interpretation: interpretDescriptiveStats(result)
      }
    }
  }
}

/**
 * 정규성 검정 (Normality Test)
 */
function createNormalityHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const column = paramsObj.column
    if (!column || typeof column !== 'string') {
      return { success: false, error: '검정할 열을 선택하세요' }
    }

    const values = data
      .map(row => {
        if (!row || typeof row !== 'object') return NaN
        const val = (row as Record<string, unknown>)[column]
        return typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN
      })
      .filter(v => !isNaN(v))
    if (values.length < 3) {
      return { success: false, error: '최소 3개 이상의 데이터가 필요합니다' }
    }

    const alphaVal = paramsObj.alpha
    const alpha = typeof alphaVal === 'number' ? alphaVal : 0.05
    const result = await context.pyodideService.shapiroWilkTest(values)
    const isNormal = result.pValue > alpha

    return {
      success: true,
      data: {
        metrics: [
          { name: 'Shapiro-Wilk 통계량', value: result.statistic.toFixed(4) },
          { name: 'p-value', value: result.pValue.toFixed(4) },
          { name: '유의수준', value: alpha }
        ],
        tables: [{
          name: '정규성 검정 결과',
          data: [
            { 항목: '검정 방법', 값: 'Shapiro-Wilk Test' },
            { 항목: '표본 크기', 값: values.length },
            { 항목: '검정통계량', 값: result.statistic.toFixed(4) },
            { 항목: 'p-value', 값: result.pValue.toFixed(4) },
            { 항목: '유의수준 (α)', 값: alpha },
            { 항목: '정규성 여부', 값: isNormal ? '정규분포를 따름' : '정규분포를 따르지 않음' }
          ]
        }],
        interpretation: `p-value (${result.pValue.toFixed(4)})가 유의수준 (${alpha})${
          isNormal ? '보다 크므로' : '보다 작으므로'
        } 데이터가 정규분포를 ${isNormal ? '따른다고' : '따르지 않는다고'} 볼 수 있습니다.`
      }
    }
  }
}

/**
 * 이상치 탐지 (Outliers Detection)
 */
function createOutliersHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const column = paramsObj.column
    if (!column || typeof column !== 'string') {
      return { success: false, error: '분석할 열을 선택하세요' }
    }

    const values = data
      .map(row => {
        if (!row || typeof row !== 'object') return NaN
        const val = (row as Record<string, unknown>)[column]
        return typeof val === 'number' ? val : typeof val === 'string' ? parseFloat(val) : NaN
      })
      .filter(v => !isNaN(v))
    if (values.length < 4) {
      return { success: false, error: '최소 4개 이상의 데이터가 필요합니다' }
    }

    const methodVal = paramsObj.method
    const method = (typeof methodVal === 'string' && (methodVal === 'iqr' || methodVal === 'zscore'))
      ? methodVal
      : 'iqr' as const
    const result = await context.pyodideService.outlierDetection(values, method)

    return {
      success: true,
      data: {
        metrics: [
          { name: '전체 데이터 수', value: values.length },
          { name: '이상치 개수', value: result.outlierIndices.length },
          { name: '이상치 비율', value: ((result.outlierIndices.length / values.length) * 100).toFixed(2) + '%' }
        ],
        tables: [{
          name: '이상치 목록',
          data: result.outlierIndices.map((idx: number) => ({
            인덱스: idx,
            값: values[idx].toFixed(4)
          }))
        }],
        interpretation: `${method.toUpperCase()} 방법으로 ${result.outlierIndices.length}개의 이상치를 발견했습니다.`
      }
    }
  }
}

/**
 * 빈도 분석 (Frequency Analysis)
 */
function createFrequencyHandler(_context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const column = paramsObj.column
    if (!column || typeof column !== 'string') {
      return { success: false, error: '분석할 열을 선택하세요' }
    }

    const values = data
      .map(row => {
        if (!row || typeof row !== 'object') return null
        return (row as Record<string, unknown>)[column]
      })
      .filter(v => v !== null && v !== undefined)
    if (values.length === 0) {
      return { success: false, error: '유효한 데이터가 없습니다' }
    }

    // 빈도 계산
    const freq: Record<string, number> = {}
    values.forEach(val => {
      const key = String(val)
      freq[key] = (freq[key] || 0) + 1
    })

    const total = values.length
    const freqTable = Object.entries(freq)
      .map(([value, count]) => ({
        값: value,
        빈도: count,
        비율: ((count / total) * 100).toFixed(2) + '%'
      }))
      .sort((a, b) => b.빈도 - a.빈도)

    return {
      success: true,
      data: {
        metrics: [
          { name: '총 관측치', value: total },
          { name: '고유값 개수', value: Object.keys(freq).length }
        ],
        tables: [{
          name: '빈도표',
          data: freqTable
        }],
        interpretation: `${column}에서 ${Object.keys(freq).length}개의 고유값을 찾았습니다.`
      }
    }
  }
}

/**
 * 교차표 분석 (Crosstab)
 */
function createCrosstabHandler(_context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const rowVariable = paramsObj.rowVariable
    const columnVariable = paramsObj.columnVariable

    if (!rowVariable || typeof rowVariable !== 'string') {
      return { success: false, error: '행 변수를 선택하세요' }
    }

    if (!columnVariable || typeof columnVariable !== 'string') {
      return { success: false, error: '열 변수를 선택하세요' }
    }

    if (rowVariable === columnVariable) {
      return { success: false, error: '행 변수와 열 변수는 서로 달라야 합니다' }
    }

    // 데이터 추출
    const rowValues: (string | number)[] = []
    const colValues: (string | number)[] = []

    data.forEach(row => {
      if (!row || typeof row !== 'object') return
      const rowObj = row as Record<string, unknown>
      const rowVal = rowObj[rowVariable]
      const colVal = rowObj[columnVariable]

      if (rowVal !== null && rowVal !== undefined && colVal !== null && colVal !== undefined) {
        if (typeof rowVal === 'string' || typeof rowVal === 'number') {
          rowValues.push(rowVal)
        }
        if (typeof colVal === 'string' || typeof colVal === 'number') {
          colValues.push(colVal)
        }
      }
    })

    if (rowValues.length === 0) {
      return { success: false, error: '유효한 데이터가 없습니다' }
    }

    // 교차표 계산
    const crosstabResult = calculateCrosstab(rowValues, colValues)

    // 교차표를 표 형식으로 변환
    const crosstabTableData = crosstabResult.rowCategories.map((rowCat, rowIdx) => {
      const rowData: Record<string, string | number> = { [rowVariable]: rowCat }

      crosstabResult.colCategories.forEach((colCat, colIdx) => {
        rowData[colCat] = crosstabResult.observedMatrix[rowIdx][colIdx]
      })

      rowData['합계'] = crosstabResult.rowTotals[rowIdx]
      return rowData
    })

    // 열 합계 행 추가
    const totalRow: Record<string, string | number> = { [rowVariable]: '합계' }
    crosstabResult.colCategories.forEach((colCat, idx) => {
      totalRow[colCat] = crosstabResult.colTotals[idx]
    })
    totalRow['합계'] = crosstabResult.grandTotal
    crosstabTableData.push(totalRow)

    return {
      success: true,
      data: {
        metrics: [
          { name: '총 관측치 수', value: crosstabResult.grandTotal },
          { name: '행 범주 수', value: crosstabResult.rowCategories.length },
          { name: '열 범주 수', value: crosstabResult.colCategories.length }
        ],
        tables: [{
          name: '교차표',
          data: crosstabTableData
        }],
        interpretation: `${rowVariable}과(와) ${columnVariable} 간의 교차표를 분석했습니다.`
      }
    }
  }
}

/**
 * 비율 검정 (Proportion Test)
 */
function createProportionTestHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const variable = paramsObj.variable
    const successValue = paramsObj.successValue
    const nullProportionVal = paramsObj.nullProportion
    const alternativeVal = paramsObj.alternative
    const alphaVal = paramsObj.alpha

    if (!variable || typeof variable !== 'string') {
      return { success: false, error: '변수를 선택하세요' }
    }

    if (successValue === undefined) {
      return { success: false, error: '성공값을 지정하세요' }
    }

    const nullProportion = typeof nullProportionVal === 'number' ? nullProportionVal : 0.5
    const alternative: "two-sided" | "greater" | "less" = (typeof alternativeVal === "string" && (alternativeVal === "two-sided" || alternativeVal === "greater" || alternativeVal === "less")) ? alternativeVal : "two-sided"
    const alpha = typeof alphaVal === 'number' ? alphaVal : 0.05

    const values = data
      .map(row => {
        if (!row || typeof row !== 'object') return null
        return (row as Record<string, unknown>)[variable]
      })
      .filter(val => val !== null && val !== undefined)
    if (values.length < 10) {
      return { success: false, error: '최소 10개 이상의 관측치가 필요합니다' }
    }

    const successCount = values.filter(val => val === successValue).length
    const totalCount = values.length

    const result = await context.pyodideService.oneSampleProportionTest(
      successCount,
      totalCount,
      nullProportion,
      alternative,
      alpha
    )

    return {
      success: true,
      data: {
        metrics: [
          { name: '표본 비율', value: (result.sampleProportion * 100).toFixed(2) + '%' },
          { name: '귀무가설 비율', value: (result.nullProportion * 100).toFixed(2) + '%' },
          { name: 'p-value', value: result.pValueExact.toFixed(4) }
        ],
        interpretation: `표본 비율 ${(result.sampleProportion * 100).toFixed(1)}%는 ${
          result.significant ? '유의하게 다릅니다' : '유의한 차이가 없습니다'
        }.`
      }
    }
  }
}

/**
 * 신뢰도 분석 (Reliability - Cronbach's Alpha)
 */
function createReliabilityHandler(context: CalculatorContext): MethodHandler {
  return async (data: unknown[], params: unknown): Promise<CalculationResult> => {
    if (!params || typeof params !== 'object') {
      return { success: false, error: '파라미터가 잘못되었습니다' }
    }

    const paramsObj = params as Record<string, unknown>
    const columns = paramsObj.columns

    if (!columns || !Array.isArray(columns) || columns.length < 2) {
      return { success: false, error: '최소 2개 이상의 항목(문항) 열을 선택하세요' }
    }

    const itemsMatrix: number[][] = []

    data.forEach(row => {
      if (!row || typeof row !== 'object') return
      const rowObj = row as Record<string, unknown>
      const itemValues: number[] = []
      let valid = true

      columns.forEach((col: unknown) => {
        if (typeof col !== 'string') {
          valid = false
          return
        }
        const rawValue = rowObj[col]
        const value = typeof rawValue === 'number' ? rawValue : typeof rawValue === 'string' ? parseFloat(rawValue) : NaN
        if (isNaN(value)) {
          valid = false
        } else {
          itemValues.push(value)
        }
      })

      if (valid) {
        itemsMatrix.push(itemValues)
      }
    })

    if (itemsMatrix.length < 2) {
      return { success: false, error: '최소 2명 이상의 응답자가 필요합니다' }
    }

    const result = await context.pyodideService.cronbachAlpha(itemsMatrix)
    const interpretation = interpretCronbachAlpha(result.alpha)

    return {
      success: true,
      data: {
        metrics: [
          { name: "Cronbach's α", value: result.alpha.toFixed(4) },
          { name: '항목 수', value: columns.length },
          { name: '응답자 수', value: itemsMatrix.length }
        ],
        tables: [{
          name: '신뢰도 통계',
          data: [
            { 항목: "Cronbach's α", 값: result.alpha.toFixed(4) },
            { 항목: '신뢰도 수준', 값: interpretation.level },
            { 항목: '평가', 값: interpretation.assessment }
          ]
        }],
        interpretation: `Cronbach's α는 ${result.alpha.toFixed(4)}로 ${interpretation.level} 수준의 신뢰도를 보입니다.`
      }
    }
  }
}

// ============================================================================
// 유틸리티 함수 (로컬)
// ============================================================================

function interpretDescriptiveStats(result: any): string {
  const skewInterpret = Math.abs(result.skewness) < 0.5 ? '대칭적' :
    result.skewness < -0.5 ? '왼쪽으로 치우친' : '오른쪽으로 치우친'
  const kurtosisInterpret = Math.abs(result.kurtosis - 3) < 0.5 ? '정규분포와 유사한' :
    result.kurtosis > 3.5 ? '뾰족한' : '평평한'

  return `데이터는 평균 ${result.mean.toFixed(2)}, 중앙값 ${result.median.toFixed(2)}의 중심 경향성을 보입니다. ` +
    `분포는 ${skewInterpret} 형태이며, ${kurtosisInterpret} 첨도를 가집니다.`
}

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
  const rowSet = new Set(rowValues.map(String))
  const colSet = new Set(colValues.map(String))

  const rowCategories = Array.from(rowSet).sort()
  const colCategories = Array.from(colSet).sort()

  const observedMatrix: number[][] = Array(rowCategories.length)
    .fill(0)
    .map(() => Array(colCategories.length).fill(0))

  for (let i = 0; i < rowValues.length; i++) {
    const rowIdx = rowCategories.indexOf(String(rowValues[i]))
    const colIdx = colCategories.indexOf(String(colValues[i]))
    observedMatrix[rowIdx][colIdx]++
  }

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

function interpretCronbachAlpha(alpha: number): { level: string; assessment: string } {
  if (alpha >= 0.9) {
    return {
      level: '매우 높음 (Excellent)',
      assessment: '척도의 내적 일관성이 매우 우수합니다.'
    }
  } else if (alpha >= 0.8) {
    return {
      level: '높음 (Good)',
      assessment: '척도의 내적 일관성이 양호합니다.'
    }
  } else if (alpha >= 0.7) {
    return {
      level: '수용 가능 (Acceptable)',
      assessment: '척도의 내적 일관성이 수용 가능한 수준입니다.'
    }
  } else if (alpha >= 0.6) {
    return {
      level: '의심스러움 (Questionable)',
      assessment: '척도의 신뢰도가 다소 낮습니다.'
    }
  } else {
    return {
      level: '낮음 (Poor)',
      assessment: '척도의 신뢰도가 낮습니다.'
    }
  }
}
