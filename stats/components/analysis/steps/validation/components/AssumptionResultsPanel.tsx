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
import { useTerminology } from '@/hooks/use-terminology'
import type { StatisticalAssumptions, ColumnStatistics } from '@/types/analysis'
import type { NormalityTestResult } from '../hooks'
import type { TerminologyDictionary } from '@/lib/terminology/terminology-types'

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
  const t = useTerminology()
  const vd = t.validationDetails.assumptions

  if (!assumptionResults?.summary) {
    return null
  }

  const { summary } = assumptionResults
  const violations = summary.violations ?? []

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-info-border">
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
              ? vd.parametricAvailable
              : vd.nonParametricRecommended}
          </h4>

          {/* Violations */}
          {violations.length > 0 && (
            <div className="mb-3 p-3 bg-warning-bg rounded-lg">
              <p className="text-sm font-medium text-warning-muted mb-2">
                {vd.violationsFound}
              </p>
              <ul className="text-sm space-y-1.5">
                {violations.map((violation: string, idx: number) => {
                  const { icon, detail } = getViolationDetails(
                    violation,
                    numericColumns,
                    normalityTests,
                    totalRows,
                    t
                  )

                  return (
                    <li key={idx} className="text-warning-muted">
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
              <p className="text-sm font-medium mb-2">{vd.recommendedMethods}</p>
              <div className="grid gap-2 text-sm">
                {summary.canUseParametric ? (
                  <ParametricMethods t={t} />
                ) : (
                  <NonParametricMethods t={t} />
                )}
              </div>
            </div>

            {/* Available Analyses */}
            <div className="flex flex-wrap gap-2">
              {numericColumns.length >= 2 && (
                <Badge variant="outline" className="text-xs">
                  {vd.badges.correlationAvailable}
                </Badge>
              )}
              {numericColumns.length >= 1 && categoricalColumns.length >= 1 && (
                <Badge variant="outline" className="text-xs">
                  {vd.badges.groupComparisonAvailable}
                </Badge>
              )}
              {numericColumns.length >= 1 && (
                <Badge variant="outline" className="text-xs">
                  {vd.badges.regressionAvailable}
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
  totalRows: number,
  t: TerminologyDictionary
): { icon: string; detail: string } {
  const vd = t.validationDetails.assumptions
  let icon = '📊'
  let detail = ''

  if (violation.includes(vd.violationKeywords.normality)) {
    icon = '📉'
    const failedVars = numericColumns
      .filter(col => normalityTests[col.name] && !normalityTests[col.name].summary?.isNormal)
      .map(col => col.name)
    if (failedVars.length > 0) {
      detail = ` (${failedVars.slice(0, 3).join(', ')}${failedVars.length > 3 ? vd.violationKeywords.etcSuffix : ''})`
    }
  } else if (violation.includes(vd.violationKeywords.homogeneity)) {
    icon = '📦'
    detail = ' (Levene test p < 0.05)'
  } else if (violation.includes(vd.violationKeywords.outlier)) {
    icon = '⚠️'
    const outlierVars = numericColumns
      .filter(col => col.outliers && col.outliers.length > col.numericCount * 0.1)
      .map(col => col.name)
    if (outlierVars.length > 0) {
      detail = ` (${outlierVars.slice(0, 2).join(', ')})`
    }
  } else if (violation.includes(vd.violationKeywords.sampleSize)) {
    icon = '📉'
    detail = ` (n = ${totalRows})`
  }

  return { icon, detail }
}

/**
 * 모수적 검정 방법 목록
 */
function ParametricMethods({ t }: { t: TerminologyDictionary }) {
  const vd = t.validationDetails.assumptions.parametricMethods
  return (
    <>
      <div className="flex items-start gap-2">
        <span className="text-success">✓</span>
        <span><strong>{vd.tTest.name}</strong>: {vd.tTest.description}</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-success">✓</span>
        <span><strong>{vd.anova.name}</strong>: {vd.anova.description}</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-success">✓</span>
        <span><strong>{vd.linearRegression.name}</strong>: {vd.linearRegression.description}</span>
      </div>
    </>
  )
}

/**
 * 비모수적 검정 방법 목록
 */
function NonParametricMethods({ t }: { t: TerminologyDictionary }) {
  const vd = t.validationDetails.assumptions.nonParametricMethods
  return (
    <>
      <div className="flex items-start gap-2">
        <span className="text-warning">✓</span>
        <span><strong>{vd.mannWhitney.name}</strong>: {vd.mannWhitney.description}</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-warning">✓</span>
        <span><strong>{vd.kruskalWallis.name}</strong>: {vd.kruskalWallis.description}</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-warning">✓</span>
        <span><strong>{vd.spearman.name}</strong>: {vd.spearman.description}</span>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-warning">✓</span>
        <span><strong>{vd.robustRegression.name}</strong>: {vd.robustRegression.description}</span>
      </div>
    </>
  )
}
