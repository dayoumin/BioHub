'use client'

/**
 * TrackSuggestions — 트랙 제안 카드 (3종)
 *
 * - 직접 분석: 예시 텍스트를 ChatInput에 주입
 * - 표본 크기 계산기: 실험 설계용 팝업 계산기 (모달)
 * - 데이터 시각화: /graph-studio로 직접 이동 (Link)
 */

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Zap, BarChart2, ChevronRight, Calculator } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import type { AnalysisTrack } from '@/types/smart-flow'
import { SampleSizeModal } from './SampleSizeModal'

// ===== Track Config =====

interface TrackConfig {
  track: 'direct-analysis'
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
  iconBgClass: string
}

const TRACK_CONFIGS: TrackConfig[] = [
  {
    track: 'direct-analysis',
    icon: Zap,
    colorClass: 'border-amber-200/60 hover:border-amber-300 dark:border-amber-800/40 dark:hover:border-amber-700',
    iconBgClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  },
]

// ===== Props =====

interface TrackSuggestionsProps {
  onTrackSelect: (track: AnalysisTrack, example: string) => void
}

// ===== Component =====

export function TrackSuggestions({ onTrackSelect }: TrackSuggestionsProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const [sampleSizeOpen, setSampleSizeOpen] = useState(false)

  const trackTexts = {
    'direct-analysis': t.hub.tracks.directAnalysis,
  } as const

  const handleOpenSampleSize = useCallback(() => {
    setSampleSizeOpen(true)
  }, [])

  const handleCloseSampleSize = useCallback(() => {
    setSampleSizeOpen(false)
  }, [])

  return (
    <>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3"
        initial={prefersReducedMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* 직접 분석 */}
        {TRACK_CONFIGS.map((config, index) => {
          const text = trackTexts[config.track]
          const Icon = config.icon
          return (
            <TrackCard
              key={config.track}
              track={config.track}
              icon={Icon}
              title={text.title}
              description={text.description}
              example={text.example}
              colorClass={config.colorClass}
              iconBgClass={config.iconBgClass}
              index={index}
              prefersReducedMotion={prefersReducedMotion}
              onSelect={onTrackSelect}
            />
          )
        })}

        {/* 표본 크기 계산기 — 모달 팝업 */}
        <SampleSizeCard
          index={1}
          prefersReducedMotion={prefersReducedMotion}
          onClick={handleOpenSampleSize}
        />

        {/* 데이터 시각화 — /graph-studio 직접 이동 */}
        {/* ChevronRight: 외부 링크(ArrowUpRight)가 아닌 앱 내 페이지 이동임을 명시 */}
        <VisualizationCard index={2} prefersReducedMotion={prefersReducedMotion} />
      </motion.div>

      <SampleSizeModal open={sampleSizeOpen} onClose={handleCloseSampleSize} />
    </>
  )
}

// ===== TrackCard =====

interface TrackCardProps {
  track: AnalysisTrack
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  example: string
  colorClass: string
  iconBgClass: string
  index: number
  prefersReducedMotion: boolean
  onSelect: (track: AnalysisTrack, example: string) => void
}

function TrackCard({
  track,
  icon: Icon,
  title,
  description,
  example,
  colorClass,
  iconBgClass,
  index,
  prefersReducedMotion,
  onSelect,
}: TrackCardProps) {
  const handleClick = useCallback(() => {
    onSelect(track, example)
  }, [track, example, onSelect])

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex flex-col items-start gap-3 p-4 rounded-xl border bg-background/60',
        'text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'hover:shadow-sm hover:bg-background/80',
        colorClass
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
    >
      <div className="flex items-center justify-between w-full">
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBgClass)}>
          <Icon className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{description}</div>
      </div>
      <div className="text-xs text-muted-foreground/60 italic">
        &quot;{example}&quot;
      </div>
    </motion.button>
  )
}

// ===== SampleSizeCard =====

interface SampleSizeCardProps {
  index: number
  prefersReducedMotion: boolean
  onClick: () => void
}

function SampleSizeCard({ index, prefersReducedMotion, onClick }: SampleSizeCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      data-testid="hub-sample-size-card"
      className={cn(
        'flex flex-col items-start gap-3 p-4 rounded-xl border bg-background/60',
        'text-left transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'hover:shadow-sm hover:bg-background/80',
        'border-teal-200/60 hover:border-teal-300 dark:border-teal-800/40 dark:hover:border-teal-700',
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
    >
      <div className="flex items-center justify-between w-full">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
          <Calculator className="w-4.5 h-4.5" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="font-medium text-sm">표본 크기 계산기</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          실험 전 필요 표본 수 사전 계산.
        </div>
      </div>
      <div className="text-xs text-muted-foreground/60 italic">
        t-검정 · ANOVA · 상관 · 비율 비교
      </div>
    </motion.button>
  )
}

// ===== VisualizationCard =====
// 통계 트랙과 달리 ChatInput 주입 없이 /graph-studio로 직접 이동.

interface VisualizationCardProps {
  index: number
  prefersReducedMotion: boolean
}

function VisualizationCard({ index, prefersReducedMotion }: VisualizationCardProps) {
  return (
    <motion.div
      className="h-full"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
    >
      <Link
        href="/graph-studio"
        data-testid="hub-visualization-card"
        className={cn(
          'flex flex-col items-start gap-3 p-4 rounded-xl border bg-background/60',
          'transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'hover:shadow-sm hover:bg-background/80 active:opacity-80',
          'border-violet-200/60 hover:border-violet-300 dark:border-violet-800/40 dark:hover:border-violet-700',
          'block h-full',
        )}
      >
        <div className="flex items-center justify-between w-full">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
            <BarChart2 className="w-4.5 h-4.5" />
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
        </div>
        <div className="space-y-1">
          <div className="font-medium text-sm">데이터 시각화</div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            CSV 바로 업로드, 논문급 차트 제작.
          </div>
        </div>
        <div className="text-xs text-muted-foreground/60 italic">
          막대 · 선 · 산점도 · 박스플롯 · 히트맵
        </div>
      </Link>
    </motion.div>
  )
}
