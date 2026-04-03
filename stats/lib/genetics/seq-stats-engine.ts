import type { ParsedSequence } from '@/lib/genetics/multi-fasta-parser'

// ── Types ──

export interface PerSequenceStat {
  label: string
  length: number
  gcContent: number
  baseComposition: BaseComposition
}

export interface BaseComposition {
  A: number
  T: number
  G: number
  C: number
  N: number
  other: number
}

export interface LengthBin {
  binStart: number
  binEnd: number
  count: number
}

export interface SeqStatsResult {
  sequenceCount: number
  totalLength: number
  meanLength: number
  medianLength: number
  minLength: number
  maxLength: number
  stdDevLength: number
  overallGcContent: number
  baseComposition: BaseComposition
  dinucleotideFrequency: Record<string, number>
  lengthDistribution: LengthBin[]
  perSequence: PerSequenceStat[]
}

// ── Helpers ──

function countBases(seq: string): BaseComposition {
  const comp: BaseComposition = { A: 0, T: 0, G: 0, C: 0, N: 0, other: 0 }
  for (const ch of seq) {
    if (ch === 'A') comp.A++
    else if (ch === 'T') comp.T++
    else if (ch === 'G') comp.G++
    else if (ch === 'C') comp.C++
    else if (ch === 'N') comp.N++
    else comp.other++
  }
  return comp
}

function gcContent(comp: BaseComposition, length: number): number {
  if (length === 0) return 0
  return (comp.G + comp.C) / length
}

function countDinucleotides(sequences: ParsedSequence[]): Record<string, number> {
  const freq: Record<string, number> = {}
  for (const { sequence } of sequences) {
    for (let i = 0; i < sequence.length - 1; i++) {
      const di = sequence[i] + sequence[i + 1]
      freq[di] = (freq[di] ?? 0) + 1
    }
  }
  return freq
}

function buildLengthDistribution(lengths: number[]): LengthBin[] {
  if (lengths.length === 0) return []

  const min = Math.min(...lengths)
  const max = Math.max(...lengths)

  if (min === max) {
    return [{ binStart: min, binEnd: max, count: lengths.length }]
  }

  // Sturges' rule for bin count
  const binCount = Math.max(1, Math.ceil(Math.log2(lengths.length) + 1))
  const binWidth = Math.ceil((max - min) / binCount) || 1

  const bins: LengthBin[] = []
  for (let i = 0; i < binCount; i++) {
    const binStart = min + i * binWidth
    const binEnd = i === binCount - 1 ? max : binStart + binWidth - 1
    bins.push({ binStart, binEnd, count: 0 })
  }

  for (const len of lengths) {
    const idx = Math.min(Math.floor((len - min) / binWidth), binCount - 1)
    bins[idx].count++
  }

  return bins
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0
  const sumSqDiff = values.reduce((sum, v) => sum + (v - mean) ** 2, 0)
  return Math.sqrt(sumSqDiff / (values.length - 1))
}

// ── Main ──

export function computeSeqStats(sequences: ParsedSequence[]): SeqStatsResult {
  if (sequences.length === 0) {
    return {
      sequenceCount: 0,
      totalLength: 0,
      meanLength: 0,
      medianLength: 0,
      minLength: 0,
      maxLength: 0,
      stdDevLength: 0,
      overallGcContent: 0,
      baseComposition: { A: 0, T: 0, G: 0, C: 0, N: 0, other: 0 },
      dinucleotideFrequency: {},
      lengthDistribution: [],
      perSequence: [],
    }
  }

  const perSequence: PerSequenceStat[] = sequences.map(({ label, sequence }) => {
    const comp = countBases(sequence)
    return {
      label,
      length: sequence.length,
      gcContent: gcContent(comp, sequence.length),
      baseComposition: comp,
    }
  })

  const lengths = perSequence.map(s => s.length)
  const sortedLengths = [...lengths].sort((a, b) => a - b)
  const totalLength = lengths.reduce((a, b) => a + b, 0)
  const meanLength = totalLength / lengths.length

  const overallComp: BaseComposition = { A: 0, T: 0, G: 0, C: 0, N: 0, other: 0 }
  for (const ps of perSequence) {
    overallComp.A += ps.baseComposition.A
    overallComp.T += ps.baseComposition.T
    overallComp.G += ps.baseComposition.G
    overallComp.C += ps.baseComposition.C
    overallComp.N += ps.baseComposition.N
    overallComp.other += ps.baseComposition.other
  }

  return {
    sequenceCount: sequences.length,
    totalLength,
    meanLength,
    medianLength: median(sortedLengths),
    minLength: sortedLengths[0],
    maxLength: sortedLengths[sortedLengths.length - 1],
    stdDevLength: stdDev(lengths, meanLength),
    overallGcContent: gcContent(overallComp, totalLength),
    baseComposition: overallComp,
    dinucleotideFrequency: countDinucleotides(sequences),
    lengthDistribution: buildLengthDistribution(lengths),
    perSequence,
  }
}
