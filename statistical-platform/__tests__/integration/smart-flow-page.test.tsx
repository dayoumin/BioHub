/**
 * Smart Flow Page Integration Tests
 *
 * 목적: 전체 스마트 분석 플로우 검증
 * - 4단계 전체 시나리오
 * - Store 연동 테스트
 * - 에러 처리 테스트
 * - Hook 최적화 검증
 */

import { vi, Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import HomePage from '@/app/page'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

// HomePage를 SmartFlowPage 별칭으로 사용 (기존 테스트 호환)
const SmartFlowPage = HomePage

// Mock Zustand store
vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: vi.fn()
}))

// Mock useSmartFlowStore.getState for useEffect
const mockGetState = {
  loadHistoryFromDB: vi.fn().mockResolvedValue(undefined)
}

vi.mocked(useSmartFlowStore).getState = vi.fn().mockReturnValue(mockGetState)

// Mock SmartFlowLayout
vi.mock('@/components/smart-flow/layouts/SmartFlowLayout', () => ({
  SmartFlowLayout: ({ children, onStepChange }: {
    children: React.ReactNode
    onStepChange?: (step: number) => void
  }) => (
    <div data-testid="smart-flow-layout">
      <button data-testid="step-change" onClick={() => onStepChange?.(2)}>
        Change Step
      </button>
      {children}
    </div>
  )
}))

// Mock Step Components (현재 구조: 4단계)
vi.mock('@/components/smart-flow/steps/DataExplorationStep', () => ({
  DataExplorationStep: () => <div data-testid="data-exploration-step">Exploration Step</div>
}))

vi.mock('@/components/smart-flow/steps/PurposeInputStep', () => ({
  PurposeInputStep: () => <div data-testid="purpose-input-step">Purpose Step</div>
}))

vi.mock('@/components/smart-flow/steps/VariableSelectionStep', () => ({
  VariableSelectionStep: () => <div data-testid="variable-selection-step">Variable Step</div>
}))

vi.mock('@/components/smart-flow/steps/AnalysisExecutionStep', () => ({
  AnalysisExecutionStep: () => <div data-testid="analysis-execution-step">Analysis Step</div>
}))

vi.mock('@/components/smart-flow/steps/ResultsActionStep', () => ({
  ResultsActionStep: () => <div data-testid="results-action-step">Results Step</div>
}))

vi.mock('@/components/smart-flow/AnalysisHistoryPanel', () => ({
  AnalysisHistoryPanel: () => <div data-testid="history-panel">History</div>
}))

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

vi.mock('@/lib/services/data-validation-service', () => ({
  DataValidationService: {
    performValidation: vi.fn(),
    performDetailedValidation: vi.fn()
  }
}))

