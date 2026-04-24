import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { AnalysisResult } from '@/types/analysis'

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const {
  generateSummaryTextMock,
  exportCodeFromAnalysisMock,
  isCodeExportAvailableMock,
  loadDocumentSourceUsagesMock,
  createDocumentWritingSessionMock,
  listProjectEntityRefsMock,
  routerPushMock,
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
} = vi.hoisted(() => ({
  generateSummaryTextMock: vi.fn(),
  exportCodeFromAnalysisMock: vi.fn(),
  isCodeExportAvailableMock: vi.fn(),
  loadDocumentSourceUsagesMock: vi.fn(),
  createDocumentWritingSessionMock: vi.fn(),
  listProjectEntityRefsMock: vi.fn(),
  routerPushMock: vi.fn(),
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT: 'document-blueprints-changed',
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT: 'research-project-entity-refs-changed',
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

vi.mock('@/hooks/use-interpretation', () => ({
  useInterpretation: () => ({
    interpretation: 'AI 해석',
    interpretationModel: 'test-model',
    isInterpreting: false,
    interpretError: null,
    handleInterpretation: vi.fn(),
    resetAndReinterpret: vi.fn(),
    clearInterpretationGuard: vi.fn(),
    aiInterpretationRef: { current: null },
    onInterpretationComplete: { current: null },
  }),
}))

vi.mock('@/hooks/use-follow-up-qa', () => ({
  useFollowUpQA: () => ({
    followUpMessages: [],
    setFollowUpMessages: vi.fn(),
    followUpInput: '',
    setFollowUpInput: vi.fn(),
    isFollowUpStreaming: false,
    chatBottomRef: { current: null },
    handleFollowUp: vi.fn(),
    resetFollowUp: vi.fn(),
  }),
}))

vi.mock('@/hooks/use-error-recovery', () => ({
  useErrorRecovery: () => ({
    reset: vi.fn(),
    recordRetry: vi.fn(),
    isExhausted: false,
  }),
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    analysis: {
      stepTitles: { results: '결과' },
      executionLogs: { errorPrefix: (msg: string) => msg },
      emptyStates: { dataRequired: 'data required' },
    },
    results: {
      noResults: 'No results',
      noResultsDescription: '',
      buttons: {
        copied: '복사됨',
        copy: '복사',
        saved: '저장됨',
        save: '저장',
        export: '내보내기',
        exporting: '내보내는 중...',
        exportDocx: 'DOCX',
        exportExcel: 'Excel',
        exportHtml: 'HTML',
        exportR: 'R Script (.R)',
        exportPython: 'Python (.py)',
        exportWithOptions: '옵션 포함 내보내기',
        viewSummary: '요약 보기',
        resultsSummary: '결과 요약',
        reanalyze: '재분석',
      },
      toast: {
        copyWithAi: 'copy-with-ai',
        copySuccess: 'copy-success',
        copyError: 'copy-error',
        exportSuccess: 'export-success',
        reanalyzeReady: 'reanalyze-ready',
        reanalyzeMethod: () => '',
        newAnalysis: 'new-analysis',
      },
      save: {
        success: 'saved',
        errorTitle: 'error',
        unknownError: 'unknown',
      },
      clipboard: {
        aiSeparator: 'AI',
        itemHeader: '항목',
        valueHeader: '값',
        statistic: (name: string) => name,
        df: 'df',
        effectSize: '효과크기',
        confidenceInterval: '신뢰구간',
        interpretation: '해석',
        aiInterpretation: 'AI 해석',
      },
      ai: {
        defaultError: 'ai-error',
        draftCta: 'draft',
      },
      actionPanel: {
        graphStudio: 'Graph Studio',
      },
      contextPanels: {
        historyViewTitle: '히스토리 결과 보기',
        historyViewDescription: 'desc',
        documentsTitle: '이 결과를 사용하는 문서',
        documentsDescription: 'desc',
        moreDocuments: (count: number) => `+${count}`,
        writingTitle: '문서 작성',
        writingAction: '문서에서 작성',
        writingPending: '문서 생성 중...',
        writingUntitledResult: '분석 결과',
        writingDescriptionNoProject: '프로젝트를 먼저 선택하면 저장된 분석 결과를 바로 문서 초안으로 연결할 수 있습니다.',
        writingDescriptionUnsaved: '저장된 분석 결과에서만 문서를 시작할 수 있습니다. 먼저 결과를 저장하세요.',
        writingDescriptionUnlinked: '이 저장 결과가 현재 프로젝트에 연결되어 있지 않아 여기서는 문서를 시작할 수 없습니다.',
        writingEmptyReady: '아직 이 결과를 사용하는 문서가 없습니다. 지금 바로 초안을 만들 수 있습니다.',
        writingEmptyUnsaved: '먼저 현재 결과를 저장하면 이 화면에서 바로 문서 초안을 만들 수 있습니다.',
        writingEmptyUnlinked: '이 저장 결과를 프로젝트에 연결한 뒤 이 화면에서 문서 초안을 시작할 수 있습니다.',
        writingRequireProjectError: '프로젝트를 먼저 선택해야 문서를 만들 수 있습니다.',
        writingRequireSavedResultError: '저장된 분석 결과에서만 문서를 시작할 수 있습니다.',
        writingRequireLinkedResultError: '이 저장 결과가 프로젝트에 연결되어 있어야 문서를 만들 수 있습니다.',
        writingCreateError: '문서 생성에 실패했습니다.',
        writingDraftTitle: (methodName: string) => `${methodName} 문서 초안`,
      },
      followUp: {
        errorMessage: 'follow-up-error',
        waitingPlaceholder: 'waiting',
        chips: [],
        title: 'follow-up',
        userLabel: 'user',
        aiLabel: 'ai',
        placeholder: 'ask',
      },
    },
  }),
}))

vi.mock('@/components/common/EmptyState', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}))

