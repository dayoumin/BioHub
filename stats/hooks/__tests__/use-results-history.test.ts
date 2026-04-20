import { renderHook, waitFor, act } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResultsHistory } from '../use-results-history'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { AnalysisResult, DataRow, ValidationResults } from '@/types/analysis'
import type { HistorySnapshot } from '@/lib/stores/history-store'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'

const exportMock = vi.fn()

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/services/export/export-service', () => ({
  ExportService: {
    export: (...args: unknown[]) => exportMock(...args),
  },
}))

function makeTerminology(): ReturnType<typeof import('@/hooks/use-terminology').useTerminology> {
  return {
    results: {
      save: {
        success: 'saved',
        errorTitle: 'error',
        unknownError: 'unknown',
      },
      toast: {
        exportSuccess: 'exported',
      },
    },
  } as unknown as ReturnType<typeof import('@/hooks/use-terminology').useTerminology>
}

function makeSnapshot(): HistorySnapshot {
  return {
    results: {
      method: 't-test',
      pValue: 0.03,
      statistic: 2.1,
      interpretation: 'sig',
    } as AnalysisResult,
    analysisPurpose: 'compare',
    selectedMethod: null,
    uploadedFileName: 'test.csv',
    uploadedDataLength: 1,
    variableMapping: null,
    analysisOptions: {
      alpha: 0.05,
      showAssumptions: true,
      showEffectSize: true,
      alternative: 'two-sided',
      methodSettings: {},
    },
    lastAiRecommendation: null,
  }
}

const RESULTS: AnalysisResult = {
  method: 't-test',
  pValue: 0.03,
  statistic: 2.1,
  interpretation: 'sig',
}

const STATISTICAL_RESULT = {
  testName: 't-test',
  pValue: 0.03,
  alpha: 0.05,
  statistic: 2.1,
}

const UPLOADED_DATA: DataRow[] = [{ value: 1 }]
const VALIDATION_RESULTS: ValidationResults = {
  isValid: true,
  totalRows: 1,
  columnCount: 1,
  missingValues: 0,
  dataType: 'numeric',
  variables: ['value'],
  errors: [],
  warnings: [],
}

const PAPER_DRAFT: PaperDraft = {
  methods: 'Methods',
  results: 'Results',
  captions: null,
  discussion: null,
  language: 'ko',
  postHocDisplay: 'significant-only',
  generatedAt: new Date().toISOString(),
  model: null,
  context: {
    variableLabels: {},
    variableUnits: {},
    groupLabels: {},
  },
}

describe('useResultsHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useHistoryStore.setState({
      analysisHistory: [],
      currentHistoryId: null,
      loadedAiInterpretation: null,
      loadedInterpretationChat: null,
      loadedPaperDraft: null,
      saveToHistory: vi.fn().mockResolvedValue(undefined),
      patchHistoryInterpretation: vi.fn().mockResolvedValue(undefined),
      setLoadedInterpretationChat: vi.fn(function (chat) {
        useHistoryStore.setState({ loadedInterpretationChat: chat })
      }),
    })
    exportMock.mockResolvedValue({ success: true, fileName: 'report.docx' })
  })

  it('loadedInterpretationChat를 follow-up state로 복원하고 store payload를 소비한다', async () => {
    const setFollowUpMessages = vi.fn()
    const restoredMessages = [
      { id: 'u1', role: 'user' as const, content: '질문', timestamp: 1 },
      { id: 'a1', role: 'assistant' as const, content: '답변', timestamp: 2 },
    ]

    useHistoryStore.setState({
      loadedInterpretationChat: restoredMessages,
    })

    renderHook(() =>
      useResultsHistory({
        results: RESULTS,
        uploadedData: UPLOADED_DATA,
        validationResults: VALIDATION_RESULTS,
        statisticalResult: STATISTICAL_RESULT as never,
        selectedMethodName: 't-test',
        buildHistorySnapshot: makeSnapshot,
        interpretation: 'AI',
        interpretationModel: 'gpt',
        isInterpreting: false,
        interpretError: null,
        apaFormat: null,
        exportDataInfo: null,
        followUpMessages: [],
        isFollowUpStreaming: false,
        paperDraft: PAPER_DRAFT,
        setFollowUpMessages,
        t: makeTerminology(),
      }),
    )

    await waitFor(() => {
      expect(setFollowUpMessages).toHaveBeenCalledWith(restoredMessages)
    })
    expect(useHistoryStore.getState().loadedInterpretationChat).toBeNull()
  })

  it('export 성공 후 아직 저장되지 않았으면 현재 히스토리 projectId로 silent save를 수행한다', async () => {
    const saveToHistory = vi.fn().mockResolvedValue(undefined)
    useHistoryStore.setState({
      currentHistoryId: 'history-1',
      analysisHistory: [
        {
          id: 'history-1',
          timestamp: new Date(),
          name: 'Saved',
          projectId: 'project-1',
          purpose: 'compare',
          method: null,
          dataFileName: 'test.csv',
          dataRowCount: 1,
          results: {},
        },
      ],
      saveToHistory,
    })

    const { result } = renderHook(() =>
      useResultsHistory({
        results: RESULTS,
        uploadedData: UPLOADED_DATA,
        validationResults: VALIDATION_RESULTS,
        statisticalResult: STATISTICAL_RESULT as never,
        selectedMethodName: 't-test',
        buildHistorySnapshot: makeSnapshot,
        interpretation: 'AI',
        interpretationModel: 'gpt',
        isInterpreting: false,
        interpretError: null,
        apaFormat: 'APA',
        exportDataInfo: null,
        followUpMessages: [],
        isFollowUpStreaming: false,
        paperDraft: PAPER_DRAFT,
        setFollowUpMessages: vi.fn(),
        t: makeTerminology(),
      }),
    )

    await act(async () => {
      await result.current.handleSaveAsFile('docx')
    })

    expect(exportMock).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      expect(saveToHistory).toHaveBeenCalledTimes(1)
    })
    expect(saveToHistory.mock.calls[0]?.[2]).toEqual(expect.objectContaining({
      projectId: 'project-1',
      paperDraft: PAPER_DRAFT,
    }))
  })
})
