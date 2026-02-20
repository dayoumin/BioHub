/**
 * 변수 타입 매핑 유틸리티
 *
 * UI 타입 (number/string/date/boolean)과
 * variable-requirements.ts의 VariableType 간 변환 및 호환성 검사
 */

import { VariableType } from '@/lib/statistics/variable-requirements'

/**
 * UI 타입 → VariableType 매핑
 * 각 UI 타입이 허용하는 VariableType 목록
 *
 * 주의: binary 타입은 별도의 값 검증이 필요함 (isBinaryColumn 사용)
 * - number: continuous, ordinal, count (binary는 값 검증 필요)
 * - string: categorical (binary는 값 검증 필요)
 * - boolean: binary, categorical
 */
const TYPE_MAPPING: Record<string, VariableType[]> = {
  'number': ['continuous', 'ordinal', 'count'],
  'string': ['categorical'],
  'boolean': ['binary', 'categorical'],
  'date': ['date'],
}

/**
 * 컬럼이 이진형(binary) 데이터인지 검증
 *
 * @param values - 컬럼의 값 배열
 * @returns 이진형 여부
 *
 * @example
 * isBinaryColumn([0, 1, 0, 1]) // true
 * isBinaryColumn(['Yes', 'No', 'Yes']) // true
 * isBinaryColumn([1, 2, 3, 4, 5]) // false
 * isBinaryColumn(['A', 'B', 'C']) // false
 */
export function isBinaryColumn(values: unknown[]): boolean {
  const validValues = values.filter(v => v !== null && v !== undefined && v !== '')
  if (validValues.length === 0) return false

  const uniqueValues = new Set<string>()

  for (const v of validValues) {
    // 정규화된 값으로 변환
    let normalized: string
    if (typeof v === 'boolean') {
      normalized = v ? 'true' : 'false'
    } else if (typeof v === 'number') {
      normalized = String(v)
    } else {
      normalized = String(v).toLowerCase().trim()
    }

    uniqueValues.add(normalized)

    // 3개 이상의 고유값이면 binary 아님
    if (uniqueValues.size > 2) return false
  }

  // 정확히 2개의 고유값이어야 binary
  // (1개만 있는 경우는 상수이므로 제외)
  return uniqueValues.size === 2
}

/**
 * 컬럼 타입과 실제 값을 고려한 타입 호환성 검사
 *
 * @param columnType - 열의 UI 타입
 * @param allowedTypes - 역할이 허용하는 VariableType 배열
 * @param columnValues - 컬럼의 실제 값들 (binary 검증용, 선택)
 * @returns 호환 여부
 */
export function isTypeCompatibleWithValues(
  columnType: 'number' | 'string' | 'date' | 'boolean',
  allowedTypes: VariableType[],
  columnValues?: unknown[]
): boolean {
  // 기본 타입 매핑 확인
  const mappedTypes = TYPE_MAPPING[columnType]
  if (!mappedTypes) return false

  // 기본 매핑에서 호환되면 true
  if (allowedTypes.some(t => mappedTypes.includes(t))) {
    return true
  }

  // binary 타입이 허용되는 경우
  if (allowedTypes.includes('binary')) {
    // boolean은 항상 binary와 호환
    if (columnType === 'boolean') {
      return true
    }

    // number/string은 값 검증 필요
    if (columnValues && columnValues.length > 0) {
      return isBinaryColumn(columnValues)
    }

    // 값이 없으면 binary 호환 불가 (안전한 기본값)
    return false
  }

  return false
}

/**
 * 열 타입이 역할의 허용 타입과 호환되는지 확인
 *
 * @param columnType - 열의 UI 타입 (number/string/date/boolean)
 * @param allowedTypes - 역할이 허용하는 VariableType 배열
 * @returns 호환 여부
 *
 * @example
 * // number 열은 continuous, ordinal, count와 호환
 * isTypeCompatible('number', ['continuous']) // true
 * isTypeCompatible('number', ['categorical']) // false
 *
 * // boolean 열은 binary, categorical과 호환
 * isTypeCompatible('boolean', ['binary']) // true
 * isTypeCompatible('boolean', ['continuous']) // false
 *
 * // binary 역할은 number/string도 잠재적 호환 (값 검증 권장)
 * isTypeCompatible('number', ['binary']) // true
 * isTypeCompatible('string', ['binary']) // true
 */
