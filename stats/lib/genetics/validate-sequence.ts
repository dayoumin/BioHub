import type { SequenceValidation } from '@/lib/genetics/types'

const DNA_CHARS = new Set('ATGCN')
const MIN_SEQUENCE_LENGTH = 100
const AMBIGUOUS_WARN_RATIO = 0.05

/** FASTA에서 순수 서열만 추출 (헤더, 공백, 숫자 제거) */
export function cleanSequence(raw: string): string {
  return raw
    .split('\n')
    .filter(line => !line.startsWith('>'))
    .join('')
    .replace(/[\s\d]/g, '')
    .toUpperCase()
}

/**
 * FASTA 서열 유효성 검사 (단일 패스)
 *
 * REFERENCE-E0 섹션 8-1 기반:
 * - <100bp → 에러
 * - DNA 아닌 문자 → 에러
 * - N >5% → 경고
 */
export function validateSequence(raw: string): SequenceValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const cleaned = cleanSequence(raw)

  if (cleaned.length === 0) {
    errors.push('서열을 입력하세요.')
    return { valid: false, length: 0, gcContent: 0, ambiguousCount: 0, ambiguousRatio: 0, errors, warnings }
  }

  if (cleaned.length < MIN_SEQUENCE_LENGTH) {
    errors.push(`최소 ${MIN_SEQUENCE_LENGTH} bp 이상 필요합니다. (현재: ${cleaned.length} bp)`)
  }

  // 단일 패스: 문자 검증 + GC 함량 + N 카운트
  const invalidChars = new Set<string>()
  let gcCount = 0
  let ambiguousCount = 0
  for (const ch of cleaned) {
    if (!DNA_CHARS.has(ch)) invalidChars.add(ch)
    if (ch === 'G' || ch === 'C') gcCount++
    if (ch === 'N') ambiguousCount++
  }

  if (invalidChars.size > 0) {
    errors.push(`허용되지 않는 문자: ${[...invalidChars].join(', ')}. A, T, G, C, N만 허용됩니다.`)
  }

  const gcContent = gcCount / cleaned.length
  const ambiguousRatio = ambiguousCount / cleaned.length

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