vi.mock('@/components/analysis/TemplateSaveModal', () => ({
  TemplateSaveModal: () => null,
}))

vi.mock('@/components/analysis/common', () => ({
  StepHeader: ({ action }: { action: React.ReactNode }) => <div>{action}</div>,
}))

vi.mock('@/components/ui/dropdown-menu', async () => {
  const ReactModule = await vi.importActual<typeof import('react')>('react')
  const DropdownContext = ReactModule.createContext<{
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
  } | null>(null)

  function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = ReactModule.useState(false)
    return <DropdownContext.Provider value={{ open, setOpen }}><div>{children}</div></DropdownContext.Provider>
  }

  function DropdownMenuTrigger({ children }: { children: React.ReactNode }) {
    const context = ReactModule.useContext(DropdownContext)
    if (!context || !ReactModule.isValidElement(children)) {
      return <>{children}</>
    }

    const triggerChild = children as React.ReactElement<{ onClick?: () => void }>
    return ReactModule.cloneElement(triggerChild, {
      onClick: () => context.setOpen((prev) => !prev),
    })
  }

  function DropdownMenuContent({ children }: { children: React.ReactNode }) {
    const context = ReactModule.useContext(DropdownContext)
    return context?.open ? <div>{children}</div> : null
  }

  return {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
      <button type="button" onClick={onClick} {...props}>{children}</button>
    ),
    DropdownMenuSeparator: () => <div />,
  }
})

vi.mock('@/components/analysis/steps/results', () => ({
  ResultsHeroCard: () => null,
  ResultsStatsCards: () => null,
  ResultsChartsSection: () => null,
  ResultsActionButtons: () => null,
  AiInterpretationCard: ({ footerAction }: { footerAction?: React.ReactNode }) => <div>{footerAction}</div>,
  FollowUpQASection: () => null,
}))

vi.mock('@/components/analysis/steps/exploration/AssumptionTestsSection', () => ({
  AssumptionTestsSection: () => null,
}))

