import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import TTestPage from '../t-test/page'

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
      <button onClick={() => onNext({ data: [{ col1: 1, col2: 2 }] })}>
        데이터 업로드
      </button>
    </div>
  ),
}))

jest.mock('@/components/variable-selection/VariableSelector', () => ({
  VariableSelector: ({ onSelectionChange }: any) => (
    <div>
      <button onClick={() => onSelectionChange({ dependent: 'col1', independent: 'col2' })}>
        변수 선택 완료
      </button>
    </div>
  ),
}))

jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  ErrorBar: () => <div />,
  Dot: () => <div />,
}))

describe('T-Test Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('초기 상태에서 t-검정 유형 선택이 표시되어야 함', () => {
    render(<TTestPage />)

    expect(screen.getByText('일표본 t-검정')).toBeInTheDocument()
    expect(screen.getByText('독립표본 t-검정')).toBeInTheDocument()
    expect(screen.getByText('대응표본 t-검정')).toBeInTheDocument()
  })

  it('t-검정 유형을 선택하면 다음 단계로 진행해야 함', () => {
    render(<TTestPage />)

    // 독립표본 t-검정 선택
    const independentCard = screen.getByText('독립표본 t-검정').closest('div[class*="card"]')
    if (independentCard) {
      fireEvent.click(independentCard)
    }

    // 다음 단계(데이터 업로드)로 이동 확인
    expect(screen.getByText('데이터 업로드')).toBeInTheDocument()
  })

  it('데이터 업로드 후 변수 선택 단계로 진행해야 함', async () => {
    render(<TTestPage />)

    // 1. t-검정 유형 선택
    const independentCard = screen.getByText('독립표본 t-검정').closest('div[class*="card"]')
    if (independentCard) {
      fireEvent.click(independentCard)
    }

    // 2. 데이터 업로드
    const uploadButton = screen.getByText('데이터 업로드')
    fireEvent.click(uploadButton)

    // 3. 변수 선택 단계 확인
    await waitFor(() => {
      expect(screen.getByText('변수 선택 완료')).toBeInTheDocument()
    })
  })

  it('전체 워크플로우를 완료할 수 있어야 함', async () => {
    render(<TTestPage />)

    // 1. t-검정 유형 선택
    const twoSampleCard = screen.getByText('독립표본 t-검정').closest('div[class*="card"]')
    if (twoSampleCard) {
      fireEvent.click(twoSampleCard)
    }

    // 2. 데이터 업로드
    const uploadButton = screen.getByText('데이터 업로드')
    fireEvent.click(uploadButton)

    // 3. 변수 선택
    await waitFor(() => {
      const selectButton = screen.getByText('변수 선택 완료')
      fireEvent.click(selectButton)
    })

    // 4. 결과 확인 (시뮬레이션된 결과)
    await waitFor(() => {
      expect(screen.getByText(/통계적으로 유의한 차이/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('초기화 버튼이 작동해야 함', async () => {
    render(<TTestPage />)

    // t-검정 유형 선택
    const oneSampleCard = screen.getByText('일표본 t-검정').closest('div[class*="card"]')
    if (oneSampleCard) {
      fireEvent.click(oneSampleCard)
    }

    // 초기화 버튼 클릭
    const resetButton = screen.getByText('초기화')
    fireEvent.click(resetButton)

    // 첫 단계로 돌아갔는지 확인
    expect(screen.getByText('일표본 t-검정')).toBeInTheDocument()
    expect(screen.getByText('독립표본 t-검정')).toBeInTheDocument()
    expect(screen.getByText('대응표본 t-검정')).toBeInTheDocument()
  })

  it('각 t-검정 유형의 설명이 올바르게 표시되어야 함', () => {
    render(<TTestPage />)

    // 일표본 t-검정
    expect(screen.getByText(/하나의 표본 평균과 특정 값 비교/)).toBeInTheDocument()

    // 독립표본 t-검정
    expect(screen.getByText(/서로 독립적인 두 그룹의 평균 비교/)).toBeInTheDocument()

    // 대응표본 t-검정
    expect(screen.getByText(/동일한 대상의 전후 측정값 비교/)).toBeInTheDocument()
  })

  it('가정 정보가 표시되어야 함', () => {
    render(<TTestPage />)

    // 각 카드에 가정이 Badge로 표시됨
    expect(screen.getAllByText('정규성').length).toBeGreaterThan(0)
    expect(screen.getAllByText('독립성').length).toBeGreaterThan(0)
  })

  it('분석 결과에서 효과크기가 표시되어야 함', async () => {
    render(<TTestPage />)

    // 워크플로우 진행
    const independentCard = screen.getByText('독립표본 t-검정').closest('div[class*="card"]')
    if (independentCard) {
      fireEvent.click(independentCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('변수 선택 완료'))
    })

    // 결과에서 Cohen's d 확인
    await waitFor(() => {
      expect(screen.getByText(/Cohen's d/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('가정 검정 결과가 표시되어야 함', async () => {
    render(<TTestPage />)

    // 전체 워크플로우 실행
    const twoSampleCard = screen.getByText('독립표본 t-검정').closest('div[class*="card"]')
    if (twoSampleCard) {
      fireEvent.click(twoSampleCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('변수 선택 완료'))
    })

    // 가정 검정 결과 확인
    await waitFor(() => {
      expect(screen.getByText(/Shapiro-Wilk/)).toBeInTheDocument()
      expect(screen.getByText(/Levene/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('보고서 생성 및 결과 다운로드 버튼이 표시되어야 함', async () => {
    render(<TTestPage />)

    // 결과 페이지까지 진행
    const oneSampleCard = screen.getByText('일표본 t-검정').closest('div[class*="card"]')
    if (oneSampleCard) {
      fireEvent.click(oneSampleCard)
    }

    fireEvent.click(screen.getByText('데이터 업로드'))

    await waitFor(() => {
      fireEvent.click(screen.getByText('변수 선택 완료'))
    })

    // 버튼 확인
    await waitFor(() => {
      expect(screen.getByText('보고서 생성')).toBeInTheDocument()
      expect(screen.getByText('결과 다운로드')).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})