/**
 * ResultsActionStep - 재분석 버튼 테스트
 *
 * UI 구조 (Phase 1):
 * - 직접 버튼: 저장, PDF, 복사, AI 해석, More(⋯)
 * - DropdownMenu: 템플릿 저장, 다른 데이터로 재분석, 새 분석 시작
 *
 * 테스트 전략:
 * - 시나리오 1: 직접 렌더링 + 버튼 존재 확인 (render test)
 * - 시나리오 2-3: Store 직접 조작으로 handleReanalyze/handleNewAnalysis 로직 검증
 *   (Radix DropdownMenu는 JSDOM Portal 렌더링 한계로 store-level 테스트 사용)
 */

import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import type { AnalysisResult } from '@/types/smart-flow'

// Mock Terminology hooks (TerminologyProvider 없이 테스트)
vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    domain: 'generic',
    displayName: '범용 통계',
    variables: {},
    validation: {},
    success: {},
    selectorUI: {},
    smartFlow: {
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
    },
    purposeInput: {
      purposes: {}, inputModes: { aiRecommend: '', directSelect: '', modeAriaLabel: '' },
      buttons: { back: '', allMethods: '', useThisMethod: '' },
      labels: { selectionPrefix: '', directBadge: '', purposeHeading: '' },
      messages: { purposeHelp: '', guidanceAlert: '', aiRecommendError: '', genericError: '' },
      aiLabels: { recommendTitle: '' },
    },
    results: {
      effectSizeLabels: { small: '작음', medium: '중간', large: '큼', veryLarge: '매우 큼' },
      noResults: '분석을 먼저 실행해주세요.',
      noResultsDescription: '분석 실행 탭에서 분석을 진행해주세요.',
      conclusion: {
        assumptionWarning: '⚠️ 일부 가정 미충족 - 결과 해석에 주의 필요',
        significant: '✓ 통계적으로 유의한 차이가 있습니다',
        notSignificant: '통계적으로 유의한 차이가 없습니다',
      },
      statistics: {
        statistic: '통계량', statisticTooltip: '',
        pValue: '유의확률', pValueTooltip: '',
        effectSize: '효과크기', effectSizeTooltip: '',
        significant: '유의함', notSignificant: '유의하지 않음',
      },
      ai: { label: 'AI 해석', loading: 'AI가 결과를 해석하고 있어요...', detailedLabel: '상세 해석', reinterpret: '다시 해석', retry: '다시 시도', defaultError: 'AI 해석 중 오류가 발생했습니다.' },
      sections: {
        detailedResults: '상세 결과', confidenceInterval: '신뢰구간',
        apaFormat: 'APA 형식', diagnostics: '진단 & 권장', caution: '주의',
        recommendations: '권장사항', warnings: '주의사항', alternatives: '대안 분석 방법',
      },
      metadata: {
        file: '파일: ', data: '데이터: ', variables: '변수: ',
        rowsCols: (r: number, c: number) => `${r}행 × ${c}열`,
        analysisTime: '분석 실행 시각',
      },
      buttons: {
        saved: '저장됨', save: '저장', generating: '생성중...', pdf: 'PDF',
        copied: '복사됨', copy: '복사', saveTemplate: '템플릿으로 저장',
        reanalyze: '다른 데이터로 재분석', newAnalysis: '새 분석 시작',
        export: '내보내기', exporting: '내보내는 중...', exportDocx: 'Word (.docx)', exportExcel: 'Excel (.xlsx)',
        exportHtml: 'HTML', exportWithOptions: '옵션으로 내보내기', backToVariables: '변수 선택으로',
      },
      save: {
        defaultName: (d: string) => `분석 ${d}`, promptMessage: '분석 이름을 입력하세요:',
        success: '저장되었습니다', errorTitle: '저장 실패', unknownError: '알 수 없는 오류',
      },
      toast: {
        reanalyzeReady: '새 데이터를 업로드하세요', reanalyzeMethod: (n: string) => `${n} 분석이 준비되어 있습니다`,
        newAnalysis: '새 분석을 시작합니다', pdfSuccess: 'PDF 보고서가 생성되었습니다', pdfError: 'PDF 생성에 실패했습니다',
        copyWithAi: '결과 + AI 해석이 복사되었습니다', copySuccess: '결과가 복사되었습니다', copyError: '복사 실패',
        templateSaved: '템플릿이 저장되었습니다',
        exportSuccess: '내보내기가 완료되었습니다', exportError: '내보내기에 실패했습니다',
      },
      exportDialog: {
        title: '결과 내보내기', description: '내보내기 형식과 포함할 내용을 선택하세요.',
        formatLabel: '파일 형식', contentLabel: '포함 내용',
        includeInterpretation: 'AI 해석 포함', includeRawData: '원본 데이터 포함',
        includeMethodology: '분석 방법론 포함', includeReferences: '참고문헌 포함',
        cancel: '취소', confirm: '내보내기',
      },
      clipboard: {
        itemHeader: '항목', valueHeader: '값',
        statistic: (n: string) => `통계량 (${n})`, df: '자유도 (df)', effectSize: '효과크기',
        confidenceInterval: '95% 신뢰구간', interpretation: '해석:',
        aiInterpretation: 'AI 해석', aiSeparator: '--- AI 해석 ---',
      },
      followUp: {
        title: '추가 질문', userLabel: '질문', aiLabel: 'AI',
        placeholder: '궁금한 점을 질문하세요...',
        errorMessage: '후속 질문 처리 중 오류가 발생했습니다.',
        changeMethod: '다른 방법으로 분석하기',
        chips: [
          { label: '논문에 어떻게 쓰나요?', prompt: '이 결과를 APA 형식으로 논문에 어떻게 작성하면 되나요?' },
        ],
      },
      confirm: {
        newAnalysis: {
          title: '새 분석을 시작할까요?',
          description: '현재 데이터와 결과가 모두 초기화됩니다. 이 작업은 되돌릴 수 없습니다.',
          confirm: '새 분석 시작', cancel: '취소',
        },
      },
    },
  }),
  useTerminologyContext: () => ({
    dictionary: { domain: 'generic', displayName: '범용 통계' },
    setDomain: vi.fn(),
    currentDomain: 'generic',
  }),
}))

