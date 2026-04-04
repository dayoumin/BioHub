/**
 * seq-stats 통합 시뮬레이션 테스트
 *
 * 1. E2E: Multi-FASTA 파싱 → 통계 계산 → 결과 전체 검증
 * 2. 히스토리 라운드트립: 저장 → 로드 → 필터 → 삭제
 * 3. 어댑터: toSeqStatsItem → HistoryItem shape 검증
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseMultiFasta } from '@/lib/genetics/multi-fasta-parser'
import { computeSeqStats } from '@/lib/genetics/seq-stats-engine'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  deleteGeneticsEntries,
  HISTORY_KEY,
} from '@/lib/genetics/analysis-history'
import type { SeqStatsHistoryEntry } from '@/lib/genetics/analysis-history'
import { toGeneticsHistoryItem } from '@/lib/utils/history-adapters'
import { listProjectEntityRefs } from '@/lib/research/project-storage'

// ═══════════════════════════════════════════════════════════════
// 공유 테스트 데이터
// ═══════════════════════════════════════════════════════════════

const REAL_FASTA = `>Gadus_morhua_COI Gadus morhua cytochrome oxidase subunit I
CCTCTATCTAGTATTTGGTGCCTGAGCCGGAATGGTAGGAACCGCCCTAAGCCTCCTCATTCGAGCAGAA
CTAAGCCAACCAGGCGCCCTTCTAGGCGATGACCAAATTTACAACGTAATCGTTACGGCCCATGCTTTCG
TAATGATTTTCTTTATAGTAATACCAATTATGATTGGAGGATTTGGGAACTGACTAATTCCTCTAATGATC
>Salmo_salar_COI Salmo salar mitochondrial COI
CCTCTATCTAGTATTTGGTGCCTGAGCTGGTATAGTAGGTACTGCCCTAAGCCTCCTCATCCGAGCCGAA
CTAAGCCAACCAGGCGCTCTTTTAGGTGATGATCAAATCTATAATGTCATTGTTACGGCTCATGCCTTCGT
>Short_seq test sequence
ATGCATGC`

const SHORT_FASTA = `>A
ATGCATGC
>B
GGCCGGCC
>C
ATATATATATAT`

describe('seq-stats 통합 시뮬레이션', () => {
  // ── 1. E2E: 파싱 → 계산 → 결과 검증 ──

  describe('E2E: Multi-FASTA → computeSeqStats', () => {
    it('실제 COI 서열 3개를 파싱하고 통계를 계산한다', () => {
      const sequences = parseMultiFasta(REAL_FASTA)

      expect(sequences).toHaveLength(3)
      expect(sequences[0].label).toBe('Gadus_morhua_COI')
      expect(sequences[1].label).toBe('Salmo_salar_COI')
      expect(sequences[2].label).toBe('Short_seq')

      const result = computeSeqStats(sequences)

      // 기본 통계
      expect(result.sequenceCount).toBe(3)
      expect(result.minLength).toBe(8) // Short_seq = ATGCATGC
      expect(result.maxLength).toBeGreaterThan(100) // COI 서열들
      expect(result.totalLength).toBe(
        sequences[0].sequence.length +
        sequences[1].sequence.length +
        sequences[2].sequence.length,
      )
      expect(result.meanLength).toBeCloseTo(result.totalLength / 3)

      // GC content: 0~1 범위
      expect(result.overallGcContent).toBeGreaterThan(0)
      expect(result.overallGcContent).toBeLessThan(1)

      // 염기 조성: 총합 = totalLength
      const baseSum = result.baseComposition.A +
        result.baseComposition.T +
        result.baseComposition.G +
        result.baseComposition.C +
        result.baseComposition.N
      expect(baseSum).toBe(result.totalLength)

      // per-sequence: 3개, 각각 GC 0~1
      expect(result.perSequence).toHaveLength(3)
      for (const ps of result.perSequence) {
        expect(ps.gcContent).toBeGreaterThanOrEqual(0)
        expect(ps.gcContent).toBeLessThanOrEqual(1)
        expect(ps.length).toBeGreaterThan(0)
      }

      // 길이 분포: bin count 합 = 3
      const binTotal = result.lengthDistribution.reduce((s, b) => s + b.count, 0)
      expect(binTotal).toBe(3)

      // 다이뉴클레오타이드 빈도: 총합 = totalLength - sequenceCount (각 서열 마지막 뉴클레오타이드 제외)
      const dinucSum = Object.values(result.dinucleotideFrequency).reduce((s, v) => s + v, 0)
      expect(dinucSum).toBe(result.totalLength - result.sequenceCount)
    })

    it('짧은 서열 3개로 정확한 수치를 검증한다', () => {
      const sequences = parseMultiFasta(SHORT_FASTA)
      const result = computeSeqStats(sequences)

      // A=ATGCATGC(8), B=GGCCGGCC(8), C=ATATATATATAT(12)
      expect(result.sequenceCount).toBe(3)
      expect(result.totalLength).toBe(28)
      expect(result.minLength).toBe(8)
      expect(result.maxLength).toBe(12)
      expect(result.meanLength).toBeCloseTo(28 / 3)

      // GC 계산: A=4GC/8, B=8GC/8, C=0GC/12 → 12/28
      expect(result.overallGcContent).toBeCloseTo(12 / 28)

      // per-sequence GC 검증
      expect(result.perSequence[0].gcContent).toBeCloseTo(0.5) // ATGCATGC
      expect(result.perSequence[1].gcContent).toBeCloseTo(1.0) // GGCCGGCC
      expect(result.perSequence[2].gcContent).toBeCloseTo(0.0) // ATATATAT...
    })

    it('빈 입력에 대해 안전하게 처리한다', () => {
      const sequences = parseMultiFasta('')
      expect(sequences).toHaveLength(0)

      const result = computeSeqStats(sequences)
      expect(result.sequenceCount).toBe(0)
      expect(result.totalLength).toBe(0)
      expect(result.overallGcContent).toBe(0)
      expect(result.lengthDistribution).toHaveLength(0)
    })
  })

  // ── 2. 히스토리 라운드트립 ──

  describe('히스토리 라운드트립: save → load → filter → delete', () => {
    beforeEach(() => {
      localStorage.clear()
      vi.restoreAllMocks()
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
    })

    it('seq-stats 히스토리를 저장하고 로드한다', () => {
      const saved = saveGeneticsHistory({
        type: 'seq-stats',
        analysisName: 'COI 분석 2026-04',
        sequenceCount: 3,
        meanLength: 450,
        overallGcContent: 0.48,
      })
      expect(saved).toBe(true)

      const all = loadGeneticsHistory()
      expect(all).toHaveLength(1)
      expect(all[0].type).toBe('seq-stats')

      const entry = all[0] as SeqStatsHistoryEntry
      expect(entry.analysisName).toBe('COI 분석 2026-04')
      expect(entry.sequenceCount).toBe(3)
      expect(entry.meanLength).toBe(450)
      expect(entry.overallGcContent).toBe(0.48)
      expect(entry.id).toMatch(/^seq-stats-/)
      expect(entry.createdAt).toBeGreaterThan(0)
    })

    it('타입 필터로 seq-stats만 조회한다', () => {
      // 다른 타입과 혼합 저장
      saveGeneticsHistory({
        type: 'barcoding',
        sampleName: 'Sample 1',
        marker: 'COI',
        sequencePreview: 'ATGC',
        topSpecies: null,
        topIdentity: null,
        status: null,
      })
      saveGeneticsHistory({
        type: 'seq-stats',
        analysisName: 'Stats A',
        sequenceCount: 5,
        meanLength: 300,
        overallGcContent: 0.52,
      })
      saveGeneticsHistory({
        type: 'seq-stats',
        analysisName: 'Stats B',
        sequenceCount: 10,
        meanLength: 600,
        overallGcContent: 0.45,
      })

      expect(loadGeneticsHistory()).toHaveLength(3)
      expect(loadGeneticsHistory('seq-stats')).toHaveLength(2)
      expect(loadGeneticsHistory('barcoding')).toHaveLength(1)
    })

    it('seq-stats 엔트리를 삭제한다', () => {
      saveGeneticsHistory({
        type: 'seq-stats',
        analysisName: 'To Delete',
        sequenceCount: 1,
        meanLength: 100,
        overallGcContent: 0.5,
      })

      const entries = loadGeneticsHistory('seq-stats')
      expect(entries).toHaveLength(1)

      const remaining = deleteGeneticsEntries(new Set([entries[0].id]))
      expect(remaining).toHaveLength(0)
      expect(loadGeneticsHistory('seq-stats')).toHaveLength(0)
    })

    it('seq-stats MAX 15개 cap이 적용된다', () => {
      for (let i = 0; i < 16; i++) {
        saveGeneticsHistory({
          type: 'seq-stats',
          analysisName: `Stats ${i}`,
          sequenceCount: i + 1,
          meanLength: 100 * (i + 1),
          overallGcContent: 0.5,
        })
      }

      const entries = loadGeneticsHistory('seq-stats')
      expect(entries).toHaveLength(15) // 16번째 저장 시 가장 오래된 것 삭제
    })

    it('seq-stats 저장이 다른 타입에 영향을 주지 않는다', () => {
      // barcoding 5개 먼저
      for (let i = 0; i < 5; i++) {
        saveGeneticsHistory({
          type: 'barcoding',
          sampleName: `Sample ${i}`,
          marker: 'COI',
          sequencePreview: 'ATGC',
          topSpecies: null,
          topIdentity: null,
          status: null,
        })
      }

      // seq-stats 15개 (cap에 도달)
      for (let i = 0; i < 15; i++) {
        saveGeneticsHistory({
          type: 'seq-stats',
          analysisName: `Stats ${i}`,
          sequenceCount: 1,
          meanLength: 100,
          overallGcContent: 0.5,
        })
      }

      expect(loadGeneticsHistory('barcoding')).toHaveLength(5) // 영향 없음
      expect(loadGeneticsHistory('seq-stats')).toHaveLength(15)
    })

    it('projectId 연결 시 entity ref가 seq-stats-result로 생성된다', () => {
      saveGeneticsHistory({
        type: 'seq-stats',
        analysisName: 'Project Stats',
        sequenceCount: 3,
        meanLength: 500,
        overallGcContent: 0.48,
        projectId: 'proj-test',
      })

      const refs = listProjectEntityRefs('proj-test')
      expect(refs).toHaveLength(1)
      expect(refs[0].entityKind).toBe('seq-stats-result')
      expect(refs[0].label).toBe('Project Stats')
    })
  })

  // ── 3. 어댑터: toSeqStatsItem ──

  describe('toGeneticsHistoryItem — seq-stats 어댑터', () => {
    it('SeqStatsHistoryEntry를 HistoryItem으로 변환한다', () => {
      const entry: SeqStatsHistoryEntry = {
        id: 'seq-stats-test-123',
        type: 'seq-stats',
        analysisName: 'COI 서열 분석',
        sequenceCount: 5,
        meanLength: 650,
        overallGcContent: 0.482,
        pinned: false,
        createdAt: 1712200000000,
      }

      const item = toGeneticsHistoryItem(entry)

      expect(item.id).toBe('seq-stats-test-123')
      expect(item.title).toBe('COI 서열 분석')
      expect(item.subtitle).toBe('평균 650 bp')
      expect(item.pinned).toBe(false)
      expect(item.createdAt).toBe(1712200000000)
      expect(item.hasResult).toBe(true)
      expect(item.data).toBe(entry)

      // 뱃지: 서열 수 + GC%
      expect(item.badges).toBeDefined()
      expect(item.badges!).toHaveLength(2)
      expect(item.badges![0].value).toBe('5개 서열')
      expect(item.badges![1].label).toBe('GC')
      expect(item.badges![1].value).toBe('48.2%')
    })

    it('pinned 상태가 반영된다', () => {
      const entry: SeqStatsHistoryEntry = {
        id: 'seq-stats-pinned',
        type: 'seq-stats',
        analysisName: 'Pinned Analysis',
        sequenceCount: 2,
        meanLength: 300,
        overallGcContent: 0.55,
        pinned: true,
        createdAt: 1712200000000,
      }

      const item = toGeneticsHistoryItem(entry)
      expect(item.pinned).toBe(true)
    })
  })

  // ── 4. normalizeEntry 하위 호환 ──

  describe('normalizeEntry — seq-stats raw 데이터 복원', () => {
    beforeEach(() => {
      localStorage.clear()
      vi.restoreAllMocks()
    })

    it('localStorage의 raw JSON을 SeqStatsHistoryEntry로 정규화한다', () => {
      const raw = [{
        id: 'seq-stats-raw-1',
        type: 'seq-stats',
        analysisName: 'Raw Test',
        sequenceCount: 7,
        meanLength: 420,
        overallGcContent: 0.51,
        createdAt: 1712200000000,
      }]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(raw))

      const loaded = loadGeneticsHistory('seq-stats')
      expect(loaded).toHaveLength(1)

      const entry = loaded[0] as SeqStatsHistoryEntry
      expect(entry.type).toBe('seq-stats')
      expect(entry.analysisName).toBe('Raw Test')
      expect(entry.sequenceCount).toBe(7)
    })

    it('필수 필드 누락 시에도 기본값으로 복원한다', () => {
      const raw = [{
        id: 'seq-stats-partial',
        type: 'seq-stats',
        // analysisName, sequenceCount, meanLength, overallGcContent 누락
        createdAt: 1712200000000,
      }]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(raw))

      const loaded = loadGeneticsHistory('seq-stats')
      expect(loaded).toHaveLength(1)

      const entry = loaded[0] as SeqStatsHistoryEntry
      expect(entry.analysisName).toBe('')
      expect(entry.sequenceCount).toBe(0)
      expect(entry.meanLength).toBe(0)
      expect(entry.overallGcContent).toBe(0)
    })
  })
})
