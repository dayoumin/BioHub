/**
 * 타입 가드 유틸리티
 *
 * CLAUDE.md 규칙: any 절대 금지, unknown + 타입 가드 사용
 *
 * 목적: 모든 컴포넌트와 통계 페이지에서 재사용 가능한
 *       안전한 타입 체크 함수들을 제공합니다.
 *
 * 테스트: Pre-commit hook validation
 */

import { AnalysisResult } from '@/types/analysis'

/**
 * Record<string, unknown> 타입 가드
 *
 * @param value - 검사할 값
 * @returns value가 유효한 객체(배열 제외)인지 여부
 *
 * @example
 * const data: unknown = { name: "test" }
 * if (isRecord(data)) {
 *   // data는 Record<string, unknown> 타입
 *   console.log(data.name)
 * }
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Record<string, unknown>[] 배열 타입 가드
 *
 * @param data - 검사할 배열
 * @returns data의 모든 요소가 유효한 객체인지 여부
 *
 * @example
 * const data: unknown = [{ id: 1 }, { id: 2 }]
 * if (isDataArray(data)) {
 *   // data는 Record<string, unknown>[] 타입
 *   data.forEach(row => console.log(row.id))
 * }
 */
export function isDataArray(data: unknown): data is Record<string, unknown>[] {
  return (
    Array.isArray(data) &&
    data.every(row => isRecord(row))
  )
}

/**
 * 숫자 타입 가드 (유효한 숫자만)
 *
 * @param value - 검사할 값
 * @returns value가 유효한 숫자(NaN, Infinity 제외)인지 여부
 *
 * @example
 * const value: unknown = 42
 * if (isNumeric(value)) {
 *   // value는 number 타입
 *   const result = value * 2
 * }
 */
export function isNumeric(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
}

/**
 * 문자열 타입 가드
 *
 * @param value - 검사할 값
 * @returns value가 문자열인지 여부
 *
 * @example
 * const value: unknown = "hello"
 * if (isString(value)) {
 *   // value는 string 타입
 *   console.log(value.toUpperCase())
 * }
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * 불리언 타입 가드
 *
 * @param value - 검사할 값
 * @returns value가 불리언인지 여부
 *
 * @example
 * const value: unknown = true
 * if (isBoolean(value)) {
 *   // value는 boolean 타입
 *   if (value) { ... }
 * }
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

/**
 * 유효한 데이터 값 타입 가드
 *
 * CSV 파일에서 올 수 있는 유효한 값들을 체크합니다.
 * null은 허용하지만 undefined는 제외합니다.
 *
 * @param value - 검사할 값
 * @returns value가 유효한 데이터 값인지 여부
 *
 * @example
 * const value: unknown = row[columnName]
 * if (isValidValue(value)) {
 *   // value는 string | number | boolean | null
 *   if (value !== null) {
 *     // 추가 처리
 *   }
 * }
 */
export function isValidValue(value: unknown): value is string | number | boolean | null {
  return (
    value === null ||
    isString(value) ||
    isNumeric(value) ||
    isBoolean(value)
  )
}

/**
 * 안전한 숫자 변환
 *
 * unknown 값을 number로 안전하게 변환합니다.
 * 변환 실패 시 null을 반환합니다.
 *
 * @param value - 변환할 값
 * @returns 변환된 숫자 또는 null
 *
 * @example
 * const value: unknown = "123"
 * const num = toNumber(value)
 * if (num !== null) {
 *   // num은 number 타입
 *   console.log(num + 1)
 * }
 */
export function toNumber(value: unknown): number | null {
  if (isNumeric(value)) {
    return value
  }

  if (isString(value)) {
    const trimmed = value.trim()
    if (trimmed === '') return null

    const num = Number(trimmed)
    return isNumeric(num) ? num : null
  }

  return null
}

/**
 * 안전한 문자열 변환
 *
 * unknown 값을 string으로 안전하게 변환합니다.
 * null/undefined는 빈 문자열로 변환됩니다.
 *
 * @param value - 변환할 값
 * @returns 변환된 문자열
 *
 * @example
 * const value: unknown = 123
 * const str = toString(value)
 * // str === "123"
 */
