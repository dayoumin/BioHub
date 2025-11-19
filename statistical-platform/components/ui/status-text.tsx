'use client'

import { cn } from '@/lib/utils'
import type { StatusType } from './status-icon'

/**
 * Status Text Component
 *
 * Displays text with semantic colors for status indication.
 */

interface StatusTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: StatusType
  children: React.ReactNode
  muted?: boolean
}

const colorMap = {
  success: 'text-success',
  error: 'text-error',
  warning: 'text-warning',
  info: 'text-info',
  neutral: 'text-muted-foreground',
}

const mutedColorMap = {
  success: 'text-success-muted',
  error: 'text-error-muted',
  warning: 'text-warning-muted',
  info: 'text-info-muted',
  neutral: 'text-muted-foreground',
}

export function StatusText({
  status,
  children,
  muted = false,
  className,
  ...props
}: StatusTextProps) {
  return (
    <span
      className={cn(muted ? mutedColorMap[status] : colorMap[status], className)}
      {...props}
    >
      {children}
    </span>
  )
}

// Convenience exports
export function SuccessText({ children, ...props }: Omit<StatusTextProps, 'status'>) {
  return <StatusText status="success" {...props}>{children}</StatusText>
}

export function ErrorText({ children, ...props }: Omit<StatusTextProps, 'status'>) {
  return <StatusText status="error" {...props}>{children}</StatusText>
}

export function WarningText({ children, ...props }: Omit<StatusTextProps, 'status'>) {
  return <StatusText status="warning" {...props}>{children}</StatusText>
}

export function InfoText({ children, ...props }: Omit<StatusTextProps, 'status'>) {
  return <StatusText status="info" {...props}>{children}</StatusText>
}
