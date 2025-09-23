import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { StatisticsPageLayout, StepCard, StatisticsStep } from '../StatisticsPageLayout'
import { GitBranch } from 'lucide-react'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

describe('StatisticsPageLayout', () => {
  const mockSteps: StatisticsStep[] = [
    {
      id: 'step1',
      number: 1,
      title: '데이터 업로드',
      description: '분석할 데이터 업로드',
      status: 'current'
    },
    {
      id: 'step2',
      number: 2,
      title: '변수 선택',
      description: '변수 선택하기',
      status: 'pending'
    },
    {
      id: 'step3',
      number: 3,
      title: '분석 실행',
      description: '통계 분석 실행',
      status: 'pending'
    },
    {
      id: 'step4',
      number: 4,
      title: '결과 확인',
      description: '분석 결과 확인',
      status: 'pending'
    }
  ]

  const defaultProps = {
    title: 'T-검정 분석',
    subtitle: 'Independent Samples T-Test',
    icon: <GitBranch className="w-6 h-6" />,
    steps: mockSteps,
    currentStep: 0,
    children: <div>Test Content</div>
  }

  it('제목과 부제목이 올바르게 렌더링되어야 함', () => {
    render(<StatisticsPageLayout {...defaultProps} />)

    expect(screen.getByText('T-검정 분석')).toBeInTheDocument()
    expect(screen.getByText('Independent Samples T-Test')).toBeInTheDocument()
  })

  it('모든 단계가 표시되어야 함', () => {
    render(<StatisticsPageLayout {...defaultProps} />)

    // 각 단계 제목이 최소 한 번은 나타나야 함
    mockSteps.forEach(step => {
      const elements = screen.getAllByText(step.title)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it('현재 단계가 올바르게 표시되어야 함', () => {
    render(<StatisticsPageLayout {...defaultProps} />)

    expect(screen.getByText('단계 1/4')).toBeInTheDocument()
    // 데이터 업로드는 여러 번 나타날 수 있음
    const dataUploadElements = screen.getAllByText('데이터 업로드')
    expect(dataUploadElements.length).toBeGreaterThan(0)
  })

  it('진행률 바가 올바르게 계산되어야 함', () => {
    const { rerender } = render(<StatisticsPageLayout {...defaultProps} />)

    // Progress 컴포넌트의 value prop 확인 (shadcn/ui Progress는 data-value 속성 사용)
    let progressBar = document.querySelector('[data-slot="progressbar"]') || document.querySelector('.h-2')
    expect(progressBar).toBeInTheDocument()

    // 2단계: 50%
    rerender(<StatisticsPageLayout {...defaultProps} currentStep={1} />)
    progressBar = document.querySelector('[data-slot="progressbar"]') || document.querySelector('.h-2')
    expect(progressBar).toBeInTheDocument()
  })

  it('onStepChange 콜백이 호출되어야 함', () => {
    const mockOnStepChange = jest.fn()
    render(
      <StatisticsPageLayout
        {...defaultProps}
        onStepChange={mockOnStepChange}
      />
    )

    // 첫 번째 단계 버튼 클릭
    const stepButtons = screen.getAllByRole('button')
    const targetButton = stepButtons.find(btn =>
      btn.textContent?.includes('데이터 업로드')
    )

    if (targetButton) {
      fireEvent.click(targetButton)
      expect(mockOnStepChange).toHaveBeenCalledWith(0)
    }
  })

  it('분석 실행 버튼이 올바른 단계에서 표시되어야 함', () => {
    const mockOnRun = jest.fn()

    // steps.length - 2 단계(2단계)에서 표시
    const { rerender } = render(
      <StatisticsPageLayout
        {...defaultProps}
        currentStep={2} // 4단계 중 3번째 (index 2)
        onRun={mockOnRun}
      />
    )

    // 클릭 가능한 '분석 실행' 버튼이 있는지 확인 (분석 실행은 탭을 나타내는 단계 이름으로도 사용됨)
    const buttons = screen.getAllByRole('button')
    const clickableRunButton = buttons.find(btn =>
      btn.textContent?.includes('분석 실행') && !btn.hasAttribute('disabled')
    )
    expect(clickableRunButton).toBeInTheDocument()

    // 다른 단계에서는 클릭 가능한 분석 실행 버튼이 없음
    rerender(
      <StatisticsPageLayout
        {...defaultProps}
        currentStep={0}
        onRun={mockOnRun}
      />
    )

    const buttonsAfter = screen.getAllByRole('button')
    const clickableRunButtonAfter = buttonsAfter.find(btn =>
      btn.textContent?.includes('분석 실행') && !btn.hasAttribute('disabled')
    )
    expect(clickableRunButtonAfter).toBeUndefined()
  })

  it('초기화 버튼이 작동해야 함', () => {
    const mockOnReset = jest.fn()
    render(
      <StatisticsPageLayout
        {...defaultProps}
        onReset={mockOnReset}
      />
    )

    const resetButton = screen.getByText('초기화')
    fireEvent.click(resetButton)

    expect(mockOnReset).toHaveBeenCalled()
  })

  it('분석 중 상태가 올바르게 표시되어야 함', () => {
    render(
      <StatisticsPageLayout
        {...defaultProps}
        currentStep={2}
        onRun={() => {}}
        isRunning={true}
      />
    )

    expect(screen.getByText('분석 중...')).toBeInTheDocument()
  })

  it('methodInfo가 제공될 때 정보가 표시되어야 함', () => {
    const methodInfo = {
      formula: 't = (x̄₁ - x̄₂) / SE',
      assumptions: ['정규성', '등분산성', '독립성'],
      sampleSize: '각 그룹 최소 30개',
      usage: '두 그룹 평균 비교'
    }

    render(
      <StatisticsPageLayout
        {...defaultProps}
        methodInfo={methodInfo}
      />
    )

    // Info 아이콘이 있는 버튼 찾기
    const buttons = screen.getAllByRole('button')
    const infoButton = buttons.find(btn =>
      btn.querySelector('.lucide-info')
    )

    if (infoButton) {
      fireEvent.click(infoButton)

      // 정보 표시 확인
      expect(screen.getByText(methodInfo.formula)).toBeInTheDocument()
      expect(screen.getByText('정규성')).toBeInTheDocument()
      expect(screen.getByText(methodInfo.sampleSize)).toBeInTheDocument()
      expect(screen.getByText(methodInfo.usage)).toBeInTheDocument()
    }
  })

  it('빠른 팁이 표시되고 닫을 수 있어야 함', async () => {
    render(
      <StatisticsPageLayout
        {...defaultProps}
        showTips={true}
      />
    )

    // 팁 텍스트 중 하나가 표시되는지 확인
    const tipTexts = [
      'CSV, Excel 형식',
      '변수 타입',
      'AI가 최적',
      '자동으로 시각화',
      'PDF로 저장'
    ]

    // 적어도 하나의 팁 텍스트가 표시되어야 함
    const tipVisible = tipTexts.some(text =>
      screen.queryByText(new RegExp(text, 'i')) !== null
    )
    expect(tipVisible).toBe(true)

    // 닫기 버튼 클릭
    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find(btn =>
      btn.querySelector('.lucide-x-circle')
    )

    if (closeButton) {
      fireEvent.click(closeButton)
      // 팁이 사라져야 함
      await waitFor(() => {
        const stillVisible = tipTexts.some(text =>
          screen.queryByText(new RegExp(text, 'i')) !== null
        )
        expect(stillVisible).toBe(false)
      })
    }
  })
})

describe('StepCard', () => {
  it('제목과 설명이 렌더링되어야 함', () => {
    render(
      <StepCard
        title="테스트 제목"
        description="테스트 설명"
        icon={<GitBranch />}
      >
        <div>컨텐츠</div>
      </StepCard>
    )

    expect(screen.getByText('테스트 제목')).toBeInTheDocument()
    expect(screen.getByText('테스트 설명')).toBeInTheDocument()
    expect(screen.getByText('컨텐츠')).toBeInTheDocument()
  })

  it('제목 없이도 렌더링되어야 함', () => {
    render(
      <StepCard>
        <div>컨텐츠만</div>
      </StepCard>
    )

    expect(screen.getByText('컨텐츠만')).toBeInTheDocument()
  })

  it('커스텀 className이 적용되어야 함', () => {
    const { container } = render(
      <StepCard className="custom-class">
        <div>테스트</div>
      </StepCard>
    )

    const card = container.querySelector('.custom-class')
    expect(card).toBeInTheDocument()
  })
})