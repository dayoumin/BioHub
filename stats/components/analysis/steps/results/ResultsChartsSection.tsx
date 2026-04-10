'use client'

import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { CollapsibleSection } from '@/components/analysis/common'
import { StatisticsTable } from '@/components/statistics/common/StatisticsTable'
import { MethodSpecificResults } from '@/components/analysis/steps/results/MethodSpecificResults'
import type { AnalysisResult } from '@/types/analysis'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'

import { sectionRevealVariants } from './results-helpers'

export interface ResultsChartsSectionProps {
  results: AnalysisResult
  statisticalResult: StatisticalResult
  hasDetailedResults: boolean
  phase: number
  prefersReducedMotion: boolean
  detailedResultsOpen: boolean
  onDetailedResultsOpenChange: (open: boolean) => void
  t: {
    results: {
      sections: {
        detailedResults: string
      }
    }
  }
}

/**
 * 결과 페이지 L2 상세 섹션
 * - 추가 통계 테이블 + 방법별 상세 결과만 표시
 * - CI/효과크기는 StatsCards에서 충분히 표시되므로 여기서는 제외
 */
export function ResultsChartsSection({
  results,
  statisticalResult,
  hasDetailedResults,
  phase,
  prefersReducedMotion,
  detailedResultsOpen,
  onDetailedResultsOpenChange,
  t,
}: ResultsChartsSectionProps): React.ReactElement {
  if (!hasDetailedResults || (phase < 2 && !prefersReducedMotion)) {
    return <></>
  }

  return (
    <motion.div
      variants={prefersReducedMotion ? undefined : sectionRevealVariants}
      initial={prefersReducedMotion ? undefined : 'hidden'}
      animate={prefersReducedMotion ? undefined : 'visible'}
    >
      <Card className="overflow-hidden border border-border/40 bg-surface-container-lowest" data-testid="detailed-results-section">
        <CollapsibleSection
          label={t.results.sections.detailedResults}
          open={detailedResultsOpen}
          onOpenChange={onDetailedResultsOpenChange}
          contentClassName="pt-0 bg-surface-container/20"
          icon={<BarChart3 className="h-3.5 w-3.5" />}
        >
          <div className="px-4 py-4 space-y-4">
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
  )
}
