import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import type { AnalysisResult } from '@/types/analysis'

const {
  generateSummaryTextMock,
  exportCodeFromAnalysisMock,
  isCodeExportAvailableMock,
} = vi.hoisted(() => ({
  generateSummaryTextMock: vi.fn(),
  exportCodeFromAnalysisMock: vi.fn(),
  isCodeExportAvailableMock: vi.fn(),
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
  AiInterpretationCard: () => null,
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
  selectActiveProject: (state: { activeProject: null }) => state.activeProject,
  useResearchProjectStore: (selector: (state: { activeProject: null }) => unknown) => selector({ activeProject: null }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
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
})
