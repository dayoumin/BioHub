/**
 * TwoPanelLayout - AnalyzingOverlay 통합 테스트
 *
 * isAnalyzing props 추가로 인한 분석 중 오버레이 테스트
 */

import { render, screen } from '@testing-library/react'
import { TwoPanelLayout } from '@/components/statistics/layouts/TwoPanelLayout'

describe('TwoPanelLayout - AnalyzingOverlay Integration', () => {
  const mockSteps = [
    { id: 1, label: '데이터 업로드', completed: true },
    { id: 2, label: '변수 선택', completed: false },
    { id: 3, label: '분석 결과', completed: false }
  ]

  it('isAnalyzing이 false일 때 오버레이가 표시되지 않아야 함', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        isAnalyzing={false}
      >
        <div>Main Content</div>
      </TwoPanelLayout>
    )

    expect(screen.getByText('Main Content')).toBeInTheDocument()
    expect(screen.queryByText('통계 분석 중...')).not.toBeInTheDocument()
  })

  it('isAnalyzing이 true일 때 오버레이가 표시되어야 함', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        isAnalyzing={true}
      >
        <div>Main Content</div>
      </TwoPanelLayout>
    )

    expect(screen.getByText('Main Content')).toBeInTheDocument()
    expect(screen.getByText('통계 분석 중...')).toBeInTheDocument()
    expect(screen.getByText('Python 통계 엔진으로 분석하고 있습니다')).toBeInTheDocument()
  })

  it('커스텀 분석 메시지를 표시해야 함', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        isAnalyzing={true}
        analyzingMessage="회귀 분석 실행 중..."
      >
        <div>Main Content</div>
      </TwoPanelLayout>
    )

    expect(screen.getByText('회귀 분석 실행 중...')).toBeInTheDocument()
  })

  it('분석 중에도 메인 콘텐츠는 렌더링되어야 함', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        isAnalyzing={true}
      >
        <div data-testid="main-content">
          <h1>회귀 분석 결과 테이블</h1>
          <p>테이블 데이터</p>
        </div>
      </TwoPanelLayout>
    )

    // 메인 콘텐츠는 계속 렌더링됨 (오버레이 뒤에)
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
    expect(screen.getByText('회귀 분석 결과 테이블')).toBeInTheDocument()

    // 오버레이도 표시됨
    expect(screen.getByText('통계 분석 중...')).toBeInTheDocument()
  })

  it('bottomPreview와 함께 사용해도 오버레이가 올바르게 표시되어야 함', () => {
    const mockData = [
      { id: '1', name: 'Alice', score: '85' },
      { id: '2', name: 'Bob', score: '90' }
    ]

    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        isAnalyzing={true}
        bottomPreview={{
          data: mockData,
          fileName: 'test.csv'
        }}
      >
        <div>Main Content</div>
      </TwoPanelLayout>
    )

    // 데이터 미리보기 헤더
    expect(screen.getByText('업로드된 데이터')).toBeInTheDocument()

    // 오버레이
    expect(screen.getByText('통계 분석 중...')).toBeInTheDocument()
  })

  it('분석 중 오버레이가 최상위 레이어(z-50)에 표시되어야 함', () => {
    const { container } = render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        isAnalyzing={true}
      >
        <div>Main Content</div>
      </TwoPanelLayout>
    )

    // AnalyzingOverlay의 최상위 div는 z-50 클래스를 가져야 함
    const overlay = container.querySelector('.z-50')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveClass('absolute', 'inset-0')
  })

  it('다양한 통계 분석 메시지를 테스트해야 함', () => {
    const messages = [
      'T-검정 실행 중...',
      'ANOVA 계산 중...',
      '회귀 분석 진행 중...',
      '상관분석 수행 중...'
    ]

    messages.forEach((message) => {
      const { unmount } = render(
        <TwoPanelLayout
          currentStep={1}
          steps={mockSteps}
          isAnalyzing={true}
          analyzingMessage={message}
        >
          <div>Content</div>
        </TwoPanelLayout>
      )

      expect(screen.getByText(message)).toBeInTheDocument()
      unmount()
    })
  })

  it('breadcrumbs와 함께 사용해도 오버레이가 올바르게 표시되어야 함', () => {
    const breadcrumbs = [
      { label: '홈', href: '/' },
      { label: '통계 분석', href: '/statistics' },
      { label: 'T-검정' }
    ]

    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        breadcrumbs={breadcrumbs}
        isAnalyzing={true}
      >
        <div>Main Content</div>
      </TwoPanelLayout>
    )

    // Breadcrumbs
    expect(screen.getByText('홈')).toBeInTheDocument()
    expect(screen.getByText('통계 분석')).toBeInTheDocument()

    // 오버레이
    expect(screen.getByText('통계 분석 중...')).toBeInTheDocument()
  })

  it('analysisTitle과 함께 사용해도 오버레이가 올바르게 표시되어야 함', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
        analysisTitle="독립표본 T-검정"
        analysisSubtitle="두 그룹 간 평균 비교"
        isAnalyzing={true}
      >
        <div>Main Content</div>
      </TwoPanelLayout>
    )

    // 분석 제목
    expect(screen.getByText('독립표본 T-검정')).toBeInTheDocument()
    expect(screen.getByText('두 그룹 간 평균 비교')).toBeInTheDocument()

    // 오버레이
    expect(screen.getByText('통계 분석 중...')).toBeInTheDocument()
  })

  it('isAnalyzing이 기본값(undefined)일 때 오버레이가 표시되지 않아야 함', () => {
    render(
      <TwoPanelLayout
        currentStep={1}
        steps={mockSteps}
      >
        <div>Main Content</div>
      </TwoPanelLayout>
    )

    expect(screen.queryByText('통계 분석 중...')).not.toBeInTheDocument()
  })
})
