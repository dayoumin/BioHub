import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import ANCOVAPage from '../app/(dashboard)/statistics/ancova/page'

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

describe('ANCOVA Page Basic Test', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(<ANCOVAPage />)
    })

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('page-title')).toHaveTextContent('공분산분석')
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Analysis of Covariance (ANCOVA)')
  })

  it('shows initial step content', async () => {
    await act(async () => {
      render(<ANCOVAPage />)
    })

    expect(screen.getByTestId('step-card')).toBeInTheDocument()
    expect(screen.getByTestId('step-title')).toHaveTextContent('공분산분석 소개')
  })
})