/**
 * ResultInterpretationPanel 테스트
 *
 * 테스트 범위:
 * 1. 그룹 비교 목적별 해석 (compare, 비교, difference, 차이)
 * 2. 상관관계 목적별 해석 (relationship, 관계, correlation, 상관)
 * 3. 예측/회귀 목적별 해석 (prediction, 예측, regression, 회귀)
 * 4. 목적이 매칭되지 않으면 렌더링하지 않음
 * 5. 빈 purpose 문자열 처리
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { ResultsActionStep } from '@/components/smart-flow/steps/ResultsActionStep'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import type { AnalysisResult } from '@/types/smart-flow'

// Mock zustand store
jest.mock('@/lib/stores/smart-flow-store')
const mockUseSmartFlowStore = useSmartFlowStore as jest.MockedFunction<typeof useSmartFlowStore>

// Mock PDFReportService
jest.mock('@/lib/services/pdf-report-service', () => ({
  PDFReportService: {
    generateReport: jest.fn()
  }
}))

describe('ResultInterpretationPanel - 목적별 해석', () => {
  const defaultStore = {
    saveToHistory: jest.fn(),
    reset: jest.fn(),
    uploadedData: Array(50).fill({ score: 85, group: 'A' }),
    variableMapping: {
      dependentVar: '점수',
      independentVar: '그룹'
    },
    analysisPurpose: '', // 각 테스트에서 override
    // @ts-ignore - 나머지 필드는 테스트에 불필요
    currentStep: 6,
    completedSteps: [1, 2, 3, 4, 5]
  }

  beforeEach(() => {
    mockUseSmartFlowStore.mockReturnValue(defaultStore)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('그룹 비교 목적', () => {
    const groupComparisonResults: AnalysisResult = {
      method: '독립표본 t-검정',
      statistic: 2.456,
      pValue: 0.023,
      df: 48,
      groupStats: [
        { name: '실험군', n: 25, mean: 85.5, std: 5.2 },
        { name: '대조군', n: 25, mean: 78.3, std: 6.1 }
      ],
      effectSize: {
        value: 0.65,
        type: "Cohen's d",
        interpretation: '중간 효과'
      },
      interpretation: '두 그룹 간 유의한 차이가 있습니다.'
    }

    it('목적 "비교"일 때 그룹 비교 해석 패널이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '두 그룹 간 평균 비교'
      })

      render(<ResultsActionStep results={groupComparisonResults} />)

      expect(screen.getByText('그룹 비교 결과')).toBeInTheDocument()
      expect(screen.getByText(/실험군 평균.*85.50.*대조군 평균.*78.30/)).toBeInTheDocument()
      // Check within the interpretation panel (using getAllByText since it may appear elsewhere)
      const interpretationTexts = screen.getAllByText(/통계적으로 유의한 차이가/)
      expect(interpretationTexts.length).toBeGreaterThan(0)
      expect(screen.getByText(/실질적 효과 크기는 중간 효과입니다/)).toBeInTheDocument()
    })

    it('목적 "차이"일 때도 그룹 비교 해석이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '그룹 간 차이 분석'
      })

      render(<ResultsActionStep results={groupComparisonResults} />)

      expect(screen.getByText('그룹 비교 결과')).toBeInTheDocument()
    })

    it('목적 "compare"(영어)일 때도 그룹 비교 해석이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: 'compare groups'
      })

      render(<ResultsActionStep results={groupComparisonResults} />)

      expect(screen.getByText('그룹 비교 결과')).toBeInTheDocument()
    })

    it('p-value >= 0.05일 때 유의하지 않다고 표시되어야 함', () => {
      const nonSignificantResults = { ...groupComparisonResults, pValue: 0.12 }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '그룹 비교'
      })

      render(<ResultsActionStep results={nonSignificantResults} />)

      expect(screen.getByText(/통계적으로 유의한 차이가 없습니다/)).toBeInTheDocument()
    })

    it('effectSize가 없으면 실질적 효과 메시지가 표시되지 않아야 함', () => {
      const resultsWithoutEffect = { ...groupComparisonResults, effectSize: undefined }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '그룹 비교'
      })

      render(<ResultsActionStep results={resultsWithoutEffect} />)

      expect(screen.getByText('그룹 비교 결과')).toBeInTheDocument()
      expect(screen.queryByText(/실질적 효과 크기/)).not.toBeInTheDocument()
    })
  })

  describe('상관관계 목적', () => {
    const correlationResults: AnalysisResult = {
      method: '피어슨 상관분석',
      statistic: 0.72, // r값
      pValue: 0.001,
      interpretation: '강한 양의 상관관계가 있습니다.'
    }

    it('목적 "관계"일 때 상관관계 해석 패널이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '변수 간 관계 분석'
      })

      render(<ResultsActionStep results={correlationResults} />)

      expect(screen.getByText('변수 간 관계 분석')).toBeInTheDocument()
      expect(screen.getByText(/X가 증가할 때 Y는 함께 증가하는 경향이 있습니다/)).toBeInTheDocument()
      expect(screen.getByText(/강한 양의 상관관계가 통계적으로 유의합니다/)).toBeInTheDocument()
    })

    it('목적 "상관"일 때도 상관관계 해석이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '상관분석'
      })

      render(<ResultsActionStep results={correlationResults} />)

      expect(screen.getByText('변수 간 관계 분석')).toBeInTheDocument()
    })

    it('목적 "correlation"(영어)일 때도 상관관계 해석이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: 'correlation analysis'
      })

      render(<ResultsActionStep results={correlationResults} />)

      expect(screen.getByText('변수 간 관계 분석')).toBeInTheDocument()
    })

    it('음의 상관관계일 때 올바르게 표시되어야 함', () => {
      const negativeCorrelation = { ...correlationResults, statistic: -0.65 }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '상관분석'
      })

      render(<ResultsActionStep results={negativeCorrelation} />)

      expect(screen.getByText(/X가 증가할 때 Y는 반대로 감소하는 경향이 있습니다/)).toBeInTheDocument()
      expect(screen.getByText(/중간 음의 상관관계가 통계적으로 유의합니다/)).toBeInTheDocument()
    })

    it('R² 값이 올바르게 계산되어 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '상관분석'
      })

      render(<ResultsActionStep results={correlationResults} />)

      // r=0.72 → r²=0.5184 → 51.8%
      expect(screen.getByText(/X 변동의 약 51.8%가 Y 변동과 관련됩니다/)).toBeInTheDocument()
    })
  })

  describe('예측/회귀 목적', () => {
    const regressionResults: AnalysisResult = {
      method: '선형회귀분석',
      statistic: 12.45,
      pValue: 0.002,
      coefficients: [
        { name: '절편', value: 10.5, stdError: 2.1, tValue: 5.0, pvalue: 0.001 },
        { name: 'X', value: 2.34, stdError: 0.45, tValue: 5.2, pvalue: 0.001 }
      ],
      additional: {
        rSquared: 0.68,
        adjustedRSquared: 0.65
      },
      interpretation: '회귀 모델이 유의합니다.'
    }

    it('목적 "예측"일 때 회귀 해석 패널이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '결과 예측 모델'
      })

      render(<ResultsActionStep results={regressionResults} />)

      expect(screen.getByText('예측 모델 결과')).toBeInTheDocument()
      expect(screen.getByText(/독립변수가 1단위 증가할 때 종속변수는 2.340만큼 변합니다/)).toBeInTheDocument()
      // Check model fit explanation (may appear in multiple places)
      const explanationTexts = screen.getAllByText(/설명력/)
      expect(explanationTexts.length).toBeGreaterThan(0)
      expect(screen.getByText(/이 모델로 종속변수 변동의 68.0%를 예측할 수 있습니다/)).toBeInTheDocument()
    })

    it('목적 "회귀"일 때도 회귀 해석이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '회귀분석'
      })

      render(<ResultsActionStep results={regressionResults} />)

      expect(screen.getByText('예측 모델 결과')).toBeInTheDocument()
    })

    it('목적 "regression"(영어)일 때도 회귀 해석이 표시되어야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: 'regression analysis'
      })

      render(<ResultsActionStep results={regressionResults} />)

      expect(screen.getByText('예측 모델 결과')).toBeInTheDocument()
    })

    it('R² < 0.4일 때 "낮은 설명력"이 표시되어야 함', () => {
      const lowR2Results = {
        ...regressionResults,
        additional: { rSquared: 0.25 }
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '회귀분석'
      })

      render(<ResultsActionStep results={lowR2Results} />)

      expect(screen.getByText(/낮은 설명력/)).toBeInTheDocument()
    })

    it('R² 0.4~0.7일 때 "중간 설명력"이 표시되어야 함', () => {
      const mediumR2Results = {
        ...regressionResults,
        additional: { rSquared: 0.55 }
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '회귀분석'
      })

      render(<ResultsActionStep results={mediumR2Results} />)

      expect(screen.getByText(/중간 설명력/)).toBeInTheDocument()
    })
  })

  describe('엣지 케이스', () => {
    const basicResults: AnalysisResult = {
      method: '기술통계',
      statistic: 0,
      pValue: 1.0,
      interpretation: '기술통계 결과입니다.'
    }

    it('purpose가 빈 문자열이면 패널이 표시되지 않아야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: ''
      })

      render(<ResultsActionStep results={basicResults} />)

      expect(screen.queryByText('그룹 비교 결과')).not.toBeInTheDocument()
      expect(screen.queryByText('변수 간 관계 분석')).not.toBeInTheDocument()
      expect(screen.queryByText('예측 모델 결과')).not.toBeInTheDocument()
    })

    it('purpose가 매칭되지 않으면 패널이 표시되지 않아야 함', () => {
      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '데이터 탐색' // 어떤 패턴에도 매칭되지 않음
      })

      render(<ResultsActionStep results={basicResults} />)

      expect(screen.queryByText('그룹 비교 결과')).not.toBeInTheDocument()
      expect(screen.queryByText('변수 간 관계 분석')).not.toBeInTheDocument()
      expect(screen.queryByText('예측 모델 결과')).not.toBeInTheDocument()
    })

    it('그룹 비교 목적이지만 groupStats가 없으면 패널이 표시되지 않아야 함', () => {
      const resultsWithoutGroups = {
        ...basicResults,
        groupStats: []
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '그룹 비교'
      })

      render(<ResultsActionStep results={resultsWithoutGroups} />)

      expect(screen.queryByText('그룹 비교 결과')).not.toBeInTheDocument()
    })

    it('groupStats가 1개만 있으면 패널이 표시되지 않아야 함', () => {
      const resultsWithOneGroup = {
        ...basicResults,
        groupStats: [{ name: '그룹1', n: 25, mean: 85.5, std: 5.2 }]
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '그룹 비교'
      })

      render(<ResultsActionStep results={resultsWithOneGroup} />)

      expect(screen.queryByText('그룹 비교 결과')).not.toBeInTheDocument()
    })

    it('groupStats가 3개 이상이면 패널이 표시되지 않아야 함 (ANOVA 케이스)', () => {
      const resultsWithThreeGroups = {
        ...basicResults,
        groupStats: [
          { name: '그룹1', n: 25, mean: 85.5, std: 5.2 },
          { name: '그룹2', n: 25, mean: 78.3, std: 6.1 },
          { name: '그룹3', n: 25, mean: 82.1, std: 5.5 }
        ]
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '그룹 비교'
      })

      render(<ResultsActionStep results={resultsWithThreeGroups} />)

      expect(screen.queryByText('그룹 비교 결과')).not.toBeInTheDocument()
    })

    it('상관계수 r=0일 때 "뚜렷한 상관관계가 발견되지 않았습니다" 표시', () => {
      const zeroCorrelation = {
        method: '피어슨 상관분석',
        statistic: 0.05, // |r| < 0.1
        pValue: 0.8,
        interpretation: '상관관계 없음'
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '상관분석'
      })

      render(<ResultsActionStep results={zeroCorrelation} />)

      expect(screen.getByText(/뚜렷한 상관관계가 발견되지 않았습니다/)).toBeInTheDocument()
      expect(screen.getByText(/상관계수가 0에 가까워 실질적 관계가 거의 없습니다/)).toBeInTheDocument()
    })

    it('상관계수 r>1 클램핑 (비정상 입력 방어)', () => {
      const invalidCorrelation = {
        method: '피어슨 상관분석',
        statistic: 1.5, // 비정상 값
        pValue: 0.001,
        interpretation: '비정상 상관계수'
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '상관분석'
      })

      render(<ResultsActionStep results={invalidCorrelation} />)

      // r=1.5 → clamped to 1.0 → r²=100%
      const rTexts = screen.getAllByText(/r=1.000/)
      expect(rTexts.length).toBeGreaterThan(0)
      expect(screen.getByText(/100.0%가 Y 변동과 관련됩니다/)).toBeInTheDocument()
    })

    it('회귀분석: coefficients 없으면 패널 숨김', () => {
      const resultsWithoutCoef = {
        method: '선형회귀',
        statistic: 10.5,
        pValue: 0.01,
        additional: { rSquared: 0.65 },
        interpretation: '회귀 모델'
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '회귀분석'
      })

      render(<ResultsActionStep results={resultsWithoutCoef} />)

      expect(screen.queryByText('예측 모델 결과')).not.toBeInTheDocument()
    })

    it('회귀분석: R² 없으면 패널 숨김', () => {
      const resultsWithoutR2 = {
        method: '선형회귀',
        statistic: 10.5,
        pValue: 0.01,
        coefficients: [
          { name: '절편', value: 10.5, stdError: 2.1, tValue: 5.0, pvalue: 0.001 },
          { name: 'X', value: 2.34, stdError: 0.45, tValue: 5.2, pvalue: 0.001 }
        ],
        interpretation: '회귀 모델'
      }

      mockUseSmartFlowStore.mockReturnValue({
        ...defaultStore,
        analysisPurpose: '회귀분석'
      })

      render(<ResultsActionStep results={resultsWithoutR2} />)

      expect(screen.queryByText('예측 모델 결과')).not.toBeInTheDocument()
    })
  })
})
