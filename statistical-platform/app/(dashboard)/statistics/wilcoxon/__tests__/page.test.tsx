import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WilcoxonPage from '../page'

// Mock Wilcoxon test result
const mockWilcoxonResult = {
  statistic: 85.5,
  pValue: 0.0156,
  nobs: 25,
  zScore: -2.4321,
  medianDiff: 3.2,
  effectSize: {
    value: 0.35,
    interpretation: '중간 효과'
  },
  descriptives: {
    before: {
      median: 12.5,
      mean: 12.8,
      iqr: 4.2,
      min: 6.1,
      max: 19.4,
      q1: 10.3,
      q3: 14.5
    },
    after: {
      median: 15.7,
      mean: 16.0,
      iqr: 4.8,
      min: 8.9,
      max: 22.1,
      q1: 13.2,
      q3: 18.0
    },
    differences: {
      positive: 18,
      negative: 7,
      ties: 0,
      median: 3.2
    }
  },
  interpretation: {
    summary: '사전-사후 측정값 간 통계적으로 유의한 차이가 있습니다 (p < 0.05).',
    comparison: '사후 측정값이 사전 측정값보다 유의하게 높습니다.',
    recommendations: [
      'Wilcoxon 검정의 가정을 확인하세요',
      '차이값의 대칭분포를 검토하세요',
      '효과크기를 고려한 임상적 의미를 평가하세요'
    ]
  }
}

// Mock pyodide service
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: jest.fn().mockResolvedValue(undefined),
    wilcoxonSignedRankTest: jest.fn().mockResolvedValue(mockWilcoxonResult)
  }
}))

// Mock components
jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: ({ onVariablesSelected, methodId }: any) => (
    <div data-testid="variable-selector">
      <h3>Variable Selector for {methodId}</h3>
      <button
        onClick={() => onVariablesSelected({
          dependent: ['pre_score', 'post_score']
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
        onClick={() => onNext([
          { id: 1, pre_score: 12.5, post_score: 15.7 },
          { id: 2, pre_score: 11.2, post_score: 14.3 },
          { id: 3, pre_score: 13.8, post_score: 16.9 },
          { id: 4, pre_score: 10.4, post_score: 13.1 }
        ])}
        data-testid="upload-data"
      >
        데이터 업로드
      </button>
    </div>
  )
}))

