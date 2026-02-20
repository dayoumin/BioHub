'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * Status Badge Component
 *
 * Displays semantic status with muted, professional colors
 * that harmonize with the monochrome design system.
 */

const statusBadgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        success: 'bg-success-bg text-success border border-success-border',
        error: 'bg-error-bg text-error border border-error-border',
        warning: 'bg-warning-bg text-warning border border-warning-border',
        info: 'bg-info-bg text-info border border-info-border',
        neutral: 'bg-muted text-muted-foreground border border-border',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        default: 'px-2 py-1 text-xs',
        lg: 'px-2.5 py-1.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  }
)

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  children: React.ReactNode
}

export function StatusBadge({
  className,
  variant,
  size,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ variant, size, className }))}
      {...props}
    >
      {children}
    </span>
  )
}

// Convenience exports for common use cases
export function SuccessBadge({ children, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="success" {...props}>{children}</StatusBadge>
}

export function ErrorBadge({ children, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="error" {...props}>{children}</StatusBadge>
}

export function WarningBadge({ children, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="warning" {...props}>{children}</StatusBadge>
}

export function InfoBadge({ children, ...props }: Omit<StatusBadgeProps, 'variant'>) {
  return <StatusBadge variant="info" {...props}>{children}</StatusBadge>
}
