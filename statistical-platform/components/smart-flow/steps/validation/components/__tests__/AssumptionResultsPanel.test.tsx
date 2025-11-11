/**
 * AssumptionResultsPanel - Unit Tests
 *
 * @description
 * 통계적 가정 검정 결과 패널 컴포넌트 테스트
 */

import { render, screen } from '@testing-library/react'
import { AssumptionResultsPanel } from '../AssumptionResultsPanel'
import type { StatisticalAssumptions, ColumnStatistics } from '@/types/smart-flow'
import type { NormalityTestResult } from '../../hooks'

describe('AssumptionResultsPanel', () => {
  const mockNumericColumns: ColumnStatistics[] = [
    {
      name: 'height',
      type: 'numeric',
      numericCount: 100,
      textCount: 0,
      missingCount: 0,
      uniqueValues: 100,
      mean: 170,
      median: 168,
      std: 10,
      min: 150,
      max: 190,
      outliers: []
    },
    {
      name: 'weight',
      type: 'numeric',
      numericCount: 100,
      textCount: 0,
      missingCount: 0,
      uniqueValues: 100,
      mean: 70,
      median: 68,
      std: 8,
      min: 50,
      max: 90,
      outliers: [95, 96, 97]
    }
  ]

  const mockCategoricalColumns: ColumnStatistics[] = [
    {
      name: 'gender',
      type: 'categorical',
      numericCount: 0,
      textCount: 100,
      missingCount: 0,
      uniqueValues: 2,
      topCategories: [
        { value: 'M', count: 60 },
        { value: 'F', count: 40 }
      ]
    }
  ]

  const mockNormalityTests: Record<string, NormalityTestResult> = {
    height: {
      shapiroWilk: { statistic: 0.98, pValue: 0.15, isNormal: true },
      summary: { totalTests: 1, passedTests: 1, isNormal: true }
    },
    weight: {
      shapiroWilk: { statistic: 0.92, pValue: 0.01, isNormal: false },
      summary: { totalTests: 1, passedTests: 0, isNormal: false }
    }
  }

  describe('렌더링', () => {
    it('assumptionResults가 null이면 아무것도 렌더링하지 않음', () => {
      const { container } = render(
        <AssumptionResultsPanel
          assumptionResults={null}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('assumptionResults.summary가 없으면 아무것도 렌더링하지 않음', () => {
      const { container } = render(
        <AssumptionResultsPanel
          assumptionResults={{} as StatisticalAssumptions}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('모수적 검정 가능 시 "모수적 검정 사용 가능" 메시지 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: true,
          recommendation: 'parametric',
          canUseParametric: true,
          reasons: [],
          recommendations: []
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/모수적 검정 사용 가능/)).toBeInTheDocument()
    })

    it('비모수적 검정 권장 시 "비모수적 검정 권장" 메시지 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: false,
          recommendation: 'non-parametric',
          canUseParametric: false,
          reasons: ['정규성 위반'],
          recommendations: ['Mann-Whitney U'],
          violations: ['정규성 위반']
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/비모수적 검정 권장/)).toBeInTheDocument()
    })
  })

  describe('가정 위반 표시', () => {
    it('violations가 있으면 위반 사항 목록 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: false,
          recommendation: 'non-parametric',
          canUseParametric: false,
          reasons: ['정규성 위반', '이상치 존재'],
          recommendations: [],
          violations: ['정규성 위반', '이상치 10% 초과']
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/발견된 가정 위반/)).toBeInTheDocument()
      expect(screen.getByText(/정규성 위반/)).toBeInTheDocument()
      expect(screen.getByText(/이상치 10% 초과/)).toBeInTheDocument()
    })

    it('정규성 위반 시 실패한 변수명 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: false,
          recommendation: 'non-parametric',
          canUseParametric: false,
          reasons: [],
          recommendations: [],
          violations: ['정규성 위반']
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      // weight가 정규성 실패했으므로 상세 정보에 포함되어야 함
      expect(screen.getByText(/정규성 위반/)).toBeInTheDocument()
    })

    it('이상치 위반 시 변수명 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: false,
          recommendation: 'non-parametric',
          canUseParametric: false,
          reasons: [],
          recommendations: [],
          violations: ['이상치 존재']
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/이상치 존재/)).toBeInTheDocument()
    })
  })

  describe('권장 분석 방법', () => {
    it('모수적 검정 가능 시 t-검정, ANOVA, 선형 회귀 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: true,
          recommendation: 'parametric',
          canUseParametric: true,
          reasons: [],
          recommendations: []
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/권장 분석 방법/)).toBeInTheDocument()
      expect(screen.getByText(/t-검정/)).toBeInTheDocument()
      expect(screen.getByText(/ANOVA/)).toBeInTheDocument()
      expect(screen.getByText(/선형 회귀/)).toBeInTheDocument()
    })

    it('비모수적 검정 권장 시 Mann-Whitney, Kruskal-Wallis, Spearman 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: false,
          recommendation: 'non-parametric',
          canUseParametric: false,
          reasons: [],
          recommendations: []
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/Mann-Whitney U/)).toBeInTheDocument()
      expect(screen.getByText(/Kruskal-Wallis/)).toBeInTheDocument()
      expect(screen.getByText(/Spearman 상관/)).toBeInTheDocument()
      expect(screen.getByText(/로버스트 회귀/)).toBeInTheDocument()
    })
  })

  describe('가능한 분석 배지', () => {
    it('수치형 변수 2개 이상이면 "상관분석 가능" 배지 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: true,
          recommendation: 'parametric',
          canUseParametric: true,
          reasons: [],
          recommendations: []
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/상관분석 가능/)).toBeInTheDocument()
    })

    it('수치형 1개 + 범주형 1개 이상이면 "그룹 비교 가능" 배지 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: true,
          recommendation: 'parametric',
          canUseParametric: true,
          reasons: [],
          recommendations: []
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={mockCategoricalColumns}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/그룹 비교 가능/)).toBeInTheDocument()
    })

    it('수치형 변수 1개 이상이면 "회귀분석 가능" 배지 표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: true,
          recommendation: 'parametric',
          canUseParametric: true,
          reasons: [],
          recommendations: []
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={mockNumericColumns}
          categoricalColumns={[]}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.getByText(/회귀분석 가능/)).toBeInTheDocument()
    })

    it('수치형 변수 1개만 있으면 "상관분석 가능" 배지 미표시', () => {
      const assumptionResults: StatisticalAssumptions = {
        summary: {
          meetsAssumptions: true,
          recommendation: 'parametric',
          canUseParametric: true,
          reasons: [],
          recommendations: []
        }
      }

      render(
        <AssumptionResultsPanel
          assumptionResults={assumptionResults}
          numericColumns={[mockNumericColumns[0]]}
          categoricalColumns={[]}
          normalityTests={mockNormalityTests}
          totalRows={100}
        />
      )

      expect(screen.queryByText(/상관분석 가능/)).not.toBeInTheDocument()
    })
  })
})
