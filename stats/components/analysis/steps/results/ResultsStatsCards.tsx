'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { StatisticCard } from '@/components/analysis/common'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import type { ResultsText } from '@/lib/terminology/terminology-types'
import {
  statsContainerVariants,
  statsItemVariants,
  getEffectSizeInterpretation,
  formatPValue,
} from './results-helpers'

export interface ResultsStatsCardsProps {
  statisticalResult: StatisticalResult
  isSignificant: boolean
  statisticDisplay: number | string
  effectSizeDisplay: number | string
  phase: number
  prefersReducedMotion: boolean
  t: {
    results: {
      statistics: {
        statistic: string
        statisticTooltip: string
        pValue: string
        pValueTooltip: string
        effectSize: string
        effectSizeTooltip: string
        confidenceInterval: string
        confidenceIntervalTooltip: string
        significant: string
        notSignificant: string
      }
      effectSizeLabels: ResultsText['effectSizeLabels']
    }
  }
}

export function ResultsStatsCards({
  statisticalResult,
  isSignificant,
  statisticDisplay,
  effectSizeDisplay,
  phase,
  prefersReducedMotion,
  t,
}: ResultsStatsCardsProps): React.ReactElement {
  return (
    <motion.div
      className="grid grid-cols-2 lg:grid-cols-4 gap-3 will-change-transform"
      variants={prefersReducedMotion ? undefined : statsContainerVariants}
      initial="hidden"
      animate={phase >= 1 || prefersReducedMotion ? 'visible' : 'hidden'}
    >
      <motion.div variants={prefersReducedMotion ? undefined : statsItemVariants}>
        <StatisticCard label={t.results.statistics.statistic} tooltip={t.results.statistics.statisticTooltip}>
          <p className="text-lg font-bold font-mono tabular-nums">
            {statisticalResult.statisticName || 't'} = {statisticDisplay}
          </p>
          {statisticalResult.df !== undefined && (
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono tabular-nums">
              df = {Array.isArray(statisticalResult.df) ? statisticalResult.df.join(', ') : statisticalResult.df}
            </p>
          )}
        </StatisticCard>
      </motion.div>

      <motion.div variants={prefersReducedMotion ? undefined : statsItemVariants}>
        <StatisticCard label={t.results.statistics.pValue} tooltip={t.results.statistics.pValueTooltip}>
          <p className={cn(
            "text-lg font-bold font-mono tabular-nums",
            isSignificant ? "text-success" : "text-muted-foreground"
          )}>
            p {formatPValue(statisticalResult.pValue)}
          </p>
          <Badge variant={isSignificant ? "default" : "secondary"} className="mt-0.5 text-[10px]">
            {isSignificant ? t.results.statistics.significant : t.results.statistics.notSignificant}
          </Badge>
        </StatisticCard>
      </motion.div>

      <motion.div variants={prefersReducedMotion ? undefined : statsItemVariants}>
        <StatisticCard label={t.results.statistics.effectSize} tooltip={t.results.statistics.effectSizeTooltip}>
          {statisticalResult.effectSize ? (
            <>
              <p className="text-lg font-bold font-mono tabular-nums">{effectSizeDisplay}</p>
              <Badge variant="outline" className="mt-0.5 text-[10px]">
                {getEffectSizeInterpretation(statisticalResult.effectSize.value, statisticalResult.effectSize.type, t.results.effectSizeLabels)}
              </Badge>
            </>
          ) : (
            <p className="text-lg font-bold text-muted-foreground">-</p>
          )}
        </StatisticCard>
      </motion.div>

      <motion.div variants={prefersReducedMotion ? undefined : statsItemVariants}>
        <StatisticCard label={t.results.statistics.confidenceInterval} tooltip={t.results.statistics.confidenceIntervalTooltip}>
          {statisticalResult.confidenceInterval ? (
            <p className="text-lg font-bold font-mono tabular-nums leading-tight">
              [{statisticalResult.confidenceInterval.lower.toFixed(3)}, {statisticalResult.confidenceInterval.upper.toFixed(3)}]
            </p>
          ) : (
            <p className="text-lg font-bold text-muted-foreground">-</p>
          )}
        </StatisticCard>
      </motion.div>
    </motion.div>
  )
}
