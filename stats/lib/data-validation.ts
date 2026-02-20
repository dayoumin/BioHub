import { VALIDATION, ERROR_MESSAGES } from './constants'

export interface DataValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export interface DatasetValidationOptions {
  requireNumericColumns?: boolean
  minColumns?: number
  maxColumns?: number
  allowMissingValues?: boolean
}

/**
 * 데이터셋 유효성 검증
 */
export function validateDataset(
  data: Record<string, any>[],
  options: DatasetValidationOptions = {}
): DataValidationResult {
  const result: DataValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  // 빈 데이터셋 확인
  if (!data || data.length === 0) {
    result.isValid = false
    result.errors.push('데이터셋이 비어있습니다.')
    return result
  }

  // 행 개수 검증
  if (data.length < VALIDATION.MIN_DATASET_ROWS) {
    result.isValid = false
    result.errors.push(`최소 ${VALIDATION.MIN_DATASET_ROWS}개의 행이 필요합니다.`)
  }

  if (data.length > VALIDATION.MAX_DATASET_ROWS) {
    result.isValid = false
    result.errors.push(`최대 ${VALIDATION.MAX_DATASET_ROWS.toLocaleString()}개의 행까지 지원됩니다.`)
  }

  // 열 구조 검증
  const firstRow = data[0]
  if (!firstRow || Object.keys(firstRow).length === 0) {
    result.isValid = false
    result.errors.push('데이터에 열이 없습니다.')
    return result
  }

  const columns = Object.keys(firstRow)
  
  // 열 개수 검증
  if (options.minColumns && columns.length < options.minColumns) {
    result.isValid = false
    result.errors.push(`최소 ${options.minColumns}개의 열이 필요합니다.`)
  }

  if (options.maxColumns && columns.length > options.maxColumns) {
    result.isValid = false
    result.errors.push(`최대 ${options.maxColumns}개의 열까지 지원됩니다.`)
  }

  // 열 이름 검증
  for (const column of columns) {
    if (!column || column.trim().length === 0) {
      result.errors.push('빈 열 이름이 있습니다.')
    }
    
    if (column.length > VALIDATION.MAX_COLUMN_NAME_LENGTH) {
      result.errors.push(`열 이름 "${column}"이 너무 깁니다. (최대 ${VALIDATION.MAX_COLUMN_NAME_LENGTH}자)`)
    }
  }

  // 중복 열 이름 확인
  const uniqueColumns = new Set(columns)
  if (uniqueColumns.size !== columns.length) {
    result.errors.push('중복된 열 이름이 있습니다.')
  }

  // 숫자형 열 검증
  if (options.requireNumericColumns) {
    const numericColumns = getNumericColumns(data)
    if (numericColumns.length === 0) {
      result.isValid = false
      result.errors.push('최소 1개의 숫자형 열이 필요합니다.')
    }
  }

  // 누락값 확인
  const missingStats = checkMissingValues(data)
  if (missingStats.totalMissing > 0) {
    if (!options.allowMissingValues) {
      result.warnings.push(`${missingStats.totalMissing.toLocaleString()}개의 누락값이 발견되었습니다.`)
    }
    
    if (missingStats.missingRatio > 0.5) {
      result.warnings.push('데이터의 50% 이상이 누락값입니다. 분석 결과의 신뢰성이 떨어질 수 있습니다.')
    }
  }

  // 전체적으로 에러가 있으면 유효하지 않음
  if (result.errors.length > 0) {
    result.isValid = false
  }

  return result
}

/**
 * 숫자형 열 식별
 */
export function getNumericColumns(data: Record<string, any>[]): string[] {
  if (!data || data.length === 0) return []

  const columns = Object.keys(data[0])
  const numericColumns: string[] = []

  for (const column of columns) {
    // 샘플 데이터로 숫자 여부 확인 (최대 100개 행)
    const sampleSize = Math.min(100, data.length)
    let numericCount = 0

    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][column]
      if (value !== null && value !== undefined && value !== '') {
        const numValue = Number(value)
        if (!isNaN(numValue) && isFinite(numValue)) {
          numericCount++
        }
      }
    }

    // 80% 이상이 숫자면 숫자형 열로 판단
    if (numericCount / sampleSize >= 0.8) {
      numericColumns.push(column)
    }
  }

  return numericColumns
}

