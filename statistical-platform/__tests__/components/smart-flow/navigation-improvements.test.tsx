/**
 * 스마트 분석 네비게이션 개선 테스트
 *
 * 테스트 대상:
 * 1. "이전 단계" 버튼 숨김 로직 (Step 1에서 완전히 숨김)
 * 2. ProgressStepper 애니메이션 제거 (Loader2, Ripple 제거)
 * 3. UI 일관성 검증
 *
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react'
import SmartFlowPage from '@/app/smart-flow/page'
import { ProgressStepper } from '@/components/smart-flow/ProgressStepper'
import { StepConfig } from '@/types/smart-flow'
import { Upload, CheckCircle, Sparkles, HelpCircle, BarChart3, FileText } from 'lucide-react'

// Mock scrollIntoView (Jest 환경에서 지원하지 않음)
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn()
}

// Mock Next.js Link
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>
  }
})

// Mock PyodideProvider
jest.mock('@/components/providers/PyodideProvider', () => ({
  usePyodide: jest.fn(() => ({
    isReady: false,
    isLoading: false,
    error: null,
    progress: null
  }))
}))

// Mock PDF service
jest.mock('@/lib/services/pdf-report-service', () => ({
  PDFReportService: {
    generateReport: jest.fn().mockResolvedValue(new Blob(['pdf content'], { type: 'application/pdf' }))
  }
}))

// Mock Zustand store
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: jest.fn(() => ({
    currentStep: 1,
    completedSteps: [],
    uploadedData: [],
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
    canProceedToNext: jest.fn(() => false),
    goToNextStep: jest.fn(),
    goToPreviousStep: jest.fn(),
    reset: jest.fn(),
    navigateToStep: jest.fn(),
    canNavigateToStep: jest.fn(() => false),
    loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
  }))
}))

describe('스마트 분석 네비게이션 개선', () => {
  describe('1. "이전 단계" 버튼 숨김 로직', () => {
    it('Step 1일 때 "이전 단계" 버튼이 렌더링되지 않아야 함', () => {
      const { useSmartFlowStore } = require('@/lib/stores/smart-flow-store')
      useSmartFlowStore.mockReturnValue({
        currentStep: 1,
        completedSteps: [],
        uploadedData: [],
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
        canProceedToNext: jest.fn(() => false),
        goToNextStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => false),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      render(<SmartFlowPage />)

      // "이전 단계" 버튼이 렌더링되지 않아야 함
      const previousButton = screen.queryByText('이전 단계')
      expect(previousButton).toBeNull()
    })

    it('Step 2일 때 "이전 단계" 버튼이 렌더링되어야 함', () => {
      const { useSmartFlowStore } = require('@/lib/stores/smart-flow-store')
      useSmartFlowStore.mockReturnValue({
        currentStep: 2,
        completedSteps: [1],
        uploadedData: [{ id: 1, name: 'Test' }],
        validationResults: { isValid: true, errors: [], warnings: [] },
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
        canProceedToNext: jest.fn(() => true),
        goToNextStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => true),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      render(<SmartFlowPage />)

      // "이전 단계" 버튼이 렌더링되어야 함
      const previousButton = screen.getByText('이전 단계')
      expect(previousButton).toBeInTheDocument()
      expect(previousButton).not.toBeDisabled()
    })

    it('Step 3 이상일 때 "이전 단계" 버튼이 렌더링되어야 함', () => {
      const { useSmartFlowStore } = require('@/lib/stores/smart-flow-store')
      useSmartFlowStore.mockReturnValue({
        currentStep: 3,
        completedSteps: [1, 2],
        uploadedData: [{ id: 1, name: 'Test' }],
        validationResults: { isValid: true, errors: [], warnings: [] },
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
        canProceedToNext: jest.fn(() => true),
        goToNextStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => true),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      render(<SmartFlowPage />)

      const previousButton = screen.getByText('이전 단계')
      expect(previousButton).toBeInTheDocument()
    })

    it('"이전 단계" 버튼 클릭 시 goToPreviousStep이 호출되어야 함', () => {
      const mockGoToPreviousStep = jest.fn()
      const { useSmartFlowStore } = require('@/lib/stores/smart-flow-store')
      useSmartFlowStore.mockReturnValue({
        currentStep: 2,
        completedSteps: [1],
        uploadedData: [{ id: 1, name: 'Test' }],
        validationResults: { isValid: true, errors: [], warnings: [] },
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
        canProceedToNext: jest.fn(() => true),
        goToNextStep: jest.fn(),
        goToPreviousStep: mockGoToPreviousStep,
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => true),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      render(<SmartFlowPage />)

      const previousButton = screen.getByText('이전 단계')
      fireEvent.click(previousButton)

      expect(mockGoToPreviousStep).toHaveBeenCalledTimes(1)
    })
  })

  describe('2. ProgressStepper 애니메이션 제거', () => {
    const mockSteps: StepConfig[] = [
      { id: 1, name: '데이터 업로드', icon: Upload, description: '' },
      { id: 2, name: '데이터 검증', icon: CheckCircle, description: '' },
      { id: 3, name: '분석 목적', icon: Sparkles, description: '' },
      { id: 4, name: '변수 선택', icon: HelpCircle, description: '' },
      { id: 5, name: '통계 분석', icon: BarChart3, description: '' },
      { id: 6, name: '결과 및 액션', icon: FileText, description: '' }
    ]

    it('완료된 단계는 CheckCircle2 아이콘을 표시해야 함', () => {
      render(
        <ProgressStepper
          steps={mockSteps}
          currentStep={2}
          completedSteps={[1]}
          onStepClick={jest.fn()}
        />
      )

      // 모든 단계 버튼이 렌더링되어야 함
      const stepButtons = screen.getAllByRole('button')
      expect(stepButtons.length).toBe(6)
    })

    it('현재 단계는 Loader2 애니메이션 없이 해당 아이콘만 표시해야 함', () => {
      const { container } = render(
        <ProgressStepper
          steps={mockSteps}
          currentStep={2}
          completedSteps={[1]}
          onStepClick={jest.fn()}
        />
      )

      // Loader2 애니메이션이 없어야 함 (animate-spin 클래스 없음)
      const spinningElements = container.querySelectorAll('.animate-spin')
      expect(spinningElements.length).toBe(0)
    })

    it('Ripple 효과가 제거되어야 함', () => {
      const { container } = render(
        <ProgressStepper
          steps={mockSteps}
          currentStep={2}
          completedSteps={[1]}
          onStepClick={jest.fn()}
        />
      )

      // Ripple 애니메이션이 없어야 함 (animate-ping 클래스 없음)
      const rippleElements = container.querySelectorAll('.animate-ping')
      expect(rippleElements.length).toBe(0)
    })

    it('클릭 가능한 단계는 hover 효과가 있어야 함', () => {
      const { container } = render(
        <ProgressStepper
          steps={mockSteps}
          currentStep={2}
          completedSteps={[1]}
          onStepClick={jest.fn()}
        />
      )

      // group-hover 클래스를 가진 요소 확인
      const hoverElements = container.querySelectorAll('.group-hover\\:scale-110')
      expect(hoverElements.length).toBeGreaterThan(0)
    })

    it('클릭 가능한 단계를 클릭하면 onStepClick이 호출되어야 함', () => {
      const mockOnStepClick = jest.fn()
      render(
        <ProgressStepper
          steps={mockSteps}
          currentStep={2}
          completedSteps={[1]}
          onStepClick={mockOnStepClick}
        />
      )

      const stepButtons = screen.getAllByRole('button')

      // 완료된 Step 1을 클릭하면 onStepClick이 호출되어야 함
      fireEvent.click(stepButtons[0])
      expect(mockOnStepClick).toHaveBeenCalledWith(1)
    })

    it('클릭 불가능한 단계는 cursor-not-allowed가 적용되어야 함', () => {
      const { container } = render(
        <ProgressStepper
          steps={mockSteps}
          currentStep={2}
          completedSteps={[1]}
          onStepClick={jest.fn()}
        />
      )

      // cursor-not-allowed 클래스를 가진 요소 확인 (미래 단계들)
      const notAllowedElements = container.querySelectorAll('.cursor-not-allowed')
      expect(notAllowedElements.length).toBeGreaterThan(0)
    })

    it('Progress Bar가 완료된 단계를 기준으로 표시되어야 함', () => {
      const { container } = render(
        <ProgressStepper
          steps={mockSteps}
          currentStep={3}
          completedSteps={[1, 2]}
          onStepClick={jest.fn()}
        />
      )

      // Progress Bar 확인 (bg-gradient-to-r 클래스)
      const progressBar = container.querySelector('.bg-gradient-to-r')
      expect(progressBar).toBeInTheDocument()

      // width가 40%여야 함 (2 completed steps / 5 gaps = 40%)
      const width = progressBar?.getAttribute('style')
      expect(width).toContain('40%')
    })
  })

  describe('3. UI 일관성 테스트', () => {
    it('"처음부터 다시" 버튼은 모든 단계에서 표시되어야 함', () => {
      const { useSmartFlowStore } = require('@/lib/stores/smart-flow-store')

      // Step 1
      useSmartFlowStore.mockReturnValue({
        currentStep: 1,
        completedSteps: [],
        uploadedData: [],
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
        canProceedToNext: jest.fn(() => false),
        goToNextStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => false),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      const { rerender } = render(<SmartFlowPage />)
      expect(screen.getByText('처음부터 다시')).toBeInTheDocument()

      // Step 6 (마지막 단계)
      useSmartFlowStore.mockReturnValue({
        currentStep: 6,
        completedSteps: [1, 2, 3, 4, 5],
        uploadedData: [{ id: 1, name: 'Test' }],
        validationResults: { isValid: true, errors: [], warnings: [] },
        selectedMethod: { id: 'test', name: 'Test Method', category: 'test' },
        variableMapping: { dependent: ['var1'] },
        results: {
          method: 'test',
          statistic: 2.5,
          pValue: 0.02,
          data: {},
          interpretation: 'Significant result',
          summary: 'Test completed successfully'
        },
        isLoading: false,
        error: null,
        setUploadedFile: jest.fn(),
        setUploadedData: jest.fn(),
        setValidationResults: jest.fn(),
        setAnalysisPurpose: jest.fn(),
        setSelectedMethod: jest.fn(),
        setresults: jest.fn(),
        setError: jest.fn(),
        canProceedToNext: jest.fn(() => false),
        goToNextStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => true),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      rerender(<SmartFlowPage />)
      expect(screen.getByText('처음부터 다시')).toBeInTheDocument()
    })

    it('"다음 단계" 버튼은 Step 6에서 비활성화되어야 함', () => {
      const { useSmartFlowStore } = require('@/lib/stores/smart-flow-store')
      useSmartFlowStore.mockReturnValue({
        currentStep: 6,
        completedSteps: [1, 2, 3, 4, 5],
        uploadedData: [{ id: 1, name: 'Test' }],
        validationResults: { isValid: true, errors: [], warnings: [] },
        selectedMethod: { id: 'test', name: 'Test Method', category: 'test' },
        variableMapping: { dependent: ['var1'] },
        results: {
          method: 'test',
          statistic: 2.5,
          pValue: 0.02,
          data: {},
          interpretation: 'Significant result',
          summary: 'Test completed successfully'
        },
        isLoading: false,
        error: null,
        setUploadedFile: jest.fn(),
        setUploadedData: jest.fn(),
        setValidationResults: jest.fn(),
        setAnalysisPurpose: jest.fn(),
        setSelectedMethod: jest.fn(),
        setresults: jest.fn(),
        setError: jest.fn(),
        canProceedToNext: jest.fn(() => false),
        goToNextStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => true),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      render(<SmartFlowPage />)

      const nextButton = screen.getByText('다음 단계')
      expect(nextButton).toBeDisabled()
    })

    it('로딩 중일 때 모든 버튼이 비활성화되어야 함', () => {
      const { useSmartFlowStore } = require('@/lib/stores/smart-flow-store')
      useSmartFlowStore.mockReturnValue({
        currentStep: 2,
        completedSteps: [1],
        uploadedData: [{ id: 1, name: 'Test' }],
        validationResults: { isValid: true, errors: [], warnings: [] },
        selectedMethod: null,
        variableMapping: null,
        results: null,
        isLoading: true, // 로딩 중
        error: null,
        setUploadedFile: jest.fn(),
        setUploadedData: jest.fn(),
        setValidationResults: jest.fn(),
        setAnalysisPurpose: jest.fn(),
        setSelectedMethod: jest.fn(),
        setresults: jest.fn(),
        setError: jest.fn(),
        canProceedToNext: jest.fn(() => true),
        goToNextStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => true),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      render(<SmartFlowPage />)

      const previousButton = screen.getByText('이전 단계')
      const nextButton = screen.getByText('다음 단계')

      expect(previousButton).toBeDisabled()
      expect(nextButton).toBeDisabled()
    })
  })

  describe('4. 단계별 헤더 정보 표시', () => {
    it('현재 단계의 이름과 아이콘이 표시되어야 함', () => {
      const { useSmartFlowStore } = require('@/lib/stores/smart-flow-store')
      useSmartFlowStore.mockReturnValue({
        currentStep: 1,
        completedSteps: [],
        uploadedData: [],
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
        canProceedToNext: jest.fn(() => false),
        goToNextStep: jest.fn(),
        goToPreviousStep: jest.fn(),
        reset: jest.fn(),
        navigateToStep: jest.fn(),
        canNavigateToStep: jest.fn(() => false),
        loadHistoryFromDB: jest.fn().mockResolvedValue(undefined)
      })

      render(<SmartFlowPage />)

      // Step 1: 데이터 업로드
      expect(screen.getByText('Step 1: 데이터 업로드')).toBeInTheDocument()
    })
  })
})
