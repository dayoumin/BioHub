/**
 * CSV PapaParse 에러 분류 유틸
 *
 * Delimiter/Quotes → 치명적 (파싱 중단)
 * FieldMismatch    → 경고 수준 (계속 진행, 오류 행이 results.data에 포함됨)
 */

import type { ParseError } from 'papaparse'

/** 치명적 에러 타입 — 파싱을 중단해야 하는 구조적 오류 */
const CRITICAL_TYPES = new Set<ParseError['type']>(['Delimiter', 'Quotes'])

/**
 * 치명적 파싱 에러를 찾아 반환.
 * 없으면 undefined (FieldMismatch 등 경고 수준만 있는 경우).
 */
export function findCriticalParseError(errors: ParseError[]): ParseError | undefined {
  return errors.find((e) => CRITICAL_TYPES.has(e.type))
}

/** 경고 수준 오류용 toast 메시지 */
export function parseWarningMessage(errorCount: number): string {
  return `일부 행 파싱 오류 (${errorCount}건). 데이터를 확인하세요.`
}
