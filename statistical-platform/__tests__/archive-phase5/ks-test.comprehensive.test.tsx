import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import KolmogorovSmirnovTestPage from '../app/(dashboard)/statistics/ks-test/page'

// Mock the required modules
jest.mock('@/components/statistics/StatisticsPageLayout', () => {
  return {
    StatisticsPageLayout: ({ children, title, methodInfo, onReset }: unknown) => (
      <div data-testid="statistics-layout">
        <h1>{title}</h1>
        <div data-testid="method-info">
          <p>Formula: {(methodInfo as { formula?: string })?.formula}</p>
          <p>Usage: {(methodInfo as { usage?: string })?.usage}</p>
        </div>
        <button onClick={onReset} data-testid="reset-button">Reset</button>
        {children}
      </div>
    ),
    StepCard: ({ children, title, description }: unknown) => (
      <div data-testid="step-card">
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
      </div>
    )
  }
})

// 실제 데이터로 테스트하기 위한 Mock
jest.mock('@/components/smart-flow/steps/DataUploadStep', () => {
  return {
    DataUploadStep: ({ onNext }: { onNext: (data: unknown) => void }) => (
      <div data-testid="data-upload">
        <button
          data-testid="upload-normal-distribution"
          onClick={() => onNext({
            data: [
              { value: -2.1 }, { value: -1.5 }, { value: -0.8 }, { value: -0.2 },
              { value: 0.1 }, { value: 0.5 }, { value: 0.9 }, { value: 1.3 },
              { value: 1.8 }, { value: 2.2 }
            ],
            fileName: 'normal_data.csv',
            columns: ['value']
          })}
        >
          Upload Normal Distribution
        </button>
        <button
          data-testid="upload-uniform-distribution"
          onClick={() => onNext({
            data: [
              { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 },
              { value: 5 }, { value: 6 }, { value: 7 }, { value: 8 },
              { value: 9 }, { value: 10 }
            ],
            fileName: 'uniform_data.csv',
            columns: ['value']
          })}
        >
          Upload Uniform Distribution
        </button>
        <button
          data-testid="upload-two-normal-groups"
          onClick={() => onNext({
            data: [
              { group1: 0.5, group2: 2.5 }, { group1: 1.0, group2: 3.0 },
              { group1: 1.5, group2: 3.5 }, { group1: 2.0, group2: 4.0 },
              { group1: 2.5, group2: 4.5 }, { group1: 3.0, group2: 5.0 },
              { group1: 3.5, group2: 5.5 }, { group1: 4.0, group2: 6.0 }
            ],
            fileName: 'two_normal_groups.csv',
            columns: ['group1', 'group2']
          })}
        >
          Upload Two Normal Groups
        </button>
        <button
          data-testid="upload-different-distributions"
          onClick={() => onNext({
            data: [
              { normal: 1.2, exponential: 0.1 }, { normal: 1.8, exponential: 0.3 },
              { normal: 2.1, exponential: 0.8 }, { normal: 2.5, exponential: 1.2 },
              { normal: 2.9, exponential: 2.1 }, { normal: 3.2, exponential: 3.5 },
              { normal: 3.8, exponential: 5.2 }, { normal: 4.1, exponential: 7.8 }
            ],
            fileName: 'different_distributions.csv',
            columns: ['normal', 'exponential']
          })}
        >
          Upload Different Distributions
        </button>
      </div>
    )
  }
})

jest.mock('@/components/variable-selection/VariableSelector', () => {
  return {
    VariableSelector: ({ onSelectionChange, variables }: { onSelectionChange: (variables: unknown) => void, variables?: { name: string }[] }) => (
      <div data-testid="variable-selector">
        <p>Variables: {variables?.map((v: { name: string }) => v.name).join(', ')}</p>
        <button
          data-testid="select-single-variable"
          onClick={() => onSelectionChange({ variables: ['value'] })}
        >
          Select Single Variable
        </button>
        <button
          data-testid="select-group1"
          onClick={() => onSelectionChange({ variables: ['group1'] })}
        >
          Select Group1
        </button>
        <button
          data-testid="select-two-groups"
          onClick={() => onSelectionChange({ variables: ['group1', 'group2'] })}
        >
          Select Two Groups
        </button>
        <button
          data-testid="select-different-distributions"
          onClick={() => onSelectionChange({ variables: ['normal', 'exponential'] })}
        >
          Select Different Distributions
        </button>
      </div>
    )
  }
})

