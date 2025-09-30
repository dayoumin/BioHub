import '@testing-library/jest-dom'
import { render, screen, act } from '@testing-library/react'
import SignTestPage from '../app/(dashboard)/statistics/sign-test/page'

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

describe('Sign Test Page Basic Test', () => {
  it('renders without crashing', async () => {
    await act(async () => {
      render(<SignTestPage />)
    })

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('page-title')).toHaveTextContent('부호 검정')
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Sign Test')
  })

  it('shows initial step content', async () => {
    await act(async () => {
      render(<SignTestPage />)
    })

    expect(screen.getByTestId('step-card')).toBeInTheDocument()
    expect(screen.getByTestId('step-title')).toHaveTextContent('부호 검정 소개')
  })

  it('displays key sign test concepts', async () => {
    await act(async () => {
      render(<SignTestPage />)
    })

    expect(screen.getByText(/대응 표본에서 중앙값의 차이를 검정하는 비모수 방법/)).toBeInTheDocument()
    expect(screen.getByText(/차이값의 부호\(\+, -\)만을 사용하여 분석/)).toBeInTheDocument()
    expect(screen.getByText(/분포의 가정이 필요하지 않습니다/)).toBeInTheDocument()
  })

  it('shows advantages and applications', async () => {
    await act(async () => {
      render(<SignTestPage />)
    })

    expect(screen.getByText(/주요 장점/)).toBeInTheDocument()
    expect(screen.getByText(/분포 가정 불필요/)).toBeInTheDocument()
    expect(screen.getByText(/이상치에 강건함/)).toBeInTheDocument()
    expect(screen.getByText(/적용 상황/)).toBeInTheDocument()
    expect(screen.getByText(/사전-사후 비교/)).toBeInTheDocument()
  })

  it('compares with Wilcoxon signed-rank test', async () => {
    await act(async () => {
      render(<SignTestPage />)
    })

    expect(screen.getByText(/Wilcoxon 부호순위 검정과의 비교/)).toBeInTheDocument()
    expect(screen.getByText(/차이의 부호만 사용/)).toBeInTheDocument()
    expect(screen.getByText(/차이의 크기와 부호 사용/)).toBeInTheDocument()
    expect(screen.getByText(/검정력 낮음/)).toBeInTheDocument()
    expect(screen.getByText(/검정력 높음/)).toBeInTheDocument()
  })

  it('shows test principles', async () => {
    await act(async () => {
      render(<SignTestPage />)
    })

    expect(screen.getByText(/부호 검정의 원리/)).toBeInTheDocument()
    expect(screen.getByText(/각 대응 쌍의 차이값\(After - Before\) 계산/)).toBeInTheDocument()
    expect(screen.getByText(/양수\(\+\)와 음수\(-\) 차이의 개수 계산/)).toBeInTheDocument()
    expect(screen.getByText(/이항분포를 이용하여 확률 계산/)).toBeInTheDocument()
  })

  it('displays application examples', async () => {
    await act(async () => {
      render(<SignTestPage />)
    })

    expect(screen.getByText(/적용 예시/)).toBeInTheDocument()
    expect(screen.getByText(/치료 전후 증상 점수, 혈압 변화, 체중 감소/)).toBeInTheDocument()
    expect(screen.getByText(/교육 전후 성적, 만족도, 이해도 변화/)).toBeInTheDocument()
    expect(screen.getByText(/캠페인 전후 판매량, 인지도, 선호도/)).toBeInTheDocument()
  })

  it('shows information alert', async () => {
    await act(async () => {
      render(<SignTestPage />)
    })

    expect(screen.getByText(/평균의 차이를 검정하려면 t-검정이나 Wilcoxon 부호순위 검정을 고려하세요/)).toBeInTheDocument()
  })
})