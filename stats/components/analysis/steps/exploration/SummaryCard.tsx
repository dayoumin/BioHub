'use client'

import { memo } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { focusRing } from '@/components/common/card-styles'
import type { LucideIcon } from 'lucide-react'

export type CardId = 'overview' | 'descriptive' | 'distribution' | 'correlation'

interface SummaryCardProps {
  id: CardId
  icon: LucideIcon
  title: string
  selected: boolean
  /** 카드 본문 — 요약 정보를 children으로 전달 */
  children: React.ReactNode
  /** hidden이면 렌더링 안 함, secondary이면 흐리게 */
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
        'relative cursor-pointer transition-all duration-200 p-3',
        focusRing,
        'hover:border-primary/40 hover:shadow-sm',
        selected && 'ring-2 ring-primary focus-visible:ring-primary border-primary shadow-sm',
        !selected && 'border-border/40',
        disabled && 'opacity-40 cursor-not-allowed',
        visibility === 'secondary' && 'opacity-60',
      )}
    >
      {/* 선택 인디케이터 */}
      {selected && (
        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-primary/10 border-b border-r border-primary" />
      )}

      <div className="flex items-start gap-2.5">
        <div className={cn(
          'p-1.5 rounded-md shrink-0',
          selected ? 'bg-primary/15' : 'bg-muted/60',
        )}>
          <Icon className={cn(
            'h-3.5 w-3.5',
            selected ? 'text-primary' : 'text-muted-foreground',
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-xs font-medium leading-none mb-1.5',
            selected ? 'text-primary' : 'text-foreground',
          )}>
            {title}
          </p>
          <div className="text-[11px] text-muted-foreground leading-relaxed space-y-0.5">
            {children}
          </div>
        </div>
      </div>
    </Card>
  )
})
