'use client'

import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Circle,
  type LucideProps,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Status Icon Component
 *
 * Displays semantic status icons with muted, professional colors.
 */

export type StatusType = 'success' | 'error' | 'warning' | 'info' | 'neutral'

interface StatusIconProps extends Omit<LucideProps, 'ref'> {
  status: StatusType
  filled?: boolean
}

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  neutral: Circle,
}

const colorMap = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  neutral: 'text-muted-foreground',
}

export function StatusIcon({
  status,
  filled = false,
  className,
  ...props
}: StatusIconProps) {
  const Icon = iconMap[status]

  return (
    <Icon
      className={cn(
        colorMap[status],
        filled && status === 'success' && 'fill-success-bg',
        filled && status === 'error' && 'fill-error-bg',
        filled && status === 'warning' && 'fill-warning-bg',
        filled && status === 'info' && 'fill-info-bg',
        className
      )}
      {...props}
    />
  )
}

// Convenience exports for common use cases
export function SuccessIcon(props: Omit<StatusIconProps, 'status'>) {
  return <StatusIcon status="success" {...props} />
}

export function ErrorIcon(props: Omit<StatusIconProps, 'status'>) {
  return <StatusIcon status="error" {...props} />
}

export function WarningIcon(props: Omit<StatusIconProps, 'status'>) {
  return <StatusIcon status="warning" {...props} />
}

export function InfoIcon(props: Omit<StatusIconProps, 'status'>) {
  return <StatusIcon status="info" {...props} />
}
