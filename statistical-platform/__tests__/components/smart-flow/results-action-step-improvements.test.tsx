/**
 * ResultsActionStep UX 개선 테스트
 *
 * 테스트 범위:
 * 1. p-value 자연어 해석 함수
 * 2. 효과크기 해석 함수
 * 3. 데이터 보안 안내 Alert 렌더링
 * 4. 분석 요약 배지 렌더링
 */

import { render, screen } from '@testing-library/react'
import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import type { AnalysisResult } from '@/types/smart-flow'
import type { VariableMapping } from '@/lib/statistics/variable-mapping'

// Mock useSmartFlowStore
jest.mock('@/lib/stores/smart-flow-store')
const mockUseSmartFlowStore = useSmartFlowStore as jest.MockedFunction<typeof useSmartFlowStore>

// Mock PDFReportService
jest.mock('@/lib/services/pdf-report-service', () => ({
  PDFReportService: {
    generateReport: jest.fn()
  }
}))

describe('ResultsActionStep - UX Improvements', () => {
  const mockResults: AnalysisResult = {
    method: '독립표본 t-검정',
    statistic: 2.456,
    pValue: 0.023,
    df: 48,
    confidence: {
      level: 0.95,
      lower: 0.12,
      upper: 1.85
    },
    effectSize: {
      value: 0.65,
      type: "Cohen's d",
      interpretation: '중간 효과'
    },
    interpretation: '두 그룹 간 유의한 차이가 있습니다.'
  }

  const mockVariableMapping: VariableMapping = {
    dependentVar: '점수',
    independentVar: '성별',
    groupVar: '학년'
  }

  const mockUploadedData = Array(50).fill({ 점수: 85, 성별: '남', 학년: '1학년' })

  beforeEach(() => {
    mockUseSmartFlowStore.mockReturnValue({
      saveToHistory: jest.fn(),
      reset: jest.fn(),
      uploadedData: mockUploadedData,
      variableMapping: mockVariableMapping,
      // @ts-ignore - 나머지 필드는 테스트에 불필요
      currentStep: 6,
      completedSteps: [1, 2, 3, 4, 5]
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('데이터 보안 안내', () => {
    it('Alert 컴포넌트가 렌더링되어야 함', () => {
      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText('데이터 보안 안내')).toBeInTheDocument()
      expect(screen.getByText(/브라우저에만 저장되며/)).toBeInTheDocument()
      expect(screen.getByText(/원본 데이터는 외부로 유출되지 않습니다/)).toBeInTheDocument()
    })
  })

  describe('분석 요약 배지', () => {
    it('표본 크기 배지가 표시되어야 함', () => {
      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText(/표본 크기: N=50/)).toBeInTheDocument()
    })

    it('종속변수 배지가 표시되어야 함', () => {
      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText(/종속변수: 점수/)).toBeInTheDocument()
    })

    it('독립변수 배지가 표시되어야 함', () => {
      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText(/독립변수: 성별/)).toBeInTheDocument()
    })

    it('그룹변수 배지가 표시되어야 함', () => {
      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText(/그룹변수: 학년/)).toBeInTheDocument()
    })

    it('variableMapping이 없으면 배지가 표시되지 않아야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        saveToHistory: jest.fn(),
        reset: jest.fn(),
        uploadedData: mockUploadedData,
        variableMapping: null,
        // @ts-ignore
        currentStep: 6,
        completedSteps: [1, 2, 3, 4, 5]
      })

      render(<ResultsActionStep results={mockResults} />)

      expect(screen.queryByText(/분석 요약/)).not.toBeInTheDocument()
    })

    it('배열 형태의 변수도 올바르게 표시되어야 함', () => {
      const multiVariableMapping: VariableMapping = {
        dependentVar: ['점수1', '점수2'],
        independentVar: ['성별', '나이']
      }

      mockUseSmartFlowStore.mockReturnValue({
        saveToHistory: jest.fn(),
        reset: jest.fn(),
        uploadedData: mockUploadedData,
        variableMapping: multiVariableMapping,
        // @ts-ignore
        currentStep: 6,
        completedSteps: [1, 2, 3, 4, 5]
      })

      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText(/종속변수: 점수1, 점수2/)).toBeInTheDocument()
      expect(screen.getByText(/독립변수: 성별, 나이/)).toBeInTheDocument()
    })
  })

  describe('p-value 자연어 해석', () => {
    it('p < 0.001 일 때 "매우 강력한 증거"가 표시되어야 함', () => {
      const verySignificantResults = { ...mockResults, pValue: 0.0005 }
      render(<ResultsActionStep results={verySignificantResults} />)

      expect(screen.getByText(/매우 강력한 증거 \(p < 0.001\)/)).toBeInTheDocument()
    })

    it('p < 0.01 일 때 "강력한 증거"가 표시되어야 함', () => {
      const significantResults = { ...mockResults, pValue: 0.008 }
      render(<ResultsActionStep results={significantResults} />)

      expect(screen.getByText(/강력한 증거 \(p < 0.01\)/)).toBeInTheDocument()
    })

    it('p < 0.05 일 때 "유의한 차이 있음"이 표시되어야 함', () => {
      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText(/유의한 차이 있음 \(p < 0.05\)/)).toBeInTheDocument()
    })

    it('p < 0.10 일 때 "약한 경향성"이 표시되어야 함', () => {
      const marginalResults = { ...mockResults, pValue: 0.08 }
      render(<ResultsActionStep results={marginalResults} />)

      expect(screen.getByText(/약한 경향성 \(p < 0.10\)/)).toBeInTheDocument()
    })

    it('p >= 0.10 일 때 "통계적 차이 없음"이 표시되어야 함', () => {
      const nonSignificantResults = { ...mockResults, pValue: 0.35 }
      render(<ResultsActionStep results={nonSignificantResults} />)

      expect(screen.getByText(/통계적 차이 없음/)).toBeInTheDocument()
    })
  })

  describe('효과크기 자연어 해석', () => {
    it("Cohen's d < 0.2 일 때 '무시할 만한 차이'가 표시되어야 함", () => {
      const smallEffectResults = {
        ...mockResults,
        effectSize: { value: 0.15, type: "Cohen's d" as const, interpretation: '무시할 만한 차이' }
      }
      render(<ResultsActionStep results={smallEffectResults} />)

      expect(screen.getByText(/무시할 만한 차이/)).toBeInTheDocument()
    })

    it("Cohen's d < 0.5 일 때 '작은 효과'가 표시되어야 함", () => {
      const smallEffectResults = {
        ...mockResults,
        effectSize: { value: 0.35, type: "Cohen's d" as const, interpretation: '작은 효과' }
      }
      render(<ResultsActionStep results={smallEffectResults} />)

      expect(screen.getByText(/작은 효과/)).toBeInTheDocument()
    })

    it("Cohen's d < 0.8 일 때 '중간 효과'가 표시되어야 함", () => {
      render(<ResultsActionStep results={mockResults} />)

      expect(screen.getByText(/중간 효과/)).toBeInTheDocument()
    })

    it("Cohen's d >= 0.8 일 때 '큰 효과'가 표시되어야 함", () => {
      const largeEffectResults = {
        ...mockResults,
        effectSize: { value: 1.2, type: "Cohen's d" as const, interpretation: '큰 효과' }
      }
      render(<ResultsActionStep results={largeEffectResults} />)

      expect(screen.getByText(/큰 효과/)).toBeInTheDocument()
    })

    it('Pearson r 효과크기도 올바르게 해석되어야 함', () => {
      const correlationResults = {
        ...mockResults,
        effectSize: { value: 0.45, type: 'Pearson r' as const, interpretation: '중간 상관' }
      }
      render(<ResultsActionStep results={correlationResults} />)

      expect(screen.getByText(/중간 상관/)).toBeInTheDocument()
    })

    it('숫자 형태의 효과크기도 처리되어야 함', () => {
      const numericEffectResults = {
        ...mockResults,
        effectSize: 0.65
      }
      render(<ResultsActionStep results={numericEffectResults} />)

      // 숫자 값이 표시되는지 확인
      expect(screen.getByText('0.650')).toBeInTheDocument()
    })
  })

  describe('가설 표현', () => {
    it('독립표본 t-검정 가설이 표시되어야 함', () => {
      const tTestResults = {
        ...mockResults,
        method: '독립표본 t-검정'
      }
      render(<ResultsActionStep results={tTestResults} />)

      expect(screen.getByText('📝 검정 가설')).toBeInTheDocument()
      expect(screen.getByText('귀무가설:')).toBeInTheDocument()
      expect(screen.getByText('대립가설:')).toBeInTheDocument()
      expect(screen.getByText(/두 그룹의 평균이 같다/)).toBeInTheDocument()
      expect(screen.getByText(/두 그룹의 평균이 다르다/)).toBeInTheDocument()
    })

    it('ANOVA 가설이 표시되어야 함', () => {
      const anovaResults = {
        ...mockResults,
        method: '일원배치 ANOVA'
      }
      render(<ResultsActionStep results={anovaResults} />)

      expect(screen.getByText(/모든 그룹의 평균이 같다/)).toBeInTheDocument()
      expect(screen.getByText(/적어도 한 그룹의 평균이 다르다/)).toBeInTheDocument()
    })

    it('상관분석 가설이 표시되어야 함', () => {
      const correlationResults = {
        ...mockResults,
        method: '피어슨 상관분석'
      }
      render(<ResultsActionStep results={correlationResults} />)

      expect(screen.getByText(/두 변수 간 상관관계가 없다/)).toBeInTheDocument()
      expect(screen.getByText(/두 변수 간 상관관계가 있다/)).toBeInTheDocument()
    })

    it('지원하지 않는 방법은 가설을 표시하지 않아야 함', () => {
      const unknownResults = {
        ...mockResults,
        method: '알 수 없는 검정'
      }
      render(<ResultsActionStep results={unknownResults} />)

      expect(screen.queryByText('📝 검정 가설')).not.toBeInTheDocument()
    })
  })

  describe('통합 테스트', () => {
    it('모든 UX 개선 요소가 동시에 렌더링되어야 함', () => {
      render(<ResultsActionStep results={mockResults} />)

      // 1. 데이터 보안 안내
      expect(screen.getByText('데이터 보안 안내')).toBeInTheDocument()

      // 2. 분석 요약 배지
      expect(screen.getByText(/표본 크기: N=50/)).toBeInTheDocument()
      expect(screen.getByText(/종속변수: 점수/)).toBeInTheDocument()

      // 3. p-value 해석
      expect(screen.getByText(/유의한 차이 있음 \(p < 0.05\)/)).toBeInTheDocument()

      // 4. 효과크기 해석
      expect(screen.getByText(/중간 효과/)).toBeInTheDocument()
    })
  })
})
