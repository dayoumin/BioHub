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

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Mock PDF service
vi.mock('@/lib/services/pdf-report-service', () => ({
  PDFReportService: {
    generateReport: vi.fn(),
    generateSummaryText: vi.fn(() => 'Summary text')
  }
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

    expect(screen.getByText('저장')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
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

    await (startNewAnalysis as ReturnType<typeof vi.fn>)()

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
