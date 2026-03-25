/**
 * Fisheries 도구 공통 컬럼 후보 + 자동 감지 헬퍼.
 * vbgf, length-weight, condition-factor 페이지에서 공유.
 */

/** 연령 컬럼 후보 (case-insensitive 매칭) */
const AGE_HINTS = ['age', '연령', 'year'] as const

/** 체장 컬럼 후보 (case-insensitive 매칭) */
const LENGTH_HINTS = ['length', '체장', 'tl', 'sl', 'fl'] as const

/** 체중 컬럼 후보 (case-insensitive 매칭) */
const WEIGHT_HINTS = ['weight', '체중', 'bw', 'wt'] as const

/**
 * CSV 헤더에서 힌트에 맞는 컬럼을 찾는다.
 * 1차: 정확 일치 (case-insensitive)
 * 2차: 부분 문자열 매칭 (헤더가 힌트를 포함)
 * 없으면 fallback 인덱스 반환.
 */
export function detectColumn(
  headers: string[],
  hints: readonly string[],
  fallbackIndex: number,
): string {
  const lower = hints.map((h) => h.toLowerCase())
  // 1차: 정확 일치
  const exact = headers.find((h) => lower.includes(h.toLowerCase()))
  if (exact) return exact
  // 2차: 부분 문자열 매칭 (헤더에 힌트가 포함되어 있으면 매칭)
  const partial = headers.find((h) => {
    const hl = h.toLowerCase()
    return lower.some((hint) => hl.includes(hint))
  })
  if (partial) return partial
  return headers[fallbackIndex] ?? headers[0]
}

export function detectAgeColumn(headers: string[]): string {
  return detectColumn(headers, AGE_HINTS, 0)
}

export function detectLengthColumn(headers: string[]): string {
  return detectColumn(headers, LENGTH_HINTS, 0)
}

export function detectWeightColumn(headers: string[]): string {
  return detectColumn(headers, WEIGHT_HINTS, 1)
}