/**
 * 누락값 통계
 */
export function checkMissingValues(data: Record<string, any>[]) {
  if (!data || data.length === 0) {
    return { totalMissing: 0, missingRatio: 0, missingByColumn: {} }
  }

  const columns = Object.keys(data[0])
  const missingByColumn: Record<string, number> = {}
  let totalMissing = 0
  const totalCells = data.length * columns.length

  for (const column of columns) {
    let missingCount = 0
    for (const row of data) {
      const value = row[column]
      if (value === null || value === undefined || value === '') {
        missingCount++
        totalMissing++
      }
    }
    missingByColumn[column] = missingCount
  }

  return {
    totalMissing,
    missingRatio: totalCells > 0 ? totalMissing / totalCells : 0,
    missingByColumn
  }
}

/**
 * 선택된 열들의 데이터 추출 및 검증
 */
export function extractColumnData(
  data: Record<string, any>[],
  columns: string[]
): { columnData: number[][]; validationResult: DataValidationResult } {
  const result: DataValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  const columnData: number[][] = []

  for (const column of columns) {
    const values = data
      .map(row => {
        const value = row[column]
        if (value === null || value === undefined || value === '') {
          return NaN
        }
        return Number(value)
      })
      .filter(val => !isNaN(val))

    if (values.length === 0) {
      result.isValid = false
      result.errors.push(`열 "${column}"에 유효한 숫자 데이터가 없습니다.`)
      continue
    }

    if (values.length < 3) {
      result.warnings.push(`열 "${column}"의 유효한 데이터가 ${values.length}개뿐입니다. 통계 분석 결과가 부정확할 수 있습니다.`)
    }

    columnData.push(values)
  }

  return { columnData, validationResult: result }
}

/**
 * 통계 분석 전 가정 검증
 */
export function validateAnalysisAssumptions(
  data: number[][],
  analysisType: string
): DataValidationResult {
  const result: DataValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  if (!data || data.length === 0) {
    result.isValid = false
    result.errors.push('분석할 데이터가 없습니다.')
    return result
  }

  switch (analysisType) {
    case 'ttest_one':
      if (data[0].length < 3) {
        result.isValid = false
        result.errors.push('t-검정은 최소 3개의 관측값이 필요합니다.')
      }
      break

    case 'ttest_two':
      if (data.length < 2) {
        result.isValid = false
        result.errors.push('독립표본 t-검정은 2개의 그룹이 필요합니다.')
      }
      if (data[0].length < 3 || data[1].length < 3) {
        result.isValid = false
        result.errors.push('각 그룹은 최소 3개의 관측값이 필요합니다.')
      }
      break

    case 'correlation':
      if (data.length < 2) {
        result.isValid = false
        result.errors.push('상관분석은 2개의 변수가 필요합니다.')
      }
      if (data[0].length < 3 || data[1].length < 3) {
        result.isValid = false
        result.errors.push('상관분석은 각 변수당 최소 3개의 관측값이 필요합니다.')
      }
      // 상관분석에서는 같은 개수의 관측값이 필요
      if (data[0].length !== data[1].length) {
        result.warnings.push('두 변수의 관측값 개수가 다릅니다. 짧은 쪽에 맞춰서 분석됩니다.')
      }
      break
  }

  return result
}

/**
 * 파일 검증
 */
export function validateFile(file: File): DataValidationResult {
  const result: DataValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  }

  // 파일 크기 확인
  if (file.size > VALIDATION.MAX_DATASET_ROWS * 1000) { // 대략적인 추정
    result.warnings.push('파일이 매우 큽니다. 업로드에 시간이 걸릴 수 있습니다.')
  }

  // 파일 형식 확인 (매직 넘버 대신 상수 사용)
  const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
  if (!allowedTypes.includes(file.type)) {
    result.isValid = false
    result.errors.push('지원되지 않는 파일 형식입니다. CSV 파일만 지원됩니다.')
  }

  return result
}