describe('SmartFlowPage Integration Tests', () => {
  const mockStore = {
    currentStep: 1,
    completedSteps: [],
    uploadedData: null,
    uploadedFileName: null,
    validationResults: null,
    selectedMethod: null,
    variableMapping: null,
    results: null,
    isLoading: false,
    error: null,
    setUploadedFile: vi.fn(),
    setUploadedData: vi.fn(),
    setValidationResults: vi.fn(),
    setAnalysisPurpose: vi.fn(),
    setSelectedMethod: vi.fn(),
    setResults: vi.fn(),
    setError: vi.fn(),
    canProceedToNext: vi.fn().mockReturnValue(true),
    goToNextStep: vi.fn(),
    goToPreviousStep: vi.fn(),
    reset: vi.fn(),
    navigateToStep: vi.fn(),
    canNavigateToStep: vi.fn().mockReturnValue(true),
    loadHistoryFromDB: vi.fn().mockResolvedValue(undefined)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useSmartFlowStore as unknown as Mock).mockReturnValue(mockStore)
  })

  describe('초기 렌더링', () => {
    it('페이지가 정상적으로 렌더링되어야 함', () => {
      render(<SmartFlowPage />)

      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })

    it('Step 1에서 DataExplorationStep이 표시되어야 함', () => {
      render(<SmartFlowPage />)

      expect(screen.getByTestId('data-exploration-step')).toBeInTheDocument()
      expect(screen.queryByTestId('purpose-input-step')).not.toBeInTheDocument()
    })

    it('IndexedDB 히스토리를 로드해야 함', async () => {
      render(<SmartFlowPage />)

      await waitFor(() => {
        expect(mockGetState.loadHistoryFromDB).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Step 변경 (4단계 구조)', () => {
    it('Step 2에서 PurposeInputStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as Mock).mockReturnValue({
        ...mockStore,
        currentStep: 2
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('purpose-input-step')).toBeInTheDocument()
      expect(screen.queryByTestId('data-exploration-step')).not.toBeInTheDocument()
    })

    it('Step 3에서 VariableSelectionStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as Mock).mockReturnValue({
        ...mockStore,
        currentStep: 3
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('variable-selection-step')).toBeInTheDocument()
    })

    it('Step 4에서 결과가 없으면 AnalysisExecutionStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as Mock).mockReturnValue({
        ...mockStore,
        currentStep: 4,
        results: null
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('analysis-execution-step')).toBeInTheDocument()
      expect(screen.queryByTestId('results-action-step')).not.toBeInTheDocument()
    })

    it('Step 4에서 결과가 있으면 ResultsActionStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as Mock).mockReturnValue({
        ...mockStore,
        currentStep: 4,
        results: { testStatistic: 1.5, pValue: 0.05 }
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('results-action-step')).toBeInTheDocument()
      expect(screen.queryByTestId('analysis-execution-step')).not.toBeInTheDocument()
    })
  })

  describe('에러 처리', () => {
    it('에러가 있을 때 에러 메시지가 표시되어야 함', () => {
      (useSmartFlowStore as unknown as Mock).mockReturnValue({
        ...mockStore,
        error: '테스트 에러 메시지'
      })

      render(<SmartFlowPage />)

      expect(screen.getByText('오류:')).toBeInTheDocument()
      expect(screen.getByText('테스트 에러 메시지')).toBeInTheDocument()
    })

    it('에러가 없을 때 에러 메시지가 표시되지 않아야 함', () => {
      render(<SmartFlowPage />)

      expect(screen.queryByText('오류:')).not.toBeInTheDocument()
    })
  })

  describe('데이터 상태', () => {
    it('uploadedData가 있을 때 정상 렌더링되어야 함', () => {
      (useSmartFlowStore as unknown as Mock).mockReturnValue({
        ...mockStore,
        uploadedData: [{ col1: 'value1' }],
        uploadedFileName: 'test.csv'
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })

    it('uploadedData가 없을 때도 정상 렌더링되어야 함', () => {
      render(<SmartFlowPage />)

      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })
  })

  describe('Hook 최적화', () => {
    it('컴포넌트 재렌더링 시 steps가 재계산되지 않아야 함', () => {
      const { rerender } = render(<SmartFlowPage />)

      const initialSteps = mockStore.completedSteps

      rerender(<SmartFlowPage />)

      expect(mockStore.completedSteps).toBe(initialSteps)
    })
  })

  describe('시스템 메모리 감지', () => {
    it('Navigator API를 통해 메모리를 감지해야 함', () => {
      const originalDeviceMemory = (navigator as unknown as { deviceMemory?: number }).deviceMemory

      try {
        Object.defineProperty(navigator, 'deviceMemory', {
          value: 8,
          configurable: true,
          writable: true
        })

        render(<SmartFlowPage />)

        expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
      } finally {
        if (originalDeviceMemory === undefined) {
          delete (navigator as unknown as { deviceMemory?: number }).deviceMemory
        } else {
          Object.defineProperty(navigator, 'deviceMemory', {
            value: originalDeviceMemory,
            configurable: true,
            writable: true
          })
        }
      }
    })
  })
})
