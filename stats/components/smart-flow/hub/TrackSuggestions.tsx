'use client'

/**
 * TrackSuggestions — 3트랙 제안 카드
 *
 * 직접 분석 / 데이터 상담 / 실험 설계
 * 카드 클릭 시 해당 example 텍스트를 ChatInput에 주입
 */

import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { Zap, MessageSquareText, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import type { AnalysisTrack } from '@/types/smart-flow'

// ===== Track Config =====

interface TrackConfig {
  track: AnalysisTrack
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
  {
    track: 'data-consultation',
    icon: MessageSquareText,
    colorClass: 'border-blue-200/60 hover:border-blue-300 dark:border-blue-800/40 dark:hover:border-blue-700',
    iconBgClass: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  },
  {
    track: 'experiment-design',
    icon: FlaskConical,
    colorClass: 'border-emerald-200/60 hover:border-emerald-300 dark:border-emerald-800/40 dark:hover:border-emerald-700',
    iconBgClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
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

  const trackTexts = {
    'direct-analysis': t.hub.tracks.directAnalysis,
    'data-consultation': t.hub.tracks.dataConsultation,
    'experiment-design': t.hub.tracks.experimentDesign,
  } as const

  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
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
    </motion.div>
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
        'hover:shadow-sm hover:bg-background/80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        colorClass
      )}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
    >
      <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', iconBgClass)}>
        <Icon className="w-4.5 h-4.5" />
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
