import '@testing-library/jest-dom'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import SignTestPage from '../app/(dashboard)/statistics/sign-test/page'

// Mock the dependencies
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: jest.fn().mockResolvedValue(undefined),
  }
}))

jest.mock('@/components/smart-flow/steps/DataUploadStep', () => {
  return function DataUploadStepMock({ onDataUploaded }: { onDataUploaded: (data: any[]) => void }) {
    return (
      <div data-testid="data-upload-step">
        <button
          data-testid="mock-upload-button"
          onClick={() => onDataUploaded([
            { id: 1, before: 75, after: 82, gender: 'M', age: 25 },
            { id: 2, before: 68, after: 71, gender: 'F', age: 30 },
            { id: 3, before: 80, after: 85, gender: 'M', age: 28 }
          ])}
        >
          Upload Mock Data
        </button>
      </div>
    )
  }
})

jest.mock('@/components/variable-selection/VariableSelector', () => {
  return function VariableSelectorMock({
    variables,
    onVariableSelect,
    placeholder,
    maxSelection = 999
  }: {
    variables: string[]
    onVariableSelect: (vars: string[]) => void
    placeholder?: string
    maxSelection?: number
  }) {
    return (
      <div data-testid="variable-selector">
        <div data-testid="placeholder">{placeholder}</div>
        <div data-testid="variables">
          {variables.map(variable => (
            <button
              key={variable}
              data-testid={`variable-${variable}`}
              onClick={() => {
                if (maxSelection === 1) {
                  onVariableSelect([variable])
                } else {
                  onVariableSelect([variable])
                }
              }}
            >
              {variable}
            </button>
          ))}
        </div>
      </div>
    )
  }
})

