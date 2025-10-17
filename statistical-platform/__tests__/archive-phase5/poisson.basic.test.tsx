import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import PoissonRegressionPage from '../app/(dashboard)/statistics/poisson/page'

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

describe('Poisson Regression Page Basic Test', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(<PoissonRegressionPage />)
    })

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('page-title')).toHaveTextContent('포아송 회귀분석')
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Poisson Regression')
  })

  it('shows initial step content', async () => {
    await act(async () => {
      render(<PoissonRegressionPage />)
    })

    expect(screen.getByTestId('step-card')).toBeInTheDocument()
    expect(screen.getByTestId('step-title')).toHaveTextContent('포아송 회귀분석 소개')
  })

  it('displays key poisson regression concepts', async () => {
    await act(async () => {
      render(<PoissonRegressionPage />)
    })

    expect(screen.getByText(/종속변수가 비음의 정수인 카운트 데이터/)).toBeInTheDocument()
    expect(screen.getByText(/포아송 분포를 가정하며 로그 연결함수를 사용/)).toBeInTheDocument()
    expect(screen.getByText(/주요 특징/)).toBeInTheDocument()
    expect(screen.getByText(/적용 예시/)).toBeInTheDocument()
  })

  it('shows comparison with linear regression', async () => {
    await act(async () => {
      render(<PoissonRegressionPage />)
    })

    expect(screen.getByText(/일반 선형회귀 vs 포아송 회귀/)).toBeInTheDocument()
    expect(screen.getByText(/연속형 종속변수/)).toBeInTheDocument()
    expect(screen.getByText(/카운트 종속변수/)).toBeInTheDocument()
    expect(screen.getByText(/정규분포 가정/)).toBeInTheDocument()
    expect(screen.getByText(/포아송분포 가정/)).toBeInTheDocument()
  })

  it('lists key assumptions', async () => {
    await act(async () => {
      render(<PoissonRegressionPage />)
    })

    expect(screen.getByText(/포아송 회귀의 가정/)).toBeInTheDocument()
    expect(screen.getByText(/포아송 분포: 평균과 분산이 같음/)).toBeInTheDocument()
    expect(screen.getByText(/독립성: 관측치들이 서로 독립/)).toBeInTheDocument()
    expect(screen.getByText(/선형성: 로그\(평균\)이 예측변수와 선형관계/)).toBeInTheDocument()
    expect(screen.getByText(/과산포 없음: 분산 = 평균/)).toBeInTheDocument()
  })

  it('shows count data examples', async () => {
    await act(async () => {
      render(<PoissonRegressionPage />)
    })

    expect(screen.getByText(/카운트 데이터 예시/)).toBeInTheDocument()
    expect(screen.getByText(/병원 방문 횟수, 발작 횟수, 합병증 건수/)).toBeInTheDocument()
    expect(screen.getByText(/결함 개수, 불량품 수, 클레임 건수/)).toBeInTheDocument()
    expect(screen.getByText(/구매 횟수, 클릭 수, 문의 건수/)).toBeInTheDocument()
  })

  it('shows application examples', async () => {
    await act(async () => {
      render(<PoissonRegressionPage />)
    })

    expect(screen.getByText(/질병 발생 건수/)).toBeInTheDocument()
    expect(screen.getByText(/교통사고 발생 횟수/)).toBeInTheDocument()
    expect(screen.getByText(/고객 방문 횟수/)).toBeInTheDocument()
    expect(screen.getByText(/결함 발생 개수/)).toBeInTheDocument()
  })

  it('displays overdispersion warning', async () => {
    await act(async () => {
      render(<PoissonRegressionPage />)
    })

    expect(screen.getByText(/과산포\(Overdispersion\)/)).toBeInTheDocument()
    expect(screen.getByText(/표준오차가 과소추정될 수 있습니다/)).toBeInTheDocument()
    expect(screen.getByText(/준-포아송 모델이나 음이항 회귀분석을 고려해야 합니다/)).toBeInTheDocument()
  })
})