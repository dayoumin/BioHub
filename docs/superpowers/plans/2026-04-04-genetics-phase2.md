# Genetics Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build MultiSequenceInput shared component, seq-stats analysis tool, and barcoding CSV export.

**Architecture:** Three items in dependency order: (1) MultiSequenceInput — shared multi-FASTA input component used by seq-stats and future tools, (2) seq-stats — pure TS sequence statistics tool with ECharts visualization, (3) barcoding CSV export — small addition to existing ResultView. The seq-stats engine is pure TypeScript (no Pyodide) for instant results.

**Tech Stack:** Next.js 15 App Router, TypeScript, ECharts (existing), shadcn/ui, Vitest

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `stats/components/genetics/MultiSequenceInput.tsx` | Multi-FASTA text input + file upload + real-time stats |
| `stats/lib/genetics/multi-fasta-parser.ts` | Parse multi-FASTA text into `ParsedSequence[]` |
| `stats/lib/genetics/seq-stats-engine.ts` | Pure TS: GC%, base composition, length distribution, dinucleotide frequency |
| `stats/app/genetics/seq-stats/page.tsx` | Page wrapper (dynamic import) |
| `stats/app/genetics/seq-stats/SeqStatsContent.tsx` | Main state management + orchestration |
| `stats/components/genetics/SeqStatsResult.tsx` | Result display: charts + tables + CSV export |
| `stats/__tests__/lib/genetics/multi-fasta-parser.test.ts` | Tests for FASTA parser |
| `stats/__tests__/lib/genetics/seq-stats-engine.test.ts` | Tests for stats engine |

### Modified Files

| File | Change |
|------|--------|
| `stats/lib/genetics/analysis-history.ts:20,72,87,99,108,329,371` | Add `'seq-stats'` to `GeneticsToolType`, `SeqStatsHistoryEntry`, `normalizeEntry` case, `MAX_PER_TYPE`, `entityKindForType`, `SaveGeneticsHistoryInput`, label in `saveGeneticsHistory` |
| `stats/lib/utils/history-adapters.ts:10,118-126,128` | Add `SeqStatsHistoryEntry` import, `toSeqStatsItem()`, add case to `toGeneticsHistoryItem` switch |
| `stats/components/genetics/GeneticsSubNav.tsx:7-11` | Add seq-stats tool entry |
| `stats/components/genetics/GeneticsHistorySidebar.tsx:32-37,39-43,98-102` | Add filter option + dot color + route path for seq-stats |
| `stats/app/genetics/page.tsx:57-65` | Set seq-stats `ready: true` |
| `stats/components/genetics/ResultView.tsx:144-156` | Add CSV export button for barcoding hits |

---

### Task 1: Multi-FASTA Parser

**Files:**
- Create: `stats/lib/genetics/multi-fasta-parser.ts`
- Test: `stats/__tests__/lib/genetics/multi-fasta-parser.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// stats/__tests__/lib/genetics/multi-fasta-parser.test.ts
import { describe, expect, it } from 'vitest'
import { parseMultiFasta, type ParsedSequence } from '@/lib/genetics/multi-fasta-parser'

describe('parseMultiFasta', () => {
  it('parses two FASTA sequences with headers', () => {
    const input = '>seq1 sample\nATGCATGC\n>seq2 another\nGGCCTTAA'
    const result = parseMultiFasta(input)
    expect(result).toEqual<ParsedSequence[]>([
      { label: 'seq1', description: 'sample', sequence: 'ATGCATGC' },
      { label: 'seq2', description: 'another', sequence: 'GCCTTAA' },
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
    expect(result[0].sequence).toBe('ATGCGCCTTAA')
  })

  it('handles FASTA with no description after label', () => {
    const input = '>seq1\nATGC'
    const result = parseMultiFasta(input)
    expect(result[0].label).toBe('seq1')
    expect(result[0].description).toBe('')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd stats && pnpm test __tests__/lib/genetics/multi-fasta-parser.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write minimal implementation**

```typescript
// stats/lib/genetics/multi-fasta-parser.ts

export interface ParsedSequence {
  label: string
  description: string
  sequence: string
}

/**
 * Parse multi-FASTA text into individual sequences.
 * Handles: headers (>label description), multi-line sequences,
 * headerless raw sequence, whitespace/digit stripping.
 */
