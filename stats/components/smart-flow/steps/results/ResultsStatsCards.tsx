'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { StatisticCard } from '@/components/smart-flow/common'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import type { ResultsText } from '@/lib/terminology/terminology-types'

// ===== Animation Variants =====
const statsContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

const statsItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } }
}

// 효과크기 해석 (L1 배지용 — 지역화 레이블 사용)
function getEffectSizeInterpretation(value: number, type: string | undefined, labels: ResultsText['effectSizeLabels']): string {
  const absValue = Math.abs(value)
  switch (type) {
    case 'cohensD':
      if (absValue < 0.2) return labels.small
      if (absValue < 0.5) return labels.medium
      if (absValue < 0.8) return labels.large
      return labels.veryLarge
    case 'etaSquared':
      if (absValue < 0.01) return labels.small
      if (absValue < 0.06) return labels.medium
      if (absValue < 0.14) return labels.large
      return labels.veryLarge
    case 'r':
    case 'phi':
    case 'cramersV':
      if (absValue < 0.1) return labels.small
      if (absValue < 0.3) return labels.medium
      if (absValue < 0.5) return labels.large
      return labels.veryLarge
    default:
      if (absValue < 0.2) return labels.small
      if (absValue < 0.5) return labels.medium
      if (absValue < 0.8) return labels.large
      return labels.veryLarge
  }
}

// p-value 포맷팅
function formatPValue(p: number): string {
  if (p == null || isNaN(p)) return '-'
  if (p < 0.001) return '< .001'
  if (p < 0.01) return '< .01'
  if (p < 0.05) return '< .05'
  return p.toFixed(3)
}

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
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
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
