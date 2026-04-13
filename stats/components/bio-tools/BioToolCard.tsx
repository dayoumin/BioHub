'use client'

import { memo, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { actionCardBioBase, focusRingBio } from '@/components/common/card-styles'
import type { BioTool } from '@/lib/bio-tools/bio-tool-registry'
import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'
import { BIO_ICON_COLOR } from './bio-styles'

interface BioToolCardProps {
  tool: BioTool
  /** 워크스페이스 모드: 클릭 시 Link 대신 콜백 호출 */
  onSelect?: (toolId: string) => void
}

export const BioToolCard = memo(function BioToolCard({ tool, onSelect }: BioToolCardProps): React.ReactElement {
  const isPinned = usePinnedToolsStore((s) => s.pinnedIds.includes(tool.id))
  const togglePin = usePinnedToolsStore((s) => s.togglePin)

  const disabled = tool.status === 'coming-soon'
  const inputLabel = useMemo(() => {
    switch (tool.inputType) {
      case 'csv':
        return 'CSV'
      case 'fasta':
        return 'FASTA'
      case 'matrix':
        return '행렬'
      case 'csv-or-matrix':
        return 'CSV 또는 행렬'
    }
  }, [tool.inputType])

  const handlePinClick = (e: React.MouseEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    togglePin(tool.id)
  }

  const cardContent = (
    <div className="flex h-full flex-col w-full">
      {/* 뱃지 */}
      {disabled && (
        <span className="absolute top-3 right-3 text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground/80 font-medium z-10">
          준비 중
        </span>
      )}
      <div className="mb-4 min-w-0 pr-10">
        <h3 className="text-base font-semibold tracking-tight text-foreground/90">{tool.nameKo}</h3>
        <span className="mt-1 block text-xs text-muted-foreground/80">{tool.nameEn}</span>
        {!disabled && (
          <span className="mt-3 inline-flex rounded-full bg-surface-container-low px-2.5 py-1 text-[11px] font-medium text-muted-foreground/80">
            {inputLabel}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
      </div>

      <div className="mt-5 flex items-center justify-between">
        {disabled ? (
          <span className="text-xs font-medium" style={BIO_ICON_COLOR}>
            업데이트 예정
          </span>
        ) : (
          <>
            <span className="text-xs font-medium" style={BIO_ICON_COLOR}>
              열기
            </span>
            <ArrowRight className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-1" style={BIO_ICON_COLOR} />
          </>
        )}
      </div>
    </div>
  )

  const PinButton = () => (
    <button
      type="button"
      onClick={handlePinClick}
      className={cn('absolute right-3 top-3 rounded-md p-1.5 transition-colors hover:bg-muted z-20', focusRingBio)}
      aria-label={isPinned ? '핀 해제' : '핀 고정'}
    >
      <Star
        className={cn(
          'w-4 h-4 transition-colors',
          isPinned ? 'fill-current' : 'text-muted-foreground/30',
        )}
        style={isPinned ? BIO_ICON_COLOR : undefined}
      />
    </button>
  )

  const cardContainerClass = cn(
    actionCardBioBase,
    'group w-full min-h-[208px] items-stretch justify-start rounded-[1.75rem] p-6 text-left !gap-0'
  )

  if (disabled) {
    return (
      <div className={cn(cardContainerClass, 'cursor-not-allowed opacity-60 hover:bg-surface-container-lowest relative')}>
        {cardContent}
      </div>
    )
  }

  if (onSelect) {
    return (
      <div className="relative h-full flex flex-col">
        <button
          type="button"
          onClick={() => onSelect(tool.id)}
          className={cardContainerClass}
        >
          {cardContent}
        </button>
        <PinButton />
      </div>
    )
  }

  return (
    <div className="relative h-full flex flex-col">
      <Link href={`/bio-tools?tool=${tool.id}`} className={cardContainerClass}>
        {cardContent}
      </Link>
      <PinButton />
    </div>
  )
})