export function parseMultiFasta(raw: string): ParsedSequence[] {
  const trimmed = raw.trim()
  if (!trimmed) return []

  const results: ParsedSequence[] = []
  const lines = trimmed.split(/\r?\n/)

  let currentLabel = ''
  let currentDesc = ''
  let currentSeq = ''
  let hasHeader = false

  for (const line of lines) {
    if (line.startsWith('>')) {
      // Flush previous sequence
      if (hasHeader && currentSeq) {
        results.push({ label: currentLabel, description: currentDesc, sequence: currentSeq })
      }
      hasHeader = true
      const headerContent = line.slice(1).trim()
      const spaceIdx = headerContent.indexOf(' ')
      if (spaceIdx === -1) {
        currentLabel = headerContent
        currentDesc = ''
      } else {
        currentLabel = headerContent.slice(0, spaceIdx)
        currentDesc = headerContent.slice(spaceIdx + 1).trim()
      }
      currentSeq = ''
    } else {
      currentSeq += line.replace(/[\s\d]/g, '').toUpperCase()
    }
  }

  // Flush last sequence
  if (hasHeader && currentSeq) {
    results.push({ label: currentLabel, description: currentDesc, sequence: currentSeq })
  } else if (!hasHeader && currentSeq) {
    // Raw sequence without header
    results.push({ label: 'Seq 1', description: '', sequence: currentSeq })
  }

  return results
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd stats && pnpm test __tests__/lib/genetics/multi-fasta-parser.test.ts`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add stats/lib/genetics/multi-fasta-parser.ts stats/__tests__/lib/genetics/multi-fasta-parser.test.ts
git commit -m "feat(genetics): add multi-FASTA parser with tests"
```

---

### Task 2: Seq-Stats Engine

**Files:**
- Create: `stats/lib/genetics/seq-stats-engine.ts`
- Test: `stats/__tests__/lib/genetics/seq-stats-engine.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// stats/__tests__/lib/genetics/seq-stats-engine.test.ts
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
      { label: 'a', description: '', sequence: 'ATGC' },           // 4
      { label: 'b', description: '', sequence: 'ATGCATGC' },       // 8
      { label: 'c', description: '', sequence: 'ATGCATGCATGC' },   // 12
    ]
    const result = computeSeqStats(seqs)
    expect(result.lengthDistribution.length).toBeGreaterThan(0)
    // Each bin has { binStart, binEnd, count }
    const totalCount = result.lengthDistribution.reduce((sum, b) => sum + b.count, 0)
    expect(totalCount).toBe(3)
  })

  it('handles empty sequences array', () => {
    const result = computeSeqStats([])
    expect(result.sequenceCount).toBe(0)
    expect(result.totalLength).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd stats && pnpm test __tests__/lib/genetics/seq-stats-engine.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write implementation**

```typescript
// stats/lib/genetics/seq-stats-engine.ts

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

  // Per-sequence stats
  const perSequence: PerSequenceStat[] = sequences.map(({ label, sequence }) => {
    const comp = countBases(sequence)
    return {
      label,
      length: sequence.length,
      gcContent: gcContent(comp, sequence.length),
      baseComposition: comp,
    }
  })

  // Aggregate
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd stats && pnpm test __tests__/lib/genetics/seq-stats-engine.test.ts`
Expected: PASS (all 7 tests)

- [ ] **Step 5: Commit**

```bash
git add stats/lib/genetics/seq-stats-engine.ts stats/__tests__/lib/genetics/seq-stats-engine.test.ts
git commit -m "feat(genetics): add seq-stats computation engine with tests"
```

---

### Task 3: MultiSequenceInput Component

**Files:**
- Create: `stats/components/genetics/MultiSequenceInput.tsx`
- Depends on: Task 1 (multi-fasta-parser)

- [ ] **Step 1: Write the component**

```tsx
// stats/components/genetics/MultiSequenceInput.tsx
'use client'

import { useMemo, useCallback, useRef, useState } from 'react'
import { Upload, X, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { parseMultiFasta, type ParsedSequence } from '@/lib/genetics/multi-fasta-parser'
import { Button } from '@/components/ui/button'
import { focusRing } from '@/components/common/card-styles'
import { useDebounce } from '@/hooks/useDebounce'

interface MultiSequenceInputProps {
  /** Raw text (multi-FASTA or plain sequences) */
  value: string
  onChange: (value: string) => void
  /** Minimum number of sequences required */
  minSequences: number
  /** Optional label override */
  label?: string
  /** Optional placeholder override */
  placeholder?: string
  /** File upload callback (file name tracking is caller's responsibility) */
  uploadedFileName: string | null
  onUploadedFileNameChange: (name: string | null) => void
  /** Called when user submits with valid sequences */
  onSubmit: (sequences: ParsedSequence[]) => void
}

const MAX_FILE_SIZE = 5_000_000 // 5MB for multi-FASTA
const ACCEPTED_EXTENSIONS = '.fasta,.fa,.txt,.fas'

export function MultiSequenceInput({
  value,
  onChange,
  minSequences,
  label = 'DNA 서열 (Multi-FASTA)',
  placeholder = '>sequence_1\nATGCATGC...\n>sequence_2\nGGCCTTAA...',
  uploadedFileName,
  onUploadedFileNameChange,
  onSubmit,
}: MultiSequenceInputProps): React.ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const debouncedValue = useDebounce(value, 300)

  const parsed = useMemo<ParsedSequence[]>(
    () => debouncedValue.trim() ? parseMultiFasta(debouncedValue) : [],
    [debouncedValue],
  )

  // Use raw value for immediate empty check
  const displayParsed = value.trim() ? parsed : []
  const isStale = value !== debouncedValue

  const totalLength = useMemo(
    () => displayParsed.reduce((sum, s) => sum + s.sequence.length, 0),
    [displayParsed],
  )
  const meanLength = displayParsed.length > 0 ? Math.round(totalLength / displayParsed.length) : 0
  const hasEnough = displayParsed.length >= minSequences
  const canSubmit = hasEnough && !isStale

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      toast.error('파일 크기가 5MB를 초과합니다.')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        onChange(text)
        onUploadedFileNameChange(file.name)
      }
    }
    reader.readAsText(file)
    // Reset file input so the same file can be re-uploaded
    e.target.value = ''
  }, [onChange, onUploadedFileNameChange])

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit(displayParsed)
  }, [canSubmit, displayParsed, onSubmit])

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="multi-seq" className="block text-sm font-medium text-gray-700">
            {label}
          </label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
              onClick={() => fileInputRef.current?.click()}
              title="FASTA 파일 업로드"
            >
              <Upload className="h-4 w-4" />
            </Button>
            {value.trim() && <CopyButton text={value} />}
            {value.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:bg-red-50 hover:text-red-500"
                onClick={() => {
                  onChange('')
                  onUploadedFileNameChange(null)
                }}
                title="서열 지우기"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_EXTENSIONS}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
        {uploadedFileName && (
          <p className="mb-1 text-xs text-green-600">{uploadedFileName} 로드 완료</p>
        )}
        <textarea
          id="multi-seq"
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            if (uploadedFileName) onUploadedFileNameChange(null)
          }}
          placeholder={placeholder}
          rows={10}
          className={`max-h-[400px] min-h-[180px] w-full resize-y overflow-y-auto rounded-lg border border-input bg-card px-3 py-2 font-mono text-sm ${focusRing}`}
        />

        {/* Real-time stats */}
        {value.trim() && (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            <span className={`font-medium ${hasEnough ? 'text-green-600' : 'text-amber-600'}`}>
              {displayParsed.length}개 서열
              {!hasEnough && ` (최소 ${minSequences}개 필요)`}
            </span>
            {displayParsed.length > 0 && (
              <>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">평균 {meanLength} bp</span>
                <span className="text-gray-400">·</span>
                <span className="text-gray-500">총 {totalLength.toLocaleString()} bp</span>
              </>
            )}
            {isStale && (
              <span className="text-xs text-gray-400">(분석 중...)</span>
            )}
          </div>
        )}
      </div>

      <Button type="submit" disabled={!canSubmit} className="w-full py-3">
        분석 시작
      </Button>
      {!value.trim() && (
        <p className="text-center text-xs text-gray-400">
          Multi-FASTA 형식으로 서열을 입력하거나 파일을 업로드하세요
        </p>
      )}
    </form>
  )
}

