import { describe, expect, it } from 'vitest'
import { computeSeqStats, type SeqStatsResult } from '@/lib/genetics/seq-stats-engine'
import type { ParsedSequence } from '@/lib/genetics/multi-fasta-parser'

const SEQ_A: ParsedSequence = { label: 'A', description: '', sequence: 'ATGCATGC' }
const SEQ_B: ParsedSequence = { label: 'B', description: '', sequence: 'GGCCGGCC' }

describe('computeSeqStats', () => {
  it('computes basic stats for a single sequence', () => {
    const result = computeSeqStats([SEQ_A])
    expect(result.sequenceCount).toBe(1)
    expect(result.totalLength).toBe(8)
    expect(result.meanLength).toBe(8)
    expect(result.minLength).toBe(8)
    expect(result.maxLength).toBe(8)
  })

  it('computes GC content correctly', () => {
    const result = computeSeqStats([SEQ_A])
    // ATGCATGC: G=2, C=2 → GC = 4/8 = 0.5
    expect(result.overallGcContent).toBeCloseTo(0.5)
  })

  it('computes per-sequence stats', () => {
    const result = computeSeqStats([SEQ_A, SEQ_B])
    expect(result.perSequence).toHaveLength(2)
    expect(result.perSequence[0].label).toBe('A')
    expect(result.perSequence[0].gcContent).toBeCloseTo(0.5)
    // GGCCGGCC: G=4, C=4 → GC = 8/8 = 1.0
    expect(result.perSequence[1].gcContent).toBeCloseTo(1.0)
  })

  it('computes base composition', () => {
    const result = computeSeqStats([SEQ_A])
    // ATGCATGC: A=2, T=2, G=2, C=2
    expect(result.baseComposition.A).toBe(2)
    expect(result.baseComposition.T).toBe(2)
    expect(result.baseComposition.G).toBe(2)
    expect(result.baseComposition.C).toBe(2)
    expect(result.baseComposition.N).toBe(0)
  })

  it('computes dinucleotide frequencies', () => {
    const result = computeSeqStats([SEQ_A])
    // ATGCATGC → dinucs: AT, TG, GC, CA, AT, TG, GC
    expect(result.dinucleotideFrequency.AT).toBe(2)
    expect(result.dinucleotideFrequency.TG).toBe(2)
    expect(result.dinucleotideFrequency.GC).toBe(2)
    expect(result.dinucleotideFrequency.CA).toBe(1)
  })

  it('computes length distribution bins', () => {
    const seqs: ParsedSequence[] = [
      { label: 'a', description: '', sequence: 'ATGC' },
      { label: 'b', description: '', sequence: 'ATGCATGC' },
      { label: 'c', description: '', sequence: 'ATGCATGCATGC' },
    ]
    const result = computeSeqStats(seqs)
    expect(result.lengthDistribution.length).toBeGreaterThan(0)
    const totalCount = result.lengthDistribution.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(3)
  })

  it('handles empty sequences array', () => {
    const result = computeSeqStats([])
    expect(result.sequenceCount).toBe(0)
    expect(result.totalLength).toBe(0)
  })
})
