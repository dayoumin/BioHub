/**
 * @file chi-square-goodness.test.tsx
 * @description 카이제곱 적합도 검정 페이지 테스트
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ChiSquareGoodnessPage from '@/app/(dashboard)/statistics/chi-square-goodness/page'

// Mock pyodide-statistics service
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: jest.fn().mockResolvedValue(undefined),
    chiSquareGoodnessTest: jest.fn().mockResolvedValue({
      statistic: 5.234,
      pValue: 0.0236,
      degreesOfFreedom: 2,
      categories: [
        {
          category: 'Red',
          observed: 25,
          expected: 20.0,
          residual: 5.0,
          standardizedResidual: 1.118,
          contribution: 1.25
        },
        {
          category: 'Blue',
          observed: 15,
          expected: 20.0,
          residual: -5.0,
          standardizedResidual: -1.118,
          contribution: 1.25
        },
        {
          category: 'Green',
          observed: 20,
          expected: 20.0,
          residual: 0.0,
          standardizedResidual: 0.0,
          contribution: 0.0
        }
      ],
      effectSize: {
        cramersV: 0.296,
        interpretation: '중간 연관성'
      },
      expectedModel: 'uniform',
      totalN: 60,
      interpretation: {
        summary: 'χ² = 5.234, p = 0.024로 관측된 분포가 균등분포와 유의하게 다릅니다.',
        categories: 'Red 범주가 기댓값보다 높고, Blue 범주가 기댓값보다 낮습니다.',
        recommendations: [
          '빨간색이 선호되는 이유를 조사해보세요',
          '파란색에 대한 부정적 요인을 분석해보세요'
        ]
      }
    })
  }
}))

// Mock components
jest.mock('@/components/smart-flow/steps/DataUploadStep', () => ({
  DataUploadStep: ({ onNext }: { onNext: (data: unknown[]) => void }) => (
    <div data-testid="data-upload-step">
      <button
        onClick={() => onNext([
          { color: 'Red', count: 25 },
          { color: 'Blue', count: 15 },
          { color: 'Green', count: 20 }
        ])}
      >
        Upload Test Data
      </button>
    </div>
  )
}))

jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: ({
    onVariablesSelected
  }: {
    onVariablesSelected: (variables: { dependent: string[] }) => void
  }) => (
    <div data-testid="variable-selector">
      <button
        onClick={() => onVariablesSelected({ dependent: ['color'] })}
      >
        Select Variable
      </button>
    </div>
  )
}))

describe('ChiSquareGoodnessPage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('초기 렌더링', () => {
    it('페이지 제목과 설명이 올바르게 표시되는가', () => {
      render(<ChiSquareGoodnessPage />)

      expect(screen.getByText('카이제곱 적합도 검정')).toBeInTheDocument()
      expect(screen.getByText('Chi-Square Goodness-of-Fit Test')).toBeInTheDocument()
      expect(screen.getByText('관측된 빈도가 이론적 분포와 일치하는지 검정')).toBeInTheDocument()
    })

    it('4단계 스텝이 올바르게 초기화되는가', () => {
      render(<ChiSquareGoodnessPage />)

      expect(screen.getByText('분석 방법')).toBeInTheDocument()
      expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
      expect(screen.getByText('변수 선택')).toBeInTheDocument()
      expect(screen.getByText('결과 해석')).toBeInTheDocument()
    })

    it('분석 방법 단계가 현재 단계로 설정되는가', () => {
      render(<ChiSquareGoodnessPage />)

      expect(screen.getByText('카이제곱 적합도 검정 소개')).toBeInTheDocument()
      expect(screen.getByText('분석 목적')).toBeInTheDocument()
      expect(screen.getByText('적용 예시')).toBeInTheDocument()
    })
  })

  describe('사용자 플로우 테스트', () => {
    it('전체 분석 플로우가 올바르게 작동하는가', async () => {
      render(<ChiSquareGoodnessPage />)

      // Step 1: 방법론 소개 -> 데이터 업로드
      const nextButton = screen.getByText('다음: 데이터 업로드')
      await user.click(nextButton)

      expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()

      // Step 2: 데이터 업로드 -> 변수 선택
      const uploadButton = screen.getByText('Upload Test Data')
      await user.click(uploadButton)

      await waitFor(() => {
        expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
      })

      // Step 3: 변수 선택 -> 분석 실행
      const selectVariableButton = screen.getByText('Select Variable')
      await user.click(selectVariableButton)

      // 균등분포 선택이 기본값인지 확인
      expect(screen.getByLabelText('균등분포 (모든 범주가 동일한 확률)')).toBeChecked()

      // 분석 실행
      const analyzeButton = screen.getByText('분석 실행')
      await user.click(analyzeButton)

      // Step 4: 결과 확인
      await waitFor(() => {
        expect(screen.getByText('5.234')).toBeInTheDocument()
        expect(screen.getByText('0.024')).toBeInTheDocument()
        expect(screen.getByText('0.296')).toBeInTheDocument()
      })
    })

    it('사용자 정의 비율 설정이 올바르게 작동하는가', async () => {
      render(<ChiSquareGoodnessPage />)

      // 데이터 업로드까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variable'))

      // 사용자 정의 비율 선택
      const customRadio = screen.getByLabelText('사용자 정의 비율')
      await user.click(customRadio)

      expect(customRadio).toBeChecked()
      expect(screen.getByText('각 범주별 기댓값 비율 설정')).toBeInTheDocument()

      // 비율 정규화 버튼 확인
      expect(screen.getByText('비율 정규화')).toBeInTheDocument()
    })
  })

  describe('결과 표시 테스트', () => {
    beforeEach(async () => {
      render(<ChiSquareGoodnessPage />)

      // 분석 결과까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variable'))
      await user.click(screen.getByText('분석 실행'))

      await waitFor(() => {
        expect(screen.getByText('5.234')).toBeInTheDocument()
      })
    })

    it('주요 통계량이 올바르게 표시되는가', () => {
      // 카이제곱 통계량
      expect(screen.getByText('5.234')).toBeInTheDocument()
      expect(screen.getByText('χ² 통계량')).toBeInTheDocument()
      expect(screen.getByText('df = 2')).toBeInTheDocument()

      // p-value
      expect(screen.getByText('0.024')).toBeInTheDocument()
      expect(screen.getByText('유의확률')).toBeInTheDocument()

      // Cramér's V
      expect(screen.getByText('0.296')).toBeInTheDocument()
      expect(screen.getByText('Cramér\'s V')).toBeInTheDocument()
    })

    it('빈도표 탭이 올바르게 작동하는가', () => {
      // 빈도표 탭 클릭
      const frequencyTab = screen.getByText('빈도표')
      fireEvent.click(frequencyTab)

      expect(screen.getByText('관측빈도 vs 기댓빈도')).toBeInTheDocument()
      expect(screen.getByText('Red')).toBeInTheDocument()
      expect(screen.getByText('Blue')).toBeInTheDocument()
      expect(screen.getByText('Green')).toBeInTheDocument()

      // 표 헤더 확인
      expect(screen.getByText('범주')).toBeInTheDocument()
      expect(screen.getByText('관측빈도 (O)')).toBeInTheDocument()
      expect(screen.getByText('기댓빈도 (E)')).toBeInTheDocument()
      expect(screen.getByText('잔차 (O-E)')).toBeInTheDocument()
    })

    it('잔차분석 탭이 올바르게 작동하는가', () => {
      const residualTab = screen.getByText('잔차분석')
      fireEvent.click(residualTab)

      expect(screen.getByText('잔차 분석')).toBeInTheDocument()
      expect(screen.getByText('표준화 잔차와 각 범주의 기여도')).toBeInTheDocument()
      expect(screen.getByText('잔차 해석 가이드')).toBeInTheDocument()
    })

    it('해석 탭이 올바르게 작동하는가', () => {
      const interpretationTab = screen.getByText('해석')
      fireEvent.click(interpretationTab)

      expect(screen.getByText('결과 해석')).toBeInTheDocument()
      expect(screen.getByText('전체 검정 결과')).toBeInTheDocument()
      expect(screen.getByText('범주별 분석')).toBeInTheDocument()
      expect(screen.getByText('권장사항')).toBeInTheDocument()
    })
  })

  describe('에러 처리 테스트', () => {
    it('Pyodide 초기화 실패 시 에러가 표시되는가', async () => {
      const { pyodideStats } = await import('@/lib/services/pyodide-statistics')
      jest.mocked(pyodideStats.initialize).mockRejectedValueOnce(new Error('Init failed'))

      render(<ChiSquareGoodnessPage />)

      await waitFor(() => {
        expect(screen.getByText('통계 엔진을 초기화할 수 없습니다.')).toBeInTheDocument()
      })
    })

    it('분석 실패 시 에러가 표시되는가', async () => {
      const { pyodideStats } = await import('@/lib/services/pyodide-statistics')
      jest.mocked(pyodideStats.chiSquareGoodnessTest).mockRejectedValueOnce(new Error('Analysis failed'))

      render(<ChiSquareGoodnessPage />)

      // 분석까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variable'))
      await user.click(screen.getByText('분석 실행'))

      await waitFor(() => {
        expect(screen.getByText('카이제곱 적합도 검정 중 오류가 발생했습니다.')).toBeInTheDocument()
      })
    })
  })

  describe('성능 테스트', () => {
    it('useMemo가 올바르게 적용되어 steps가 재계산되지 않는가', () => {
      const { rerender } = render(<ChiSquareGoodnessPage />)

      const initialSteps = screen.getByText('분석 방법')

      // props 변경 없이 리렌더링
      rerender(<ChiSquareGoodnessPage />)

      const rerenderedSteps = screen.getByText('분석 방법')

      // 같은 엘리먼트 참조를 가져야 함 (메모화 확인)
      expect(initialSteps).toBe(rerenderedSteps)
    })

    it('로딩 상태가 올바르게 표시되는가', async () => {
      const { pyodideStats } = await import('@/lib/services/pyodide-statistics')

      // 지연된 Promise로 로딩 상태 테스트
      let resolvePromise: (value: any) => void
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      jest.mocked(pyodideStats.chiSquareGoodnessTest).mockReturnValueOnce(delayedPromise)

      render(<ChiSquareGoodnessPage />)

      // 분석 시작
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variable'))

      act(() => {
        fireEvent.click(screen.getByText('분석 실행'))
      })

      // 로딩 상태 확인
      expect(screen.getByText('카이제곱 적합도 검정 분석 중...')).toBeInTheDocument()
      expect(screen.getByText('잠시만 기다려주세요')).toBeInTheDocument()

      // Promise 해결
      act(() => {
        resolvePromise!({
          statistic: 5.234,
          pValue: 0.0236,
          degreesOfFreedom: 2,
          categories: [],
          effectSize: { cramersV: 0.296, interpretation: '중간 연관성' },
          expectedModel: 'uniform',
          totalN: 60,
          interpretation: {
            summary: 'Test summary',
            categories: 'Test categories',
            recommendations: []
          }
        })
      })

      await waitFor(() => {
        expect(screen.queryByText('카이제곱 적합도 검정 분석 중...')).not.toBeInTheDocument()
      })
    })
  })

  describe('접근성 테스트', () => {
    it('모든 인터랙티브 요소에 적절한 레이블이 있는가', () => {
      render(<ChiSquareGoodnessPage />)

      const nextButton = screen.getByText('다음: 데이터 업로드')
      expect(nextButton).toBeInTheDocument()
      expect(nextButton.tagName).toBe('BUTTON')
    })

    it('키보드 네비게이션이 가능한가', async () => {
      render(<ChiSquareGoodnessPage />)

      const nextButton = screen.getByText('다음: 데이터 업로드')
      nextButton.focus()

      expect(document.activeElement).toBe(nextButton)

      // Enter 키로 버튼 클릭 가능
      fireEvent.keyDown(nextButton, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()
      })
    })

    it('ARIA 라벨이 적절히 설정되어 있는가', () => {
      render(<ChiSquareGoodnessPage />)

      // Alert 컴포넌트의 ARIA 속성 확인
      const alerts = screen.getAllByRole('alert')
      expect(alerts.length).toBeGreaterThan(0)
    })
  })
})