function CopyButton({ text }: { text: string }): React.ReactElement {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      console.warn('[CopyButton] 클립보드 복사 실패')
    }
  }, [text])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${copied ? 'text-green-500' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'}`}
      onClick={handleCopy}
      title={copied ? '복사됨' : '서열 복사'}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd stats && pnpm tsc --noEmit 2>&1 | head -20`
Expected: No errors related to MultiSequenceInput

- [ ] **Step 3: Commit**

```bash
git add stats/components/genetics/MultiSequenceInput.tsx
git commit -m "feat(genetics): add MultiSequenceInput shared component"
```

---

### Task 4: Analysis History — Add seq-stats Type

**Files:**
- Modify: `stats/lib/genetics/analysis-history.ts`
- Modify: `stats/lib/utils/history-adapters.ts`

- [ ] **Step 1: Add SeqStatsHistoryEntry to analysis-history.ts**

In `stats/lib/genetics/analysis-history.ts`, make these changes:

**Change 1 — GeneticsToolType (line 20):**
```typescript
// Before:
export type GeneticsToolType = 'barcoding' | 'blast' | 'genbank'

// After:
export type GeneticsToolType = 'barcoding' | 'blast' | 'genbank' | 'seq-stats'
```

**Change 2 — Add SeqStatsHistoryEntry type (after GenBankHistoryEntry, line 70):**
```typescript
/** 서열 기본 통계 히스토리 */
export interface SeqStatsHistoryEntry {
  id: string
  type: 'seq-stats'
  /** 사용자 지정 분석명 */
  analysisName: string
  sequenceCount: number
  meanLength: number
  overallGcContent: number
  pinned?: boolean
  projectId?: string
  createdAt: number
}
```

**Change 3 — Union type (line 72):**
```typescript
// Before:
export type GeneticsHistoryEntry =
  | BarcodingHistoryEntry
  | BlastSearchHistoryEntry
  | GenBankHistoryEntry

// After:
export type GeneticsHistoryEntry =
  | BarcodingHistoryEntry
  | BlastSearchHistoryEntry
  | GenBankHistoryEntry
  | SeqStatsHistoryEntry
```

**Change 4 — MAX_PER_TYPE (line 87):**
```typescript
// Before:
const MAX_PER_TYPE: Record<GeneticsToolType, number> = {
  barcoding: 20,
  blast: 15,
  genbank: 15,
}

// After:
const MAX_PER_TYPE: Record<GeneticsToolType, number> = {
  barcoding: 20,
  blast: 15,
  genbank: 15,
  'seq-stats': 15,
}
```

**Change 5 — entityKindForType (line 99):**
```typescript
// Before:
function entityKindForType(type: GeneticsToolType): ProjectEntityKind {
  return type === 'genbank' ? 'sequence-data' : 'blast-result'
}

// After:
function entityKindForType(type: GeneticsToolType): ProjectEntityKind {
  if (type === 'genbank') return 'sequence-data'
  if (type === 'seq-stats') return 'analysis-result'
  return 'blast-result'
}
```

**Change 6 — normalizeEntry switch: add 'seq-stats' case (after 'genbank' case, before 'default'):**
```typescript
    case 'seq-stats':
      return {
        id: obj.id as string,
        type: 'seq-stats',
        analysisName: (obj.analysisName ?? '') as string,
        sequenceCount: (obj.sequenceCount ?? 0) as number,
        meanLength: (obj.meanLength ?? 0) as number,
        overallGcContent: (obj.overallGcContent ?? 0) as number,
        pinned: obj.pinned as boolean | undefined,
        projectId: obj.projectId as string | undefined,
        createdAt: obj.createdAt as number,
      }
```

**Change 7 — SaveGeneticsHistoryInput (line 329):**
```typescript
// Before:
export type SaveGeneticsHistoryInput =
  | Omit<BarcodingHistoryEntry, 'id' | 'createdAt'>
  | Omit<BlastSearchHistoryEntry, 'id' | 'createdAt'>
  | Omit<GenBankHistoryEntry, 'id' | 'createdAt'>

// After:
export type SaveGeneticsHistoryInput =
  | Omit<BarcodingHistoryEntry, 'id' | 'createdAt'>
  | Omit<BlastSearchHistoryEntry, 'id' | 'createdAt'>
  | Omit<GenBankHistoryEntry, 'id' | 'createdAt'>
  | Omit<SeqStatsHistoryEntry, 'id' | 'createdAt'>
```

**Change 8 — label in saveGeneticsHistory (line 371):**
```typescript
// Before:
    const label = newEntry.type === 'barcoding' ? newEntry.sampleName
      : newEntry.type === 'blast' ? `${newEntry.program} · ${newEntry.database}`
      : newEntry.accession

// After:
    const label = newEntry.type === 'barcoding' ? newEntry.sampleName
      : newEntry.type === 'blast' ? `${newEntry.program} · ${newEntry.database}`
      : newEntry.type === 'seq-stats' ? newEntry.analysisName
      : newEntry.accession
```

- [ ] **Step 2: Add seq-stats adapter to history-adapters.ts**

In `stats/lib/utils/history-adapters.ts`:

**Change 1 — Import (line 10):**
```typescript
// Before:
import type { GeneticsHistoryEntry, BarcodingHistoryEntry, BlastSearchHistoryEntry, GenBankHistoryEntry } from '@/lib/genetics/analysis-history'

// After:
import type { GeneticsHistoryEntry, BarcodingHistoryEntry, BlastSearchHistoryEntry, GenBankHistoryEntry, SeqStatsHistoryEntry } from '@/lib/genetics/analysis-history'
```

**Change 2 — Add toSeqStatsItem (after toGenBankItem, before toGeneticsHistoryItem):**
```typescript
function toSeqStatsItem(entry: SeqStatsHistoryEntry): HistoryItem<GeneticsHistoryEntry> {
  const badges: HistoryBadge[] = [
    { label: '', value: `${entry.sequenceCount}개 서열`, variant: 'default' },
    { label: 'GC', value: `${(entry.overallGcContent * 100).toFixed(1)}%`, variant: 'mono' },
  ]
  return {
    id: entry.id,
    title: entry.analysisName,
    subtitle: `평균 ${entry.meanLength} bp`,
    badges,
    pinned: entry.pinned ?? false,
    createdAt: entry.createdAt,
    hasResult: true,
    data: entry,
  }
}
```

**Change 3 — Add case to toGeneticsHistoryItem switch (line 118-126):**
```typescript
// Before:
export function toGeneticsHistoryItem(
  entry: GeneticsHistoryEntry,
): HistoryItem<GeneticsHistoryEntry> {
  switch (entry.type) {
    case 'barcoding': return toBarcodingItem(entry)
    case 'blast': return toBlastSearchItem(entry)
    case 'genbank': return toGenBankItem(entry)
  }
}

// After:
export function toGeneticsHistoryItem(
  entry: GeneticsHistoryEntry,
): HistoryItem<GeneticsHistoryEntry> {
  switch (entry.type) {
    case 'barcoding': return toBarcodingItem(entry)
    case 'blast': return toBlastSearchItem(entry)
    case 'genbank': return toGenBankItem(entry)
    case 'seq-stats': return toSeqStatsItem(entry)
  }
}
```

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `cd stats && pnpm test __tests__/lib/genetics/analysis-history.test.ts __tests__/lib/utils/history-adapters.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add stats/lib/genetics/analysis-history.ts stats/lib/utils/history-adapters.ts
git commit -m "feat(genetics): add seq-stats history type to analysis-history"
```

---

### Task 5: Navigation — Add seq-stats to SubNav, Sidebar, Landing

**Files:**
- Modify: `stats/components/genetics/GeneticsSubNav.tsx`
- Modify: `stats/components/genetics/GeneticsHistorySidebar.tsx`
- Modify: `stats/app/genetics/page.tsx`

- [ ] **Step 1: Add seq-stats to GeneticsSubNav.tsx**

In `stats/components/genetics/GeneticsSubNav.tsx`, add to TOOLS array (line 7-11):

```typescript
// Before:
const TOOLS = [
  { id: 'barcoding', title: 'DNA 바코딩 종 판별', href: '/genetics/barcoding', icon: Dna },
  { id: 'blast', title: 'BLAST 서열 검색', href: '/genetics/blast', icon: Search },
  { id: 'genbank', title: 'GenBank 서열 검색', href: '/genetics/genbank', icon: Database },
]

// After (add BarChart3 to import):
const TOOLS = [
  { id: 'barcoding', title: 'DNA 바코딩 종 판별', href: '/genetics/barcoding', icon: Dna },
  { id: 'blast', title: 'BLAST 서열 검색', href: '/genetics/blast', icon: Search },
  { id: 'genbank', title: 'GenBank 서열 검색', href: '/genetics/genbank', icon: Database },
  { id: 'seq-stats', title: '서열 기본 통계', href: '/genetics/seq-stats', icon: BarChart3 },
]
```

Add `BarChart3` to the import from `lucide-react` (line 3).

- [ ] **Step 2: Add seq-stats to GeneticsHistorySidebar.tsx**

**Change 1 — FILTER_OPTIONS (line 32-37):**
```typescript
const FILTER_OPTIONS: { value: ToolFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'barcoding', label: '종동정' },
  { value: 'blast', label: 'BLAST' },
  { value: 'genbank', label: 'GenBank' },
  { value: 'seq-stats', label: '서열통계' },
]
```

**Change 2 — TYPE_DOT_COLOR (line 39-43):**
```typescript
const TYPE_DOT_COLOR: Record<GeneticsToolType, string> = {
  barcoding: 'bg-green-500',
  blast: 'bg-blue-500',
  genbank: 'bg-amber-500',
  'seq-stats': 'bg-violet-500',
}
```

**Change 3 — typePath in handleSelect (line 98-102):**
```typescript
      const typePath: Record<GeneticsToolType, string> = {
        barcoding: '/genetics/barcoding',
        blast: '/genetics/blast',
        genbank: '/genetics/genbank',
        'seq-stats': '/genetics/seq-stats',
      }
