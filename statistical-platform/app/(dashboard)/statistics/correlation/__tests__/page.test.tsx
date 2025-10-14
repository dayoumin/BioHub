import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CorrelationPage from '../page'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock Recharts
jest.mock('recharts', () => ({
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  Cell: () => <div data-testid="cell" />
}))

// Mock components
jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: ({ onSelectionChange, methodName }: any) => (
    <div data-testid="variable-selector">
      <h3>Variable Selector for {methodName}</h3>
      <button
        onClick={() => onSelectionChange({
          variables: ['var1', 'var2', 'var3']
        })}
        data-testid="select-variables"
      >
        변수 선택
      </button>
    </div>
  )
}))

jest.mock('@/components/smart-flow/steps/DataUploadStep', () => ({
  DataUploadStep: ({ onNext }: any) => (
    <div data-testid="data-upload">
      <button
        onClick={() => onNext({
          data: [
            { var1: 10, var2: 20, var3: 30 },
            { var1: 15, var2: 25, var3: 35 }
          ],
          fileName: 'test.csv',
          columns: ['var1', 'var2', 'var3']
        })}
        data-testid="upload-data"
      >
        데이터 업로드
      </button>
    </div>
  )
}))

// Mock utilities
jest.mock('@/lib/statistics/variable-requirements', () => ({
  getVariableRequirements: () => ({
    continuous: { min: 2, max: 10 },
    categorical: { min: 0, max: 2 }
  })
}))

jest.mock('@/lib/services/variable-type-detector', () => ({
  detectVariableType: () => 'continuous'
}))