vi.mock('@/components/analysis/steps/DraftContextEditor', () => ({
  DraftContextEditor: () => null,
}))

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('@/lib/services', async () => {
  const actual = await vi.importActual<typeof import('@/lib/services')>('@/lib/services')
  return {
    ...actual,
    generateSummaryText: (...args: unknown[]) => generateSummaryTextMock(...args),
    exportCodeFromAnalysis: (...args: unknown[]) => exportCodeFromAnalysisMock(...args),
    isCodeExportAvailable: (...args: unknown[]) => isCodeExportAvailableMock(...args),
  }
})

vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: () => ({
    testName: 't-test',
    statisticName: 't',
    statistic: 2.5,
    pValue: 0.03,
    interpretation: '유의',
  }),
}))

vi.mock('@/lib/statistics/formatters', () => ({
  formatStatisticalResult: () => 't(18)=2.50, p=.030',
}))

vi.mock('@/lib/utils/analysis-execution', () => ({
  buildAnalysisExecutionContext: () => ({ executionSettingEntries: [] }),
}))

vi.mock('@/lib/statistics/variable-requirements', () => ({
  getMethodRequirements: () => undefined,
}))

vi.mock('@/lib/graph-studio', () => ({
  buildAnalysisVisualizationColumns: () => null,
}))