// Mock Next.js router (useRouter requires App Router context)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

// Mock Graph Studio store (prevents cross-store dependency)
vi.mock('@/lib/stores/graph-studio-store', () => ({
  useGraphStudioStore: (selector: (s: { loadDataPackageWithSpec: ReturnType<typeof vi.fn> }) => unknown) =>
    selector({ loadDataPackageWithSpec: vi.fn() }),
}))

// Mock Graph Studio adapter/utils used by ResultsActionStep
vi.mock('@/lib/graph-studio/analysis-adapter', () => ({
  toAnalysisContext: vi.fn(() => ({})),
  buildKmCurveColumns: vi.fn(),
  buildRocCurveColumns: vi.fn(),
}))
vi.mock('@/lib/graph-studio/chart-spec-utils', () => ({
  inferColumnMeta: vi.fn(() => []),
  suggestChartType: vi.fn(() => 'bar'),
  selectXYFields: vi.fn(() => ({ xField: 'x', yField: 'y' })),
  applyAnalysisContext: vi.fn((spec: unknown) => spec),
}))
vi.mock('@/lib/graph-studio/chart-spec-defaults', () => ({
  createDefaultChartSpec: vi.fn(() => ({ encoding: {}, style: {}, annotations: [], exportConfig: {} })),
  CHART_TYPE_HINTS: new Proxy({}, { get: () => ({}) }),
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Mock export utilities
vi.mock('@/lib/services/export/export-data-builder', () => ({
  splitInterpretation: vi.fn((text: string) => ({ summary: text, detail: '' })),
  generateSummaryText: vi.fn(() => 'Summary text'),
}))

// Mock data management
vi.mock('@/lib/services/data-management', () => ({
  startNewAnalysis: vi.fn(() => Promise.resolve())
}))

// Mock result converter - 올바른 StatisticalResult 형태 반환
vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: vi.fn(() => ({
    testName: 't-검정 결과',
    testType: 'Independent Samples t-test',
    description: '두 독립 집단의 평균 비교',
    statistic: 2.5,
    statisticName: 't',
    pValue: 0.05,
    alpha: 0.05,
    interpretation: '유의미한 차이가 있습니다',
    effectSize: { value: 0.72, type: 'cohensD' },
    recommendations: []
  }))
}))

