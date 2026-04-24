'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatisticCard } from '@/components/analysis/common'
import type { StatisticalResult } from '@/components/statistics/common/StatisticalResultCard'
import type { ResultsText } from '@/lib/terminology'
import {
  formatEffectSizeSymbol,
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
      buttons: {
        copy: string
        copied: string
        copyStatsTable: string
      }
      clipboard: {
        itemHeader: string
        valueHeader: string
        statistic: (name: string) => string
        df: string
        effectSize: string
        confidenceInterval: string
      }
      toast: {
        copySuccess: string
        copyError: string
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
  const [isCopied, setIsCopied] = useState(false)
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current)
      }
    }
  }, [])

  const handleCopyStatsTable = useCallback(async () => {
    const rows = [
      {
        label: t.results.statistics.statistic,
        value: `${statisticalResult.statisticName || 't'} = ${Number(statisticalResult.statistic).toFixed(4)}`,
      },
      {
        label: t.results.statistics.pValue,
        value: `p ${formatPValue(statisticalResult.pValue)}`,
      },
      {
        label: t.results.statistics.effectSize,
        value: statisticalResult.effectSize
          ? `${formatEffectSizeSymbol(statisticalResult.effectSize.type)} = ${statisticalResult.effectSize.value.toFixed(4)} (${getEffectSizeInterpretation(statisticalResult.effectSize.value, statisticalResult.effectSize.type, t.results.effectSizeLabels)})`
          : '-',
      },
      {
        label: t.results.statistics.confidenceInterval,
        value: statisticalResult.confidenceInterval
          ? `[${statisticalResult.confidenceInterval.lower.toFixed(3)}, ${statisticalResult.confidenceInterval.upper.toFixed(3)}]`
          : '-',
      },
    ]

    const plainText = [
      t.results.buttons.copyStatsTable,
      ...rows.map(row => `${row.label}\t${row.value}`),
      statisticalResult.df !== undefined
        ? `${t.results.clipboard.df}\t${Array.isArray(statisticalResult.df) ? statisticalResult.df.join(', ') : statisticalResult.df}`
        : null,
    ].filter(Boolean).join('\n')

    const html = [
      '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">',
      `<thead><tr style="background:#f3f4f6"><th>${t.results.clipboard.itemHeader}</th><th>${t.results.clipboard.valueHeader}</th></tr></thead>`,
      '<tbody>',
      ...rows.map(row => `<tr><td>${row.label}</td><td>${row.value}</td></tr>`),
      statisticalResult.df !== undefined
        ? `<tr><td>${t.results.clipboard.df}</td><td>${Array.isArray(statisticalResult.df) ? statisticalResult.df.join(', ') : statisticalResult.df}</td></tr>`
        : '',
      '</tbody>',
      '</table>',
    ].join('')

    try {
      if (typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([plainText], { type: 'text/plain' }),
          }),
        ])
      } else {
        await navigator.clipboard.writeText(plainText)
      }

      setIsCopied(true)
      toast.success(t.results.toast.copySuccess)
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current)
      copiedTimeoutRef.current = setTimeout(() => {
        setIsCopied(false)
        copiedTimeoutRef.current = null
      }, 2000)
    } catch {
      toast.error(t.results.toast.copyError)
    }
  }, [statisticalResult, t])

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { void handleCopyStatsTable() }}
          className={cn('h-8 gap-1.5 text-xs text-muted-foreground', isCopied && 'text-primary')}
          data-testid="copy-stats-table-btn"
        >
          {isCopied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {isCopied ? t.results.buttons.copied : t.results.buttons.copyStatsTable}
        </Button>
      </div>

      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 will-change-transform"
        variants={prefersReducedMotion ? undefined : statsContainerVariants}
        initial="hidden"
        animate={phase >= 1 || prefersReducedMotion ? 'visible' : 'hidden'}
      >
        <motion.div variants={prefersReducedMotion ? undefined : statsItemVariants}>
          <StatisticCard label={t.results.statistics.statistic} tooltip={t.results.statistics.statisticTooltip}>
            <p className="text-xl font-bold font-mono tabular-nums tracking-tight">
              {statisticalResult.statisticName || 't'} = {statisticDisplay}
            </p>
            {statisticalResult.df !== undefined && (
              <p className="text-[11px] text-muted-foreground/60 mt-1 font-mono tabular-nums">
                df = {Array.isArray(statisticalResult.df) ? statisticalResult.df.join(', ') : statisticalResult.df}
              </p>
            )}
          </StatisticCard>
        </motion.div>

        <motion.div variants={prefersReducedMotion ? undefined : statsItemVariants}>
          <StatisticCard label={t.results.statistics.pValue} tooltip={t.results.statistics.pValueTooltip}>
            <p className={cn(
              "text-xl font-bold font-mono tabular-nums tracking-tight",
              isSignificant ? "text-success" : "text-muted-foreground"
            )}>
              p {formatPValue(statisticalResult.pValue)}
            </p>
            <Badge variant={isSignificant ? "default" : "secondary"} className="mt-1.5 text-[10px]">
              {isSignificant ? t.results.statistics.significant : t.results.statistics.notSignificant}
            </Badge>
          </StatisticCard>
        </motion.div>

        <motion.div variants={prefersReducedMotion ? undefined : statsItemVariants}>
          <StatisticCard label={t.results.statistics.effectSize} tooltip={t.results.statistics.effectSizeTooltip}>
            {statisticalResult.effectSize ? (
              <>
                <p className="text-xl font-bold font-mono tabular-nums tracking-tight">{effectSizeDisplay}</p>
                <Badge variant="outline" className="mt-1.5 text-[10px] border-0 bg-surface-container-high/50">
                  {getEffectSizeInterpretation(statisticalResult.effectSize.value, statisticalResult.effectSize.type, t.results.effectSizeLabels)}
                </Badge>
              </>
            ) : (
              <p className="text-xl font-bold text-muted-foreground/40 tracking-tight">-</p>
            )}
          </StatisticCard>
        </motion.div>

        <motion.div variants={prefersReducedMotion ? undefined : statsItemVariants}>
          <StatisticCard label={t.results.statistics.confidenceInterval} tooltip={t.results.statistics.confidenceIntervalTooltip}>
            {statisticalResult.confidenceInterval ? (
              <p className="text-xl font-bold font-mono tabular-nums tracking-tight leading-tight">
                [{statisticalResult.confidenceInterval.lower.toFixed(3)}, {statisticalResult.confidenceInterval.upper.toFixed(3)}]
              </p>
            ) : (
              <p className="text-xl font-bold text-muted-foreground/40 tracking-tight">-</p>
            )}
          </StatisticCard>
        </motion.div>
      </motion.div>
    </div>
  )
}
