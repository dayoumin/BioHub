import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ANOVAPage from '../page'

// Mock hooks
jest.mock('@/hooks/use-pyodide-service', () => ({
  usePyodideService: () => ({
    pyodideService: {
      isReady: true,
      anovaAnalysis: jest.fn()
    }
  })
}))

// Mock components
jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: ({ onSelectionChange, methodName }: any) => (
    <div data-testid="variable-selector">
      <h3>Variable Selector for {methodName}</h3>
      <button
        onClick={() => onSelectionChange({
          dependent: 'score',
          independent: ['group']
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
          data: [{ group: 'A', score: 85 }, { group: 'B', score: 90 }],
          fileName: 'test.csv',
          columns: ['group', 'score']
        })}
        data-testid="upload-data"
      >
        데이터 업로드
      </button>
    </div>
  )
}))

describe('ANOVAPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('초기 렌더링이 정상적으로 작동한다', () => {
    render(<ANOVAPage />)

    // 제목 확인
    expect(screen.getByText('ANOVA 분산분석')).toBeInTheDocument()
    expect(screen.getByText('Analysis of Variance - 세 개 이상 그룹의 평균 비교')).toBeInTheDocument()

    // 첫 번째 단계 (메서드 선택)가 표시되는지 확인
    expect(screen.getByText('ANOVA 분석 방법 선택')).toBeInTheDocument()
    expect(screen.getByText('일원 분산분석')).toBeInTheDocument()
    expect(screen.getByText('이원 분산분석')).toBeInTheDocument()
    expect(screen.getByText('반복측정 분산분석')).toBeInTheDocument()
  })

  test('ANOVA 유형 선택이 작동한다', async () => {
    render(<ANOVAPage />)

    // 일원 분산분석 선택
    const oneWayCard = screen.getByText('일원 분산분석').closest('div[role="button"]')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    await waitFor(() => {
      expect(screen.getByText('일원 분산분석 선택됨')).toBeInTheDocument()
    })
  })

  test('데이터 업로드 단계로 진행된다', async () => {
    render(<ANOVAPage />)

    // 일원 분산분석 선택
    const oneWayCard = screen.getByText('일원 분산분석').closest('div')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    await waitFor(() => {
      expect(screen.getByTestId('data-upload')).toBeInTheDocument()
      expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
    })
  })

  test('변수 선택 단계로 진행된다', async () => {
    render(<ANOVAPage />)

    // 1. ANOVA 유형 선택
    const oneWayCard = screen.getByText('일원 분산분석').closest('div')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
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
    render(<ANOVAPage />)

    // 1. ANOVA 유형 선택
    const oneWayCard = screen.getByText('일원 분산분석').closest('div')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    // 2. 데이터 업로드
    await waitFor(() => {
      const uploadButton = screen.getByTestId('upload-data')
      fireEvent.click(uploadButton)
    })

    // 3. 변수 선택
    await waitFor(() => {
      const selectButton = screen.getByTestId('select-variables')
      fireEvent.click(selectButton)
    })

    // 4. 결과 확인
    await waitFor(
      () => {
        expect(screen.getByText('분산분석 결과')).toBeInTheDocument()
        expect(screen.getByText('ANOVA Table')).toBeInTheDocument()
        expect(screen.getByText('효과크기')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('결과에서 통계값들이 올바르게 표시된다', async () => {
    render(<ANOVAPage />)

    // 전체 플로우 실행
    const oneWayCard = screen.getByText('일원 분산분석').closest('div')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    await waitFor(() => {
      const uploadButton = screen.getByTestId('upload-data')
      fireEvent.click(uploadButton)
    })

    await waitFor(() => {
      const selectButton = screen.getByTestId('select-variables')
      fireEvent.click(selectButton)
    })

    // 결과 통계값 확인
    await waitFor(
      () => {
        // F 통계량과 p-value 확인
        expect(screen.getByText(/F\(\d+, \d+\) = \d+\.\d+/)).toBeInTheDocument()
        expect(screen.getByText(/p = 0\.\d+/)).toBeInTheDocument()

        // 효과크기 확인
        expect(screen.getByText('Eta-squared (η²)')).toBeInTheDocument()
        expect(screen.getByText('Omega-squared (ω²)')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('가정 검정 결과가 표시된다', async () => {
    render(<ANOVAPage />)

    // 전체 플로우 실행하여 결과까지 도달
    const oneWayCard = screen.getByText('일원 분산분석').closest('div')
    if (oneWayCard) fireEvent.click(oneWayCard)

    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(
      () => {
        expect(screen.getByText('정규성 (Shapiro-Wilk)')).toBeInTheDocument()
        expect(screen.getByText('등분산성 (Levene)')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('액션 버튼들이 표시된다', async () => {
    render(<ANOVAPage />)

    // 전체 플로우 실행하여 결과까지 도달
    const oneWayCard = screen.getByText('일원 분산분석').closest('div')
    if (oneWayCard) fireEvent.click(oneWayCard)

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
})