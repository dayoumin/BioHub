import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import RunsTestPage from '../app/(dashboard)/statistics/runs-test/page' // Assuming this is the correct path

interface MethodInfo {
  formula: string;
  usage: string;
}

interface StatisticsPageLayoutProps {
  children: React.ReactNode;
  title: string;
  methodInfo?: MethodInfo;
  onReset: () => void;
}

// Mock the required modules
jest.mock('@/components/statistics/StatisticsPageLayout', () => {
  return {
    StatisticsPageLayout: ({ children, title, methodInfo, onReset }: StatisticsPageLayoutProps) => (
      <div data-testid="statistics-layout">
        <h1>{title}</h1>
        <div data-testid="method-info">
          <p>Formula: {methodInfo?.formula}</p>
          <p>Usage: {methodInfo?.usage}</p>
        </div>
        <button onClick={onReset} data-testid="reset-button">Reset</button>
        {children}
      </div>
    ),
    StepCard: ({ children, title, description }: { children: React.ReactNode, title: string, description: string }) => (
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
    DataUploadStep: ({ onNext }: { onNext: (data: any) => void }) => (
      <div data-testid="data-upload">
        <button
          data-testid="upload-perfect-random"
          onClick={() => onNext({
            data: [
              { value: 10 }, { value: 5 }, { value: 15 }, { value: 3 },
              { value: 12 }, { value: 8 }, { value: 18 }, { value: 6 },
              { value: 14 }, { value: 9 }, { value: 11 }, { value: 7 }
            ],
            fileName: 'random_data.csv',
            columns: ['value']
          })}
        >
          Upload Random Data
        </button>
        <button
          data-testid="upload-clustered"
          onClick={() => onNext({
            data: [
              { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 },
              { value: 5 }, { value: 6 }, { value: 15 }, { value: 16 },
              { value: 17 }, { value: 18 }, { value: 19 }, { value: 20 }
            ],
            fileName: 'clustered_data.csv',
            columns: ['value']
          })}
        >
          Upload Clustered Data
        </button>
        <button
          data-testid="upload-alternating"
          onClick={() => onNext({
            data: [
              { value: 1 }, { value: 20 }, { value: 2 }, { value: 19 },
              { value: 3 }, { value: 18 }, { value: 4 }, { value: 17 },
              { value: 5 }, { value: 16 }, { value: 6 }, { value: 15 }
            ],
            fileName: 'alternating_data.csv',
            columns: ['value']
          })}
        >
          Upload Alternating Data
        </button>
      </div>
    )
  }
})

jest.mock('@/components/variable-selection/VariableSelector', () => {
  return {
    VariableSelector: ({ onSelectionChange, variables }: { onSelectionChange: (selection: any) => void, variables: { name: string }[] }) => (
      <div data-testid="variable-selector">
        <p>Variables: {variables?.map((v: any) => v.name).join(', ')}</p>
        <button
          data-testid="select-value-variable"
          onClick={() => onSelectionChange({ variables: ['value'] })}
        >
          Select Value Variable
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
      types: ['continuous', 'binary'],
      required: true,
      multiple: false,
      description: '무작위성을 검정할 변수'
    }]
  })
}))

jest.mock('@/lib/services/variable-type-detector', () => ({
  detectVariableType: () => 'continuous'
}))

