'use client'

import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, XCircle, HelpCircle } from 'lucide-react'
import { useTerminology } from '@/hooks/use-terminology'
import type { FitScoreLevelText } from '@/lib/terminology/terminology-types'

interface FitScoreIndicatorProps {
  /** 0-100 score */
  score: number
  /** Show compact version (no label text) */
  compact?: boolean
  className?: string
}

type FitLevel = 'excellent' | 'good' | 'caution' | 'poor' | 'unknown'

interface FitStyle {
  level: FitLevel
  colorClass: string
  bgClass: string
  barClass: string
  icon: React.ReactNode
}

/**
 * Convert numeric score to fit level style (no text - text comes from terminology)
 */
function getFitStyle(score: number): FitStyle {
  if (score >= 85) {
    return {
      level: 'excellent',
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      barClass: 'bg-green-500',
      icon: <CheckCircle2 className="w-4 h-4" />
    }
  }
  if (score >= 70) {
    return {
      level: 'good',
      colorClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-100 dark:bg-blue-900/30',
      barClass: 'bg-blue-500',
      icon: <CheckCircle2 className="w-4 h-4" />
    }
  }
  if (score >= 50) {
    return {
      level: 'caution',
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      barClass: 'bg-amber-500',
      icon: <AlertCircle className="w-4 h-4" />
    }
  }
  if (score > 0) {
    return {
      level: 'poor',
      colorClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      barClass: 'bg-red-500',
      icon: <XCircle className="w-4 h-4" />
    }
  }
  return {
    level: 'unknown',
    colorClass: 'text-muted-foreground',
    bgClass: 'bg-muted',
    barClass: 'bg-muted-foreground',
    icon: <HelpCircle className="w-4 h-4" />
  }
}

// Legacy FitConfig for backward compatibility (getFitLevel export)
interface FitConfig {
  level: FitLevel
  label: string
  shortLabel: string
  description: string
  colorClass: string
  bgClass: string
  barClass: string
  icon: React.ReactNode
}

// Default text fallback (for getFitLevel utility that can't use hooks)
const DEFAULT_LEVEL_TEXT: Record<FitLevel, FitScoreLevelText> = {
  excellent: { label: 'Excellent Fit', shortLabel: 'Optimal', description: 'Highly suitable for your data' },
  good: { label: 'Good Fit', shortLabel: 'Good', description: 'Works well with your data' },
  caution: { label: 'Use with Caution', shortLabel: 'Caution', description: 'Some conditions are not met' },
  poor: { label: 'Poor Fit', shortLabel: 'Poor', description: 'Consider alternative methods' },
  unknown: { label: 'Cannot Evaluate', shortLabel: 'Unknown', description: 'Insufficient data information' },
}

/**
 * FitScoreIndicator - displays data-method compatibility
 */
export function FitScoreIndicator({
  score,
  compact = false,
  className
}: FitScoreIndicatorProps) {
  const t = useTerminology()
  const style = getFitStyle(score)
  const text = t.fitScore.levels[style.level]
  const clampedScore = Math.max(0, Math.min(100, score))

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium", style.bgClass, style.colorClass)}>
          {style.icon}
          <span>{text.shortLabel}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {/* Progress bar with label */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", style.barClass)}
            style={{ width: `${clampedScore}%` }}
          />
        </div>
        <div className={cn("flex items-center gap-1 text-sm font-medium whitespace-nowrap", style.colorClass)}>
          {style.icon}
          <span>{text.label}</span>
        </div>
      </div>

      {/* Description text */}
      <p className={cn("text-xs", style.colorClass)}>
        {text.description}
      </p>
    </div>
  )
}

/**
 * Utility function to get fit level info (for use in other components)
 * Note: Uses default text since it can't access terminology hooks
 */
export function getFitLevel(score: number): FitConfig {
  const style = getFitStyle(score)
  const text = DEFAULT_LEVEL_TEXT[style.level]
  return { ...style, ...text }
}

/**
 * FitScoreBadge - minimal inline badge version
 */
export function FitScoreBadge({
  score,
  className
}: {
  score: number
  className?: string
}) {
  const t = useTerminology()
  const style = getFitStyle(score)
  const text = t.fitScore.levels[style.level]

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
      style.bgClass,
      style.colorClass,
      className
    )}>
      {style.icon}
      {text.shortLabel}
    </span>
  )
}