export function toString(value: unknown): string {
  if (isString(value)) {
    return value
  }

  if (value === null || value === undefined) {
    return ''
  }

  if (isNumeric(value) || isBoolean(value)) {
    return String(value)
  }

  // 객체나 배열은 JSON으로 변환
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value)
    } catch {
      return ''
    }
  }

  return ''
}

/**
 * 배열 필터: 숫자만 추출
 *
 * unknown[] 배열에서 유효한 숫자만 필터링합니다.
 *
 * @param values - 필터링할 배열
 * @returns 숫자 배열
 *
 * @example
 * const values: unknown[] = [1, "2", null, 3, "invalid", 4.5]
 * const numbers = filterNumeric(values)
 * // numbers === [1, 2, 3, 4.5]
 */
export function filterNumeric(values: unknown[]): number[] {
  return values
    .map(toNumber)
    .filter((v): v is number => v !== null)
}

/**
 * 배열 필터: 문자열만 추출
 *
 * unknown[] 배열에서 유효한 문자열만 필터링합니다.
 * 빈 문자열은 제외합니다.
 *
 * @param values - 필터링할 배열
 * @returns 문자열 배열
 *
 * @example
 * const values: unknown[] = ["a", 123, null, "b", ""]
 * const strings = filterStrings(values)
 * // strings === ["a", "b"]
 */
export function filterStrings(values: unknown[]): string[] {
  return values
    .filter(isString)
    .filter(s => s.trim() !== '')
}

/**
 * 안전한 객체 키 접근
 *
 * Record<string, unknown>에서 안전하게 값을 가져옵니다.
 * 키가 없으면 undefined를 반환합니다.
 *
 * @param obj - 객체
 * @param key - 키
 * @returns 값 또는 undefined
 *
 * @example
 * const row: Record<string, unknown> = { name: "test", age: 30 }
 * const name = getProperty(row, "name")
 * // name === "test" (unknown 타입)
 */
export function getProperty(
  obj: Record<string, unknown>,
  key: string
): unknown {
  return Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined
}

/**
 * 안전한 객체 키 체크
 *
 * 객체에 특정 키가 존재하는지 체크합니다.
 *
 * @param obj - 객체
 * @param key - 키
 * @returns 키 존재 여부
 *
 * @example
 * const row: Record<string, unknown> = { name: "test" }
 * if (hasProperty(row, "name")) {
 *   const value = row.name  // unknown
 * }
 */
