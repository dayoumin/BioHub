/**
 * Fisheries 도구 공통 컬럼 후보 + 자동 감지 헬퍼.
 * vbgf, length-weight, condition-factor 페이지에서 공유.
 */

/** 연령 컬럼 후보 (case-insensitive 매칭) */
const AGE_HINTS = ['age', '연령'] as const

/** 체장 컬럼 후보 (case-insensitive 매칭) */
const LENGTH_HINTS = ['length', '체장', 'tl', 'sl', 'fl'] as const

/** 체중 컬럼 후보 (case-insensitive 매칭) */
const WEIGHT_HINTS = ['weight', '체중', 'bw', 'wt'] as const

/**
 * 헤더를 단어 토큰으로 분리한다.
 * 구분자: _ - . 공백 괄호 + camelCase 경계 (소→대 전환)
 * 예: 'fish_age' → ['fish','age'], 'fishAge' → ['fish','Age'],
 *     'TL_cm' → ['TL','cm'], '연령(세)' → ['연령','세']
 */
function tokenize(header: string): string[] {
  // camelCase 경계에 구분자 삽입 (소문자→대문자, 연속대문자→소문자)
  const spaced = header
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
  return spaced.split(/[_\-.\s()]+/).filter(Boolean)
}

/**
 * 힌트가 헤더의 토큰과 일치하는지 검사.
 * ASCII 힌트: 토큰 단위 case-insensitive 매칭
 *   예: 'age' → 'fish_age' ✓, 'fishAge' ✓, 'stage' ✗
 *       'tl'  → 'TL_cm' ✓, 'bottle' ✗, 'title' ✗
 * 한글 힌트: 토큰의 시작과 일치 (접두 매칭)
 *   예: '연령' → '연령(세)' ✓, '사육연령대' ✗
 */
function matchesToken(header: string, hint: string): boolean {
  const isKorean = /[가-힣]/.test(hint)
  if (isKorean) {
    // 한글: 토큰 접두 매칭 (복합어 내부 매칭 방지)
    const tokens = tokenize(header)
    return tokens.some((t) => t.startsWith(hint))
  }
  // ASCII: 토큰 정확 일치 (case-insensitive)
  const tokens = tokenize(header)
  const hintLower = hint.toLowerCase()
  return tokens.some((t) => t.toLowerCase() === hintLower)
}

/**
 * CSV 헤더에서 힌트에 맞는 컬럼을 찾는다.
 * 1차: 정확 일치 (case-insensitive)
 * 2차: 단어 경계 기준 매칭 (구분자로 분리된 토큰)
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
  // 2차: 토큰 매칭 (age→fish_age/fishAge ✓, stage ✗)
  const tokenMatch = headers.find((h) =>
    hints.some((hint) => matchesToken(h, hint)),
  )
  if (tokenMatch) return tokenMatch
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
