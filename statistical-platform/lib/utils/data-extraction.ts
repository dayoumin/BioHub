/**
 * 데이터 추출 유틸리티
 *
 * CSV/업로드 데이터에서 숫자 값을 안전하게 추출합니다.
 * 문자열("123") → 숫자(123) 변환 포함
 *
 * 스마트플로의 extractNumericData와 동일한 로직 사용
 */

/**
 * unknown 타입 값을 숫자로 변환
 *
 * @param value - 변환할 값 (number | string | null | undefined | ...)
 * @returns 변환된 숫자 또는 null
 *
 * @example
 * extractNumericValue(123) → 123
 * extractNumericValue("123") → 123
 * extractNumericValue("123.45") → 123.45
 * extractNumericValue("abc") → null
 * extractNumericValue(null) → null
 * extractNumericValue(undefined) → null
 */
export function extractNumericValue(value: unknown): number | null {
  // 이미 숫자인 경우
  if (typeof value === 'number') {
    return isNaN(value) ? null : value
  }

  // 문자열인 경우 parseFloat 시도
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return null

    const num = parseFloat(trimmed)
    return isNaN(num) ? null : num
  }

  // 그 외 (null, undefined, object 등)
  return null
}

/**
 * 데이터 행에서 특정 컬럼의 숫자 값 추출
 *
 * @param row - 데이터 행 (object)
 * @param col - 컬럼명
 * @returns 추출된 숫자 또는 null
 *
 * @example
 * extractRowValue({ age: 25 }, 'age') → 25
 * extractRowValue({ age: "25" }, 'age') → 25
 * extractRowValue({ age: "abc" }, 'age') → null
 * extractRowValue({ age: null }, 'age') → null
 * extractRowValue({}, 'age') → null
 */
export function extractRowValue(row: unknown, col: string): number | null {
  if (typeof row !== 'object' || row === null) {
    return null
  }

  if (!(col in row)) {
    return null
  }

  const value = (row as Record<string, unknown>)[col]
  return extractNumericValue(value)
}

/**
 * 데이터 배열에서 특정 컬럼의 모든 유효한 숫자 값 추출
 *
 * @param data - 데이터 배열
 * @param columnName - 컬럼명
 * @returns 숫자 배열 (null 값 제외)
 *
 * @example
 * const data = [
 *   { height: 170 },
 *   { height: "180" },
 *   { height: "abc" },
 *   { height: null }
 * ]
 * extractColumnData(data, 'height') → [170, 180]
 */
export function extractColumnData(
  data: Array<Record<string, unknown>>,
  columnName: string
): number[] {
  const result: number[] = []

  for (const row of data) {
    const value = extractRowValue(row, columnName)
    if (value !== null) {
      result.push(value)
    }
  }

  return result
}
