'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export interface AnalysisButtonProps {
  /** Whether analysis is currently running */
  isAnalyzing: boolean
  /** Text to show when not analyzing (default: '분석 실행') */
  label?: string
  /** Text to show while analyzing (default: '분석 중...') */
  analyzingLabel?: string
  /** Additional disabled condition besides isAnalyzing */
  canAnalyze?: boolean
  /** Button size (default: 'lg') */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Button variant */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  /** Custom class name */
  className?: string
  /** Disabled state */
  disabled?: boolean
  /** Click handler */
  onClick?: () => void
}

/**
 * Common analysis button component for statistics pages
 *
 * Provides consistent UI for analysis execution across all 43 statistics pages.
 * Automatically handles loading state with spinner animation.
 *
 * @example
 * <AnalysisButton
 *   isAnalyzing={isAnalyzing}
 *   canAnalyze={!!selectedVariables}
 *   onClick={handleAnalysis}
 * />
 *
 * @example
 * <AnalysisButton
 *   isAnalyzing={isAnalyzing}
 *   canAnalyze={canRunAnalysis}
 *   onClick={handleAnalysis}
 *   label="t-검정 실행"
 *   analyzingLabel="검정 중..."
 * />
 */
export function AnalysisButton({
  isAnalyzing,
  label = '분석 실행',
  analyzingLabel = '분석 중...',
  canAnalyze = true,
  size = 'lg',
  variant = 'default',
  className = '',
  disabled,
  onClick
}: AnalysisButtonProps) {
  const isDisabled = disabled || isAnalyzing || !canAnalyze

  return (
    <Button
      size={size}
      variant={variant}
      disabled={isDisabled}
      onClick={onClick}
      className={className}
    >
      {isAnalyzing && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      )}
      {isAnalyzing ? analyzingLabel : label}
    </Button>
  )
}
