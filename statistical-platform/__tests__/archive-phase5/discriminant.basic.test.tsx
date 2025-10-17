import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DiscriminantPage from '../app/(dashboard)/statistics/discriminant/page'

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
              { species: 'setosa', sepal_length: 5.1, sepal_width: 3.5, petal_length: 1.4 },
              { species: 'setosa', sepal_length: 4.9, sepal_width: 3.0, petal_length: 1.4 },
              { species: 'setosa', sepal_length: 4.7, sepal_width: 3.2, petal_length: 1.3 },
              { species: 'versicolor', sepal_length: 7.0, sepal_width: 3.2, petal_length: 4.7 },
              { species: 'versicolor', sepal_length: 6.4, sepal_width: 3.2, petal_length: 4.5 },
              { species: 'versicolor', sepal_length: 6.9, sepal_width: 3.1, petal_length: 4.9 },
              { species: 'virginica', sepal_length: 6.3, sepal_width: 3.3, petal_length: 6.0 },
              { species: 'virginica', sepal_length: 5.8, sepal_width: 2.7, petal_length: 5.1 },
              { species: 'virginica', sepal_length: 7.1, sepal_width: 3.0, petal_length: 5.9 }
            ],
            fileName: 'iris_discriminant.csv',
            columns: ['species', 'sepal_length', 'sepal_width', 'petal_length']
          })}
        >
          Upload Discriminant Data
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
          onClick={() => onSelectionChange({
            dependentVariable: 'species',
            independentVariables: ['sepal_length', 'sepal_width', 'petal_length']
          })}
        >
          Select Classification Variables
        </button>
      </div>
    )
  }
})

jest.mock('@/lib/statistics/variable-requirements', () => ({
  getVariableRequirements: () => ({
    role: 'mixed',
    label: '판별 변수',
    types: ['continuous', 'categorical'],
    required: true,
    multiple: true,
    minCount: 2,
    description: '그룹 변수와 판별 변수들'
  })
}))

jest.mock('@/lib/services/variable-type-detector', () => ({
  detectVariableType: (values: unknown[]) => {
    const stringValues = values.map(v => String(v))
    if (stringValues.every(v => !isNaN(Number(v)))) {
      return 'continuous'
    }
    return 'categorical'
  }
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
  Target: () => <span>Target Icon</span>,
  Layers: () => <span>Layers Icon</span>
}))

describe('DiscriminantPage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('페이지가 올바르게 렌더링된다', () => {
    render(<DiscriminantPage />)

    expect(screen.getByText('판별분석')).toBeInTheDocument()
    expect(screen.getByText(/Discriminant Analysis/)).toBeInTheDocument()
  })

  it('판별분석 개념이 올바르게 설명된다', () => {
    render(<DiscriminantPage />)

    expect(screen.getByText('판별분석이란?')).toBeInTheDocument()
    expect(screen.getByText('활용 분야')).toBeInTheDocument()
    expect(screen.getByText('고객 세분화')).toBeInTheDocument()
    expect(screen.getByText('의료 진단 분류')).toBeInTheDocument()
  })

  it('가정 및 조건이 올바르게 표시된다', () => {
    render(<DiscriminantPage />)

    expect(screen.getByText('가정 및 조건')).toBeInTheDocument()
    expect(screen.getByText(/판별변수는 연속형/)).toBeInTheDocument()
    expect(screen.getByText(/그룹 변수는 범주형/)).toBeInTheDocument()
  })

  it('데이터 업로드 단계로 진행할 수 있다', () => {
    render(<DiscriminantPage />)

    const uploadButton = screen.getByText('데이터 업로드하기')
    fireEvent.click(uploadButton)

    expect(screen.getByTestId('data-upload')).toBeInTheDocument()
  })

  it('전체 판별분석 워크플로우가 작동한다', async () => {
    render(<DiscriminantPage />)

    // 1단계: 데이터 업로드하기 버튼 클릭
    fireEvent.click(screen.getByText('데이터 업로드하기'))

    // 2단계: 데이터 업로드
    fireEvent.click(screen.getByText('Upload Discriminant Data'))

    // 변수 선택 단계 확인
    expect(screen.getByTestId('variable-selector')).toBeInTheDocument()

    // 3단계: 변수 선택 및 분석 실행
    fireEvent.click(screen.getByText('Select Classification Variables'))

    // 분석 결과 대기 및 확인
    await waitFor(() => {
      expect(screen.getByText('판별분석 결과')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('분석 결과가 올바르게 표시된다', async () => {
    render(<DiscriminantPage />)

    // 분석 워크플로우 실행
    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))
    fireEvent.click(screen.getByText('Select Classification Variables'))

    await waitFor(() => {
      // 주요 결과 확인
      expect(screen.getByText('분석 결과 요약')).toBeInTheDocument()
      expect(screen.getByText(/분류 정확도:/)).toBeInTheDocument()
      expect(screen.getByText('전체 정확도')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('통계적 검정 결과가 표시된다', async () => {
    render(<DiscriminantPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))
    fireEvent.click(screen.getByText('Select Classification Variables'))

    await waitFor(() => {
      expect(screen.getByText('통계적 검정')).toBeInTheDocument()
      expect(screen.getByText('Box\'s M 검정')).toBeInTheDocument()
      expect(screen.getByText('Wilks\' Lambda')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('판별함수 정보가 표시된다', async () => {
    render(<DiscriminantPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))
    fireEvent.click(screen.getByText('Select Classification Variables'))

    await waitFor(() => {
      expect(screen.getByText('판별함수 정보')).toBeInTheDocument()
      expect(screen.getByText('고유값')).toBeInTheDocument()
      expect(screen.getByText('분산설명률')).toBeInTheDocument()
      expect(screen.getByText('정준상관')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('혼동행렬이 표시된다', async () => {
    render(<DiscriminantPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))
    fireEvent.click(screen.getByText('Select Classification Variables'))

    await waitFor(() => {
      expect(screen.getByText('혼동행렬 (Confusion Matrix)')).toBeInTheDocument()
      // 실제 \ 예측 헤더가 표시되는지 확인
      expect(screen.getByText('실제 \\ 예측')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('그룹 중심점이 표시된다', async () => {
    render(<DiscriminantPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))
    fireEvent.click(screen.getByText('Select Classification Variables'))

    await waitFor(() => {
      expect(screen.getByText('그룹 중심점 (Group Centroids)')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('판별계수가 표시된다', async () => {
    render(<DiscriminantPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))
    fireEvent.click(screen.getByText('Select Classification Variables'))

    await waitFor(() => {
      expect(screen.getByText('판별계수 (Discriminant Coefficients)')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('결과 해석 가이드가 제공된다', async () => {
    render(<DiscriminantPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))
    fireEvent.click(screen.getByText('Select Classification Variables'))

    await waitFor(() => {
      expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('판별함수 해석')).toBeInTheDocument()
  })

  it('액션 버튼들이 표시된다', async () => {
    render(<DiscriminantPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))
    fireEvent.click(screen.getByText('Select Classification Variables'))

    await waitFor(() => {
      expect(screen.getByText('분류 보고서 생성')).toBeInTheDocument()
      expect(screen.getByText('분류 결과 다운로드')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('변수 선택 가이드가 표시된다', () => {
    render(<DiscriminantPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload Discriminant Data'))

    expect(screen.getByText('변수 선택 가이드')).toBeInTheDocument()
    expect(screen.getByText(/그룹 변수:/)).toBeInTheDocument()
    expect(screen.getByText(/판별 변수:/)).toBeInTheDocument()
  })
})