/**
 * Groups Shared Utilities
 *
 * Groups 파일들에서 공통으로 사용하는 유틸리티 함수
 * DRY 원칙 준수 및 코드 재사용성 향상
 */

/**
 * unknown[] 배열을 Record<string, unknown>[] 배열로 안전하게 변환
 *
 * @param data - 원본 데이터 배열
 * @returns 타입 안전하게 변환된 데이터 배열
 *
 * @example
 * const rows = extractDataRows([{ name: 'Alice' }, { name: 'Bob' }])
 * // rows는 Record<string, unknown>[] 타입
 */
export function extractDataRows(data: unknown[]): Record<string, unknown>[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.filter((row): row is Record<string, unknown> => {
    return row !== null && typeof row === 'object' && !Array.isArray(row)
  })
}

/**
 * 데이터 배열에서 특정 열의 숫자 값만 추출
 *
 * @param data - 원본 데이터 배열
 * @param column - 추출할 열 이름
 * @returns 숫자 배열 (NaN 제거됨)
 *
 * @example
 * const values = extractNumericValues([{ age: 25 }, { age: '30' }], 'age')
 * // [25, 30]
 */
export function extractNumericValues(data: unknown[], column: string): number[] {
  if (!Array.isArray(data)) {
    return []
  }

  const values: number[] = []

  for (const row of data) {
    if (!row || typeof row !== 'object') {
      continue
    }

    const value = (row as Record<string, unknown>)[column]

    if (typeof value === 'number' && !isNaN(value)) {
      values.push(value)
    } else if (typeof value === 'string') {
      const parsed = parseFloat(value)
      if (!isNaN(parsed)) {
        values.push(parsed)
      }
    }
  }

  return values
}

/**
 * unknown 값을 안전하게 숫자로 변환
 *
 * @param value - 변환할 값
 * @returns 숫자로 변환된 값 또는 NaN
 *
 * @example
 * safeParseNumber(42) // 42
 * safeParseNumber('42') // 42
 * safeParseNumber('abc') // NaN
 * safeParseNumber(null) // NaN
 */
export function safeParseNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value
  }
  if (typeof value === 'string') {
    return parseFloat(value)
  }
  return NaN
}

/**
 * 두 변수에서 유효한 숫자 쌍만 추출
 *
 * @param data - 원본 데이터 배열
 * @param var1 - 첫 번째 변수 이름
 * @param var2 - 두 번째 변수 이름
 * @returns [values1, values2] 튜플
 *
 * @example
 * const [x, y] = extractPairedValues(data, 'before', 'after')
 * // x와 y는 같은 길이의 숫자 배열
 */
export function extractPairedValues(
  data: unknown[],
  var1: string,
  var2: string
): [number[], number[]] {
  const values1: number[] = []
  const values2: number[] = []

  extractDataRows(data).forEach(row => {
    const v1Raw = row[var1]
    const v2Raw = row[var2]
    const v1 = safeParseNumber(v1Raw)
    const v2 = safeParseNumber(v2Raw)

    if (!isNaN(v1) && !isNaN(v2)) {
      values1.push(v1)
      values2.push(v2)
    }
  })

  return [values1, values2]
}

/**
 * 그룹별로 데이터를 분리
 *
 * @param data - 원본 데이터 배열
 * @param groupColumn - 그룹 열 이름
 * @param valueColumn - 값 열 이름
 * @returns 그룹명 -> 값 배열 매핑
 *
 * @example
 * const groups = extractGroupedValues(data, 'treatment', 'score')
 * // { 'A': [10, 20], 'B': [15, 25] }
 */
export function extractGroupedValues(
  data: unknown[],
  groupColumn: string,
  valueColumn: string
): Record<string, number[]> {
  const groups: Record<string, number[]> = {}

  extractDataRows(data).forEach(row => {
    const group = String(row[groupColumn] ?? '')
    const value = safeParseNumber(row[valueColumn])

    if (group && !isNaN(value)) {
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(value)
    }
  })

  return groups
}

/**
 * params 객체 타입 가드 및 변환
 *
 * @param params - 검증할 params
 * @returns [isValid, paramsObj] 튜플
 *
 * @example
 * const [isValid, paramsObj] = validateParams(params)
 * if (!isValid) return { success: false, error: '...' }
 * const column = paramsObj.column
 */
export function validateParams(
  params: unknown
): [false, null] | [true, Record<string, unknown>] {
  if (!params || typeof params !== 'object') {
    return [false, null]
  }
  return [true, params as Record<string, unknown>]
}

