/**
 * history-store — 논문 초안(paperDraft) 시나리오 시뮬레이션
 *
 * 검증 범위:
 * 1. saveToHistory에 paperDraft 포함 여부
 * 2. loadFromHistory → loadedPaperDraft 복원
 * 3. 구버전 레코드(postHocDisplay 없음) → loadedPaperDraft.postHocDisplay === undefined
 *    (컴포넌트의 ?? 'significant-only' fallback이 필요함을 증명)
 * 4. patchHistoryPaperDraft → in-memory store 즉시 반영
 * 5. 히스토리 전환 시 loadedPaperDraft 초기화
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act } from '@testing-library/react'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { HistoryRecord } from '@/lib/utils/storage-types'
import type { PaperDraft, DraftContext } from '@/lib/services/paper-draft/paper-types'

// ─── 스토리지 모킹 ─────────────────────────────────────────────────────────────

vi.mock('@/lib/utils/storage', () => ({
  saveHistory: vi.fn().mockResolvedValue(undefined),
  getAllHistory: vi.fn().mockResolvedValue([]),
  getHistory: vi.fn(),
  deleteHistory: vi.fn().mockResolvedValue(undefined),
  clearAllHistory: vi.fn().mockResolvedValue(undefined),
  initStorage: vi.fn().mockResolvedValue(undefined),
  updateHistory: vi.fn().mockResolvedValue(undefined),
  syncHistoryRecord: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/utils/adapters/indexeddb-adapter', () => ({
  isIndexedDBAvailable: vi.fn().mockReturnValue(true),
}))

const { getHistory, saveHistory, updateHistory, syncHistoryRecord } = await import('@/lib/utils/storage')
const mockGetHistory = vi.mocked(getHistory)
const mockSaveHistory = vi.mocked(saveHistory)
const mockUpdateHistory = vi.mocked(updateHistory)
const mockSyncHistoryRecord = vi.mocked(syncHistoryRecord)

// ─── 픽스처 ───────────────────────────────────────────────────────────────────

const draftCtx: DraftContext = {
  variableLabels: { body_len: '체장', weight: '체중' },
  variableUnits: { body_len: 'cm', weight: 'g' },
  groupLabels: { M: '수컷', F: '암컷' },
  dependentVariable: '체장',
}

const sampleDraft: PaperDraft = {
  methods: '독립표본 t-검정을 실시하였다.',
  results: 'p = .021로 유의한 차이가 있었다.',
  captions: [{ kind: 'table', label: 'Table 1', text: '독립표본 t-검정 결과' }],
  discussion: null,
  language: 'ko',
  postHocDisplay: 'significant-only',
  generatedAt: '2026-03-18T00:00:00.000Z',
  model: null,
  context: draftCtx,
}

/** 현재 레코드 팩토리 (postHocDisplay 포함) */
function makeRecord(overrides: Partial<HistoryRecord> = {}): HistoryRecord {
  return {
    id: 'test-history-1',
    timestamp: Date.now(),
    name: '테스트 분석',
    purpose: '집단 간 차이 비교',
    method: { id: 'independent-t-test', name: '독립표본 t-검정', category: 'parametric' },
    dataFileName: 'test.csv',
    dataRowCount: 50,
    results: { method: 'independent-t-test', pValue: 0.023 },
    aiInterpretation: 'AI 해석 텍스트',
    apaFormat: 't(28) = 2.45, p = .021',
    paperDraft: sampleDraft,
    ...overrides,
  }
}

