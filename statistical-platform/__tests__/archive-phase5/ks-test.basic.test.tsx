import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import KolmogorovSmirnovTestPage from '../app/(dashboard)/statistics/ks-test/page'

// Mock the required modules
jest.mock('@/components/statistics/StatisticsPageLayout', () => {
  return {
    StatisticsPageLayout: ({ children, title }: unknown) => (
      <div data-testid="statistics-layout">
        <h1>{title}</h1>
        {children}
      </div>
    ),
    StepCard: ({ children, title }: unknown) => (
      <div data-testid="step-card">
        <h2>{title}</h2>
        {children}
      </div>
    )
  }
})

jest.mock('@/components/smart-flow/steps/DataUploadStep', () => {
  return {
    DataUploadStep: ({ onNext }: { onNext: (data: unknown) => void }) => (
      <div data-testid="data-upload">
        <button
          onClick={() => onNext({
            data: [
              { value: 1.2 }, { value: 1.5 }, { value: 2.1 }, { value: 2.8 },
              { value: 3.0 }, { value: 3.5 }, { value: 4.1 }, { value: 4.3 },
              { value: 4.8 }, { value: 5.2 }
            ],
            fileName: 'normal_data.csv',
            columns: ['value']
          })}
        >
          Upload Normal Data
        </button>
        <button
          onClick={() => onNext({
            data: [
              { group1: 1.0, group2: 2.5 }, { group1: 1.3, group2: 2.8 },
              { group1: 1.5, group2: 3.0 }, { group1: 1.8, group2: 3.2 },
              { group1: 2.0, group2: 3.5 }, { group1: 2.2, group2: 3.8 }
            ],
            fileName: 'two_groups.csv',
            columns: ['group1', 'group2']
          })}
        >
          Upload Two Groups Data
        </button>
      </div>
    )
  }
})

jest.mock('@/components/variable-selection/VariableSelector', () => {
  return {
    VariableSelector: ({ onSelectionChange }: { onSelectionChange: (variables: unknown) => void }) => (
      <div data-testid="variable-selector">
        <button
          data-testid="select-one-variable"
          onClick={() => onSelectionChange({ variables: ['value'] })}
        >
          Select One Variable
        </button>
        <button
          data-testid="select-two-variables"
          onClick={() => onSelectionChange({ variables: ['group1', 'group2'] })}
        >
          Select Two Variables
        </button>
      </div>
    )
  }
})

jest.mock('@/lib/statistics/variable-requirements', () => ({
  getVariableRequirements: () => ({
    role: 'dependent',
    label: '검정 변수',
    types: ['continuous'],
    required: true,
    multiple: true,
    maxCount: 2,
    description: '분포를 비교할 연속형 변수'
  })
}))

jest.mock('@/lib/services/variable-type-detector', () => ({
  detectVariableType: () => 'continuous'
}))

// Lucide React 아이콘 목킹
jest.mock('lucide-react', () => ({
  Activity: () => <span>Activity Icon</span>,
  Upload: () => <span>Upload Icon</span>,
  Users: () => <span>Users Icon</span>,
  TrendingUp: () => <span>TrendingUp Icon</span>,
  AlertCircle: () => <span>AlertCircle Icon</span>,
  CheckCircle: () => <span>CheckCircle Icon</span>,
  FileText: () => <span>FileText Icon</span>,
  Download: () => <span>Download Icon</span>,
  Info: () => <span>Info Icon</span>,
  BarChart3: () => <span>BarChart3 Icon</span>
}))

