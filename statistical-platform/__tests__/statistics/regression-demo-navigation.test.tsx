/**
 * Regression-Demo 페이지 - 백 네비게이션 테스트
 *
 * 금일 수정 사항 검증:
 * 1. Step 2 → Step 3 백 네비게이션 (데이터 재업로드 불필요)
 * 2. Step 4 → Step 3 백 네비게이션 ("결과 보기" 버튼)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'
import RegressionDemoPage from '@/app/(dashboard)/statistics/regression-demo/page'

// Mock dependencies
jest.mock('@/lib/utils/recent-statistics', () => ({
  addToRecentStatistics: jest.fn()
}))

jest.mock('@/hooks/use-statistics-page', () => ({
  useStatisticsPage: jest.fn(() => ({
    state: {
      currentStep: 1,
      uploadedData: null,
      selectedVariables: null,
      results: null,
      error: null,
      isAnalyzing: false
    },
    actions: {
      setCurrentStep: jest.fn(),
      setUploadedData: jest.fn(),
      setSelectedVariables: jest.fn(),
      setResults: jest.fn(),
      setError: jest.fn(),
      setIsAnalyzing: jest.fn()
    }
  }))
}))

describe('Regression-Demo Page - Back Navigation', () => {
  /**
   * 테스트 1: Step 2 백 네비게이션 (데이터 재업로드 불필요)
   */
  describe('Step 2: 데이터 업로드 → Step 3 백 네비게이션', () => {
    it('업로드 완료 후 "다음 단계로" 버튼이 표시된다', async () => {
      const mockSetCurrentStep = jest.fn()
      const mockSetUploadedData = jest.fn()

      // Step 2 상태로 렌더링
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            data: [{ x: '10', y: '20' }],
            fileName: 'test.csv',
            columns: ['x', 'y']
          },
          selectedVariables: null,
          results: null,
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: mockSetCurrentStep,
          setUploadedData: mockSetUploadedData,
          setSelectedVariables: jest.fn(),
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })

      render(<RegressionDemoPage />)

      // "다음 단계로" 버튼 확인
      await waitFor(() => {
        const nextButton = screen.getByText('다음 단계로')
        expect(nextButton).toBeInTheDocument()
      })

      // 업로드 완료 메시지 확인
      expect(screen.getByText(/업로드 완료:/)).toBeInTheDocument()
      expect(screen.getByText(/test.csv/)).toBeInTheDocument()
    })

    it('"다음 단계로" 버튼 클릭 시 Step 3으로 이동한다', async () => {
      const mockSetCurrentStep = jest.fn()

      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            data: [{ x: '10', y: '20' }],
            fileName: 'test.csv',
            columns: ['x', 'y']
          },
          selectedVariables: null,
          results: null,
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: mockSetCurrentStep,
          setUploadedData: jest.fn(),
          setSelectedVariables: jest.fn(),
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })

      render(<RegressionDemoPage />)

      const nextButton = await screen.findByText('다음 단계로')
      await act(async () => {
        fireEvent.click(nextButton)
      })

      // setCurrentStep(3) 호출 확인
      expect(mockSetCurrentStep).toHaveBeenCalledWith(3)
    })

    it('데이터가 없으면 "다음 단계로" 버튼이 표시되지 않는다', () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: null,
          selectedVariables: null,
          results: null,
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: jest.fn(),
          setUploadedData: jest.fn(),
          setSelectedVariables: jest.fn(),
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })

      render(<RegressionDemoPage />)

      // "다음 단계로" 버튼이 없어야 함
      expect(screen.queryByText('다음 단계로')).not.toBeInTheDocument()
    })
  })

  /**
   * 테스트 2: Step 3 "결과 보기" 버튼 (재분석 불필요)
   */
  describe('Step 3: 변수 선택 → "결과 보기" 버튼', () => {
    it('분석 결과가 없으면 "분석하기" 버튼만 표시된다', () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          uploadedData: {
            data: [{ x: '10', y: '20' }],
            fileName: 'test.csv',
            columns: ['x', 'y']
          },
          selectedVariables: {
            independent: ['x'],
            dependent: 'y'
          },
          results: null, // 결과 없음
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: jest.fn(),
          setUploadedData: jest.fn(),
          setSelectedVariables: jest.fn(),
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })

      render(<RegressionDemoPage />)

      // "분석하기" 버튼 있어야 함
      expect(screen.getByText('분석하기')).toBeInTheDocument()

      // "결과 보기" 버튼 없어야 함
      expect(screen.queryByText('결과 보기')).not.toBeInTheDocument()
    })

    it('분석 결과가 있으면 "다시 분석하기" + "결과 보기" 버튼 표시된다', () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          uploadedData: {
            data: [{ x: '10', y: '20' }],
            fileName: 'test.csv',
            columns: ['x', 'y']
          },
          selectedVariables: {
            independent: ['x'],
            dependent: 'y'
          },
          results: {
            // 데모 결과
            rSquared: 0.89,
            adjustedRSquared: 0.87,
            fStatistic: 42.5,
            fPValue: 0.001
          },
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: jest.fn(),
          setUploadedData: jest.fn(),
          setSelectedVariables: jest.fn(),
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })

      render(<RegressionDemoPage />)

      // "다시 분석하기" 버튼 있어야 함
      expect(screen.getByText('다시 분석하기')).toBeInTheDocument()

      // "결과 보기" 버튼 있어야 함
      expect(screen.getByText('결과 보기')).toBeInTheDocument()
    })

    it('"결과 보기" 버튼 클릭 시 Step 4로 이동한다', async () => {
      const mockSetCurrentStep = jest.fn()

      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          uploadedData: {
            data: [{ x: '10', y: '20' }],
            fileName: 'test.csv',
            columns: ['x', 'y']
          },
          selectedVariables: {
            independent: ['x'],
            dependent: 'y'
          },
          results: {
            rSquared: 0.89,
            adjustedRSquared: 0.87,
            fStatistic: 42.5,
            fPValue: 0.001
          },
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: mockSetCurrentStep,
          setUploadedData: jest.fn(),
          setSelectedVariables: jest.fn(),
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })

      render(<RegressionDemoPage />)

      const viewResultsButton = screen.getByText('결과 보기')
      await act(async () => {
        fireEvent.click(viewResultsButton)
      })

      // setCurrentStep(4) 호출 확인
      expect(mockSetCurrentStep).toHaveBeenCalledWith(4)
    })

    it('분석 중일 때는 "결과 보기" 버튼이 표시되지 않는다', () => {
      const { useStatisticsPage } = require('@/hooks/use-statistics-page')
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          uploadedData: {
            data: [{ x: '10', y: '20' }],
            fileName: 'test.csv',
            columns: ['x', 'y']
          },
          selectedVariables: {
            independent: ['x'],
            dependent: 'y'
          },
          results: {
            rSquared: 0.89,
            adjustedRSquared: 0.87,
            fStatistic: 42.5,
            fPValue: 0.001
          },
          error: null,
          isAnalyzing: true // 분석 중
        },
        actions: {
          setCurrentStep: jest.fn(),
          setUploadedData: jest.fn(),
          setSelectedVariables: jest.fn(),
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })

      render(<RegressionDemoPage />)

      // "결과 보기" 버튼 없어야 함
      expect(screen.queryByText('결과 보기')).not.toBeInTheDocument()

      // "분석 중..." 버튼 있어야 함
      expect(screen.getByText('분석 중...')).toBeInTheDocument()
    })
  })

  /**
   * 테스트 3: 전체 워크플로우 통합 테스트
   */
  describe('전체 워크플로우: Step 1 → 2 → 3 → 4 → 3 → 4', () => {
    it('전체 네비게이션 플로우가 정상 작동한다', async () => {
      const mockSetCurrentStep = jest.fn()
      const mockSetUploadedData = jest.fn()
      const mockSetSelectedVariables = jest.fn()

      const { useStatisticsPage } = require('@/hooks/use-statistics-page')

      // Step 1: 회귀 유형 선택
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 1,
          uploadedData: null,
          selectedVariables: null,
          results: null,
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: mockSetCurrentStep,
          setUploadedData: mockSetUploadedData,
          setSelectedVariables: mockSetSelectedVariables,
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })

      const { rerender } = render(<RegressionDemoPage />)

      // Step 1 → Step 2 (회귀 유형 선택)
      const simpleRegressionCard = screen.getByText(/단순 선형 회귀/)
      fireEvent.click(simpleRegressionCard.closest('div')!)
      expect(mockSetCurrentStep).toHaveBeenCalledWith(2)

      // Step 2: 데이터 업로드 완료 상태로 변경
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 2,
          uploadedData: {
            data: [{ x: '10', y: '20' }],
            fileName: 'test.csv',
            columns: ['x', 'y']
          },
          selectedVariables: null,
          results: null,
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: mockSetCurrentStep,
          setUploadedData: mockSetUploadedData,
          setSelectedVariables: mockSetSelectedVariables,
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })
      rerender(<RegressionDemoPage />)

      // Step 2 → Step 3 ("다음 단계로" 버튼 클릭)
      const nextButton = await screen.findByText('다음 단계로')
      fireEvent.click(nextButton)
      expect(mockSetCurrentStep).toHaveBeenCalledWith(3)

      // Step 3: 변수 선택 + 분석 완료 상태로 변경
      useStatisticsPage.mockReturnValue({
        state: {
          currentStep: 3,
          uploadedData: {
            data: [{ x: '10', y: '20' }],
            fileName: 'test.csv',
            columns: ['x', 'y']
          },
          selectedVariables: {
            independent: ['x'],
            dependent: 'y'
          },
          results: {
            rSquared: 0.89,
            adjustedRSquared: 0.87,
            fStatistic: 42.5,
            fPValue: 0.001
          },
          error: null,
          isAnalyzing: false
        },
        actions: {
          setCurrentStep: mockSetCurrentStep,
          setUploadedData: mockSetUploadedData,
          setSelectedVariables: mockSetSelectedVariables,
          setResults: jest.fn(),
          setError: jest.fn(),
          setIsAnalyzing: jest.fn()
        }
      })
      rerender(<RegressionDemoPage />)

      // Step 3 → Step 4 ("결과 보기" 버튼 클릭)
      const viewResultsButton = screen.getByText('결과 보기')
      fireEvent.click(viewResultsButton)
      expect(mockSetCurrentStep).toHaveBeenCalledWith(4)

      // 전체 호출 횟수 검증
      expect(mockSetCurrentStep).toHaveBeenCalledTimes(4)
    })
  })
})
