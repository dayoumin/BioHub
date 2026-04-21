import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useResultsNavigation } from '../use-results-navigation'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHistoryStore, type AnalysisHistory } from '@/lib/stores/history-store'
import { useModeStore } from '@/lib/stores/mode-store'
import type { AnalysisResult } from '@/types/analysis'
import type { AnalysisVisualizationColumnsResult } from '@/lib/graph-studio/analysis-adapter'

const {
  pushMock,
  infoMock,
  errorMock,
  startNewAnalysisMock,
  loggerErrorMock,
  prepareManualMethodBrowsingMock,
  loadDataPackageWithSpecMock,
  disconnectProjectMock,
  createAutoConfiguredChartSpecMock,
  applyAnalysisContextMock,
  toAnalysisContextMock,
  inferColumnMetaMock,
  suggestChartTypeMock,
  analysisVizTypeToChartTypeMock,
  selectXYFieldsMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  infoMock: vi.fn(),
  errorMock: vi.fn(),
  startNewAnalysisMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  prepareManualMethodBrowsingMock: vi.fn(),
  loadDataPackageWithSpecMock: vi.fn(),
  disconnectProjectMock: vi.fn(),
  createAutoConfiguredChartSpecMock: vi.fn(),
  applyAnalysisContextMock: vi.fn(),
  toAnalysisContextMock: vi.fn(),
  inferColumnMetaMock: vi.fn(),
  suggestChartTypeMock: vi.fn(),
  analysisVizTypeToChartTypeMock: vi.fn(),
  selectXYFieldsMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    info: infoMock,
    error: errorMock,
  },
}))

vi.mock('@/lib/services', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services')>('@/lib/services')
  return {
    ...actual,
    startNewAnalysis: (...args: unknown[]) => startNewAnalysisMock(...args),
  }
})

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}))

vi.mock('@/lib/stores/store-orchestration', () => ({
  prepareManualMethodBrowsing: () => prepareManualMethodBrowsingMock(),
}))

vi.mock('@/lib/stores/graph-studio-store', () => ({
  useGraphStudioStore: (
    selector: (state: {
      loadDataPackageWithSpec: typeof loadDataPackageWithSpecMock
      disconnectProject: typeof disconnectProjectMock
    }) => unknown,
  ) => selector({
    loadDataPackageWithSpec: loadDataPackageWithSpecMock,
    disconnectProject: disconnectProjectMock,
  }),
}))

vi.mock('@/lib/graph-studio', () => ({
  toAnalysisContext: (...args: unknown[]) => toAnalysisContextMock(...args),
  buildKmCurveColumns: vi.fn(),
  buildRocCurveColumns: vi.fn(),
  inferColumnMeta: (...args: unknown[]) => inferColumnMetaMock(...args),
  suggestChartType: (...args: unknown[]) => suggestChartTypeMock(...args),
  analysisVizTypeToChartType: (...args: unknown[]) => analysisVizTypeToChartTypeMock(...args),
  selectXYFields: (...args: unknown[]) => selectXYFieldsMock(...args),
  applyAnalysisContext: (...args: unknown[]) => applyAnalysisContextMock(...args),
  createAutoConfiguredChartSpec: (...args: unknown[]) => createAutoConfiguredChartSpecMock(...args),
  CHART_TYPE_HINTS: {},
}))

const T = {
  results: {
    toast: {
      reanalyzeReady: 'reanalyze-ready',
      reanalyzeMethod: (name: string) => `reanalyze:${name}`,
      newAnalysis: 'new-analysis',
    },
  },
  analysis: {
    emptyStates: {
      dataRequired: 'data-required',
    },
  },
} as const

const RESULTS: AnalysisResult = {
  method: 'Independent Samples t-Test',
  pValue: 0.03,
  statistic: 2.5,
  interpretation: '유의',
}

const SELECTED_METHOD = {
  id: 'two-sample-t' as const,
  name: 'Independent Samples t-Test',
  description: 'Two groups',
  category: 't-test' as const,
}

