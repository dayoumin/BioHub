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
    <div className={cn("flex items-center gap-3", className)}>
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="text-xl font-semibold">{title}</h2>
      {badge && (
        <Badge variant={badge.variant || 'secondary'} className="ml-auto">
          {badge.label}
        </Badge>
      )}
      {action && !badge && (
        <div className="ml-auto">{action}</div>
      )}
      {action && badge && (
        <div className="ml-2">{action}</div>
      )}
    </div>
  )
}
