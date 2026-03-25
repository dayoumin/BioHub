/**
 * CSV 셀 값을 숫자로 파싱한다.
 * 빈 문자열, null, undefined는 NaN으로 반환 — Number('')이 0을 반환하는 함정 방지.
 */
export function parseNumericCell(value: string | number | null | undefined): number {
  if (value === '' || value === null || value === undefined) return NaN
  return Number(value)
}
