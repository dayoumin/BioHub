'use client'

import { memo } from 'react'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
  HelpCircle,
  type LucideIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'neutral'
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface StatusIconProps {
  /** Status type determines icon and color */
  status: StatusType
  /** Icon size preset */
  size?: IconSize
  /** Additional CSS classes */
  className?: string
  /** Show with text label */
  showLabel?: boolean
  /** Custom label text (overrides default) */
  label?: string
}

/** Status configuration mapping */
const STATUS_CONFIG: Record<StatusType, {
  icon: LucideIcon
  colorClass: string
  defaultLabel: string
  animate?: boolean
}> = {
  success: {
    icon: CheckCircle2,
    colorClass: 'text-success',
    defaultLabel: '성공'
  },
  error: {
    icon: XCircle,
    colorClass: 'text-destructive',
    defaultLabel: '오류'
  },
  warning: {
    icon: AlertTriangle,
    colorClass: 'text-warning',
    defaultLabel: '경고'
  },
  info: {
    icon: Info,
    colorClass: 'text-info',
    defaultLabel: '정보'
  },
  loading: {
    icon: Loader2,
    colorClass: 'text-primary',
    defaultLabel: '로딩 중',
    animate: true
  },
  neutral: {
    icon: HelpCircle,
    colorClass: 'text-muted-foreground',
    defaultLabel: ''
  }
}

/** Size presets */
const SIZE_CLASSES: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
}

/**
 * StatusIcon - Standardized status indicator component
 *
 * @example
 * // Basic usage
 * <StatusIcon status="success" />
 *
 * @example
 * // With size
 * <StatusIcon status="error" size="lg" />
 *
 * @example
 * // With label
 * <StatusIcon status="warning" showLabel />
 *
 * @example
 * // Custom label
 * <StatusIcon status="info" showLabel label="참고" />
 */
export const StatusIcon = memo(function StatusIcon({
  status,
  size = 'sm',
  className,
  showLabel = false,
  label
}: StatusIconProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  const sizeClass = SIZE_CLASSES[size]
  const displayLabel = label ?? config.defaultLabel

  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Icon
        className={cn(
          sizeClass,
          config.colorClass,
          config.animate && 'animate-spin'
        )}
      />
      {showLabel && displayLabel && (
        <span className={cn('text-sm', config.colorClass)}>
          {displayLabel}
        </span>
      )}
    </span>
  )
})

/**
 * Get icon component for a status
 * Useful when you need just the icon without the wrapper
 */
export function getStatusIcon(status: StatusType): LucideIcon {
  return STATUS_CONFIG[status].icon
}

/**
 * Get color class for a status
 */
export function getStatusColor(status: StatusType): string {
  return STATUS_CONFIG[status].colorClass
}

export default StatusIcon