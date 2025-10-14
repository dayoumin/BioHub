import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MannWhitneyPage from '../page'

// Mock Pyodide service
const mockMannWhitneyResult = {
  statistic: -1.2345,
  pValue: 0.0234,
  uValue: 45,
  nobs1: 20,
  nobs2: 18,
  medianDiff: 2.5,
  rankSum1: 380,
  rankSum2: 361,
  effectSize: {
    value: 0.25,
    interpretation: '중간 효과'
  },
  descriptives: {
    group1: {
      median: 15.2,
      mean: 15.8,
      iqr: 5.4,
      min: 8.1,
      max: 24.3,
      q1: 12.4,
      q3: 17.8
    },
    group2: {
      median: 12.7,
      mean: 13.1,
      iqr: 4.8,
      min: 6.9,
      max: 20.1,
      q1: 10.2,
      q3: 15.0
    }
  },
  interpretation: {
    summary: '두 집단 간 통계적으로 유의한 차이가 있습니다 (p < 0.05).',
    comparison: '그룹 1의 중위수가 그룹 2보다 유의하게 높습니다.',
    recommendations: [
      'Mann-Whitney U 검정의 가정을 확인하세요',
      '효과크기를 고려한 실질적 의미를 평가하세요',
      '추가 사후분석이 필요할 수 있습니다'
    ]
  }
}

// Mock pyodide service
jest.mock('@/lib/services/pyodide-statistics', () => ({
  pyodideStats: {
    initialize: jest.fn().mockResolvedValue(undefined),
    mannWhitneyUTest: jest.fn().mockResolvedValue(mockMannWhitneyResult)
  }
}))

// Mock components
jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: ({ onVariablesSelected, methodId }: any) => (
    <div data-testid="variable-selector">
      <h3>Variable Selector for {methodId}</h3>
      <button
        onClick={() => onVariablesSelected({
          dependent: ['score'],
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
        onClick={() => onNext([
          { group: 'A', score: 15.2 },
          { group: 'B', score: 12.7 },
          { group: 'A', score: 16.1 },
          { group: 'B', score: 13.4 }
        ])}
        data-testid="upload-data"
      >
        데이터 업로드
      </button>
    </div>
  )
}))

