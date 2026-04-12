'use client'

import { memo } from 'react'
import Link from 'next/link'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { actionCardBioBase, focusRingBio } from '@/components/common/card-styles'
import type { BioTool } from '@/lib/bio-tools/bio-tool-registry'
import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'
import { BIO_ICON_BG, BIO_ICON_COLOR } from './bio-styles'

interface BioToolCardProps {
  tool: BioTool
  /** 워크스페이스 모드: 클릭 시 Link 대신 콜백 호출 */
  onSelect?: (toolId: string) => void
}

export const BioToolCard = memo(function BioToolCard({ tool, onSelect }: BioToolCardProps): React.ReactElement {
  const isPinned = usePinnedToolsStore((s) => s.pinnedIds.includes(tool.id))
  const togglePin = usePinnedToolsStore((s) => s.togglePin)

  const disabled = tool.status === 'coming-soon'

  const handlePinClick = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    togglePin(tool.id)
  }

  const Icon = tool.icon
  const cardContent = (
    <>
      {/* 뱃지 */}
      {disabled && (
        <span className="absolute top-2 right-2 text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground/60 font-medium">
          준비 중
        </span>
      )}

      <div
        className="rounded-full p-2.5 transition-colors duration-200 group-hover:bg-surface-container-high/70"
        style={BIO_ICON_BG}
      >
        <Icon className="w-5 h-5" style={BIO_ICON_COLOR} />
      </div>
      <span className="text-sm font-medium text-center leading-tight">{tool.nameEn}</span>
      <span className="text-xs text-muted-foreground text-center">{tool.nameKo}</span>
      <span className="text-[11px] text-muted-foreground/60 text-center leading-snug line-clamp-2 px-1">
        {tool.description}
      </span>
    </>
  )

  if (disabled) {
    return (
      <div
        className={cn(
          actionCardBioBase,
          'min-h-[140px] cursor-not-allowed opacity-50 hover:bg-surface-container-lowest',
        )}
      >
        {cardContent}
      </div>
    )
  }

  if (onSelect) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => onSelect(tool.id)}
          className={cn(actionCardBioBase, 'min-h-[140px] w-full text-left')}
        >
          {cardContent}
        </button>
        <button
          type="button"
          onClick={handlePinClick}
          className={cn('absolute left-2 top-2 rounded-md p-1 transition-colors hover:bg-muted', focusRingBio)}
          aria-label={isPinned ? '핀 해제' : '핀 고정'}
        >
          <Star
            className={cn(
              'w-3.5 h-3.5 transition-colors',
              isPinned ? 'fill-current' : 'text-muted-foreground/40',
            )}
            style={isPinned ? BIO_ICON_COLOR : undefined}
          />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Link href={`/bio-tools?tool=${tool.id}`} className={cn(actionCardBioBase, 'min-h-[140px] block')}>
        {cardContent}
      </Link>
      <button
        type="button"
        onClick={handlePinClick}
        className={cn('absolute left-2 top-2 rounded-md p-1 transition-colors hover:bg-muted', focusRingBio)}
        aria-label={isPinned ? '핀 해제' : '핀 고정'}
      >
        <Star
          className={cn(
            'w-3.5 h-3.5 transition-colors',
            isPinned ? 'fill-current' : 'text-muted-foreground/40',
          )}
          style={isPinned ? BIO_ICON_COLOR : undefined}
        />
      </button>
    </div>
  )
})
