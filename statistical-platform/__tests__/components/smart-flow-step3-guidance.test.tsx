/**
 * Smart Flow Step 3 Guidance Card Test
 *
 * 목적: Step 3에 추가된 가이드 카드 및 에러 처리 검증
 * 검증 항목:
 * 1. AI 추천 성공 시 가이드 카드 표시
 * 2. "분석 방법이 결정되었습니다!" 헤딩 표시
 * 3. 3단계 프로세스 리스트 표시
 * 4. "변수 선택하기" CTA 버튼 표시
 * 5. AI 분석 에러 시 에러 메시지 표시
 * 6. 목적 미선택 시 선택 안내 표시
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import type { ValidationResults, DataRow, AIRecommendation } from '@/types/smart-flow'

// Mock data
const mockData: DataRow[] = [
  { age: 25, score: 85, group: 'A' },
  { age: 30, score: 90, group: 'B' },
  { age: 35, score: 78, group: 'A' }
]

const mockValidationResults: ValidationResults = {
  isValid: true,
  totalRows: 3,
  columnCount: 3,
  missingValues: 0,
  dataType: 'CSV',
  variables: ['age', 'score', 'group'],
  errors: [],
  warnings: [],
  columns: [
    {
      name: 'age',
      type: 'numeric',
      numericCount: 3,
      textCount: 0,
      missingCount: 0,
      uniqueValues: 3,
      mean: 30,
      median: 30,
      std: 5,
      min: 25,
      max: 35,
      outliers: []
    },
    {
      name: 'score',
      type: 'numeric',
      numericCount: 3,
      textCount: 0,
      missingCount: 0,
      uniqueValues: 3,
      mean: 84.3,
      median: 85,
      std: 6,
      min: 78,
      max: 90,
      outliers: []
    },
    {
      name: 'group',
      type: 'categorical',
      numericCount: 0,
      textCount: 3,
      missingCount: 0,
      uniqueValues: 2
    }
  ]
}

const mockRecommendation: AIRecommendation = {
  method: {
    id: 'independent-t-test',
    name: '독립표본 t-검정',
    category: 't-test',
    description: '두 독립된 그룹 간 평균 차이를 검정합니다.',
    requirements: {
      minSampleSize: 2,
      assumptions: ['normality', 'homogeneity']
    }
  },
  confidence: 0.95,
  reasoning: [
    '두 그룹 간 평균 비교',
    '표본 크기 충분',
    '정규성 가정 충족'
  ],
  assumptions: [
    { name: '정규성', passed: true, pValue: 0.3 },
    { name: '등분산성', passed: true, pValue: 0.5 }
  ],
  alternatives: []
}

// Mock dependencies
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

vi.mock('@/lib/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false
}))

vi.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: (selector: (state: unknown) => unknown) => {
    const mockState = {
      assumptionResults: {
        normality: { passed: true, pValue: 0.3 },
        homogeneity: { passed: true, pValue: 0.5 }
      },
      setSelectedMethod: vi.fn()
    }
    return selector ? selector(mockState) : mockState
  }
}))

vi.mock('@/components/common/analysis/PurposeCard', () => ({
  PurposeCard: ({ onClick, title }: { onClick: () => void; title: string }) => (
    <button onClick={onClick} data-testid="purpose-card">
      {title}
    </button>
  )
}))

vi.mock('@/components/common/analysis/AIAnalysisProgress', () => ({
  AIAnalysisProgress: () => <div data-testid="ai-progress">Analyzing...</div>
}))

vi.mock('@/components/common/analysis/DataProfileSummary', () => ({
  DataProfileSummary: () => <div data-testid="data-profile">Summary</div>
}))

// Mock recommenders
let mockAnalyzeResult: AIRecommendation | null = mockRecommendation
vi.mock('@/lib/services/decision-tree-recommender', () => ({
  DecisionTreeRecommender: {
    recommend: vi.fn(() => mockAnalyzeResult),
    recommendWithoutAssumptions: vi.fn(() => mockAnalyzeResult)
  }
}))

vi.mock('@/lib/services/ollama-recommender', () => ({
  ollamaRecommender: {
    checkHealth: vi.fn().mockResolvedValue(false),
    recommend: vi.fn().mockResolvedValue(null)
  }
}))

// Import component after mocks
import { PurposeInputStep } from '@/components/smart-flow/steps/PurposeInputStep'

// Skip: UI structure has changed significantly - guidance card no longer exists in this form
describe.skip('Smart Flow Step 3 Guidance Card Tests', () => {
  beforeEach(() => {
    mockAnalyzeResult = mockRecommendation
  })

  describe('✅ 정상 케이스: AI 추천 성공 → 가이드 카드 표시', () => {
    it('should show guidance card with CTA button after AI recommendation', async () => {
      const mockOnPurposeSubmit = vi.fn()

      render(
        <PurposeInputStep
          validationResults={mockValidationResults}
          data={mockData}
          onPurposeSubmit={mockOnPurposeSubmit}
        />
      )

      // 목적 선택
      const purposeCard = screen.getAllByTestId('purpose-card')[0]
      fireEvent.click(purposeCard)

      // AI 분석 완료 대기
      await waitFor(() => {
        expect(screen.queryByTestId('ai-progress')).not.toBeInTheDocument()
      })

      // 가이드 카드 표시 확인 (Vercel 스타일 - steps 미사용)
      expect(screen.getByText('분석 방법이 결정되었습니다!')).toBeInTheDocument()
      expect(screen.getByText('독립표본 t-검정')).toBeInTheDocument()

      // description 확인 (GuidanceCard)
      expect(screen.getByText(/방법으로 분석합니다/)).toBeInTheDocument()

      // CTA 버튼 확인
      expect(screen.getByRole('button', { name: /변수 선택하기/ })).toBeInTheDocument()
    })

    it('should call onPurposeSubmit when CTA button is clicked', async () => {
      const mockOnPurposeSubmit = vi.fn()

      render(
        <PurposeInputStep
          validationResults={mockValidationResults}
          data={mockData}
          onPurposeSubmit={mockOnPurposeSubmit}
        />
      )

      // 목적 선택
      const purposeCard = screen.getAllByTestId('purpose-card')[0]
      fireEvent.click(purposeCard)

      // AI 분석 완료 대기
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /변수 선택하기/ })).toBeInTheDocument()
      })

      // CTA 버튼 클릭
      const ctaButton = screen.getByRole('button', { name: /변수 선택하기/ })
      fireEvent.click(ctaButton)

      expect(mockOnPurposeSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe('❌ 에러 케이스: AI 분석 실패 → 에러 메시지 표시', () => {
    it('should show error alert when AI analysis fails', async () => {
      mockAnalyzeResult = null // AI 분석 실패 시뮬레이션

      render(
        <PurposeInputStep
          validationResults={mockValidationResults}
          data={mockData}
          onPurposeSubmit={vi.fn()}
        />
      )

      // 목적 선택
      const purposeCard = screen.getAllByTestId('purpose-card')[0]
      fireEvent.click(purposeCard)

      // 에러 메시지 표시 대기
      await waitFor(() => {
        expect(screen.getByText(/AI 분석 중 오류가 발생했습니다/)).toBeInTheDocument()
      })

      // 가이드 카드는 미표시
      expect(screen.queryByText('분석 방법이 결정되었습니다!')).not.toBeInTheDocument()
    })

    it('should NOT show guidance card when AI analysis fails', async () => {
      mockAnalyzeResult = null

      render(
        <PurposeInputStep
          validationResults={mockValidationResults}
          data={mockData}
          onPurposeSubmit={vi.fn()}
        />
      )

      const purposeCard = screen.getAllByTestId('purpose-card')[0]
      fireEvent.click(purposeCard)

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /변수 선택하기/ })).not.toBeInTheDocument()
      })
    })
  })

  describe('ℹ️ 초기 상태: 선택 안내 표시', () => {
    it('should show selection guide when no purpose is selected', () => {
      render(
        <PurposeInputStep
          validationResults={mockValidationResults}
          data={mockData}
          onPurposeSubmit={vi.fn()}
        />
      )

      // 선택 안내 메시지 표시
      expect(screen.getByText(/위에서 분석 목적을 선택하면 AI가 자동으로 최적의 통계 방법을 추천합니다/)).toBeInTheDocument()

      // 가이드 카드 미표시
      expect(screen.queryByText('분석 방법이 결정되었습니다!')).not.toBeInTheDocument()
    })
  })

  describe('🎨 UI 컴포넌트 스타일 검증', () => {
    it('should render guidance card with correct styling classes', async () => {
      const { container } = render(
        <PurposeInputStep
          validationResults={mockValidationResults}
          data={mockData}
          onPurposeSubmit={vi.fn()}
        />
      )

      const purposeCard = screen.getAllByTestId('purpose-card')[0]
      fireEvent.click(purposeCard)

      await waitFor(() => {
        expect(screen.getByText('분석 방법이 결정되었습니다!')).toBeInTheDocument()
      })

      // Vercel 스타일: border-blue-200, bg-gradient-to-r 클래스 확인
      const guidanceCard = container.querySelector('.border-blue-200')
      expect(guidanceCard).toBeInTheDocument()
      expect(guidanceCard).toHaveClass('bg-gradient-to-r')
    })
  })

  describe('📊 추천 결과 상세 정보', () => {
    it('should show detailed recommendation info', async () => {
      render(
        <PurposeInputStep
          validationResults={mockValidationResults}
          data={mockData}
          onPurposeSubmit={vi.fn()}
        />
      )

      const purposeCard = screen.getAllByTestId('purpose-card')[0]
      fireEvent.click(purposeCard)

      await waitFor(() => {
        // 추천 방법 상세 정보 카드 표시
        expect(screen.getByText(/추천:/)).toBeInTheDocument()
        expect(screen.getByText(/신뢰도:/)).toBeInTheDocument()
      })
    })
  })
})
