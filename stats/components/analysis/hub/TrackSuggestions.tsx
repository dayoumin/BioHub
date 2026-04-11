'use client'

/**
 * TrackSuggestions - quick start action shortcuts.
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BarChart2, Calculator, Upload, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { actionCardBase, iconContainerMuted, iconContainerPrimary } from '@/components/common/card-styles'
import { SampleSizeModal } from './SampleSizeModal'

const BADGE_BASE = 'inline-flex items-center rounded-full px-2 py-1 text-[10px] font-medium'
const BADGE_MUTED = cn(BADGE_BASE, 'bg-muted text-muted-foreground')
const BADGE_ANALYSIS_STYLE = {
  background: 'color-mix(in oklch, var(--section-accent-analysis) 12%, transparent)',
  color: 'var(--section-accent-analysis)',
} as const
const BADGE_GRAPH_STYLE = {
  background: 'color-mix(in oklch, var(--section-accent-graph) 12%, transparent)',
  color: 'var(--section-accent-graph)',
} as const

interface TrackSuggestionsProps {
  onStartAnalysis?: (example: string) => void
  onUploadClick?: () => void
  showHeader?: boolean
  showUploadCard?: boolean
  variant?: 'grid' | 'dock'
}

export function TrackSuggestions({
  onStartAnalysis,
  onUploadClick,
  showHeader = true,
  showUploadCard = true,
  variant = 'grid',
}: TrackSuggestionsProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const [sampleSizeOpen, setSampleSizeOpen] = useState(false)

  const handleOpenSampleSize = useCallback((): void => {
    setSampleSizeOpen(true)
  }, [])

  const handleCloseSampleSize = useCallback((): void => {
    setSampleSizeOpen(false)
  }, [])

  const isDock = variant === 'dock'
  const containerClassName = isDock
    ? 'mx-auto flex w-full max-w-[640px] flex-wrap items-start justify-center gap-3.5'
    : cn(
        'gap-3',
        showUploadCard ? 'grid grid-cols-2 md:grid-cols-4' : 'grid grid-cols-1 md:grid-cols-3',
      )
  const actionClassName = isDock
    ? cn(
        'h-auto min-h-0 min-w-[92px] basis-[96px] rounded-[22px] border-0 bg-transparent px-2 py-0 shadow-none',
        'hover:bg-transparent',
      )
    : 'min-h-[120px] items-start justify-between px-4 py-4'
  const linkClassName = isDock
    ? cn(
        'flex h-auto min-h-0 min-w-[92px] basis-[96px] flex-col items-center justify-start gap-2 rounded-[22px] px-2 py-0',
        'transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
      )
    : cn(actionCardBase, 'h-full min-h-[128px] items-start justify-between px-4 py-4')
  const iconClassName = isDock ? 'h-12 w-12 rounded-full' : undefined
  const contentClassName = isDock ? 'w-full text-center' : 'w-full text-left'
  const labelClassName = isDock
    ? 'block text-center text-[12px] font-medium leading-4 text-foreground/80'
    : 'block font-medium text-sm'

  return (
    <>
      <div>
        {showHeader && <h2 className="mb-3 text-lg font-bold">{t.hub.quickStart.title}</h2>}
        <motion.div
          className={containerClassName}
          initial={prefersReducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {showUploadCard && (
            <motion.button
              type="button"
              onClick={onUploadClick}
              data-testid="hub-upload-btn"
              className={cn(actionCardBase, actionClassName)}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="flex w-full items-start justify-between gap-3">
                <div className={cn(iconContainerPrimary, iconClassName)}>
                  <Upload className="h-5 w-5" aria-hidden="true" />
                </div>
                {!isDock && (
                  <span className={BADGE_BASE} style={BADGE_ANALYSIS_STYLE}>
                    {t.hub.quickStart.badges.analysis}
                  </span>
                )}
              </div>
              <div className={contentClassName}>
                <span className={labelClassName}>{t.hub.quickStart.uploadData}</span>
                {!isDock && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    분석에 필요한 데이터를 불러옵니다.
                  </span>
                )}
              </div>
            </motion.button>
          )}

          <motion.button
            type="button"
            onClick={handleOpenSampleSize}
            data-testid="hub-sample-size-card"
            className={cn(actionCardBase, actionClassName)}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: showUploadCard ? 0.38 : 0.3 }}
          >
            <div className="flex w-full items-start justify-between gap-3">
              <div className={cn(iconContainerMuted, iconClassName)}>
                <Calculator className="h-5 w-5" aria-hidden="true" />
              </div>
              {!isDock && <span className={BADGE_MUTED}>{t.hub.quickStart.badges.tool}</span>}
            </div>
            <div className={contentClassName}>
              <span className={labelClassName}>{t.hub.quickStart.sampleSize}</span>
              {!isDock && (
                <span className="mt-1 block text-xs text-muted-foreground">
                  실험 설계 전 필요한 표본 수를 계산합니다.
                </span>
              )}
            </div>
          </motion.button>

          <motion.div
            className="h-full"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: showUploadCard ? 0.46 : 0.38 }}
          >
            <Link href="/graph-studio" data-testid="hub-visualization-card" className={linkClassName}>
              <div className="flex w-full items-start justify-between gap-3">
                <div className={cn(iconContainerMuted, iconClassName)}>
                  <BarChart2 className="h-5 w-5" aria-hidden="true" />
                </div>
                {!isDock && (
                  <span className={BADGE_BASE} style={BADGE_GRAPH_STYLE}>
                    Graph Studio
                  </span>
                )}
              </div>
              <div className={contentClassName}>
                <span className={labelClassName}>{t.hub.quickStart.visualization}</span>
                {!isDock && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    데이터를 차트로 빠르게 탐색하고 편집합니다.
                  </span>
                )}
              </div>
            </Link>
          </motion.div>

          <motion.div
            className="h-full"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: showUploadCard ? 0.54 : 0.46 }}
          >
            <Link href="/bio-tools" data-testid="hub-biotools-card" className={linkClassName}>
              <div className="flex w-full items-start justify-between gap-3">
                <div className={cn(iconContainerMuted, iconClassName)}>
                  <FlaskConical className="h-5 w-5" aria-hidden="true" />
                </div>
                {!isDock && <span className={BADGE_MUTED}>Bio-Tools</span>}
              </div>
              <div className={contentClassName}>
                <span className={labelClassName}>{t.hub.quickStart.bioTools}</span>
                {!isDock && (
                  <span className="mt-1 block text-xs text-muted-foreground">
                    분석 전후에 쓰는 보조 생물정보 도구를 엽니다.
                  </span>
                )}
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      <SampleSizeModal open={sampleSizeOpen} onClose={handleCloseSampleSize} onStartAnalysis={onStartAnalysis} />
    </>
  )
}
