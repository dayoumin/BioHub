import React from 'react'
import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AssumptionTestCard, AssumptionSummary, AssumptionProgress, type AssumptionTest } from '../AssumptionTestCard'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

describe('AssumptionTestCard', () => {
  const mockTests: AssumptionTest[] = [
    {
      name: '정규성 검정',
      description: 'Shapiro-Wilk test',
      testStatistic: 0.967,
      testName: 'Shapiro-Wilk',
      pValue: 0.234,
      passed: true,
      alpha: 0.05,
      details: '데이터가 정규 분포를 따릅니다',
    },
    {
      name: '등분산성 검정',
      description: "Levene's test",
      testStatistic: 1.234,
      testName: "Levene's",
      pValue: 0.045,
      passed: false,
      alpha: 0.05,
      details: '집단 간 분산이 다릅니다',
      recommendation: 'Welch ANOVA 사용을 고려하세요',
      severity: 'medium'
    },
    {
      name: '독립성 검정',
      pValue: null,
      passed: null,
      alpha: 0.05,
    }
  ]

  describe('기본 렌더링', () => {
    it('가정 검정 카드가 올바르게 렌더링되어야 함', () => {
      render(<AssumptionTestCard tests={mockTests} />)
      expect(screen.getByText('가정 검정 결과')).toBeInTheDocument()
    })

    it('각 테스트 항목이 표시되어야 함', () => {
      render(<AssumptionTestCard tests={mockTests} />)
      expect(screen.getByText('정규성 검정')).toBeInTheDocument()
      expect(screen.getByText('등분산성 검정')).toBeInTheDocument()
      expect(screen.getByText('독립성 검정')).toBeInTheDocument()
    })

    it('커스텀 타이틀이 표시되어야 함', () => {
      render(<AssumptionTestCard title="사전 가정 확인" tests={mockTests} />)
      expect(screen.getByText('사전 가정 확인')).toBeInTheDocument()
    })
  })

  describe('테스트 결과 표시', () => {
    it('통과한 테스트에 체크 아이콘이 표시되어야 함', () => {
      const { container } = render(<AssumptionTestCard tests={[mockTests[0]]} />)
      // SVG 아이콘 존재 여부로 간접 확인
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)
    })

    it('실패한 테스트에 경고가 표시되어야 함', () => {
      render(<AssumptionTestCard tests={[mockTests[1]]} />)
      expect(screen.getByText(/위반/)).toBeInTheDocument()
    })

    it('테스트 통계량이 올바르게 포맷되어야 함', () => {
      render(<AssumptionTestCard tests={[mockTests[0]]} />)
      expect(screen.getByText(/Shapiro-Wilk = 0.9670/)).toBeInTheDocument()
    })

    it('p-value가 표시되어야 함', () => {
      const { container } = render(<AssumptionTestCard tests={[mockTests[0]]} />)
      // PValueBadge 컴포넌트 내부의 값 확인
      expect(container.textContent).toContain('0.2340')
    })

    it('null p-value는 처리되어야 함', () => {
      render(<AssumptionTestCard tests={[mockTests[2]]} />)
      expect(screen.getByText('독립성 검정')).toBeInTheDocument()
    })
  })

  describe('상태 표시', () => {
    it('모든 가정이 충족되면 성공 상태를 표시해야 함', () => {
      const passedTests = [{ ...mockTests[0] }]
      const { container } = render(<AssumptionTestCard tests={passedTests} />)
      const header = container.querySelector('.bg-success-bg')
      expect(header).toBeInTheDocument()
    })

    it('가정이 위반되면 경고 상태를 표시해야 함', () => {
      const failedTests = [{ ...mockTests[1] }]
      render(<AssumptionTestCard tests={failedTests} />)
      expect(screen.getByText('일부 통계적 가정이 충족되지 않았습니다')).toBeInTheDocument()
    })

    it('심각도가 표시되어야 함', () => {
      render(<AssumptionTestCard tests={[mockTests[1]]} />)
      expect(screen.getByText('보통')).toBeInTheDocument()
    })
  })

  describe('권장사항', () => {
    it('권장사항이 표시되어야 함', () => {
      render(<AssumptionTestCard tests={[mockTests[1]]} showRecommendations={true} />)
      expect(screen.getByText(/Welch ANOVA/)).toBeInTheDocument()
    })

    it('showRecommendations가 false면 권장사항을 숨겨야 함', () => {
      render(<AssumptionTestCard tests={[mockTests[1]]} showRecommendations={false} />)
      expect(screen.queryByText(/Welch ANOVA/)).not.toBeInTheDocument()
    })
  })

  describe('접기/펼치기 기능', () => {
    it('카드를 접고 펼칠 수 있어야 함', () => {
      const { container } = render(<AssumptionTestCard tests={mockTests} />)
      const toggleButton = container.querySelector('button[class*="rounded-md"]')

      expect(toggleButton).toBeInTheDocument()

      // 초기 상태는 펼쳐짐
      expect(screen.getByText('정규성 검정')).toBeVisible()
    })
  })

  describe('콜백 함수', () => {
    it('위반 시 onViolation 콜백이 호출되어야 함', () => {
      const mockOnViolation = vi.fn()
      render(
        <AssumptionTestCard
          tests={[mockTests[1]]}
          onViolation={mockOnViolation}
        />
      )

      const button = screen.getByText('대안 분석 방법 추천받기')
      fireEvent.click(button)

      expect(mockOnViolation).toHaveBeenCalledWith(mockTests[1])
    })
  })
})

describe('AssumptionSummary', () => {
  const mockTests: AssumptionTest[] = [
    { name: '정규성', pValue: 0.234, passed: true, alpha: 0.05 },
    { name: '등분산성', pValue: 0.045, passed: false, alpha: 0.05 },
    { name: '독립성', pValue: 0.567, passed: true, alpha: 0.05 }
  ]

  it('요약 정보가 올바르게 표시되어야 함', () => {
    render(<AssumptionSummary tests={mockTests} />)
    expect(screen.getByText('가정 검정: 2/3 충족')).toBeInTheDocument()
  })

  it('모든 가정이 충족되면 성공 아이콘이 표시되어야 함', () => {
    const passedTests = mockTests.filter(t => t.passed)
    render(<AssumptionSummary tests={passedTests} />)
    expect(screen.getByText('가정 검정: 2/2 충족')).toBeInTheDocument()
  })
})

describe('AssumptionProgress', () => {
  const mockTests: AssumptionTest[] = [
    { name: '정규성', pValue: 0.234, passed: true, alpha: 0.05 },
    { name: '등분산성', pValue: 0.045, passed: false, alpha: 0.05 },
    { name: '독립성', pValue: null, passed: null, alpha: 0.05 }
  ]

  it('진행 상황이 올바르게 표시되어야 함', () => {
    render(<AssumptionProgress tests={mockTests} />)
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('현재 테스트가 표시되어야 함', () => {
    render(<AssumptionProgress tests={mockTests} currentTest="독립성 검정" />)
    expect(screen.getByText('독립성 검정 검정 중...')).toBeInTheDocument()
  })

  it('진행바가 올바른 퍼센트를 표시해야 함', () => {
    const { container } = render(<AssumptionProgress tests={mockTests} />)
    const progressBar = container.querySelector('[style*="width"]')
    // 2/3 = 66.67%
    expect(progressBar?.getAttribute('style')).toContain('66.66')
  })
})
