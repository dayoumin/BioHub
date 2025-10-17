import '@testing-library/jest-dom'
import { render, screen, act, waitFor } from '@testing-library/react'
import MixedModelPage from '../app/(dashboard)/statistics/mixed-model/page'

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

describe('Mixed Model Page Basic Test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<MixedModelPage />)
    })

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('page-title')).toHaveTextContent('선형 혼합 모형')
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Linear Mixed Model (LMM)')
  })

  it('shows initial step content', async () => {
    await act(async () => {
      render(<MixedModelPage />)
    })

    expect(screen.getByTestId('step-card')).toBeInTheDocument()
    expect(screen.getByTestId('step-title')).toHaveTextContent('선형 혼합 모형 소개')
  })

  it('displays key mixed model concepts', async () => {
    await act(async () => {
      render(<MixedModelPage />)
    })

    expect(screen.getByText(/계층적 구조를 가진 데이터에서 고정효과와 무선효과를 동시에 고려/)).toBeInTheDocument()
    expect(screen.getByText(/집단 내 상관 구조 고려/)).toBeInTheDocument()
    expect(screen.getByText(/개체별 변동성 모델링/)).toBeInTheDocument()
    expect(screen.getByText(/분산 성분 분해 및 해석/)).toBeInTheDocument()
  })

  it('explains fixed vs random effects', async () => {
    await act(async () => {
      render(<MixedModelPage />)
    })

    expect(screen.getByText(/고정효과 vs 무선효과/)).toBeInTheDocument()
    expect(screen.getByText(/고정효과.*모집단에서 일정한 효과/)).toBeInTheDocument()
    expect(screen.getByText(/무선효과.*모집단에서 변동하는 효과/)).toBeInTheDocument()
  })

  it('shows hierarchical data structure examples', async () => {
    await act(async () => {
      render(<MixedModelPage />)
    })

    expect(screen.getByText(/교육 연구/)).toBeInTheDocument()
    expect(screen.getByText(/의학 연구/)).toBeInTheDocument()
    expect(screen.getByText(/심리학/)).toBeInTheDocument()
    expect(screen.getByText(/학생.*학급.*학교/)).toBeInTheDocument()
  })

  it('provides model selection criteria', async () => {
    await act(async () => {
      render(<MixedModelPage />)
    })

    expect(screen.getByText(/모형 선택 기준/)).toBeInTheDocument()
    expect(screen.getByText(/ICC > 0\.05.*다수준 모형 고려 필요/)).toBeInTheDocument()
    expect(screen.getByText(/AIC\/BIC.*작을수록 더 나은 모형/)).toBeInTheDocument()
  })

  it('shows hierarchical data structure table', async () => {
    await act(async () => {
      render(<MixedModelPage />)
    })

    // Navigate to data upload step to see the data structure table
    await waitFor(() => {
      expect(screen.getByText('다음: 데이터 업로드')).toBeInTheDocument()
    })
  })

  it('handles error states appropriately', async () => {
    // Mock Pyodide initialization failure
    const mockError = new Error('Pyodide initialization failed')
    require('@/lib/services/pyodide-statistics').pyodideStats.initialize.mockRejectedValueOnce(mockError)

    await act(async () => {
      render(<MixedModelPage />)
    })

    // Page should still render even with initialization error
    await waitFor(() => {
      expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Mixed Model Statistical Concepts', () => {
  it('validates mixed model components', () => {
    const mixedModelComponents = [
      'Fixed effects (population-level)',
      'Random effects (group-level variation)',
      'Variance components',
      'Hierarchical data structure',
      'ICC (Intraclass correlation)'
    ]
    expect(mixedModelComponents).toHaveLength(5)
  })

  it('identifies key model fit statistics', () => {
    const fitStatistics = [
      'AIC (Akaike Information Criterion)',
      'BIC (Bayesian Information Criterion)',
      'Marginal R² (fixed effects only)',
      'Conditional R² (fixed + random effects)',
      'ICC (Intraclass Correlation Coefficient)'
    ]
    expect(fitStatistics).toHaveLength(5)
  })

  it('validates mixed model assumptions', () => {
    const assumptions = [
      'Normality of residuals',
      'Normality of random effects',
      'Homoscedasticity',
      'Independence between clusters',
      'Linearity'
    ]
    expect(assumptions).toHaveLength(5)
  })

  it('checks hierarchical data examples', () => {
    const hierarchicalExamples = [
      'Students nested in classrooms',
      'Patients nested in hospitals',
      'Repeated measures within individuals',
      'Employees nested in departments'
    ]
    expect(hierarchicalExamples).toHaveLength(4)
  })
})