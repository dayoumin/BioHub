import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_SEQUENCES,
  MULTI_SEQUENCE_EXAMPLES,
  PROTEIN_EXAMPLES,
  TRANSLATION_EXAMPLES,
} from '@/lib/genetics/example-sequences'
import { parseMultiFasta } from '@/lib/genetics/multi-fasta-parser'
import { validateProteinSequence, validateSequence } from '@/lib/genetics/validate-sequence'

describe('genetics example sequences', () => {
  it.each(EXAMPLE_SEQUENCES)('%s 단일 DNA 예제가 검증을 통과한다', (example) => {
    const validation = validateSequence(example.sequence)

    expect(validation.valid).toBe(true)
    expect(validation.length).toBeGreaterThan(0)
  })

  it.each(MULTI_SEQUENCE_EXAMPLES)('%s multi-FASTA 예제가 최소 3개 서열로 파싱된다', (example) => {
    const parsed = parseMultiFasta(example.sequenceText)

    expect(parsed.length).toBeGreaterThanOrEqual(3)
    expect(parsed.every((item) => item.sequence.length > 0)).toBe(true)
  })

  it.each(TRANSLATION_EXAMPLES)('%s 번역 예제가 DNA 서열 검증을 통과한다', (example) => {
    const validation = validateSequence(example.sequenceText)

    expect(validation.valid).toBe(true)
    expect(validation.length).toBeGreaterThan(0)
  })

  it.each(PROTEIN_EXAMPLES)('%s 단백질 예제가 단백질 서열 검증을 통과한다', (example) => {
    const validation = validateProteinSequence(example.sequenceText)

    expect(validation.valid).toBe(true)
    expect(validation.length).toBeGreaterThanOrEqual(10)
  })
})
