import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
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

    expect(screen.getByText(/계층적 구조를 가진 데이터/)).toBeInTheDocument()
    expect(screen.getByText(/고정효과와 무선효과를 동시에 고려/)).toBeInTheDocument()
    expect(screen.getByText(/집단 내 상관 구조 고려/)).toBeInTheDocument()
    expect(screen.getByText(/개체별 변동성 모델링/)).toBeInTheDocument()
  })

  it('shows hierarchical data examples', async () => {
    await act(async () => {
      render(<MixedModelPage />)
    })

    expect(screen.getByText(/교육 연구/)).toBeInTheDocument()
    expect(screen.getByText(/의학 연구/)).toBeInTheDocument()
    expect(screen.getByText(/심리학/)).toBeInTheDocument()
  })
})