export function isTypeCompatible(
  columnType: 'number' | 'string' | 'date' | 'boolean',
  allowedTypes: VariableType[]
): boolean {
  const mappedTypes = TYPE_MAPPING[columnType]

  // 매핑되지 않은 타입은 호환 불가
  if (!mappedTypes) {
    return false
  }

  // 기본 매핑에서 호환되면 true
  if (allowedTypes.some(t => mappedTypes.includes(t))) {
    return true
  }

  // binary 타입이 허용되면 number/string도 잠재적 호환
  // (실제 값 검증은 isTypeCompatibleWithValues 사용 권장)
  if (allowedTypes.includes('binary') && (columnType === 'number' || columnType === 'string')) {
    return true
  }

  return false
}

/**
 * VariableType을 UI 타입으로 변환
 *
 * @param type - variable-requirements.ts의 VariableType
 * @returns UI 타입 (number/string/date/boolean)
 *
 * @example
 * variableTypeToUIType('continuous') // 'number'
 * variableTypeToUIType('categorical') // 'string'
 * variableTypeToUIType('binary') // 'boolean'
 *
 * // 매핑되지 않은 타입은 'string' 반환
 * variableTypeToUIType('unknown' as any) // 'string'
 */
export function variableTypeToUIType(
  type: VariableType
): 'number' | 'string' | 'date' | 'boolean' {
  switch (type) {
    case 'continuous':
    case 'ordinal':
    case 'count':
      return 'number'
    case 'binary':
      return 'boolean'
    case 'date':
      return 'date'
    case 'categorical':
    default:
      return 'string'
  }
}

/**
 * 허용된 VariableType 목록을 호환되는 UI 타입 목록으로 변환
 *
 * @param allowedTypes - 역할이 허용하는 VariableType 배열
 * @returns 호환되는 UI 타입 배열 (중복 제거)
 *
 * @example
 * // categorical, binary를 허용하면 string, number, boolean 모두 호환
 * getCompatibleUITypes(['categorical', 'binary'])
 * // ['string', 'number', 'boolean']
 *
 * // continuous만 허용하면 number만 호환
 * getCompatibleUITypes(['continuous'])
 * // ['number']
 */
export function getCompatibleUITypes(
  allowedTypes: VariableType[]
): Array<'number' | 'string' | 'date' | 'boolean'> {
  const compatibleTypes = new Set<'number' | 'string' | 'date' | 'boolean'>()

  const uiTypes: Array<'number' | 'string' | 'date' | 'boolean'> = [
    'number', 'string', 'date', 'boolean'
  ]

  for (const uiType of uiTypes) {
    if (isTypeCompatible(uiType, allowedTypes)) {
      compatibleTypes.add(uiType)
    }
  }

  return Array.from(compatibleTypes)
}

/**
 * UI 타입의 표시 이름 반환
 *
 * @param type - UI 타입
 * @returns 한글 표시 이름
 */
export function getUITypeName(
  type: 'number' | 'string' | 'date' | 'boolean'
): string {
  switch (type) {
    case 'number':
      return '숫자'
    case 'string':
      return '문자'
    case 'date':
      return '날짜'
    case 'boolean':
      return '논리값'
    default:
      return '알 수 없음'
  }
}

/**
 * VariableType의 표시 이름 반환
 *
 * @param type - VariableType
 * @returns 한글 표시 이름
 */
export function getVariableTypeName(type: VariableType): string {
  switch (type) {
    case 'continuous':
      return '연속형'
    case 'categorical':
      return '범주형'
    case 'binary':
      return '이진형'
    case 'ordinal':
      return '서열형'
    case 'date':
      return '날짜'
    case 'count':
      return '카운트'
    default:
      return '알 수 없음'
  }
}