/**
 * Phase 1 검증 테스트: Step 2 단순화
 *
 * 검증 항목:
 * 1. Skeleton Loading 표시
 * 2. Fade-in 애니메이션 적용
 * 3. 간결한 요약 카드만 표시
 * 4. 무거운 분석 로직 제거 확인
 * 5. TypeScript 타입 안전성
 */

import { render, screen, waitFor } from '@testing-library/react'
import { DataValidationStep } from '@/components/smart-flow/steps/DataValidationStep'
import type { ValidationResults, DataRow } from '@/types/smart-flow'

// Mock Zustand store
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    uploadedFile: { name: 'test-data.csv' },
    uploadedFileName: 'test-data.csv',
    setDataCharacteristics: jest.fn(),
    setAssumptionResults: jest.fn()
  })
}))

describe('Phase 1: DataValidationStep 단순화', () => {
  const mockValidationResults: ValidationResults = {
    isValid: true,
    totalRows: 30,
    columnCount: 5,
    missingValues: 0,
    dataType: 'mixed',
    variables: ['Age', 'Gender', 'Score', 'Group', 'Treatment'],
    errors: [],
    warnings: [],
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
    currentStep: 2,
    totalSteps: 6
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. Skeleton Loading', () => {
    it('초기 로딩 시 Skeleton을 표시해야 함', () => {
      const { container } = render(<DataValidationStep {...defaultProps} />)

      // Skeleton 컴포넌트 확인
      const skeletons = container.querySelectorAll('[class*="animate-pulse"]')
      expect(skeletons.length).toBeGreaterThan(0)
    })

    it('1초 후 Skeleton이 사라지고 콘텐츠가 표시되어야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      // 1초 대기
      await waitFor(() => {
        expect(screen.getByText('데이터 준비 완료')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('2. Fade-in 애니메이션', () => {
    it('콘텐츠가 fade-in 애니메이션 클래스를 가져야 함', async () => {
      const { container } = render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        const animatedDiv = container.querySelector('[class*="animate-in"][class*="fade-in"]')
        expect(animatedDiv).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('3. 간결한 요약 카드', () => {
    it('표본 크기를 표시해야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('30')).toBeInTheDocument()
        expect(screen.getByText('충분')).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('변수 정보를 표시해야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/수치형 2개/)).toBeInTheDocument()
        expect(screen.getByText(/범주형 1개/)).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('데이터 품질을 표시해야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('완벽')).toBeInTheDocument()
        expect(screen.getByText(/결측 0개/)).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('파일명을 표시해야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('test-data.csv')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('4. 무거운 분석 제거 확인', () => {
    it('정규성 검정 관련 UI가 없어야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText(/Shapiro-Wilk/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Anderson-Darling/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/정규성 검정/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('등분산성 검정 관련 UI가 없어야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText(/Levene/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Bartlett/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/등분산성/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('상관관계 히트맵이 없어야 함', async () => {
      const { container } = render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(container.querySelector('canvas')).not.toBeInTheDocument()
        expect(screen.queryByText(/상관계수/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('Q-Q plot이 없어야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.queryByText(/Q-Q plot/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/정규분포 적합도/i)).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('5. Step 3 연결 안내', () => {
    it('AI 추천 안내 메시지를 표시해야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText(/AI가 자동으로 최적의 통계 방법을 추천/)).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('분석 단계 안내 (상세 분석 → 가정 검정 → AI 추천)를 표시해야 함', async () => {
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('상세 분석')).toBeInTheDocument()
        expect(screen.getByText('가정 검정')).toBeInTheDocument()
        expect(screen.getByText('AI 추천')).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('6. 에러/경고 처리', () => {
    it('에러가 있을 때 에러 상태를 표시해야 함', async () => {
      const propsWithErrors = {
        ...defaultProps,
        validationResults: {
          ...mockValidationResults,
          isValid: false,
          errors: ['컬럼명 중복', '잘못된 데이터 타입']
        }
      }

      render(<DataValidationStep {...propsWithErrors} />)

      await waitFor(() => {
        expect(screen.getByText('데이터 검증 실패')).toBeInTheDocument()
        expect(screen.getByText(/컬럼명 중복/)).toBeInTheDocument()
        expect(screen.getByText(/잘못된 데이터 타입/)).toBeInTheDocument()
      }, { timeout: 2000 })
    })

    it('경고가 있을 때 경고 상태를 표시해야 함', async () => {
      const propsWithWarnings = {
        ...defaultProps,
        validationResults: {
          ...mockValidationResults,
          warnings: ['소표본 크기', '결측치 5% 이상']
        }
      }

      render(<DataValidationStep {...propsWithWarnings} />)

      await waitFor(() => {
        expect(screen.getByText('데이터 검증 완료 (경고 있음)')).toBeInTheDocument()
        expect(screen.getByText(/소표본 크기/)).toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  describe('7. 성능 검증', () => {
    it('1초 이내에 로딩이 완료되어야 함', async () => {
      const startTime = Date.now()
      render(<DataValidationStep {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('데이터 준비 완료')).toBeInTheDocument()
        const endTime = Date.now()
        const elapsedTime = endTime - startTime
        expect(elapsedTime).toBeLessThan(1500) // 1.5초 이내
      }, { timeout: 2000 })
    })
  })
})