```

- [ ] **Step 3: Set seq-stats ready: true in landing page**

In `stats/app/genetics/page.tsx`, change the seq-stats tool entry (lines 57-65):

```typescript
  // Before:
  {
    id: 'seq-stats',
    title: '서열 기본 통계',
    description: 'GC 함량, 길이 분포, 염기 조성 분석',
    input: '서열 1개 이상',
    href: '/genetics/seq-stats',
    ready: false,
    badge: '준비 중',
    icon: BarChart3,
  },

  // After:
  {
    id: 'seq-stats',
    title: '서열 기본 통계',
    description: 'GC 함량, 길이 분포, 염기 조성 분석',
    input: '서열 2개 이상 (Multi-FASTA)',
    href: '/genetics/seq-stats',
    ready: true,
    badge: '사용 가능',
    icon: BarChart3,
  },
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd stats && pnpm tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add stats/components/genetics/GeneticsSubNav.tsx stats/components/genetics/GeneticsHistorySidebar.tsx stats/app/genetics/page.tsx
git commit -m "feat(genetics): add seq-stats to navigation, sidebar, and landing page"
```

---

### Task 6: SeqStatsResult Component

**Files:**
- Create: `stats/components/genetics/SeqStatsResult.tsx`

- [ ] **Step 1: Write the result component**

```tsx
// stats/components/genetics/SeqStatsResult.tsx
'use client'

