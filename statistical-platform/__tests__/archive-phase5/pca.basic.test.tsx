import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PCAPage from '../app/(dashboard)/statistics/pca/page'

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
              { var1: 2.5, var2: 3.2, var3: 1.8 },
              { var1: 3.1, var2: 2.9, var3: 2.4 },
              { var1: 2.8, var2: 3.8, var3: 1.9 },
              { var1: 3.4, var2: 2.5, var3: 2.7 },
              { var1: 2.9, var2: 3.5, var3: 2.1 }
            ],
            fileName: 'pca_data.csv',
            columns: ['var1', 'var2', 'var3']
          })}
        >
          Upload PCA Data
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
          onClick={() => onSelectionChange({ variables: ['var1', 'var2', 'var3'] })}
        >
          Select All Variables
        </button>
      </div>
    )
  }
})

jest.mock('@/lib/statistics/variable-requirements', () => ({
  getVariableRequirements: () => ({
    role: 'dependent',
    label: '분석 변수',
    types: ['continuous'],
    required: true,
    multiple: true,
    minCount: 2,
    description: '주성분을 추출할 연속형 변수들'
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

describe('PCAPage', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    // console.log 모킹 (PCA 페이지에서 사용)
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('페이지가 올바르게 렌더링된다', () => {
    render(<PCAPage />)

    expect(screen.getByText('주성분분석')).toBeInTheDocument()
    expect(screen.getByText(/Principal Component Analysis/)).toBeInTheDocument()
  })

  it('PCA 개념이 올바르게 설명된다', () => {
    render(<PCAPage />)

    expect(screen.getByText('PCA란?')).toBeInTheDocument()
    expect(screen.getByText('활용 분야')).toBeInTheDocument()
    expect(screen.getByText('데이터 차원 축소')).toBeInTheDocument()
    expect(screen.getByText('시각화 및 패턴 발견')).toBeInTheDocument()
  })

  it('가정 및 조건이 올바르게 표시된다', () => {
    render(<PCAPage />)

    expect(screen.getByText('가정 및 조건')).toBeInTheDocument()
    expect(screen.getByText(/연속형 변수들/)).toBeInTheDocument()
    expect(screen.getByText(/변수들 간의 선형 관계/)).toBeInTheDocument()
  })

  it('데이터 업로드 단계로 진행할 수 있다', () => {
    render(<PCAPage />)

    const uploadButton = screen.getByText('데이터 업로드하기')
    fireEvent.click(uploadButton)

    expect(screen.getByTestId('data-upload')).toBeInTheDocument()
  })

  it('전체 PCA 워크플로우가 작동한다', async () => {
    render(<PCAPage />)

    // 1단계: 데이터 업로드하기 버튼 클릭
    fireEvent.click(screen.getByText('데이터 업로드하기'))

    // 2단계: 데이터 업로드
    fireEvent.click(screen.getByText('Upload PCA Data'))

    // 변수 선택 단계 확인
    expect(screen.getByTestId('variable-selector')).toBeInTheDocument()

    // 3단계: 변수 선택 및 분석 실행
    fireEvent.click(screen.getByText('Select All Variables'))

    // 분석 결과 대기 및 확인
    await waitFor(() => {
      expect(screen.getByText('주성분분석 결과')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('분석 결과가 올바르게 표시된다', async () => {
    render(<PCAPage />)

    // 분석 워크플로우 실행
    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload PCA Data'))
    fireEvent.click(screen.getByText('Select All Variables'))

    await waitFor(() => {
      // 주요 결과 확인
      expect(screen.getByText('분석 결과 요약')).toBeInTheDocument()
      expect(screen.getByText('적합도 검정')).toBeInTheDocument()
      expect(screen.getByText('KMO 측도')).toBeInTheDocument()
      expect(screen.getByText('Bartlett 검정')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('주성분 상세 정보가 표시된다', async () => {
    render(<PCAPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload PCA Data'))
    fireEvent.click(screen.getByText('Select All Variables'))

    await waitFor(() => {
      expect(screen.getByText('주성분 상세 정보')).toBeInTheDocument()
      expect(screen.getByText('고유값')).toBeInTheDocument()
      expect(screen.getByText('분산설명률')).toBeInTheDocument()
      expect(screen.getByText('누적설명률')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('성분 적재량이 표시된다', async () => {
    render(<PCAPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload PCA Data'))
    fireEvent.click(screen.getByText('Select All Variables'))

    await waitFor(() => {
      expect(screen.getByText('성분 적재량 (Component Loadings)')).toBeInTheDocument()
      // 변수명들이 표시되는지 확인
      expect(screen.getByText('var1')).toBeInTheDocument()
      expect(screen.getByText('var2')).toBeInTheDocument()
      expect(screen.getByText('var3')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('Scree Plot 데이터가 표시된다', async () => {
    render(<PCAPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload PCA Data'))
    fireEvent.click(screen.getByText('Select All Variables'))

    await waitFor(() => {
      expect(screen.getByText('Scree Plot 데이터')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('결과 해석 가이드가 제공된다', async () => {
    render(<PCAPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload PCA Data'))
    fireEvent.click(screen.getByText('Select All Variables'))

    await waitFor(() => {
      expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
    }, { timeout: 3000 })

    expect(screen.getByText('주성분 해석')).toBeInTheDocument()
  })

  it('액션 버튼들이 표시된다', async () => {
    render(<PCAPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload PCA Data'))
    fireEvent.click(screen.getByText('Select All Variables'))

    await waitFor(() => {
      expect(screen.getByText('보고서 생성')).toBeInTheDocument()
      expect(screen.getByText('주성분 데이터 다운로드')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('변수 선택 가이드가 표시된다', () => {
    render(<PCAPage />)

    fireEvent.click(screen.getByText('데이터 업로드하기'))
    fireEvent.click(screen.getByText('Upload PCA Data'))

    expect(screen.getByText('변수 선택 가이드')).toBeInTheDocument()
    expect(screen.getByText(/최소 2개 이상/)).toBeInTheDocument()
    expect(screen.getByText(/상관관계가 있는 변수들/)).toBeInTheDocument()
  })
})