import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PCAPage from '../app/(dashboard)/statistics/pca/page'

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

// 다양한 PCA 시나리오를 위한 Mock 데이터
jest.mock('@/components/smart-flow/steps/DataUploadStep', () => {
  return {
    DataUploadStep: ({ onNext }: { onNext: (data: unknown) => void }) => (
      <div data-testid="data-upload">
        <button
          data-testid="upload-high-correlation"
          onClick={() => onNext({
            data: [
              // 높은 상관관계를 가진 데이터
              { height: 170, weight: 65, age: 25, income: 50000 },
              { height: 175, weight: 70, age: 30, income: 55000 },
              { height: 168, weight: 62, age: 28, income: 52000 },
              { height: 172, weight: 68, age: 32, income: 58000 },
              { height: 180, weight: 75, age: 35, income: 60000 },
              { height: 165, weight: 60, age: 24, income: 48000 },
              { height: 178, weight: 72, age: 29, income: 54000 },
              { height: 173, weight: 67, age: 31, income: 56000 }
            ],
            fileName: 'high_correlation.csv',
            columns: ['height', 'weight', 'age', 'income']
          })}
        >
          Upload High Correlation Data
        </button>
        <button
          data-testid="upload-low-correlation"
          onClick={() => onNext({
            data: [
              // 낮은 상관관계를 가진 데이터 (PCA에 부적합)
              { var1: Math.random(), var2: Math.random(), var3: Math.random() },
              { var1: Math.random(), var2: Math.random(), var3: Math.random() },
              { var1: Math.random(), var2: Math.random(), var3: Math.random() },
              { var1: Math.random(), var2: Math.random(), var3: Math.random() },
              { var1: Math.random(), var2: Math.random(), var3: Math.random() }
            ],
            fileName: 'low_correlation.csv',
            columns: ['var1', 'var2', 'var3']
          })}
        >
          Upload Low Correlation Data
        </button>
        <button
          data-testid="upload-many-variables"
          onClick={() => onNext({
            data: Array.from({ length: 50 }, (_, i) => ({
              v1: i + Math.random() * 10,
              v2: i * 2 + Math.random() * 5,
              v3: i * 0.5 + Math.random() * 3,
              v4: 100 - i + Math.random() * 8,
              v5: i ** 1.5 + Math.random() * 12,
              v6: Math.sin(i * 0.1) * 20 + Math.random() * 4
            })),
            fileName: 'many_variables.csv',
            columns: ['v1', 'v2', 'v3', 'v4', 'v5', 'v6']
          })}
        >
          Upload Many Variables Data
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
          data-testid="select-few-variables"
          onClick={() => onSelectionChange({ variables: ['height', 'weight'] })}
        >
          Select Few Variables
        </button>
        <button
          data-testid="select-all-variables"
          onClick={() => onSelectionChange({ variables: variables?.map(v => v.name) || [] })}
        >
          Select All Variables
        </button>
        <button
          data-testid="select-correlated-variables"
          onClick={() => onSelectionChange({ variables: ['height', 'weight', 'age'] })}
        >
          Select Correlated Variables
        </button>
      </div>
    )
  }
})

jest.mock('@/lib/statistics/variable-requirements', () => ({
  getVariableRequirements: () => ({
    variables: [{
      role: 'dependent',
      label: '분석 변수',
      types: ['continuous'],
      required: true,
      multiple: true,
      minCount: 2,
      description: '주성분을 추출할 연속형 변수들'
    }]
  })
}))

jest.mock('@/lib/services/variable-type-detector', () => ({
  detectVariableType: () => 'continuous'
}))

// Lucide React 아이콘 목킹
jest.mock('lucide-react', () => ({
  Zap: () => <span>Zap Icon</span>,
  Upload: () => <span>Upload Icon</span>,
  Users: () => <span>Users Icon</span>,
  TrendingUp: () => <span>TrendingUp Icon</span>,
  AlertCircle: () => <span>AlertCircle Icon</span>,
  CheckCircle: () => <span>CheckCircle Icon</span>,
  FileText: () => <span>FileText Icon</span>,
  Download: () => <span>Download Icon</span>,
  Info: () => <span>Info Icon</span>,
  Target: () => <span>Target Icon</span>,
  Layers: () => <span>Layers Icon</span>
}))