describe('WilcoxonPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('초기 렌더링이 정상적으로 작동한다', () => {
    render(<WilcoxonPage />)

    // 제목 확인
    expect(screen.getByText('Wilcoxon 부호순위 검정')).toBeInTheDocument()
    expect(screen.getByText('Wilcoxon Signed-Rank Test')).toBeInTheDocument()
    expect(screen.getByText('대응표본의 중위수 차이를 비모수적으로 검정')).toBeInTheDocument()

    // 첫 번째 단계 (방법론 소개)가 표시되는지 확인
    expect(screen.getByText('Wilcoxon 부호순위 검정 소개')).toBeInTheDocument()
    expect(screen.getByText('분석 목적')).toBeInTheDocument()
    expect(screen.getByText('vs 대응표본 t-검정')).toBeInTheDocument()
  })

  test('방법론 설명이 올바르게 표시된다', () => {
    render(<WilcoxonPage />)

    // 분석 목적 설명
    expect(screen.getByText('동일한 개체에서 두 시점의 측정값 차이를 비모수적으로 검정합니다.')).toBeInTheDocument()

    // 특징 설명
    expect(screen.getByText('• 사전-사후 측정 비교')).toBeInTheDocument()
    expect(screen.getByText('• 중재/처치 효과 검정')).toBeInTheDocument()
    expect(screen.getByText('• 정규분포 가정 불필요')).toBeInTheDocument()
    expect(screen.getByText('• 소표본에서도 강건')).toBeInTheDocument()

    // 비교 설명
    expect(screen.getByText('Wilcoxon 검정')).toBeInTheDocument()
    expect(screen.getByText('비모수, 순위 기반, 강건')).toBeInTheDocument()
    expect(screen.getByText('대응표본 t-검정')).toBeInTheDocument()
    expect(screen.getByText('모수, 차이의 정규분포 가정')).toBeInTheDocument()

    // 사용 시기 안내
    expect(screen.getByText('언제 사용하나요?')).toBeInTheDocument()
    expect(screen.getByText(/차이값이 정규분포를 따르지 않을 때/)).toBeInTheDocument()
  })

  test('데이터 업로드 단계로 진행된다', async () => {
    render(<WilcoxonPage />)

    // 다음 단계 버튼 클릭
    const nextButton = screen.getByText('다음: 데이터 업로드')
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByTestId('data-upload')).toBeInTheDocument()
      expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
      expect(screen.getByText('대응표본 데이터 파일을 업로드하세요')).toBeInTheDocument()
    })
  })

  test('데이터 형식 안내가 표시된다', async () => {
    render(<WilcoxonPage />)

    // 데이터 업로드 단계로 이동
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))

    await waitFor(() => {
      expect(screen.getByText('데이터 형식 안내')).toBeInTheDocument()
      expect(screen.getByText(/각 행은 하나의 개체\(참가자\)를 나타냅니다/)).toBeInTheDocument()
      expect(screen.getByText(/두 개의 열이 필요합니다: 사전 측정값, 사후 측정값/)).toBeInTheDocument()
      expect(screen.getByText(/예: before_score, after_score/)).toBeInTheDocument()
    })
  })

  test('변수 선택 단계로 진행된다', async () => {
    render(<WilcoxonPage />)

    // 1. 다음 단계로 이동
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))

    // 2. 데이터 업로드
    await waitFor(() => {
      const uploadButton = screen.getByTestId('upload-data')
      fireEvent.click(uploadButton)
    })

    // 3. 변수 선택 단계 확인
    await waitFor(() => {
      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
      expect(screen.getByText('변수 선택')).toBeInTheDocument()
      expect(screen.getByText('사전-사후 측정 변수를 선택하세요')).toBeInTheDocument()
      expect(screen.getByText('Variable Selector for wilcoxon_signed_rank')).toBeInTheDocument()
    })
  })

  test('변수 선택 가이드가 표시된다', async () => {
    render(<WilcoxonPage />)

    // 변수 선택 단계까지 이동
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))

    await waitFor(() => {
      expect(screen.getByText('변수 선택 가이드')).toBeInTheDocument()
      expect(screen.getByText(/종속변수 1: 사전 측정값 \(예: before_score\)/)).toBeInTheDocument()
      expect(screen.getByText(/종속변수 2: 사후 측정값 \(예: after_score\)/)).toBeInTheDocument()
      expect(screen.getByText(/동일한 척도로 측정된 두 변수를 선택해주세요/)).toBeInTheDocument()
    })
  })

  test('분석 실행 후 결과가 표시된다', async () => {
    render(<WilcoxonPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))

    await waitFor(() => {
      const uploadButton = screen.getByTestId('upload-data')
      fireEvent.click(uploadButton)
    })

    await waitFor(() => {
      const selectButton = screen.getByTestId('select-variables')
      fireEvent.click(selectButton)
    })

    // 결과 확인
    await waitFor(
      () => {
        // 주요 결과 카드
        expect(screen.getByText('85.5')).toBeInTheDocument() // W 통계량
        expect(screen.getByText('W 통계량')).toBeInTheDocument()
        expect(screen.getByText('유의확률')).toBeInTheDocument()
        expect(screen.getByText('효과크기 (r)')).toBeInTheDocument()
        expect(screen.getByText('0.350')).toBeInTheDocument()
        expect(screen.getByText('중간 효과')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('통계량 탭이 올바르게 표시된다', async () => {
    render(<WilcoxonPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(() => {
      expect(screen.getByText('Wilcoxon 부호순위 검정 통계량')).toBeInTheDocument()
      expect(screen.getByText('순위합과 검정통계량 결과')).toBeInTheDocument()

      // 통계량 테이블
      expect(screen.getByText('-2.4321')).toBeInTheDocument() // Z 점수
      expect(screen.getByText('25')).toBeInTheDocument() // 유효 표본 수
      expect(screen.getByText('+3.200')).toBeInTheDocument() // 중위수 차이
    }, { timeout: 3000 })
  })

  test('기술통계 탭이 올바르게 표시된다', async () => {
    render(<WilcoxonPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    // 기술통계 탭 클릭
    await waitFor(() => {
      const descriptivesTab = screen.getByText('기술통계')
      fireEvent.click(descriptivesTab)
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByText('사전-사후 기술통계량')).toBeInTheDocument()
      expect(screen.getByText('각 시점의 중심경향성과 변화량')).toBeInTheDocument()

      // 시점별 통계량
      expect(screen.getByText('사전')).toBeInTheDocument()
      expect(screen.getByText('사후')).toBeInTheDocument()
      expect(screen.getByText('12.500')).toBeInTheDocument() // 사전 중위수
      expect(screen.getByText('15.700')).toBeInTheDocument() // 사후 중위수

      // 변화 사례
      expect(screen.getByText('18')).toBeInTheDocument() // 증가한 사례
      expect(screen.getByText('7')).toBeInTheDocument() // 감소한 사례
      expect(screen.getByText('0')).toBeInTheDocument() // 동일한 사례
      expect(screen.getByText('증가한 사례')).toBeInTheDocument()
      expect(screen.getByText('감소한 사례')).toBeInTheDocument()
      expect(screen.getByText('동일한 사례')).toBeInTheDocument()
    })
  })

  test('해석 탭이 올바르게 표시된다', async () => {
    render(<WilcoxonPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    // 해석 탭 클릭
    await waitFor(() => {
      const interpretationTab = screen.getByText('해석')
      fireEvent.click(interpretationTab)
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByText('결과 해석')).toBeInTheDocument()
      expect(screen.getByText('분석 결과 요약')).toBeInTheDocument()
      expect(screen.getByText('변화 분석')).toBeInTheDocument()
      expect(screen.getByText('권장사항')).toBeInTheDocument()

      // 해석 내용
      expect(screen.getByText(mockWilcoxonResult.interpretation.summary)).toBeInTheDocument()
      expect(screen.getByText(mockWilcoxonResult.interpretation.comparison)).toBeInTheDocument()

      // 권장사항
      expect(screen.getByText('Wilcoxon 검정의 가정을 확인하세요')).toBeInTheDocument()
      expect(screen.getByText('차이값의 대칭분포를 검토하세요')).toBeInTheDocument()
    })
  })

  test('시각화 탭이 표시된다', async () => {
    render(<WilcoxonPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    // 시각화 탭 클릭
    await waitFor(() => {
      const visualizationTab = screen.getByText('시각화')
      fireEvent.click(visualizationTab)
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByText('데이터 시각화')).toBeInTheDocument()
      expect(screen.getByText('사전-사후 변화 시각화')).toBeInTheDocument()
      expect(screen.getByText('📊 사전-사후 비교 차트 및 변화량 분포는 추후 구현 예정입니다')).toBeInTheDocument()
    })
  })

  test('이전 버튼들이 올바르게 작동한다', async () => {
    render(<WilcoxonPage />)

    // 데이터 업로드 단계로 이동
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => expect(screen.getByTestId('data-upload')).toBeInTheDocument())

    // 이전 버튼 클릭
    fireEvent.click(screen.getByText('이전'))
    await waitFor(() => {
      expect(screen.getByText('Wilcoxon 부호순위 검정 소개')).toBeInTheDocument()
    })
  })

  test('로딩 상태가 표시된다', async () => {
    // Mock을 느리게 응답하도록 변경
    const { pyodideStats } = require('@/lib/services/pyodide-statistics')
    pyodideStats.wilcoxonSignedRankTest.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockWilcoxonResult), 1000))
    )

    render(<WilcoxonPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    // 로딩 상태 확인
    expect(screen.getByText('Wilcoxon 부호순위 검정 분석 중...')).toBeInTheDocument()
    expect(screen.getByText('잠시만 기다려주세요')).toBeInTheDocument()

    // 분석 완료 대기
    await waitFor(() => {
      expect(screen.getByText('85.5')).toBeInTheDocument() // W 통계량
    }, { timeout: 2000 })
  })

  test('Pyodide 초기화 실패 시 에러가 표시된다', async () => {
    // Mock을 실패하도록 변경
    const { pyodideStats } = require('@/lib/services/pyodide-statistics')
    pyodideStats.initialize.mockRejectedValueOnce(new Error('Initialization failed'))

    render(<WilcoxonPage />)

    await waitFor(() => {
      expect(screen.getByText('오류')).toBeInTheDocument()
      expect(screen.getByText('통계 엔진을 초기화할 수 없습니다.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('분석 실행 실패 시 에러가 표시된다', async () => {
    // Mock을 실패하도록 변경
    const { pyodideStats } = require('@/lib/services/pyodide-statistics')
    pyodideStats.wilcoxonSignedRankTest.mockRejectedValueOnce(new Error('Analysis failed'))

    render(<WilcoxonPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(() => {
      expect(screen.getByText('오류')).toBeInTheDocument()
      expect(screen.getByText('Wilcoxon 부호순위 검정 중 오류가 발생했습니다.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('변수가 두 개가 아닐 때 에러가 표시된다', async () => {
    // 한 개 변수만 선택하는 Mock
    const SingleVariableMock = ({ onVariablesSelected }: any) => (
      <div data-testid="variable-selector">
        <button
          onClick={() => onVariablesSelected({
            dependent: ['pre_score'] // 하나만 선택
          })}
          data-testid="select-single-variable"
        >
          한 개 변수 선택
        </button>
      </div>
    )

    jest.doMock('@/components/variable-selection/VariableSelector', () => ({
      VariableSelector: SingleVariableMock
    }))

    render(<WilcoxonPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-single-variable')))

    // 에러는 분석이 실행되지 않으므로 여전히 변수 선택 단계에 머물러 있어야 함
    expect(screen.getByText('변수 선택')).toBeInTheDocument()
  })

  test('새로운 분석 버튼이 작동한다', async () => {
    render(<WilcoxonPage />)

    // 전체 플로우 실행하여 결과까지 도달
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    // 결과 확인 후 새로운 분석 버튼 클릭
    await waitFor(() => {
      const newAnalysisButton = screen.getByText('새로운 분석')
      fireEvent.click(newAnalysisButton)
    }, { timeout: 3000 })

    await waitFor(() => {
      expect(screen.getByText('Wilcoxon 부호순위 검정 소개')).toBeInTheDocument()
    })
  })

  test('결과 내보내기 버튼이 표시된다', async () => {
    render(<WilcoxonPage />)

    // 전체 플로우 실행하여 결과까지 도달
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(() => {
      expect(screen.getByText('결과 내보내기')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})