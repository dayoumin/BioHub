/**
 * Breadcrumb & Navigation 통합 테스트
 *
 * TwoPanelLayout + Breadcrumb + 회귀분석 페이지 통합 검증
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { TwoPanelLayout, type BreadcrumbItem } from '@/components/statistics/layouts/TwoPanelLayout'
import { TrendingUp } from 'lucide-react'

describe('Breadcrumb & Navigation Integration', () => {
  const mockSteps = [
    { id: 1, label: '회귀 유형 선택', completed: true },
    { id: 2, label: '데이터 업로드', completed: true },
    { id: 3, label: '변수 선택', completed: false },
    { id: 4, label: '분석 결과', completed: false }
  ]

  const mockBreadcrumbs: BreadcrumbItem[] = [
    { label: '홈', href: '/' },
    { label: '회귀분석 데모' }
  ]

  /**
   * 테스트 1: Breadcrumb 기본 렌더링
   */
  it('Breadcrumb이 올바르게 렌더링된다', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        breadcrumbs={mockBreadcrumbs}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    // 모든 Breadcrumb 항목이 렌더링되는지 확인 (2단계)
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('회귀분석 데모')).toBeInTheDocument()
  })

  /**
   * 테스트 2: Breadcrumb 없으면 렌더링 안 함
   */
  it('breadcrumbs가 없으면 Breadcrumb 영역이 렌더링되지 않는다', () => {
    const { container } = render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    // Breadcrumb 컨테이너가 없는지 확인
    const breadcrumbContainer = container.querySelector('nav[aria-label="breadcrumb"]')
    expect(breadcrumbContainer).not.toBeInTheDocument()
  })

  /**
   * 테스트 3: 빈 Breadcrumb 배열이면 렌더링 안 함
   */
  it('breadcrumbs가 빈 배열이면 Breadcrumb 영역이 렌더링되지 않는다', () => {
    const { container } = render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        breadcrumbs={[]}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    const breadcrumbContainer = container.querySelector('nav[aria-label="breadcrumb"]')
    expect(breadcrumbContainer).not.toBeInTheDocument()
  })

  /**
   * 테스트 4: 마지막 항목은 클릭 불가
   */
  it('마지막 Breadcrumb 항목은 클릭할 수 없다', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        breadcrumbs={mockBreadcrumbs}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    const lastItem = screen.getByText('회귀분석 데모')

    // aria-current="page" 속성이 있는지 확인
    expect(lastItem).toHaveAttribute('aria-current', 'page')
    // aria-disabled="true" 속성이 있는지 확인
    expect(lastItem).toHaveAttribute('aria-disabled', 'true')
  })

  /**
   * 테스트 5: onClick 핸들러 동작
   */
  it('onClick이 있는 Breadcrumb 항목은 클릭 시 핸들러가 호출된다', () => {
    const mockOnClick = vi.fn()

    const breadcrumbsWithOnClick: BreadcrumbItem[] = [
      { label: '홈', onClick: mockOnClick },
      { label: '회귀분석', href: '/statistics' },
      { label: '회귀분석 데모' }
    ]

    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        breadcrumbs={breadcrumbsWithOnClick}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    const homeLink = screen.getByText('홈')
    fireEvent.click(homeLink)

    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  /**
   * 테스트 6: 분석 제목이 올바르게 렌더링
   */
  it('analysisTitle이 좌측 사이드바에 렌더링된다', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        analysisTitle="회귀분석"
        analysisSubtitle="Regression"
        analysisIcon={<TrendingUp className="h-5 w-5 text-primary" />}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    expect(screen.getByText('회귀분석')).toBeInTheDocument()
    expect(screen.getByText('Regression')).toBeInTheDocument()
  })

  /**
   * 테스트 7: 분석 제목 없으면 렌더링 안 함
   */
  it('analysisTitle이 없으면 분석 제목 영역이 렌더링되지 않는다', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    // "분석 단계"는 있지만 "회귀분석" 제목은 없어야 함
    expect(screen.getByText('분석 단계')).toBeInTheDocument()
    expect(screen.queryByText('회귀분석')).not.toBeInTheDocument()
  })

  /**
   * 테스트 8: 분석 부제목만 있어도 렌더링 안 함
   */
  it('analysisTitle 없이 analysisSubtitle만 있으면 렌더링되지 않는다', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        analysisSubtitle="Regression"
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    expect(screen.queryByText('Regression')).not.toBeInTheDocument()
  })

  /**
   * 테스트 9: Breadcrumb + 분석 제목 동시 렌더링
   */
  it('Breadcrumb과 분석 제목이 동시에 렌더링된다', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        analysisTitle="회귀분석"
        analysisSubtitle="Regression"
        breadcrumbs={mockBreadcrumbs}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    // Breadcrumb (2단계)
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('회귀분석 데모')).toBeInTheDocument()

    // 분석 제목 (좌측 사이드바에만 존재)
    expect(screen.getByText('회귀분석')).toBeInTheDocument()
    expect(screen.getByText('Regression')).toBeInTheDocument()
  })

  /**
   * 테스트 10: Accessibility - ARIA 속성
   */
  it('Breadcrumb이 올바른 ARIA 속성을 가진다', () => {
    const { container } = render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        breadcrumbs={mockBreadcrumbs}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    // nav 요소에 aria-label="breadcrumb"
    const nav = container.querySelector('nav[aria-label="breadcrumb"]')
    expect(nav).toBeInTheDocument()

    // 마지막 항목에 aria-current="page"
    const lastItem = screen.getByText('회귀분석 데모')
    expect(lastItem).toHaveAttribute('aria-current', 'page')
    expect(lastItem).toHaveAttribute('aria-disabled', 'true')
  })

  /**
   * 테스트 11: Separator 렌더링
   */
  it('Breadcrumb 항목 사이에 Separator가 렌더링된다', () => {
    const { container } = render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        breadcrumbs={mockBreadcrumbs}
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    // Separator는 li[role="presentation"]로 렌더링
    const separators = container.querySelectorAll('li[role="presentation"]')

    // 2개 항목 → 1개 Separator (마지막 항목 뒤에는 Separator 없음)
    expect(separators.length).toBe(1)
  })

  /**
   * 테스트 12: 폰트 사이즈 검증
   */
  it('좌측 사이드바 제목이 올바른 폰트 사이즈를 가진다', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        analysisTitle="회귀분석"
        analysisSubtitle="Regression"
      >
        <div>Test Content</div>
      </TwoPanelLayout>
    )

    const title = screen.getAllByText('회귀분석')[0] // 좌측 사이드바 제목
    const subtitle = screen.getByText('Regression')

    // text-lg (18px) 클래스 확인
    expect(title.className).toContain('text-lg')
    expect(title.className).toContain('font-bold')

    // text-sm (14px) 클래스 확인
    expect(subtitle.className).toContain('text-sm')
    expect(subtitle.className).toContain('font-medium')
  })

  /**
   * 테스트 13: 메인 콘텐츠 렌더링
   */
  it('메인 콘텐츠가 올바르게 렌더링된다', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        breadcrumbs={mockBreadcrumbs}
        analysisTitle="회귀분석"
      >
        <div data-testid="main-content">Test Content</div>
      </TwoPanelLayout>
    )

    expect(screen.getByTestId('main-content')).toHaveTextContent('Test Content')
  })
})

