import type { SequenceValidation } from '@biohub/types'

const DNA_CHARS = new Set('ATGCNatgcn')
const MIN_LENGTH = 100
const AMBIGUOUS_WARN_RATIO = 0.05

/**
 * FASTA 서열 유효성 검사
 *
 * REFERENCE-E0 섹션 8-1 기반:
 * - <100bp → 에러
 * - DNA 아닌 문자 → 에러
 * - N >5% → 경고
 * - FASTA 헤더 자동 제거
 */
export function validateSequence(raw: string): SequenceValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // FASTA 헤더 제거, 공백/숫자/개행 제거
  const cleaned = raw
    .split('\n')
    .filter(line => !line.startsWith('>'))
    .join('')
    .replace(/[\s\d]/g, '')
    .toUpperCase()

  // 길이 검사
  if (cleaned.length === 0) {
    errors.push('서열을 입력하세요.')
    return { valid: false, length: 0, gcContent: 0, ambiguousCount: 0, ambiguousRatio: 0, errors, warnings }
  }

  if (cleaned.length < MIN_LENGTH) {
    errors.push(`최소 ${MIN_LENGTH} bp 이상 필요합니다. (현재: ${cleaned.length} bp)`)
  }

  // 문자 검사
  const invalidChars = new Set<string>()
  for (const ch of cleaned) {
    if (!DNA_CHARS.has(ch)) invalidChars.add(ch)
  }
  if (invalidChars.size > 0) {
    errors.push(`허용되지 않는 문자: ${[...invalidChars].join(', ')}. A, T, G, C, N만 허용됩니다.`)
  }

  // GC 함량
  let gcCount = 0
  let ambiguousCount = 0
  for (const ch of cleaned) {
    if (ch === 'G' || ch === 'C') gcCount++
    if (ch === 'N') ambiguousCount++
  }

  const gcContent = cleaned.length > 0 ? gcCount / cleaned.length : 0
  const ambiguousRatio = cleaned.length > 0 ? ambiguousCount / cleaned.length : 0

  // N 비율 경고
  if (ambiguousRatio > AMBIGUOUS_WARN_RATIO) {
    warnings.push(
      `모호 염기(N)가 ${(ambiguousRatio * 100).toFixed(1)}%입니다. 결과 신뢰도가 낮을 수 있습니다.`
    )
  }

  return {
    valid: errors.length === 0,
    length: cleaned.length,
    gcContent,
    ambiguousCount,
    ambiguousRatio,
    errors,
    warnings,
  }
}

/** FASTA에서 순수 서열만 추출 (헤더, 공백, 숫자 제거) */
export function cleanSequence(raw: string): string {
  return raw
    .split('\n')
    .filter(line => !line.startsWith('>'))
    .join('')
    .replace(/[\s\d]/g, '')
    .toUpperCase()
}