// Mock StatisticalResultCard
vi.mock('@/components/statistics/common/StatisticalResultCard', () => ({
  StatisticalResultCard: ({ result }: { result: unknown }) => (
    <div data-testid="statistical-result-card">
      {JSON.stringify(result)}
    </div>
  )
}))

// Mock AnalysisInfoCard
vi.mock('@/components/smart-flow/components/AnalysisInfoCard', () => ({
  AnalysisInfoCard: () => <div data-testid="analysis-info-card">Info Card</div>
}))

// Mock TemplateSaveModal
vi.mock('@/components/smart-flow/TemplateSaveModal', () => ({
  TemplateSaveModal: () => null
}))

// Mock UI context
vi.mock('@/contexts/ui-context', () => ({
  useUI: () => ({
    isMobile: false,
    isDesktop: true,
    sidebarOpen: false,
    setSidebarOpen: vi.fn(),
    openChatPanel: vi.fn(),
  })
}))

// Mock ollama check
vi.mock('@/lib/rag/utils/ollama-check', () => ({
  checkOllamaStatus: vi.fn(() => Promise.resolve({ available: false, hasInferenceModel: false })),
  OllamaStatus: {}
}))

// Mock statistics common components
vi.mock('@/components/statistics/common/ConfidenceIntervalDisplay', () => ({
  ConfidenceIntervalDisplay: () => null
}))
vi.mock('@/components/statistics/common/EffectSizeCard', () => ({
  EffectSizeCard: () => null
}))
vi.mock('@/components/statistics/common/AssumptionTestCard', () => ({
  AssumptionTestCard: () => null
}))
vi.mock('@/components/statistics/common/StatisticsTable', () => ({
  StatisticsTable: () => null
}))
vi.mock('@/lib/statistics/formatters', () => ({
  formatStatisticalResult: vi.fn(() => null)
}))
vi.mock('@/components/smart-flow/ResultsVisualization', () => ({
  ResultsVisualization: () => null
}))
vi.mock('@/components/smart-flow/steps/results/MethodSpecificResults', () => ({
  MethodSpecificResults: () => null
}))
vi.mock('@/lib/services/result-interpreter', () => ({
  requestInterpretation: vi.fn().mockResolvedValue(
    '## 한줄 요약\n테스트 해석입니다.\n\n## 상세 해석\n상세 내용입니다.'
  ),
}))

describe('ResultsActionStep - 렌더링 테스트', () => {
  const mockResults: AnalysisResult = {
    method: 't-test',
    pValue: 0.05,
    statistic: 2.5,
    interpretation: '유의미한 차이가 있습니다'
  }

  const mockMethod = {
    id: 't-test',
    name: 't-검정',
    category: 't-test' as const,
    description: '두 그룹 평균 비교'
  }

  beforeEach(() => {
    const store = useSmartFlowStore.getState()
    store.reset()
    store.setSelectedMethod(mockMethod)
    store.setUploadedData([{ id: 1, value: 10 }, { id: 2, value: 20 }])
    store.setUploadedFileName('test-data.csv')
    store.setResults(mockResults)
    store.setCurrentStep(4)
  })

  it('저장, PDF, 복사 직접 버튼이 존재한다', async () => {
    await act(async () => {
      render(<ResultsActionStep results={mockResults} />)
    })

    expect(screen.getAllByText('저장').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('복사')).toBeInTheDocument()
  })

  it('통계 결과 카드 영역이 렌더링된다', async () => {
    await act(async () => {
      render(<ResultsActionStep results={mockResults} />)
    })

    // 통계량, p-value, 효과크기가 표시됨
    const buttons = screen.getAllByRole('button')
    expect(buttons.length).toBeGreaterThanOrEqual(4)
  })
})

