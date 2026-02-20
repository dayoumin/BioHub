/**
 * HTML Escape Utility
 *
 * XSS 방어를 위한 HTML 이스케이프 함수
 * 사용자 입력값을 HTML에 안전하게 삽입하기 위해 특수 문자를 이스케이프합니다.
 *
 * @see TWO_PANEL_LAYOUT_CODE_REVIEW.md - XSS 방어 권장 사항
 */

/**
 * HTML 특수 문자를 이스케이프합니다.
 *
 * @param unsafe - 이스케이프할 값 (unknown 타입으로 모든 값 허용)
 * @returns 이스케이프된 안전한 문자열
 *
 * @example
 * ```typescript
 * escapeHtml('<script>alert("XSS")</script>')
 * // → '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 *
 * escapeHtml('student_name & score')
 * // → 'student_name &amp; score'
 *
 * escapeHtml(null)
 * // → 'null'
 *
 * escapeHtml(undefined)
 * // → 'undefined'
 * ```
 */
export function escapeHtml(unsafe: unknown): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 배열의 모든 요소를 HTML 이스케이프합니다.
 *
 * @param unsafeArray - 이스케이프할 배열
 * @returns 이스케이프된 문자열 배열
 *
 * @example
 * ```typescript
 * escapeHtmlArray(['<script>', 'normal text', 'a & b'])
 * // → ['&lt;script&gt;', 'normal text', 'a &amp; b']
 * ```
 */
export function escapeHtmlArray(unsafeArray: unknown[]): string[] {
  return unsafeArray.map(escapeHtml)
}

/**
 * 객체의 모든 값을 HTML 이스케이프합니다.
 *
 * @param unsafeObject - 이스케이프할 객체
 * @returns 이스케이프된 값을 가진 새 객체
 *
 * @example
 * ```typescript
 * escapeHtmlObject({ name: '<script>', age: 25 })
 * // → { name: '&lt;script&gt;', age: '25' }
 * ```
 */
export function escapeHtmlObject<T extends Record<string, unknown>>(
  unsafeObject: T
): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [key, value] of Object.entries(unsafeObject)) {
    result[key] = escapeHtml(value)
  }

  return result
}
