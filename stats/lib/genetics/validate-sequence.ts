import { MIN_SEQUENCE_LENGTH } from '@biohub/types'
import type { SequenceValidation } from '@biohub/types'

const DNA_CHARS = new Set('ATGCN')
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

  // 다중 FASTA 시퀀스 감지: >로 시작하는 헤더가 2개 이상이면 에러 (early exit)
  let headerCount = 0
  let idx = -1
  while ((idx = raw.indexOf('>', idx + 1)) !== -1) {
    if (idx === 0 || raw[idx - 1] === '\n' || raw[idx - 1] === '\r') {
      headerCount++
      if (headerCount > 1) break
    }
  }
  if (headerCount > 1) {
    errors.push('다중 서열이 감지되었습니다. 한 번에 하나의 서열만 입력하세요.')
    return { valid: false, length: 0, gcContent: 0, ambiguousCount: 0, ambiguousRatio: 0, errors, warnings }
  }

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
