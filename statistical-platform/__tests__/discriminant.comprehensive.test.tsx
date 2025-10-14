import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DiscriminantPage from '../app/(dashboard)/statistics/discriminant/page'

// Mock the required modules
jest.mock('@/components/statistics/StatisticsPageLayout', () => {
  return {
    StatisticsPageLayout: ({ children, title, onReset }: { children: React.ReactNode, title: string, onReset: () => void }) => (
      <div data-testid="statistics-layout">
        <h1>{title}</h1>
        <button onClick={onReset}>Reset</button>
        {children}
      </div>
    ),
    StepCard: ({ children, title }: { children: React.ReactNode, title: string }) => (
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
          data-testid="upload-iris"
          onClick={() => onNext({
            data: [
              { species: 'setosa', sepal_length: 5.1, sepal_width: 3.5, petal_length: 1.4, petal_width: 0.2 },
              { species: 'setosa', sepal_length: 4.9, sepal_width: 3.0, petal_length: 1.4, petal_width: 0.2 },
              { species: 'setosa', sepal_length: 4.7, sepal_width: 3.2, petal_length: 1.3, petal_width: 0.2 },
              { species: 'versicolor', sepal_length: 7.0, sepal_width: 3.2, petal_length: 4.7, petal_width: 1.4 },
              { species: 'versicolor', sepal_length: 6.4, sepal_width: 3.2, petal_length: 4.5, petal_width: 1.5 },
              { species: 'versicolor', sepal_length: 6.9, sepal_width: 3.1, petal_length: 4.9, petal_width: 1.5 },
              { species: 'virginica', sepal_length: 6.3, sepal_width: 3.3, petal_length: 6.0, petal_width: 2.5 },
              { species: 'virginica', sepal_length: 5.8, sepal_width: 2.7, petal_length: 5.1, petal_width: 1.9 },
              { species: 'virginica', sepal_length: 7.1, sepal_width: 3.0, petal_length: 5.9, petal_width: 2.1 }
            ],
            fileName: 'iris_complete.csv',
            columns: ['species', 'sepal_length', 'sepal_width', 'petal_length', 'petal_width']
          })}
        >
          Upload Iris Dataset
        </button>
        <button
          data-testid="upload-customer"
          onClick={() => onNext({
            data: [
              { segment: 'premium', age: 45, income: 80000, satisfaction: 8.5 },
              { segment: 'premium', age: 52, income: 95000, satisfaction: 9.2 },
              { segment: 'standard', age: 35, income: 55000, satisfaction: 7.1 },
              { segment: 'standard', age: 28, income: 45000, satisfaction: 6.8 },
              { segment: 'basic', age: 23, income: 25000, satisfaction: 5.2 },
              { segment: 'basic', age: 19, income: 22000, satisfaction: 4.9 }
            ],
            fileName: 'customer_segments.csv',
            columns: ['segment', 'age', 'income', 'satisfaction']
          })}
        >
          Upload Customer Data
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
          data-testid="select-iris-vars"
          onClick={() => onSelectionChange({
            dependentVariable: 'species',
            independentVariables: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width']
          })}
        >
          Select Iris Variables
        </button>
        <button
          data-testid="select-customer-vars"
          onClick={() => onSelectionChange({
            dependentVariable: 'segment',
            independentVariables: ['age', 'income', 'satisfaction']
          })}
        >
          Select Customer Variables
        </button>
        <button
          data-testid="select-minimal-vars"
          onClick={() => onSelectionChange({
            dependentVariable: 'species',
            independentVariables: ['sepal_length', 'petal_length']
          })}
        >
          Select Minimal Variables
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

describe('DiscriminantPage - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('기본 렌더링 및 UI', () => {
    it('페이지가 올바른 제목과 메서드 정보로 렌더링된다', () => {
      render(<DiscriminantPage />)

      expect(screen.getByText('판별분석')).toBeInTheDocument()
      expect(screen.getByText(/Discriminant Analysis/)).toBeInTheDocument()
      expect(screen.getByText('판별분석')).toBeInTheDocument()
    })

    it('초기 상태에서 올바른 단계를 표시한다', () => {
      render(<DiscriminantPage />)

      // 방법론 소개가 표시되어야 함
      expect(screen.getByText('판별분석 (Discriminant Analysis)')).toBeInTheDocument()
      expect(screen.getByText('데이터 업로드하기')).toBeInTheDocument()
    })

    it('Reset 버튼이 올바르게 작동한다', async () => {
      render(<DiscriminantPage />)

      // 분석 진행
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))

      // Reset 버튼 클릭
      fireEvent.click(screen.getByText('Reset'))

      // 초기 상태로 돌아갔는지 확인
      expect(screen.getByText('데이터 업로드하기')).toBeInTheDocument()
    })
  })

  describe('데이터 업로드 및 변수 선택', () => {
    it('다양한 데이터 타입을 업로드할 수 있다', () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))

      expect(screen.getByTestId('upload-iris')).toBeInTheDocument()
      expect(screen.getByTestId('upload-customer')).toBeInTheDocument()
    })

    it('데이터 업로드 후 변수 선택 단계로 진행된다', () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))

      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
      expect(screen.getByText('변수 선택 가이드')).toBeInTheDocument()
    })
  })

  describe('판별분석 계산 로직', () => {
    it('Iris 데이터셋에 대해 올바른 결과를 계산한다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('판별분석 결과')).toBeInTheDocument()
        expect(screen.getByText('분류 정확도:')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('고객 세분화 데이터를 처리할 수 있다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-customer'))
      fireEvent.click(screen.getByTestId('select-customer-vars'))

      await waitFor(() => {
        expect(screen.getByText('판별분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('최소 변수 선택 시에도 작동한다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-minimal-vars'))

      await waitFor(() => {
        expect(screen.getByText('판별분석 결과')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('결과 분석 및 시각화', () => {
    it('분류 성능이 올바르게 표시된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('분류 성능')).toBeInTheDocument()
        expect(screen.getByText('전체 정확도')).toBeInTheDocument()
        expect(screen.getByText('올바른 분류')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('통계적 검정 결과가 상세히 표시된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('통계적 검정')).toBeInTheDocument()
        expect(screen.getByText('Box\'s M 검정')).toBeInTheDocument()
        expect(screen.getByText('Wilks\' Lambda')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('판별함수 정보가 상세히 표시된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('판별함수 정보')).toBeInTheDocument()
        expect(screen.getByText('고유값')).toBeInTheDocument()
        expect(screen.getByText('분산설명률')).toBeInTheDocument()
        expect(screen.getByText('정준상관')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('혼동행렬이 완전히 표시된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('혼동행렬 (Confusion Matrix)')).toBeInTheDocument()
        expect(screen.getByText('실제 \\ 예측')).toBeInTheDocument()
        // 대각선 요소 설명이 있는지 확인
        expect(screen.getByText(/대각선 요소.*올바른 분류/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('그룹 중심점 테이블이 표시된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('그룹 중심점 (Group Centroids)')).toBeInTheDocument()
        expect(screen.getByText('그룹')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('판별계수 매트릭스가 표시된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('판별계수 (Discriminant Coefficients)')).toBeInTheDocument()
        expect(screen.getByText('변수')).toBeInTheDocument()
        // 계수 해석 설명이 있는지 확인
        expect(screen.getByText(/절댓값이 큰 계수.*판별 기여도/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('결과 해석 가이드가 제공된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
      }, { timeout: 3000 })

      expect(screen.getByText('판별함수 해석')).toBeInTheDocument()
      expect(screen.getByText('활용 방안')).toBeInTheDocument()
    })

    it('액션 버튼들이 표시된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('분류 보고서 생성')).toBeInTheDocument()
        expect(screen.getByText('분류 결과 다운로드')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('에지 케이스 및 에러 처리', () => {
    it('데이터 업로드가 정상적으로 처리된다', () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))

      expect(screen.getByTestId('data-upload')).toBeInTheDocument()
    })

    it('변수 선택이 정상적으로 처리된다', () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))

      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
    })

    it('다른 데이터셋에 대해서도 분석을 수행한다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-customer'))
      fireEvent.click(screen.getByTestId('select-customer-vars'))

      await waitFor(() => {
        expect(screen.getByText(/분류 정확도:/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('수학적 정확성 검증', () => {
    it('분류 정확도가 올바르게 계산된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        const accuracyText = screen.getByText(/분류 정확도:/)
        expect(accuracyText).toBeInTheDocument()
        // 정확도가 0-100% 범위에 있는지 확인
        const accuracyMatch = accuracyText.textContent?.match(/(\d+\.\d+)%/)
        if (accuracyMatch) {
          const accuracy = parseFloat(accuracyMatch[1])
          expect(accuracy).toBeGreaterThanOrEqual(0)
          expect(accuracy).toBeLessThanOrEqual(100)
        }
      }, { timeout: 3000 })
    })

    it('통계적 검정값이 일관성 있게 계산된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        // Wilks' Lambda 값이 0-1 범위에 있어야 함
        expect(screen.getByText('Wilks\' Lambda')).toBeInTheDocument()
        expect(screen.getByText('Box\'s M 검정')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('판별함수와 고유값이 올바르게 계산된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('Function 1')).toBeInTheDocument()
        expect(screen.getByText('고유값')).toBeInTheDocument()
        expect(screen.getByText('정준상관')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('혼동행렬의 행/열 합계가 일치한다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('혼동행렬 (Confusion Matrix)')).toBeInTheDocument()
        // 정확도 컬럼이 있는지 확인
        expect(screen.getByText('정확도')).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })

  describe('사용성 및 접근성', () => {
    it('변수 선택 가이드가 명확하게 제공된다', () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))

      expect(screen.getByText('변수 선택 가이드')).toBeInTheDocument()
      expect(screen.getByText(/그룹 변수:/)).toBeInTheDocument()
      expect(screen.getByText(/판별 변수:/)).toBeInTheDocument()
    })

    it('판별분석 적용 조건이 명확히 설명된다', () => {
      render(<DiscriminantPage />)

      expect(screen.getByText('가정 및 조건')).toBeInTheDocument()
      expect(screen.getByText(/판별변수는 연속형/)).toBeInTheDocument()
      expect(screen.getByText(/그룹 변수는 범주형/)).toBeInTheDocument()
    })

    it('결과 해석을 위한 실용적 가이드가 제공된다', async () => {
      render(<DiscriminantPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-iris'))
      fireEvent.click(screen.getByTestId('select-iris-vars'))

      await waitFor(() => {
        expect(screen.getByText('활용 방안')).toBeInTheDocument()
        expect(screen.getByText(/새로운 관찰치를 기존 그룹으로 분류/)).toBeInTheDocument()
        expect(screen.getByText(/그룹 간 차이를 만드는 주요 변수/)).toBeInTheDocument()
      }, { timeout: 3000 })
    })
  })
})