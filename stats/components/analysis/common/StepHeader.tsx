'use client'

import { type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export interface StepHeaderProps {
  icon: LucideIcon
  title: string
  badge?: {
    label: string
    variant?: 'default' | 'secondary' | 'outline'
  }
  action?: ReactNode
  className?: string
}

/**
 * Smart Flow Step Header
 *
 * Pattern: Icon (5x5) + Title (h2) + Badge (optional) + Action (optional)
 *
 * Usage:
 * ```tsx
 * <StepHeader
 *   icon={Settings2}
 *   title="Variable Selection"
 *   badge={{ label: "T-Test", variant: "secondary" }}
 * />
 * ```
 */
export function StepHeader({
  icon: Icon,
  title,
  badge,
  action,
  className
}: StepHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8 flex-shrink-0">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {badge && (
            <Badge variant={badge.variant || 'secondary'}>
              {badge.label}
            </Badge>
          )}
        </div>
      </div>
      {action && (
        <div className="flex items-center flex-shrink-0">{action}</div>
      )}
    </div>
  )
}
