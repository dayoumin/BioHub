import React from 'react'
import { render, screen } from '@testing-library/react'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import type { ValidationResults } from '@/types/smart-flow'

// Mock zustand store
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    setDataCharacteristics: jest.fn(),
    setAssumptionResults: jest.fn()
  })
}))

describe('DataValidationStep - 분석 추천 개선', () => {
  const mockOnNext = jest.fn()

  const createValidationResults = (
    numericCount: number,
    categoricalCount: number,
    groupCount?: number
  ): ValidationResults => ({
    isValid: true,
    totalRows: 100,
    columnCount: numericCount + categoricalCount,
    errors: [],
    warnings: [],
    columnStats: [
      ...Array.from({ length: numericCount }, (_, i) => ({
        name: `numeric_${i + 1}`,
        type: 'numeric' as const,
        uniqueValues: 50,
        missingCount: 0,
        missingPercent: 0
      })),
      ...Array.from({ length: categoricalCount }, (_, i) => ({
        name: `categorical_${i + 1}`,
        type: 'categorical' as const,
        uniqueValues: groupCount || 3,
        missingCount: 0,
        missingPercent: 0
      }))
    ]
  })

  const mockData = Array.from({ length: 100 }, (_, i) => ({
    numeric_1: i,
    categorical_1: i % 2 === 0 ? 'A' : 'B'
  }))

  describe('분석 추천 카드', () => {
    it('기술통계는 항상 추천되어야 함', () => {
      const results = createValidationResults(1, 0)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.getByText('💡 이 데이터로 할 수 있는 분석')).toBeInTheDocument()
      expect(screen.getByText(/기술통계/)).toBeInTheDocument()
    })

    it('2집단 비교 분석이 추천되어야 함 (범주형 1개, 연속형 1개, 그룹 2개)', () => {
      const results = createValidationResults(1, 1, 2)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.getByText(/2집단 비교/)).toBeInTheDocument()
      expect(screen.getByText(/t-검정, Mann-Whitney/)).toBeInTheDocument()
    })

    it('다집단 비교 분석이 추천되어야 함 (범주형 1개, 연속형 1개, 그룹 3개 이상)', () => {
      const results = createValidationResults(1, 1, 3)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.getByText(/다집단 비교/)).toBeInTheDocument()
      expect(screen.getByText(/ANOVA, Kruskal-Wallis/)).toBeInTheDocument()
    })

    it('상관분석이 추천되어야 함 (연속형 2개 이상)', () => {
      const results = createValidationResults(2, 0)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.getByText(/상관분석/)).toBeInTheDocument()
      expect(screen.getByText(/Pearson, Spearman/)).toBeInTheDocument()
    })

    it('회귀분석이 추천되어야 함 (연속형 2개 이상)', () => {
      const results = createValidationResults(2, 0)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.getByText(/회귀분석/)).toBeInTheDocument()
      expect(screen.getByText(/예측 모델/)).toBeInTheDocument()
    })

    it('카이제곱 검정이 추천되어야 함 (범주형 2개)', () => {
      const results = createValidationResults(0, 2)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.getByText(/카이제곱 검정/)).toBeInTheDocument()
      expect(screen.getByText(/범주형 연관성/)).toBeInTheDocument()
    })

    it('AI 추천 안내 메시지가 표시되어야 함', () => {
      const results = createValidationResults(2, 1)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(
        screen.getByText(/다음 단계에서 분석 목적을 선택하면 AI가 최적의 방법을 추천합니다/)
      ).toBeInTheDocument()
    })

    it('여러 분석이 동시에 추천되어야 함', () => {
      const results = createValidationResults(2, 2, 2)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      // 기술통계 + 2집단 비교 + 상관분석 + 회귀분석 + 카이제곱
      expect(screen.getByText(/기술통계/)).toBeInTheDocument()
      expect(screen.getByText(/2집단 비교/)).toBeInTheDocument()
      expect(screen.getByText(/상관분석/)).toBeInTheDocument()
      expect(screen.getByText(/회귀분석/)).toBeInTheDocument()
      expect(screen.getByText(/카이제곱 검정/)).toBeInTheDocument()
    })

    it('에러가 있으면 추천 카드가 표시되지 않아야 함', () => {
      const results: ValidationResults = {
        ...createValidationResults(2, 1),
        isValid: false,
        errors: ['테스트 에러']
      }
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.queryByText('💡 이 데이터로 할 수 있는 분석')).not.toBeInTheDocument()
    })
  })
})