/**
 * 실제 사용 시나리오 테스트
 */
describe('실제 사용 시나리오', () => {
  it('회귀분석 페이지와 동일한 설정으로 렌더링', () => {
    const steps = [
      { id: 1, label: '회귀 유형 선택', completed: true },
      { id: 2, label: '데이터 업로드', completed: false },
      { id: 3, label: '변수 선택', completed: false },
      { id: 4, label: '분석 결과', completed: false }
    ]

    const breadcrumbs: BreadcrumbItem[] = [
      { label: '홈', href: '/' },
      { label: '회귀분석 데모' }
    ]

    const mockOnStepChange = vi.fn()

    render(
      <TwoPanelLayout
        currentStep={1}
        steps={steps}
        onStepChange={mockOnStepChange}
        analysisTitle="회귀분석"
        analysisSubtitle="Regression"
        analysisIcon={<TrendingUp className="h-5 w-5 text-primary" />}
        breadcrumbs={breadcrumbs}
      >
        <div>
          <h2>회귀 유형 선택</h2>
          <p>예측 목적과 변수 특성에 맞는 회귀 방법을 선택하세요</p>
        </div>
      </TwoPanelLayout>
    )

    // Breadcrumb 확인 (2단계)
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('회귀분석 데모')).toBeInTheDocument()

    // 좌측 사이드바 제목 확인
    expect(screen.getByText('회귀분석')).toBeInTheDocument() // 사이드바에만 존재

    // Step 확인 (getAllByText 사용 - 좌측 사이드바 + 메인 콘텐츠에 모두 나타남)
    expect(screen.getAllByText('회귀 유형 선택').length).toBeGreaterThan(0)
    expect(screen.getByText('데이터 업로드')).toBeInTheDocument()

    // 메인 콘텐츠 확인
    expect(screen.getByText('예측 목적과 변수 특성에 맞는 회귀 방법을 선택하세요')).toBeInTheDocument()

    // 완료된 Step 클릭 가능 확인
    const step1Button = screen.getByRole('button', { name: /회귀 유형 선택/ })
    fireEvent.click(step1Button)
    expect(mockOnStepChange).toHaveBeenCalledWith(1)
  })
})
