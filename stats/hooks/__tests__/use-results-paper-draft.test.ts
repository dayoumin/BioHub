import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResultsPaperDraft } from '../use-results-paper-draft'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { ExportContext } from '@/lib/services'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'

const generateAnalysisPaperDraftMock = vi.fn()

vi.mock('@/lib/services', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services')>('@/lib/services')
  return {
    ...actual,
    generateAnalysisPaperDraft: (...args: unknown[]) => generateAnalysisPaperDraftMock(...args),
  }
})

function makeDraft(overrides?: Partial<PaperDraft>): PaperDraft {
  return {
    methods: 'Methods',
    results: 'Results',
    captions: null,
    discussion: null,
    language: 'ko',
    postHocDisplay: 'significant-only',
    generatedAt: new Date().toISOString(),
    model: null,
    context: {
      variableLabels: { score: '점수' },
      variableUnits: {},
      groupLabels: {},
    },
    ...overrides,
  }
}

const EXPORT_CONTEXT: ExportContext = {
  analysisResult: {
    method: 't-test',
    pValue: 0.03,
    statistic: 2.1,
    interpretation: 'sig',
  },
  statisticalResult: {
    testName: 't-test',
    pValue: 0.03,
    alpha: 0.05,
    statistic: 2.1,
  } as never,
  aiInterpretation: null,
  apaFormat: null,
  exportOptions: {
    includeInterpretation: false,
    includeRawData: false,
    includeMethodology: false,
    includeReferences: false,
  },
  dataInfo: null,
  rawDataRows: null,
}

describe('useResultsPaperDraft', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useHistoryStore.setState({
      analysisHistory: [],
      currentHistoryId: 'history-1',
      loadedAiInterpretation: null,
      loadedInterpretationChat: null,
      loadedPaperDraft: null,
      patchHistoryPaperDraft: vi.fn().mockResolvedValue(undefined),
      setLoadedPaperDraft: vi.fn(function (draft) {
        useHistoryStore.setState({ loadedPaperDraft: draft })
      }),
    })
  })

  it('loadedPaperDraft를 복원하고 store payload를 비운다', async () => {
    const restoredDraft = makeDraft({ methods: 'Restored Methods' })
    useHistoryStore.setState({ loadedPaperDraft: restoredDraft })

    const { result } = renderHook(() =>
      useResultsPaperDraft({
        draftExportCtx: EXPORT_CONTEXT,
        selectedMethodId: 't-test',
      }),
    )

    await waitFor(() => {
      expect(result.current.paperDraft?.methods).toBe('Restored Methods')
    })
    expect(result.current.lastDraftContext).toEqual(restoredDraft.context)
    expect(useHistoryStore.getState().loadedPaperDraft).toBeNull()
  })

  it('draft confirm과 language change가 초안을 재생성하고 history patch를 갱신한다', async () => {
    const patchHistoryPaperDraft = vi.fn().mockResolvedValue(undefined)
    useHistoryStore.setState({ patchHistoryPaperDraft })

    generateAnalysisPaperDraftMock
      .mockReturnValueOnce(makeDraft({ methods: 'First Draft', language: 'ko' }))
      .mockReturnValueOnce(makeDraft({ methods: 'English Draft', language: 'en' }))

    const { result } = renderHook(() =>
      useResultsPaperDraft({
        draftExportCtx: EXPORT_CONTEXT,
        selectedMethodId: 't-test',
      }),
    )

    await act(async () => {
      result.current.handleDraftConfirm({
        variableLabels: { score: '점수' },
        variableUnits: {},
        groupLabels: {},
      }, {
        language: 'ko',
        postHocDisplay: 'significant-only',
      })
    })

    expect(result.current.paperDraft?.methods).toBe('First Draft')
    expect(result.current.paperDraftOpen).toBe(true)
    expect(patchHistoryPaperDraft).toHaveBeenCalledWith(
      'history-1',
      expect.objectContaining({ methods: 'First Draft' }),
    )

    await act(async () => {
      result.current.handleDraftLanguageChange('en')
    })

    expect(result.current.paperDraft?.methods).toBe('English Draft')
    expect(generateAnalysisPaperDraftMock).toHaveBeenNthCalledWith(
      2,
      EXPORT_CONTEXT,
      expect.objectContaining({ variableLabels: { score: '점수' } }),
      't-test',
      expect.objectContaining({ language: 'en' }),
      expect.objectContaining({
        historyId: 'history-1',
        variableMapping: null,
      }),
    )
    expect(patchHistoryPaperDraft).toHaveBeenLastCalledWith(
      'history-1',
      expect.objectContaining({ methods: 'English Draft', language: 'en' }),
    )
  })
})