/** 구버전 레코드 팩토리 (postHocDisplay 필드 없음) */
function makeLegacyRecord(): HistoryRecord {
  const base = makeRecord()
  const legacyDraft = { ...sampleDraft } as Record<string, unknown>
  delete legacyDraft.postHocDisplay  // 구버전에 없는 필드
  return { ...base, paperDraft: legacyDraft as unknown as PaperDraft }
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('history-store — paperDraft 라이프사이클', () => {
  beforeEach(() => {
    act(() => {
      useHistoryStore.setState({
        analysisHistory: [],
        currentHistoryId: null,
        loadedAiInterpretation: null,
        loadedInterpretationChat: null,
        loadedPaperDraft: null,
      })
    })
    vi.clearAllMocks()
  })

  // ── 1. 초기 상태 ─────────────────────────────────────────────────────────────

  it('초기 상태에서 loadedPaperDraft는 null이다', () => {
    expect(useHistoryStore.getState().loadedPaperDraft).toBeNull()
  })

  // ── 2. loadFromHistory → loadedPaperDraft 복원 ────────────────────────────

  it('loadFromHistory 시 paperDraft가 있으면 loadedPaperDraft에 복원된다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeRecord())

    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    const state = useHistoryStore.getState()
    // before: null → after: draft 복원
    expect(state.loadedPaperDraft).not.toBeNull()
    expect(state.loadedPaperDraft?.methods).toBe('독립표본 t-검정을 실시하였다.')
    expect(state.loadedPaperDraft?.language).toBe('ko')
    expect(state.loadedPaperDraft?.postHocDisplay).toBe('significant-only')
    expect(state.loadedPaperDraft?.context.dependentVariable).toBe('체장')
  })

  it('loadFromHistory 시 paperDraft가 없으면 loadedPaperDraft는 null이다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeRecord({ paperDraft: null }))

    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    expect(useHistoryStore.getState().loadedPaperDraft).toBeNull()
  })

  it('loadSettingsFromHistory는 anova page ID를 canonical one-way-anova로 복원하고 Welch variant를 동기화한다', async () => {
    mockGetHistory.mockResolvedValueOnce(makeRecord({
      method: { id: 'anova', name: 'ANOVA', category: 'anova' },
      results: { method: 'anova', testVariant: 'welch', pValue: 0.023 },
      analysisOptions: { alpha: 0.05, showAssumptions: true, showEffectSize: true, methodSettings: {} },
    }))

    const result = await useHistoryStore.getState().loadSettingsFromHistory('test-history-1')

    expect(result?.selectedMethod?.id).toBe('one-way-anova')
    expect(result?.analysisOptions.methodSettings).toEqual({
      welch: true,
    })
  })

  it('legacy t-test method id도 양쪽 복원 경로에서 canonical method로 복원한다', async () => {
    const legacyRecord = makeRecord({
      method: { id: 'independent-t-test', name: '독립표본 t-검정', category: 't-test' },
    })

    mockGetHistory.mockResolvedValueOnce(legacyRecord)
    const fullResult = await useHistoryStore.getState().loadFromHistory('test-history-1')

    mockGetHistory.mockResolvedValueOnce(legacyRecord)
    const settingsResult = await useHistoryStore.getState().loadSettingsFromHistory('test-history-1')

    expect(fullResult?.selectedMethod?.id).toBe('two-sample-t')
    expect(settingsResult?.selectedMethod?.id).toBe('two-sample-t')
  })

  // ── 3. 구버전 데이터 호환성 ────────────────────────────────────────────────

  it('구버전 레코드(postHocDisplay 없음)를 로드하면 postHocDisplay가 undefined다 → 컴포넌트 fallback 필요', async () => {
    mockGetHistory.mockResolvedValueOnce(makeLegacyRecord())

    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    const draft = useHistoryStore.getState().loadedPaperDraft
    expect(draft).not.toBeNull()

    // postHocDisplay가 undefined → 컴포넌트에서 ?? 'significant-only' fallback을 적용해야 함
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((draft as any).postHocDisplay).toBeUndefined()

    // fallback을 직접 시뮬레이션
    const restoredPostHocDisplay = draft?.postHocDisplay ?? 'significant-only'
    expect(restoredPostHocDisplay).toBe('significant-only')
  })

  it('최신 레코드(postHocDisplay: all)는 fallback 없이 그대로 복원된다', async () => {
    const draftWithAll: PaperDraft = { ...sampleDraft, postHocDisplay: 'all' }
    mockGetHistory.mockResolvedValueOnce(makeRecord({ paperDraft: draftWithAll }))

    await act(async () => {
      await useHistoryStore.getState().loadFromHistory('test-history-1')
    })

    const draft = useHistoryStore.getState().loadedPaperDraft
    expect(draft?.postHocDisplay).toBe('all')
    // fallback 적용해도 'all' 유지
    expect(draft?.postHocDisplay ?? 'significant-only').toBe('all')
  })

  // ── 4. patchHistoryPaperDraft ─────────────────────────────────────────────

  it('patchHistoryPaperDraft는 in-memory analysisHistory를 즉시 업데이트한다', async () => {
    // 초기 히스토리 세팅
    act(() => {
      useHistoryStore.setState({
        analysisHistory: [{
          id: 'test-history-1',
          name: '테스트 분석',
          timestamp: new Date(),
          method: { id: 'independent-t-test', name: '독립표본 t-검정', category: 'parametric' },
          dataFileName: 'test.csv',
          dataRowCount: 50,
          purpose: '',
          results: null,
          paperDraft: null,
        }],
        currentHistoryId: 'test-history-1',
      })
    })

    // before: paperDraft null
    const before = useHistoryStore.getState().analysisHistory[0]
    expect(before.paperDraft).toBeNull()

    await act(async () => {
      await useHistoryStore.getState().patchHistoryPaperDraft('test-history-1', sampleDraft)
    })

    // after: paperDraft 반영
    const after = useHistoryStore.getState().analysisHistory[0]
    expect(after.paperDraft).not.toBeNull()
    expect(after.paperDraft?.methods).toBe('독립표본 t-검정을 실시하였다.')
    expect(after.paperDraft?.postHocDisplay).toBe('significant-only')
  })

  it('patchHistoryPaperDraft는 updateHistory와 syncHistoryRecord를 호출한다', async () => {
    act(() => {
      useHistoryStore.setState({
        analysisHistory: [{ id: 'test-history-1', name: '분석', timestamp: new Date(), method: null, dataFileName: '', dataRowCount: 0, purpose: '', results: null }],
      })
    })

    await act(async () => {
      await useHistoryStore.getState().patchHistoryPaperDraft('test-history-1', sampleDraft)
    })

    expect(mockUpdateHistory).toHaveBeenCalledWith('test-history-1', { paperDraft: sampleDraft })
    expect(mockSyncHistoryRecord).toHaveBeenCalledWith('test-history-1')
  })

  it('patchHistoryPaperDraft(id, null)은 초안을 삭제한다', async () => {
    act(() => {
      useHistoryStore.setState({
        analysisHistory: [{ id: 'test-history-1', name: '분석', timestamp: new Date(), method: null, dataFileName: '', dataRowCount: 0, purpose: '', results: null, paperDraft: sampleDraft }],
      })
    })

    await act(async () => {
      await useHistoryStore.getState().patchHistoryPaperDraft('test-history-1', null)
    })

    expect(useHistoryStore.getState().analysisHistory[0].paperDraft).toBeNull()
  })

  // ── 5. saveToHistory에 paperDraft 포함 ────────────────────────────────────

  it('saveToHistory 호출 시 metadata.paperDraft가 HistoryRecord에 포함된다', async () => {
    const { getAllHistory } = await import('@/lib/utils/storage')
    vi.mocked(getAllHistory).mockResolvedValueOnce([makeRecord()])

    const snapshot = {
      results: { method: 'two-sample-t', pValue: 0.023 } as never,
      analysisPurpose: '집단 간 차이',
      selectedMethod: { id: 'two-sample-t', name: '독립표본 t-검정', category: 't-test' as const, description: '' },
      uploadedFileName: 'test.csv',
      uploadedDataLength: 50,
      variableMapping: null,
      analysisOptions: {} as never,
      lastAiRecommendation: null,
    }

    await act(async () => {
      await useHistoryStore.getState().saveToHistory(snapshot, '테스트', {
        aiInterpretation: 'AI 해석',
        apaFormat: 't(28) = 2.45, p = .021',
        paperDraft: sampleDraft,
      })
    })

    // saveHistory가 호출될 때 paperDraft가 포함됐는지 확인
    expect(mockSaveHistory).toHaveBeenCalledTimes(1)
    const savedRecord = mockSaveHistory.mock.calls[0][0] as HistoryRecord
    expect(savedRecord.method?.id).toBe('two-sample-t')
    expect(savedRecord.paperDraft).not.toBeNull()
    expect(savedRecord.paperDraft?.methods).toBe('독립표본 t-검정을 실시하였다.')
    expect(savedRecord.paperDraft?.postHocDisplay).toBe('significant-only')
  })

  it('saveToHistory 호출 시 metadata.paperDraft 없으면 null로 저장된다', async () => {
    const { getAllHistory } = await import('@/lib/utils/storage')
    vi.mocked(getAllHistory).mockResolvedValueOnce([makeRecord({ paperDraft: null })])

    const snapshot = {
      results: { method: 'two-sample-t', pValue: 0.023 } as never,
      analysisPurpose: '집단 간 차이',
      selectedMethod: { id: 'two-sample-t', name: '독립표본 t-검정', category: 't-test' as const, description: '' },
      uploadedFileName: 'test.csv',
      uploadedDataLength: 50,
      variableMapping: null,
      analysisOptions: {} as never,
      lastAiRecommendation: null,
    }

    await act(async () => {
      await useHistoryStore.getState().saveToHistory(snapshot, '초안 없는 저장')
    })

    const savedRecord = mockSaveHistory.mock.calls[0][0] as HistoryRecord
    expect(savedRecord.method?.id).toBe('two-sample-t')
    expect(savedRecord.paperDraft).toBeNull()
  })

  // ── 6. setLoadedPaperDraft 소비 패턴 ──────────────────────────────────────

  it('setLoadedPaperDraft(null) 호출 후 loadedPaperDraft는 null이다', () => {
    act(() => {
      useHistoryStore.setState({ loadedPaperDraft: sampleDraft })
    })
    expect(useHistoryStore.getState().loadedPaperDraft).not.toBeNull()

    act(() => {
      useHistoryStore.getState().setLoadedPaperDraft(null)
    })
    expect(useHistoryStore.getState().loadedPaperDraft).toBeNull()
  })
})