describe('CorrelationPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('초기 렌더링이 정상적으로 작동한다', () => {
    render(<CorrelationPage />)

    // 제목 확인
    expect(screen.getByText('상관분석')).toBeInTheDocument()
    expect(screen.getByText('Correlation Analysis - 변수 간 관계의 강도와 방향 측정')).toBeInTheDocument()

    // 첫 번째 단계 (상관분석 방법 선택)가 표시되는지 확인
    expect(screen.getByText('상관분석 방법 선택')).toBeInTheDocument()
    expect(screen.getByText('Pearson 상관계수')).toBeInTheDocument()
    expect(screen.getByText('Spearman 순위상관')).toBeInTheDocument()
    expect(screen.getByText('Kendall 타우')).toBeInTheDocument()
    expect(screen.getByText('편상관분석')).toBeInTheDocument()
  })

  test('Pearson 상관분석 선택이 작동한다', async () => {
    render(<CorrelationPage />)

    // Pearson 상관계수 카드 클릭
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) {
      fireEvent.click(pearsonCard)
    }

    await waitFor(() => {
      expect(screen.getByText('Pearson 상관계수 선택됨')).toBeInTheDocument()
      expect(screen.getByText('연속형 변수 간 선형 상관관계 측정')).toBeInTheDocument()
    })
  })

  test('Spearman 상관분석 선택이 작동한다', async () => {
    render(<CorrelationPage />)

    // Spearman 순위상관 카드 클릭
    const spearmanCard = screen.getByText('Spearman 순위상관').closest('[class*="cursor-pointer"]')
    if (spearmanCard) {
      fireEvent.click(spearmanCard)
    }

    await waitFor(() => {
      expect(screen.getByText('Spearman 순위상관 선택됨')).toBeInTheDocument()
      expect(screen.getByText('순서형 또는 비정규 데이터의 단조 관계 측정')).toBeInTheDocument()
    })
  })

  test('Kendall 타우 선택이 작동한다', async () => {
    render(<CorrelationPage />)

    // Kendall 타우 카드 클릭
    const kendallCard = screen.getByText('Kendall 타우').closest('[class*="cursor-pointer"]')
    if (kendallCard) {
      fireEvent.click(kendallCard)
    }

    await waitFor(() => {
      expect(screen.getByText('Kendall 타우 선택됨')).toBeInTheDocument()
      expect(screen.getByText('순서형 변수의 일치도 기반 상관 측정')).toBeInTheDocument()
    })
  })

  test('편상관분석 선택이 작동한다', async () => {
    render(<CorrelationPage />)

    // 편상관분석 카드 클릭
    const partialCard = screen.getByText('편상관분석').closest('[class*="cursor-pointer"]')
    if (partialCard) {
      fireEvent.click(partialCard)
    }

    await waitFor(() => {
      expect(screen.getByText('편상관분석 선택됨')).toBeInTheDocument()
      expect(screen.getByText('제3변수 통제 후 순수 상관관계 측정')).toBeInTheDocument()
    })
  })

  test('데이터 업로드 단계로 진행된다', async () => {
    render(<CorrelationPage />)

    // Pearson 상관분석 선택
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) {
      fireEvent.click(pearsonCard)
    }

    await waitFor(() => {
      expect(screen.getByTestId('data-upload')).toBeInTheDocument()
      expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
    })
  })

  test('변수 선택 단계로 진행된다', async () => {
    render(<CorrelationPage />)

    // 1. 상관분석 방법 선택
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) {
      fireEvent.click(pearsonCard)
    }

    // 2. 데이터 업로드
    await waitFor(() => {
      const uploadButton = screen.getByTestId('upload-data')
      fireEvent.click(uploadButton)
    })

    // 3. 변수 선택 단계 확인
    await waitFor(() => {
      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
      expect(screen.getByText('변수 선택')).toBeInTheDocument()
    })
  })

  test('분석 실행 후 결과가 표시된다', async () => {
    render(<CorrelationPage />)

    // 1. 상관분석 방법 선택
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) {
      fireEvent.click(pearsonCard)
    }

    // 2. 데이터 업로드
    await waitFor(() => {
      const uploadButton = screen.getByTestId('upload-data')
      fireEvent.click(uploadButton)
    })

    // 3. 변수 선택 (자동으로 분석 실행)
    await waitFor(() => {
      const selectButton = screen.getByTestId('select-variables')
      fireEvent.click(selectButton)
    })

    // 4. 결과 확인
    await waitFor(
      () => {
        expect(screen.getByText('상관분석 결과')).toBeInTheDocument()
        expect(screen.getByText('분석 요약')).toBeInTheDocument()
        expect(screen.getByText('주요 상관관계 분석 결과')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('상관계수 매트릭스가 표시된다', async () => {
    render(<CorrelationPage />)

    // 전체 플로우 실행
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) fireEvent.click(pearsonCard)

    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    // 상관계수 매트릭스 확인
    await waitFor(
      () => {
        expect(screen.getByText('상관계수 매트릭스')).toBeInTheDocument()
        expect(screen.getByText('강한 양의 상관')).toBeInTheDocument()
        expect(screen.getByText('강한 음의 상관')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('산점도가 표시된다', async () => {
    render(<CorrelationPage />)

    // 전체 플로우 실행
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) fireEvent.click(pearsonCard)

    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    // 산점도 확인
    await waitFor(
      () => {
        expect(screen.getByText('산점도 및 추세선')).toBeInTheDocument()
        expect(screen.getByTestId('scatter-chart')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('가정 검정 결과가 표시된다', async () => {
    render(<CorrelationPage />)

    // 전체 플로우 실행하여 결과까지 도달
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) fireEvent.click(pearsonCard)

    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(
      () => {
        expect(screen.getByText('가정 검정')).toBeInTheDocument()
        expect(screen.getByText('정규성 검정 (Shapiro-Wilk)')).toBeInTheDocument()
        expect(screen.getByText('선형성 검정')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('편상관분석 결과가 표시된다', async () => {
    render(<CorrelationPage />)

    // 편상관분석 선택
    const partialCard = screen.getByText('편상관분석').closest('[class*="cursor-pointer"]')
    if (partialCard) fireEvent.click(partialCard)

    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(
      () => {
        expect(screen.getByText('편상관분석 결과')).toBeInTheDocument()
        expect(screen.getByText('통제변수')).toBeInTheDocument()
        expect(screen.getByText('원래 상관계수')).toBeInTheDocument()
        expect(screen.getByText('편상관계수')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('액션 버튼들이 표시된다', async () => {
    render(<CorrelationPage />)

    // 전체 플로우 실행하여 결과까지 도달
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) fireEvent.click(pearsonCard)

    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(
      () => {
        expect(screen.getByText('보고서 생성')).toBeInTheDocument()
        expect(screen.getByText('결과 다운로드')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('상관분석 메서드별 공식이 올바르게 표시된다', async () => {
    render(<CorrelationPage />)

    // Pearson 선택 시
    const pearsonCard = screen.getByText('Pearson 상관계수').closest('[class*="cursor-pointer"]')
    if (pearsonCard) fireEvent.click(pearsonCard)

    // Spearman으로 변경하여 공식 확인
    const spearmanCard = screen.getByText('Spearman 순위상관').closest('[class*="cursor-pointer"]')
    if (spearmanCard) fireEvent.click(spearmanCard)

    await waitFor(() => {
      expect(screen.getByText('Spearman 순위상관 선택됨')).toBeInTheDocument()
    })
  })

  test('상관분석 방법별 가정이 올바르게 표시된다', () => {
    render(<CorrelationPage />)

    // Pearson 상관계수 가정 확인
    expect(screen.getByText('정규성')).toBeInTheDocument()
    expect(screen.getByText('선형성')).toBeInTheDocument()
    expect(screen.getByText('등분산성')).toBeInTheDocument()

    // Spearman 가정 확인
    expect(screen.getByText('단조성')).toBeInTheDocument()
    expect(screen.getByText('순서척도 이상')).toBeInTheDocument()

    // Kendall 가정 확인
    expect(screen.getByText('순서척도')).toBeInTheDocument()
    expect(screen.getByText('작은 표본 적합')).toBeInTheDocument()

    // 편상관분석 가정 확인
    expect(screen.getByText('통제변수 필요')).toBeInTheDocument()
  })
})