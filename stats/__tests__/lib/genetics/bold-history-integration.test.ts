/**
 * BOLD 히스토리 통합 테스트
 *
 * 1. 저장 → 로드 → 필터
 * 2. entityKind → 'bold-result'
 * 3. 어댑터 → HistoryItem shape
 * 4. normalizeEntry 하위 호환
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  saveGeneticsHistory,
  loadGeneticsHistory,
  deleteGeneticsEntries,
  HISTORY_KEY,
} from '@/lib/genetics/analysis-history'
import type { BoldHistoryEntry } from '@/lib/genetics/analysis-history'
import { toGeneticsHistoryItem } from '@/lib/utils/history-adapters'
import { listProjectEntityRefs } from '@/lib/research/project-storage'

const TEST_SEQ = 'CCTCTATCTAGTATTTGGTGCCTGAGCCGGAATGGTAGGAACCGCCCTAAGCCTCCTCATTCGAGCAGAACTAAGCCAACCAGGCGCCCTTCTAGGCGATGAC'

describe('BOLD 히스토리 통합', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))
  })

  describe('저장 → 로드 → 필터', () => {
    it('BOLD 히스토리를 저장하고 로드한다', () => {
      const saved = saveGeneticsHistory({
        type: 'bold',
        sampleName: 'COI sample A',
        db: 'public.tax-derep',
        searchMode: 'rapid',
        sequencePreview: 'ATGCATGCATGC',
        sequence: TEST_SEQ,
        topSpecies: 'Gadus morhua',
        topSimilarity: 0.992,
        topBin: 'BOLD:AAA1234',
        hitCount: 15,
      })
      expect(saved).toBe(true)

      const all = loadGeneticsHistory('bold')
      expect(all).toHaveLength(1)

      const entry = all[0] as BoldHistoryEntry
      expect(entry.type).toBe('bold')
      expect(entry.sampleName).toBe('COI sample A')
      expect(entry.topSpecies).toBe('Gadus morhua')
      expect(entry.topSimilarity).toBe(0.992)
      expect(entry.topBin).toBe('BOLD:AAA1234')
      expect(entry.hitCount).toBe(15)
      expect(entry.sequence).toBe(TEST_SEQ)
      expect(entry.id).toMatch(/^bold-/)
    })

    it('타입 필터로 bold만 조회', () => {
      saveGeneticsHistory({
        type: 'barcoding',
        sampleName: 'Barcoding',
        marker: 'COI',
        sequencePreview: 'ATGC',
        topSpecies: null,
        topIdentity: null,
        status: null,
      })
      saveGeneticsHistory({
        type: 'bold',
        sampleName: 'BOLD test',
        db: 'public.tax-derep',
        searchMode: 'rapid',
        sequencePreview: 'ATGC',
        sequence: TEST_SEQ,
        topSpecies: null,
        topSimilarity: null,
        topBin: null,
        hitCount: 0,
      })

      expect(loadGeneticsHistory('bold')).toHaveLength(1)
      expect(loadGeneticsHistory('barcoding')).toHaveLength(1)
      expect(loadGeneticsHistory()).toHaveLength(2)
    })

    it('삭제 동작', () => {
      saveGeneticsHistory({
        type: 'bold',
        sampleName: 'To Delete',
        db: 'public.plants',
        searchMode: 'exhaustive',
        sequencePreview: 'ATGC',
        sequence: TEST_SEQ,
        topSpecies: null,
        topSimilarity: null,
        topBin: null,
        hitCount: 0,
      })

      const entries = loadGeneticsHistory('bold')
      const remaining = deleteGeneticsEntries(new Set([entries[0].id]))
      expect(remaining).toHaveLength(0)
    })

    it('MAX 15 cap 적용', () => {
      for (let i = 0; i < 16; i++) {
        saveGeneticsHistory({
          type: 'bold',
          sampleName: `Sample ${i}`,
          db: 'public.tax-derep',
          searchMode: 'rapid',
          sequencePreview: 'ATGC',
          sequence: 'ATGC',
          topSpecies: null,
          topSimilarity: null,
          topBin: null,
          hitCount: 0,
        })
      }
      expect(loadGeneticsHistory('bold')).toHaveLength(15)
    })
  })

  describe('entityKind', () => {
    it('projectId 연결 시 bold-result entityKind', () => {
      saveGeneticsHistory({
        type: 'bold',
        sampleName: 'Project Sample',
        db: 'public.tax-derep',
        searchMode: 'rapid',
        sequencePreview: 'ATGC',
        sequence: TEST_SEQ,
        topSpecies: 'Gadus morhua',
        topSimilarity: 0.99,
        topBin: 'BOLD:AAA1234',
        hitCount: 5,
        projectId: 'proj-bold',
      })

      const refs = listProjectEntityRefs('proj-bold')
      expect(refs).toHaveLength(1)
      expect(refs[0].entityKind).toBe('bold-result')
      expect(refs[0].label).toBe('Project Sample')
    })
  })

  describe('어댑터', () => {
    it('BoldHistoryEntry → HistoryItem 변환', () => {
      const entry: BoldHistoryEntry = {
        id: 'bold-test-123',
        type: 'bold',
        sampleName: 'Gadus test',
        db: 'public.tax-derep',
        searchMode: 'rapid',
        sequencePreview: 'ATGCATGC',
        sequence: TEST_SEQ,
        topSpecies: 'Gadus morhua',
        topSimilarity: 0.995,
        topBin: 'BOLD:AAA1234',
        hitCount: 10,
        pinned: false,
        createdAt: 1712200000000,
      }

      const item = toGeneticsHistoryItem(entry)

      expect(item.id).toBe('bold-test-123')
      expect(item.title).toBe('Gadus test')
      expect(item.pinned).toBe(false)
      expect(item.hasResult).toBe(true)
      expect(item.data).toBe(entry)

      // 뱃지: species + similarity + BIN
      expect(item.badges).toBeDefined()
      expect(item.badges!).toHaveLength(3)
      expect(item.badges![0].value).toBe('Gadus morhua')
      expect(item.badges![1].value).toBe('99.5%')
      expect(item.badges![2].label).toBe('BIN')
      expect(item.badges![2].value).toBe('BOLD:AAA1234')
    })

    it('종 미판정 시 뱃지 최소화', () => {
      const entry: BoldHistoryEntry = {
        id: 'bold-none',
        type: 'bold',
        sampleName: 'Unknown',
        db: 'public.fungi',
        searchMode: 'exhaustive',
        sequencePreview: 'ATGC',
        sequence: '',
        topSpecies: null,
        topSimilarity: null,
        topBin: null,
        hitCount: 0,
        createdAt: 1712200000000,
      }

      const item = toGeneticsHistoryItem(entry)
      expect(item.badges!).toHaveLength(0)
    })
  })

  describe('normalizeEntry — raw 복원', () => {
    it('localStorage raw JSON → BoldHistoryEntry', () => {
      const raw = [{
        id: 'bold-raw-1',
        type: 'bold',
        sampleName: 'Raw Test',
        db: 'public.tax-derep',
        searchMode: 'rapid',
        sequencePreview: 'ATGC',
        sequence: TEST_SEQ,
        topSpecies: 'Salmo salar',
        topSimilarity: 0.98,
        topBin: 'BOLD:BBB5678',
        hitCount: 8,
        createdAt: 1712200000000,
      }]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(raw))

      const loaded = loadGeneticsHistory('bold')
      expect(loaded).toHaveLength(1)

      const entry = loaded[0] as BoldHistoryEntry
      expect(entry.type).toBe('bold')
      expect(entry.sampleName).toBe('Raw Test')
      expect(entry.topSpecies).toBe('Salmo salar')
      expect(entry.sequence).toBe(TEST_SEQ)
    })

    it('sequence 없는 레거시 엔트리도 빈 문자열로 복원', () => {
      const raw = [{
        id: 'bold-legacy',
        type: 'bold',
        sampleName: 'Legacy',
        db: 'public.tax-derep',
        searchMode: 'rapid',
        sequencePreview: 'ATGC',
        // sequence 필드 없음 (이전 버전)
        topSpecies: null,
        topSimilarity: null,
        topBin: null,
        hitCount: 0,
        createdAt: 1712200000000,
      }]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(raw))

      const loaded = loadGeneticsHistory('bold')
      expect(loaded).toHaveLength(1)
      expect((loaded[0] as BoldHistoryEntry).sequence).toBe('')
    })
  })
})
