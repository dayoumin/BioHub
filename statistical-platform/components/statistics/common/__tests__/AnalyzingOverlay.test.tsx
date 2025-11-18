import { render, screen } from '@testing-library/react'
import { AnalyzingOverlay } from '../AnalyzingOverlay'

describe('AnalyzingOverlay', () => {
  it('isAnalyzing이 false일 때 렌더링하지 않아야 함', () => {
    const { container } = render(<AnalyzingOverlay isAnalyzing={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('isAnalyzing이 true일 때 오버레이를 표시해야 함', () => {
    render(<AnalyzingOverlay isAnalyzing={true} />)

    // 오버레이가 렌더링되어야 함
    const overlay = screen.getByText('통계 분석 중...')
    expect(overlay).toBeInTheDocument()

    // 설명 텍스트도 표시되어야 함
    expect(screen.getByText('Python 통계 엔진으로 분석하고 있습니다')).toBeInTheDocument()
  })

  it('기본 메시지를 표시해야 함', () => {
    render(<AnalyzingOverlay isAnalyzing={true} />)

    expect(screen.getByText('통계 분석 중...')).toBeInTheDocument()
  })

  it('커스텀 메시지를 표시해야 함', () => {
    render(<AnalyzingOverlay isAnalyzing={true} message="회귀 분석 실행 중..." />)

    expect(screen.getByText('회귀 분석 실행 중...')).toBeInTheDocument()
  })

  it('로딩 아이콘(Loader2)을 렌더링해야 함', () => {
    const { container } = render(<AnalyzingOverlay isAnalyzing={true} />)

    // Loader2 아이콘이 있는지 확인 (lucide-react의 svg)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveClass('animate-spin')
  })

  it('올바른 CSS 클래스를 가져야 함', () => {
    const { container } = render(<AnalyzingOverlay isAnalyzing={true} />)

    // 최상위 div가 absolute positioning + z-50
    const overlay = container.firstChild as HTMLElement
    expect(overlay).toHaveClass('absolute', 'inset-0', 'z-50')

    // backdrop-blur 효과
    expect(overlay).toHaveClass('backdrop-blur-sm')

    // 중앙 정렬
    expect(overlay).toHaveClass('flex', 'items-center', 'justify-center')
  })

  it('애니메이션 클래스를 가져야 함', () => {
    const { container } = render(<AnalyzingOverlay isAnalyzing={true} />)

    const overlay = container.firstChild as HTMLElement
    expect(overlay).toHaveClass('animate-in', 'fade-in')

    // 중앙 카드
    const card = overlay.querySelector('.bg-card')
    expect(card).toHaveClass('animate-in', 'zoom-in-95')
  })

  it('3개의 진행 점을 렌더링해야 함', () => {
    const { container } = render(<AnalyzingOverlay isAnalyzing={true} />)

    // w-2 h-2 bg-primary rounded-full animate-bounce 클래스를 가진 div
    const dots = container.querySelectorAll('.animate-bounce')
    expect(dots).toHaveLength(3)
  })

  it('진행 점이 순차적 애니메이션 딜레이를 가져야 함', () => {
    const { container } = render(<AnalyzingOverlay isAnalyzing={true} />)

    const dots = container.querySelectorAll('.animate-bounce')

    expect(dots[0]).toHaveStyle({ animationDelay: '0ms' })
    expect(dots[1]).toHaveStyle({ animationDelay: '150ms' })
    expect(dots[2]).toHaveStyle({ animationDelay: '300ms' })
  })

  it('외부 링, 스피너, 내부 펄스가 모두 렌더링되어야 함', () => {
    const { container } = render(<AnalyzingOverlay isAnalyzing={true} />)

    // 외부 링 (border-4 border-primary/20 animate-pulse)
    const outerRing = container.querySelector('.animate-pulse')
    expect(outerRing).toBeInTheDocument()
    expect(outerRing).toHaveStyle({ width: '80px', height: '80px' })

    // 스피너 (Loader2 - animate-spin)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()

    // 내부 펄스 (animate-ping)
    const innerPulse = container.querySelector('.animate-ping')
    expect(innerPulse).toBeInTheDocument()
  })

  it('접근성: 메시지 계층 구조가 올바르게 구성되어야 함', () => {
    render(<AnalyzingOverlay isAnalyzing={true} message="ANOVA 분석 중..." />)

    // h3 태그로 주요 메시지
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toHaveTextContent('ANOVA 분석 중...')

    // 설명 텍스트
    const description = screen.getByText('Python 통계 엔진으로 분석하고 있습니다')
    expect(description).toBeInTheDocument()
  })

  it('다양한 메시지로 렌더링해야 함', () => {
    const messages = [
      '회귀 분석 실행 중...',
      'T-검정 수행 중...',
      'ANOVA 계산 중...',
      '상관분석 진행 중...'
    ]

    messages.forEach((message) => {
      const { unmount } = render(<AnalyzingOverlay isAnalyzing={true} message={message} />)
      expect(screen.getByText(message)).toBeInTheDocument()
      unmount()
    })
  })

  it('isAnalyzing false → true 전환 시 올바르게 동작해야 함', () => {
    const { rerender, container } = render(<AnalyzingOverlay isAnalyzing={false} />)

    // 처음에는 렌더링 안 됨
    expect(container.firstChild).toBeNull()

    // isAnalyzing을 true로 변경
    rerender(<AnalyzingOverlay isAnalyzing={true} />)

    // 오버레이 표시됨
    expect(screen.getByText('통계 분석 중...')).toBeInTheDocument()
  })

  it('isAnalyzing true → false 전환 시 올바르게 동작해야 함', () => {
    const { rerender, container } = render(<AnalyzingOverlay isAnalyzing={true} />)

    // 처음에는 렌더링됨
    expect(screen.getByText('통계 분석 중...')).toBeInTheDocument()

    // isAnalyzing을 false로 변경
    rerender(<AnalyzingOverlay isAnalyzing={false} />)

    // 오버레이 숨겨짐
    expect(container.firstChild).toBeNull()
  })
})
