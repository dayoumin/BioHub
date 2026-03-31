import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  saveAnalysisHistory,
  saveGeneticsHistory,
  loadGeneticsHistory,
  loadAnalysisHistory,
  deleteGeneticsEntries,
  toggleGeneticsPin,
  HISTORY_KEY,
} from '@/lib/genetics/analysis-history'
import type {
  BarcodingHistoryEntry,
  BlastSearchHistoryEntry,
  GenBankHistoryEntry,
  GeneticsHistoryEntry,
} from '@/lib/genetics/analysis-history'
import {
  listProjectEntityRefs,
  upsertProjectEntityRef,
} from '@/lib/research/project-storage'

function makeBarcodingEntry(index: number, overrides: Partial<BarcodingHistoryEntry> = {}): BarcodingHistoryEntry {
  return {
    id: `barcoding-${index}`,
    type: 'barcoding',
    sampleName: `Sample ${index}`,
    marker: 'COI',
    sequencePreview: `ATGC${index}`,
    topSpecies: null,
    topIdentity: null,
    status: null,
    createdAt: index,
    ...overrides,
  }
}

function makeBlastEntry(index: number, overrides: Partial<BlastSearchHistoryEntry> = {}): BlastSearchHistoryEntry {
  return {
    id: `blast-${index}`,
    type: 'blast',
    program: 'blastn',
    database: 'nt',
    sequence: `ATGCATGCATGC${index}`,
    sequencePreview: `ATGC${index}`,
    hitCount: 10,
    topHitAccession: `KF601412.${index}`,
    topHitSpecies: `Species ${index}`,
    topHitIdentity: 0.99,
    elapsed: 30,
    createdAt: index,
    ...overrides,
  }
}

function makeGenBankEntry(index: number, overrides: Partial<GenBankHistoryEntry> = {}): GenBankHistoryEntry {
  return {
    id: `genbank-${index}`,
    type: 'genbank',
    query: `query ${index}`,
    db: 'nuccore',
    accession: `ACC${index}`,
    organism: `Organism ${index}`,
    sequenceLength: 500,
    createdAt: index,
    ...overrides,
  }
}

