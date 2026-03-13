'use client'

import { motion } from 'framer-motion'
import {
  BarChart3,
  Lightbulb,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { CollapsibleSection } from '@/components/analysis/common'
import { ConfidenceIntervalDisplay } from '@/components/statistics/common/ConfidenceIntervalDisplay'
import { EffectSizeCard } from '@/components/statistics/common/EffectSizeCard'
import { AssumptionTestCard, type AssumptionTest } from '@/components/statistics/common/AssumptionTestCard'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { MethodSpecificResults } from '@/components/analysis/steps/results/MethodSpecificResults'
import { ResultsVisualization } from '@/components/analysis/ResultsVisualization'
import type { AnalysisResult } from '@/types/analysis'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'

import { sectionRevealVariants } from './results-helpers'

export interface ResultsChartsSectionProps {
  results: AnalysisResult
  statisticalResult: StatisticalResult
  hasDetailedResults: boolean
  hasDiagnostics: boolean
  assumptionTests: AssumptionTest[]
  assumptionsPassed: boolean
  phase: number
  prefersReducedMotion: boolean
  detailedResultsOpen: boolean
  onDetailedResultsOpenChange: (open: boolean) => void
  diagnosticsOpen: boolean
  onDiagnosticsOpenChange: (open: boolean) => void
  t: {
    results: {
      sections: {
        detailedResults: string
        confidenceInterval: string
        diagnostics: string
        caution: string
        recommendations: string
        warnings: string
        alternatives: string
      }
    }
    analysis: {
      resultSections: { effectSizeDetail: string }
    }
  }
}

export function ResultsChartsSection({
  results,
  statisticalResult,
  hasDetailedResults,
  hasDiagnostics,
  assumptionTests,
  assumptionsPassed,
  phase,
  prefersReducedMotion,
  detailedResultsOpen,
  onDetailedResultsOpenChange,
  diagnosticsOpen,
  onDiagnosticsOpenChange,
  t,
}: ResultsChartsSectionProps): React.ReactElement {
  return (
    <div className={cn(
      "grid gap-4 items-start",
      hasDiagnostics ? "grid-cols-1 lg:grid-cols-[1.2fr_1fr]" : "grid-cols-1"
    )}>
      {/* ── 좌 컬럼: 차트 + L2 상세 ── */}
      <div className="space-y-4">
        {/* [Phase 3] 시각화 */}
        {(phase >= 3 || prefersReducedMotion) && (
          <motion.div
            variants={prefersReducedMotion ? undefined : sectionRevealVariants}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <ResultsVisualization results={results} />
          </motion.div>
        )}

        {/* [Phase 2] L2 상세 결과 */}
        {hasDetailedResults && (phase >= 2 || prefersReducedMotion) && (
          <motion.div
            variants={prefersReducedMotion ? undefined : sectionRevealVariants}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <Card className="overflow-hidden" data-testid="detailed-results-section">
              <CollapsibleSection
                label={t.results.sections.detailedResults}
                open={detailedResultsOpen}
                onOpenChange={onDetailedResultsOpenChange}
                contentClassName="pt-0 border-t border-border/10"
                icon={<BarChart3 className="h-3.5 w-3.5" />}
              >
                <div className="px-4 py-4 space-y-4">
                  {statisticalResult.confidenceInterval && (
                    <ConfidenceIntervalDisplay
                      label={t.results.sections.confidenceInterval}
                      lower={statisticalResult.confidenceInterval.lower}
                      upper={statisticalResult.confidenceInterval.upper}
                      estimate={statisticalResult.confidenceInterval.estimate}
                      level={Math.round((statisticalResult.confidenceInterval.level ?? 0.95) * 100)}
                      showVisualization
                      showInterpretation
                      className="border-0 shadow-none bg-transparent"
                    />
                  )}

                  {statisticalResult.effectSize && (
                    <EffectSizeCard
                      title={t.analysis.resultSections.effectSizeDetail}
                      value={statisticalResult.effectSize.value}
                      type={statisticalResult.effectSize.type}
                      showInterpretation
                      showVisualScale
                      className="border-0 shadow-none bg-transparent"
                    />
                  )}

                  {statisticalResult.additionalResults?.map((table, idx) => {
                    if (!Array.isArray(table.columns)) return null
                    return (
                      <StatisticsTable
                        key={idx}
                        title={table.title}
                        columns={table.columns.map((col: Record<string, unknown>) => ({
                          key: String(col.key ?? ''),
                          header: String(col.label ?? col.header ?? ''),
                        }))}
                        data={table.data}
                        compactMode
                        className="border-0 shadow-none"
                      />
                    )
                  })}

                  <MethodSpecificResults results={results} />
                </div>
              </CollapsibleSection>
            </Card>
          </motion.div>
        )}
      </div>

      {/* ── 우 컬럼: L3 진단 + 가정검정 (진단 있을 때만 렌더) ── */}
      {hasDiagnostics && (
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card className={cn(
            "overflow-hidden",
            !assumptionsPassed && "border-warning-border"
          )} data-testid="diagnostics-section">
            <CollapsibleSection
              label={t.results.sections.diagnostics}
              open={diagnosticsOpen}
              onOpenChange={onDiagnosticsOpenChange}
              contentClassName="pt-0 border-t border-border/10"
              icon={<Lightbulb className="h-3.5 w-3.5" />}
              badge={
                !assumptionsPassed ? (
                  <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 ml-1">
                    {t.results.sections.caution}
                  </Badge>
                ) : undefined
              }
            >
              <div className="px-4 py-4 space-y-4">
                {assumptionTests.length > 0 && (
                  <AssumptionTestCard
                    tests={assumptionTests}
                    testType={statisticalResult.testType}
                    showRecommendations
                    showDetails
                    className="border-0 shadow-none bg-transparent"
                  />
                )}

                {statisticalResult.recommendations && statisticalResult.recommendations.length > 0 && (
                  <div className="space-y-2" data-testid="recommendations-section">
                    <p className="text-sm font-medium flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-blue-600" />
                      {t.results.sections.recommendations}
                    </p>
                    <ul className="space-y-1.5">
                      {statisticalResult.recommendations.map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-3 h-3 mt-1 shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {statisticalResult.warnings && statisticalResult.warnings.length > 0 && (
                    <Alert variant="destructive" data-testid="warnings-section">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>{t.results.sections.warnings}</AlertTitle>
                      <AlertDescription>
                        <ul className="mt-1 space-y-1">
                          {statisticalResult.warnings.map((warning, idx) => (
                            <li key={idx} className="text-sm">{warning}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                {statisticalResult.alternatives && statisticalResult.alternatives.length > 0 &&
                  !statisticalResult.testType && (
                    <div className="space-y-2" data-testid="alternatives-section">
                      <p className="text-sm font-medium">{t.results.sections.alternatives}</p>
                      <div className="space-y-1.5">
                        {statisticalResult.alternatives.map((alt, idx) => (
                          <div key={idx} className={cn("p-2.5 rounded-lg border text-sm",
                            alt.action ? "hover:bg-muted/50 cursor-pointer transition-colors" : ""
                          )} onClick={alt.action}>
                            <span className="font-medium">{alt.name}</span>
                            <span className="text-muted-foreground ml-1.5">{alt.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </CollapsibleSection>
          </Card>
        </div>
      )}
    </div>
  )
}
