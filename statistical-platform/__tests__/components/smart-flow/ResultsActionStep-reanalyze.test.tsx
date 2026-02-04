/**
 * ResultsActionStep - 재분석 버튼 테스트
 *
 * 테스트 시나리오:
 * 1. "다른 데이터로 재분석" 버튼 존재 확인
 * 2. 버튼 클릭 시 재분석 모드 활성화
 * 3. "새 분석 시작" 버튼과의 차이점
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest'
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
  startNewAnalysis: vi.fn()
}))

// Mock result converter
vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: vi.fn(() => ({
    title: 't-검정 결과',
    statistics: [{ label: 't', value: 2.5 }],
    pValue: 0.05,
    isSignificant: true,
    interpretation: '유의미한 차이가 있습니다'
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

describe('ResultsActionStep - 재분석 버튼', () => {
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
    // Store 초기화
    const store = useSmartFlowStore.getState()
    store.reset()

    // 분석 완료 상태 설정
    store.setSelectedMethod(mockMethod)
    store.setUploadedData([{ id: 1, value: 10 }, { id: 2, value: 20 }])
    store.setUploadedFileName('test-data.csv')
    store.setResults(mockResults)
    store.setCurrentStep(4)
  })

  // ===== 시나리오 1: 버튼 존재 확인 =====
  it('"다른 데이터로 재분석" 버튼이 존재한다', () => {
    render(<ResultsActionStep results={mockResults} />)

    expect(screen.getByText('다른 데이터로 재분석')).toBeInTheDocument()
  })

  it('"새 분석 시작" 버튼이 존재한다', () => {
    render(<ResultsActionStep results={mockResults} />)

    expect(screen.getByText('새 분석 시작')).toBeInTheDocument()
  })

  it('결과 복사, 재분석, 새 분석 버튼이 3열로 배치되어 있다', () => {
    render(<ResultsActionStep results={mockResults} />)

    // grid-cols-3 클래스를 가진 컨테이너 확인
    const buttonContainer = screen.getByText('결과 복사').closest('.grid')
    expect(buttonContainer).toHaveClass('grid-cols-3')
  })

  // ===== 시나리오 2: 재분석 버튼 클릭 =====
  it('"다른 데이터로 재분석" 클릭 시 isReanalysisMode가 true가 된다', async () => {
    render(<ResultsActionStep results={mockResults} />)

    const reanalyzeButton = screen.getByText('다른 데이터로 재분석')
    fireEvent.click(reanalyzeButton)

    await waitFor(() => {
      const state = useSmartFlowStore.getState()
      expect(state.isReanalysisMode).toBe(true)
    })
  })

  it('"다른 데이터로 재분석" 클릭 시 Step 1로 이동한다', async () => {
    render(<ResultsActionStep results={mockResults} />)

    const reanalyzeButton = screen.getByText('다른 데이터로 재분석')
    fireEvent.click(reanalyzeButton)

    await waitFor(() => {
      const state = useSmartFlowStore.getState()
      expect(state.currentStep).toBe(1)
    })
  })

  it('"다른 데이터로 재분석" 클릭 시 데이터가 초기화된다', async () => {
    render(<ResultsActionStep results={mockResults} />)

    const reanalyzeButton = screen.getByText('다른 데이터로 재분석')
    fireEvent.click(reanalyzeButton)

    await waitFor(() => {
      const state = useSmartFlowStore.getState()
      expect(state.uploadedData).toBeNull()
      expect(state.validationResults).toBeNull()
      expect(state.results).toBeNull()
    })
  })

  it('"다른 데이터로 재분석" 클릭 시 selectedMethod는 유지된다', async () => {
    render(<ResultsActionStep results={mockResults} />)

    const reanalyzeButton = screen.getByText('다른 데이터로 재분석')
    fireEvent.click(reanalyzeButton)

    await waitFor(() => {
      const state = useSmartFlowStore.getState()
      expect(state.selectedMethod?.id).toBe('t-test')
      expect(state.selectedMethod?.name).toBe('t-검정')
    })
  })

  // ===== 시나리오 3: 새 분석 시작과의 차이점 =====
  it('"새 분석 시작"은 모든 상태를 초기화한다 (재분석 아님)', async () => {
    const { startNewAnalysis } = await import('@/lib/services/data-management')

    render(<ResultsActionStep results={mockResults} />)

    const newAnalysisButton = screen.getByText('새 분석 시작')
    fireEvent.click(newAnalysisButton)

    await waitFor(() => {
      expect(startNewAnalysis).toHaveBeenCalled()
    })
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
    // 재분석 모드에서는 변수 매핑이 이미 있으므로 Step 4로 직접 이동
    store.setCurrentStep(4)

    const finalState = useSmartFlowStore.getState()
    expect(finalState.currentStep).toBe(4)
    expect(finalState.uploadedData?.length).toBe(3)
    expect(finalState.selectedMethod?.id).toBe('anova')
  })
})
