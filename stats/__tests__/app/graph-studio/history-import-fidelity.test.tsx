import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ResultsActionStep } from '@/components/analysis/steps/ResultsActionStep'
import type { AnalysisResult } from '@/types/analysis'

const testState = vi.hoisted(() => ({
  analysisStore: {
    reset: vi.fn(),
    setUploadedData: vi.fn(),
    setUploadedFile: vi.fn(),
    setValidationResults: vi.fn(),
    setResults: vi.fn(),
    setVariableMapping: vi.fn(),
    pruneCompletedStepsFrom: vi.fn(),
    setCurrentStep: vi.fn(),
    navigateToStep: vi.fn(),
    uploadedData: null as Array<Record<string, unknown>> | null,
    validationResults: null as unknown,
    variableMapping: null as Record<string, unknown> | null,
    uploadedFileName: null as string | null,
    selectedMethod: { id: 'regression', name: 'Regression' },
    assumptionResults: null as unknown,
    analysisOptions: {},
  },
  historyStore: {
    analysisHistory: [{ id: 'hist-graph-1', projectId: 'project-1' }],
    saveToHistory: vi.fn().mockResolvedValue(undefined),
    loadedInterpretationChat: null as unknown,
    currentHistoryId: 'hist-graph-1',
    loadedPaperDraft: null as unknown,
    patchHistoryPaperDraft: vi.fn().mockResolvedValue(undefined),
    patchHistoryInterpretation: vi.fn().mockResolvedValue(undefined),
    setLoadedPaperDraft: vi.fn(),
    setLoadedInterpretationChat: vi.fn(),
  },
  modeStore: {
    setStepTrack: vi.fn(),
  },
  graphStudio: {
    loadDataPackageWithSpec: vi.fn(),
    disconnectProject: vi.fn(),
  },
  router: {
    push: vi.fn(),
  },
  statisticalResult: {
    testName: 'Regression',
    statistic: 2.45,
    statisticName: 't',
    pValue: 0.01,
    df: 18,
    alpha: 0.05,
    interpretation: '유의한 결과입니다.',
    timestamp: new Date('2026-04-13T00:00:00.000Z'),
  },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => testState.router,
}))

vi.mock('@/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}))

vi.mock('@/hooks/use-count-up', () => ({
  useCountUp: (value: number | undefined) => value ?? 0,
}))

vi.mock('@/hooks/use-interpretation', () => ({
  useInterpretation: () => ({
    interpretation: '',
    interpretationModel: null,
    isInterpreting: false,
    interpretError: null,
    handleInterpretation: vi.fn(),
    resetAndReinterpret: vi.fn(),
    clearInterpretationGuard: vi.fn(),
    aiInterpretationRef: { current: null },
    onInterpretationComplete: { current: null as null | (() => void) },
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
      stepTitles: { results: 'Results' },
      executionLogs: { errorPrefix: (message: string) => message },
      emptyStates: { dataRequired: 'Data required' },
    },
    history: { buttons: { cancel: 'Cancel' } },
    results: {
      noResults: 'No results',
      noResultsDescription: 'Run an analysis first.',
      ai: {
        defaultError: 'AI error',
        draftCta: 'Draft CTA',
      },
      followUp: {
        errorMessage: 'Follow-up error',
      },
      buttons: {
        reanalyze: 'Reanalyze',
        viewSummary: 'View summary',
        resultsSummary: 'Results summary',
      },
      save: {
        errorTitle: 'Save failed',
        unknownError: 'Unknown error',
      },
      toast: {
        reanalyzeReady: 'Ready',
        reanalyzeMethod: (name: string) => name,
      },
    },
  }),
}))

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: () => testState.analysisStore,
}))

vi.mock('@/lib/stores/history-store', () => {
  const useHistoryStore = Object.assign(
    () => testState.historyStore,
    { getState: () => testState.historyStore },
  )

  return { useHistoryStore }
})

vi.mock('@/lib/stores/mode-store', () => ({
  useModeStore: () => testState.modeStore,
}))

vi.mock('@/lib/stores/store-orchestration', () => ({
  buildHistorySnapshot: () => ({ id: 'snapshot' }),
  prepareManualMethodBrowsing: vi.fn(),
}))

vi.mock('@/lib/services', () => ({
  startNewAnalysis: vi.fn(),
  ExportService: { export: vi.fn() },
  exportCodeFromAnalysis: vi.fn(),
  isCodeExportAvailable: () => false,
  splitInterpretation: () => ({ summary: '', detail: '' }),
  generateSummaryText: () => 'summary',
  generatePaperDraft: vi.fn(),
}))

vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: () => testState.statisticalResult,
}))

vi.mock('@/lib/statistics/formatters', () => ({
  formatStatisticalResult: () => 'APA text',
}))

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('@/lib/stores/graph-studio-store', () => ({
  useGraphStudioStore: (selector: (state: { loadDataPackageWithSpec: typeof testState.graphStudio.loadDataPackageWithSpec; disconnectProject: typeof testState.graphStudio.disconnectProject }) => unknown) =>
    selector(testState.graphStudio),
}))

vi.mock('@/lib/stores/research-project-store', () => ({
  useResearchProjectStore: (selector: (state: { activeResearchProjectId: string | null; projects: unknown[] }) => unknown) =>
    selector({ activeResearchProjectId: null, projects: [] }),
  selectActiveProject: () => null,
}))

