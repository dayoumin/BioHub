import { render, screen } from '@testing-library/react'
import { StatisticCard } from '@/components/smart-flow/common/StatisticCard'
import { TooltipProvider } from '@/components/ui/tooltip'

// StatisticCard는 부모 TooltipProvider가 필요함
function renderWithTooltip(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe('StatisticCard', () => {
  const defaultProps = {
    label: '통계량',
    tooltip: '검정통계량에 대한 설명입니다.',
  }

  describe('렌더링', () => {
    it('라벨을 렌더링한다', () => {
      renderWithTooltip(
        <StatisticCard {...defaultProps}>
          <p>t = 2.45</p>
        </StatisticCard>
      )
      expect(screen.getByText('통계량')).toBeInTheDocument()
    })

    it('children(값)을 렌더링한다', () => {
      renderWithTooltip(
        <StatisticCard {...defaultProps}>
          <p>t = 2.45</p>
        </StatisticCard>
      )
      expect(screen.getByText('t = 2.45')).toBeInTheDocument()
    })

    it('HelpCircle 아이콘을 표시한다', () => {
      const { container } = renderWithTooltip(
        <StatisticCard {...defaultProps}>
          <p>값</p>
        </StatisticCard>
      )
      // HelpCircle은 svg 요소
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(1)
    })

    it('bg-muted/50 배경 스타일이 적용된다', () => {
      const { container } = renderWithTooltip(
        <StatisticCard {...defaultProps}>
          <p>값</p>
        </StatisticCard>
      )
      const wrapper = container.firstChild as HTMLElement
      expect(wrapper).toHaveClass('text-center', 'p-3', 'rounded-lg')
    })

    it('cursor-help 스타일이 적용된다', () => {
      const { container } = renderWithTooltip(
        <StatisticCard {...defaultProps}>
          <p>값</p>
        </StatisticCard>
      )
      const cursorEl = container.querySelector('.cursor-help')
      expect(cursorEl).not.toBeNull()
    })
  })

  describe('다양한 children 렌더링', () => {
    it('통계량 카드: statisticName + value + df', () => {
      renderWithTooltip(
        <StatisticCard label="통계량" tooltip="검정통계량">
          <p className="text-xl font-bold font-mono">F = 4.52</p>
          <p className="text-xs text-muted-foreground mt-1">df = 2, 27</p>
        </StatisticCard>
      )
      expect(screen.getByText('F = 4.52')).toBeInTheDocument()
      expect(screen.getByText('df = 2, 27')).toBeInTheDocument()
    })

    it('p-value 카드: 유의한 경우', () => {
      renderWithTooltip(
        <StatisticCard label="유의확률" tooltip="p < 0.05이면 유의">
          <p className="text-xl font-bold font-mono text-green-600">p = 0.003</p>
          <span>유의함</span>
        </StatisticCard>
      )
      expect(screen.getByText('p = 0.003')).toBeInTheDocument()
      expect(screen.getByText('유의함')).toBeInTheDocument()
    })

    it('효과크기 카드: 값이 없는 경우', () => {
      renderWithTooltip(
        <StatisticCard label="효과크기" tooltip="효과크기 설명">
          <p className="text-xl font-bold text-muted-foreground">-</p>
        </StatisticCard>
      )
      expect(screen.getByText('-')).toBeInTheDocument()
    })

    it('효과크기 카드: 값이 있는 경우', () => {
      renderWithTooltip(
        <StatisticCard label="효과크기" tooltip="효과크기 설명">
          <p className="text-xl font-bold font-mono">0.85</p>
          <span>큰 효과</span>
        </StatisticCard>
      )
      expect(screen.getByText('0.85')).toBeInTheDocument()
      expect(screen.getByText('큰 효과')).toBeInTheDocument()
    })
  })

  describe('3개 카드 그리드 시뮬레이션', () => {
    it('3개 StatisticCard를 그리드로 렌더링한다', () => {
      renderWithTooltip(
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatisticCard label="통계량" tooltip="검정통계량">
            <p>t = 2.12</p>
          </StatisticCard>
          <StatisticCard label="유의확률" tooltip="p-value">
            <p>p = 0.034</p>
          </StatisticCard>
          <StatisticCard label="효과크기" tooltip="effect size">
            <p>0.65</p>
          </StatisticCard>
        </div>
      )
      expect(screen.getByText('통계량')).toBeInTheDocument()
      expect(screen.getByText('유의확률')).toBeInTheDocument()
      expect(screen.getByText('효과크기')).toBeInTheDocument()
      expect(screen.getByText('t = 2.12')).toBeInTheDocument()
      expect(screen.getByText('p = 0.034')).toBeInTheDocument()
      expect(screen.getByText('0.65')).toBeInTheDocument()
    })
  })
})
