/**
 * 코드 템플릿 공통 헬퍼
 *
 * 변수명 추출 + R/Python 안전 이름 변환.
 */

import type { CodeTemplateInput } from '../code-template-types'

// ─── 변수명 추출 ───

/** 종속변수 이름 추출 (첫 번째) */
export function dep(input: CodeTemplateInput, fallback = 'value'): string {
  const v = input.variableMapping.dependentVar
  return Array.isArray(v) ? v[0] : v ?? fallback
}

/** 그룹/독립변수 이름 추출 */
export function group(input: CodeTemplateInput, fallback = 'group'): string {
  const ind = input.variableMapping.independentVar
  const indStr = Array.isArray(ind) ? ind[0] : ind
  return input.variableMapping.groupVar ?? indStr ?? fallback
}

// ─── 변수명 Sanitization ───

/** 안전한 R 이름이 필요한지 판별 (영문자/숫자/._만 허용, 숫자 시작 금지) */
function needsRQuoting(name: string): boolean {
  return !/^[A-Za-z.][A-Za-z0-9._]*$/.test(name)
}

/** R/Python 공용 문자열 리터럴 이스케이프 */
function escapeStringLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\0/g, '')
}

/** R에서 안전하게 사용할 수 있는 변수명 (backtick 래핑) */
export function safeR(name: string): string {
  return needsRQuoting(name)
    ? `\`${name
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')
      .replace(/\0/g, '')}\``
    : name
}

/** R 문자열 리터럴 */
export function safeRString(value: string): string {
  return `"${escapeStringLiteral(value)}"`
}

/** R data$column 접근 — 특수문자 있으면 data[["col"]] 형태 */
export function safeRCol(df: string, col: string): string {
  return needsRQuoting(col) ? `${df}[[${safeRString(col)}]]` : `${df}$${col}`
}

/** R formula에서 안전한 변수명 (backtick 래핑) */
export function safeRFormula(name: string): string {
  return safeR(name)
}

/** Python에서 안전하게 사용할 수 있는 컬럼명 (따옴표 이스케이프) */
export function safePy(name: string): string {
  return escapeStringLiteral(name)
}

/** Python data["column"] 접근 */
export function safePyCol(df: string, col: string): string {
  return `${df}["${safePy(col)}"]`
}

/** 파일명 안전 처리 (따옴표 이스케이프) */
export function safeFileName(name: string): string {
  return escapeStringLiteral(name)
}
