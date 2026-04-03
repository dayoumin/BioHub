import { describe, expect, it } from 'vitest'
import { parseMultiFasta, type ParsedSequence } from '@/lib/genetics/multi-fasta-parser'

describe('parseMultiFasta', () => {
  it('parses two FASTA sequences with headers', () => {
    const input = '>seq1 sample\nATGCATGC\n>seq2 another\nGGCCTTAA'
    const result = parseMultiFasta(input)
    expect(result).toEqual<ParsedSequence[]>([
      { label: 'seq1', description: 'sample', sequence: 'ATGCATGC' },
      { label: 'seq2', description: 'another', sequence: 'GGCCTTAA' },
    ])
  })

  it('handles headerless raw sequence as single entry', () => {
    const result = parseMultiFasta('ATGCATGC')
    expect(result).toHaveLength(1)
    expect(result[0].label).toBe('Seq 1')
    expect(result[0].sequence).toBe('ATGCATGC')
  })

  it('strips whitespace, digits, and lowercases to uppercase', () => {
    const result = parseMultiFasta('>seq1\nat gc\n123\nATGC')
    expect(result[0].sequence).toBe('ATGCATGC')
  })

  it('returns empty array for blank input', () => {
    expect(parseMultiFasta('')).toEqual([])
    expect(parseMultiFasta('   \n  ')).toEqual([])
  })

  it('handles multi-line sequences', () => {
    const input = '>seq1\nATGC\nGGCC\nTTAA'
    const result = parseMultiFasta(input)
    expect(result[0].sequence).toBe('ATGCGGCCTTAA')
  })

  it('handles FASTA with no description after label', () => {
    const input = '>seq1\nATGC'
    const result = parseMultiFasta(input)
    expect(result[0].label).toBe('seq1')
    expect(result[0].description).toBe('')
  })
})
