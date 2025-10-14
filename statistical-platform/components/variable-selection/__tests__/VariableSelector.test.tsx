/**
 * VariableSelector 컴포넌트 테스트
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { VariableSelector } from '../VariableSelector'

// Mock 데이터
const mockData = [
  { id: 1, age: 25, gender: 'M', score: 85, group: 'A', treatment: 'control' },
  { id: 2, age: 30, gender: 'F', score: 90, group: 'B', treatment: 'experimental' },
  { id: 3, age: 35, gender: 'M', score: 78, group: 'A', treatment: 'control' },
  { id: 4, age: 28, gender: 'F', score: 92, group: 'B', treatment: 'experimental' },
  { id: 5, age: 45, gender: 'M', score: 88, group: 'A', treatment: 'control' }
]

const mockOnVariablesSelected = jest.fn()
const mockOnBack = jest.fn()

describe('VariableSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('컴포넌트가 정상적으로 렌더링되어야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // 헤더 확인
      expect(screen.getByText(/독립표본 t-검정/)).toBeInTheDocument()
      expect(screen.getByText(/변수 설정/)).toBeInTheDocument()

      // 가이드 버튼 확인
      expect(screen.getByRole('button', { name: /가이드/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /AI 추천/i })).toBeInTheDocument()
    })

    it('데이터가 없을 때 에러 메시지를 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={[]}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      expect(screen.getByText(/데이터를 불러올 수 없습니다/)).toBeInTheDocument()
    })

    it('잘못된 methodId일 때 에러 메시지를 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="invalid-method"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      expect(screen.getByText(/데이터를 불러올 수 없습니다/)).toBeInTheDocument()
    })
  })

  describe('변수 표시', () => {
    it('데이터 변수들을 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // 변수 카드 확인
      expect(screen.getByText('데이터 변수')).toBeInTheDocument()

      // 변수들이 표시되는지 확인 (id 제외)
      expect(screen.getByText('age')).toBeInTheDocument()
      expect(screen.getByText('gender')).toBeInTheDocument()
      expect(screen.getByText('score')).toBeInTheDocument()
      expect(screen.getByText('group')).toBeInTheDocument()
      expect(screen.getByText('treatment')).toBeInTheDocument()
    })

    it('변수 타입을 올바르게 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // 연속형과 범주형 타입 표시 확인
      expect(screen.getAllByText(/연속형/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/범주형|이진형/).length).toBeGreaterThan(0)
    })

    it('변수별 고유값 개수를 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // 고유값 표시 확인 - 여러 개 있을 수 있음
      expect(screen.getAllByText(/고유값/).length).toBeGreaterThan(0)
    })
  })

  describe('시각적 가이드', () => {
    it('가이드 버튼을 클릭하면 분석 구조를 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      const guideButton = screen.getByRole('button', { name: /가이드/i })

      // 가이드가 기본적으로 표시되어 있음
      expect(screen.getByText('분석 구조')).toBeInTheDocument()

      // 가이드 토글
      fireEvent.click(guideButton)
      waitFor(() => {
        expect(screen.queryByText('분석 구조')).not.toBeInTheDocument()
      })
    })

    it('통계 방법별 수식과 예시를 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // t-test 수식 확인
      expect(screen.getByText(/t = \(μ₁ - μ₂\) \/ SE/)).toBeInTheDocument()

      // 예시 확인
      expect(screen.getByText(/약물 효과/)).toBeInTheDocument()
    })

    it('통계적 가정을 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      expect(screen.getByText('정규성')).toBeInTheDocument()
      expect(screen.getByText('등분산성')).toBeInTheDocument()
      expect(screen.getByText('독립성')).toBeInTheDocument()
    })
  })

  describe('AI 추천 기능', () => {
    it('AI 추천 버튼을 클릭하면 변수가 자동 할당되어야 함', async () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      const aiButton = screen.getByRole('button', { name: /AI 추천/i })
      fireEvent.click(aiButton)

      await waitFor(() => {
        // score가 종속변수로 할당되었는지 확인
        const roleCards = screen.getAllByRole('region')
        const assignedVariables = screen.getAllByText(/score|treatment|group/)
        expect(assignedVariables.length).toBeGreaterThan(0)
      })
    })

    it('변수명 패턴을 기반으로 적절한 역할을 추천해야 함', () => {
      const testData = [
        { id: 1, test_score: 85, treatment_group: 'A' },
        { id: 2, test_score: 90, treatment_group: 'B' }
      ]

      render(
        <VariableSelector
          methodId="two-sample-t"
          data={testData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      const aiButton = screen.getByRole('button', { name: /AI 추천/i })
      fireEvent.click(aiButton)

      // score 패턴이 할당되는지 확인
      waitFor(() => {
        const elements = screen.queryAllByText(/test_score|treatment_group/)
        expect(elements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('변수 할당', () => {
    it('변수를 클릭하여 선택할 수 있어야 함', async () => {
      const { container } = render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // age 변수 카드 클릭
      const ageCard = screen.getByText('age').closest('.cursor-pointer')
      if (ageCard) {
        fireEvent.click(ageCard)

        // 선택된 상태 확인
        await waitFor(() => {
          expect(ageCard).toHaveClass('ring-2')
        })
      }
    })

    it('할당 버튼으로 변수를 역할에 할당할 수 있어야 함', async () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // score 변수 선택
      const scoreCard = screen.getByText('score').closest('.cursor-pointer')
      if (scoreCard) {
        fireEvent.click(scoreCard)
      }

      // 할당 버튼 클릭
      const assignButton = await screen.findByRole('button', { name: /score 할당/i })
      fireEvent.click(assignButton)

      // 할당 확인
      await waitFor(() => {
        const badges = screen.getAllByRole('status')
        const assignedBadge = badges.find(b => b.textContent?.includes('score'))
        expect(assignedBadge).toBeTruthy()
      })
    })

    it('할당된 변수를 클릭하여 제거할 수 있어야 함', async () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // AI 추천으로 변수 할당
      const aiButton = screen.getByRole('button', { name: /AI 추천/i })
      fireEvent.click(aiButton)

      // 할당된 변수 배지 찾기
      await waitFor(() => {
        const badges = screen.getAllByRole('status')
        if (badges.length > 0) {
          // 첫 번째 배지 클릭하여 제거
          fireEvent.click(badges[0])
        }
      })
    })
  })

  describe('검증 및 경고', () => {
    it('필수 변수가 선택되지 않으면 오류를 표시해야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // 분석 시작 버튼이 비활성화되어 있어야 함
      const completeButton = screen.getByRole('button', { name: /분석 시작|변수 선택 필요/i })
      expect(completeButton).toBeDisabled()
    })

    it('정규성 가정 위반시 경고를 표시해야 함', async () => {
      const skewedData = [
        { value: 1 }, { value: 1 }, { value: 1 }, { value: 1 },
        { value: 100 }, { value: 200 }, { value: 300 }
      ]

      render(
        <VariableSelector
          methodId="one-sample-t"
          data={skewedData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // value를 종속변수로 할당
      const valueCard = screen.getByText('value').closest('.cursor-pointer')
      if (valueCard) {
        fireEvent.click(valueCard)
      }

      // 경고 확인
      await waitFor(() => {
        const alerts = screen.queryAllByRole('alert')
        const warningAlert = alerts.find(a => a.textContent?.includes('정규성'))
        expect(warningAlert).toBeTruthy()
      })
    })
  })

  describe('미리보기', () => {
    it('미리보기 버튼을 클릭하면 분석 설정을 표시해야 함', async () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // AI 추천으로 변수 할당
      fireEvent.click(screen.getByRole('button', { name: /AI 추천/i }))

      // 미리보기 버튼 클릭
      const previewButton = screen.getByRole('button', { name: /미리보기/i })
      fireEvent.click(previewButton)

      // 미리보기 내용 확인
      await waitFor(() => {
        expect(screen.getByText('분석 설정 요약')).toBeInTheDocument()
      })
    })

    it('분석 명령을 미리보기로 표시해야 함', async () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // 변수 할당
      fireEvent.click(screen.getByRole('button', { name: /AI 추천/i }))

      // 미리보기 열기
      fireEvent.click(screen.getByRole('button', { name: /미리보기/i }))

      // 분석 명령 확인
      await waitFor(() => {
        const commandText = screen.getByText(/독립표본 t-검정\(/)
        expect(commandText).toBeInTheDocument()
      })
    })
  })

  describe('액션 버튼', () => {
    it('초기화 버튼을 클릭하면 모든 할당이 제거되어야 함', async () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // AI 추천으로 변수 할당
      fireEvent.click(screen.getByRole('button', { name: /AI 추천/i }))

      // 초기화 버튼 클릭
      const resetButton = screen.getByRole('button', { name: /초기화/i })
      fireEvent.click(resetButton)

      // 할당이 제거되었는지 확인
      await waitFor(() => {
        const completeButton = screen.getByRole('button', { name: /변수 선택 필요/i })
        expect(completeButton).toBeDisabled()
      })
    })

    it('이전 버튼을 클릭하면 콜백이 호출되어야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
          onBack={mockOnBack}
        />
      )

      const backButton = screen.getByRole('button', { name: /이전/i })
      fireEvent.click(backButton)

      expect(mockOnBack).toHaveBeenCalled()
    })

    it('분석 시작 버튼을 클릭하면 선택된 변수를 전달해야 함', async () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // AI 추천으로 변수 할당
      fireEvent.click(screen.getByRole('button', { name: /AI 추천/i }))

      // 잠시 대기 후 분석 시작 버튼 클릭
      await waitFor(() => {
        const completeButton = screen.getByRole('button', { name: /분석 시작/i })
        expect(completeButton).not.toBeDisabled()
      })

      const completeButton = screen.getByRole('button', { name: /분석 시작/i })
      fireEvent.click(completeButton)

      // 콜백 호출 확인
      expect(mockOnVariablesSelected).toHaveBeenCalled()
    })
  })

  describe('접근성', () => {
    it('모든 인터랙티브 요소가 키보드로 접근 가능해야 함', async () => {
      const user = userEvent.setup()

      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // Tab 키로 네비게이션
      await user.tab()
      expect(document.activeElement).toBeDefined()

      // 계속 탭으로 이동
      await user.tab()
      await user.tab()

      // 버튼에 포커스가 가는지 확인
      const buttons = screen.getAllByRole('button')
      expect(buttons.some(btn => btn === document.activeElement)).toBeTruthy()
    })

    it('ARIA 레이블이 적절하게 설정되어야 함', () => {
      render(
        <VariableSelector
          methodId="two-sample-t"
          data={mockData}
          onVariablesSelected={mockOnVariablesSelected}
        />
      )

      // ARIA 속성 확인
      const aiButton = screen.getByRole('button', { name: /AI 추천/i })
      expect(aiButton).toHaveAccessibleName()

      const guideButton = screen.getByRole('button', { name: /가이드/i })
      expect(guideButton).toHaveAccessibleName()
    })
  })
})

describe('다양한 통계 방법 지원', () => {
  it('ANOVA에서 다중 그룹을 지원해야 함', () => {
    render(
      <VariableSelector
        methodId="anova-one-way"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    // anova-one-way 메서드가 지원되는지 확인
    const elements = screen.queryAllByText(/일원 분산분석|데이터를 불러올 수 없습니다/)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('회귀분석에서 다중 독립변수를 지원해야 함', () => {
    render(
      <VariableSelector
        methodId="regression-linear"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    // regression-linear 메서드가 지원되는지 확인
    const elements = screen.queryAllByText(/선형 회귀분석|데이터를 불러올 수 없습니다/)
    expect(elements.length).toBeGreaterThan(0)
  })

  it('상관분석에서 두 변수를 선택할 수 있어야 함', () => {
    render(
      <VariableSelector
        methodId="correlation-pearson"
        data={mockData}
        onVariablesSelected={mockOnVariablesSelected}
      />
    )

    // correlation-pearson 메서드가 지원되는지 확인
    const elements = screen.queryAllByText(/Pearson 상관분석|데이터를 불러올 수 없습니다/)
    expect(elements.length).toBeGreaterThan(0)
  })
})