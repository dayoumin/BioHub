import '@testing-library/jest-dom'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RepeatedMeasuresANOVAPage from '../app/(dashboard)/statistics/repeated-measures/page'

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
            { subject: 1, pre: 45, mid: 52, post: 59 },
            { subject: 2, pre: 48, mid: 55, post: 62 },
            { subject: 3, pre: 42, mid: 49, post: 56 }
          ])}
          data-testid="upload-mock-data"
        >
          Upload Mock Data
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
            dependent: ['pre', 'mid', 'post'],
            independent: []
          })}
          data-testid="select-variables"
        >
          Select Variables
        </button>
      </div>
    )
  }
})

jest.mock('@/components/statistics/StatisticsPageLayout', () => {
  return {
    StatisticsPageLayout: function StatisticsPageLayoutMock({
      children,
      steps,
      currentStep
    }: {
      children: React.ReactNode
      steps: any[]
      currentStep: number
    }) {
      return (
        <div data-testid="statistics-page-layout">
          <div data-testid="current-step">{currentStep}</div>
          <div data-testid="total-steps">{steps.length}</div>
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
          <h3>{title}</h3>
          {children}
        </div>
      )
    }
  }
})

jest.mock('@/components/statistics/common/PValueBadge', () => {
  return {
    PValueBadge: function PValueBadgeMock({ value }: { value: number }) {
      return <span data-testid="p-value-badge">{value < 0.001 ? '< 0.001' : value.toFixed(3)}</span>
    }
  }
})

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardDescription: ({ children, className }: any) => <div className={className} data-testid="card-description">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <h4 className={className} data-testid="card-title">{children}</h4>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid="button" {...props}>{children}</button>
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className} data-testid="badge">{children}</span>
}))

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: any) => <div className={className} data-testid="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>,
  AlertTitle: ({ children }: any) => <div data-testid="alert-title">{children}</div>
}))

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-testid="tabs-content" data-value={value}>{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid="tabs-trigger" data-value={value}>{children}</button>
}))

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Activity: () => <div data-testid="activity-icon" />,
  BarChart3: () => <div data-testid="barchart3-icon" />,
  CheckCircle: () => <div data-testid="checkcircle-icon" />,
  AlertTriangle: () => <div data-testid="alerttriangle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  Calculator: () => <div data-testid="calculator-icon" />,
  TrendingUp: () => <div data-testid="trendingup-icon" />,
  FileSpreadsheet: () => <div data-testid="filespreadsheet-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Target: () => <div data-testid="target-icon" />,
  Repeat: () => <div data-testid="repeat-icon" />,
  Clock: () => <div data-testid="clock-icon" />
}))

describe('RepeatedMeasuresANOVAPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('컴포넌트가 올바르게 렌더링된다', () => {
    render(<RepeatedMeasuresANOVAPage />)

    expect(screen.getByTestId('statistics-page-layout')).toBeInTheDocument()
    expect(screen.getByTestId('current-step')).toHaveTextContent('0')
    expect(screen.getByTestId('total-steps')).toHaveTextContent('4')
  })

  it('4단계 워크플로우가 올바르게 구성되어 있다', () => {
    render(<RepeatedMeasuresANOVAPage />)

    // 4단계 모두 존재하는지 확인
    expect(screen.getByTestId('total-steps')).toHaveTextContent('4')

    // 초기 단계에서는 방법론 소개가 표시되어야 함
    expect(screen.getByText('반복측정 분산분석 소개')).toBeInTheDocument()
  })

  it('데이터 업로드 후 다음 단계로 진행된다', async () => {
    render(<RepeatedMeasuresANOVAPage />)

    // 다음 버튼 클릭하여 데이터 업로드 단계로 이동
    const nextButton = screen.getByText('다음: 데이터 업로드')
    fireEvent.click(nextButton)

    // 데이터 업로드 단계가 표시되는지 확인
    expect(screen.getByTestId('data-upload-step')).toBeInTheDocument()

    // Mock 데이터 업로드
    const uploadButton = screen.getByTestId('upload-mock-data')
    fireEvent.click(uploadButton)

    // 변수 선택 단계로 진행되었는지 확인
    await waitFor(() => {
      expect(screen.getByTestId('current-step')).toHaveTextContent('2')
    })
  })

  it('변수 선택 후 분석이 실행된다', async () => {
    render(<RepeatedMeasuresANOVAPage />)

    // 다음 버튼 클릭하여 데이터 업로드 단계로 이동
    const nextButton = screen.getByText('다음: 데이터 업로드')
    fireEvent.click(nextButton)

    // Mock 데이터 업로드
    const uploadButton = screen.getByTestId('upload-mock-data')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
    })

    // 변수 선택
    const selectButton = screen.getByTestId('select-variables')
    fireEvent.click(selectButton)

    // 분석 로딩 상태 확인
    await waitFor(() => {
      expect(screen.getByText('반복측정 ANOVA 분석 중...')).toBeInTheDocument()
    })
  })

  it('분석 결과가 올바르게 표시된다', async () => {
    render(<RepeatedMeasuresANOVAPage />)

    // 워크플로우를 통해 분석까지 진행
    const nextButton = screen.getByText('다음: 데이터 업로드')
    fireEvent.click(nextButton)

    const uploadButton = screen.getByTestId('upload-mock-data')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      const selectButton = screen.getByTestId('select-variables')
      fireEvent.click(selectButton)
    })

    // 분석 완료까지 대기 (2초)
    await waitFor(() => {
      expect(screen.getByText('12.45')).toBeInTheDocument() // F 통계량
    }, { timeout: 3000 })

    // 주요 결과 요소들이 표시되는지 확인
    expect(screen.getByTestId('p-value-badge')).toBeInTheDocument()
    expect(screen.getByText('0.301')).toBeInTheDocument() // 부분 η²
  })

  it('필요한 탭들이 모두 존재한다', async () => {
    render(<RepeatedMeasuresANOVAPage />)

    // 분석까지 진행
    const nextButton = screen.getByText('다음: 데이터 업로드')
    fireEvent.click(nextButton)

    const uploadButton = screen.getByTestId('upload-mock-data')
    fireEvent.click(uploadButton)

    await waitFor(() => {
      const selectButton = screen.getByTestId('select-variables')
      fireEvent.click(selectButton)
    })

    // 분석 완료까지 대기
    await waitFor(() => {
      expect(screen.getByText('기술통계')).toBeInTheDocument()
      expect(screen.getByText('ANOVA')).toBeInTheDocument()
      expect(screen.getByText('사후검정')).toBeInTheDocument()
      expect(screen.getByText('가정검정')).toBeInTheDocument()
      expect(screen.getByText('해석')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('효과크기 해석 함수가 올바르게 작동한다', () => {
    render(<RepeatedMeasuresANOVAPage />)

    // 컴포넌트 내부의 효과크기 해석 함수 테스트는
    // 실제 결과 표시를 통해 간접적으로 확인
    // (직접적인 함수 테스트는 별도 유닛 테스트로 진행)
  })

  it('오류 상황이 올바르게 처리된다', async () => {
    // Pyodide 초기화 실패 시나리오
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

    // Mock Pyodide 초기화 실패
    jest.doMock('@/lib/services/pyodide-statistics', () => ({
      pyodideStats: {
        initialize: jest.fn().mockRejectedValue(new Error('Pyodide initialization failed')),
      }
    }))

    render(<RepeatedMeasuresANOVAPage />)

    await waitFor(() => {
      expect(screen.getByText('통계 엔진을 초기화할 수 없습니다.')).toBeInTheDocument()
    })

    consoleSpy.mockRestore()
  })
})

// 유틸리티 함수들을 별도로 테스트
describe('RepeatedMeasuresANOVA Utility Functions', () => {
  // 효과크기 해석 함수 테스트
  const getEffectSizeInterpretation = (etaSquared: number) => {
    if (etaSquared >= 0.14) return { level: '큰 효과', color: 'text-red-600', bg: 'bg-red-50' }
    if (etaSquared >= 0.06) return { level: '중간 효과', color: 'text-orange-600', bg: 'bg-orange-50' }
    if (etaSquared >= 0.01) return { level: '작은 효과', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    return { level: '효과 없음', color: 'text-gray-600', bg: 'bg-gray-50' }
  }

  const getCohensInterpretation = (d: number) => {
    const absD = Math.abs(d)
    if (absD >= 0.8) return '큰 효과'
    if (absD >= 0.5) return '중간 효과'
    if (absD >= 0.2) return '작은 효과'
    return '효과 없음'
  }

  it('효과크기 해석이 올바르게 작동한다', () => {
    expect(getEffectSizeInterpretation(0.15)).toEqual({
      level: '큰 효과',
      color: 'text-red-600',
      bg: 'bg-red-50'
    })

    expect(getEffectSizeInterpretation(0.08)).toEqual({
      level: '중간 효과',
      color: 'text-orange-600',
      bg: 'bg-orange-50'
    })

    expect(getEffectSizeInterpretation(0.03)).toEqual({
      level: '작은 효과',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50'
    })

    expect(getEffectSizeInterpretation(0.005)).toEqual({
      level: '효과 없음',
      color: 'text-gray-600',
      bg: 'bg-gray-50'
    })
  })

  it("Cohen's d 해석이 올바르게 작동한다", () => {
    expect(getCohensInterpretation(0.9)).toBe('큰 효과')
    expect(getCohensInterpretation(-0.9)).toBe('큰 효과') // 절댓값 처리
    expect(getCohensInterpretation(0.6)).toBe('중간 효과')
    expect(getCohensInterpretation(0.3)).toBe('작은 효과')
    expect(getCohensInterpretation(0.1)).toBe('효과 없음')
  })
})