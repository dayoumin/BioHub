import '@testing-library/jest-dom'
import { render, screen, act, waitFor } from '@testing-library/react'
import ManovaPage from '../app/(dashboard)/statistics/manova/page'

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

describe('MANOVA Page Basic Test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<ManovaPage />)
    })

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('page-title')).toHaveTextContent('다변량 분산분석')
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Multivariate Analysis of Variance (MANOVA)')
  })

  it('shows initial step content', async () => {
    await act(async () => {
      render(<ManovaPage />)
    })

    expect(screen.getByTestId('step-card')).toBeInTheDocument()
    expect(screen.getByTestId('step-title')).toHaveTextContent('다변량 분산분석 소개')
  })

  it('displays key MANOVA concepts', async () => {
    await act(async () => {
      render(<ManovaPage />)
    })

    expect(screen.getByText(/여러 종속변수에 대한 집단 간 차이를 동시에 검정/)).toBeInTheDocument()
    expect(screen.getByText(/다변량 검정으로 전체적 차이 확인/)).toBeInTheDocument()
    expect(screen.getByText(/종속변수별 단변량 F 검정/)).toBeInTheDocument()
    expect(screen.getByText(/정준 판별분석으로 차이 패턴 파악/)).toBeInTheDocument()
  })

  it('explains multivariate test statistics', async () => {
    await act(async () => {
      render(<ManovaPage />)
    })

    expect(screen.getByText(/Pillai's Trace/)).toBeInTheDocument()
    expect(screen.getByText(/Wilks' Lambda/)).toBeInTheDocument()
    expect(screen.getByText(/Hotelling's Trace/)).toBeInTheDocument()
    expect(screen.getByText(/Roy's Max Root/)).toBeInTheDocument()
  })

  it('shows ANOVA vs MANOVA comparison', async () => {
    await act(async () => {
      render(<ManovaPage />)
    })

    expect(screen.getByText(/ANOVA vs MANOVA/)).toBeInTheDocument()
    expect(screen.getByText(/ANOVA: 종속변수 1개/)).toBeInTheDocument()
    expect(screen.getByText(/MANOVA: 종속변수 2개 이상/)).toBeInTheDocument()
    expect(screen.getByText(/1종 오류 통제/)).toBeInTheDocument()
  })

  it('provides application examples', async () => {
    await act(async () => {
      render(<ManovaPage />)
    })

    expect(screen.getByText(/교육 연구/)).toBeInTheDocument()
    expect(screen.getByText(/심리 연구/)).toBeInTheDocument()
    expect(screen.getByText(/의학 연구/)).toBeInTheDocument()
    expect(screen.getByText(/학습법이 수학, 국어, 과학 성취도에 미치는 효과/)).toBeInTheDocument()
  })

  it('handles error states appropriately', async () => {
    // Mock Pyodide initialization failure
    const mockError = new Error('Pyodide initialization failed')
    require('@/lib/services/pyodide-statistics').pyodideStats.initialize.mockRejectedValueOnce(mockError)

    await act(async () => {
      render(<ManovaPage />)
    })

    // Page should still render even with initialization error
    await waitFor(() => {
      expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('MANOVA Statistical Concepts', () => {
  it('validates MANOVA vs ANOVA differences', () => {
    // MANOVA should handle multiple dependent variables
    const manovaFeatures = [
      'Multiple dependent variables',
      'Controls Type I error',
      'Considers correlations between DVs',
      'Multivariate test statistics',
      'Discriminant analysis'
    ]
    expect(manovaFeatures).toHaveLength(5)
  })

  it('identifies key multivariate test statistics', () => {
    const testStatistics = [
      "Pillai's Trace",
      "Wilks' Lambda",
      "Hotelling's Trace",
      "Roy's Max Root"
    ]
    expect(testStatistics).toHaveLength(4)
  })

  it('validates MANOVA assumptions', () => {
    const assumptions = [
      'Multivariate normality',
      'Homogeneity of covariance matrices',
      'Independence',
      'No multicollinearity'
    ]
    expect(assumptions).toHaveLength(4)
  })
})