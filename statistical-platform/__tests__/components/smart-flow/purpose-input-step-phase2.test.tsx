/**
 * Phase 2 검증 테스트: Step 3 완전 재설계
 *
 * 검증 항목:
 * 1. ❌ Textarea 제거 확인
 * 2. ✅ Decision Tree UI (5개 목적 카드)
 * 3. ✅ DataProfile 명시적 표시
 * 4. ✅ isAnalyzing 명시적 표시 (AIAnalysisProgress)
 * 5. ✅ "이 방법으로 분석하기" 버튼
 * 6. ✅ Accordion으로 상세 정보
 * 7. ✅ 공통 컴포넌트 사용 (PurposeCard, AIAnalysisProgress, DataProfileSummary)
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { PurposeInputStep } from '@/components/smart-flow/steps/PurposeInputStep'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// Mock Zustand store
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    assumptionResults: {
      normality: {
        shapiroWilk: { isNormal: true, pValue: 0.08 }
      },
      homogeneity: {
        levene: { equalVariance: true, pValue: 0.15 }
      }
    },
    dataCharacteristics: null,
    setSelectedMethod: jest.fn(),
    setVariableMapping: jest.fn()
  })
}))

// Mock logger
jest.mock('@/lib/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

describe('Phase 2: PurposeInputStep 완전 재설계', () => {
  const mockValidationResults: ValidationResults = {
    isValid: true,
    totalRows: 30,
    columnCount: 5,
    missingValues: 0,
    dataType: 'mixed',
    variables: ['Age', 'Gender', 'Score', 'Group', 'Treatment'],
    errors: [],
    warnings: [],
    columns: [
      {
        name: 'Age',
        type: 'numeric',
        numericCount: 30,
        textCount: 0,
        missingCount: 0,
        uniqueValues: 25,
        mean: 35.5,
        median: 34,
        std: 8.2,
        min: 18,
        max: 65
      },
      {
        name: 'Gender',
        type: 'categorical',
        numericCount: 0,
        textCount: 30,
        missingCount: 0,
        uniqueValues: 2,
        topCategories: [
          { value: 'Male', count: 15 },
          { value: 'Female', count: 15 }
        ]
      },
      {
        name: 'Score',
        type: 'numeric',
        numericCount: 30,
        textCount: 0,
        missingCount: 0,
        uniqueValues: 28,
        mean: 75.3,
        median: 76,
        std: 10.5,
        min: 50,
        max: 95
      }
    ],
    columnStats: [
      {
        name: 'Age',
        type: 'numeric',
        numericCount: 30,
        textCount: 0,
        missingCount: 0,
        uniqueValues: 25,
        mean: 35.5,
        median: 34,
        std: 8.2,
        min: 18,
        max: 65
      },
      {
        name: 'Gender',
        type: 'categorical',
        numericCount: 0,
        textCount: 30,
        missingCount: 0,
        uniqueValues: 2,
        topCategories: [
          { value: 'Male', count: 15 },
          { value: 'Female', count: 15 }
        ]
      }
    ]
  }

  const mockData: DataRow[] = Array.from({ length: 30 }, (_, i) => ({
    Age: String(20 + i),
    Gender: i % 2 === 0 ? 'Male' : 'Female',
    Score: String(70 + i),
    Group: i < 15 ? 'A' : 'B',
    Treatment: i < 15 ? 'Control' : 'Treatment'
  }))

  const defaultProps = {
    validationResults: mockValidationResults,
    data: mockData,
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    canGoNext: true,
    canGoPrevious: true,
    currentStep: 3,
    totalSteps: 6,
    onPurposeSubmit: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. Textarea 제거 확인', () => {
    it('textarea가 렌더링되지 않아야 함', () => {
      const { container } = render(<PurposeInputStep {...defaultProps} />)

      const textarea = container.querySelector('textarea')
      expect(textarea).not.toBeInTheDocument()
    })

    it('"무엇을 알고 싶으신가요?" 텍스트가 없어야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.queryByText(/무엇을 알고 싶으신가요.*선택사항/)).not.toBeInTheDocument()
    })
  })

  describe('2. Decision Tree UI (5개 목적 카드)', () => {
    it('5개의 분석 목적 카드가 표시되어야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.getByText('그룹 간 차이 비교')).toBeInTheDocument()
      expect(screen.getByText('변수 간 관계 분석')).toBeInTheDocument()
      expect(screen.getByText('분포와 빈도 분석')).toBeInTheDocument()
      expect(screen.getByText('예측 모델링')).toBeInTheDocument()
      expect(screen.getByText('시계열 분석')).toBeInTheDocument()
    })

    it('"어떤 분석을 하고 싶으신가요?" 헤딩이 표시되어야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.getByText('어떤 분석을 하고 싶으신가요?')).toBeInTheDocument()
    })

    it('각 카드에 설명과 예시가 포함되어야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      // 그룹 간 차이 비교 카드
      expect(screen.getByText(/두 개 이상의 그룹을 비교하여/)).toBeInTheDocument()
      expect(screen.getByText(/예: 남녀 간 키 차이/)).toBeInTheDocument()

      // 변수 간 관계 분석 카드
      expect(screen.getByText(/상관관계나 연관성/)).toBeInTheDocument()
      expect(screen.getByText(/예: 키와 몸무게의 관계/)).toBeInTheDocument()
    })

    it('카드를 클릭하면 선택 상태가 변경되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      expect(compareCard).toBeInTheDocument()

      if (compareCard) {
        fireEvent.click(compareCard)

        // 선택 상태 확인 (border-primary 클래스)
        await waitFor(() => {
          expect(compareCard).toHaveClass(/border-primary/)
        })
      }
    })
  })

  describe('3. DataProfile 명시적 표시', () => {
    it('DataProfileSummary 컴포넌트가 렌더링되어야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.getByText('데이터 요약 (Step 2 결과)')).toBeInTheDocument()
    })

    it('표본 크기를 표시해야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.getByText('30')).toBeInTheDocument()
    })

    it('변수 정보를 표시해야 함 (수치형 2개, 범주형 1개)', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.getByText(/수치형 2개/)).toBeInTheDocument()
      expect(screen.getByText(/범주형 1개/)).toBeInTheDocument()
    })

    it('데이터 품질을 표시해야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      // missingValues: 0이므로 완벽한 품질
      expect(screen.getByText(/결측 0개/)).toBeInTheDocument()
    })

    it('권장 분석 유형을 표시해야 함 (n=30이므로 parametric)', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.getByText('모수적')).toBeInTheDocument()
    })
  })

  describe('4. isAnalyzing 명시적 표시', () => {
    it('목적 선택 후 AIAnalysisProgress가 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        // AI 분석 진행 메시지 확인
        await waitFor(() => {
          expect(screen.getByText(/AI가 최적의 통계 방법을 찾고 있습니다/)).toBeInTheDocument()
        }, { timeout: 500 })
      }
    })

    it('분석 중에는 카드가 비활성화되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        // 분석 시작 직후 다른 카드 확인
        await waitFor(() => {
          // AI 분석이 시작되면 모든 카드가 disabled 상태로 변경됨
          const relationshipCard = screen.getByText('변수 간 관계 분석').closest('div[class*="cursor-not-allowed"]')
          expect(relationshipCard).toBeInTheDocument()
        }, { timeout: 100 })
      }
    })
  })

  describe('5. "이 방법으로 분석하기" 버튼', () => {
    it('추천 결과가 나오면 버튼이 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        // 1.5초 대기 (mock AI 분석 시간)
        await waitFor(() => {
          expect(screen.getByText('이 방법으로 분석하기')).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })

    it('버튼 클릭 시 onPurposeSubmit과 onNext가 호출되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          const confirmButton = screen.getByText('이 방법으로 분석하기')
          fireEvent.click(confirmButton)

          expect(defaultProps.onPurposeSubmit).toHaveBeenCalled()
          expect(defaultProps.onNext).toHaveBeenCalled()
        }, { timeout: 2000 })
      }
    })
  })

  describe('6. Accordion으로 상세 정보', () => {
    it('통계적 가정 검정 결과 Accordion이 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          expect(screen.getByText('통계적 가정 검정 결과')).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })

    it('대안 방법 Accordion이 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          expect(screen.getByText('대안 방법')).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })

    it('방법 상세 정보 Accordion이 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          expect(screen.getByText('방법 상세 정보')).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })

    it('Accordion을 클릭하면 내용이 펼쳐져야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(async () => {
          const accordionTrigger = screen.getByText('통계적 가정 검정 결과')
          fireEvent.click(accordionTrigger)

          // Accordion 내용 확인
          await waitFor(() => {
            expect(screen.getByText('정규성')).toBeInTheDocument()
            expect(screen.getByText('등분산성')).toBeInTheDocument()
          })
        }, { timeout: 2000 })
      }
    })
  })

  describe('7. 공통 컴포넌트 사용 확인', () => {
    it('PurposeCard 컴포넌트가 5개 렌더링되어야 함', () => {
      const { container } = render(<PurposeInputStep {...defaultProps} />)

      // PurposeCard는 cursor-pointer 클래스를 가진 Card 컴포넌트
      const purposeCards = container.querySelectorAll('div[class*="cursor-pointer"][class*="border-2"]')
      expect(purposeCards.length).toBe(5)
    })

    it('DataProfileSummary 컴포넌트가 렌더링되어야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.getByText('데이터 요약 (Step 2 결과)')).toBeInTheDocument()
    })

    it('AIAnalysisProgress 컴포넌트가 분석 중에 렌더링되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          expect(screen.getByText(/AI가 최적의 통계 방법을 찾고 있습니다/)).toBeInTheDocument()
        }, { timeout: 500 })
      }
    })
  })

  describe('8. AI 추천 결과 표시', () => {
    it('추천된 방법명이 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          expect(screen.getByText(/추천: 독립표본 t-검정/)).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })

    it('신뢰도가 퍼센트로 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          expect(screen.getByText(/신뢰도: 92%/)).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })

    it('추천 이유가 리스트로 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          expect(screen.getByText('추천 이유:')).toBeInTheDocument()
          expect(screen.getByText(/두 독립 그룹 간 평균 비교가 필요합니다/)).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })
  })

  describe('9. 초기 상태 안내', () => {
    it('목적 미선택 시 안내 메시지가 표시되어야 함', () => {
      render(<PurposeInputStep {...defaultProps} />)

      expect(screen.getByText(/위에서 분석 목적을 선택하면 AI가 자동으로/)).toBeInTheDocument()
    })

    it('목적 선택 후 안내 메시지가 사라져야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          expect(screen.queryByText(/위에서 분석 목적을 선택하면/)).not.toBeInTheDocument()
        }, { timeout: 500 })
      }
    })
  })
})
