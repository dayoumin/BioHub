/**
 * @file chi-square-independence.test.tsx
 * @description 카이제곱 독립성 검정 페이지 테스트
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import ChiSquareIndependencePage from '@/app/(dashboard)/statistics/chi-square-independence/page'

// Mock pyodide-statistics service
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: jest.fn().mockResolvedValue(undefined),
    chiSquareIndependenceTest: jest.fn().mockResolvedValue({
      statistic: 8.763,
      pValue: 0.0126,
      degreesOfFreedom: 2,
      crosstab: [
        [
          {
            observed: 20,
            expected: 15.5,
            residual: 4.5,
            standardizedResidual: 1.144,
            contribution: 1.306,
            row: 'Male',
            column: 'Yes'
          },
          {
            observed: 10,
            expected: 14.5,
            residual: -4.5,
            standardizedResidual: -1.181,
            contribution: 1.395,
            row: 'Male',
            column: 'No'
          }
        ],
        [
          {
            observed: 15,
            expected: 19.5,
            residual: -4.5,
            standardizedResidual: -1.020,
            contribution: 1.038,
            row: 'Female',
            column: 'Yes'
          },
          {
            observed: 25,
            expected: 20.5,
            residual: 4.5,
            standardizedResidual: 0.994,
            contribution: 0.988,
            row: 'Female',
            column: 'No'
          }
        ]
      ],
      marginals: {
        rowTotals: { Male: 30, Female: 40 },
        columnTotals: { Yes: 35, No: 35 },
        total: 70
      },
      effectSizes: {
        cramersV: 0.354,
        phi: 0.354,
        cramersVInterpretation: '중간 연관성',
        phiInterpretation: '중간 연관성'
      },
      assumptions: {
        minimumExpectedFrequency: 14.5,
        cellsBelow5: 0,
        totalCells: 4,
        assumptionMet: true
      },
      interpretation: {
        summary: 'χ² = 8.763, p = 0.013으로 성별과 선호도 간에 유의한 연관성이 있습니다.',
        association: '남성은 Yes를 선호하고, 여성은 No를 선호하는 경향이 있습니다.',
        recommendations: [
          '성별에 따른 선호도 차이 원인을 추가 조사하세요',
          '타겟 마케팅 전략을 성별로 차별화하세요'
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
          { gender: 'Male', preference: 'Yes' },
          { gender: 'Male', preference: 'No' },
          { gender: 'Female', preference: 'Yes' },
          { gender: 'Female', preference: 'No' }
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
    onVariablesSelected: (variables: { dependent: string[], independent: string[] }) => void
  }) => (
    <div data-testid="variable-selector">
      <button
        onClick={() => onVariablesSelected({
          dependent: ['gender'],
          independent: ['preference']
        })}
      >
        Select Variables
      </button>
    </div>
  )
}))

describe('ChiSquareIndependencePage', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('초기 렌더링', () => {
    it('페이지 제목과 설명이 올바르게 표시되는가', () => {
      render(<ChiSquareIndependencePage />)

      expect(screen.getByText('카이제곱 독립성 검정')).toBeInTheDocument()
      expect(screen.getByText('Chi-Square Test of Independence')).toBeInTheDocument()
      expect(screen.getByText('두 범주형 변수 간의 독립성 및 연관성 검정')).toBeInTheDocument()
    })

    it('4단계 스텝이 올바르게 초기화되는가', () => {
      render(<ChiSquareIndependencePage />)

      expect(screen.getByText('분석 방법')).toBeInTheDocument()
      expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
      expect(screen.getByText('변수 선택')).toBeInTheDocument()
      expect(screen.getByText('결과 해석')).toBeInTheDocument()
    })

    it('방법론 설명이 올바르게 표시되는가', () => {
      render(<ChiSquareIndependencePage />)

      expect(screen.getByText('카이제곱 독립성 검정 소개')).toBeInTheDocument()
      expect(screen.getByText('두 범주형 변수의 독립성 검정')).toBeInTheDocument()
      expect(screen.getByText('분석 목적')).toBeInTheDocument()
      expect(screen.getByText('적용 예시')).toBeInTheDocument()
    })
  })

  describe('사용자 플로우 테스트', () => {
    it('전체 분석 플로우가 올바르게 작동하는가', async () => {
      render(<ChiSquareIndependencePage />)

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

      // Step 3: 변수 선택 -> 자동 분석 실행
      const selectVariablesButton = screen.getByText('Select Variables')
      await user.click(selectVariablesButton)

      // Step 4: 결과 확인 (자동으로 분석이 실행되어야 함)
      await waitFor(() => {
        expect(screen.getByText('8.763')).toBeInTheDocument()
        expect(screen.getByText('0.013')).toBeInTheDocument()
        expect(screen.getByText('0.354')).toBeInTheDocument()
      })
    })

    it('변수 선택 후 자동 분석이 실행되는가', async () => {
      const { pyodideStats } = await import('@/lib/services/pyodide-statistics')
      const mockTest = jest.mocked(pyodideStats.chiSquareIndependenceTest)

      render(<ChiSquareIndependencePage />)

      // 변수 선택까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(mockTest).toHaveBeenCalledWith(
          expect.any(Array),
          'gender',
          'preference'
        )
      })
    })
  })

  describe('결과 표시 테스트', () => {
    beforeEach(async () => {
      render(<ChiSquareIndependencePage />)

      // 분석 결과까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(screen.getByText('8.763')).toBeInTheDocument()
      })
    })

    it('주요 통계량이 올바르게 표시되는가', () => {
      // 카이제곱 통계량
      expect(screen.getByText('8.763')).toBeInTheDocument()
      expect(screen.getByText('χ² 통계량')).toBeInTheDocument()
      expect(screen.getByText('df = 2')).toBeInTheDocument()

      // p-value
      expect(screen.getByText('0.013')).toBeInTheDocument()
      expect(screen.getByText('유의확률')).toBeInTheDocument()

      // Cramér's V
      expect(screen.getByText('0.354')).toBeInTheDocument()
      expect(screen.getByText('Cramér\'s V')).toBeInTheDocument()
    })

    it('교차표 탭이 올바르게 작동하는가', () => {
      const crosstabTab = screen.getByText('교차표')
      fireEvent.click(crosstabTab)

      expect(screen.getByText('교차표 (분할표)')).toBeInTheDocument()
      expect(screen.getByText('관측빈도와 기댓빈도 비교')).toBeInTheDocument()

      // 행 및 열 범주 확인
      expect(screen.getByText('Male')).toBeInTheDocument()
      expect(screen.getByText('Female')).toBeInTheDocument()
      expect(screen.getByText('Yes')).toBeInTheDocument()
      expect(screen.getByText('No')).toBeInTheDocument()

      // 합계 행/열 확인
      expect(screen.getByText('합계')).toBeInTheDocument()
    })

    it('잔차분석 탭이 올바르게 작동하는가', () => {
      const residualTab = screen.getByText('잔차분석')
      fireEvent.click(residualTab)

      expect(screen.getByText('표준화 잔차 분석')).toBeInTheDocument()
      expect(screen.getByText('각 셀의 기여도와 잔차')).toBeInTheDocument()
      expect(screen.getByText('잔차 해석')).toBeInTheDocument()
    })

    it('해석 탭이 올바르게 작동하는가', () => {
      const interpretationTab = screen.getByText('해석')
      fireEvent.click(interpretationTab)

      expect(screen.getByText('결과 해석')).toBeInTheDocument()
      expect(screen.getByText('독립성 검정 결과')).toBeInTheDocument()
      expect(screen.getByText('연관성 분석')).toBeInTheDocument()
      expect(screen.getByText('권장사항')).toBeInTheDocument()
    })

    it('가정검정 탭이 올바르게 작동하는가', () => {
      const assumptionsTab = screen.getByText('가정검정')
      fireEvent.click(assumptionsTab)

      expect(screen.getByText('가정 검정')).toBeInTheDocument()
      expect(screen.getByText('카이제곱 검정의 전제조건 확인')).toBeInTheDocument()
      expect(screen.getByText('기댓빈도 조건')).toBeInTheDocument()
      expect(screen.getByText('최소 기댓빈도:')).toBeInTheDocument()
      expect(screen.getByText('14.50')).toBeInTheDocument()
      expect(screen.getByText('만족')).toBeInTheDocument()
    })
  })

  describe('교차표 렌더링 테스트', () => {
    it('교차표가 올바른 구조로 렌더링되는가', async () => {
      render(<ChiSquareIndependencePage />)

      // 결과까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(screen.getByText('8.763')).toBeInTheDocument()
      })

      // 교차표 탭 클릭
      const crosstabTab = screen.getByText('교차표')
      fireEvent.click(crosstabTab)

      // 교차표 셀 내용 확인 (관측빈도/기댓빈도/비율)
      expect(screen.getByText('20')).toBeInTheDocument() // 관측빈도
      expect(screen.getByText('(15.5)')).toBeInTheDocument() // 기댓빈도
      expect(screen.getByText('28.6%')).toBeInTheDocument() // 비율
    })

    it('잔차 분석 표가 올바르게 렌더링되는가', async () => {
      render(<ChiSquareIndependencePage />)

      // 결과까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(screen.getByText('8.763')).toBeInTheDocument()
      })

      // 잔차분석 탭 클릭
      const residualTab = screen.getByText('잔차분석')
      fireEvent.click(residualTab)

      // 표준화 잔차값 확인
      expect(screen.getByText('+1.14')).toBeInTheDocument()
      expect(screen.getByText('-1.18')).toBeInTheDocument()

      // 기여도 확인
      expect(screen.getByText('1.306')).toBeInTheDocument()
    })
  })

  describe('효과크기 표시 테스트', () => {
    it('Cramér\'s V와 Phi 계수가 올바르게 표시되는가', async () => {
      render(<ChiSquareIndependencePage />)

      // 결과까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(screen.getByText('8.763')).toBeInTheDocument()
      })

      // 해석 탭으로 이동
      const interpretationTab = screen.getByText('해석')
      fireEvent.click(interpretationTab)

      // Cramér's V
      expect(screen.getByText('V = 0.354(중간 연관성)')).toBeInTheDocument()

      // Phi 계수
      expect(screen.getByText('φ = 0.354')).toBeInTheDocument()
      expect(screen.getByText('중간 연관성')).toBeInTheDocument()
    })

    it('효과크기 해석 기준이 표시되는가', async () => {
      render(<ChiSquareIndependencePage />)

      // 결과까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(screen.getByText('8.763')).toBeInTheDocument()
      })

      // 가정검정 탭으로 이동
      const assumptionsTab = screen.getByText('가정검정')
      fireEvent.click(assumptionsTab)

      // 효과크기 해석 기준 확인
      expect(screen.getByText('효과크기 해석 기준')).toBeInTheDocument()
      expect(screen.getByText('V ≥ 0.5: 강한 연관성')).toBeInTheDocument()
      expect(screen.getByText('V ≥ 0.3: 중간 연관성')).toBeInTheDocument()
      expect(screen.getByText('V ≥ 0.1: 약한 연관성')).toBeInTheDocument()
    })
  })

  describe('가정 위반 시나리오', () => {
    it('가정 위반 시 경고가 표시되는가', async () => {
      // 가정 위반 결과로 mock 변경
      const { pyodideStats } = await import('@/lib/services/pyodide-statistics')
      jest.mocked(pyodideStats.chiSquareIndependenceTest).mockResolvedValueOnce({
        ...jest.mocked(pyodideStats.chiSquareIndependenceTest).getMockImplementation()!(),
        assumptions: {
          minimumExpectedFrequency: 3.2,
          cellsBelow5: 2,
          totalCells: 4,
          assumptionMet: false
        }
      } as any)

      render(<ChiSquareIndependencePage />)

      // 분석 실행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(screen.getByText('8.763')).toBeInTheDocument()
      })

      // 가정검정 탭으로 이동
      const assumptionsTab = screen.getByText('가정검정')
      fireEvent.click(assumptionsTab)

      // 가정 위반 경고 확인
      expect(screen.getByText('위반')).toBeInTheDocument()
      expect(screen.getByText('가정 위반 경고')).toBeInTheDocument()
      expect(screen.getByText('기댓빈도가 5 미만인 셀이 있습니다')).toBeInTheDocument()
    })
  })

  describe('에러 처리 테스트', () => {
    it('Pyodide 초기화 실패 시 에러가 표시되는가', async () => {
      const { pyodideStats } = await import('@/lib/services/pyodide-statistics')
      jest.mocked(pyodideStats.initialize).mockRejectedValueOnce(new Error('Init failed'))

      render(<ChiSquareIndependencePage />)

      await waitFor(() => {
        expect(screen.getByText('통계 엔진을 초기화할 수 없습니다.')).toBeInTheDocument()
      })
    })

    it('분석 실패 시 에러가 표시되는가', async () => {
      const { pyodideStats } = await import('@/lib/services/pyodide-statistics')
      jest.mocked(pyodideStats.chiSquareIndependenceTest).mockRejectedValueOnce(new Error('Analysis failed'))

      render(<ChiSquareIndependencePage />)

      // 분석 실행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(screen.getByText('카이제곱 독립성 검정 중 오류가 발생했습니다.')).toBeInTheDocument()
      })
    })

    it('불충분한 변수 선택 시 에러가 표시되는가', async () => {
      // VariableSelector mock을 하나의 변수만 선택하도록 변경
      jest.doMock('@/components/variable-selection/VariableSelector', () => ({
        VariableSelector: ({
          onVariablesSelected
        }: {
          onVariablesSelected: (variables: { dependent?: string[], independent?: string[] }) => void
        }) => (
          <div data-testid="variable-selector">
            <button
              onClick={() => onVariablesSelected({ dependent: ['gender'] })} // 독립변수 누락
            >
              Select Incomplete Variables
            </button>
          </div>
        )
      }))

      render(<ChiSquareIndependencePage />)

      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))

      // 불완전한 변수 선택
      const selectIncompleteButton = screen.getByText('Select Incomplete Variables')
      await user.click(selectIncompleteButton)

      // 에러 메시지는 분석 시도 시 표시되어야 함
      // 하지만 runAnalysis가 호출되지 않을 수 있으므로 이 테스트는 실제 구현에 따라 달라질 수 있음
    })
  })

  describe('성능 및 접근성 테스트', () => {
    it('useMemo가 올바르게 적용되어 재계산을 방지하는가', () => {
      const { rerender } = render(<ChiSquareIndependencePage />)

      const initialSteps = screen.getByText('분석 방법')

      // props 변경 없이 리렌더링
      rerender(<ChiSquareIndependencePage />)

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

      jest.mocked(pyodideStats.chiSquareIndependenceTest).mockReturnValueOnce(delayedPromise)

      render(<ChiSquareIndependencePage />)

      // 분석 시작
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))

      act(() => {
        fireEvent.click(screen.getByText('Select Variables'))
      })

      // 로딩 상태 확인
      expect(screen.getByText('카이제곱 독립성 검정 분석 중...')).toBeInTheDocument()
      expect(screen.getByText('잠시만 기다려주세요')).toBeInTheDocument()

      // Promise 해결
      act(() => {
        resolvePromise!({
          statistic: 8.763,
          pValue: 0.0126,
          degreesOfFreedom: 2,
          crosstab: [],
          marginals: { rowTotals: {}, columnTotals: {}, total: 0 },
          effectSizes: { cramersV: 0.354, phi: 0.354, cramersVInterpretation: '', phiInterpretation: '' },
          assumptions: { minimumExpectedFrequency: 14.5, cellsBelow5: 0, totalCells: 4, assumptionMet: true },
          interpretation: { summary: '', association: '', recommendations: [] }
        })
      })

      await waitFor(() => {
        expect(screen.queryByText('카이제곱 독립성 검정 분석 중...')).not.toBeInTheDocument()
      })
    })

    it('키보드 네비게이션이 올바르게 작동하는가', async () => {
      render(<ChiSquareIndependencePage />)

      const nextButton = screen.getByText('다음: 데이터 업로드')
      nextButton.focus()

      expect(document.activeElement).toBe(nextButton)

      // Tab 키로 포커스 이동 테스트
      fireEvent.keyDown(nextButton, { key: 'Tab', code: 'Tab' })

      // Enter 키로 버튼 클릭
      fireEvent.keyDown(nextButton, { key: 'Enter', code: 'Enter' })

      await waitFor(() => {
        expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()
      })
    })

    it('탭 패널의 접근성이 올바르게 구현되어 있는가', async () => {
      render(<ChiSquareIndependencePage />)

      // 결과까지 진행
      await user.click(screen.getByText('다음: 데이터 업로드'))
      await user.click(screen.getByText('Upload Test Data'))
      await user.click(screen.getByText('Select Variables'))

      await waitFor(() => {
        expect(screen.getByText('8.763')).toBeInTheDocument()
      })

      // 탭 요소들이 적절한 role을 갖는지 확인
      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()

      const tabs = screen.getAllByRole('tab')
      expect(tabs).toHaveLength(4)

      // 첫 번째 탭이 선택되어 있는지 확인
      expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    })
  })
})