'use client'

import { memo, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { actionCardBioBase, focusRingBio } from '@/components/common/card-styles'
import type { BioTool } from '@/lib/bio-tools/bio-tool-registry'
import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'
import { BIO_ICON_COLOR } from './bio-styles'

interface BioToolCardProps {
  tool: BioTool
  onSelect?: (toolId: string) => void
  dragHandle?: ReactNode
}

export const BioToolCard = memo(function BioToolCard({
  tool,
  onSelect,
  dragHandle,
}: BioToolCardProps): React.ReactElement {
  const isPinned = usePinnedToolsStore((state) => state.pinnedIds.includes(tool.id))
  const togglePin = usePinnedToolsStore((state) => state.togglePin)

  const disabled = tool.status === 'coming-soon'

  const handlePinClick = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    togglePin(tool.id)
  }

  const cardContent = (
    <div className="flex h-full w-full flex-col">
      {disabled && (
        <span className="absolute right-3 top-3 z-10 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground/80">
          준비 중
        </span>
      )}

      <div className={cn('min-w-0 pr-10', dragHandle ? 'pl-10' : '')}>
        <h3 className="text-base font-semibold tracking-tight text-foreground/90">{tool.nameKo}</h3>
      </div>

      <div className="mt-4 flex justify-end">
        {disabled ? (
          <span className="text-xs font-medium" style={BIO_ICON_COLOR}>
            업데이트 예정
          </span>
        ) : (
          <ArrowRight
            className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-1"
            style={BIO_ICON_COLOR}
          />
        )}
      </div>
    </div>
  )

  const PinButton = (): React.ReactElement => (
    <button
      type="button"
      onClick={handlePinClick}
      className={cn(
        'absolute right-3 top-3 z-20 rounded-md p-1.5 transition-colors hover:bg-muted',
        focusRingBio,
      )}
      aria-label={isPinned ? '고정 해제' : '도구 고정'}
      aria-pressed={isPinned}
    >
      <Star
        className={cn(
          'h-4 w-4 transition-colors',
          isPinned ? 'fill-current' : 'text-muted-foreground/30',
        )}
        style={isPinned ? BIO_ICON_COLOR : undefined}
      />
    </button>
  )

  const cardContainerClass = cn(
    actionCardBioBase,
    'group w-full min-h-[120px] items-stretch justify-between rounded-[1.5rem] p-5 text-left !gap-0',
  )

  if (disabled) {
    return (
      <div className={cn(cardContainerClass, 'relative cursor-not-allowed opacity-60 hover:bg-surface-container-lowest')}>
        {cardContent}
      </div>
    )
  }

  if (onSelect) {
    return (
      <div className="relative flex h-full flex-col">
        <button
          type="button"
          onClick={() => onSelect(tool.id)}
          className={cardContainerClass}
        >
          {cardContent}
        </button>
        {dragHandle}
        <PinButton />
      </div>
    )
  }

  return (
    <div className="relative flex h-full flex-col">
      <Link href={`/bio-tools?tool=${tool.id}`} className={cardContainerClass}>
        {cardContent}
      </Link>
      {dragHandle}
      <PinButton />
    </div>
  )
})