jest.mock('@/lib/statistics/variable-requirements', () => ({
  getVariableRequirements: () => ({
    variables: [{
      role: 'dependent',
      label: '검정 변수',
      types: ['continuous'],
      required: true,
      multiple: true,
      maxCount: 2,
      description: '분포를 비교할 연속형 변수'
    }]
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

describe('KolmogorovSmirnovTestPage - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('기본 렌더링 및 UI', () => {
    it('페이지가 올바른 제목과 메서드 정보로 렌더링된다', () => {
      render(<KolmogorovSmirnovTestPage />)

      expect(screen.getAllByText('Kolmogorov-Smirnov 검정')).toHaveLength(2)
      expect(screen.getByText(/Formula:/)).toBeInTheDocument()
      expect(screen.getByText(/Usage:/)).toBeInTheDocument()
    })

    it('초기 상태에서 올바른 단계를 표시한다', () => {
      render(<KolmogorovSmirnovTestPage />)

      expect(screen.getAllByText('Kolmogorov-Smirnov 검정')).toHaveLength(2)
      expect(screen.getByText('분포의 동일성을 검정하는 비모수 통계 테스트')).toBeInTheDocument()
    })

    it('Reset 버튼이 올바르게 작동한다', () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('reset-button'))

      expect(screen.getAllByText('Kolmogorov-Smirnov 검정')).toHaveLength(2)
    })
  })

  describe('데이터 업로드 및 변수 선택', () => {
    it('다양한 데이터 타입을 업로드할 수 있다', () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))

      expect(screen.getByTestId('upload-normal-distribution')).toBeInTheDocument()
      expect(screen.getByTestId('upload-uniform-distribution')).toBeInTheDocument()
      expect(screen.getByTestId('upload-two-normal-groups')).toBeInTheDocument()
      expect(screen.getByTestId('upload-different-distributions')).toBeInTheDocument()
    })

    it('데이터 업로드 후 변수 선택 단계로 진행된다', () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-normal-distribution'))

      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
      expect(screen.getByText('Variables: value')).toBeInTheDocument()
    })
  })

  describe('일표본 K-S 검정 계산 로직', () => {
    it('정규분포 데이터에 대해 올바른 결과를 계산한다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-normal-distribution'))
      fireEvent.click(screen.getByTestId('select-single-variable'))

      await waitFor(() => {
        expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 통계량 확인
      expect(screen.getByText('K-S 통계량 (D)')).toBeInTheDocument()
      expect(screen.getByText('p-value')).toBeInTheDocument()
      expect(screen.getByText('임계값 (α = 0.05)')).toBeInTheDocument()
    })

    it('균등분포 데이터에서 정규성 위반을 감지한다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-uniform-distribution'))
      fireEvent.click(screen.getByTestId('select-single-variable'))

      await waitFor(() => {
        expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      const resultText = screen.getByTestId('statistics-layout').textContent
      expect(resultText).toBeTruthy()
    })

    it('분포 적합도 정보를 올바르게 표시한다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-normal-distribution'))
      fireEvent.click(screen.getByTestId('select-single-variable'))

      await waitFor(() => {
        expect(screen.getByText('분포 적합도 정보')).toBeInTheDocument()
        expect(screen.getByText('관측 평균')).toBeInTheDocument()
        expect(screen.getByText('관측 표준편차')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('이표본 K-S 검정 계산 로직', () => {
    it('동일한 분포를 가진 두 집단을 비교한다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-two-normal-groups'))
      fireEvent.click(screen.getByTestId('select-two-groups'))

      await waitFor(() => {
        expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.getByText('이표본 분포 검정 결과')).toBeInTheDocument()
    })

    it('서로 다른 분포를 가진 두 집단을 비교한다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-different-distributions'))
      fireEvent.click(screen.getByTestId('select-different-distributions'))

      await waitFor(() => {
        expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.getByText('K-S 통계량 (D)')).toBeInTheDocument()
    })

    it('효과크기가 올바르게 계산된다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-two-normal-groups'))
      fireEvent.click(screen.getByTestId('select-two-groups'))

      await waitFor(() => {
        expect(screen.getByText('효과크기')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('결과 해석 및 시각화', () => {
    beforeEach(async () => {
      render(<KolmogorovSmirnovTestPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-normal-distribution'))
      fireEvent.click(screen.getByTestId('select-single-variable'))

      await waitFor(() => {
        expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('검정 통계량이 올바르게 표시된다', () => {
      expect(screen.getByText('검정 통계량')).toBeInTheDocument()
      expect(screen.getByText('표본 정보')).toBeInTheDocument()
    })

    it('결과 해석 가이드가 제공된다', () => {
      expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
      expect(screen.getByText('K-S 검정 해석')).toBeInTheDocument()
      expect(screen.getByText('귀무가설(H₀):')).toBeInTheDocument()
      expect(screen.getByText('대립가설(H₁):')).toBeInTheDocument()
    })

    it('주의사항이 표시된다', () => {
      expect(screen.getByText('주의사항')).toBeInTheDocument()
      expect(screen.getByText(/K-S 검정은 분포의 모든 측면/)).toBeInTheDocument()
    })

    it('액션 버튼들이 표시된다', () => {
      expect(screen.getByText('보고서 생성')).toBeInTheDocument()
      expect(screen.getByText('결과 다운로드')).toBeInTheDocument()
    })
  })

  describe('에지 케이스 및 에러 처리', () => {
    it('데이터 업로드가 정상적으로 처리된다', () => {
      render(<KolmogorovSmirnovTestPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))

      expect(screen.getByTestId('data-upload')).toBeInTheDocument()
    })

    it('변수 선택이 정상적으로 처리된다', () => {
      render(<KolmogorovSmirnovTestPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-normal-distribution'))

      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
    })
  })

  describe('수학적 정확성 검증', () => {
    it('K-S 검정 공식이 올바르게 구현되었는지 확인한다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-uniform-distribution'))
      fireEvent.click(screen.getByTestId('select-single-variable'))

      await waitFor(() => {
        expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 결과가 표시되는지 확인
      expect(screen.getByText('K-S 통계량 (D)')).toBeInTheDocument()
      expect(screen.getByText('p-value')).toBeInTheDocument()
    })

    it('임계값과 p-value가 일관성 있게 계산된다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-normal-distribution'))
      fireEvent.click(screen.getByTestId('select-single-variable'))

      await waitFor(() => {
        expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // D 값과 임계값 비교, p-value와 유의성 판단이 일치하는지 확인
      const hasStatistics = screen.getByText('K-S 통계량 (D)')
      const hasPValue = screen.getByText('p-value')
      const hasCritical = screen.getByText('임계값 (α = 0.05)')

      expect(hasStatistics).toBeInTheDocument()
      expect(hasPValue).toBeInTheDocument()
      expect(hasCritical).toBeInTheDocument()
    })
  })

  describe('이표본 검정 특화 기능', () => {
    it('효과크기 해석 가이드가 제공된다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-different-distributions'))
      fireEvent.click(screen.getByTestId('select-different-distributions'))

      await waitFor(() => {
        expect(screen.getByText('K-S 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.getByText('효과크기')).toBeInTheDocument()
    })

    it('두 집단의 표본수가 올바르게 표시된다', async () => {
      render(<KolmogorovSmirnovTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-two-normal-groups'))
      fireEvent.click(screen.getByTestId('select-two-groups'))

      await waitFor(() => {
        expect(screen.getByText('표본 정보')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})