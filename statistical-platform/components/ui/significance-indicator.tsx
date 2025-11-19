'use client'

import { cn } from '@/lib/utils'
import { StatusIcon } from './status-icon'

/**
 * Significance Indicator Component
 *
 * Displays statistical significance with appropriate semantic colors.
 * - p < 0.01: Highly significant (deeper muted rose)
 * - p < 0.05: Significant (muted rose)
 * - p >= 0.05: Not significant (muted sage)
 */

interface SignificanceIndicatorProps {
  pValue: number
  alpha?: number
  showIcon?: boolean
  showLabel?: boolean
  className?: string
}

export function SignificanceIndicator({
  pValue,
  alpha = 0.05,
  showIcon = true,
  showLabel = true,
  className,
}: SignificanceIndicatorProps) {
  const isHighlySignificant = pValue < 0.01
  const isSignificant = pValue < alpha

  const colorClass = isHighlySignificant
    ? 'text-stat-highly-significant'
    : isSignificant
      ? 'text-stat-significant'
      : 'text-stat-non-significant'

  const label = isHighlySignificant
    ? 'Highly Significant'
    : isSignificant
      ? 'Significant'
      : 'Not Significant'

  const status = isSignificant ? 'error' : 'success'

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {showIcon && <StatusIcon status={status} className={cn('h-4 w-4', colorClass)} />}
      {showLabel && <span className={cn('text-sm font-medium', colorClass)}>{label}</span>}
    </span>
  )
}

/**
 * P-Value Display Component
 *
 * Displays a p-value with appropriate formatting and color.
 */
interface PValueDisplayProps {
  value: number
  alpha?: number
  precision?: number
  className?: string
}

export function PValueDisplay({
  value,
  alpha = 0.05,
  precision = 4,
  className,
}: PValueDisplayProps) {
  const isHighlySignificant = value < 0.01
  const isSignificant = value < alpha

  const colorClass = isHighlySignificant
    ? 'text-stat-highly-significant'
    : isSignificant
      ? 'text-stat-significant'
      : 'text-stat-non-significant'

  const formattedValue = value < 0.001 ? '< 0.001' : value.toFixed(precision)

  return (
    <span className={cn('font-mono', colorClass, className)}>
      {formattedValue}
      {isHighlySignificant && ' **'}
      {isSignificant && !isHighlySignificant && ' *'}
    </span>
  )
}