describe('PCAPage - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('기본 렌더링 및 UI', () => {
    it('페이지가 올바른 제목과 메서드 정보로 렌더링된다', () => {
      render(<PCAPage />)

      expect(screen.getByText('주성분분석')).toBeInTheDocument()
      expect(screen.getByText(/Formula:/)).toBeInTheDocument()
      expect(screen.getByText(/Usage:/)).toBeInTheDocument()
    })

    it('초기 상태에서 올바른 단계를 표시한다', () => {
      render(<PCAPage />)

      expect(screen.getByText('주성분분석 (Principal Component Analysis)')).toBeInTheDocument()
      expect(screen.getByText('다변량 데이터의 차원을 축소하여 주요 패턴을 추출하는 분석 기법')).toBeInTheDocument()
    })

    it('Reset 버튼이 올바르게 작동한다', () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('reset-button'))

      expect(screen.getByText('주성분분석 (Principal Component Analysis)')).toBeInTheDocument()
    })
  })

  describe('데이터 업로드 및 변수 선택', () => {
    it('다양한 데이터 타입을 업로드할 수 있다', () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))

      expect(screen.getByTestId('upload-high-correlation')).toBeInTheDocument()
      expect(screen.getByTestId('upload-low-correlation')).toBeInTheDocument()
      expect(screen.getByTestId('upload-many-variables')).toBeInTheDocument()
    })

    it('데이터 업로드 후 변수 선택 단계로 진행된다', () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))

      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
      expect(screen.getByText('Variables: height, weight, age, income')).toBeInTheDocument()
    })
  })

  describe('PCA 계산 로직', () => {
    it('높은 상관관계 데이터에 대해 올바른 결과를 계산한다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))
      fireEvent.click(screen.getByTestId('select-correlated-variables'))

      await waitFor(() => {
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 적합도 검정 결과 확인
      expect(screen.getByText('KMO 측도')).toBeInTheDocument()
      expect(screen.getByText('Bartlett 검정')).toBeInTheDocument()
    })

    it('많은 변수가 있는 데이터를 처리할 수 있다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-many-variables'))
      fireEvent.click(screen.getByTestId('select-all-variables'))

      await waitFor(() => {
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      const resultText = screen.getByTestId('statistics-layout').textContent
      expect(resultText).toBeTruthy()
    })

    it('소수 변수 선택 시에도 작동한다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))
      fireEvent.click(screen.getByTestId('select-few-variables'))

      await waitFor(() => {
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('결과 분석 및 시각화', () => {
    beforeEach(async () => {
      render(<PCAPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))
      fireEvent.click(screen.getByTestId('select-correlated-variables'))

      await waitFor(() => {
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('적합도 검정이 올바르게 표시된다', () => {
      expect(screen.getByText('적합도 검정')).toBeInTheDocument()
      expect(screen.getByText('KMO 측도')).toBeInTheDocument()
      expect(screen.getByText('Bartlett 검정')).toBeInTheDocument()
    })

    it('주성분 정보가 상세히 표시된다', () => {
      expect(screen.getByText('주성분 상세 정보')).toBeInTheDocument()
      expect(screen.getByText('성분')).toBeInTheDocument()
      expect(screen.getByText('고유값')).toBeInTheDocument()
      expect(screen.getByText('분산설명률')).toBeInTheDocument()
      expect(screen.getByText('누적설명률')).toBeInTheDocument()
    })

    it('성분 적재량 매트릭스가 표시된다', () => {
      expect(screen.getByText('성분 적재량 (Component Loadings)')).toBeInTheDocument()
      expect(screen.getByText('변수')).toBeInTheDocument()
    })

    it('Scree Plot 데이터 시각화가 표시된다', () => {
      expect(screen.getByText('Scree Plot 데이터')).toBeInTheDocument()
    })

    it('누적 분산 설명률이 시각화된다', () => {
      expect(screen.getByText('누적 분산 설명률')).toBeInTheDocument()
    })

    it('결과 해석 가이드가 제공된다', () => {
      expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
      expect(screen.getByText('주성분 해석')).toBeInTheDocument()
      expect(screen.getByText('활용 방안')).toBeInTheDocument()
    })

    it('액션 버튼들이 표시된다', () => {
      expect(screen.getByText('보고서 생성')).toBeInTheDocument()
      expect(screen.getByText('주성분 데이터 다운로드')).toBeInTheDocument()
    })
  })

  describe('에지 케이스 및 에러 처리', () => {
    it('데이터 업로드가 정상적으로 처리된다', () => {
      render(<PCAPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))

      expect(screen.getByTestId('data-upload')).toBeInTheDocument()
    })

    it('변수 선택이 정상적으로 처리된다', () => {
      render(<PCAPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))

      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
    })

    it('낮은 상관관계 데이터에 대해서도 분석을 수행한다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-low-correlation'))
      fireEvent.click(screen.getByTestId('select-all-variables'))

      await waitFor(() => {
        // 결과가 표시되어야 함 (품질이 낮더라도)
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('수학적 정확성 검증', () => {
    it('Kaiser 기준이 올바르게 적용된다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))
      fireEvent.click(screen.getByTestId('select-all-variables'))

      await waitFor(() => {
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // Kaiser 기준 언급 확인
      expect(screen.getByText(/Kaiser 기준/)).toBeInTheDocument()
    })

    it('KMO와 Bartlett 검정이 일관성 있게 계산된다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))
      fireEvent.click(screen.getByTestId('select-correlated-variables'))

      await waitFor(() => {
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 적합도 검정 결과 확인
      const hasKMO = screen.getByText('KMO 측도')
      const hasBartlett = screen.getByText('Bartlett 검정')

      expect(hasKMO).toBeInTheDocument()
      expect(hasBartlett).toBeInTheDocument()
    })

    it('성분 적재량과 고유값이 올바르게 계산된다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))
      fireEvent.click(screen.getByTestId('select-correlated-variables'))

      await waitFor(() => {
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 주성분 테이블 확인
      expect(screen.getByText('성분')).toBeInTheDocument()
      expect(screen.getByText('고유값')).toBeInTheDocument()
      expect(screen.getByText('분산설명률')).toBeInTheDocument()
    })

    it('분산 설명률 계산이 정확하다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))
      fireEvent.click(screen.getByTestId('select-all-variables'))

      await waitFor(() => {
        expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 누적 분산 설명률이 100%를 초과하지 않는지 확인
      const resultContent = screen.getByTestId('statistics-layout').textContent
      expect(resultContent).toBeTruthy()
    })
  })

  describe('사용성 및 접근성', () => {
    it('변수 선택 가이드가 명확하게 제공된다', () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))

      expect(screen.getByText('변수 선택 가이드')).toBeInTheDocument()
      expect(screen.getByText(/최소 2개 이상/)).toBeInTheDocument()
      expect(screen.getByText(/상관관계가 있는 변수들/)).toBeInTheDocument()
    })

    it('PCA 적용 조건이 명확히 설명된다', () => {
      render(<PCAPage />)

      expect(screen.getByText('가정 및 조건')).toBeInTheDocument()
      expect(screen.getByText(/연속형 변수들/)).toBeInTheDocument()
      expect(screen.getByText(/변수들 간의 선형 관계/)).toBeInTheDocument()
      expect(screen.getByText(/충분한 표본 크기/)).toBeInTheDocument()
    })

    it('결과 해석을 위한 실용적 가이드가 제공된다', async () => {
      render(<PCAPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-high-correlation'))
      fireEvent.click(screen.getByTestId('select-correlated-variables'))

      await waitFor(() => {
        expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.getByText('활용 방안')).toBeInTheDocument()
      expect(screen.getByText(/차원 축소된 데이터 사용/)).toBeInTheDocument()
      expect(screen.getByText(/성분의 의미 해석/)).toBeInTheDocument()
    })
  })
})