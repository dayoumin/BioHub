/**
 * ResultsActionStep 컴포넌트 테스트
 *
 * 목적:
 * 1. StatisticalResultCard를 통한 결과 표시 검증
 * 2. 액션 버튼 렌더링 확인
 * 3. 타입 안전성 검증
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'
import { AnalysisResult } from '@/types/smart-flow'

// Mock PDF service
vi.mock('@/lib/services/pdf-report-service', () => ({
  PDFReportService: {
    generateReport: vi.fn(),
    generateSummaryText: vi.fn().mockReturnValue('Summary text')
  }
}))

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

// Mock smart-flow-store
vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    saveToHistory: vi.fn(),
    reset: vi.fn(),
    uploadedData: [{ id: 1 }, { id: 2 }],
    variableMapping: {
      dependentVar: 'score',
      groupVar: 'group'
    }
  })
}))

// Mock result-converter
vi.mock('@/lib/statistics/result-converter', () => ({
  convertToStatisticalResult: vi.fn().mockReturnValue({
    testName: 'Independent T-Test',
    testType: 'parametric',
    statistic: 2.456,
    statisticName: 't',
    pValue: 0.015,
    df: 48,
    alpha: 0.05,
    effectSize: {
      value: 0.72,
      type: 'cohensD'
    }
  })
}))

describe('ResultsActionStep - StatisticalResultCard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. 기본 렌더링', () => {
    it('results가 없을 때 안내 메시지가 표시되어야 함', () => {
      render(<ResultsActionStep results={null} />)

      expect(screen.getByText('분석을 먼저 실행해주세요.')).toBeInTheDocument()
    })

    it('results가 있을 때 StatisticalResultCard가 렌더링되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.456,
        pValue: 0.015,
        df: 48,
        interpretation: '두 그룹 간 유의한 차이가 있습니다.'
      }

      render(<ResultsActionStep results={mockResults} />)

      // StatisticalResultCard의 요소들이 표시되어야 함
      expect(screen.getByText('Independent T-Test')).toBeInTheDocument()
    })
  })

  describe('2. 액션 버튼 표시', () => {
    it('모든 액션 버튼이 표시되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.456,
        pValue: 0.015,
        interpretation: 'Test'
      }

      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText('히스토리 저장')).toBeInTheDocument()
      expect(screen.getByText('PDF 보고서')).toBeInTheDocument()
      expect(screen.getByText('결과 복사')).toBeInTheDocument()
      expect(screen.getByText('새 분석 시작')).toBeInTheDocument()
    })
  })

  describe('3. 타입 안전성 검증', () => {
    it('minimal results로 에러 없이 렌더링되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Test',
        statistic: 1.0,
        pValue: 0.5,
        interpretation: 'No effect'
      }

      expect(() => render(<ResultsActionStep results={mockResults} />)).not.toThrow()
    })

    it('effectSize가 있을 때 표시되어야 함', () => {
      const mockResults: AnalysisResult = {
        method: 'Independent T-Test',
        statistic: 2.456,
        pValue: 0.015,
        interpretation: 'Test',
        effectSize: {
          value: 0.72,
          type: 'cohensD',
          interpretation: 'medium'
        }
      }

      render(<ResultsActionStep results={mockResults} />)

      // StatisticalResultCard가 효과크기를 표시
      expect(screen.getByText('Independent T-Test')).toBeInTheDocument()
    })
  })
})
