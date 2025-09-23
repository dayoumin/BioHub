import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ANOVAPage from '../anova/page'

// Mock 의존성들
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

jest.mock('@/components/smart-flow/steps/DataUploadStep', () => ({
  __esModule: true,
  default: ({ onNext }: any) => (
    <div>
      <button onClick={() => onNext({
        data: [
          { group: 'A', value: 10 },
          { group: 'B', value: 15 },
          { group: 'C', value: 20 }
        ]
      })}>
        데이터 업로드 테스트
      </button>
    </div>
  ),
}))

jest.mock('@/components/variable-selection/ProfessionalVariableSelector', () => ({
  ProfessionalVariableSelector: ({ onSelectionChange }: any) => (
    <div>
      <button onClick={() => onSelectionChange({
        dependent: 'value',
        factor: 'group'
      })}>
        변수 선택 완료
      </button>
    </div>
  ),
}))

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}))

describe('ANOVA Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('ANOVA 유형 선택 카드가 모두 표시되어야 함', () => {
    render(<ANOVAPage />)

    expect(screen.getByText('일원 분산분석')).toBeInTheDocument()
    expect(screen.getByText('이원 분산분석')).toBeInTheDocument()
    expect(screen.getByText('반복측정 분산분석')).toBeInTheDocument()
  })

  it('각 ANOVA 유형의 설명이 올바르게 표시되어야 함', () => {
    render(<ANOVAPage />)

    // 일원 ANOVA
    expect(screen.getByText(/하나의 독립변수\(요인\)가 종속변수에 미치는 영향/)).toBeInTheDocument()

    // 이원 ANOVA
    expect(screen.getByText(/두 개의 독립변수와 상호작용/)).toBeInTheDocument()

    // 반복측정 ANOVA
    expect(screen.getByText(/동일한 대상에서 반복 측정/)).toBeInTheDocument()
  })

  it('ANOVA 유형 선택 시 다음 단계로 진행해야 함', () => {
    render(<ANOVAPage />)

    const oneWayCard = screen.getByText('일원 분산분석').closest('div[class*="card"]')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    // 선택 확인 메시지
    expect(screen.getByText('일원 분산분석 선택됨')).toBeInTheDocument()

    // 데이터 업로드 단계 표시
    expect(screen.getByText('데이터 업로드 테스트')).toBeInTheDocument()
  })

  it('전체 분석 워크플로우가 작동해야 함', async () => {
    render(<ANOVAPage />)

    // 1. 일원 ANOVA 선택
    const oneWayCard = screen.getByText('일원 분산분석').closest('div[class*="card"]')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    // 2. 데이터 업로드
    const uploadButton = screen.getByText('데이터 업로드 테스트')
    fireEvent.click(uploadButton)

    // 3. 변수 선택
    await waitFor(() => {
      const selectButton = screen.getByText('변수 선택 완료')
      fireEvent.click(selectButton)
    })

    // 4. 분석 결과 확인
    await waitFor(() => {
      // F 통계량 표시 확인
      expect(screen.getByText(/F\(/)).toBeInTheDocument()
      // p-value 표시 확인
      expect(screen.getByText(/p =/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('ANOVA 테이블이 표시되어야 함', async () => {
    render(<ANOVAPage />)

    // 워크플로우 실행
    const twoWayCard = screen.getByText('이원 분산분석').closest('div[class*="card"]')
    if (twoWayCard) {
      fireEvent.click(twoWayCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드 테스트'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('변수 선택 완료'))
    })

    // ANOVA 테이블 요소 확인
    await waitFor(() => {
      expect(screen.getByText('ANOVA Table')).toBeInTheDocument()
      expect(screen.getByText('Between Groups')).toBeInTheDocument()
      expect(screen.getByText('Within Groups')).toBeInTheDocument()
      expect(screen.getByText('Total')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('유의한 결과일 때 사후검정이 표시되어야 함', async () => {
    render(<ANOVAPage />)

    // 전체 워크플로우 실행
    const oneWayCard = screen.getByText('일원 분산분석').closest('div[class*="card"]')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드 테스트'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('변수 선택 완료'))
    })

    // 사후검정 결과 확인 (p < 0.05일 때만)
    await waitFor(() => {
      // 모의 데이터가 유의한 결과를 반환하므로 Tukey HSD가 표시되어야 함
      expect(screen.getByText(/Tukey HSD/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('효과크기가 표시되어야 함', async () => {
    render(<ANOVAPage />)

    // 워크플로우 실행
    const oneWayCard = screen.getByText('일원 분산분석').closest('div[class*="card"]')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드 테스트'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('변수 선택 완료'))
    })

    // 효과크기 지표 확인
    await waitFor(() => {
      expect(screen.getByText(/Eta-squared/)).toBeInTheDocument()
      expect(screen.getByText(/Omega-squared/)).toBeInTheDocument()
      expect(screen.getByText(/Cohen's f/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('가정 검정 결과가 표시되어야 함', async () => {
    render(<ANOVAPage />)

    // 반복측정 ANOVA 선택
    const repeatedCard = screen.getByText('반복측정 분산분석').closest('div[class*="card"]')
    if (repeatedCard) {
      fireEvent.click(repeatedCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드 테스트'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('변수 선택 완료'))
    })

    // 가정 검정 확인
    await waitFor(() => {
      expect(screen.getByText(/정규성 \(Shapiro-Wilk\)/)).toBeInTheDocument()
      expect(screen.getByText(/등분산성 \(Levene\)/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('초기화 버튼이 모든 상태를 리셋해야 함', async () => {
    render(<ANOVAPage />)

    // 이원 ANOVA 선택 후 진행
    const twoWayCard = screen.getByText('이원 분산분석').closest('div[class*="card"]')
    if (twoWayCard) {
      fireEvent.click(twoWayCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드 테스트'))

    // 초기화 버튼 클릭
    const resetButton = screen.getByText('초기화')
    fireEvent.click(resetButton)

    // 첫 화면으로 돌아갔는지 확인
    expect(screen.getByText('일원 분산분석')).toBeInTheDocument()
    expect(screen.getByText('이원 분산분석')).toBeInTheDocument()
    expect(screen.getByText('반복측정 분산분석')).toBeInTheDocument()
    expect(screen.queryByText('데이터 업로드 테스트')).not.toBeInTheDocument()
  })

  it('각 ANOVA 유형에 맞는 예시가 표시되어야 함', () => {
    render(<ANOVAPage />)

    // 일원 ANOVA 예시
    expect(screen.getByText(/교육 방법\(A, B, C\)이 시험 성적/)).toBeInTheDocument()

    // 이원 ANOVA 예시
    expect(screen.getByText(/교육 방법\(A, B\)과 성별\(남, 여\)/)).toBeInTheDocument()

    // 반복측정 ANOVA 예시
    expect(screen.getByText(/치료 전, 1주 후, 1개월 후 혈압/)).toBeInTheDocument()
  })

  it('그룹별 평균 차트가 렌더링되어야 함', async () => {
    render(<ANOVAPage />)

    // 워크플로우 실행
    const oneWayCard = screen.getByText('일원 분산분석').closest('div[class*="card"]')
    if (oneWayCard) {
      fireEvent.click(oneWayCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드 테스트'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('변수 선택 완료'))
    })

    // 차트 확인
    await waitFor(() => {
      expect(screen.getByText('그룹별 평균 및 95% 신뢰구간')).toBeInTheDocument()
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})