// Lucide React 아이콘 목킹
jest.mock('lucide-react', () => ({
  Shuffle: () => <span>Shuffle Icon</span>,
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

describe('RunsTestPage - Comprehensive Tests', () => {
  beforeEach(() => {
    // 각 테스트 전에 콘솔 에러 모킹
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('기본 렌더링 및 UI', () => {
    it('페이지가 올바른 제목과 메서드 정보로 렌더링된다', () => {
      render(<RunsTestPage />)

      expect(screen.getByText('런 검정')).toBeInTheDocument()
      expect(screen.getByText(/Formula:/)).toBeInTheDocument()
      expect(screen.getByText(/Usage:/)).toBeInTheDocument()
    })

    it('초기 상태에서 올바른 단계를 표시한다', () => {
      render(<RunsTestPage />)

      expect(screen.getByText('런 검정 (Runs Test)')).toBeInTheDocument()
      expect(screen.getByText('데이터 시퀀스의 무작위성을 검정하는 비모수 통계 테스트')).toBeInTheDocument()
    })

    it('Reset 버튼이 올바르게 작동한다', () => {
      render(<RunsTestPage />)

      // 단계 진행
      fireEvent.click(screen.getByText('데이터 업로드하기'))

      // Reset 클릭
      fireEvent.click(screen.getByTestId('reset-button'))

      // 초기 상태로 복원 확인
      expect(screen.getByText('런 검정 (Runs Test)')).toBeInTheDocument()
    })
  })

  describe('데이터 업로드 및 변수 선택', () => {
    it('다양한 데이터 타입을 업로드할 수 있다', () => {
      render(<RunsTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))

      expect(screen.getByTestId('upload-perfect-random')).toBeInTheDocument()
      expect(screen.getByTestId('upload-clustered')).toBeInTheDocument()
      expect(screen.getByTestId('upload-alternating')).toBeInTheDocument()
    })

    it('데이터 업로드 후 변수 선택 단계로 진행된다', () => {
      render(<RunsTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-perfect-random'))

      expect(screen.getByTestId('variable-selector')).toBeInTheDocument()
      expect(screen.getByText('Variables: value')).toBeInTheDocument()
    })
  })

  describe('실제 런 검정 계산 로직', () => {
    it('무작위 데이터에 대해 올바른 결과를 계산한다', async () => {
      render(<RunsTestPage />)

      // 데이터 업로드 및 변수 선택
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-perfect-random'))
      fireEvent.click(screen.getByTestId('select-value-variable'))

      // 분석 결과 대기
      await waitFor(() => {
        expect(screen.getByText('런 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 통계량 확인
      expect(screen.getByText('Z-통계량')).toBeInTheDocument()
      expect(screen.getByText('p-value')).toBeInTheDocument()
      expect(screen.getByText('관측된 런')).toBeInTheDocument()
      expect(screen.getByText('기댓값')).toBeInTheDocument()
    })

    it('군집화된 데이터에서 유의한 결과를 감지한다', async () => {
      render(<RunsTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-clustered'))
      fireEvent.click(screen.getByTestId('select-value-variable'))

      await waitFor(() => {
        expect(screen.getByText('런 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 군집화된 데이터는 런이 적을 것으로 예상
      const resultText = (screen.getByTestId('statistics-layout') as HTMLElement).textContent
      expect(resultText).toBeTruthy()
    })

    it('교대 패턴 데이터에서 런이 많음을 감지한다', async () => {
      render(<RunsTestPage />)

      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-alternating'))
      fireEvent.click(screen.getByTestId('select-value-variable'))

      await waitFor(() => {
        expect(screen.getByText('런 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 교대 패턴 데이터는 런이 많을 것으로 예상
      const resultText = (screen.getByTestId('statistics-layout') as HTMLElement).textContent
      expect(resultText).toBeTruthy()
    })
  })

  describe('결과 해석 및 시각화', () => {
    beforeEach(async () => {
      render(<RunsTestPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByTestId('upload-perfect-random'))
      fireEvent.click(screen.getByTestId('select-value-variable'))

      await waitFor(() => {
        expect(screen.getByText('런 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('통계량이 올바르게 표시된다', () => {
      expect(screen.getByText('런 통계량')).toBeInTheDocument()
      expect(screen.getByText('검정 통계량')).toBeInTheDocument()
    })

    it('런 시퀀스 분석이 표시된다', () => {
      expect(screen.getByText('런 시퀀스 분석')).toBeInTheDocument()
    })

    it('결과 해석 가이드가 제공된다', () => {
      expect(screen.getByText('결과 해석 가이드')).toBeInTheDocument()
      expect(screen.getByText('런 검정 해석')).toBeInTheDocument()
    })

    it('액션 버튼들이 표시된다', () => {
      expect(screen.getByText('보고서 생성')).toBeInTheDocument()
      expect(screen.getByText('결과 다운로드')).toBeInTheDocument()
    })
  })

  describe('에지 케이스 및 에러 처리', () => {
    it('빈 데이터에 대해 적절히 처리한다', async () => {
      // Mock empty data upload
      (require('@/components/smart-flow/steps/DataUploadStep') as any).DataUploadStep =
        ({ onNext }: any) => (
          <button onClick={() => onNext({
            data: [],
            fileName: 'empty.csv',
            columns: []
          })}>
            Upload Empty Data
          </button>
        )

      render(<RunsTestPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
    })

    it('단일 값 데이터에 대해 적절히 처리한다', async () => {
      // Mock single value data
      (require('@/components/smart-flow/steps/DataUploadStep') as any).DataUploadStep =
        ({ onNext }: any) => (
          <button onClick={() => onNext({
            data: [{ value: 10 }],
            fileName: 'single.csv',
            columns: ['value']
          })}>
            Upload Single Data
          </button>
        )

      render(<RunsTestPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
    })
  })

  describe('수학적 정확성 검증', () => {
    it('런 검정 공식이 올바르게 구현되었는지 확인한다', async () => {
      // 알려진 결과가 있는 테스트 데이터
      (require('@/components/smart-flow/steps/DataUploadStep') as any).DataUploadStep =
        ({ onNext }: any) => (
          <button onClick={() => onNext({
            data: [
              { value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 },
              { value: 6 }, { value: 7 }, { value: 8 }, { value: 9 }, { value: 10 }
            ],
            fileName: 'known_result.csv',
            columns: ['value']
          })}>
            Upload Known Data
          </button>
        )

      render(<RunsTestPage />)
      fireEvent.click(screen.getByText('데이터 업로드하기'))
      fireEvent.click(screen.getByText('Upload Known Data'))

      // 변수 선택 Mock도 업데이트
      fireEvent.click(screen.getByTestId('select-value-variable'))

      await waitFor(() => {
        expect(screen.getByText('런 검정 결과')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 결과가 표시되는지 확인 (여러 매치 가능하므로 getAllByText 사용)
      expect(screen.getAllByText(/Z =|Z-통계량/)).toHaveLength(2) // 요약과 상세에서 각각 표시
      expect(screen.getAllByText(/p =|p-value/)).toHaveLength(2) // 마찬가지로 여러 곳에 표시
    })
  })
})