/**
 * Descriptive 페이지 Step 네비게이션 테스트
 *
 * Critical Bug 수정 검증:
 * - 변수 선택 시 즉시 Step 이동하지 않음
 * - "다음 단계" 버튼 클릭 시에만 Step 이동
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DescriptiveStatsPage from '@/app/(dashboard)/statistics/descriptive/page'

// Mock dependencies
jest.mock('@/hooks/use-statistics-page', () => ({
  useStatisticsPage: jest.fn()
}))

jest.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: jest.fn().mockReturnValue({
      loadWorker: jest.fn(),
      unloadWorker: jest.fn()
    })
  }
}))

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  Legend: () => null
}))

describe('Descriptive Page - Step Navigation', () => {
  const mockActions = {
    setCurrentStep: jest.fn(),
    setUploadedData: jest.fn(),
    setSelectedVariables: jest.fn(),
    startAnalysis: jest.fn(),
    setResults: jest.fn(),
    setError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()

    const { useStatisticsPage } = require('@/hooks/use-statistics-page')
    useStatisticsPage.mockReturnValue({
      state: {
        currentStep: 2,
        uploadedData: {
          fileName: 'test.csv',
          data: [
            { age: 25, height: 170, weight: 65 },
            { age: 30, height: 175, weight: 70 },
            { age: 35, height: 180, weight: 75 }
          ],
          columns: ['age', 'height', 'weight']
        },
        selectedVariables: { variables: [] },
        results: null,
        isAnalyzing: false,
        error: null
      },
      actions: mockActions
    })
  })

  describe('Critical Bug Fix: 변수 선택 시 즉시 Step 이동 방지', () => {
    it('Badge 클릭 시 변수만 선택되고 Step 이동하지 않음', async () => {
      render(<DescriptiveStatsPage />)

      // Step 2 확인 (헤더 텍스트로 확인)
      expect(screen.getByText(/기술통계를 계산할 수치형 변수를 선택하세요/i)).toBeInTheDocument()

      // 첫 번째 변수 Badge 클릭
      const ageBadge = screen.getByText('age')
      fireEvent.click(ageBadge)

      // setSelectedVariables는 호출되어야 함
      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          variables: ['age']
        })
      })

      // ❌ setCurrentStep(3)은 호출되지 않아야 함 (Critical Bug 수정)
      expect(mockActions.setCurrentStep).not.toHaveBeenCalledWith(3)
    })

    it('여러 변수를 순차적으로 선택할 수 있음', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')

      // 첫 번째 선택 후 상태
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [
              { age: 25, height: 170, weight: 65 },
              { age: 30, height: 175, weight: 70 }
            ],
            columns: ['age', 'height', 'weight']
          },
          selectedVariables: { variables: ['age'] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      const { rerender } = render(<DescriptiveStatsPage />)

      // 두 번째 변수 Badge 클릭
      const heightBadge = screen.getByText('height')
      fireEvent.click(heightBadge)

      // 두 번째 변수도 선택되어야 함
      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          variables: ['age', 'height']
        })
      })

      // ❌ 여전히 setCurrentStep(3)은 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalledWith(3)
    })

    it('"다음 단계" 버튼 클릭 시에만 Step 3로 이동', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ age: 25, height: 170 }],
            columns: ['age', 'height']
          },
          selectedVariables: { variables: ['age', 'height'] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<DescriptiveStatsPage />)

      // "다음 단계" 버튼 찾기
      const nextButton = screen.getByRole('button', { name: /다음 단계/i })
      expect(nextButton).toBeInTheDocument()
      expect(nextButton).not.toBeDisabled()

      // "다음 단계" 버튼 클릭
      fireEvent.click(nextButton)

      // ✅ 이제야 setCurrentStep(3)이 호출되어야 함
      await waitFor(() => {
        expect(mockActions.setCurrentStep).toHaveBeenCalledWith(3)
      })
    })

    it('변수 미선택 시 "다음 단계" 버튼 비활성화', () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ age: 25 }],
            columns: ['age']
          },
          selectedVariables: { variables: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<DescriptiveStatsPage />)

      // "다음 단계" 버튼이 비활성화되어 있어야 함
      const nextButton = screen.getByRole('button', { name: /다음 단계/i })
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Badge 선택/해제 토글', () => {
    it('선택된 변수를 다시 클릭하면 선택 해제됨', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ age: 25, height: 170 }],
            columns: ['age', 'height']
          },
          selectedVariables: { variables: ['age', 'height'] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<DescriptiveStatsPage />)

      // 이미 선택된 'age' Badge 클릭 (선택 해제)
      const ageBadge = screen.getByText('age')
      fireEvent.click(ageBadge)

      // 'age'가 제거된 배열로 업데이트되어야 함
      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          variables: ['height']
        })
      })

      // ❌ setCurrentStep은 여전히 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalled()
    })
  })
})