export function hasProperty(
  obj: Record<string, unknown>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

/**
 * null/undefined 체크
 *
 * 값이 null 또는 undefined인지 체크합니다.
 *
 * @param value - 검사할 값
 * @returns null/undefined 여부
 *
 * @example
 * const value: unknown = null
 * if (isNullish(value)) {
 *   console.log("값이 없습니다")
 * }
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

/**
 * 값이 있는지 체크 (null/undefined/빈 문자열 제외)
 *
 * @param value - 검사할 값
 * @returns 값 존재 여부
 *
 * @example
 * const value: unknown = ""
 * if (hasValue(value)) {
 *   // 실행되지 않음
 * }
 */
export function hasValue(value: unknown): boolean {
  if (isNullish(value)) return false
  if (isString(value) && value.trim() === '') return false
  return true
}

// ==========================================
// Worker/통계 결과 타입 가드 (2026-04-04 추가)
// ==========================================

/**
 * 안전한 숫자 추출 (기본값 포함)
 *
 * Record<string, unknown> 객체에서 숫자 필드를 안전하게 추출합니다.
 * PyodideCoreService.getStatisticValue 의 독립 버전.
 *
 * @param obj - 대상 객체
 * @param key - 키
 * @param defaultValue - 기본값 (기본: 0)
 * @returns 숫자 또는 기본값
 */
export function getNumberOrDefault(
  obj: Record<string, unknown>,
  key: string,
  defaultValue: number = 0
): number {
  const value = obj[key]
  return typeof value === 'number' && !isNaN(value) && isFinite(value)
    ? value
    : defaultValue
}

/**
 * 객체가 지정된 키를 모두 가지고 있고 모두 number 타입인지 확인
 *
 * PyodideCoreService.hasStatisticFields 의 독립 버전.
 *
 * @param obj - 대상 객체
 * @param fields - 확인할 필드명들
 * @returns 모든 필드가 존재하고 number인지 여부
 */
export function hasOwnNumberFields(
  obj: Record<string, unknown>,
  fields: string[]
): boolean {
  return fields.every(
    (field) => field in obj && typeof obj[field] === 'number'
  )
}

/**
 * Python Worker 에러 응답 타입 가드 ({ error: string })
 *
 * PyodideCoreService.isPythonError 의 독립 버전.
 *
 * @param obj - 검사할 값
 * @returns Python 에러 응답 여부
 */
export function isPythonErrorShape(
  obj: unknown
): obj is { error: string } {
  return isRecord(obj) && typeof obj.error === 'string'
}

/**
 * Worker 결과에서 필수 필드 존재를 assert
 *
 * 런타임에서 Python Worker 반환값의 핵심 필드가 있는지 검증합니다.
 * 누락 시 메서드명 + 누락 필드를 포함한 에러를 던집니다.
 *
 * @param result - Worker 반환 결과
 * @param requiredFields - 필수 필드명 배열
 * @param methodName - 메서드명 (에러 메시지용)
 * @throws {Error} 필수 필드 누락 시
 */
export function assertWorkerResultFields(
  result: unknown,
  requiredFields: string[],
  methodName: string
): void {
  if (!isRecord(result)) {
    throw new Error(`[${methodName}] Worker 결과가 객체가 아닙니다: ${typeof result}`)
  }
  for (const f of requiredFields) {
    if (!(f in result) || result[f] === undefined) {
      throw new Error(`[${methodName}] 필수 필드 누락 또는 undefined: ${f}`)
    }
  }
}

// ==========================================
// AnalysisResult 타입 가드 (2025-11-24 추가)
// ==========================================

/**
 * Power Analysis 필드 존재 여부 확인
 *
 * @example
 * if (hasPowerAnalysis(results.additional)) {
 *   // results.additional.power는 이제 안전하게 사용 가능
 *   console.log(results.additional.power) // ✅ OK
 * }
 */
export function hasPowerAnalysis(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { power: number } {
  return additional?.power !== undefined
}

/**
 * Required Sample Size 필드 존재 여부 확인
 */
export function hasRequiredSampleSize(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { requiredSampleSize: number } {
  return additional?.requiredSampleSize !== undefined
}

/**
 * R-squared 필드 존재 여부 확인 (회귀분석)
 */
export function hasRSquared(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { rSquared: number } {
  return additional?.rSquared !== undefined
}

/**
 * Adjusted R-squared 필드 존재 여부 확인 (회귀분석)
 */
export function hasAdjustedRSquared(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { adjustedRSquared: number } {
  return additional?.adjustedRSquared !== undefined
}

/**
 * VIF (분산팽창지수) 필드 존재 여부 확인
 */
export function hasVIF(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { vif: number[] } {
  return additional?.vif !== undefined && additional.vif.length > 0
}

/**
 * Accuracy 필드 존재 여부 확인 (분류 모델)
 */
export function hasAccuracy(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { accuracy: number } {
  return additional?.accuracy !== undefined
}

/**
 * Silhouette Score 필드 존재 여부 확인 (군집 분석)
 */
export function hasSilhouetteScore(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { silhouetteScore: number } {
  return additional?.silhouetteScore !== undefined
}

/**
 * Explained Variance Ratio 필드 존재 여부 확인 (PCA)
 */
export function hasExplainedVarianceRatio(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { explainedVarianceRatio: number[] } {
  return additional?.explainedVarianceRatio !== undefined && additional.explainedVarianceRatio.length > 0
}

/**
 * Cronbach's Alpha 필드 존재 여부 확인 (신뢰도 분석)
 */
export function hasAlpha(
  additional?: AnalysisResult['additional']
): additional is NonNullable<AnalysisResult['additional']> & { alpha: number } {
  return additional?.alpha !== undefined
}