/**
 * 문자열 타입 체크 및 길이 검증
 *
 * @param value - 검증할 값
 * @param maxLength - 최대 길이 (기본값: 100)
 * @returns 유효한 문자열 또는 null
 *
 * @example
 * const column = validateString(paramsObj.column)
 * if (!column) return { success: false, error: '열을 선택하세요' }
 */
export function validateString(value: unknown, maxLength = 100): string | null {
  if (typeof value !== 'string') {
    return null
  }
  if (value.length === 0 || value.length > maxLength) {
    return null
  }
  return value
}

/**
 * 숫자 타입 체크 및 범위 검증
 *
 * @param value - 검증할 값
 * @param min - 최솟값 (선택)
 * @param max - 최댓값 (선택)
 * @returns 유효한 숫자 또는 null
 *
 * @example
 * const alpha = validateNumber(paramsObj.alpha, 0, 1)
 * if (alpha === null) return { success: false, error: '유효한 알파값을 입력하세요' }
 */
export function validateNumber(
  value: unknown,
  min?: number,
  max?: number
): number | null {
  if (typeof value !== 'number' || isNaN(value)) {
    return null
  }
  if (min !== undefined && value < min) {
    return null
  }
  if (max !== undefined && value > max) {
    return null
  }
  return value
}

/**
 * 배열 타입 체크 및 최소 길이 검증
 *
 * @param value - 검증할 값
 * @param minLength - 최소 길이 (기본값: 1)
 * @returns 유효한 배열 또는 null
 *
 * @example
 * const columns = validateArray(paramsObj.columns, 2)
 * if (!columns) return { success: false, error: '최소 2개의 열이 필요합니다' }
 */
export function validateArray(value: unknown, minLength = 1): unknown[] | null {
  if (!Array.isArray(value)) {
    return null
  }
  if (value.length < minLength) {
    return null
  }
  return value
}

/**
 * 숫자 배열인지 검증하고 NaN 필터링
 *
 * @param value - 검증할 값
 * @param minLength - 최소 길이 (기본값: 1)
 * @returns 유효한 숫자 배열 또는 null
 *
 * @example
 * const values = validateNumberArray(paramsObj.values)
 * if (!values) return { success: false, error: '유효한 숫자 배열이 필요합니다' }
 */
export function validateNumberArray(value: unknown, minLength = 1): number[] | null {
  if (!Array.isArray(value)) {
    return null
  }

  const numbers = value
    .map(v => safeParseNumber(v))
    .filter(n => !isNaN(n))

  if (numbers.length < minLength) {
    return null
  }

  return numbers
}

/**
 * 2차원 숫자 배열(행렬)인지 검증하고 NaN 필터링
 *
 * @param value - 검증할 값
 * @param minRows - 최소 행 수 (기본값: 1)
 * @param minCols - 최소 열 수 (기본값: 1)
 * @returns 유효한 숫자 행렬 또는 null
 *
 * @example
 * const matrix = validateNumberMatrix(paramsObj.dataMatrix, 2, 2)
 * if (!matrix) return { success: false, error: '최소 2x2 행렬이 필요합니다' }
 */
export function validateNumberMatrix(
  value: unknown,
  minRows = 1,
  minCols = 1
): number[][] | null {
  if (!Array.isArray(value) || value.length < minRows) {
    return null
  }

  const matrix: number[][] = []

  for (const row of value) {
    if (!Array.isArray(row)) {
      return null
    }

    const numRow = row
      .map(v => safeParseNumber(v))
      .filter(n => !isNaN(n))

    if (numRow.length < minCols) {
      return null
    }

    matrix.push(numRow)
  }

  return matrix.length >= minRows ? matrix : null
}

/**
 * 행렬 전치 (transpose)
 *
 * @param matrix - 원본 행렬
 * @returns 전치된 행렬
 *
 * @example
 * const transposed = transposeMatrix([[1, 2], [3, 4]])
 * // [[1, 3], [2, 4]]
 */
export function transposeMatrix(matrix: number[][]): number[][] {
  if (matrix.length === 0 || matrix[0].length === 0) {
    return []
  }

  const rows = matrix.length
  const cols = matrix[0].length
  const transposed: number[][] = []

  for (let col = 0; col < cols; col++) {
    const newRow: number[] = []
    for (let row = 0; row < rows; row++) {
      newRow.push(matrix[row][col])
    }
    transposed.push(newRow)
  }

  return transposed
}
