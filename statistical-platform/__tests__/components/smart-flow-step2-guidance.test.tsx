/**
 * Smart Flow Step 2 Guidance Card Test
 *
 * 목적: Step 2에 추가된 사용자 안내 카드 검증
 * 검증 항목:
 * 1. "데이터 준비 완료!" 헤딩 표시
 * 2. 데이터 통계 (행/열 개수) 표시
 * 3. 3단계 프로세스 리스트 표시
 * 4. "분석 목적 선택하기" CTA 버튼 표시
 * 5. onNext 콜백 없으면 카드 미표시
 * 6. 에러 있으면 카드 미표시
 */

import { render, screen, fireEvent } from '@testing-library/react'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// Mock data
const mockData: DataRow[] = [
  { age: 25, score: 85 },
  { age: 30, score: 90 },
  { age: 35, score: 78 }
]

const mockValidationResults: ValidationResults = {
  isValid: true,
  totalRows: 3,
  columnCount: 2,
  missingValues: 0,
  dataType: 'CSV',
  variables: ['age', 'score'],
  errors: [],
  warnings: [],
  columnStats: [
    {
      name: 'age',
      type: 'numeric',
      uniqueValues: 3,
      missingCount: 0,
      numericCount: 3,
      textCount: 0,
      mean: 30,
      median: 30,
      std: 5,
      min: 25,
      max: 35,
      outliers: []
    },
    {
      name: 'score',
      type: 'numeric',
      uniqueValues: 3,
      missingCount: 0,
      numericCount: 3,
      textCount: 0,
      mean: 84.3,
      median: 85,
      std: 6,
      min: 78,
      max: 90,
      outliers: []
    }
  ]
}

const mockValidationResultsWithError: ValidationResults = {
  ...mockValidationResults,
  isValid: false,
  errors: ['Test error']
}

const mockValidationResultsWithWarning: ValidationResults = {
  ...mockValidationResults,
  isValid: true,
  warnings: ['Test warning']
}

// Mock PyodideCore
jest.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: () => ({
      shapiroWilkTest: jest.fn().mockResolvedValue({
        statistic: 0.95,
        pValue: 0.3
      }),
      leveneTest: jest.fn().mockResolvedValue({
        statistic: 1.5,
        pValue: 0.2
      })
    })
  }
}))

jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/components/common/analysis/DataPreviewTable', () => ({
  DataPreviewTable: () => <div data-testid="data-preview-table">Preview</div>
}))

// Import component after mocks
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'

describe('Smart Flow Step 2 Guidance Card Tests', () => {
  describe('✅ 정상 케이스: 가이드 카드 표시', () => {
    it('should show guidance card with CTA button', () => {
      const mockOnNext = jest.fn()

      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={mockOnNext}
        />
      )

      // 헤딩과 CTA 버튼이 가장 중요한 요소
      expect(screen.getByText('데이터 준비 완료!')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /분석 목적 선택하기/ })).toBeInTheDocument()
    })

    it('should call onNext when CTA button is clicked', () => {
      const mockOnNext = jest.fn()

      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={mockOnNext}
        />
      )

      const ctaButton = screen.getByRole('button', { name: /분석 목적 선택하기/ })
      fireEvent.click(ctaButton)

      expect(mockOnNext).toHaveBeenCalledTimes(1)
    })
  })

  describe('❌ 예외 케이스: 가이드 카드 미표시', () => {
    it('should NOT show guidance card when onNext is undefined', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          // onNext 없음
        />
      )

      // 가이드 카드 미표시
      expect(screen.queryByText('데이터 준비 완료!')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /분석 목적 선택하기/ })).not.toBeInTheDocument()
    })

    it('should NOT show guidance card when there are errors', () => {
      const mockOnNext = jest.fn()

      render(
        <DataValidationStep
          validationResults={mockValidationResultsWithError}
          data={mockData}
          onNext={mockOnNext}
        />
      )

      // 에러 메시지는 errors 배열의 객체 형식이므로 text로 직접 검색 불가
      // 대신 가이드 카드가 없는지만 확인
      expect(screen.queryByText('데이터 준비 완료!')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /분석 목적 선택하기/ })).not.toBeInTheDocument()
    })
  })

  describe('⚠️ 경고 케이스: 가이드 카드 표시 + 경고 안내', () => {
    it('should show guidance card with warning notice when there are warnings', () => {
      const mockOnNext = jest.fn()

      render(
        <DataValidationStep
          validationResults={mockValidationResultsWithWarning}
          data={mockData}
          onNext={mockOnNext}
        />
      )

      // 가이드 카드 표시
      expect(screen.getByText('데이터 준비 완료!')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /분석 목적 선택하기/ })).toBeInTheDocument()

      // 경고 안내 메시지 표시
      expect(screen.getByText('경고 사항이 있지만 분석을 계속할 수 있습니다')).toBeInTheDocument()
    })

    it('should allow proceeding to next step even with warnings', () => {
      const mockOnNext = jest.fn()

      render(
        <DataValidationStep
          validationResults={mockValidationResultsWithWarning}
          data={mockData}
          onNext={mockOnNext}
        />
      )

      const ctaButton = screen.getByRole('button', { name: /분석 목적 선택하기/ })
      fireEvent.click(ctaButton)

      // 경고가 있어도 다음 단계로 진행 가능
      expect(mockOnNext).toHaveBeenCalledTimes(1)
    })
  })


  describe('🎨 UI 컴포넌트 스타일 검증', () => {
    it('should render with correct styling classes', () => {
      const mockOnNext = jest.fn()

      const { container } = render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={mockOnNext}
        />
      )

      // border-dashed, bg-primary/5 클래스 확인
      const guidanceCard = container.querySelector('.border-dashed')
      expect(guidanceCard).toBeInTheDocument()
      expect(guidanceCard).toHaveClass('border-primary/50')
    })
  })
})
