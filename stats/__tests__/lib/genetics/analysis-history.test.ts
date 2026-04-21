import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  saveAnalysisHistory,
  saveGeneticsHistory,
  saveGeneticsHistoryEntry,
  loadGeneticsHistory,
  loadAnalysisHistory,
  hydrateGeneticsHistoryFromCloud,
  deleteGeneticsEntries,
  toggleGeneticsPin,
  updateProteinHistoryReport,
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

  describe('하위 호환 — compat 엔트리', () => {
    it('type 없는 기존 바코딩 엔트리를 정상 로드', () => {
      // 기존 형식: type 필드 없음
      const compatEntry = {
        id: 'compat-1',
        sampleName: 'Old Sample',
        marker: 'COI',
        sequencePreview: 'ATGC',
        topSpecies: 'Gadus morhua',
        topIdentity: 0.99,
        status: 'high',
        createdAt: 1000,
      }
      localStorage.setItem(HISTORY_KEY, JSON.stringify([compatEntry]))

      const all = loadGeneticsHistory()
      expect(all).toHaveLength(1)
      expect(all[0].type).toBe('barcoding')
      expect(all[0].id).toBe('compat-1')

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

  describe('cloud hydration', () => {
    it('D1 원격 히스토리를 로컬과 병합한다', async () => {
      localStorage.setItem(HISTORY_KEY, JSON.stringify([makeBarcodingEntry(1)]))

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
        entries: [makeBlastEntry(2)],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))

      const merged = await hydrateGeneticsHistoryFromCloud()

      expect(merged).toHaveLength(2)
      expect(merged.map(entry => entry.id)).toEqual(['blast-2', 'barcoding-1'])
      expect(loadGeneticsHistory().map(entry => entry.id)).toEqual(['blast-2', 'barcoding-1'])
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

  describe('cloud sync 버그 수정', () => {
    it('Fix #1: syncSaveToCloud는 projectId를 유지하여 전송', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

      saveGeneticsHistory({
        type: 'barcoding',
        sampleName: 'Sample Cloud',
        marker: 'COI',
        sequencePreview: 'ATGC',
        topSpecies: null,
        topIdentity: null,
        status: null,
        projectId: 'local-project-1',
      })

      // fetch POST 호출 확인 (upsert)
      const postCall = fetchSpy.mock.calls.find(c => {
        const opts = c[1] as RequestInit | undefined
        return opts?.method === 'POST' && String(c[0]).includes('/api/history/genetics')
      })
      expect(postCall).toBeDefined()

      // body에 projectId가 유지되어야 함
      const body = JSON.parse(postCall![1]!.body as string)
      expect(body.entry.projectId).toBe('local-project-1')
    })

    it('Fix #2: overflow 엔트리는 cloud에서도 삭제', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 200 }))

      // barcoding 20개 채움
      const existing = Array.from({ length: 20 }, (_, i) => makeBarcodingEntry(i + 1))
      localStorage.setItem(HISTORY_KEY, JSON.stringify(existing))

      // 1개 더 추가 → 가장 오래된 것이 overflow
      saveGeneticsHistory({
        type: 'barcoding',
        sampleName: 'Newest',
        marker: 'COI',
        sequencePreview: 'ATGC',
        topSpecies: null,
        topIdentity: null,
        status: null,
      })

      // DELETE 호출이 있어야 함 (overflow 엔트리 삭제)
      const deleteCalls = fetchSpy.mock.calls.filter(c => {
        const opts = c[1] as RequestInit | undefined
        return opts?.method === 'DELETE'
      })
      expect(deleteCalls.length).toBe(1)

      // 삭제된 ID가 가장 오래된 엔트리(createdAt=1)
      expect(String(deleteCalls[0][0])).toContain('barcoding-1')
    })

    it('Fix #3: hydration 후 타입별 cap이 적용된다', async () => {
      // 로컬에 barcoding 5개
      const local = Array.from({ length: 5 }, (_, i) => makeBarcodingEntry(i + 1))
      localStorage.setItem(HISTORY_KEY, JSON.stringify(local))

      // 원격에서 barcoding 25개 (cap=20 초과)
      const remote = Array.from({ length: 25 }, (_, i) => makeBarcodingEntry(i + 100))

      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
        entries: remote,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }))

      const result = await hydrateGeneticsHistoryFromCloud()

      // cap=20이 적용되어 최대 20개만
      expect(result.length).toBeLessThanOrEqual(20)
      expect(loadGeneticsHistory('barcoding').length).toBeLessThanOrEqual(20)
    })
  })

  describe('protein report snapshot', () => {
    it('protein history entry에 report markdown snapshot을 저장한다', () => {
      const savedEntry = saveGeneticsHistoryEntry({
        type: 'protein',
        analysisName: 'Protein snapshot',
        sequenceLength: 147,
        molecularWeight: 15867.2,
        isoelectricPoint: 6.75,
        isStable: true,
        accession: 'P68871',
      })

      expect(savedEntry).not.toBeNull()

      const markdown = '# Protein snapshot\n\n## UniProt Summary\n\n- Entry: P68871'
      const updated = updateProteinHistoryReport(savedEntry!.id, markdown)

      expect(updated).not.toBeNull()
      expect(updated?.reportMarkdown).toBe(markdown)
      expect(updated?.reportUpdatedAt).toBeTypeOf('number')

      const proteinHistory = loadGeneticsHistory('protein')
      expect(proteinHistory[0]).toMatchObject({
        id: savedEntry!.id,
        type: 'protein',
        reportMarkdown: markdown,
      })
    })

    it('protein full result snapshot을 round-trip 저장한다', () => {
      const savedEntry = saveGeneticsHistoryEntry({
        type: 'protein',
        analysisName: 'Protein restore',
        sequenceLength: 147,
        molecularWeight: 15867.2,
        isoelectricPoint: 6.75,
        isStable: true,
        accession: 'P68871',
        resultData: {
          molecularWeight: 15867.2,
          isoelectricPoint: 6.75,
          gravy: -0.423,
          aromaticity: 0.081,
          instabilityIndex: 32.1,
          isStable: true,
          extinctionCoeffReduced: 12560,
          extinctionCoeffOxidized: 12685,
          aminoAcidComposition: { A: 10, C: 2 },
          aminoAcidPercent: { A: 0.1, C: 0.02 },
          secondaryStructureFraction: { helix: 0.3, turn: 0.1, sheet: 0.2 },
          hydropathyProfile: [{ position: 1, score: -0.4 }],
          sequenceLength: 147,
          sequence: 'MVHLTPEEKSAVTALW',
        },
      })

      expect(savedEntry).not.toBeNull()

      const [entry] = loadGeneticsHistory('protein')
      expect(entry).toMatchObject({
        id: savedEntry!.id,
        type: 'protein',
        resultData: expect.objectContaining({
          sequence: 'MVHLTPEEKSAVTALW',
          gravy: -0.423,
        }),
      })
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

    it('saveGeneticsHistory는 localStorage 실패 시 false를 반환한다', () => {
      const originalSetItem = Storage.prototype.setItem
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string): void {
        if (key === HISTORY_KEY) {
          throw new DOMException('quota exceeded', 'QuotaExceededError')
        }
        return originalSetItem.call(this, key, value)
      })

      const saved = saveGeneticsHistory({
        type: 'protein',
        analysisName: 'Quota fail',
        sequenceLength: 147,
        molecularWeight: 15867.2,
        isoelectricPoint: 6.75,
        isStable: true,
      })

      expect(saved).toBe(false)
    })
  })
})
