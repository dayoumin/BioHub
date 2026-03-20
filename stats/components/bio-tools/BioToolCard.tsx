'use client'

import Link from 'next/link'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { actionCardBase, iconContainerMuted } from '@/components/common/card-styles'
import type { BioTool } from '@/lib/bio-tools/bio-tool-registry'
import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'

interface BioToolCardProps {
  tool: BioTool
}

export function BioToolCard({ tool }: BioToolCardProps): React.ReactElement {
  const isPinned = usePinnedToolsStore((s) => s.pinnedIds.includes(tool.id))
  const togglePin = usePinnedToolsStore((s) => s.togglePin)

  const disabled = tool.status === 'coming-soon'

  const handlePinClick = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    togglePin(tool.id)
  }

  const Icon = tool.icon

  const card = (
    <div
      className={cn(
        actionCardBase,
        'min-h-[120px] cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed hover:border-border hover:shadow-none',
      )}
    >
      {/* 핀 토글 */}
      {!disabled && (
        <button
          onClick={handlePinClick}
          className="absolute top-2 left-2 p-1 rounded-md hover:bg-muted transition-colors"
          aria-label={isPinned ? '핀 해제' : '핀 고정'}
        >
          <Star
            className={cn(
              'w-3.5 h-3.5 transition-colors',
              isPinned ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/40',
            )}
          />
        </button>
      )}

      {/* 뱃지 */}
      {disabled && (
        <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground/60 font-medium">
          준비 중
        </span>
      )}

      <div className={iconContainerMuted}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="text-sm font-medium text-center leading-tight">{tool.nameEn}</span>
      <span className="text-xs text-muted-foreground text-center">{tool.nameKo}</span>
    </div>
  )

  if (disabled) return card

  return (
    <Link href={`/bio-tools/${tool.id}`} className="block">
      {card}
    </Link>
  )
}