import { useCallback, useMemo, useRef, useEffect } from 'react'
import { Download } from 'lucide-react'
import type { SeqStatsResult } from '@/lib/genetics/seq-stats-engine'
import { Button } from '@/components/ui/button'

interface SeqStatsResultProps {
  result: SeqStatsResult
  analysisName: string
  onReset: () => void
}

// ── CSV Export ──

function buildCsv(result: SeqStatsResult): string {
  const lines: string[] = []

  // Summary
  lines.push('=== Summary ===')
  lines.push('Metric,Value')
  lines.push(`Sequence Count,${result.sequenceCount}`)
  lines.push(`Total Length (bp),${result.totalLength}`)
  lines.push(`Mean Length (bp),${result.meanLength.toFixed(1)}`)
  lines.push(`Median Length (bp),${result.medianLength.toFixed(1)}`)
  lines.push(`Min Length (bp),${result.minLength}`)
  lines.push(`Max Length (bp),${result.maxLength}`)
  lines.push(`Std Dev Length,${result.stdDevLength.toFixed(1)}`)
  lines.push(`Overall GC Content,${(result.overallGcContent * 100).toFixed(2)}%`)
  lines.push('')

  // Base composition
  lines.push('=== Base Composition ===')
  lines.push('Base,Count,Percentage')
  const total = result.totalLength
  for (const base of ['A', 'T', 'G', 'C', 'N'] as const) {
    const count = result.baseComposition[base]
    lines.push(`${base},${count},${total > 0 ? ((count / total) * 100).toFixed(2) : '0'}%`)
  }
  lines.push('')

  // Per-sequence
  lines.push('=== Per Sequence ===')
  lines.push('Label,Length (bp),GC Content (%)')
  for (const ps of result.perSequence) {
    lines.push(`${ps.label},${ps.length},${(ps.gcContent * 100).toFixed(2)}`)
  }

  return lines.join('\n')
}