describe('MannWhitneyPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('초기 렌더링이 정상적으로 작동한다', () => {
    render(<MannWhitneyPage />)

    // 제목 확인
    expect(screen.getByText('Mann-Whitney U 검정')).toBeInTheDocument()
    expect(screen.getByText('Wilcoxon Rank-Sum Test')).toBeInTheDocument()
    expect(screen.getByText('독립된 두 집단의 중위수 차이를 비모수적으로 검정')).toBeInTheDocument()

    // 첫 번째 단계 (방법론 소개)가 표시되는지 확인
    expect(screen.getByText('Mann-Whitney U 검정 소개')).toBeInTheDocument()
    expect(screen.getByText('분석 목적')).toBeInTheDocument()
    expect(screen.getByText('vs 독립표본 t-검정')).toBeInTheDocument()
  })

  test('방법론 설명이 올바르게 표시된다', () => {
    render(<MannWhitneyPage />)

    // 분석 목적 설명
    expect(screen.getByText('두 독립집단의 분포가 동일한지 검정하며, 중위수 차이를 비교합니다.')).toBeInTheDocument()

    // 특징 설명
    expect(screen.getByText('• 정규분포 가정 불필요')).toBeInTheDocument()
    expect(screen.getByText('• 등분산성 가정 불필요')).toBeInTheDocument()
    expect(screen.getByText('• 이상치에 강건한 검정')).toBeInTheDocument()
    expect(screen.getByText('• 소표본에도 적용 가능')).toBeInTheDocument()

    // 사용 시기 안내
    expect(screen.getByText('언제 사용하나요?')).toBeInTheDocument()
    expect(screen.getByText(/데이터가 정규분포를 따르지 않을 때/)).toBeInTheDocument()
  })

  test('데이터 업로드 단계로 진행된다', async () => {
    render(<MannWhitneyPage />)

    // 다음 단계 버튼 클릭
    const nextButton = screen.getByText('다음: 데이터 업로드')
    fireEvent.click(nextButton)

    await waitFor(() => {
      expect(screen.getByTestId('data-upload')).toBeInTheDocument()
      expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
      expect(screen.getByText('Mann-Whitney U 검정할 데이터 파일을 업로드하세요')).toBeInTheDocument()
    })
  })

  test('변수 선택 단계로 진행된다', async () => {
    render(<MannWhitneyPage />)

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
      expect(screen.getByText('종속변수(연속형)와 그룹변수(범주형)를 선택하세요')).toBeInTheDocument()
      expect(screen.getByText('Variable Selector for mann_whitney')).toBeInTheDocument()
    })
  })

  test('분석 실행 후 결과가 표시된다', async () => {
    render(<MannWhitneyPage />)

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
        expect(screen.getByText('45')).toBeInTheDocument() // U 통계량
        expect(screen.getByText('U 통계량')).toBeInTheDocument()
        expect(screen.getByText('유의확률')).toBeInTheDocument()
        expect(screen.getByText('효과크기 (r)')).toBeInTheDocument()
        expect(screen.getByText('0.250')).toBeInTheDocument()
        expect(screen.getByText('중간 효과')).toBeInTheDocument()
      },
      { timeout: 3000 }
    )
  })

  test('통계량 탭이 올바르게 표시된다', async () => {
    render(<MannWhitneyPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(() => {
      expect(screen.getByText('Mann-Whitney U 검정 통계량')).toBeInTheDocument()
      expect(screen.getByText('순위합과 U 통계량 결과')).toBeInTheDocument()

      // 통계량 테이블
      expect(screen.getByText('-1.2345')).toBeInTheDocument() // 검정통계량
      expect(screen.getByText('380.0')).toBeInTheDocument() // 그룹 1 순위합
      expect(screen.getByText('361.0')).toBeInTheDocument() // 그룹 2 순위합
    }, { timeout: 3000 })
  })

  test('기술통계 탭이 올바르게 표시된다', async () => {
    render(<MannWhitneyPage />)

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
      expect(screen.getByText('집단별 기술통계량')).toBeInTheDocument()
      expect(screen.getByText('각 그룹의 중심경향성과 분산 지표')).toBeInTheDocument()

      // 그룹별 통계량
      expect(screen.getByText('15.200')).toBeInTheDocument() // 그룹1 중위수
      expect(screen.getByText('12.700')).toBeInTheDocument() // 그룹2 중위수
      expect(screen.getByText('+2.500')).toBeInTheDocument() // 중위수 차이
    })
  })

  test('해석 탭이 올바르게 표시된다', async () => {
    render(<MannWhitneyPage />)

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
      expect(screen.getByText('집단 비교')).toBeInTheDocument()
      expect(screen.getByText('권장사항')).toBeInTheDocument()

      // 해석 내용
      expect(screen.getByText(mockMannWhitneyResult.interpretation.summary)).toBeInTheDocument()
      expect(screen.getByText(mockMannWhitneyResult.interpretation.comparison)).toBeInTheDocument()
    })
  })

  test('시각화 탭이 표시된다', async () => {
    render(<MannWhitneyPage />)

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
      expect(screen.getByText('집단별 분포 비교')).toBeInTheDocument()
      expect(screen.getByText('📊 박스플롯 및 히스토그램은 추후 구현 예정입니다')).toBeInTheDocument()
    })
  })

  test('이전 버튼들이 올바르게 작동한다', async () => {
    render(<MannWhitneyPage />)

    // 데이터 업로드 단계로 이동
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => expect(screen.getByTestId('data-upload')).toBeInTheDocument())

    // 이전 버튼 클릭
    fireEvent.click(screen.getByText('이전'))
    await waitFor(() => {
      expect(screen.getByText('Mann-Whitney U 검정 소개')).toBeInTheDocument()
    })
  })

  test('로딩 상태가 표시된다', async () => {
    // Mock을 느리게 응답하도록 변경
    const { pyodideStats } = require('@/lib/services/pyodide-statistics')
    pyodideStats.mannWhitneyUTest.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve(mockMannWhitneyResult), 1000))
    )

    render(<MannWhitneyPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    // 로딩 상태 확인
    expect(screen.getByText('Mann-Whitney U 검정 분석 중...')).toBeInTheDocument()
    expect(screen.getByText('잠시만 기다려주세요')).toBeInTheDocument()

    // 분석 완료 대기
    await waitFor(() => {
      expect(screen.getByText('45')).toBeInTheDocument() // U 통계량
    }, { timeout: 2000 })
  })

  test('Pyodide 초기화 실패 시 에러가 표시된다', async () => {
    // Mock을 실패하도록 변경
    const { pyodideStats } = require('@/lib/services/pyodide-statistics')
    pyodideStats.initialize.mockRejectedValueOnce(new Error('Initialization failed'))

    render(<MannWhitneyPage />)

    await waitFor(() => {
      expect(screen.getByText('오류')).toBeInTheDocument()
      expect(screen.getByText('통계 엔진을 초기화할 수 없습니다.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('분석 실행 실패 시 에러가 표시된다', async () => {
    // Mock을 실패하도록 변경
    const { pyodideStats } = require('@/lib/services/pyodide-statistics')
    pyodideStats.mannWhitneyUTest.mockRejectedValueOnce(new Error('Analysis failed'))

    render(<MannWhitneyPage />)

    // 전체 플로우 실행
    fireEvent.click(screen.getByText('다음: 데이터 업로드'))
    await waitFor(() => fireEvent.click(screen.getByTestId('upload-data')))
    await waitFor(() => fireEvent.click(screen.getByTestId('select-variables')))

    await waitFor(() => {
      expect(screen.getByText('오류')).toBeInTheDocument()
      expect(screen.getByText('Mann-Whitney U 검정 중 오류가 발생했습니다.')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('새로운 분석 버튼이 작동한다', async () => {
    render(<MannWhitneyPage />)

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
      expect(screen.getByText('Mann-Whitney U 검정 소개')).toBeInTheDocument()
    })
  })
})