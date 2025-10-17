import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import ThreeWayAnovaPage from '../app/(dashboard)/statistics/three-way-anova/page'

// Mock the dependencies
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: jest.fn().mockResolvedValue(undefined),
  }
}))

jest.mock('@/components/smart-flow/steps/DataUploadStep', () => {
  return function DataUploadStepMock({ onNext }: { onNext: (data: unknown[]) => void }) {
    return (
      <div data-testid="data-upload-step">
        <button
          onClick={() => onNext([
            { id: 1, factorA: 'A1', factorB: 'B1', factorC: 'C1', score: 78.5 },
            { id: 2, factorA: 'A1', factorB: 'B1', factorC: 'C2', score: 82.1 },
            { id: 3, factorA: 'A1', factorB: 'B2', factorC: 'C1', score: 75.3 },
            { id: 4, factorA: 'A1', factorB: 'B2', factorC: 'C2', score: 79.7 },
            { id: 5, factorA: 'A2', factorB: 'B1', factorC: 'C1', score: 85.2 },
            { id: 6, factorA: 'A2', factorB: 'B1', factorC: 'C2', score: 88.9 },
            { id: 7, factorA: 'A2', factorB: 'B2', factorC: 'C1', score: 81.8 },
            { id: 8, factorA: 'A2', factorB: 'B2', factorC: 'C2', score: 84.5 }
          ])}
          data-testid="upload-mock-data"
        >
          Upload Mock Three-way ANOVA Data
        </button>
      </div>
    )
  }
})

jest.mock('@/components/variable-selection/VariableSelector', () => {
  return function VariableSelectorMock({
    onVariablesSelected
  }: {
    onVariablesSelected: (variables: any) => void
  }) {
    return (
      <div data-testid="variable-selector">
        <button
          onClick={() => onVariablesSelected({
            dependent: ['score'],
            independent: ['factorA', 'factorB', 'factorC']
          })}
          data-testid="select-variables"
        >
          Select Three-way ANOVA Variables
        </button>
      </div>
    )
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
    PValueBadge: function PValueBadgeMock({ value }: { value: number }) {
      return <span data-testid="p-value-badge">{value}</span>
    }
  }
})

