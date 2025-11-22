/**
 * ResultsActionStep 다국어 지원 테스트
 *
 * 목적: 영어 메서드명과 효과크기 별칭 지원 검증
 */

import { render, screen } from '@testing-library/react'
import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'
import { AnalysisResult } from '@/types/smart-flow'

// Mock dependencies
jest.mock('@/lib/stores/smart-flow-store', () => ({
  useSmartFlowStore: () => ({
    saveToHistory: jest.fn(),
    reset: jest.fn(),
    uploadedData: [],
    variableMapping: null
  })
}))

jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

jest.mock('@/lib/services/pdf-report-service', () => ({
  PDFReportService: {
    generateReport: jest.fn().mockResolvedValue(undefined),
    generateSummaryText: jest.fn().mockReturnValue('Mock summary text')
  }
}))

describe('ResultsActionStep - 영어 메서드명 지원', () => {
  describe('가설 생성 (generateHypothesis)', () => {
    it('영어 메서드명: "independent samples t-test" → 가설 카드 표시', () => {
      const results: AnalysisResult = {
        method: 'independent samples t-test',
        statistic: 2.5,
        pValue: 0.01,
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      // 가설 카드 확인
      expect(screen.getByText(/검정 가설/)).toBeInTheDocument()
      expect(screen.getByText(/두 그룹의 평균이 같다/)).toBeInTheDocument()
      expect(screen.getByText(/두 그룹의 평균이 다르다/)).toBeInTheDocument()
    })

    it('영어 메서드명: "paired t-test" → 가설 카드 표시', () => {
      const results: AnalysisResult = {
        method: 'paired t-test',
        statistic: 3.2,
        pValue: 0.005,
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText(/검정 가설/)).toBeInTheDocument()
      expect(screen.getByText(/측정 전후 평균 차이가 없다/)).toBeInTheDocument()
    })

    it('영어 메서드명: "correlation" → 가설 카드 표시', () => {
      const results: AnalysisResult = {
        method: 'Pearson correlation',
        statistic: 0.75,
        pValue: 0.001,
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText(/검정 가설/)).toBeInTheDocument()
      expect(screen.getByText(/두 변수 간 상관관계가 없다/)).toBeInTheDocument()
    })

    it('영어 메서드명: "regression" → 가설 카드 표시', () => {
      const results: AnalysisResult = {
        method: 'Linear regression',
        statistic: 4.5,
        pValue: 0.001,
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText(/검정 가설/)).toBeInTheDocument()
      expect(screen.getByText(/회귀계수가 0이다/)).toBeInTheDocument()
    })

    it('한글 메서드명: "독립표본 t-검정" → 가설 카드 표시 (기존 동작 유지)', () => {
      const results: AnalysisResult = {
        method: '독립표본 t-검정',
        statistic: 2.5,
        pValue: 0.01,
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText(/검정 가설/)).toBeInTheDocument()
      expect(screen.getByText(/두 그룹의 평균이 같다/)).toBeInTheDocument()
    })
  })

  describe('효과크기 해석 (interpretEffectSize)', () => {
    it('효과크기 별칭: "eta_squared" → 정상 해석', () => {
      const results: AnalysisResult = {
        method: 'One-way ANOVA',
        statistic: 5.2,
        pValue: 0.01,
        effectSize: {
          value: 0.08,
          type: 'eta_squared', // 별칭
          interpretation: '중간 효과'
        },
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      // 효과크기 값 표시 확인
      expect(screen.getByText('0.080')).toBeInTheDocument()
      // 자연어 해석 확인 (작은 효과 < 0.06 < 중간 효과 < 0.14)
      expect(screen.getByText(/중간 효과/)).toBeInTheDocument()
    })

    it('효과크기 별칭: "η²" → 정상 해석', () => {
      const results: AnalysisResult = {
        method: 'One-way ANOVA',
        statistic: 5.2,
        pValue: 0.01,
        effectSize: {
          value: 0.12,
          type: 'η²', // 그리스 문자 별칭
          interpretation: '중간 효과'
        },
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText('0.120')).toBeInTheDocument()
      expect(screen.getByText(/중간 효과/)).toBeInTheDocument()
    })

    it('효과크기 별칭: "pearson" → 정상 해석', () => {
      const results: AnalysisResult = {
        method: 'Correlation',
        statistic: 3.5,
        pValue: 0.001,
        effectSize: {
          value: 0.65,
          type: 'pearson', // 소문자 별칭
          interpretation: '강한 상관'
        },
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText('0.650')).toBeInTheDocument()
      expect(screen.getByText(/강한 상관/)).toBeInTheDocument()
    })

    it('효과크기 별칭: "cohens_d" → 정상 해석', () => {
      const results: AnalysisResult = {
        method: 'independent t-test',
        statistic: 2.5,
        pValue: 0.01,
        effectSize: {
          value: 0.6,
          type: 'cohens_d', // 언더스코어 별칭
          interpretation: '중간 효과'
        },
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText('0.600')).toBeInTheDocument()
      expect(screen.getByText(/중간 효과/)).toBeInTheDocument()
    })

    it('효과크기 표준 이름: "Cohen\'s d" → 정상 해석 (기존 동작 유지)', () => {
      const results: AnalysisResult = {
        method: 'independent t-test',
        statistic: 2.5,
        pValue: 0.01,
        effectSize: {
          value: 0.6,
          type: "Cohen's d",
          interpretation: '중간 효과'
        },
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText('0.600')).toBeInTheDocument()
      expect(screen.getByText(/중간 효과/)).toBeInTheDocument()
    })
  })

  describe('후속 추천 (getNextActions)', () => {
    it('영어 메서드명: "t-test" → Cohen\'s d 추천 표시', () => {
      const results: AnalysisResult = {
        method: 'independent samples t-test',
        statistic: 2.5,
        pValue: 0.01,
        interpretation: 'Test interpretation'
        // effectSize 없음 → 추천 표시
      }

      render(<ResultsActionStep results={results} />)

      // "다음 단계 추천" 섹션에서 Cohen's d 추천 확인
      expect(screen.getByText(/Cohen's d 계산/)).toBeInTheDocument()
      expect(screen.getByText(/실질적 차이의 크기 평가/)).toBeInTheDocument()
    })

    it('한글 메서드명: "독립표본 t-검정" → Cohen\'s d 추천 표시', () => {
      const results: AnalysisResult = {
        method: '독립표본 t-검정',
        statistic: 2.5,
        pValue: 0.01,
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText(/Cohen's d 계산/)).toBeInTheDocument()
    })

    it('한글 메서드명: "대응표본 t검정" (띄어쓰기 없음) → Cohen\'s d 추천 표시', () => {
      const results: AnalysisResult = {
        method: '대응표본 t검정',
        statistic: 3.2,
        pValue: 0.005,
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      expect(screen.getByText(/Cohen's d 계산/)).toBeInTheDocument()
    })

    it('효과크기 있음 → Cohen\'s d 추천 숨김', () => {
      const results: AnalysisResult = {
        method: 'independent t-test',
        statistic: 2.5,
        pValue: 0.01,
        effectSize: {
          value: 0.6,
          type: "Cohen's d",
          interpretation: '중간 효과'
        },
        interpretation: 'Test interpretation'
      }

      render(<ResultsActionStep results={results} />)

      // Cohen's d 추천이 없어야 함
      expect(screen.queryByText(/Cohen's d 계산/)).not.toBeInTheDocument()
    })
  })
})
