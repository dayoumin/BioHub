import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TTestPage from '../page'

// Mock hooks
jest.mock('@/hooks/use-pyodide-service', () => ({
  usePyodideService: () => ({
    pyodideService: {
      isReady: true,
      tTest: jest.fn()
    }
  })
}))

// Mock components
jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: ({ onVariablesSelected, methodId }: any) => (
    <div data-testid="variable-selector">
      <h3>Variable Selector for {methodId}</h3>
      <button
        onClick={() => onVariablesSelected({
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

describe('TTestPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('초기 렌더링이 정상적으로 작동한다', () => {
    render(<TTestPage />)

    // 제목 확인
    expect(screen.getByText('T-검정 (T-Test)')).toBeInTheDocument()
    expect(screen.getByText('평균 차이를 검정하는 모수적 통계 방법')).toBeInTheDocument()

    // 첫 번째 단계 (검정 유형 선택)가 표시되는지 확인
    expect(screen.getByText('검정 유형 선택')).toBeInTheDocument()
    expect(screen.getByText('일표본')).toBeInTheDocument()
    expect(screen.getByText('독립표본')).toBeInTheDocument()
    expect(screen.getByText('대응표본')).toBeInTheDocument()
  })

  test('T-test 유형 선택이 작동한다', async () => {
    render(<TTestPage />)

    // 일표본 t-검정 선택
    const oneSampleTab = screen.getByText('일표본').closest('[role="tab"]')
    if (oneSampleTab) {
      fireEvent.click(oneSampleTab)
    }

    await waitFor(() => {
      expect(screen.getByText('일표본 t-검정이란?')).toBeInTheDocument()
      expect(screen.getByText('검정값 (기준값)')).toBeInTheDocument()
    })
  })

  test('독립표본 t-검정 선택시 적절한 안내가 표시된다', async () => {
    render(<TTestPage />)

    // 독립표본 t-검정 선택 (기본값)
    await waitFor(() => {
      expect(screen.getByText('독립표본 t-검정이란?')).toBeInTheDocument()
      expect(screen.getByText('서로 독립적인 두 그룹의 평균을 비교합니다.')).toBeInTheDocument()
    })
  })

  test('대응표본 t-검정 선택이 작동한다', async () => {
    render(<TTestPage />)

    // 대응표본 t-검정 선택
    const pairedTab = screen.getByText('대응표본').closest('[role="tab"]')
    if (pairedTab) {
      fireEvent.click(pairedTab)
    }

    await waitFor(() => {
      expect(screen.getByText('대응표본 t-검정이란?')).toBeInTheDocument()
      expect(screen.getByText('동일한 대상의 전후 측정값을 비교합니다.')).toBeInTheDocument()
    })
  })

  test('데이터 업로드 단계로 진행된다', async () => {
    render(<TTestPage />)

    // 다음 단계 버튼 클릭
    const nextButton = screen.getByText('다음 단계')
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByTestId('data-upload')).toBeInTheDocument()
      expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
    })
  })

  test('변수 선택 단계로 진행된다', async () => {
    render(<TTestPage />)

    // 1. 다음 단계로 이동
    fireEvent.click(screen.getByText('다음 단계'))

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
    render(<TTestPage />)

    // 1. 다음 단계로 이동
    fireEvent.click(screen.getByText('다음 단계'))

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
        expect(screen.getByText('결과 해석')).toBeInTheDocument()
        expect(screen.getByText('t-통계량')).toBeInTheDocument()
        expect(screen.getByText('p-value')).toBeInTheDocument()
        expect(screen.getByText('자유도')).toBeInTheDocument()
        expect(screen.getByText("Cohen's d")).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('통계적 결론이 올바르게 표시된다', async () => {
    render(<TTestPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음 단계'))

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
        expect(screen.getByText('통계적 결론')).toBeInTheDocument()
        expect(screen.getByText(/귀무가설을/)).toBeInTheDocument()
        expect(screen.getByText('95% 신뢰구간')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('가정 검정 결과가 표시된다', async () => {
    render(<TTestPage />)

    // 전체 플로우 실행하여 결과까지 도달
    fireEvent.click(screen.getByText('다음 단계'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(
      () => {
        expect(screen.getByText('통계적 가정 검정')).toBeInTheDocument()
        expect(screen.getByText('정규성 (Shapiro-Wilk)')).toBeInTheDocument()
        expect(screen.getByText('등분산성 (Levene)')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('효과크기 분석이 표시된다', async () => {
    render(<TTestPage />)

    // 전체 플로우 실행하여 결과까지 도달
    fireEvent.click(screen.getByText('다음 단계'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(
      () => {
        expect(screen.getByText('효과크기 분석')).toBeInTheDocument()
        expect(screen.getAllByText("Cohen's d")).toHaveLength(2) // 한 번은 메트릭 카드에, 한 번은 효과크기 분석에
      },
      { timeout: 3000 }
    )
  })

  test('시각화 차트가 표시된다', async () => {
    render(<TTestPage />)

    // 전체 플로우 실행하여 결과까지 도달
    fireEvent.click(screen.getByText('다음 단계'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(
      () => {
        expect(screen.getByText('데이터 시각화')).toBeInTheDocument()
        expect(screen.getByText('그룹별 평균 비교')).toBeInTheDocument()
        expect(screen.getByText('평균 차이 신뢰구간')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('액션 버튼들이 표시된다', async () => {
    render(<TTestPage />)

    // 전체 플로우 실행하여 결과까지 도달
    fireEvent.click(screen.getByText('다음 단계'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(
      () => {
        expect(screen.getByText('새 분석')).toBeInTheDocument()
        expect(screen.getByText('결과 저장')).toBeInTheDocument()
        expect(screen.getByText('보고서 생성')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('일표본 검정에서 검정값 입력이 작동한다', async () => {
    render(<TTestPage />)

    // 일표본 t-검정 선택
    const oneSampleTab = screen.getByText('일표본').closest('[role="tab"]')
    if (oneSampleTab) {
      fireEvent.click(oneSampleTab)
    }

    await waitFor(() => {
      const testValueInput = screen.getByPlaceholderText('예: 100')
      fireEvent.change(testValueInput, { target: { value: '75' } })
      expect(testValueInput).toHaveValue(75)
    })
  })
})