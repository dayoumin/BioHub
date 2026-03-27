import { MIN_SEQUENCE_LENGTH } from '@biohub/types'
import type { BlastProgram, SequenceValidation } from '@biohub/types'

const DNA_CHARS = new Set('ATGCN')
const PROTEIN_CHARS = new Set('ACDEFGHIKLMNPQRSTVWYBXZJUO*')

/** BLAST 프로그램이 DNA 입력을 받는지 여부 */
export function isDnaProgram(program: BlastProgram): boolean {
  return program === 'blastn' || program === 'blastx' || program === 'tblastx'
}
const AMBIGUOUS_WARN_RATIO = 0.05

/** 다중 FASTA 헤더(>)가 2개 이상인지 검사 */
function isMultiFasta(raw: string): boolean {
  let count = 0
  let idx = -1
  while ((idx = raw.indexOf('>', idx + 1)) !== -1) {
    if (idx === 0 || raw[idx - 1] === '\n' || raw[idx - 1] === '\r') {
      if (++count > 1) return true
    }
  }
  return false
}

const MULTI_FASTA_ERROR = '다중 서열이 감지되었습니다. 한 번에 하나의 서열만 입력하세요.'
const EMPTY_RESULT: SequenceValidation = { valid: false, length: 0, gcContent: 0, ambiguousCount: 0, ambiguousRatio: 0, errors: [], warnings: [] }

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

  if (isMultiFasta(raw)) {
    return { ...EMPTY_RESULT, errors: [MULTI_FASTA_ERROR] }
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

/** FASTA에서 순수 단백질 서열만 추출 (DNA와 동일 로직) */
export const cleanProteinSequence = cleanSequence

/** 단백질 서열 유효성 검사 */
export function validateProteinSequence(raw: string): SequenceValidation {
  const errors: string[] = []
  const warnings: string[] = []

  if (isMultiFasta(raw)) {
    return { ...EMPTY_RESULT, errors: [MULTI_FASTA_ERROR] }
  }

  const cleaned = cleanProteinSequence(raw)

  if (cleaned.length === 0) {
    errors.push('서열을 입력하세요.')
    return { valid: false, length: 0, gcContent: 0, ambiguousCount: 0, ambiguousRatio: 0, errors, warnings }
  }

  if (cleaned.length < 10) {
    errors.push(`최소 10 aa 이상 필요합니다. (현재: ${cleaned.length} aa)`)
  }

  const invalidChars = new Set<string>()
  let xCount = 0
  for (const ch of cleaned) {
    if (!PROTEIN_CHARS.has(ch)) invalidChars.add(ch)
    if (ch === 'X') xCount++
  }

  if (invalidChars.size > 0) {
    errors.push(`허용되지 않는 문자: ${[...invalidChars].join(', ')}.`)
  }

  const xRatio = xCount / cleaned.length
  if (xRatio > 0.05) {
    warnings.push(`미지 잔기(X)가 ${(xRatio * 100).toFixed(1)}%입니다.`)
  }

  return {
    valid: errors.length === 0,
    length: cleaned.length,
    gcContent: 0,
    ambiguousCount: xCount,
    ambiguousRatio: xRatio,
    errors,
    warnings,
  }
}

/** BLAST 프로그램에 맞는 서열 검증 함수 선택 */
export function validateBlastSequence(raw: string, program: BlastProgram): SequenceValidation {
  return isDnaProgram(program) ? validateSequence(raw) : validateProteinSequence(raw)
}
