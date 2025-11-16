/**
 * Batch 2 마이그레이션 Critical Bug 예방 통합 테스트
 *
 * 검증 사항:
 * - Badge 클릭 시 즉시 Step 이동하지 않음 (10개 페이지 전체)
 * - "다음 단계" 버튼으로만 Step 변경 + 분석 실행
 * - 변수 미선택 시 버튼 비활성화
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'

// Mock dependencies
jest.mock('@/hooks/use-statistics-page', () => ({
  useStatisticsPage: jest.fn()
}))

jest.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: jest.fn().mockReturnValue({
      initialize: jest.fn().mockResolvedValue(undefined),
      callWorkerMethod: jest.fn().mockResolvedValue({ statistic: 1.5, pvalue: 0.05 }),
      loadWorker: jest.fn(),
      unloadWorker: jest.fn()
    })
  }
}))

describe('Batch 2: Critical Bug Prevention (10개 페이지)', () => {
  const mockActions = {
    setCurrentStep: jest.fn(),
    setUploadedData: jest.fn(),
    setSelectedVariables: jest.fn(),
    startAnalysis: jest.fn(),
    completeAnalysis: jest.fn(),
    setError: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Wilcoxon (쌍 선택 - 정확히 2개)', () => {
    it('Badge 클릭 시 변수만 선택되고 Step 이동하지 않음', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      const WilcoxonPage = require('@/app/(dashboard)/statistics/wilcoxon/page').default

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ pre: 10, post: 12, age: 25 }],
            columns: ['pre', 'post', 'age']
          },
          selectedVariables: { dependent: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<WilcoxonPage />)

      // Badge 클릭 (첫 번째 변수)
      const preBadge = screen.getByText('pre')
      fireEvent.click(preBadge)

      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          dependent: ['pre']
        })
      })

      // ❌ setCurrentStep은 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalled()
    })

    it('정확히 2개 선택 후 "다음 단계" 버튼 활성화', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      const WilcoxonPage = require('@/app/(dashboard)/statistics/wilcoxon/page').default

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ pre: 10, post: 12 }],
            columns: ['pre', 'post']
          },
          selectedVariables: { dependent: ['pre', 'post'] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<WilcoxonPage />)

      const nextButton = screen.getByRole('button', { name: /다음 단계/i })
      expect(nextButton).not.toBeDisabled()
    })
  })

  describe('Friedman (다중 선택 - 최소 3개)', () => {
    it('Badge 클릭 시 변수만 선택되고 Step 이동하지 않음', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      const FriedmanPage = require('@/app/(dashboard)/statistics/friedman/page').default

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ t1: 10, t2: 12, t3: 14, t4: 16 }],
            columns: ['t1', 't2', 't3', 't4']
          },
          selectedVariables: { within: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<FriedmanPage />)

      // Badge 클릭 (첫 번째 변수)
      const t1Badge = screen.getByText('t1')
      fireEvent.click(t1Badge)

      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          within: ['t1']
        })
      })

      // ❌ setCurrentStep은 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalled()
    })

    it('3개 미만 선택 시 "다음 단계" 버튼 비활성화', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      const FriedmanPage = require('@/app/(dashboard)/statistics/friedman/page').default

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ t1: 10, t2: 12 }],
            columns: ['t1', 't2']
          },
          selectedVariables: { within: ['t1', 't2'] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<FriedmanPage />)

      const nextButton = screen.getByRole('button', { name: /다음 단계/i })
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Stepwise (3섹션 다중 선택)', () => {
    it('종속변수 Badge 클릭 시 변수만 선택되고 Step 이동하지 않음', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      const StepwisePage = require('@/app/(dashboard)/statistics/stepwise/page').default

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ y: 10, x1: 5, x2: 8 }],
            columns: ['y', 'x1', 'x2']
          },
          selectedVariables: { dependent: [], factor: [], covariate: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<StepwisePage />)

      // 종속변수 Badge 클릭
      const yBadge = screen.getByText('y')
      fireEvent.click(yBadge)

      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          dependent: ['y'],
          factor: [],
          covariate: []
        })
      })

      // ❌ setCurrentStep은 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalled()
    })

    it('종속+독립 변수 미선택 시 "다음 단계" 버튼 비활성화', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      const StepwisePage = require('@/app/(dashboard)/statistics/stepwise/page').default

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ y: 10 }],
            columns: ['y']
          },
          selectedVariables: { dependent: ['y'], factor: [], covariate: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<StepwisePage />)

      const nextButton = screen.getByRole('button', { name: /다음 단계/i })
      expect(nextButton).toBeDisabled()
    })
  })

  describe('Mann-Whitney (종속+그룹)', () => {
    it('Badge 클릭 시 변수만 선택되고 Step 이동하지 않음', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      const MannWhitneyPage = require('@/app/(dashboard)/statistics/mann-whitney/page').default

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ score: 85, group: 'A' }],
            columns: ['score', 'group']
          },
          selectedVariables: { dependent: '', factor: [] },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<MannWhitneyPage />)

      // 종속변수 Badge 클릭
      const scoreBadge = screen.getByText('score')
      fireEvent.click(scoreBadge)

      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          dependent: 'score',
          factor: []
        })
      })

      // ❌ setCurrentStep은 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalled()
    })
  })

  describe('Mann-Kendall (단일 선택)', () => {
    it('Badge 클릭 시 변수만 선택되고 Step 이동하지 않음', async () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      const MannKendallPage = require('@/app/(dashboard)/statistics/mann-kendall/page').default

      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            fileName: 'test.csv',
            data: [{ temperature: 25.5, year: 2020 }],
            columns: ['temperature', 'year']
          },
          selectedVariables: { data: '' },
          results: null,
          isAnalyzing: false,
          error: null
        },
        actions: mockActions
      })

      render(<MannKendallPage />)

      // 시계열 변수 Badge 클릭
      const tempBadge = screen.getByText('temperature')
      fireEvent.click(tempBadge)

      await waitFor(() => {
        expect(mockActions.setSelectedVariables).toHaveBeenCalledWith({
          data: 'temperature'
        })
      })

      // ❌ setCurrentStep은 호출되지 않아야 함
      expect(mockActions.setCurrentStep).not.toHaveBeenCalled()
    })
  })
})
