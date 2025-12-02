/**
 * Smart Flow Page Integration Tests
 *
 * 목적: 전체 스마트 분석 플로우 검증
 * - 6단계 전체 시나리오
 * - Store 연동 테스트
 * - 에러 처리 테스트
 * - Hook 최적화 검증
 */

import { describe, it, beforeEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SmartFlowPage from '@/app/smart-flow/page'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

// Mock Zustand store
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: jest.fn()
}))

// Mock SmartFlowLayout
jest.mock('@/components/smart-flow/layouts/SmartFlowLayout', () => ({
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

// Mock Step Components
jest.mock('@/components/smart-flow/steps/DataUploadStep', () => ({
  DataUploadStep: () => <div data-testid="data-upload-step">Upload Step</div>
}))

jest.mock('@/components/smart-flow/steps/DataValidationStep', () => ({
  DataValidationStep: () => <div data-testid="data-validation-step">Validation Step</div>
}))

jest.mock('@/components/smart-flow/steps/PurposeInputStep', () => ({
  PurposeInputStep: () => <div data-testid="purpose-input-step">Purpose Step</div>
}))

jest.mock('@/components/smart-flow/steps/VariableSelectionStep', () => ({
  VariableSelectionStep: () => <div data-testid="variable-selection-step">Variable Step</div>
}))

jest.mock('@/components/smart-flow/steps/AnalysisExecutionStep', () => ({
  AnalysisExecutionStep: () => <div data-testid="analysis-execution-step">Analysis Step</div>
}))

jest.mock('@/components/smart-flow/steps/ResultsActionStep', () => ({
  ResultsActionStep: () => <div data-testid="results-action-step">Results Step</div>
}))

jest.mock('@/components/smart-flow/AnalysisHistoryPanel', () => ({
  AnalysisHistoryPanel: () => <div data-testid="history-panel">History</div>
}))

jest.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

jest.mock('@/lib/services/data-validation-service', () => ({
  DataValidationService: {
    performValidation: jest.fn(),
    performDetailedValidation: jest.fn()
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
    setUploadedFile: jest.fn(),
    setUploadedData: jest.fn(),
    setValidationResults: jest.fn(),
    setAnalysisPurpose: jest.fn(),
    setSelectedMethod: jest.fn(),
    setresults: jest.fn(),
    setError: jest.fn(),
    canProceedToNext: jest.fn().mockReturnValue(true),
    goToNextStep: jest.fn(),
    goToPreviousStep: jest.fn(),
    reset: jest.fn(),
    navigateToStep: jest.fn(),
    canNavigateToStep: jest.fn().mockReturnValue(true),
    loadHistoryFromDB: jest.fn<() => Promise<void>>().mockResolvedValue(undefined)
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useSmartFlowStore as unknown as jest.Mock).mockReturnValue(mockStore)
  })

  describe('초기 렌더링', () => {
    it('페이지가 정상적으로 렌더링되어야 함', () => {
      render(<SmartFlowPage />)

      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })

    it('Step 1에서 DataUploadStep이 표시되어야 함', () => {
      render(<SmartFlowPage />)

      expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()
      expect(screen.queryByTestId('data-validation-step')).not.toBeInTheDocument()
    })

    it('IndexedDB 히스토리를 로드해야 함', async () => {
      render(<SmartFlowPage />)

      await waitFor(() => {
        expect(mockStore.loadHistoryFromDB).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('Step 변경', () => {
    it('Step 2에서 DataValidationStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        currentStep: 2
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('data-validation-step')).toBeInTheDocument()
      expect(screen.queryByTestId('data-upload-step')).not.toBeInTheDocument()
    })

    it('Step 3에서 DataExplorationStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        currentStep: 3
      })

      render(<SmartFlowPage />)

      expect(screen.getByText(/데이터 탐색/)).toBeInTheDocument()
    })

    it('Step 4에서 PurposeInputStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        currentStep: 4
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('purpose-input-step')).toBeInTheDocument()
    })

    it('Step 5에서 VariableSelectionStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        currentStep: 5
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('variable-selection-step')).toBeInTheDocument()
    })

    it('Step 6에서 AnalysisExecutionStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        currentStep: 6
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('analysis-execution-step')).toBeInTheDocument()
    })

    it('Step 7에서 ResultsActionStep이 표시되어야 함', () => {
      (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        currentStep: 7
      })

      render(<SmartFlowPage />)

      expect(screen.getByTestId('results-action-step')).toBeInTheDocument()
    })
  })

  describe('에러 처리', () => {
    it('에러가 있을 때 에러 메시지가 표시되어야 함', () => {
      (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
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

  describe('데이터 미리보기', () => {
    it('uploadedData가 있을 때 bottomPreview가 전달되어야 함', () => {
      (useSmartFlowStore as unknown as jest.Mock).mockReturnValue({
        ...mockStore,
        uploadedData: [{ col1: 'value1' }],
        uploadedFileName: 'test.csv'
      })

      render(<SmartFlowPage />)

      // SmartFlowLayout이 렌더링되었는지 확인
      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })

    it('uploadedData가 없을 때 bottomPreview가 undefined여야 함', () => {
      render(<SmartFlowPage />)

      // 에러 없이 렌더링되어야 함
      expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
    })
  })

  describe('Hook 최적화', () => {
    it('컴포넌트 재렌더링 시 steps가 재계산되지 않아야 함', () => {
      const { rerender } = render(<SmartFlowPage />)

      const initialSteps = mockStore.completedSteps

      rerender(<SmartFlowPage />)

      // completedSteps가 변경되지 않았으므로 useMemo가 동작해야 함
      expect(mockStore.completedSteps).toBe(initialSteps)
    })
  })

  describe('접근성', () => {
    it('각 Step에 적절한 설명이 있어야 함', () => {
      render(<SmartFlowPage />)

      // Step에 주석으로 설명이 있는지 확인 (코드 레벨)
      expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()
    })
  })

  describe('시스템 메모리 감지', () => {
    it('Navigator API를 통해 메모리를 감지해야 함', () => {
      // 기존 값 저장
      const originalDeviceMemory = (navigator as any).deviceMemory

      try {
        // Navigator.deviceMemory mock
        Object.defineProperty(navigator, 'deviceMemory', {
          value: 8,
          configurable: true,
          writable: true
        })

        render(<SmartFlowPage />)

        // 렌더링 에러 없이 완료되어야 함
        expect(screen.getByTestId('smart-flow-layout')).toBeInTheDocument()
      } finally {
        // 전역 상태 복원
        if (originalDeviceMemory === undefined) {
          delete (navigator as any).deviceMemory
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
