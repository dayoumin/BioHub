/**
 * Assumption Results Panel Component
 *
 * @description
 * 통계적 가정 검정 결과를 시각화하는 패널 컴포넌트
 * - 모수적/비모수적 검정 권장 사항
 * - 가정 위반 사항 상세 표시
 * - 권장 분석 방법 제시
 */

'use client'

import { memo } from 'react'
import { CheckCircle2, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { StatisticalAssumptions, ColumnStatistics } from '@/types/smart-flow'
import type { NormalityTestResult } from '../hooks'

export interface AssumptionResultsPanelProps {
  /** 통계적 가정 검정 결과 */
  assumptionResults: StatisticalAssumptions | null
  /** 수치형 컬럼 통계 */
  numericColumns: ColumnStatistics[]
  /** 범주형 컬럼 통계 */
  categoricalColumns: ColumnStatistics[]
  /** 정규성 검정 결과 */
  normalityTests: Record<string, NormalityTestResult>
  /** 전체 행 수 */
  totalRows: number
}

export const AssumptionResultsPanel = memo(function AssumptionResultsPanel({
  assumptionResults,
  numericColumns,
  categoricalColumns,
  normalityTests,
  totalRows
}: AssumptionResultsPanelProps) {
  if (!assumptionResults?.summary) {
    return null
  }

  const { summary } = assumptionResults
  const violations = summary.violations ?? []

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-1 p-2 rounded-full ${
          summary.canUseParametric
            ? 'bg-success-bg'
            : 'bg-warning-bg'
        }`}>
          {summary.canUseParametric ? (
            <CheckCircle2 className="w-5 h-5 text-success" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-warning" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* Title */}
          <h4 className="font-semibold text-base mb-2">
            {summary.canUseParametric
              ? '🎉 모수적 검정 사용 가능'
              : '⚠️ 비모수적 검정 권장'}
          </h4>

          {/* Violations */}
          {violations.length > 0 && (
            <div className="mb-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">
                🔍 발견된 가정 위반:
              </p>
              <ul className="text-sm space-y-1.5">
                {violations.map((violation: string, idx: number) => {
                  const { icon, detail } = getViolationDetails(
                    violation,
                    numericColumns,
                    normalityTests,
                    totalRows
                  )

                  return (
                    <li key={idx} className="text-amber-800 dark:text-amber-200">
                      {icon} {violation}{detail}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Recommended Methods */}
          <div className="space-y-3">
            <div className="p-3 bg-white/70 dark:bg-gray-900/30 rounded-lg">
              <p className="text-sm font-medium mb-2">🎯 권장 분석 방법:</p>
              <div className="grid gap-2 text-sm">
                {summary.canUseParametric ? (
                  <ParametricMethods />
                ) : (
                  <NonParametricMethods />
                )}
              </div>
            </div>

            {/* Available Analyses */}
            <div className="flex flex-wrap gap-2">
              {numericColumns.length >= 2 && (
                <Badge variant="outline" className="text-xs">
                  📊 상관분석 가능
                </Badge>
              )}
              {numericColumns.length >= 1 && categoricalColumns.length >= 1 && (
                <Badge variant="outline" className="text-xs">
                  📋 그룹 비교 가능
                </Badge>
              )}
              {numericColumns.length >= 1 && (
                <Badge variant="outline" className="text-xs">
                  📈 회귀분석 가능
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

/**
 * 가정 위반 상세 정보 생성
 */
function getViolationDetails(
  violation: string,
  numericColumns: ColumnStatistics[],
  normalityTests: Record<string, NormalityTestResult>,
  totalRows: number
): { icon: string; detail: string } {
  let icon = '📊'
  let detail = ''

  if (violation.includes('정규성')) {
    icon = '📉'
    const failedVars = numericColumns
      .filter(col => normalityTests[col.name] && !normalityTests[col.name].summary?.isNormal)
      .map(col => col.name)
    if (failedVars.length > 0) {
      detail = ` (${failedVars.slice(0, 3).join(', ')}${failedVars.length > 3 ? ' 등' : ''})`
    }
  } else if (violation.includes('등분산')) {
    icon = '📦'
    detail = ' (Levene test p < 0.05)'
  } else if (violation.includes('이상치')) {
    icon = '⚠️'
    const outlierVars = numericColumns
      .filter(col => col.outliers && col.outliers.length > col.numericCount * 0.1)
      .map(col => col.name)
    if (outlierVars.length > 0) {
      detail = ` (${outlierVars.slice(0, 2).join(', ')})`
    }
  } else if (violation.includes('표본')) {
    icon = '📉'
    detail = ` (n = ${totalRows})`
  }

  return { icon, detail }
}

/**
 * 모수적 검정 방법 목록
 */
function ParametricMethods() {
  return (
    <>
      <div className="flex items-start gap-2">
        <span className="text-success">✓</span>
        <span><strong>t-검정</strong>: 두 그룹 평균 비교</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-success">✓</span>
        <span><strong>ANOVA</strong>: 세 그룹 이상 평균 비교</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-success">✓</span>
        <span><strong>선형 회귀</strong>: 예측 및 관계 분석</span>
      </div>
    </>
  )
}

/**
 * 비모수적 검정 방법 목록
 */
function NonParametricMethods() {
  return (
    <>
      <div className="flex items-start gap-2">
        <span className="text-amber-600">✓</span>
        <span><strong>Mann-Whitney U</strong>: t-검정 대체</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-amber-600">✓</span>
        <span><strong>Kruskal-Wallis</strong>: ANOVA 대체</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-amber-600">✓</span>
        <span><strong>Spearman 상관</strong>: Pearson 대체</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-amber-600">✓</span>
        <span><strong>로버스트 회귀</strong>: 이상치에 강건</span>
      </div>
    </>
  )
}