describe('KolmogorovSmirnovTestPage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('페이지가 올바르게 렌더링된다', () => {
    render(<KolmogorovSmirnovTestPage />)

    expect(screen.getAllByText('Kolmogorov-Smirnov 검정')).toHaveLength(2)
  })

  it('K-S 검정 개념이 올바르게 설명된다', () => {
    render(<KolmogorovSmirnovTestPage />)

    expect(screen.getByText('K-S 검정이란?')).toBeInTheDocument()
    expect(screen.getByText('사용 사례')).toBeInTheDocument()
    expect(screen.getByText('정규성 검정 (일표본)')).toBeInTheDocument()
    expect(screen.getByText('두 집단 분포 비교 (이표본)')).toBeInTheDocument()
  })

  it('가정 및 조건이 올바르게 표시된다', () => {
    render(<KolmogorovSmirnovTestPage />)

    expect(screen.getByText('가정 및 조건')).toBeInTheDocument()
    expect(screen.getByText(/연속형 변수/)).toBeInTheDocument()
  })

  it('데이터 업로드 단계로 진행할 수 있다', () => {
    render(<KolmogorovSmirnovTestPage />)

    const uploadButton = screen.getByText('데이터 업로드하기')
    fireEvent.click(uploadButton)

    expect(screen.getByTestId('data-upload')).toBeInTheDocument()
  })

  it('일표본 K-S 검정 워크플로우가 작동한다', async () => {
    render(<KolmogorovSmirnovTestPage />)

    // 1단계: 데이터 업로드
    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Normal Data'))

    // 변수 선택 단계 확인
    expect(screen.getByTestId('variable-selector')).toBeInTheDocument()

    // 2단계: 변수 선택 (1개 변수 - 일표본 검정)
    fireEvent.click(screen.getByTestId('select-one-variable'))

    // 분석 결과 대기 및 확인
    await waitFor(() => {
      expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('이표본 K-S 검정 워크플로우가 작동한다', async () => {
    render(<KolmogorovSmirnovTestPage />)

    // 1단계: 데이터 업로드
    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Two Groups Data'))

    // 2단계: 변수 선택 (2개 변수 - 이표본 검정)
    fireEvent.click(screen.getByTestId('select-two-variables'))

    // 분석 결과 대기 및 확인
    await waitFor(() => {
      expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('분석 결과가 올바르게 표시된다', async () => {
    render(<KolmogorovSmirnovTestPage />)

    // 분석 워크플로우 실행
    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Normal Data'))
    fireEvent.click(screen.getByTestId('select-one-variable'))

    await waitFor(() => {
      // 검정 통계량 확인
      expect(screen.getByText('K-S 통계량 (D)')).toBeInTheDocument()
      expect(screen.getByText('p-value')).toBeInTheDocument()
      expect(screen.getByText('임계값 (α = 0.05)')).toBeInTheDocument()

      // 표본 정보 확인
      expect(screen.getByText('표본 정보')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('분포 적합도 정보가 표시된다 (일표본)', async () => {
    render(<KolmogorovSmirnovTestPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Normal Data'))
    fireEvent.click(screen.getByTestId('select-one-variable'))

    await waitFor(() => {
      expect(screen.getByText('분포 적합도 정보')).toBeInTheDocument()
      expect(screen.getByText('관측 평균')).toBeInTheDocument()
      expect(screen.getByText('관측 표준편차')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('결과 해석 가이드가 제공된다', async () => {
    render(<KolmogorovSmirnovTestPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Normal Data'))
    fireEvent.click(screen.getByTestId('select-one-variable'))

    await waitFor(() => {
      expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
      expect(screen.getByText('K-S 검정 해석')).toBeInTheDocument()
      expect(screen.getByText('귀무가설(H₀):')).toBeInTheDocument()
      expect(screen.getByText('대립가설(H₁):')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('액션 버튼들이 표시된다', async () => {
    render(<KolmogorovSmirnovTestPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Normal Data'))
    fireEvent.click(screen.getByTestId('select-one-variable'))

    await waitFor(() => {
      expect(screen.getByText('보고서 생성')).toBeInTheDocument()
      expect(screen.getByText('결과 다운로드')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('검정 유형 안내가 표시된다', () => {
    render(<KolmogorovSmirnovTestPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Normal Data'))

    expect(screen.getByText('검정 유형')).toBeInTheDocument()
    expect(screen.getByText('1개 변수 선택')).toBeInTheDocument()
    expect(screen.getByText('2개 변수 선택')).toBeInTheDocument()
  })
})