vi.mock('@/lib/stores/research-project-store', () => ({
  selectActiveProject: (state: { activeProject: { id: string } | null }) => state.activeProject,
  useResearchProjectStore: (
    selector: (state: { activeProject: { id: string } | null }) => unknown,
  ) => selector({ activeProject: { id: 'project-1' } }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, replace: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/lib/stores/graph-studio-store', () => ({
  useGraphStudioStore: (selector: (state: { loadDataPackageWithSpec: ReturnType<typeof vi.fn>; disconnectProject: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ loadDataPackageWithSpec: vi.fn(), disconnectProject: vi.fn() }),
}))

vi.mock('@/lib/research/document-source-usage', () => ({
  loadDocumentSourceUsages: (...args: unknown[]) => loadDocumentSourceUsagesMock(...args),
}))

vi.mock('@/lib/research/document-writing-session', () => ({
  createDocumentWritingSession: (...args: unknown[]) => createDocumentWritingSessionMock(...args),
}))

vi.mock('@/lib/research/document-blueprint-storage', () => ({
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
}))

vi.mock('@/lib/research/project-storage', () => ({
  listProjectEntityRefs: (...args: unknown[]) => listProjectEntityRefsMock(...args),
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
}))

const RESULTS: AnalysisResult = {
  method: 'Independent Samples t-Test',
  pValue: 0.03,
  statistic: 2.5,
  effectSize: 0.8,
  interpretation: '유의',
}

describe('ResultsActionStep action wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    generateSummaryTextMock.mockReturnValue('Summary')
    exportCodeFromAnalysisMock.mockReturnValue({ success: true, fileName: 'analysis.R' })
    isCodeExportAvailableMock.mockReturnValue(true)
    loadDocumentSourceUsagesMock.mockReset()
    loadDocumentSourceUsagesMock.mockResolvedValue([])
    createDocumentWritingSessionMock.mockReset()
    createDocumentWritingSessionMock.mockResolvedValue({ id: 'doc-created' })
    listProjectEntityRefsMock.mockReset()
    listProjectEntityRefsMock.mockImplementation((projectId?: string) => (
      projectId === 'project-1'
        ? [{
            id: 'pref-1',
            projectId: 'project-1',
            entityKind: 'analysis',
            entityId: 'history-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }]
        : []
    ))
    routerPushMock.mockReset()

    Object.defineProperty(globalThis, 'ClipboardItem', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      configurable: true,
    })

    useAnalysisStore.getState().reset()
    useHistoryStore.setState({
      analysisHistory: [],
      currentHistoryId: null,
      loadedAiInterpretation: null,
      loadedInterpretationChat: null,
      loadedPaperDraft: null,
    })
    act(() => {
      useAnalysisStore.getState().setSelectedMethod({
        id: 'two-sample-t',
        name: 'Independent Samples t-Test',
        description: 'Two groups',
        category: 't-test',
      })
      useAnalysisStore.getState().setUploadedData([{ group: 'A', value: 10 }])
      useAnalysisStore.getState().setUploadedFileName('test.csv')
      useAnalysisStore.getState().setVariableMapping({
        dependentVar: 'value',
        groupVar: 'group',
      })
      useAnalysisStore.getState().setResults(RESULTS)
      useHistoryStore.getState().setCurrentHistoryId('history-1')
    })
  })

  it('copy button invokes the extracted clipboard handler', async () => {
    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '복사' }))
    })

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('Summary'))
  })

  it('result context가 바뀌면 copied 상태를 즉시 초기화한다', async () => {
    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    const { rerender } = render(<ResultsActionStep results={RESULTS} />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: '복사' }))
    })
    expect(screen.getByRole('button', { name: '복사됨' })).toBeInTheDocument()

    rerender(<ResultsActionStep results={{ ...RESULTS, method: 'Paired Samples t-Test', pValue: 0.01 }} />)

    expect(screen.getByRole('button', { name: '복사' })).toBeInTheDocument()
  })

  it('code export menu invokes the extracted export handler', async () => {
    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('export-dropdown'))
    })
    fireEvent.click(await screen.findByTestId('export-r'))

    expect(exportCodeFromAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({
        method: expect.objectContaining({ id: 'two-sample-t' }),
        dataFileName: 'test.csv',
      }),
      'R',
    )
  })

  it('shows document round-trip actions for saved analysis results', async () => {
    loadDocumentSourceUsagesMock.mockResolvedValue([
        {
          documentId: 'doc-1',
          documentTitle: '결과 보고서',
          sectionId: 'results',
          sectionTitle: '결과',
          kind: 'table',
          label: 'Table 1',
          artifactId: 'table_1',
        },
      ])

    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    const usageButton = await screen.findByRole('button', { name: '결과 보고서 · Table 1' })
    expect(usageButton).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(usageButton)
    })

    expect(loadDocumentSourceUsagesMock).toHaveBeenCalledWith('history-1', {
      projectId: 'project-1',
      sourceKind: 'analysis',
    })
    expect(routerPushMock).toHaveBeenCalledWith('/papers?doc=doc-1&section=results&table=table_1')
  })

  it('creates a new writing document from the current saved result', async () => {
    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('paper-document-btn'))
    })

    expect(createDocumentWritingSessionMock).toHaveBeenCalledWith({
      projectId: 'project-1',
      title: 'Independent Samples t-Test 문서 초안',
      sourceEntityIds: {
        analysisIds: ['history-1'],
      },
    })
    expect(routerPushMock).toHaveBeenCalledWith('/papers?doc=doc-created')
  })

  it('uses the restored result project for document usage and document creation', async () => {
    listProjectEntityRefsMock.mockImplementation((projectId?: string) => (
      projectId === 'project-restored'
        ? [{
            id: 'pref-restored',
            projectId: 'project-restored',
            entityKind: 'analysis',
            entityId: 'history-1',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          }]
        : []
    ))

    act(() => {
      useHistoryStore.setState((state) => ({
        ...state,
        analysisHistory: [{
          id: 'history-1',
          timestamp: new Date('2026-01-01T00:00:00.000Z'),
          name: 'Saved result',
          projectId: 'project-restored',
          purpose: '',
          method: null,
          dataFileName: 'test.csv',
          dataRowCount: 1,
          results: {},
        }],
      }))
    })

    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    await waitFor(() => {
      expect(loadDocumentSourceUsagesMock).toHaveBeenCalledWith('history-1', {
        projectId: 'project-restored',
        sourceKind: 'analysis',
      })
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('paper-document-btn'))
    })

    expect(createDocumentWritingSessionMock).toHaveBeenCalledWith({
      projectId: 'project-restored',
      title: 'Independent Samples t-Test 문서 초안',
      sourceEntityIds: {
        analysisIds: ['history-1'],
      },
    })
  })

  it('shows a disabled writing surface until the result is saved', async () => {
    useHistoryStore.getState().setCurrentHistoryId(null)

    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    expect(screen.getByText('저장된 분석 결과에서만 문서를 시작할 수 있습니다. 먼저 결과를 저장하세요.')).toBeInTheDocument()
    expect(screen.getByTestId('paper-document-btn')).toBeDisabled()
  })

  it('disables writing when the saved result is not linked into the resolved project refs', async () => {
    act(() => {
      useHistoryStore.setState((state) => ({
        ...state,
        analysisHistory: [{
          id: 'history-1',
          timestamp: new Date('2026-01-01T00:00:00.000Z'),
          name: 'Saved result',
          projectId: 'project-restored',
          purpose: '',
          method: null,
          dataFileName: 'test.csv',
          dataRowCount: 1,
          results: {},
        }],
      }))
    })
    listProjectEntityRefsMock.mockReturnValue([])

    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    expect(screen.getByText('이 저장 결과가 현재 프로젝트에 연결되어 있지 않아 여기서는 문서를 시작할 수 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('이 저장 결과를 프로젝트에 연결한 뒤 이 화면에서 문서 초안을 시작할 수 있습니다.')).toBeInTheDocument()
    expect(screen.getByTestId('paper-document-btn')).toBeDisabled()
  })

  it('clears the pending state and does not navigate when document creation fails', async () => {
    createDocumentWritingSessionMock.mockRejectedValueOnce(new Error('boom'))

    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    await act(async () => {
      fireEvent.click(screen.getByTestId('paper-document-btn'))
    })

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: '문서에서 작성' })).toBeInTheDocument()
    })
  })

  it('reloads document usages when papers change while the result view stays open', async () => {
    loadDocumentSourceUsagesMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          documentId: 'doc-2',
          documentTitle: '새 문서',
          sectionId: 'methods',
          sectionTitle: '방법',
          kind: 'section',
          label: '방법',
        },
      ])

    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    expect(screen.queryByRole('button', { name: '새 문서 · 방법' })).not.toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(new CustomEvent(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, {
        detail: { projectId: 'project-1', documentId: 'doc-2', action: 'saved' },
      }))
    })

    expect(await screen.findByRole('button', { name: '새 문서 · 방법' })).toBeInTheDocument()
    expect(loadDocumentSourceUsagesMock).toHaveBeenCalledTimes(2)
  })

  it('keeps the newest document usage reload when an older request resolves later', async () => {
    const firstRequest = createDeferred<Array<{
      documentId: string
      documentTitle: string
      sectionId: string
      sectionTitle: string
      kind: 'section' | 'table' | 'figure'
      label: string
    }>>()
    const secondRequest = createDeferred<Array<{
      documentId: string
      documentTitle: string
      sectionId: string
      sectionTitle: string
      kind: 'section' | 'table' | 'figure'
      label: string
    }>>()

    loadDocumentSourceUsagesMock
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise)

    const { ResultsActionStep } = await import('@/components/analysis/steps/ResultsActionStep')
    render(<ResultsActionStep results={RESULTS} />)

    await act(async () => {
      window.dispatchEvent(new CustomEvent(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, {
        detail: { projectId: 'project-1', documentId: 'doc-2', action: 'saved' },
      }))
    })

    await act(async () => {
      secondRequest.resolve([
        {
          documentId: 'doc-2',
          documentTitle: '최신 문서',
          sectionId: 'results',
          sectionTitle: '결과',
          kind: 'table',
          label: 'Table 2',
        },
      ])
      await secondRequest.promise
    })

    expect(await screen.findByRole('button', { name: '최신 문서 · Table 2' })).toBeInTheDocument()

    await act(async () => {
      firstRequest.resolve([
        {
          documentId: 'doc-1',
          documentTitle: '오래된 문서',
          sectionId: 'results',
          sectionTitle: '결과',
          kind: 'table',
          label: 'Table 1',
        },
      ])
      await firstRequest.promise
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '오래된 문서 · Table 1' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '최신 문서 · Table 2' })).toBeInTheDocument()
  })
})
