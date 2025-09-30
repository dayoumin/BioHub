import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import RepeatedMeasuresPage from '../app/(dashboard)/statistics/repeated-measures/page'

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

describe('Repeated Measures ANOVA Page Basic Test', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(<RepeatedMeasuresPage />)
    })

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('page-title')).toHaveTextContent('반복측정 분산분석')
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Repeated Measures ANOVA')
  })

  it('shows initial step content', async () => {
    await act(async () => {
      render(<RepeatedMeasuresPage />)
    })

    expect(screen.getByTestId('step-card')).toBeInTheDocument()
    expect(screen.getByTestId('step-title')).toHaveTextContent('반복측정 분산분석 소개')
  })

  it('displays key concepts and usage', async () => {
    await act(async () => {
      render(<RepeatedMeasuresPage />)
    })

    expect(screen.getByText(/언제 사용하나요/)).toBeInTheDocument()
    expect(screen.getByText(/동일한 피험자를 3회 이상 측정했을 때/)).toBeInTheDocument()
    expect(screen.getByText(/시간에 따른 변화 패턴을 분석할 때/)).toBeInTheDocument()
    expect(screen.getByText(/개체 내 변동을 통제하고 싶을 때/)).toBeInTheDocument()
  })

  it('shows main assumptions', async () => {
    await act(async () => {
      render(<RepeatedMeasuresPage />)
    })

    expect(screen.getByText(/주요 가정/)).toBeInTheDocument()
    expect(screen.getByText(/구형성\(Sphericity\)/)).toBeInTheDocument()
    expect(screen.getByText(/차이점수들의 분산이 동일/)).toBeInTheDocument()
    expect(screen.getByText(/정규성/)).toBeInTheDocument()
    expect(screen.getByText(/독립성/)).toBeInTheDocument()
  })
})