const ANALYSIS_COLUMNS: AnalysisVisualizationColumnsResult = {
  columns: [
    { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
    { name: 'mean', type: 'quantitative', uniqueCount: 2, sampleValues: ['10', '14'], hasNull: false },
  ],
  data: {
    group: ['A', 'B'],
    mean: [10, 14],
  },
  chartType: 'bar',
  xField: 'group',
  yField: 'mean',
  colorField: 'group',
  trendline: { type: 'linear', showEquation: true },
  errorBar: { type: 'stderr' },
}

function renderNavigationHook(options?: Partial<Parameters<typeof useResultsNavigation>[0]>) {
  return renderHook(() =>
    useResultsNavigation({
      results: RESULTS,
      uploadedData: [{ group: 'A', mean: 10 }],
      analysisVisualizationColumns: ANALYSIS_COLUMNS,
      currentHistoryId: null,
      historyEntries: [],
      historyResultView: false,
      clearInterpretationGuard: vi.fn(),
      t: T as never,
      ...options,
    }),
  )
}

describe('useResultsNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAnalysisStore.getState().reset()
    useModeStore.getState().resetMode()
    useHistoryStore.setState({
      analysisHistory: [],
      currentHistoryId: null,
      loadedAiInterpretation: null,
      loadedInterpretationChat: null,
      loadedPaperDraft: null,
    })

    act(() => {
      useAnalysisStore.getState().setSelectedMethod(SELECTED_METHOD)
      useAnalysisStore.getState().setUploadedData([{ group: 'A', mean: 10 }])
      useAnalysisStore.getState().setUploadedFileName('test.csv')
      useAnalysisStore.getState().setValidationResults({
        isValid: true,
        totalRows: 1,
        columnCount: 2,
        missingValues: 0,
        dataType: 'mixed',
        variables: ['group', 'mean'],
        errors: [],
        warnings: [],
      })
      useAnalysisStore.getState().setVariableMapping({
        dependentVar: 'mean',
        groupVar: 'group',
      })
      useAnalysisStore.getState().setResults(RESULTS)
      useAnalysisStore.setState({
        completedSteps: [1, 2, 3, 4],
      })
    })

    createAutoConfiguredChartSpecMock.mockReturnValue({
      encoding: {},
      annotations: [],
    })
    toAnalysisContextMock.mockReturnValue({ significance: true })
    applyAnalysisContextMock.mockImplementation((spec: Record<string, unknown>, ctx: unknown) => ({
      ...spec,
      analysisContext: ctx,
    }))
    startNewAnalysisMock.mockResolvedValue(undefined)
    inferColumnMetaMock.mockReturnValue([
      { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
      { name: 'mean', type: 'quantitative', uniqueCount: 2, sampleValues: ['10', '14'], hasNull: false },
    ])
    suggestChartTypeMock.mockReturnValue('bar')
    analysisVizTypeToChartTypeMock.mockReturnValue(null)
    selectXYFieldsMock.mockReturnValue({ xField: 'group', yField: 'mean' })
  })

  it('reanalyze resets analysis/history state and moves to step 1', () => {
    const clearInterpretationGuard = vi.fn()
    useHistoryStore.setState({
      currentHistoryId: 'history-1',
      loadedAiInterpretation: 'cached',
      loadedInterpretationChat: [
        { id: 'a1', role: 'assistant', content: 'answer', timestamp: 1 },
      ],
      loadedPaperDraft: {
        methods: 'Methods',
        results: 'Results',
        captions: null,
        discussion: null,
        language: 'ko',
        postHocDisplay: 'significant-only',
        generatedAt: new Date().toISOString(),
        model: null,
        context: { variableLabels: {}, variableUnits: {}, groupLabels: {} },
      },
    })

    const { result } = renderNavigationHook({ clearInterpretationGuard })

    act(() => {
      result.current.handleReanalyze()
    })

    const analysisState = useAnalysisStore.getState()
    const historyState = useHistoryStore.getState()
    expect(analysisState.uploadedData).toBeNull()
    expect(analysisState.results).toBeNull()
    expect(historyState.currentHistoryId).toBeNull()
    expect(historyState.loadedAiInterpretation).toBeNull()
    expect(historyState.loadedInterpretationChat).toBeNull()
    expect(historyState.loadedPaperDraft).toBeNull()
    expect(useModeStore.getState().stepTrack).toBe('reanalysis')
    expect(analysisState.currentStep).toBe(1)
    expect(clearInterpretationGuard).toHaveBeenCalledTimes(1)
    expect(infoMock).toHaveBeenCalledWith('reanalyze-ready', {
      description: 'reanalyze:Independent Samples t-Test',
    })
  })

  it('changeMethod clears downstream state and reopens step 2 browsing', () => {
    const { result } = renderNavigationHook()

    act(() => {
      result.current.handleChangeMethod()
    })

    const analysisState = useAnalysisStore.getState()
    expect(analysisState.results).toBeNull()
    expect(analysisState.variableMapping).toBeNull()
    expect(analysisState.completedSteps).toEqual([1, 2])
    expect(analysisState.currentStep).toBe(2)
    expect(prepareManualMethodBrowsingMock).toHaveBeenCalledTimes(1)
  })

  it('openInGraphStudio hands off the analysis package and navigates to the editor', () => {
    const historyEntries: AnalysisHistory[] = [
      {
        id: 'history-graph',
        timestamp: new Date(),
        name: 'History',
        projectId: 'research-project-1',
        purpose: 'compare',
        method: null,
        dataFileName: 'test.csv',
        dataRowCount: 1,
        results: {},
      },
    ]

    const { result } = renderNavigationHook({
      currentHistoryId: 'history-graph',
      historyEntries,
    })

    act(() => {
      result.current.handleOpenInGraphStudio()
    })

    expect(createAutoConfiguredChartSpecMock).toHaveBeenCalledWith(
      expect.any(String),
      'bar',
      'group',
      'mean',
      ANALYSIS_COLUMNS.columns,
    )
    expect(loadDataPackageWithSpecMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'analysis',
        label: 'Independent Samples t-Test 결과',
        projectId: 'research-project-1',
        analysisResultId: 'history-graph',
        sourceRefs: [{ kind: 'analysis', sourceId: 'history-graph', label: 'History' }],
        lineageMode: 'derived',
      }),
      expect.objectContaining({
        encoding: {
          color: { field: 'group', type: 'nominal' },
        },
        trendline: ANALYSIS_COLUMNS.trendline,
        errorBar: ANALYSIS_COLUMNS.errorBar,
        analysisContext: { significance: true },
      }),
    )
    expect(disconnectProjectMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith('/graph-studio')
  })

  it('openInGraphStudio falls back to uploaded rows when no adapter columns are available', () => {
    const { result } = renderNavigationHook({
      analysisVisualizationColumns: null,
      uploadedData: [
        { group: 'A', mean: 10 },
        { group: 'B', mean: 14 },
      ],
      results: {
        ...RESULTS,
        visualizationData: {
          type: 'dendrogram',
          data: {},
        },
      },
    })

    act(() => {
      result.current.handleOpenInGraphStudio()
    })

    expect(inferColumnMetaMock).toHaveBeenCalledTimes(1)
    expect(suggestChartTypeMock).toHaveBeenCalledTimes(1)
    expect(selectXYFieldsMock).toHaveBeenCalledTimes(1)
    expect(createAutoConfiguredChartSpecMock).toHaveBeenCalledWith(
      expect.any(String),
      'bar',
      'group',
      'mean',
      expect.arrayContaining([
        expect.objectContaining({ name: 'group' }),
        expect.objectContaining({ name: 'mean' }),
      ]),
    )
    expect(loadDataPackageWithSpecMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          group: ['A', 'B'],
          mean: [10, 14],
        },
        lineageMode: 'manual',
      }),
      expect.anything(),
    )
  })

  it('openInGraphStudio shows a history-specific error when no raw data survives in history view', () => {
    const { result } = renderNavigationHook({
      analysisVisualizationColumns: null,
      uploadedData: null,
      historyResultView: true,
    })

    act(() => {
      result.current.handleOpenInGraphStudio()
    })

    expect(errorMock).toHaveBeenCalledWith('이 기록에는 그래프 작성을 위한 원본 데이터가 없어 바로 열 수 없습니다.')
    expect(loadDataPackageWithSpecMock).not.toHaveBeenCalled()
    expect(pushMock).not.toHaveBeenCalled()
  })
})
