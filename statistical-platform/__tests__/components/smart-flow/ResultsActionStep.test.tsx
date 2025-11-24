/**
 * ResultsActionStep 컴포넌트 테스트
 *
 * 목적:
 * 1. nextActions 제거 후 렌더링 정상 작동 확인
 * 2. power와 requiredSampleSize 독립적 렌더링 검증
 * 3. 타입 안전성 검증
 */

import { render, screen } from '@testing-library/react'
import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { AnalysisResult } from '@/types/smart-flow'

// Mock Zustand store
jest.mock('@/lib/stores/smart-flow-store')

// Mock PDF service
jest.mock('@/lib/services/pdf-report-service', () => ({
  PDFReportService: {
    generateReport: jest.fn()
  }
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

describe('ResultsActionStep - Type Safety & Rendering', () => {
  const mockUseSmartFlowStore = useSmartFlowStore as jest.MockedFunction<typeof useSmartFlowStore>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. nextActions 제거 검증', () => {
    it('results가 없을 때 에러 없이 렌더링되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        results: null,
        uploadedData: null,
        validationResults: null,
        analysisConfig: null,
        addAnalysisToHistory: jest.fn()
      } as any)

      const { container } = render(<ResultsActionStep />)

      expect(screen.getByText('분석을 먼저 실행해주세요.')).toBeInTheDocument()
      expect(container.querySelector('[data-testid="next-actions"]')).not.toBeInTheDocument()
    })

    it('results가 있을 때 nextActions 관련 UI가 표시되지 않아야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.5,
        pValue: 0.015,
        df: 48,
        interpretation: '두 그룹 간 유의한 차이가 있습니다.'
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      const { container } = render(<ResultsActionStep />)

      // nextActions UI가 없어야 함
      expect(container.querySelector('[data-testid="next-actions"]')).not.toBeInTheDocument()
      expect(screen.queryByText(/다음 단계 추천/i)).not.toBeInTheDocument()
    })
  })

  describe('2. power와 requiredSampleSize 독립적 렌더링', () => {
    it('power만 있을 때 표시되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.5,
        pValue: 0.015,
        interpretation: 'Test',
        additional: {
          power: 0.85
        }
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      render(<ResultsActionStep />)

      expect(screen.getByText('⚡ 검정력 분석')).toBeInTheDocument()
      expect(screen.getByText('검정력')).toBeInTheDocument()
      expect(screen.getByText('85.0%')).toBeInTheDocument()
      expect(screen.queryByText('필요 표본 크기')).not.toBeInTheDocument()
    })

    it('requiredSampleSize만 있을 때 표시되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.5,
        pValue: 0.015,
        interpretation: 'Test',
        additional: {
          requiredSampleSize: 120
        }
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      render(<ResultsActionStep />)

      expect(screen.getByText('⚡ 검정력 분석')).toBeInTheDocument()
      expect(screen.getByText('필요 표본 크기')).toBeInTheDocument()
      expect(screen.getByText('120')).toBeInTheDocument()
      expect(screen.queryByText('검정력')).not.toBeInTheDocument()
    })

    it('power와 requiredSampleSize 둘 다 있을 때 모두 표시되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.5,
        pValue: 0.015,
        interpretation: 'Test',
        additional: {
          power: 0.85,
          requiredSampleSize: 120
        }
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      render(<ResultsActionStep />)

      expect(screen.getByText('⚡ 검정력 분석')).toBeInTheDocument()
      expect(screen.getByText('검정력')).toBeInTheDocument()
      expect(screen.getByText('85.0%')).toBeInTheDocument()
      expect(screen.getByText('필요 표본 크기')).toBeInTheDocument()
      expect(screen.getByText('120')).toBeInTheDocument()
    })

    it('power와 requiredSampleSize 둘 다 없을 때 검정력 분석 섹션이 표시되지 않아야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.5,
        pValue: 0.015,
        interpretation: 'Test',
        additional: {}
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      render(<ResultsActionStep />)

      expect(screen.queryByText('⚡ 검정력 분석')).not.toBeInTheDocument()
    })
  })

  describe('3. 타입 안전성 검증', () => {
    it('additional이 undefined일 때 에러 없이 렌더링되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.5,
        pValue: 0.015,
        interpretation: 'Test'
        // additional: undefined (명시적으로 없음)
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      expect(() => render(<ResultsActionStep />)).not.toThrow()
      expect(screen.queryByText('⚡ 검정력 분석')).not.toBeInTheDocument()
    })

    it('power가 0일 때도 표시되어야 함 (0 !== undefined)', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.5,
        pValue: 0.015,
        interpretation: 'Test',
        additional: {
          power: 0  // 0 is a valid value
        }
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      render(<ResultsActionStep />)

      expect(screen.getByText('⚡ 검정력 분석')).toBeInTheDocument()
      expect(screen.getByText('0.0%')).toBeInTheDocument()
    })

    it('requiredSampleSize가 0일 때도 표시되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.5,
        pValue: 0.015,
        interpretation: 'Test',
        additional: {
          requiredSampleSize: 0  // Edge case
        }
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      render(<ResultsActionStep />)

      expect(screen.getByText('⚡ 검정력 분석')).toBeInTheDocument()
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('4. 기본 결과 표시', () => {
    it('기본 통계 결과가 표시되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.456,
        pValue: 0.015,
        df: 48,
        interpretation: '두 그룹 간 유의한 차이가 있습니다.'
      }

      mockUseSmartFlowStore.mockReturnValue({
        results: mockResults,
        uploadedData: [],
        validationResults: { isValid: true, totalRows: 50, columnCount: 3, missingValues: 0, dataType: 'numeric', variables: [], errors: [], warnings: [] },
        analysisConfig: { purpose: 'compare', selectedMethod: null },
        addAnalysisToHistory: jest.fn()
      } as any)

      render(<ResultsActionStep />)

      expect(screen.getByText('Independent T-Test')).toBeInTheDocument()
      expect(screen.getByText(/2\.456/)).toBeInTheDocument()
      expect(screen.getByText(/0\.015/)).toBeInTheDocument()
      expect(screen.getByText(/48/)).toBeInTheDocument()
      expect(screen.getByText('두 그룹 간 유의한 차이가 있습니다.')).toBeInTheDocument()
    })
  })
})
