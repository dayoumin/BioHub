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
    missingValues: 0,
    dataType: 'mixed',
    variables: [
      ...Array.from({ length: numericCount }, (_, i) => `numeric_${i + 1}`),
      ...Array.from({ length: categoricalCount }, (_, i) => `categorical_${i + 1}`)
    ],
    errors: [],
    warnings: [],
    columnStats: [
      ...Array.from({ length: numericCount }, (_, i) => ({
        name: `numeric_${i + 1}`,
        type: 'numeric' as const,
        uniqueValues: 50,
        numericCount: 100,
        textCount: 0,
        missingCount: 0
      })),
      ...Array.from({ length: categoricalCount }, (_, i) => ({
        name: `categorical_${i + 1}`,
        type: 'categorical' as const,
        uniqueValues: groupCount || 3,
        numericCount: 0,
        textCount: 100,
        missingCount: 0
      }))
    ]
  })

  const mockData = Array.from({ length: 100 }, (_, i) => ({
    numeric_1: i,
    categorical_1: i % 2 === 0 ? 'A' : 'B'
  }))

  describe('분석 추천 카드', () => {
    it('기술통계는 숫자형 컬럼이 있을 때만 추천되어야 함', () => {
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

    it('범주형 컬럼만 있으면 기술통계가 추천되지 않아야 함', () => {
      const results = createValidationResults(0, 2)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.queryByText(/기술통계/)).not.toBeInTheDocument()
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

    it('그룹이 1개뿐인 범주형은 그룹 비교를 추천하지 않아야 함', () => {
      const results = createValidationResults(1, 1, 1)
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.queryByText(/2집단 비교/)).not.toBeInTheDocument()
      expect(screen.queryByText(/다집단 비교/)).not.toBeInTheDocument()
    })

    it('코드형 숫자 컬럼만 있으면 상관/회귀분석을 추천하지 않아야 함 (uniqueRatio < 5%)', () => {
      // uniqueValues=3, totalRows=100 → 3% < 5% → 코드형으로 판단
      const results: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['code_1', 'code_2'],
        errors: [],
        warnings: [],
        columnStats: [
          {
            name: 'code_1',
            type: 'numeric' as const,
            uniqueValues: 3, // 3/100 = 3% < 5%
            numericCount: 100,
            textCount: 0,
            missingCount: 0
          },
          {
            name: 'code_2',
            type: 'numeric' as const,
            uniqueValues: 4, // 4/100 = 4% < 5%
            numericCount: 100,
            textCount: 0,
            missingCount: 0
          }
        ]
      }
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.queryByText(/상관분석/)).not.toBeInTheDocument()
      expect(screen.queryByText(/회귀분석/)).not.toBeInTheDocument()
    })

    it('실질적 연속형 컬럼이 2개 이상이면 상관/회귀분석을 추천해야 함 (uniqueRatio >= 5%)', () => {
      // uniqueValues=50, totalRows=100 → 50% >= 5% → 연속형으로 판단
      const results: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['continuous_1', 'continuous_2'],
        errors: [],
        warnings: [],
        columnStats: [
          {
            name: 'continuous_1',
            type: 'numeric' as const,
            uniqueValues: 50, // 50/100 = 50% >= 5%
            numericCount: 100,
            textCount: 0,
            missingCount: 0
          },
          {
            name: 'continuous_2',
            type: 'numeric' as const,
            uniqueValues: 80, // 80/100 = 80% >= 5%
            numericCount: 100,
            textCount: 0,
            missingCount: 0
          }
        ]
      }
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.getByText(/상관분석/)).toBeInTheDocument()
      expect(screen.getByText(/회귀분석/)).toBeInTheDocument()
    })

    it('복수 범주형 컬럼이 있을 때 2집단과 다집단 모두 추천되어야 함', () => {
      // 성별(2그룹) + 학년(4그룹) + 연속형 1개
      const results: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 3,
        missingValues: 0,
        dataType: 'mixed',
        variables: ['성별', '학년', '점수'],
        errors: [],
        warnings: [],
        columnStats: [
          {
            name: '성별',
            type: 'categorical' as const,
            uniqueValues: 2, // 2그룹
            numericCount: 0,
            textCount: 100,
            missingCount: 0
          },
          {
            name: '학년',
            type: 'categorical' as const,
            uniqueValues: 4, // 4그룹
            numericCount: 0,
            textCount: 100,
            missingCount: 0
          },
          {
            name: '점수',
            type: 'numeric' as const,
            uniqueValues: 50,
            numericCount: 100,
            textCount: 0,
            missingCount: 0
          }
        ]
      }
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      // 2집단 비교 (성별)
      expect(screen.getByText(/2집단 비교/)).toBeInTheDocument()
      // 다집단 비교 (학년)
      expect(screen.getByText(/다집단 비교/)).toBeInTheDocument()
    })

    it('단일 수준 범주형이 섞여 있으면 카이제곱을 추천하지 않아야 함', () => {
      // 성별(1그룹) + 학년(3그룹) → 카이제곱 불가
      const results: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        dataType: 'categorical',
        variables: ['성별', '학년'],
        errors: [],
        warnings: [],
        columnStats: [
          {
            name: '성별',
            type: 'categorical' as const,
            uniqueValues: 1, // ← 단일 수준
            numericCount: 0,
            textCount: 100,
            missingCount: 0
          },
          {
            name: '학년',
            type: 'categorical' as const,
            uniqueValues: 3,
            numericCount: 0,
            textCount: 100,
            missingCount: 0
          }
        ]
      }
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.queryByText(/카이제곱 검정/)).not.toBeInTheDocument()
    })

    it('유효한 범주형이 2개 이상이면 카이제곱을 추천해야 함', () => {
      // 성별(2그룹) + 학년(3그룹) → 카이제곱 가능
      const results: ValidationResults = {
        isValid: true,
        totalRows: 100,
        columnCount: 2,
        missingValues: 0,
        dataType: 'categorical',
        variables: ['성별', '학년'],
        errors: [],
        warnings: [],
        columnStats: [
          {
            name: '성별',
            type: 'categorical' as const,
            uniqueValues: 2,
            numericCount: 0,
            textCount: 100,
            missingCount: 0
          },
          {
            name: '학년',
            type: 'categorical' as const,
            uniqueValues: 3,
            numericCount: 0,
            textCount: 100,
            missingCount: 0
          }
        ]
      }
      render(
        <DataValidationStep
          data={mockData}
          validationResults={results}
          onNext={mockOnNext}
        />
      )

      expect(screen.getByText(/카이제곱 검정/)).toBeInTheDocument()
    })
  })
})
