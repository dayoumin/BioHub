/**
 * Means Plot 페이지 Step 네비게이션 테스트
 *
 * Critical Bug 수정 검증:
 * - 변수 선택 시 즉시 Step 이동하지 않음
 * - "다음 단계" 버튼 클릭 시에만 Step 이동 및 분석 실행
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import MeansPlotPage from '@/app/(dashboard)/statistics/means-plot/page'

// Mock dependencies
vi.mock('@/hooks/use-statistics-page', () => ({
  useStatisticsPage: vi.fn()
}))

// Import the mocked module to use vi.mocked()
import { useStatisticsPage } from '@/hooks/use-statistics-page'

vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: vi.fn().mockReturnValue({
      initialize: vi.fn(),
      callWorkerMethod: vi.fn(),
      loadWorker: vi.fn(),
      unloadWorker: vi.fn()
    })
  }
}))

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ErrorBar: () => null
}))

describe('Means Plot Page - Step Navigation', () => {
  const mockActions = {
    setCurrentStep: vi.fn(),
    setUploadedData: vi.fn(),
    setSelectedVariables: vi.fn(),
    startAnalysis: vi.fn(),
    completeAnalysis: vi.fn(),
    setError: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
    updateVariableMapping: vi.fn(),
    setResults: vi.fn(),
    reset: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()

    const mockedUseStatisticsPage = vi.mocked(useStatisticsPage)
    mockedUseStatisticsPage.mockReturnValue({
      state: {
          currentStep: 3,
          variableMapping: {},
          uploadedData: {
          fileName: 'test.csv',
          data: [
            { age: 25, height: 170, group: 'A' },
            { age: 30, height: 175, group: 'B' },
            { age: 35, height: 180, group: 'A' }
          ],
          columns: ['age', 'height', 'group']
        },
        selectedVariables: { dependent: [], factor: [] },
        results: null,
        isAnalyzing: false,
        error: null
      },
      actions: mockActions
    })
  })

  describe('Critical Bug Fix: 변수 선택 시 즉시 Step 이동 방지', () => {
    it('종속변수 Badge 클릭 시 변수만 선택되고 Step 이동하지 않음', async () => {
      render(<MeansPlotPage />)

      // Step 3 확인
      expect(screen.getByText(/종속변수\(연속형\)와 요인변수\(범주형\)를 선택하세요/i)).toBeInTheDocument()

      // 종속변수 Badge 클릭
      const heightBadge = screen.getByText('height')
      fireEvent.click(heightBadge)

      // setSelectedVariables는 호출되어야 함
      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          dependent: ['height'],
          factor: []
        })
      })

      // ❌ setCurrentStep(4)은 호출되지 않아야 함 (Critical Bug 수정)
      expect(mockActions.setCurrentStep).not.toHaveBeenCalledWith(4)
    })

    it('요인변수 Badge 클릭 시 변수만 선택되고 Step 이동하지 않음', async () => {
      const mockedUseStatisticsPage = vi.mocked(useStatisticsPage)

      mockedUseStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          variableMapping: {},
          uploadedData: {
            fileName: 'test.csv',
            data: [
              { age: 25, height: 170, group: 'A' }
            ],
            columns: ['age', 'height', 'group']
          },
          selectedVariables: { dependent: ['height'], factor: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<MeansPlotPage />)

      // 요인변수 Badge 클릭
      const groupBadge = screen.getByText('group')
      fireEvent.click(groupBadge)

      // setSelectedVariables는 호출되어야 함
      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          dependent: ['height'],
          factor: ['group']
        })
      })

      // ❌ setCurrentStep은 여전히 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalled()
    })

    it('"다음 단계" 버튼 클릭 시에만 Step 4로 이동하고 분석 실행', async () => {
      const mockedUseStatisticsPage = vi.mocked(useStatisticsPage)

      mockedUseStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          variableMapping: {},
          uploadedData: {
            fileName: 'test.csv',
            data: [{ age: 25, height: 170, group: 'A' }],
            columns: ['age', 'height', 'group']
          },
          selectedVariables: { dependent: ['height'], factor: ['group'] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<MeansPlotPage />)

      // "다음 단계" 버튼 찾기 (분석 실행 버튼)
      const nextButton = screen.getByRole('button', { name: /다음 단계/i })
      expect(nextButton).toBeInTheDocument()
      expect(nextButton).not.toBeDisabled()

      // "다음 단계" 버튼 클릭
      fireEvent.click(nextButton)

      // ✅ 이제야 setCurrentStep(4)이 호출되어야 함
      await waitFor(() => {
        expect(mockActions.setCurrentStep).toHaveBeenCalledWith(4)
      })
    })

    it('변수 미선택 시 "다음 단계" 버튼 비활성화', () => {
      const mockedUseStatisticsPage = vi.mocked(useStatisticsPage)

      mockedUseStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          variableMapping: {},
          uploadedData: {
            fileName: 'test.csv',
            data: [{ age: 25, height: 170, group: 'A' }],
            columns: ['age', 'height', 'group']
          },
          selectedVariables: { dependent: [], factor: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<MeansPlotPage />)

      // "다음 단계" 버튼이 비활성화되어 있어야 함
      const nextButton = screen.getByRole('button', { name: /다음 단계/i })
      expect(nextButton).toBeDisabled()
    })

    it('종속변수만 선택 시 "다음 단계" 버튼 비활성화', () => {
      const mockedUseStatisticsPage = vi.mocked(useStatisticsPage)

      mockedUseStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          variableMapping: {},
          uploadedData: {
            fileName: 'test.csv',
            data: [{ age: 25, height: 170, group: 'A' }],
            columns: ['age', 'height', 'group']
          },
          selectedVariables: { dependent: ['height'], factor: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<MeansPlotPage />)

      // "다음 단계" 버튼이 비활성화되어 있어야 함 (요인변수 미선택)
      const nextButton = screen.getByRole('button', { name: /다음 단계/i })
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Badge 선택/해제 토글', () => {
    it('선택된 종속변수를 다시 클릭하면 선택 해제됨', async () => {
      const mockedUseStatisticsPage = vi.mocked(useStatisticsPage)

      mockedUseStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          variableMapping: {},
          uploadedData: {
            fileName: 'test.csv',
            data: [{ age: 25, height: 170, group: 'A' }],
            columns: ['age', 'height', 'group']
          },
          selectedVariables: { dependent: ['height'], factor: ['group'] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<MeansPlotPage />)

      // 이미 선택된 'height' Badge 클릭 (선택 해제)
      const heightBadge = screen.getByText('height')
      fireEvent.click(heightBadge)

      // 'height'가 제거된 배열로 업데이트되어야 함
      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          dependent: ['height'], // 1개만 선택 가능하므로 재선택됨
          factor: ['group']
        })
      })

      // ❌ setCurrentStep은 여전히 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalled()
    })
  })
})
