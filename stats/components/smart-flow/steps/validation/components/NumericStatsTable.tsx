/**
 * Numeric Statistics Table Component
 *
 * @description
 * 수치형 변수의 상세 통계를 표 형식으로 표시하는 컴포넌트
 * - 기술통계량 (평균, 중앙값, 표준편차 등)
 * - 분포 특성 (왜도, 첨도)
 * - 이상치 정보
 * - 문제 해결 가이드
 */

'use client'

import { memo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTerminology } from '@/hooks/use-terminology'
import type { ColumnStatistics } from '@/types/smart-flow'
import { STEP_STYLES } from '@/components/smart-flow/common/style-constants'

export interface NumericStatsTableProps {
  /** 컬럼 통계 (수치형만 필터링됨) */
  columnStats: ColumnStatistics[]
}

export const NumericStatsTable = memo(function NumericStatsTable({
  columnStats
}: NumericStatsTableProps) {
  const t = useTerminology()
  const vd = t.validationDetails.numericStats
  const numericStats = columnStats.filter(s => s.type === 'numeric')

  if (numericStats.length === 0) {
    return null
  }

  const hasProblems = numericStats.some(s =>
    Math.abs(s.skewness || 0) >= 1 ||
    Math.abs(s.kurtosis || 0) >= 3 ||
    (s.outliers && s.outliers.length > s.numericCount * 0.1)
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vd.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Statistics Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className={`text-left ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.variableName}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.mean}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.median}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.stdDev}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.cv}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.skewness}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.kurtosis}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.min}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.max}</th>
                <th className={`text-right ${STEP_STYLES.tableHeaderCell}`}>{vd.headers.outliers}</th>
              </tr>
            </thead>
            <tbody>
              {numericStats.map((stat, idx) => (
                <tr key={idx} className="border-b hover:bg-muted/50">
                  <td className={`${STEP_STYLES.tableBodyCell} font-medium`}>{stat.name}</td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>{stat.mean?.toFixed(2)}</td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>{stat.median?.toFixed(2)}</td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>{stat.std?.toFixed(2)}</td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>
                    {stat.cv !== undefined ? stat.cv.toFixed(1) : '-'}
                  </td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>
                    {stat.skewness !== undefined ? (
                      <span className={getSkewnessColor(stat.skewness)}>
                        {stat.skewness.toFixed(2)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>
                    {stat.kurtosis !== undefined ? (
                      <span className={getKurtosisColor(stat.kurtosis)}>
                        {stat.kurtosis.toFixed(2)}
                      </span>
                    ) : '-'}
                  </td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>{stat.min?.toFixed(2)}</td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>{stat.max?.toFixed(2)}</td>
                  <td className={`text-right ${STEP_STYLES.tableBodyCell}`}>
                    {stat.outliers?.length || 0}
                    {stat.outliers && stat.outliers.length > 0 && (
                      <span className="text-xs text-orange-600 ml-1">
                        ({((stat.outliers.length / stat.numericCount) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Statistics Explanation */}
        <div className="mt-4 p-3 bg-muted/30 rounded-lg text-xs space-y-1">
          <p><strong>{vd.explanation.cvLabel}</strong>: {vd.explanation.cvDescription}</p>
          <p>
            <strong>{vd.explanation.skewnessLabel}</strong>:
            <span className="text-success ml-2">{vd.explanation.skewnessNormal}</span>
            <span className="text-warning ml-2">{vd.explanation.skewnessModerate}</span>
            <span className="text-error ml-2">{vd.explanation.skewnessSevere}</span>
          </p>
          <p>
            <strong>{vd.explanation.kurtosisLabel}</strong>:
            <span className="text-success ml-2">{vd.explanation.kurtosisNormal}</span>
            <span className="text-warning ml-2">{vd.explanation.kurtosisModerate}</span>
            <span className="text-error ml-2">{vd.explanation.kurtosisSevere}</span>
          </p>
        </div>

        {/* Problem Solving Guide */}
        {hasProblems && (
          <div className="mt-4 p-4 bg-warning-bg rounded-lg border border-warning-border">
            <div className="flex items-start gap-2 mb-3">
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5" />
              <h4 className="text-sm font-semibold text-warning-muted">
                {vd.problemGuide.title}
              </h4>
            </div>

            <div className="space-y-3 text-xs">
              {/* Skewness Problems */}
              {numericStats.some(s => Math.abs(s.skewness || 0) >= 1) && (
                <div className="border-l-2 border-warning-border pl-3">
                  <p className="font-semibold text-warning-muted mb-1">
                    {vd.problemGuide.skewnessTitle}
                  </p>
                  <ul className="space-y-1 text-warning-muted">
                    <li>{vd.problemGuide.skewnessPositive}</li>
                    <li>{vd.problemGuide.skewnessNegative}</li>
                    <li>{vd.problemGuide.skewnessAlternative}</li>
                  </ul>
                </div>
              )}

              {/* Kurtosis Problems */}
              {numericStats.some(s => Math.abs(s.kurtosis || 0) >= 3) && (
                <div className="border-l-2 border-warning-border pl-3">
                  <p className="font-semibold text-warning-muted mb-1">
                    {vd.problemGuide.kurtosisTitle}
                  </p>
                  <ul className="space-y-1 text-warning-muted">
                    <li>{vd.problemGuide.kurtosisHigh}</li>
                    <li>{vd.problemGuide.kurtosisLow}</li>
                    <li>{vd.problemGuide.kurtosisAlternative}</li>
                  </ul>
                </div>
              )}

              {/* Outlier Problems */}
              {numericStats.some(s => s.outliers && s.outliers.length > s.numericCount * 0.1) && (
                <div className="border-l-2 border-warning-border pl-3">
                  <p className="font-semibold text-warning-muted mb-1">
                    {vd.problemGuide.outlierTitle}
                  </p>
                  <ul className="space-y-1 text-warning-muted">
                    <li>{vd.problemGuide.outlierIdentify}</li>
                    <li>{vd.problemGuide.outlierTreatment}</li>
                    <li>{vd.problemGuide.outlierAlternative}</li>
                  </ul>
                </div>
              )}

              {/* General Recommendations */}
              <div className="mt-3 p-2 bg-info-bg rounded">
                <p className="text-info-muted font-medium mb-1">{vd.problemGuide.generalTitle}</p>
                <ul className="space-y-1 text-info-muted">
                  <li>{vd.problemGuide.generalCompare}</li>
                  <li>{vd.problemGuide.generalNonParametric}</li>
                  <li>{vd.problemGuide.generalPreserveOriginal}</li>
                  <li>{vd.problemGuide.generalCLT}</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})

/**
 * 왜도 값에 따른 색상 클래스 반환
 */
function getSkewnessColor(skewness: number): string {
  const abs = Math.abs(skewness)
  if (abs < 0.5) return 'text-success'
  if (abs < 1) return 'text-warning'
  return 'text-error'
}

/**
 * 첨도 값에 따른 색상 클래스 반환
 */
function getKurtosisColor(kurtosis: number): string {
  const abs = Math.abs(kurtosis)
  if (abs < 1) return 'text-success'
  if (abs < 3) return 'text-warning'
  return 'text-error'
}
