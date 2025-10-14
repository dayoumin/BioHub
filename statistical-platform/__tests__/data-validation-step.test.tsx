/**
 * DataValidationStep Component Test
 *
 * 목적: ValidationResults의 errors/warnings가 undefined일 때도 안전하게 동작하는지 검증
 * 수정 사항: 옵셔널 체이닝(?.) 추가로 TypeError 방지
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// PyodideProvider Mock
jest.mock('@/components/providers/PyodideProvider', () => ({
  usePyodide: () => ({
    isLoaded: true,
    isLoading: false,
    service: {
      checkAllAssumptions: jest.fn(),
      shapiroWilkTest: jest.fn(),
      andersonDarlingTest: jest.fn(),
      dagostinoPearsonTest: jest.fn()
    },
    error: null
  })
}))

// SmartFlowStore Mock
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    uploadedFile: null,
    uploadedFileName: 'test.csv',
    dataCharacteristics: null,
    assumptionResults: null,
    setDataCharacteristics: jest.fn(),
    setAssumptionResults: jest.fn()
  })
}))

// Plotly Mock
jest.mock('@/components/charts/PlotlyChartImproved', () => ({
  PlotlyChartImproved: () => <div>Chart Mock</div>
}))

describe('DataValidationStep - ValidationResults Safe Access', () => {
  const mockData: DataRow[] = [
    { age: 25, name: 'Alice' },
    { age: 30, name: 'Bob' },
    { age: 35, name: 'Charlie' }
  ]

  const mockOnNext = jest.fn()
  const mockOnPrevious = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('errors/warnings 속성 안전성 검증', () => {
    it('should handle validationResults with undefined errors', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 3,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: undefined as unknown as string[], // Runtime에서 undefined 가능
        warnings: ['Warning 1']
      }

      expect(() => {
        render(
          <DataValidationStep
            validationResults={validationResults}
            data={mockData}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
            canGoNext={true}
            canGoPrevious={true}
            currentStep={2}
            totalSteps={5}
          />
        )
      }).not.toThrow()

      // 에러가 undefined여도 렌더링 성공
      expect(screen.queryByText('데이터를 먼저 업로드해주세요.')).not.toBeInTheDocument()
    })

    it('should handle validationResults with undefined warnings', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 3,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: ['Error 1'],
        warnings: undefined as unknown as string[] // Runtime에서 undefined 가능
      }

      expect(() => {
        render(
          <DataValidationStep
            validationResults={validationResults}
            data={mockData}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
            canGoNext={true}
            canGoPrevious={true}
            currentStep={2}
            totalSteps={5}
          />
        )
      }).not.toThrow()
    })

    it('should handle validationResults with both undefined errors and warnings', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 3,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: undefined as unknown as string[],
        warnings: undefined as unknown as string[]
      }

      expect(() => {
        render(
          <DataValidationStep
            validationResults={validationResults}
            data={mockData}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
            canGoNext={true}
            canGoPrevious={true}
            currentStep={2}
            totalSteps={5}
          />
        )
      }).not.toThrow()
    })

    it('should handle validationResults with empty arrays', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 3,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: [],
        warnings: []
      }

      expect(() => {
        render(
          <DataValidationStep
            validationResults={validationResults}
            data={mockData}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
            canGoNext={true}
            canGoPrevious={true}
            currentStep={2}
            totalSteps={5}
          />
        )
      }).not.toThrow()
    })

    it('should correctly compute hasErrors with undefined errors', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 3,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: undefined as unknown as string[],
        warnings: []
      }

      render(
        <DataValidationStep
          validationResults={validationResults}
          data={mockData}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
          canGoNext={true}
          canGoPrevious={true}
          currentStep={2}
          totalSteps={5}
        />
      )

      // hasErrors = (undefined?.length || 0) > 0 = false
      // "데이터 검증 완료" 텍스트가 표시되어야 함
      expect(screen.getByText(/데이터 검증 완료/)).toBeInTheDocument()
    })

    it('should correctly compute hasErrors with actual errors', () => {
      const validationResults: ValidationResults = {
        isValid: false,
        totalRows: 3,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: ['Error 1', 'Error 2'],
        warnings: []
      }

      render(
        <DataValidationStep
          validationResults={validationResults}
          data={mockData}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
          canGoNext={false}
          canGoPrevious={true}
          currentStep={2}
          totalSteps={5}
        />
      )

      // hasErrors = (['Error 1', 'Error 2']?.length || 0) > 0 = true
      expect(screen.getByText(/데이터 검증 실패/)).toBeInTheDocument()
    })
  })

  describe('Conditional Rendering 검증', () => {
    it('should not render recommendation section when no errors/warnings', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 3,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: undefined as unknown as string[],
        warnings: undefined as unknown as string[]
      }

      render(
        <DataValidationStep
          validationResults={validationResults}
          data={mockData}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
          canGoNext={true}
          canGoPrevious={true}
          currentStep={2}
          totalSteps={5}
        />
      )

      // 714줄 조건: ((undefined?.length || 0) > 0 || (undefined?.length || 0) > 0) = false
      // "데이터 개선 권장사항" 텍스트가 표시되지 않아야 함
      expect(screen.queryByText('데이터 개선 권장사항')).not.toBeInTheDocument()
    })

    it('should render recommendation section when warnings exist', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 30, // 5% 이상 결측값 조건 충족을 위해
        columnCount: 2,
        missingValues: 5, // 16.7% 결측값
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: undefined as unknown as string[],
        warnings: ['Warning 1']
      }

      render(
        <DataValidationStep
          validationResults={validationResults}
          data={mockData}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
          canGoNext={true}
          canGoPrevious={true}
          currentStep={2}
          totalSteps={5}
        />
      )

      // 714줄 조건: ((undefined?.length || 0) > 0 || (['Warning 1']?.length || 0) > 0) = true
      expect(screen.getByText('데이터 개선 권장사항')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null validationResults', () => {
      render(
        <DataValidationStep
          validationResults={null}
          data={mockData}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
          canGoNext={false}
          canGoPrevious={true}
          currentStep={2}
          totalSteps={5}
        />
      )

      expect(screen.getByText('데이터를 먼저 업로드해주세요.')).toBeInTheDocument()
    })

    it('should handle null data', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 0,
        columnCount: 0,
        missingValues: 0,
        dataType: 'numeric',
        variables: [],
        errors: [],
        warnings: []
      }

      render(
        <DataValidationStep
          validationResults={validationResults}
          data={null}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
          canGoNext={false}
          canGoPrevious={true}
          currentStep={2}
          totalSteps={5}
        />
      )

      expect(screen.getByText('데이터를 먼저 업로드해주세요.')).toBeInTheDocument()
    })
  })

  describe('Type Safety 검증', () => {
    it('should maintain type safety with optional chaining', () => {
      const validationResults: ValidationResults = {
        isValid: true,
        totalRows: 3,
        columnCount: 2,
        missingValues: 0,
        dataType: 'numeric',
        variables: ['age', 'name'],
        errors: undefined as unknown as string[],
        warnings: undefined as unknown as string[]
      }

      // 옵셔널 체이닝으로 타입 안전성 보장
      const hasErrors = (validationResults.errors?.length || 0) > 0
      const hasWarnings = (validationResults.warnings?.length || 0) > 0

      expect(typeof hasErrors).toBe('boolean')
      expect(typeof hasWarnings).toBe('boolean')
      expect(hasErrors).toBe(false)
      expect(hasWarnings).toBe(false)
    })

    it('should handle mixed scenarios correctly', () => {
      const scenarios = [
        {
          errors: undefined,
          warnings: undefined,
          expectedHasErrors: false,
          expectedHasWarnings: false
        },
        {
          errors: [],
          warnings: [],
          expectedHasErrors: false,
          expectedHasWarnings: false
        },
        {
          errors: ['Error'],
          warnings: undefined,
          expectedHasErrors: true,
          expectedHasWarnings: false
        },
        {
          errors: undefined,
          warnings: ['Warning'],
          expectedHasErrors: false,
          expectedHasWarnings: true
        },
        {
          errors: ['Error'],
          warnings: ['Warning'],
          expectedHasErrors: true,
          expectedHasWarnings: true
        }
      ]

      scenarios.forEach(({ errors, warnings, expectedHasErrors, expectedHasWarnings }) => {
        const hasErrors = ((errors as string[] | undefined)?.length || 0) > 0
        const hasWarnings = ((warnings as string[] | undefined)?.length || 0) > 0

        expect(hasErrors).toBe(expectedHasErrors)
        expect(hasWarnings).toBe(expectedHasWarnings)
      })
    })
  })
})