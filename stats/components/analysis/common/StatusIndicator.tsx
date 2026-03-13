'use client'

import { CheckCircle2, AlertCircle, XCircle, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatusIndicatorProps {
  status: 'success' | 'warning' | 'error' | 'info' | 'pending'
  title: string
  description?: string
  className?: string
}

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-success-bg',
    border: 'border-success-border',
    iconColor: 'text-success',
    textColor: 'text-success-muted',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-warning-bg',
    border: 'border-warning-border',
    iconColor: 'text-warning',
    textColor: 'text-warning-muted',
  },
  error: {
    icon: XCircle,
    bg: 'bg-error-bg',
    border: 'border-error-border',
    iconColor: 'text-error',
    textColor: 'text-error-muted',
  },
  info: {
    icon: Info,
    bg: 'bg-info-bg',
    border: 'border-info-border',
    iconColor: 'text-info',
    textColor: 'text-info-muted',
  },
  pending: {
    icon: Loader2,
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    border: 'border-gray-200 dark:border-gray-800',
    iconColor: 'text-gray-500 dark:text-gray-400',
    textColor: 'text-gray-600 dark:text-gray-300',
  },
}

/**
 * Status Indicator
 *
 * Unified status banner for Smart Flow steps.
 *
 * Usage:
 * ```tsx
 * <StatusIndicator
 *   status="success"
 *   title="Analysis completed"
 *   description="Results are ready"
 * />
 * ```
 */
export function StatusIndicator({
  status,
  title,
  description,
  className
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div className={cn(
      'p-4 rounded-lg border flex items-center gap-3',
      config.bg,
      config.border,
      className
    )}>
      <Icon className={cn(
        'w-5 h-5 flex-shrink-0',
        config.iconColor,
        status === 'pending' && 'animate-spin'
      )} />
      <div>
        <span className={cn('font-medium', config.textColor)}>{title}</span>
        {description && (
          <p className={cn('text-sm mt-0.5', config.textColor, 'opacity-80')}>{description}</p>
        )}
      </div>
    </div>
  )
}
