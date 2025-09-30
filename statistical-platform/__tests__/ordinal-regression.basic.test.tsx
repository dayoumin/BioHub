import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import OrdinalRegressionPage from '../app/(dashboard)/statistics/ordinal-regression/page'

// Mock the dependencies
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: jest.fn().mockResolvedValue(undefined),
  }
}))

jest.mock('@/components/smart-flow/steps/DataUploadStep', () => {
  return function DataUploadStepMock() {
    return <div data-testid="data-upload-step">Data Upload Step Mock</div>
  }
})

jest.mock('@/components/variable-selection/VariableSelector', () => {
  return function VariableSelectorMock() {
    return <div data-testid="variable-selector">Variable Selector Mock</div>
  }
})

jest.mock('@/components/statistics/StatisticsPageLayout', () => {
  return {
    StatisticsPageLayout: function StatisticsPageLayoutMock({
      children,
      title,
      subtitle
    }: {
      children: React.ReactNode
      title: string
      subtitle: string
    }) {
      return (
        <div data-testid="statistics-page-layout">
          <h1 data-testid="page-title">{title}</h1>
          <p data-testid="page-subtitle">{subtitle}</p>
          {children}
        </div>
      )
    },
    StepCard: function StepCardMock({
      children,
      title
    }: {
      children: React.ReactNode
      title: string
    }) {
      return (
        <div data-testid="step-card">
          <h3 data-testid="step-title">{title}</h3>
          {children}
        </div>
      )
    }
  }
})

jest.mock('@/components/statistics/common/PValueBadge', () => {
  return {
    PValueBadge: function PValueBadgeMock() {
      return <span data-testid="p-value-badge">P-Value Badge Mock</span>
    }
  }
})

describe('Ordinal Regression Page Basic Test', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(<OrdinalRegressionPage />)
    })

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('page-title')).toHaveTextContent('서열 회귀분석')
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Ordinal Regression')
  })

  it('shows initial step content', async () => {
    await act(async () => {
      render(<OrdinalRegressionPage />)
    })

    expect(screen.getByTestId('step-card')).toBeInTheDocument()
    expect(screen.getByTestId('step-title')).toHaveTextContent('서열 회귀분석 소개')
  })

  it('displays key ordinal regression concepts', async () => {
    await act(async () => {
      render(<OrdinalRegressionPage />)
    })

    expect(screen.getByText(/종속변수가 순서가 있는 범주형 변수\(ordinal variable\)일 때 사용/)).toBeInTheDocument()
    expect(screen.getByText(/일반적인 다항 로지스틱 회귀분석과 달리 범주 간의 순서 정보를 활용/)).toBeInTheDocument()
    expect(screen.getByText(/순서형 종속변수 예측/)).toBeInTheDocument()
    expect(screen.getByText(/로지스틱 회귀의 확장/)).toBeInTheDocument()
  })

  it('shows comparison section', async () => {
    await act(async () => {
      render(<OrdinalRegressionPage />)
    })

    expect(screen.getByText(/일반 로지스틱 회귀 vs 서열 회귀/)).toBeInTheDocument()
    expect(screen.getByText(/명목형 범주.*순서 없음/)).toBeInTheDocument()
    expect(screen.getByText(/순서형 범주.*순서 있음/)).toBeInTheDocument()
  })

  it('provides application examples', async () => {
    await act(async () => {
      render(<OrdinalRegressionPage />)
    })

    expect(screen.getByText(/적용 예시/)).toBeInTheDocument()
    expect(screen.getByText(/만족도 조사.*불만족→보통→만족/)).toBeInTheDocument()
    expect(screen.getByText(/학점 예측.*F→D→C→B→A/)).toBeInTheDocument()
    expect(screen.getByText(/질병 중증도.*경증→중등→중증/)).toBeInTheDocument()
    expect(screen.getByText(/경제 상태.*하→중→상/)).toBeInTheDocument()
  })

  it('shows analysis procedure steps', async () => {
    await act(async () => {
      render(<OrdinalRegressionPage />)
    })

    expect(screen.getByText(/분석 절차/)).toBeInTheDocument()
    expect(screen.getByText(/종속변수의 순서 확인/)).toBeInTheDocument()
    expect(screen.getByText(/비례 오즈 가정 검정/)).toBeInTheDocument()
    expect(screen.getByText(/모델 적합 및 계수 해석/)).toBeInTheDocument()
    expect(screen.getByText(/모델 진단 및 예측 성능 평가/)).toBeInTheDocument()
  })

  it('shows proportional odds assumption warning', async () => {
    await act(async () => {
      render(<OrdinalRegressionPage />)
    })

    expect(screen.getByText(/독립변수의 효과가 모든 임계값에서 동일하다는 가정/)).toBeInTheDocument()
    expect(screen.getByText(/위반 시 부분 비례 오즈 모델을 고려해야/)).toBeInTheDocument()
  })
})