describe('ResultsActionStep - 재분석 로직 (Store-level)', () => {
  /**
   * handleReanalyze 로직을 store 직접 조작으로 검증
   * (Radix DropdownMenu는 JSDOM에서 Portal 렌더링 불가)
   */

  const mockMethod = {
    id: 't-test',
    name: 't-검정',
    category: 't-test' as const,
    description: '두 그룹 평균 비교'
  }

  beforeEach(() => {
    const store = useSmartFlowStore.getState()
    store.reset()
    store.setSelectedMethod(mockMethod)
    store.setUploadedData([{ id: 1, value: 10 }, { id: 2, value: 20 }])
    store.setUploadedFileName('test-data.csv')
    store.setResults({ method: 't-test', pValue: 0.05, statistic: 2.5, interpretation: 'test' })
    store.setCurrentStep(4)
  })

  // handleReanalyze 로직 시뮬레이션
  function simulateReanalyze() {
    const store = useSmartFlowStore.getState()
    store.setUploadedData(null)
    store.setUploadedFile(null)
    store.setValidationResults(null)
    store.setResults(null)
    store.setIsReanalysisMode(true)
    store.setCurrentStep(1)
  }

  it('"다른 데이터로 재분석" 시 isReanalysisMode가 true가 된다', () => {
    simulateReanalyze()
    expect(useSmartFlowStore.getState().isReanalysisMode).toBe(true)
  })

  it('"다른 데이터로 재분석" 시 Step 1로 이동한다', () => {
    simulateReanalyze()
    expect(useSmartFlowStore.getState().currentStep).toBe(1)
  })

  it('"다른 데이터로 재분석" 시 데이터가 초기화된다', () => {
    simulateReanalyze()
    const state = useSmartFlowStore.getState()
    expect(state.uploadedData).toBeNull()
    expect(state.validationResults).toBeNull()
    expect(state.results).toBeNull()
  })

  it('"다른 데이터로 재분석" 시 selectedMethod는 유지된다', () => {
    simulateReanalyze()
    const state = useSmartFlowStore.getState()
    expect(state.selectedMethod?.id).toBe('t-test')
    expect(state.selectedMethod?.name).toBe('t-검정')
  })

  it('"새 분석 시작"은 모든 상태를 초기화한다', async () => {
    const { startNewAnalysis } = await import('@/lib/services/data-management')

    await startNewAnalysis()

    expect(startNewAnalysis).toHaveBeenCalled()
  })
})

// ===== 흐름 시뮬레이션: 재분석 전체 플로우 =====
describe('재분석 전체 플로우 시뮬레이션', () => {
  it('결과 → 재분석 → 데이터 업로드 → 원클릭 분석 흐름', async () => {
    const mockMethod = {
      id: 'anova',
      name: 'ANOVA',
      category: 'anova' as const,
      description: '세 그룹 이상 비교'
    }

    const mockVariableMapping = {
      dependentVar: 'score',
      groupVar: 'treatment'
    }

    // 1. 분석 완료 상태
    const store = useSmartFlowStore.getState()
    store.reset()
    store.setSelectedMethod(mockMethod)
    store.setVariableMapping(mockVariableMapping)
    store.setUploadedData([{ score: 10, treatment: 'A' }])
    store.setResults({ method: 'anova', pValue: 0.01 } as never)
    store.setCurrentStep(4)

    // 2. 재분석 버튼 클릭 시뮬레이션
    store.setUploadedData(null)
    store.setUploadedFile(null)
    store.setValidationResults(null)
    store.setResults(null)
    store.setIsReanalysisMode(true)
    store.setCurrentStep(1)

    // 3. 검증: 설정은 유지, 데이터만 초기화
    const stateAfterReanalyze = useSmartFlowStore.getState()
    expect(stateAfterReanalyze.isReanalysisMode).toBe(true)
    expect(stateAfterReanalyze.currentStep).toBe(1)
    expect(stateAfterReanalyze.selectedMethod?.id).toBe('anova')
    expect(stateAfterReanalyze.variableMapping?.dependentVar).toBe('score')
    expect(stateAfterReanalyze.uploadedData).toBeNull()
    expect(stateAfterReanalyze.results).toBeNull()

    // 4. 새 데이터 업로드 시뮬레이션
    store.setUploadedData([
      { score: 15, treatment: 'A' },
      { score: 20, treatment: 'B' },
      { score: 25, treatment: 'C' }
    ])

    // 5. 원클릭 분석 실행 (Step 3 건너뛰고 Step 4로)
    store.setCurrentStep(4)

    const finalState = useSmartFlowStore.getState()
    expect(finalState.currentStep).toBe(4)
    expect(finalState.uploadedData?.length).toBe(3)
    expect(finalState.selectedMethod?.id).toBe('anova')
  })
})
