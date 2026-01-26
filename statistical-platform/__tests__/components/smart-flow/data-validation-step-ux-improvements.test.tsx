/**
 * DataValidationStep UX 개선 테스트
 *
 * 테스트 범위:
 * - 표본 크기 메시지
 * - 분석 추천 기능
 *
 * Note: UI 구조 변경으로 일부 테스트 삭제됨 (2026-01-26)
 * - Sticky 파일명, GuidanceCard 관련 테스트는 E2E 테스트로 대체
 */

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// Mock useSmartFlowStore
vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    uploadedFile: { name: 'test-data.csv' },
    uploadedFileName: 'test-data.csv',
    setDataCharacteristics: vi.fn(),
    setAssumptionResults: vi.fn()
  })
}))

describe('DataValidationStep UX Improvements', () => {

  const mockData: DataRow[] = Array.from({ length: 50 }, (_, i) => ({
    id: i + 1,
    age: 20 + i,
    score: 50 + Math.random() * 50,
    group: i % 2 === 0 ? 'A' : 'B'
  }))

  const mockValidationResults: ValidationResults = {
    isValid: true,
    totalRows: 50,
    columnCount: 4,
    missingValues: 0,
    dataType: 'csv',
    variables: ['age', 'weight', 'score', 'group'],
    errors: [],
    warnings: [],
    columnStats: [
      {
        name: 'age',
        type: 'numeric',
        numericCount: 100,
        textCount: 0,
        uniqueValues: 50,
        missingCount: 0,
        mean: 44.5,
        std: 14.43,
        min: 20,
        max: 69
      },
      {
        name: 'score',
        type: 'numeric',
        numericCount: 100,
        textCount: 0,
        uniqueValues: 50,
        missingCount: 0,
        mean: 75,
        std: 14.43,
        min: 50,
        max: 100
      },
      {
        name: 'group',
        type: 'categorical',
        numericCount: 0,
        textCount: 100,
        uniqueValues: 2,
        missingCount: 0
      }
    ]
  }

  describe('표본 크기 중립 메시지', () => {
    it('30개 이상이면 "대표본"으로 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={{ ...mockValidationResults, totalRows: 50 }}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText('대표본')).toBeInTheDocument()
      expect(screen.queryByText('충분')).not.toBeInTheDocument()
    })

    it('30개 미만이면 "소표본"으로 표시되어야 함', () => {
      const smallData = mockData.slice(0, 20)

      render(
        <DataValidationStep
          validationResults={{ ...mockValidationResults, totalRows: 20 }}
          data={smallData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText('소표본')).toBeInTheDocument()
      expect(screen.queryByText('충분')).not.toBeInTheDocument()
    })

    it('Badge는 outline variant를 사용해야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      const badge = screen.getByText('대표본')
      expect(badge).toHaveClass('text-foreground')
    })
  })

  describe('기술통계 추천 제거', () => {
    it('추천 분석 목록에 기술통계가 없어야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      const analysisCard = screen.getByText('💡 이 데이터로 할 수 있는 분석')
      expect(analysisCard).toBeInTheDocument()

      expect(screen.queryByText(/기술통계/)).not.toBeInTheDocument()
      expect(screen.queryByText(/평균, 표준편차, 분포/)).not.toBeInTheDocument()
    })

    it('다른 분석 추천은 정상 표시되어야 함', () => {
      render(
        <DataValidationStep
          validationResults={mockValidationResults}
          data={mockData}
          onNext={vi.fn()}
        />
      )

      expect(screen.getByText(/2집단 비교/)).toBeInTheDocument()
      expect(screen.getByText(/상관분석/)).toBeInTheDocument()
      expect(screen.getByText(/회귀분석/)).toBeInTheDocument()
    })
  })
})
