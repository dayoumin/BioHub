'use client'

import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { memo, type CSSProperties, type ReactNode } from 'react'
import { actionCardBioBase, focusRingBio } from '@/components/common/card-styles'
import { usePinnedGeneticsToolsStore } from '@/lib/genetics/pinned-tools-store'
import { cn } from '@/lib/utils'

interface GeneticsToolCardProps {
  tool: {
    id: string
    title: string
    href: string
  }
  accentStyle: CSSProperties
  dragHandle?: ReactNode
}

export const GeneticsToolCard = memo(function GeneticsToolCard({
  tool,
  accentStyle,
  dragHandle,
}: GeneticsToolCardProps): React.ReactElement {
  const isPinned = usePinnedGeneticsToolsStore((state) => state.pinnedIds.includes(tool.id))
  const togglePin = usePinnedGeneticsToolsStore((state) => state.togglePin)

  const handlePinClick = (event: React.MouseEvent): void => {
    event.preventDefault()
    event.stopPropagation()
    togglePin(tool.id)
  }

  const cardContent = (
    <div className="flex h-full w-full flex-col justify-between">
      <div className={cn('min-w-0 pr-10', dragHandle ? 'pl-10' : '')}>
        <h3 className="text-base font-semibold tracking-tight text-foreground/90">{tool.title}</h3>
      </div>
      <div className="mt-4 flex justify-end">
        <ArrowRight
          className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-1"
          style={accentStyle}
        />
      </div>
    </div>
  )

  return (
    <div className="relative flex h-full flex-col">
      <Link
        href={tool.href}
        className={cn(
          actionCardBioBase,
          'group w-full min-h-[120px] items-stretch justify-between rounded-[1.5rem] p-5 text-left !gap-0',
        )}
      >
        {cardContent}
      </Link>

      {dragHandle}

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
          style={isPinned ? accentStyle : undefined}
        />
      </button>
    </div>
  )
})
