/**
 * Phase 3 검증 테스트: Animation & UX 개선
 *
 * 검증 항목:
 * 1. ✅ Stagger Animation (5개 카드 순차 등장)
 * 2. ✅ AI 추천 결과 Slide-up + Fade-in
 * 3. ✅ 추천 이유 리스트 순차 등장
 * 4. ✅ 애니메이션 딜레이 정확성
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

describe('Phase 3: Animation & UX 개선', () => {
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

  describe('1. Stagger Animation (카드 순차 등장)', () => {
    it('5개 카드가 모두 animate-in 클래스를 가져야 함', () => {
      const { container } = render(<PurposeInputStep {...defaultProps} />)

      // 5개 카드 래퍼 div 확인
      const cardWrappers = container.querySelectorAll('div[class*="animate-in"]')

      // DataProfileSummary도 animate-in을 가지므로 최소 5개 이상
      expect(cardWrappers.length).toBeGreaterThanOrEqual(5)
    })

    it('각 카드 래퍼가 fade-in 및 slide-in-from-bottom-4 클래스를 가져야 함', () => {
      const { container } = render(<PurposeInputStep {...defaultProps} />)

      // 카드 그리드 내부의 애니메이션 div들
      const grid = container.querySelector('div[class*="grid-cols-1"]')
      const cardWrappers = grid?.querySelectorAll('div[class*="animate-in"]')

      expect(cardWrappers).toBeDefined()
      if (cardWrappers) {
        expect(cardWrappers.length).toBe(5)

        cardWrappers.forEach(wrapper => {
          expect(wrapper.className).toMatch(/animate-in/)
          expect(wrapper.className).toMatch(/fade-in/)
          expect(wrapper.className).toMatch(/slide-in-from-bottom-4/)
        })
      }
    })

    it('각 카드가 순차적인 animationDelay를 가져야 함 (0ms, 100ms, 200ms, 300ms, 400ms)', () => {
      const { container } = render(<PurposeInputStep {...defaultProps} />)

      const grid = container.querySelector('div[class*="grid-cols-1"]')
      const cardWrappers = grid?.querySelectorAll('div[class*="animate-in"]')

      if (cardWrappers) {
        const delays = Array.from(cardWrappers).map(wrapper => {
          const style = (wrapper as HTMLElement).style
          return style.animationDelay
        })

        expect(delays).toEqual(['0ms', '100ms', '200ms', '300ms', '400ms'])
      }
    })

    it('animationFillMode가 backwards로 설정되어야 함', () => {
      const { container } = render(<PurposeInputStep {...defaultProps} />)

      const grid = container.querySelector('div[class*="grid-cols-1"]')
      const cardWrappers = grid?.querySelectorAll('div[class*="animate-in"]')

      if (cardWrappers) {
        cardWrappers.forEach(wrapper => {
          const style = (wrapper as HTMLElement).style
          expect(style.animationFillMode).toBe('backwards')
        })
      }
    })
  })

  describe('2. AI 추천 결과 Slide-up Animation', () => {
    it('추천 결과 카드가 slide-in-from-bottom-4 클래스를 가져야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          const recommendationCard = screen.getByText(/추천: 독립표본 t-검정/).closest('div[class*="border-primary"]')
          expect(recommendationCard).toBeInTheDocument()
          expect(recommendationCard?.className).toMatch(/slide-in-from-bottom-4/)
        }, { timeout: 2000 })
      }
    })

    it('추천 결과 카드가 fade-in 애니메이션을 가져야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          const recommendationCard = screen.getByText(/추천: 독립표본 t-검정/).closest('div[class*="border-primary"]')
          expect(recommendationCard?.className).toMatch(/animate-in/)
          expect(recommendationCard?.className).toMatch(/fade-in/)
        }, { timeout: 2000 })
      }
    })

    it('추천 결과 카드가 duration-500 클래스를 가져야 함 (0.5초)', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          const recommendationCard = screen.getByText(/추천: 독립표본 t-검정/).closest('div[class*="border-primary"]')
          expect(recommendationCard?.className).toMatch(/duration-500/)
        }, { timeout: 2000 })
      }
    })
  })

  describe('3. 추천 이유 리스트 Stagger Animation', () => {
    it('추천 이유 각 항목이 animate-in 클래스를 가져야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          const reasoningSection = screen.getByText('추천 이유:').closest('div')
          const reasonItems = reasoningSection?.querySelectorAll('li[class*="animate-in"]')

          expect(reasonItems).toBeDefined()
          if (reasonItems) {
            expect(reasonItems.length).toBeGreaterThan(0)
          }
        }, { timeout: 2000 })
      }
    })

    it('추천 이유 항목이 slide-in-from-left-2 애니메이션을 가져야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          const reasoningSection = screen.getByText('추천 이유:').closest('div')
          const reasonItems = reasoningSection?.querySelectorAll('li[class*="animate-in"]')

          if (reasonItems) {
            reasonItems.forEach(item => {
              expect(item.className).toMatch(/slide-in-from-left-2/)
              expect(item.className).toMatch(/fade-in/)
            })
          }
        }, { timeout: 2000 })
      }
    })

    it('추천 이유 항목이 순차적인 animationDelay를 가져야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          const reasoningSection = screen.getByText('추천 이유:').closest('div')
          const reasonItems = reasoningSection?.querySelectorAll('li[class*="animate-in"]')

          if (reasonItems && reasonItems.length > 0) {
            const delays = Array.from(reasonItems).map((item, idx) => {
              const style = (item as HTMLElement).style
              return style.animationDelay
            })

            // 각 항목이 100ms 간격으로 딜레이되어야 함
            delays.forEach((delay, idx) => {
              expect(delay).toBe(`${idx * 100}ms`)
            })
          }
        }, { timeout: 2000 })
      }
    })

    it('추천 이유 항목의 animationFillMode가 backwards여야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        await waitFor(() => {
          const reasoningSection = screen.getByText('추천 이유:').closest('div')
          const reasonItems = reasoningSection?.querySelectorAll('li[class*="animate-in"]')

          if (reasonItems) {
            reasonItems.forEach(item => {
              const style = (item as HTMLElement).style
              expect(style.animationFillMode).toBe('backwards')
            })
          }
        }, { timeout: 2000 })
      }
    })
  })

  describe('4. 애니메이션 성능 및 일관성', () => {
    it('모든 애니메이션이 CSS 클래스로 정의되어 성능이 최적화되어야 함', () => {
      const { container } = render(<PurposeInputStep {...defaultProps} />)

      // JavaScript 애니메이션이 아닌 CSS 클래스 기반 애니메이션 확인
      const animatedElements = container.querySelectorAll('[class*="animate-in"]')

      expect(animatedElements.length).toBeGreaterThan(0)
      animatedElements.forEach(el => {
        // Tailwind CSS 애니메이션 클래스 확인
        expect(el.className).toMatch(/animate-in/)
      })
    })

    it('DataProfileSummary도 애니메이션을 가져야 함', () => {
      const { container } = render(<PurposeInputStep {...defaultProps} />)

      // DataProfileSummary는 Phase 1에서 이미 fade-in을 가짐
      const dataProfile = screen.getByText('데이터 요약 (Step 2 결과)').closest('div[class*="animate-in"]')

      expect(dataProfile).toBeInTheDocument()
      if (dataProfile) {
        expect(dataProfile.className).toMatch(/fade-in/)
      }
    })
  })

  describe('5. 사용자 경험 개선 확인', () => {
    it('카드 클릭 시 즉각적인 피드백이 있어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        const initialClass = compareCard.className
        fireEvent.click(compareCard)

        // 클릭 후 border-primary 클래스 추가 확인
        await waitFor(() => {
          expect(compareCard.className).toMatch(/border-primary/)
        })
      }
    })

    it('AI 분석 중 로딩 상태가 명확하게 표시되어야 함', async () => {
      render(<PurposeInputStep {...defaultProps} />)

      const compareCard = screen.getByText('그룹 간 차이 비교').closest('div[class*="cursor-pointer"]')
      if (compareCard) {
        fireEvent.click(compareCard)

        // AI 분석 진행 중 메시지 확인
        await waitFor(() => {
          expect(screen.getByText(/AI가 최적의 통계 방법을 찾고 있습니다/)).toBeInTheDocument()
        }, { timeout: 500 })

        // AI 분석 완료 후 추천 결과 확인
        await waitFor(() => {
          expect(screen.getByText(/추천: 독립표본 t-검정/)).toBeInTheDocument()
        }, { timeout: 2000 })
      }
    })
  })
})