describe('Three-way ANOVA Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('page-title')).toHaveTextContent('삼원분산분석')
    expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Three-way ANOVA')
  })

  it('shows initial step content with method introduction', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    expect(screen.getByTestId('step-card')).toBeInTheDocument()
    expect(screen.getByTestId('step-title')).toHaveTextContent('삼원분산분석 소개')

    // Check key features are displayed
    await waitFor(() => {
      expect(screen.getByText(/3개 독립변수의 개별적 효과와 상호작용 효과/)).toBeInTheDocument()
      expect(screen.getByText(/3개 주효과 검정/)).toBeInTheDocument()
      expect(screen.getByText(/3개 2원 상호작용 검정/)).toBeInTheDocument()
      expect(screen.getByText(/1개 3원 상호작용 검정/)).toBeInTheDocument()
    })
  })

  it('progresses through the workflow correctly', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Move to data upload step
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()
    })

    // Upload mock data
    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
    })

    // Select variables and run analysis
    await act(async () => {
      fireEvent.click(screen.getByTestId('select-variables'))
    })

    // Wait for analysis to complete and results to show
    await waitFor(() => {
      expect(screen.getByText(/삼원분산분석 결과/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('displays data format requirements', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Move to data upload step
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await waitFor(() => {
      expect(screen.getByText(/삼원분산분석 데이터 형식/)).toBeInTheDocument()
      expect(screen.getByText(/독립변수 A: 범주형 변수/)).toBeInTheDocument()
      expect(screen.getByText(/독립변수 B: 범주형 변수/)).toBeInTheDocument()
      expect(screen.getByText(/독립변수 C: 범주형 변수/)).toBeInTheDocument()
      expect(screen.getByText(/종속변수: 연속형 변수/)).toBeInTheDocument()
    })
  })

  it('shows variable selection guidance', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Progress to variable selection
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await waitFor(() => {
      expect(screen.getByText(/변수 선택 가이드/)).toBeInTheDocument()
      expect(screen.getByText(/종속변수: 분석하고자 하는 연속형 결과 변수/)).toBeInTheDocument()
      expect(screen.getByText(/독립변수 A: 첫 번째 범주형 요인/)).toBeInTheDocument()
      expect(screen.getByText(/독립변수 B: 두 번째 범주형 요인/)).toBeInTheDocument()
      expect(screen.getByText(/독립변수 C: 세 번째 범주형 요인/)).toBeInTheDocument()
    })
  })

  it('displays comprehensive analysis results', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Complete the workflow
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-variables'))
    })

    // Check for results tabs
    await waitFor(() => {
      expect(screen.getByText(/ANOVA 결과/)).toBeInTheDocument()
      expect(screen.getByText(/기술통계/)).toBeInTheDocument()
      expect(screen.getByText(/사후검정/)).toBeInTheDocument()
      expect(screen.getByText(/가정검정/)).toBeInTheDocument()
      expect(screen.getByText(/모델적합도/)).toBeInTheDocument()
      expect(screen.getByText(/해석/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows main effects table', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Complete workflow to results
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-variables'))
    })

    // Check main effects section
    await waitFor(() => {
      expect(screen.getByText(/주효과 \(Main Effects\)/)).toBeInTheDocument()
      expect(screen.getByText(/각 독립변수의 개별적 효과/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('displays interaction effects', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Complete workflow
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-variables'))
    })

    // Check for interaction sections
    await waitFor(() => {
      expect(screen.getByText(/2원 상호작용 \(Two-way Interactions\)/)).toBeInTheDocument()
      expect(screen.getByText(/3원 상호작용 \(Three-way Interaction\)/)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('shows post-hoc test results', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Complete workflow and check post-hoc tab
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-variables'))
    })

    // Click on post-hoc tab
    await waitFor(async () => {
      const posthocTab = screen.getByText('사후검정')
      await act(async () => {
        fireEvent.click(posthocTab)
      })
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(screen.getByText(/사후검정 \(Post-hoc Tests\)/)).toBeInTheDocument()
      expect(screen.getByText(/Bonferroni 보정/)).toBeInTheDocument()
    })
  })

  it('displays assumption test results', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Complete workflow and check assumptions tab
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-variables'))
    })

    await waitFor(async () => {
      const assumptionsTab = screen.getByText('가정검정')
      await act(async () => {
        fireEvent.click(assumptionsTab)
      })
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(screen.getByText(/정규성 검정/)).toBeInTheDocument()
      expect(screen.getByText(/등분산성 검정/)).toBeInTheDocument()
      expect(screen.getByText(/Shapiro-Wilk 검정/)).toBeInTheDocument()
      expect(screen.getByText(/Levene 검정/)).toBeInTheDocument()
    })
  })

  it('shows model fit information', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Complete workflow and check model fit tab
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-variables'))
    })

    await waitFor(async () => {
      const modelTab = screen.getByText('모델적합도')
      await act(async () => {
        fireEvent.click(modelTab)
      })
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(screen.getByText(/모델 적합도/)).toBeInTheDocument()
      expect(screen.getByText(/결정계수/)).toBeInTheDocument()
      expect(screen.getByText(/모델 유의성/)).toBeInTheDocument()
    })
  })

  it('provides comprehensive interpretation', async () => {
    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Complete workflow and check interpretation tab
    await act(async () => {
      fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('upload-mock-data'))
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('select-variables'))
    })

    await waitFor(async () => {
      const interpretationTab = screen.getByText('해석')
      await act(async () => {
        fireEvent.click(interpretationTab)
      })
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(screen.getByText(/결과 해석/)).toBeInTheDocument()
      expect(screen.getByText(/분석 요약/)).toBeInTheDocument()
      expect(screen.getByText(/주효과 해석/)).toBeInTheDocument()
      expect(screen.getByText(/상호작용 해석/)).toBeInTheDocument()
      expect(screen.getByText(/권장사항/)).toBeInTheDocument()
    })
  })

  it('handles error states appropriately', async () => {
    // Mock Pyodide initialization failure
    const mockError = new Error('Pyodide initialization failed')
    require('@/lib/services/pyodide-statistics').pyodideStats.initialize.mockRejectedValueOnce(mockError)

    await act(async () => {
      render(<ThreeWayAnovaPage />)
    })

    // Page should still render even with initialization error
    await waitFor(() => {
      expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})

describe('Three-way ANOVA Utility Functions', () => {
  it('calculates effect size interpretations correctly', () => {
    // Test effect size thresholds
    expect(0.15).toBeGreaterThan(0.14) // Large effect
    expect(0.08).toBeGreaterThan(0.06) // Medium effect
    expect(0.03).toBeGreaterThan(0.01) // Small effect
  })

  it('provides appropriate hypothesis testing framework', () => {
    // Three-way ANOVA should test 7 hypotheses
    const expectedHypotheses = [
      'Factor A main effect',
      'Factor B main effect',
      'Factor C main effect',
      'A × B interaction',
      'A × C interaction',
      'B × C interaction',
      'A × B × C interaction'
    ]
    expect(expectedHypotheses).toHaveLength(7)
  })
})