// ── Charts (ECharts lazy) ──

function useECharts(
  containerRef: React.RefObject<HTMLDivElement | null>,
  optionFn: () => Record<string, unknown>,
  deps: unknown[],
): void {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let chart: { setOption: (opt: Record<string, unknown>) => void; resize: () => void; dispose: () => void } | null = null

    void import('echarts/core').then(async (ec) => {
      const [{ BarChart }, { GridComponent, TooltipComponent, LegendComponent }, { CanvasRenderer }] = await Promise.all([
        import('echarts/charts'),
        import('echarts/components'),
        import('echarts/renderers'),
      ])
      ec.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])
      if (!el.isConnected) return

      chart = ec.init(el)
      chart.setOption(optionFn())
    })

    const onResize = (): void => { chart?.resize() }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      chart?.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function BaseCompositionChart({ result }: { result: SeqStatsResult }): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useECharts(ref, () => {
    const bases = ['A', 'T', 'G', 'C', 'N'] as const
    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#94a3b8']
    const total = result.totalLength
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 40, right: 16, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: bases },
      yAxis: { type: 'value', name: '%', axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: bases.map((b, i) => ({
          value: total > 0 ? Number(((result.baseComposition[b] / total) * 100).toFixed(2)) : 0,
          itemStyle: { color: colors[i] },
        })),
        barMaxWidth: 40,
      }],
    }
  }, [result])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">염기 조성</h3>
      <div ref={ref} className="h-[220px] w-full" />
    </div>
  )
}

function LengthDistributionChart({ result }: { result: SeqStatsResult }): React.ReactElement | null {
  const ref = useRef<HTMLDivElement>(null)
  const bins = result.lengthDistribution

  useECharts(ref, () => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 50, right: 16, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: bins.map(b => b.binStart === b.binEnd ? `${b.binStart}` : `${b.binStart}-${b.binEnd}`),
      axisLabel: { fontSize: 10 },
    },
    yAxis: { type: 'value', name: '개수', minInterval: 1 },
    series: [{
      type: 'bar',
      data: bins.map(b => b.count),
      barMaxWidth: 40,
      itemStyle: { color: '#6366f1' },
    }],
  }), [bins])

  if (bins.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">길이 분포</h3>
      <div ref={ref} className="h-[220px] w-full" />
    </div>
  )
}

// ── Main ──

