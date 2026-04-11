'use client'

import { memo } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import type { LucideIcon } from 'lucide-react'

export type CardId = 'overview' | 'descriptive' | 'distribution' | 'visualization' | 'correlation'

interface SummaryCardProps {
  id: CardId
  icon: LucideIcon
  title: string
  selected: boolean
  children: React.ReactNode
  visibility?: 'primary' | 'secondary' | 'hidden'
  disabled?: boolean
  onClick: (id: CardId) => void
}

export const SummaryCard = memo(function SummaryCard({
  id,
  icon: Icon,
  title,
  selected,
  children,
  visibility = 'primary',
  disabled = false,
  onClick,
}: SummaryCardProps) {
  if (visibility === 'hidden') return null

  return (
    <Card
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      aria-disabled={disabled}
      onClick={() => !disabled && onClick(id)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick(id)
        }
      }}
      className={cn(
        'relative h-full min-h-[102px] cursor-pointer p-3.5 transition-all duration-200',
        focusRing,
        'hover:border-border/70 hover:bg-surface-container-low/35',
        selected && 'ring-2 ring-primary focus-visible:ring-primary border-primary bg-surface-container-low/25',
        !selected && 'border-border/40',
        disabled && 'cursor-not-allowed opacity-40',
        visibility === 'secondary' && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'shrink-0 rounded-md p-1.5',
            selected ? 'bg-primary/15' : 'bg-muted/60',
          )}
        >
          <Icon
            className={cn(
              'h-3.5 w-3.5',
              selected ? 'text-primary' : 'text-muted-foreground',
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'mb-1.5 text-xs font-medium leading-none',
              selected ? 'text-primary' : 'text-foreground',
            )}
          >
            {title}
          </p>
          <div className="space-y-0.5 text-[11px] leading-relaxed text-muted-foreground">
            {children}
          </div>
        </div>
      </div>
    </Card>
  )
})