vi.mock('@/lib/utils/history-view', () => ({
  isHistoryResultsView: ({
    currentHistoryId,
    results,
    uploadedData,
    validationResults,
  }: {
    currentHistoryId: string | null
    results: AnalysisResult | null
    uploadedData: unknown
    validationResults: unknown
  }) => Boolean(currentHistoryId && results && !uploadedData && !validationResults),
}))

vi.mock('@/components/common/EmptyState', () => ({
  EmptyState: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="empty-state">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}))

vi.mock('@/components/analysis/common', () => ({
  StepHeader: ({ title }: { title: string }) => <div data-testid="step-header">{title}</div>,
}))

vi.mock('@/components/analysis/steps/exploration/AssumptionTestsSection', () => ({
  AssumptionTestsSection: () => <div data-testid="assumptions" />,
}))

vi.mock('@/components/analysis/steps/results', () => ({
  ResultsHeroCard: () => <div data-testid="results-hero" />,
  ResultsStatsCards: () => <div data-testid="results-stats" />,
  ResultsChartsSection: () => <div data-testid="results-charts" />,
  ResultsActionButtons: () => <div data-testid="results-actions" />,
  AiInterpretationCard: () => <div data-testid="results-ai" />,
  FollowUpQASection: () => <div data-testid="results-follow-up" />,
}))

vi.mock('@/components/analysis/TemplateSaveModal', () => ({
  TemplateSaveModal: () => null,
}))

vi.mock('@/components/analysis/steps/DraftContextEditor', () => ({
  DraftContextEditor: () => null,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}))

function makeHistoryResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    method: 'simple-regression',
    statistic: 12.4,
    pValue: 0.002,
    interpretation: '회귀선이 유의합니다.',
    ...overrides,
  }
}

function renderHistoryResult(result: AnalysisResult): void {
  render(<ResultsActionStep results={result} />)
}

function getLoadedSpec(): Record<string, unknown> {
  expect(testState.graphStudio.loadDataPackageWithSpec).toHaveBeenCalledTimes(1)
  return testState.graphStudio.loadDataPackageWithSpec.mock.calls[0][1] as Record<string, unknown>
}

function getLoadedPackage(): Record<string, unknown> {
  expect(testState.graphStudio.loadDataPackageWithSpec).toHaveBeenCalledTimes(1)
  return testState.graphStudio.loadDataPackageWithSpec.mock.calls[0][0] as Record<string, unknown>
}

describe('history result Graph Studio import fidelity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    testState.analysisStore.uploadedData = null
    testState.analysisStore.validationResults = null
    testState.historyStore.currentHistoryId = 'hist-graph-1'
    testState.historyStore.analysisHistory = [{ id: 'hist-graph-1', projectId: 'project-1' }]
  })

  it('scatter-regression history import carries trendline intent into the loaded spec', () => {
    renderHistoryResult(
      makeHistoryResult({
        visualizationData: {
          type: 'scatter-regression',
          data: {
            x: [1, 2, 3, 4],
            y: [2, 4, 6, 8],
            regression: [2, 4, 6, 8],
          },
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Graph Studio' }))

    const spec = getLoadedSpec()
    const pkg = getLoadedPackage()

    expect(spec.chartType).toBe('scatter')
    expect(spec.trendline).toEqual({ type: 'linear', showEquation: true })
    expect(pkg.analysisResultId).toBe('hist-graph-1')
    expect(pkg.data).toMatchObject({
      x: [1, 2, 3, 4],
      y: [2, 4, 6, 8],
    })
  })

  it('error-bar style history import preserves uncertainty in the loaded spec', () => {
    renderHistoryResult(
      makeHistoryResult({
        method: 'means-plot',
        statistic: 0,
        pValue: 1,
        interpretation: '그룹별 평균입니다.',
        visualizationData: {
          type: 'bar',
          data: {
            plotData: [
              { group: 'A', mean: 10, stderr: 1.2 },
              { group: 'B', mean: 12, stderr: 0.8 },
            ],
          },
        },
      }),
    )

    fireEvent.click(screen.getByRole('button', { name: 'Graph Studio' }))

    const spec = getLoadedSpec()
    const pkg = getLoadedPackage()

    expect(spec.chartType).toBe('error-bar')
    expect(spec.errorBar).toEqual({ type: 'stderr' })
    expect(pkg.data).toMatchObject({
      category: ['A', 'B'],
      value: [10, 12],
      error: [1.2, 0.8],
    })
  })

  it('unsupported dendrogram history result does not advertise a misleading Graph Studio import path', () => {
    renderHistoryResult(
      makeHistoryResult({
        method: 'factor-analysis',
        statistic: 0,
        pValue: 1,
        interpretation: '요인 분석 결과입니다.',
        visualizationData: {
          type: 'dendrogram',
          data: {
            linkage: [[0, 1, 0.4, 2]],
          },
        },
      }),
    )

    expect(screen.queryByRole('button', { name: 'Graph Studio' })).not.toBeInTheDocument()
    expect(testState.graphStudio.loadDataPackageWithSpec).not.toHaveBeenCalled()
  })
})
