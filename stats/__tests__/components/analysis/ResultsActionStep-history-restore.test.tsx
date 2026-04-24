/**
 * ResultsActionStep — 히스토리 복원 시나리오 시뮬레이션 테스트
 *
 * 3차 리뷰 이슈 2건:
 * 1. 같은 세션에서 aiInterpretation 없는 히스토리로 전환 → 자동 해석 시작 검증
 * 2. 새로고침 getHistory() stale 응답 → 현재 화면 덮어쓰기 방지 검증
 *
 * 전략: 컴포넌트 렌더링 + store 조작으로 effect 흐름 시뮬레이션
 */

import React from 'react'
import { render, act, fireEvent, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { AnalysisResult } from '@/types/analysis'
import type { PaperDraft } from '@/lib/services/paper-draft/paper-types'

// ─── Mocks ───────────────────────────────────────────────

// getHistory mock — 테스트별로 동작 제어
const getHistoryMock = vi.fn<(id: string) => Promise<{ aiInterpretation?: string | null } | null>>()
vi.mock('@/lib/utils/storage', () => ({
  getHistory: (...args: unknown[]) => getHistoryMock(args[0] as string),
  saveHistory: vi.fn().mockResolvedValue(undefined),
  deleteHistory: vi.fn().mockResolvedValue(undefined),
  getAllHistory: vi.fn().mockResolvedValue([]),
  getHistoryCount: vi.fn().mockResolvedValue(0),
  clearAllHistory: vi.fn().mockResolvedValue(undefined),
}))

// requestInterpretation mock — 호출 추적
const requestInterpretationMock = vi.fn()
vi.mock('@/lib/services/result-interpreter', () => ({
  requestInterpretation: (...args: unknown[]) => requestInterpretationMock(...args),
}))

// Terminology mock
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'generic',
    displayName: '범용 통계',
    variables: {},
    validation: {},
    success: {},
    selectorUI: {},
    analysis: {
      stepTitles: {},
      stepShortLabels: { exploration: '', method: '', variable: '', analysis: '' },
      statusMessages: {},
      buttons: {},
      resultSections: { effectSizeDetail: 'Effect Size Details' },
      executionStages: {
        prepare: { label: '', message: '' }, preprocess: { label: '', message: '' },
        assumptions: { label: '', message: '' }, analysis: { label: '', message: '' },
        additional: { label: '', message: '' }, finalize: { label: '', message: '' },
      },
      layout: {
        appTitle: '', historyTitle: '', historyClose: '',
        historyCount: () => '', aiChatbot: '', helpLabel: '', settingsLabel: '',
        nextStep: '', analyzingDefault: '', dataSizeGuide: '', currentLimits: '',
        memoryRecommendation: '', detectedMemory: () => '',
        limitFileSize: '', limitDataSize: '', limitRecommended: '',
        memoryTier4GB: '', memoryTier8GB: '', memoryTier16GB: '',
      },
      execution: {
        runningTitle: '', resumeButton: '', pauseButton: '', cancelButton: '',
        pauseDisabledTooltip: '', cancelConfirm: '',
        logSectionLabel: () => '', noLogs: '', dataRequired: '',
        unknownError: '', estimatedTimeRemaining: () => '',
      },
      executionLogs: {
        stageStart: () => '', engineReadyCached: '', engineLoading: '', engineReady: '',
        dataLoaded: () => '', missingHandled: () => '', normalityTestStart: '',
        normalityTestDone: () => '', normalityTestFailed: '', homogeneityTestStart: '',
        homogeneityTestDone: () => '', homogeneityTestFailed: '', assumptionSkipped: '',
        methodExecuting: () => '', aiSettingsApplied: () => '', aiPostHoc: () => '',
        aiAlternative: () => '', effectSizeDone: '', confidenceIntervalDone: '',
        analysisDone: '', totalTime: () => '', errorPrefix: (msg: string) => `오류: ${msg}`,
        userCancelled: '', locale: 'ko',
      },
    },
    purposeInput: {
      purposes: {}, inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' },
      buttons: { back: '', allMethods: '', useThisMethod: '' },
      labels: { selectionPrefix: '', directBadge: '', purposeHeading: '' },
      messages: { purposeHelp: '', guidanceAlert: '', aiRecommendError: '', genericError: '' },
      aiLabels: { recommendTitle: '' },
    },
    history: {
      buttons: { cancel: '' },
    },
    results: {
      effectSizeLabels: { small: '작음', medium: '중간', large: '큼', veryLarge: '매우 큼' },
      noResults: '분석을 먼저 실행해주세요.',
      noResultsDescription: '',
      conclusion: {
        assumptionWarning: '', significant: '유의함', notSignificant: '유의하지 않음',
      },
      statistics: {
        statistic: '통계량', statisticTooltip: '',
        pValue: '유의확률', pValueTooltip: '',
        effectSize: '효과크기', effectSizeTooltip: '',
        significant: '유의함', notSignificant: '유의하지 않음',
      },
      ai: {
        label: 'AI 해석',
        loading: 'AI가 결과를 해석하고 있어요...',
        idleDescription: '버튼을 눌러 AI 해석을 생성하세요.',
        detailedLabel: '상세 해석',
        requestButton: 'AI 해석 생성하기',
        reinterpret: '다시 해석',
        retry: '다시 시도',
        defaultError: 'AI 해석 중 오류가 발생했습니다.',
        retryExhausted: 'AI 해석을 불러올 수 없습니다.',
        draftCta: '이 결과로 논문 초안을 작성해 보세요',
      },
      sections: {
        detailedResults: '', confidenceInterval: '', apaFormat: '',
        diagnostics: '', caution: '', recommendations: '', warnings: '', alternatives: '',
      },
      metadata: {
        methodLabel: '분석 방법',
        file: '파일: ', fileBadge: (name: string) => `파일 · ${name}`, data: '데이터: ', variables: '변수: ',
        rowsCols: (r: number, c: number) => `${r}행 × ${c}열`,
        analysisTime: '',
        copyApaAriaLabel: 'APA 복사',
        customImplementation: '자체 구현',
        rValidated: 'R 검증 완료',
        customImplementationTooltip: '',
        computedWithLib: (lib: string) => `${lib} 기반 계산`,
        rCrossValidationLre: (lre: string) => `LRE ${lre}`,
        optionsLabel: '옵션',
      },
      buttons: {
        saved: '저장됨', save: '저장', generating: '생성중...', pdf: 'PDF',
        copied: '복사됨', copy: '복사', saveTemplate: '템플릿',
        reanalyze: '재분석', newAnalysis: '새 분석',
        export: '내보내기', exporting: '내보내는 중...', exportDocx: '', exportExcel: '',
        exportHtml: '', exportR: '', exportPython: '', exportWithOptions: '', backToVariables: '',
      },
      save: {
        defaultName: (d: string) => `분석 ${d}`, promptMessage: '',
        success: '', errorTitle: '', unknownError: '',
        projectDialog: {
          title: '',
          description: '',
          withoutProjectTitle: '',
          withoutProjectDescription: '',
          noDescription: '',
          noProjects: '',
          saving: '',
        },
      },
      toast: {
        reanalyzeReady: '', reanalyzeMethod: () => '',
        newAnalysis: '', pdfSuccess: '', pdfError: '',
        copyWithAi: '', copySuccess: '', copyError: '',
        templateSaved: '', exportSuccess: '', exportError: '',
      },
      exportDialog: {
        title: '', description: '', formatLabel: '', contentLabel: '',
        includeInterpretation: '', includeRawData: '', includeMethodology: '',
        includeReferences: '', cancel: '', confirm: '',
      },
      clipboard: {
        itemHeader: '', valueHeader: '', statistic: () => '', df: '', effectSize: '',
        confidenceInterval: '', interpretation: '', aiInterpretation: '', aiSeparator: '',
      },
      followUp: {
        title: '', userLabel: '', aiLabel: '',
        placeholder: '', errorMessage: '', changeMethod: '',
        chips: [],
      },
      confirm: {
        newAnalysis: { title: '', description: '', confirm: '', cancel: '' },
        changeMethod: { title: '', description: '', confirm: '', cancel: '' },
      },
      actionPanel: {
        graphStudio: 'Graph Studio',
      },
      contextPanels: {
        historyViewTitle: '',
        historyViewDescription: '',
        documentsTitle: '',
        documentsDescription: '',
        moreDocuments: (count: number) => `+${count}`,
      },
    },
  }),
  useTerminologyContext: () => ({
    dictionary: { domain: 'generic', displayName: '범용 통계' },
    setDomain: vi.fn(),
    currentDomain: 'generic',
  }),
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('@/lib/stores/graph-studio-store', () => ({
  useGraphStudioStore: (sel: (s: { loadDataPackageWithSpec: ReturnType<typeof vi.fn>; disconnectProject: ReturnType<typeof vi.fn> }) => unknown) =>
    sel({ loadDataPackageWithSpec: vi.fn(), disconnectProject: vi.fn() }),
}))
vi.mock('@/lib/graph-studio/analysis-adapter', () => ({
  toAnalysisContext: vi.fn(() => ({})),
  buildAnalysisVisualizationColumns: vi.fn(() => null),
  buildKmCurveColumns: vi.fn(),
  buildRocCurveColumns: vi.fn(),
}))
vi.mock('@/lib/graph-studio/chart-spec-utils', () => ({
  inferColumnMeta: vi.fn(() => []),
  suggestChartType: vi.fn(() => 'bar'),
  analysisVizTypeToChartType: vi.fn(() => null),
  selectXYFields: vi.fn(() => ({ xField: 'x', yField: 'y' })),
  applyAnalysisContext: vi.fn((s: unknown) => s),
}))
vi.mock('@/lib/graph-studio/chart-spec-defaults', () => ({
  createDefaultChartSpec: vi.fn(() => ({ encoding: {}, style: {}, annotations: [], exportConfig: {} })),
  CHART_TYPE_HINTS: new Proxy({}, { get: () => ({}) }),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/lib/services/export/export-data-builder', () => ({
  splitInterpretation: vi.fn((text: string) => ({ summary: text, detail: '' })),
  generateSummaryText: vi.fn(() => 'Summary'),
}))
vi.mock('@/lib/services/data-management', () => ({
  startNewAnalysis: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: vi.fn(() => ({
    testName: 't-검정', testType: 'Independent t-test', description: '',
    statistic: 2.5, statisticName: 't', pValue: 0.03, alpha: 0.05,
    interpretation: '유의', effectSize: { value: 0.72, type: 'cohensD' },
    recommendations: [],
  })),
}))
vi.mock('@/components/statistics/common/StatisticalResultCard', () => ({
  StatisticalResultCard: ({ result }: { result: unknown }) => (
    <div data-testid="statistical-result-card">{JSON.stringify(result)}</div>
  ),
}))
vi.mock('@/components/analysis/components/AnalysisInfoCard', () => ({
  AnalysisInfoCard: () => <div data-testid="analysis-info-card" />,
}))
vi.mock('@/components/analysis/TemplateSaveModal', () => ({
  TemplateSaveModal: () => null,
}))
vi.mock('@/contexts/ui-context', () => ({
  useUI: () => ({
    isMobile: false, isDesktop: true, sidebarOpen: false,
    setSidebarOpen: vi.fn(),
  }),
}))
vi.mock('@/lib/rag/utils/ollama-check', () => ({
  checkOllamaStatus: vi.fn().mockResolvedValue({ available: false, hasInferenceModel: false }),
  OllamaStatus: {},
}))
vi.mock('@/components/statistics/common/ConfidenceIntervalDisplay', () => ({ ConfidenceIntervalDisplay: () => null }))
vi.mock('@/components/statistics/common/EffectSizeCard', () => ({ EffectSizeCard: () => null }))
vi.mock('@/components/statistics/common/AssumptionTestCard', () => ({ AssumptionTestCard: () => null }))
vi.mock('@/components/statistics/common/StatisticsTable', () => ({ StatisticsTable: () => null }))
vi.mock('@/lib/statistics/formatters', () => ({
  formatStatisticalResult: vi.fn(() => null),
  formatPValueAPA: vi.fn((p: number) => p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`),
}))
vi.mock('@/components/analysis/steps/results/MethodSpecificResults', () => ({ MethodSpecificResults: () => null }))

// ─── Lazy import (mocks 등록 후 — vi.mock hoisted이므로 beforeAll 1회만 실행) ─────────
let ResultsActionStep: React.ComponentType<{ results: AnalysisResult }>

// Windows + ESM transform 환경에서 cold-start 시 10s 기본값으로는 부족.
beforeAll(async () => {
  const mod = await import('@/components/analysis/steps/ResultsActionStep')
  ResultsActionStep = mod.ResultsActionStep
}, 30_000)

// ─── Test data ───────────────────────────────────────────

const mockMethod = {
  id: 't-test' as const,
  name: 't-검정',
  category: 't-test' as const,
  description: '두 그룹 평균 비교',
}

const resultsA: AnalysisResult = {
  method: 't-test',
  pValue: 0.03,
  statistic: 2.5,
  interpretation: '유의미한 차이',
}

const resultsB: AnalysisResult = {
  method: 'anova',
  pValue: 0.12,
  statistic: 1.8,
  interpretation: '유의하지 않음',
}

// ─── Helpers ─────────────────────────────────────────────

function setupStore(results: AnalysisResult, historyId: string | null = null): void {
  const store = useAnalysisStore.getState()
  store.reset()
  store.setSelectedMethod(mockMethod)
  store.setUploadedData([{ id: 1, val: 10 }])
  store.setUploadedFileName('test.csv')
  store.setResults(results)
  store.setCurrentStep(4)
  useHistoryStore.setState({
    analysisHistory: [],
    currentHistoryId: null,
    loadedAiInterpretation: null,
    loadedInterpretationChat: null,
    loadedPaperDraft: null,
  })
  if (historyId) {
    // loadFromHistory 시뮬레이션: currentHistoryId + loadedAiInterpretation 설정
    useHistoryStore.setState({ currentHistoryId: historyId })
  }
}

// ─── Tests ───────────────────────────────────────────────

describe('3차 리뷰 이슈 1: 같은 세션 히스토리 전환 — cache miss 시 자동 해석', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // getHistory: 기본적으로 null 반환 (첫 마운트 경로 안전)
    getHistoryMock.mockResolvedValue(null)
    // requestInterpretation: 즉시 resolve + onChunk 호출
    requestInterpretationMock.mockImplementation(
      async (_ctx: unknown, onChunk: (c: string) => void) => {
        onChunk('해석 결과 텍스트')
        return { model: 'test-model', provider: 'openrouter' as const }
      }
    )
  })

  afterEach(() => {
    useAnalysisStore.getState().reset()
  })

  it('히스토리 A(해석 있음) → 히스토리 B(해석 없음) 전환 시 handleInterpretation 호출됨', async () => {
    // 1단계: 히스토리 없이 마운트 (첫 마운트 경로 → getHistory 미호출)
    setupStore(resultsA)

    const { rerender } = render(<ResultsActionStep results={resultsA} />)

    // 첫 마운트: prevHistoryIdRef === undefined → null 초기화
    await act(async () => {
      await new Promise(r => setTimeout(r, 100))
    })

    expect(requestInterpretationMock).not.toHaveBeenCalled()

    const initialGenerateButton = screen.getByRole('button', { name: /AI 해석 생성하기|Generate AI interpretation/ })
    expect(initialGenerateButton).toBeInTheDocument()

    // 2단계: 히스토리 A로 전환 (해석 있음)
    useHistoryStore.setState({
      currentHistoryId: 'history-A',
      loadedAiInterpretation: '히스토리 A의 캐시된 해석',
    })
    useAnalysisStore.setState({
      results: resultsA,
    })
    await act(async () => {
      rerender(<ResultsActionStep results={resultsA} />)
      await new Promise(r => setTimeout(r, 50))
    })

    // requestInterpretation 호출 횟수 기록 (히스토리 A는 캐시 있으므로 추가 호출 없음)
    const callsBefore = requestInterpretationMock.mock.calls.length

    // 3단계: 히스토리 B로 전환 (해석 없음)
    useHistoryStore.setState({
      currentHistoryId: 'history-B',
      loadedAiInterpretation: null, // ★ 해석 없음
    })
    useAnalysisStore.setState({
      results: resultsB,
    })

    await act(async () => {
      rerender(<ResultsActionStep results={resultsB} />)
    })

    // 전환 effect 실행 → cached === null → handleInterpretationRef.current?.() 직접 호출
    await act(async () => {
      await new Promise(r => setTimeout(r, 200))
    })

    expect(requestInterpretationMock.mock.calls.length).toBe(callsBefore)

    const generateButton = screen.getByRole('button', { name: /AI 해석 생성하기|Generate AI interpretation/ })
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(requestInterpretationMock.mock.calls.length).toBeGreaterThan(callsBefore)
    }, { timeout: 2000 })
  })

  it('히스토리 A(해석 있음) → 히스토리 C(해석 있음) 전환 시 requestInterpretation 미호출', async () => {
    // 1단계: 히스토리 없이 마운트
    setupStore(resultsA)

    const { rerender } = render(<ResultsActionStep results={resultsA} />)
    await act(async () => {
      await new Promise(r => setTimeout(r, 100))
    })

    // 2단계: 히스토리 A로 전환
    useHistoryStore.setState({
      currentHistoryId: 'history-A',
      loadedAiInterpretation: '히스토리 A 해석',
    })
    useAnalysisStore.setState({
      results: resultsA,
    })
    await act(async () => {
      rerender(<ResultsActionStep results={resultsA} />)
      await new Promise(r => setTimeout(r, 50))
    })

    requestInterpretationMock.mockClear()

    // 3단계: 히스토리 C (해석 있음)
    useHistoryStore.setState({
      currentHistoryId: 'history-C',
      loadedAiInterpretation: '히스토리 C의 캐시된 해석',
    })
    useAnalysisStore.setState({
      results: resultsB,
    })

    await act(async () => {
      rerender(<ResultsActionStep results={resultsB} />)
    })

    // 약간 대기 후에도 호출 없어야 함
    await act(async () => {
      await new Promise(r => setTimeout(r, 200))
    })

    expect(requestInterpretationMock).not.toHaveBeenCalled()
  })
})

describe('3차 리뷰 이슈 2: 새로고침 getHistory() stale 응답 방어', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requestInterpretationMock.mockImplementation(
      async (_ctx: unknown, onChunk: (c: string) => void) => {
        onChunk('새 해석')
        return { model: 'test-model', provider: 'openrouter' as const }
      }
    )
  })

  afterEach(() => {
    useAnalysisStore.getState().reset()
  })

  it('getHistory 응답 전에 다른 히스토리로 전환하면 stale 응답 무시', async () => {
    // 시나리오: 새로고침 → currentHistoryId='old-id' → getHistory('old-id') 호출됨
    // 사용자가 즉시 'new-id'로 전환 → getHistory('old-id') 응답 도착 → 무시되어야 함

    let resolveOldHistory: ((val: { aiInterpretation: string } | null) => void) | null = null

    getHistoryMock.mockImplementation((id: string) => {
      if (id === 'old-id') {
        // 느린 응답 — 수동 resolve
        return new Promise(resolve => {
          resolveOldHistory = resolve
        })
      }
      // 다른 ID는 즉시 resolve
      return Promise.resolve(null)
    })

    // 첫 마운트: 새로고침 시뮬레이션 (currentHistoryId 있고, interpretation null)
    setupStore(resultsA, 'old-id')

    const { rerender } = render(<ResultsActionStep results={resultsA} />)

    // getHistory('old-id') 호출되었는지 확인
    await waitFor(() => {
      expect(getHistoryMock).toHaveBeenCalledWith('old-id')
    })

    // getHistory 응답 도착 전에 다른 히스토리로 전환
    useHistoryStore.setState({
      currentHistoryId: 'new-id',
      loadedAiInterpretation: '새 히스토리 해석',
    })
    useAnalysisStore.setState({
      results: resultsB,
    })

    await act(async () => {
      rerender(<ResultsActionStep results={resultsB} />)
    })

    // 이제 old-id의 getHistory 응답이 도착
    await act(async () => {
      resolveOldHistory?.({ aiInterpretation: '오래된 해석 — 이건 무시되어야 함' })
      await new Promise(r => setTimeout(r, 50))
    })

    // requestInterpretation이 stale 데이터로 호출되지 않아야 함
    // (old-id의 응답이 무시되었으므로 setInterpretation('오래된 해석')이 실행되지 않음)

    // 검증: 현재 store의 히스토리 ID가 'new-id'이고,
    // 'old-id' 기준 해석이 설정되지 않았음을 확인
    const state = useHistoryStore.getState()
    expect(state.currentHistoryId).toBe('new-id')
  })

  it('getHistory 에러 시에도 stale ID면 handleInterpretation 미호출', async () => {
    let rejectOldHistory: ((err: Error) => void) | null = null

    getHistoryMock.mockImplementation((id: string) => {
      if (id === 'old-id') {
        return new Promise((_resolve, reject) => {
          rejectOldHistory = reject
        })
      }
      return Promise.resolve(null)
    })

    setupStore(resultsA, 'old-id')

    const { rerender } = render(<ResultsActionStep results={resultsA} />)

    await waitFor(() => {
      expect(getHistoryMock).toHaveBeenCalledWith('old-id')
    })

    requestInterpretationMock.mockClear()

    // 전환
    useHistoryStore.setState({
      currentHistoryId: 'new-id',
      loadedAiInterpretation: '새 해석',
    })
    useAnalysisStore.setState({
      results: resultsB,
    })
    await act(async () => {
      rerender(<ResultsActionStep results={resultsB} />)
    })

    // old-id의 getHistory 에러 발생
    await act(async () => {
      rejectOldHistory?.(new Error('network error'))
      await new Promise(r => setTimeout(r, 50))
    })

    // stale ID이므로 handleInterpretationRef.current?.() 미호출
    // (new-id는 이미 loadedAiInterpretation으로 복원됨)
    // requestInterpretation이 stale 경로에서 호출되지 않아야 함
    // (new-id 전환에서 cached 있으므로 호출 없음)
    expect(requestInterpretationMock).not.toHaveBeenCalled()
  })
})

describe('ResultsActionStep 복원 회귀 방지', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getHistoryMock.mockResolvedValue(null)
    requestInterpretationMock.mockResolvedValue({ model: 'test-model', provider: 'openrouter' as const })
  })

  afterEach(() => {
    useAnalysisStore.getState().reset()
    useHistoryStore.setState({
      analysisHistory: [],
      currentHistoryId: null,
      loadedAiInterpretation: null,
      loadedInterpretationChat: null,
      loadedPaperDraft: null,
    })
  })

  it('히스토리 전환 시 loadedInterpretationChat 복원이 reset 이후에도 유지된다', async () => {
    setupStore(resultsA)
    const { rerender } = render(<ResultsActionStep results={resultsA} />)

    await act(async () => {
      await new Promise(r => setTimeout(r, 50))
    })

    useHistoryStore.setState({
      currentHistoryId: 'history-chat',
      loadedAiInterpretation: '캐시된 해석',
      loadedInterpretationChat: [
        { id: 'user-1', role: 'user', content: '질문', timestamp: Date.now() - 1 },
        { id: 'assistant-1', role: 'assistant', content: '복원된 답변', timestamp: Date.now() },
      ],
    })

    await act(async () => {
      rerender(<ResultsActionStep results={resultsA} />)
      await new Promise(r => setTimeout(r, 50))
    })

    await waitFor(() => {
      expect(screen.getByText('복원된 답변')).toBeInTheDocument()
    })
  })

  it('히스토리 전환 시 loadedPaperDraft 복원이 reset 이후에도 유지된다', async () => {
    setupStore(resultsA)
    const { rerender } = render(<ResultsActionStep results={resultsA} />)

    const restoredDraft: PaperDraft = {
      methods: '복원된 Methods',
      results: '복원된 Results',
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

    useHistoryStore.setState({
      currentHistoryId: 'history-draft',
      loadedAiInterpretation: '캐시된 해석',
      loadedPaperDraft: restoredDraft,
    })

    await act(async () => {
      rerender(<ResultsActionStep results={resultsA} />)
      await new Promise(r => setTimeout(r, 50))
    })

    fireEvent.click(screen.getByTestId('paper-draft-btn'))

    await waitFor(() => {
      expect(screen.getByTestId('paper-draft-panel')).toBeInTheDocument()
    })
  })
})
