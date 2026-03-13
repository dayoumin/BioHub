/**
 * Assertion 유틸리티
 *
 * Non-null assertion (`!`) 대안으로, 런타임 검증 + 타입 좁히기를 동시에 수행합니다.
 *
 * @example
 * const el = document.getElementById('app')
 * assertDefined(el, '#app element not found')
 * // 이후 el은 HTMLElement 타입으로 좁혀짐
 */

/**
 * 값이 null 또는 undefined가 아님을 런타임에서 검증합니다.
 * 검증 실패 시 Error를 throw합니다.
 *
 * @param value - 검증할 값
 * @param msg - 실패 시 에러 메시지
 * @throws {Error} value가 null 또는 undefined일 때
 */
export function assertDefined<T>(
  value: T | null | undefined,
  msg?: string
): asserts value is T {
  if (value == null) {
    throw new Error(msg ?? 'Expected defined value')
  }
}

/**
 * 조건이 true임을 런타임에서 검증합니다.
 * 검증 실패 시 Error를 throw합니다.
 *
 * @param condition - 검증할 조건
 * @param msg - 실패 시 에러 메시지
 * @throws {Error} condition이 false일 때
 */
export function assert(
  condition: boolean,
  msg?: string
): asserts condition {
  if (!condition) {
    throw new Error(msg ?? 'Assertion failed')
  }
}