describe('analysis-history', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  describe('하위 호환 — 레거시 엔트리', () => {
    it('type 없는 기존 바코딩 엔트리를 정상 로드', () => {
      // 기존 형식: type 필드 없음
      const legacy = {
        id: 'legacy-1',
        sampleName: 'Old Sample',
        marker: 'COI',
        sequencePreview: 'ATGC',
        topSpecies: 'Gadus morhua',
        topIdentity: 0.99,
        status: 'high',
        createdAt: 1000,
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify([legacy]))

      const all = loadGeneticsHistory()
      expect(all).toHaveLength(1)
      expect(all[0].type).toBe('barcoding')
      expect(all[0].id).toBe('legacy-1')

      // loadAnalysisHistory도 동일하게 로드
      const barcoding = loadAnalysisHistory()
      expect(barcoding).toHaveLength(1)
      expect(barcoding[0].sampleName).toBe('Old Sample')
    })
  })

  describe('도구별 필터', () => {
    it('filter로 특정 도구만 조회', () => {
      const entries: GeneticsHistoryEntry[] = [
        makeBarcodingEntry(3),
        makeBlastEntry(2),
        makeGenBankEntry(1),
      ]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))

      expect(loadGeneticsHistory('barcoding')).toHaveLength(1)
      expect(loadGeneticsHistory('blast')).toHaveLength(1)
      expect(loadGeneticsHistory('genbank')).toHaveLength(1)
      expect(loadGeneticsHistory()).toHaveLength(3)
    })

    it('loadAnalysisHistory는 바코딩만 반환', () => {
      const entries: GeneticsHistoryEntry[] = [
        makeBarcodingEntry(3),
        makeBlastEntry(2),
        makeGenBankEntry(1),
      ]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))

      const result = loadAnalysisHistory()
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('barcoding')
    })
  })

  describe('타입별 MAX', () => {
    it('BLAST 저장 시 barcoding 엔트리에 영향 없음', () => {
      // barcoding 20개 + blast 15개 채움
      const barcodings = Array.from({ length: 20 }, (_, i) => makeBarcodingEntry(i + 100))
      const blasts = Array.from({ length: 15 }, (_, i) => makeBlastEntry(i + 1))
      localStorage.setItem(HISTORY_KEY, JSON.stringify([...barcodings, ...blasts]))

      // BLAST 1개 더 추가
      saveGeneticsHistory({
        type: 'blast',
        program: 'blastp',
        database: 'nr',
        sequence: 'MKTAYIAKQRQISFVKSH',
        sequencePreview: 'MKTAY',
        hitCount: 5,
        topHitAccession: null,
        topHitSpecies: null,
        topHitIdentity: null,
        elapsed: 10,
      })

      // barcoding은 여전히 20개
      expect(loadGeneticsHistory('barcoding')).toHaveLength(20)
      // blast는 15개 (가장 오래된 1개 삭제)
      expect(loadGeneticsHistory('blast')).toHaveLength(15)
    })
  })

  describe('entityKind 분기', () => {
    it('GenBank 저장 시 sequence-data entityKind 사용', () => {
      saveGeneticsHistory({
        type: 'genbank',
        query: 'test query',
        db: 'nuccore',
        accession: 'KF601412.1',
        organism: 'Gadus morhua',
        sequenceLength: 654,
        projectId: 'proj-1',
      })

      const refs = listProjectEntityRefs('proj-1')
      expect(refs).toHaveLength(1)
      expect(refs[0].entityKind).toBe('sequence-data')
    })

    it('BLAST 저장 시 blast-result entityKind 사용', () => {
      saveGeneticsHistory({
        type: 'blast',
        program: 'blastn',
        database: 'nt',
        sequence: 'ATGCATGCATGC',
        sequencePreview: 'ATGC',
        hitCount: 10,
        topHitAccession: null,
        topHitSpecies: null,
        topHitIdentity: null,
        elapsed: 30,
        projectId: 'proj-2',
      })

      const refs = listProjectEntityRefs('proj-2')
      expect(refs).toHaveLength(1)
      expect(refs[0].entityKind).toBe('blast-result')
    })
  })

  describe('삭제 + 핀', () => {
    it('deleteGeneticsEntries 모든 타입에서 동작', () => {
      const entries: GeneticsHistoryEntry[] = [
        makeBarcodingEntry(3),
        makeBlastEntry(2),
        makeGenBankEntry(1),
      ]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))

      const remaining = deleteGeneticsEntries(new Set(['blast-2']))
      expect(remaining).toHaveLength(2)
      expect(remaining.map(e => e.type)).toEqual(['barcoding', 'genbank'])
    })

    it('toggleGeneticsPin 동작', () => {
      const entries: GeneticsHistoryEntry[] = [
        makeBlastEntry(1),
      ]
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries))

      const result = toggleGeneticsPin('blast-1')
      expect(result[0].pinned).toBe(true)

      const result2 = toggleGeneticsPin('blast-1')
      expect(result2[0].pinned).toBe(false)
    })
  })

  describe('기존 테스트 — 저장 실패 시 ref 보호', () => {
    it('히스토리 저장 실패 시 overflow 대상 ref를 지우지 않아야 함', () => {
      const oldestLinkedEntry = makeBarcodingEntry(1, { projectId: 'project-1' })
      const otherEntries = Array.from({ length: 19 }, (_, index) => makeBarcodingEntry(index + 2))

      localStorage.setItem(HISTORY_KEY, JSON.stringify([oldestLinkedEntry, ...otherEntries]))
      upsertProjectEntityRef({
        projectId: 'project-1',
        entityKind: 'blast-result',
        entityId: oldestLinkedEntry.id,
        label: oldestLinkedEntry.sampleName,
      })

      const originalSetItem = Storage.prototype.setItem
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string): void {
        if (key === HISTORY_KEY) {
          throw new DOMException('quota exceeded', 'QuotaExceededError')
        }
        return originalSetItem.call(this, key, value)
      })

      saveAnalysisHistory({
        sampleName: 'New Sample',
        marker: 'COI',
        sequencePreview: 'ATGC',
        topSpecies: null,
        topIdentity: null,
        status: null,
      })

      expect(listProjectEntityRefs('project-1')).toEqual([
        expect.objectContaining({
          projectId: 'project-1',
          entityKind: 'blast-result',
          entityId: oldestLinkedEntry.id,
        }),
      ])
    })
  })
})