jest.mock('@/components/statistics/StatisticsPageLayout', () => {
  return {
    StatisticsPageLayout: function StatisticsPageLayoutMock({
      children,
      title,
      subtitle,
      currentStep,
      totalSteps,
      onStepChange
    }: {
      children: React.ReactNode
      title: string
      subtitle: string
      currentStep: number
      totalSteps: number
      onStepChange: (step: number) => void
    }) {
      return (
        <div data-testid="statistics-page-layout">
          <h1 data-testid="page-title">{title}</h1>
          <p data-testid="page-subtitle">{subtitle}</p>
          <div data-testid="step-info">{currentStep + 1} / {totalSteps}</div>
          <div data-testid="step-controls">
            {Array.from({ length: totalSteps }, (_, i) => (
              <button
                key={i}
                data-testid={`step-${i}`}
                onClick={() => onStepChange(i)}
              >
                Step {i + 1}
              </button>
            ))}
          </div>
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
    PValueBadge: function PValueBadgeMock({ pValue }: { pValue: number }) {
      return <span data-testid="p-value-badge">{pValue.toFixed(3)}</span>
    }
  }
})

describe('Sign Test Page Comprehensive Test', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Page Initialization', () => {
    it('renders all initial elements correctly', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
      expect(screen.getByTestId('page-title')).toHaveTextContent('부호 검정')
      expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Sign Test')
      expect(screen.getByTestId('step-info')).toHaveTextContent('1 / 4')
    })

    it('shows step navigation controls', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      expect(screen.getByTestId('step-0')).toBeInTheDocument()
      expect(screen.getByTestId('step-1')).toBeInTheDocument()
      expect(screen.getByTestId('step-2')).toBeInTheDocument()
      expect(screen.getByTestId('step-3')).toBeInTheDocument()
    })
  })

  describe('Step Navigation', () => {
    it('starts at step 0 (introduction)', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      expect(screen.getByTestId('step-title')).toHaveTextContent('부호 검정 소개')
      expect(screen.getByTestId('step-info')).toHaveTextContent('1 / 4')
    })

    it('allows navigation to data upload step', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      const nextButton = screen.getByText('다음: 데이터 업로드')

      await act(async () => {
        fireEvent.click(nextButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('step-title')).toHaveTextContent('데이터 업로드')
        expect(screen.getByTestId('step-info')).toHaveTextContent('2 / 4')
      })
    })

    it('can navigate using step controls', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      const step2Button = screen.getByTestId('step-1')

      await act(async () => {
        fireEvent.click(step2Button)
      })

      await waitFor(() => {
        expect(screen.getByTestId('step-title')).toHaveTextContent('데이터 업로드')
      })
    })
  })

  describe('Data Upload Functionality', () => {
    it('shows data upload step with requirements', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Navigate to data upload step
      const nextButton = screen.getByText('다음: 데이터 업로드')
      await act(async () => {
        fireEvent.click(nextButton)
      })

      expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()
      expect(screen.getByText('부호 검정 데이터 요구사항')).toBeInTheDocument()
      expect(screen.getByText('대응 표본 구조 (필수)')).toBeInTheDocument()
    })

    it('handles data upload and advances to variable selection', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Navigate to data upload step
      const nextButton = screen.getByText('다음: 데이터 업로드')
      await act(async () => {
        fireEvent.click(nextButton)
      })

      // Upload mock data
      const uploadButton = screen.getByTestId('mock-upload-button')
      await act(async () => {
        fireEvent.click(uploadButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('step-title')).toHaveTextContent('변수 선택')
        expect(screen.getByTestId('step-info')).toHaveTextContent('3 / 4')
      })
    })
  })

  describe('Variable Selection', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Navigate to data upload and upload data
      const nextButton = screen.getByText('다음: 데이터 업로드')
      await act(async () => {
        fireEvent.click(nextButton)
      })

      const uploadButton = screen.getByTestId('mock-upload-button')
      await act(async () => {
        fireEvent.click(uploadButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('step-title')).toHaveTextContent('변수 선택')
      })
    })

    it('shows variable selection interface', () => {
      expect(screen.getByText('사전 측정값 (Before, 필수)')).toBeInTheDocument()
      expect(screen.getByText('사후 측정값 (After, 필수)')).toBeInTheDocument()
      expect(screen.getByText('검정 유형')).toBeInTheDocument()
    })

    it('displays available variables', () => {
      const variableSelectors = screen.getAllByTestId('variable-selector')
      expect(variableSelectors.length).toBeGreaterThanOrEqual(2)

      // Check if numeric variables are available
      expect(screen.getByTestId('variable-before')).toBeInTheDocument()
      expect(screen.getByTestId('variable-after')).toBeInTheDocument()
      expect(screen.getByTestId('variable-age')).toBeInTheDocument()
    })

    it('shows test type options', () => {
      expect(screen.getByText('양측 검정: 중앙값에 차이가 있는지 (≠ 0)')).toBeInTheDocument()
      expect(screen.getByText('우측 검정: 사후 값이 더 큰지 (> 0)')).toBeInTheDocument()
      expect(screen.getByText('좌측 검정: 사후 값이 더 작은지 (< 0)')).toBeInTheDocument()
    })

    it('enables analysis button when variables are selected', async () => {
      // Select before variable
      const beforeVariable = screen.getByTestId('variable-before')
      await act(async () => {
        fireEvent.click(beforeVariable)
      })

      // Select after variable
      const afterVariable = screen.getByTestId('variable-after')
      await act(async () => {
        fireEvent.click(afterVariable)
      })

      await waitFor(() => {
        const analysisButton = screen.getByText('분석 실행')
        expect(analysisButton).not.toBeDisabled()
      })
    })

    it('shows analysis guide information', () => {
      expect(screen.getByText('분석 가이드')).toBeInTheDocument()
      expect(screen.getByText(/대응 표본.*동일한 개체에서 두 번 측정된 데이터/)).toBeInTheDocument()
      expect(screen.getByText(/차이값 계산.*사후값 - 사전값으로 계산됨/)).toBeInTheDocument()
    })
  })

  describe('Test Type Selection', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Navigate through steps
      const nextButton = screen.getByText('다음: 데이터 업로드')
      await act(async () => {
        fireEvent.click(nextButton)
      })

      const uploadButton = screen.getByTestId('mock-upload-button')
      await act(async () => {
        fireEvent.click(uploadButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('step-title')).toHaveTextContent('변수 선택')
      })
    })

    it('defaults to two-tailed test', () => {
      const twoTailedRadio = screen.getByRole('radio', { name: /양측 검정/ })
      expect(twoTailedRadio).toBeChecked()
    })

    it('allows selection of different test types', async () => {
      const greaterRadio = screen.getByRole('radio', { name: /우측 검정/ })

      await act(async () => {
        fireEvent.click(greaterRadio)
      })

      expect(greaterRadio).toBeChecked()

      const lessRadio = screen.getByRole('radio', { name: /좌측 검정/ })

      await act(async () => {
        fireEvent.click(lessRadio)
      })

      expect(lessRadio).toBeChecked()
    })
  })

  describe('Analysis Execution', () => {
    beforeEach(async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Complete all setup steps
      const nextButton = screen.getByText('다음: 데이터 업로드')
      await act(async () => {
        fireEvent.click(nextButton)
      })

      const uploadButton = screen.getByTestId('mock-upload-button')
      await act(async () => {
        fireEvent.click(uploadButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('step-title')).toHaveTextContent('변수 선택')
      })

      // Select variables
      const beforeVariable = screen.getByTestId('variable-before')
      await act(async () => {
        fireEvent.click(beforeVariable)
      })

      const afterVariable = screen.getByTestId('variable-after')
      await act(async () => {
        fireEvent.click(afterVariable)
      })
    })

    it('advances to analysis step when variables are selected', async () => {
      const analysisButton = screen.getByText('분석 실행')

      await act(async () => {
        fireEvent.click(analysisButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('step-title')).toHaveTextContent('분석 실행')
        expect(screen.getByTestId('step-info')).toHaveTextContent('4 / 4')
      })
    })

    it('shows analysis execution button', async () => {
      const analysisButton = screen.getByText('분석 실행')

      await act(async () => {
        fireEvent.click(analysisButton)
      })

      await waitFor(() => {
        expect(screen.getByText('부호 검정 실행')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('handles missing variables gracefully', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Navigate to variable selection without uploading data
      const step3Button = screen.getByTestId('step-2')
      await act(async () => {
        fireEvent.click(step3Button)
      })

      // Should show empty variable selectors
      const variableSelectors = screen.getAllByTestId('variable-selector')
      expect(variableSelectors.length).toBeGreaterThan(0)
    })

    it('disables analysis button when variables not selected', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Navigate to variable selection
      const step3Button = screen.getByTestId('step-2')
      await act(async () => {
        fireEvent.click(step3Button)
      })

      const analysisButton = screen.getByText('분석 실행')
      expect(analysisButton).toBeDisabled()
    })
  })

  describe('UI Components Integration', () => {
    it('properly integrates with StatisticsPageLayout', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
      expect(screen.getByTestId('page-title')).toHaveTextContent('부호 검정')
      expect(screen.getByTestId('page-subtitle')).toHaveTextContent('Sign Test')
    })

    it('renders StepCard components correctly', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      expect(screen.getByTestId('step-card')).toBeInTheDocument()
      expect(screen.getByTestId('step-title')).toBeInTheDocument()
    })

    it('integrates with variable selectors', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Upload data first
      const nextButton = screen.getByText('다음: 데이터 업로드')
      await act(async () => {
        fireEvent.click(nextButton)
      })

      const uploadButton = screen.getByTestId('mock-upload-button')
      await act(async () => {
        fireEvent.click(uploadButton)
      })

      await waitFor(() => {
        const variableSelectors = screen.getAllByTestId('variable-selector')
        expect(variableSelectors.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Content Validation', () => {
    it('displays comprehensive introduction content', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      expect(screen.getByText('부호 검정(Sign Test)이란?')).toBeInTheDocument()
      expect(screen.getByText('Wilcoxon 부호순위 검정과의 비교')).toBeInTheDocument()
      expect(screen.getByText('부호 검정의 원리')).toBeInTheDocument()
      expect(screen.getByText('적용 예시')).toBeInTheDocument()
    })

    it('shows proper guidance text', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      expect(screen.getByText(/대응 표본에서 중앙값의 차이를 검정하는 비모수 방법/)).toBeInTheDocument()
      expect(screen.getByText(/차이값의 부호.*만을 사용하여 분석/)).toBeInTheDocument()
      expect(screen.getByText(/분포의 가정이 필요하지 않습니다/)).toBeInTheDocument()
    })

    it('includes all required statistical concepts', async () => {
      await act(async () => {
        render(<SignTestPage />)
      })

      // Key advantages
      expect(screen.getByText('분포 가정 불필요')).toBeInTheDocument()
      expect(screen.getByText('이상치에 강건함')).toBeInTheDocument()
      expect(screen.getByText('계산이 간단함')).toBeInTheDocument()
      expect(screen.getByText('소표본에도 적용 가능')).toBeInTheDocument()

      // Applications
      expect(screen.getByText('사전-사후 비교')).toBeInTheDocument()
      expect(screen.getByText('치료 전후 효과')).toBeInTheDocument()
      expect(screen.getByText('교육 프로그램 효과')).toBeInTheDocument()
      expect(screen.getByText('제품 개선 효과')).toBeInTheDocument()
    })
  })
})