export function SeqStatsResultView({ result, analysisName, onReset }: SeqStatsResultProps): React.ReactElement {
  const handleExportCsv = useCallback(() => {
    const csv = buildCsv(result)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `seq-stats_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [result])

  const gcPercent = (result.overallGcContent * 100).toFixed(1)

  // Per-sequence GC for table
  const sortedPerSeq = useMemo(
    () => [...result.perSequence].sort((a, b) => b.length - a.length),
    [result.perSequence],
  )

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">{analysisName}</h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{result.sequenceCount}개 서열</span>
            <span>평균 {result.meanLength.toFixed(0)} bp</span>
            <span>GC {gcPercent}%</span>
            <span>총 {result.totalLength.toLocaleString()} bp</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <BaseCompositionChart result={result} />
        <LengthDistributionChart result={result} />
      </div>

      {/* Per-sequence table */}
      {sortedPerSeq.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">서열별 통계</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2">#</th>
                  <th className="pb-2">라벨</th>
                  <th className="pb-2 text-right">길이 (bp)</th>
                  <th className="pb-2 text-right">GC%</th>
                  <th className="pb-2 text-right">A</th>
                  <th className="pb-2 text-right">T</th>
                  <th className="pb-2 text-right">G</th>
                  <th className="pb-2 text-right">C</th>
                  <th className="pb-2 text-right">N</th>
                </tr>
              </thead>
              <tbody>
                {sortedPerSeq.map((ps, i) => (
                  <tr key={ps.label} className="border-b border-gray-50">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 font-mono text-xs">{ps.label}</td>
                    <td className="py-2 text-right font-mono">{ps.length}</td>
                    <td className="py-2 text-right font-mono">{(ps.gcContent * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.A}</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.T}</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.G}</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.C}</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.N}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dinucleotide frequency (if sequences present) */}
      {Object.keys(result.dinucleotideFrequency).length > 0 && (
        <DinucleotideTable frequency={result.dinucleotideFrequency} />
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReset}>
          새 분석
        </Button>
      </div>
    </div>
  )
}

function DinucleotideTable({ frequency }: { frequency: Record<string, number> }): React.ReactElement {
  const bases = ['A', 'T', 'G', 'C']
  const total = Object.values(frequency).reduce((s, v) => s + v, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">디뉴클레오티드 빈도</h3>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="pb-2 pr-3" />
              {bases.map(b => <th key={b} className="pb-2 px-2 text-center font-mono">{b}</th>)}
            </tr>
          </thead>
          <tbody>
            {bases.map(b1 => (
              <tr key={b1}>
                <td className="py-1 pr-3 font-mono text-xs text-gray-500">{b1}</td>
                {bases.map(b2 => {
                  const di = b1 + b2
                  const count = frequency[di] ?? 0
                  const pct = total > 0 ? (count / total) * 100 : 0
                  return (
                    <td key={di} className="px-2 py-1 text-center font-mono text-xs" title={`${di}: ${count}`}>
                      {pct.toFixed(1)}%
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd stats && pnpm tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add stats/components/genetics/SeqStatsResult.tsx
git commit -m "feat(genetics): add SeqStatsResult component with charts and CSV export"
```

---

### Task 7: SeqStatsContent + Page

**Files:**
- Create: `stats/app/genetics/seq-stats/SeqStatsContent.tsx`
- Create: `stats/app/genetics/seq-stats/page.tsx`

- [ ] **Step 1: Write SeqStatsContent**

```tsx
// stats/app/genetics/seq-stats/SeqStatsContent.tsx
'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ParsedSequence } from '@/lib/genetics/multi-fasta-parser'
import { computeSeqStats, type SeqStatsResult } from '@/lib/genetics/seq-stats-engine'
import { MultiSequenceInput } from '@/components/genetics/MultiSequenceInput'
import { SeqStatsResultView } from '@/components/genetics/SeqStatsResult'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
} from '@/lib/genetics/analysis-history'
import type { SeqStatsHistoryEntry } from '@/lib/genetics/analysis-history'
import { useResearchProjectStore } from '@/lib/stores/research-project-store'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type AppState =
  | { step: 'input' }
  | { step: 'result'; result: SeqStatsResult; analysisName: string }

export default function SeqStatsContent(): React.ReactElement {
  const searchParams = useSearchParams()
  const [rawText, setRawText] = useState('')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)
  const [analysisName, setAnalysisName] = useState('')
  const [state, setState] = useState<AppState>({ step: 'input' })
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null)
  const activeResearchProjectId = useResearchProjectStore(s => s.activeResearchProjectId)

  // History restoration
  useEffect(() => {
    const historyId = searchParams.get('history')
    if (!historyId) return

    let cancelled = false
    void hydrateGeneticsHistoryFromCloud().then(() => {
      if (cancelled) return
      const all = loadGeneticsHistory('seq-stats')
      const entry = all.find(e => e.id === historyId) as SeqStatsHistoryEntry | undefined
      if (entry) {
        setDeepLinkError(null)
        setAnalysisName(entry.analysisName)
        // History doesn't store full result — show summary info
        setState({ step: 'input' })
        toast.info(`${entry.analysisName} 기록을 불러왔습니다. 서열을 다시 입력하여 분석하세요.`)
      } else {
        setDeepLinkError('요청한 분석 기록을 찾을 수 없습니다.')
      }
    })
    return () => { cancelled = true }
  }, [searchParams])

  const handleSubmit = useCallback((sequences: ParsedSequence[]) => {
    const result = computeSeqStats(sequences)

    const now = new Date()
    const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const autoName = analysisName.trim()
      || (uploadedFileName
        ? `${uploadedFileName} · ${dateStr}`
        : `서열 통계 · ${result.sequenceCount}개 · ${dateStr}`)

    setState({ step: 'result', result, analysisName: autoName })

    // Save to history
    const saved = saveGeneticsHistory({
      type: 'seq-stats',
      analysisName: autoName,
      sequenceCount: result.sequenceCount,
      meanLength: Math.round(result.meanLength),
      overallGcContent: result.overallGcContent,
      projectId: activeResearchProjectId ?? undefined,
    })
    if (!saved) toast.warning('저장 공간 부족으로 히스토리에 저장되지 않았습니다.')
  }, [analysisName, uploadedFileName, activeResearchProjectId])

  const handleReset = useCallback(() => {
    setState({ step: 'input' })
    setRawText('')
    setUploadedFileName(null)
    setAnalysisName('')
  }, [])

  return (
    <main>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">서열 기본 통계</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          다중 서열의 GC 함량, 염기 조성, 길이 분포, 디뉴클레오티드 빈도를 분석합니다.
        </p>
      </div>

      {deepLinkError && (
        <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-50/50 p-6 dark:bg-amber-950/20" role="alert">
          <h2 className="mb-2 font-semibold text-amber-800 dark:text-amber-300">기록 복원 실패</h2>
          <p className="mb-4 text-sm text-amber-700 dark:text-amber-400">{deepLinkError}</p>
          <Button variant="outline" onClick={() => { setDeepLinkError(null) }}>
            새 분석 시작
          </Button>
        </div>
      )}

      {state.step === 'input' && (
        <div className="space-y-4">
          {/* Analysis name */}
          <div>
            <label htmlFor="analysisName" className="mb-1 block text-sm font-medium text-gray-700">
              분석명 <span className="font-normal text-gray-400">(선택)</span>
            </label>
            <input
              id="analysisName"
              type="text"
              value={analysisName}
              onChange={(e) => setAnalysisName(e.target.value)}
              placeholder="예: COI 10종 비교, 채집 시료 배치 #1"
              maxLength={100}
              className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary"
            />
          </div>

          <MultiSequenceInput
            value={rawText}
            onChange={setRawText}
            minSequences={2}
            uploadedFileName={uploadedFileName}
            onUploadedFileNameChange={setUploadedFileName}
            onSubmit={handleSubmit}
          />
        </div>
      )}

      {state.step === 'result' && (
        <SeqStatsResultView
          result={state.result}
          analysisName={state.analysisName}
          onReset={handleReset}
        />
      )}
    </main>
  )
}
```

- [ ] **Step 2: Write page.tsx wrapper**

```tsx
// stats/app/genetics/seq-stats/page.tsx
'use client'

import dynamic from 'next/dynamic'

const SeqStatsContent = dynamic(() => import('./SeqStatsContent'), { ssr: false })

export default function SeqStatsPage(): React.ReactElement {
  return <SeqStatsContent />
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd stats && pnpm tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add stats/app/genetics/seq-stats/
git commit -m "feat(genetics): add seq-stats page with content and multi-FASTA input"
```

---

### Task 8: Barcoding CSV Export (B1)

**Files:**
- Modify: `stats/components/genetics/ResultView.tsx`

- [ ] **Step 1: Add CSV export to ResultView.tsx**

Add `Download` to imports from lucide-react. Add `useCallback` if not already imported.

Add the export handler inside `ResultView` component (after line 30):

```typescript
  const handleExportCsv = useCallback(() => {
    if (decision.topHits.length === 0) return
    const header = 'Rank,Species,Identity(%),Align Coverage(%),Bit Score,E-value,Accession'
    const csvEscape = (s: string): string =>
      s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s
    const rows = decision.topHits.map((hit, i) =>
      `${i + 1},${csvEscape(hit.species || '(미확인)')},${(hit.identity * 100).toFixed(1)},${hit.alignCoverage != null ? (hit.alignCoverage * 100).toFixed(0) : ''},${hit.bitScore != null ? Math.round(hit.bitScore) : ''},${hit.evalue != null ? hit.evalue : ''},${hit.accession}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `barcoding_${marker}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [decision.topHits, marker])
```

Add the CSV button in the action row. In the existing action bar area (line 144-156), add a CSV button inside the `ml-auto` div:

```tsx
      <div className="flex flex-wrap items-center gap-2">
        <NextActionButtons decision={decision} marker={marker} sequence={sequence} />
        <div className="ml-auto flex gap-2">
          {decision.topHits.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          )}
          {sequence && (
            <Button variant="outline" size="sm" onClick={() => onReset(false)}>
              서열 유지하고 재분석
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => onReset(true)}>
            새 서열로 분석
          </Button>
        </div>
      </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd stats && pnpm tsc --noEmit 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add stats/components/genetics/ResultView.tsx
git commit -m "feat(genetics): add CSV export to barcoding result view"
```

---

### Task 9: Final Verification

- [ ] **Step 1: Run all genetics tests**

Run: `cd stats && pnpm test __tests__/lib/genetics/`
Expected: All tests PASS (including existing tests + new multi-fasta-parser + seq-stats-engine)

- [ ] **Step 2: Run full type check**

Run: `cd stats && pnpm tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Verify history adapter tests still pass**

Run: `cd stats && pnpm test __tests__/lib/utils/history-adapters.test.ts`
Expected: PASS

- [ ] **Step 4: Final commit (if any remaining changes)**

Only if there are uncommitted fixes from verification steps.
