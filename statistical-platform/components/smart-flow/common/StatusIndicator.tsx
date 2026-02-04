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
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    iconColor: 'text-green-600 dark:text-green-400',
    textColor: 'text-green-800 dark:text-green-200',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    iconColor: 'text-amber-600 dark:text-amber-400',
    textColor: 'text-amber-800 dark:text-amber-200',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    iconColor: 'text-red-600 dark:text-red-400',
    textColor: 'text-red-800 dark:text-red-200',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-800 dark:text-blue-200',
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
