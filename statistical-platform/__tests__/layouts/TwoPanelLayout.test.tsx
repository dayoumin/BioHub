/**
 * TwoPanelLayout 컴포넌트 테스트
 *
 * 금일 작업 검증:
 * 1. 좌측 사이드바 네비게이션 (completed 상태)
 * 2. 하단 데이터 미리보기 (접기/펼치기)
 * 3. "새 창으로 보기" 기능
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'

describe('TwoPanelLayout', () => {
  const mockSteps = [
    { id: 1, label: '회귀 유형 선택', completed: true },
    { id: 2, label: '데이터 업로드', completed: true },
    { id: 3, label: '변수 선택', completed: false },
    { id: 4, label: '분석 결과', completed: false }
  ]

  const mockData = [
    { id: '1', name: 'Alice', age: '25', score: '85' },
    { id: '2', name: 'Bob', age: '30', score: '90' },
    { id: '3', name: 'Charlie', age: '35', score: '95' }
  ]

  const mockBottomPreview = {
    data: mockData,
    fileName: 'test.csv',
    maxRows: 100,
    onOpenNewWindow: jest.fn()
  }

  /**
   * 테스트 1: 기본 렌더링
   */
  it('좌측 사이드바와 메인 콘텐츠가 렌더링된다', () => {
    render(
      <TwoPanelLayout currentStep={1} steps={mockSteps}>
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    // 좌측 사이드바
    expect(screen.getByText('분석 단계')).toBeInTheDocument()
    expect(screen.getByText('회귀 유형 선택')).toBeInTheDocument()

    // 메인 콘텐츠
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  /**
   * 테스트 2: Step 네비게이션 (completed 상태)
   */
  it('완료된 단계는 초록색 체크 아이콘이 표시된다', () => {
    render(
      <TwoPanelLayout currentStep={2} steps={mockSteps}>
        <div>Test</div>
      </TwoPanelLayout>
    )

    const step1Button = screen.getByRole('button', { name: /회귀 유형 선택/ })

    // completed && !isActive이므로 Check 아이콘이 있어야 함
    // (lucide-react Check 아이콘은 SVG로 렌더링되므로 className으로 확인)
    expect(step1Button).toBeInTheDocument()
    expect(step1Button.querySelector('svg')).toBeInTheDocument() // Check icon
  })

  it('현재 단계는 파란색 테두리와 화살표가 표시된다', () => {
    render(
      <TwoPanelLayout currentStep={2} steps={mockSteps}>
        <div>Test</div>
      </TwoPanelLayout>
    )

    const step2Button = screen.getByRole('button', { name: /데이터 업로드/ })

    // isActive이므로 ChevronRight 아이콘이 있어야 함
    expect(step2Button).toBeInTheDocument()
    expect(step2Button.className).toContain('bg-primary/10')
  })

  it('완료되지 않은 단계는 클릭할 수 없다', () => {
    const mockOnStepChange = jest.fn()

    render(
      <TwoPanelLayout
        currentStep={2}
        steps={mockSteps}
        onStepChange={mockOnStepChange}
      >
        <div>Test</div>
      </TwoPanelLayout>
    )

    const step3Button = screen.getByRole('button', { name: /변수 선택/ })

    // step.id > currentStep && !completed이므로 비활성화
    expect(step3Button).toBeDisabled()

    fireEvent.click(step3Button)
    expect(mockOnStepChange).not.toHaveBeenCalled()
  })

  it('완료된 단계는 클릭 가능하다', () => {
    const mockOnStepChange = jest.fn()

    render(
      <TwoPanelLayout
        currentStep={2}
        steps={mockSteps}
        onStepChange={mockOnStepChange}
      >
        <div>Test</div>
      </TwoPanelLayout>
    )

    const step1Button = screen.getByRole('button', { name: /회귀 유형 선택/ })

    fireEvent.click(step1Button)
    expect(mockOnStepChange).toHaveBeenCalledWith(1)
  })

  /**
   * 테스트 3: 하단 데이터 미리보기
   */
  it('bottomPreview가 없으면 하단 패널이 렌더링되지 않는다', () => {
    render(
      <TwoPanelLayout currentStep={1} steps={mockSteps}>
        <div>Test</div>
      </TwoPanelLayout>
    )

    expect(screen.queryByText('업로드된 데이터')).not.toBeInTheDocument()
  })

  it('bottomPreview가 있으면 하단 패널이 렌더링된다', () => {
    render(
      <TwoPanelLayout
        currentStep={2}
        steps={mockSteps}
        bottomPreview={mockBottomPreview}
      >
        <div>Test</div>
      </TwoPanelLayout>
    )

    expect(screen.getByText('업로드된 데이터')).toBeInTheDocument()
    expect(screen.getByText('test.csv')).toBeInTheDocument()
    expect(screen.getByText('3행 × 4열')).toBeInTheDocument()
  })

  it('하단 패널 접기/펼치기가 동작한다', () => {
    const { container } = render(
      <TwoPanelLayout
        currentStep={2}
        steps={mockSteps}
        bottomPreview={mockBottomPreview}
      >
        <div>Test</div>
      </TwoPanelLayout>
    )

    const toggleButton = screen.getByText('업로드된 데이터')

    // panel은 border-t를 가진 최상위 컨테이너
    const panel = container.querySelector('.border-t.border-border.bg-muted\\/10')

    // 초기 상태: 펼쳐짐 (h-[300px])
    expect(panel?.className).toContain('h-[300px]')

    // 접기
    fireEvent.click(toggleButton)
    expect(panel?.className).toContain('h-12')

    // 펼치기
    fireEvent.click(toggleButton)
    expect(panel?.className).toContain('h-[300px]')
  })

  it('데이터 테이블이 올바르게 렌더링된다', () => {
    render(
      <TwoPanelLayout
        currentStep={2}
        steps={mockSteps}
        bottomPreview={mockBottomPreview}
      >
        <div>Test</div>
      </TwoPanelLayout>
    )

    // 테이블 헤더
    expect(screen.getByText('#')).toBeInTheDocument()
    expect(screen.getByText('id')).toBeInTheDocument()
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
    expect(screen.getByText('score')).toBeInTheDocument()

    // 테이블 데이터
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
  })

  it('"새 창으로 보기" 버튼이 렌더링되고 클릭 시 함수가 호출된다', () => {
    render(
      <TwoPanelLayout
        currentStep={2}
        steps={mockSteps}
        bottomPreview={mockBottomPreview}
      >
        <div>Test</div>
      </TwoPanelLayout>
    )

    const newWindowButton = screen.getByText('새 창으로 보기')
    expect(newWindowButton).toBeInTheDocument()

    fireEvent.click(newWindowButton)
    expect(mockBottomPreview.onOpenNewWindow).toHaveBeenCalled()
  })

  it('maxRows를 초과하면 "더 있음" 메시지가 표시된다', () => {
    const largeData = Array.from({ length: 150 }, (_, i) => ({
      id: String(i + 1),
      value: String(i * 10)
    }))

    const largeBottomPreview = {
      data: largeData,
      fileName: 'large.csv',
      maxRows: 100,
      onOpenNewWindow: jest.fn()
    }

    render(
      <TwoPanelLayout
        currentStep={2}
        steps={mockSteps}
        bottomPreview={largeBottomPreview}
      >
        <div>Test</div>
      </TwoPanelLayout>
    )

    expect(screen.getByText(/\+ 50행 더 있음/)).toBeInTheDocument()
    expect(screen.getByText(/전체 데이터를 보려면 "새 창으로 보기" 클릭/)).toBeInTheDocument()
  })

  /**
   * 테스트 4: 접근성 (Accessibility)
   */
  it('비활성화된 버튼은 disabled 속성이 있다', () => {
    render(
      <TwoPanelLayout
        currentStep={2}
        steps={mockSteps}
      >
        <div>Test</div>
      </TwoPanelLayout>
    )

    const step3Button = screen.getByRole('button', { name: /변수 선택/ })
    expect(step3Button).toBeDisabled()
  })

  it('Semantic HTML을 사용한다', () => {
    const { container } = render(
      <TwoPanelLayout currentStep={1} steps={mockSteps}>
        <div>Test</div>
      </TwoPanelLayout>
    )

    expect(container.querySelector('aside')).toBeInTheDocument() // 사이드바
    expect(container.querySelector('main')).toBeInTheDocument() // 메인
    expect(container.querySelector('nav')).toBeInTheDocument() // 네비게이션
  })
})
