'use client'

import { memo, useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import { SortablePinnedCardGrid } from '@/components/common/SortablePinnedCardGrid'
import { loadBioToolHistory } from '@/lib/bio-tools/bio-tool-history'
import {
  BIO_TOOL_CATEGORIES,
  getBioToolById,
  getBioToolsByCategory,
  type BioTool,
  type BioToolCategory,
} from '@/lib/bio-tools/bio-tool-registry'
import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'
import { cn } from '@/lib/utils'
import { BioToolCard } from './BioToolCard'
import { BIO_HUB_ACTIVE_CARD_STYLE } from './bio-styles'

interface BioToolsHubProps {
  onSelectTool?: (toolId: string) => void
}

interface BioCategoryCardMeta {
  category: BioToolCategory
  label: string
  tools: readonly BioTool[]
}

export const BioToolsHub = memo(function BioToolsHub({
  onSelectTool,
}: BioToolsHubProps): React.ReactElement {
  const pinnedIds = usePinnedToolsStore((state) => state.pinnedIds)
  const reorderPins = usePinnedToolsStore((state) => state.reorderPins)

  const pinnedTools = useMemo(
    () => pinnedIds
      .map((id) => getBioToolById(id))
      .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined),
    [pinnedIds],
  )

  const recentTools = useMemo(() => {
    const history = loadBioToolHistory()
    const seen = new Set<string>()
    const result: BioTool[] = []

    for (const entry of history) {
      if (seen.has(entry.toolId) || pinnedIds.includes(entry.toolId)) {
        continue
      }

      const tool = getBioToolById(entry.toolId)
      if (!tool) {
        continue
      }

      seen.add(entry.toolId)
      result.push(tool)

      if (result.length >= 3) {
        break
      }
    }

    return result
  }, [pinnedIds])

  const categoryCards = useMemo<BioCategoryCardMeta[]>(
    () => BIO_TOOL_CATEGORIES.map((meta) => ({
      category: meta.id,
      label: meta.label,
      tools: getBioToolsByCategory(meta.id),
    })),
    [],
  )

  const [selectedCategory, setSelectedCategory] = useState<BioToolCategory>(
    categoryCards[0]?.category ?? 'ecology',
  )

  const selectedCategoryMeta = useMemo(
    () => categoryCards.find((item) => item.category === selectedCategory) ?? categoryCards[0],
    [categoryCards, selectedCategory],
  )

  const selectedTools = selectedCategoryMeta?.tools ?? []

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Bio-Tools</h1>
      </section>

      <SortablePinnedCardGrid
        items={pinnedTools}
        title="고정 도구"
        description="자주 쓰는 도구를 고정해 상단에서 바로 시작할 수 있습니다."
        emptyTitle="아직 고정한 도구가 없습니다."
        emptyDescription="카드 오른쪽 위 별표로 도구를 고정할 수 있습니다."
        maxItems={6}
        onReorder={reorderPins}
        renderCard={(tool, dragHandle) => (
          <BioToolCard tool={tool} onSelect={onSelectTool} dragHandle={dragHandle} />
        )}
        getItemLabel={(tool) => tool.nameKo}
        dataTestId="bio-tools-pinned-section"
      />

      {recentTools.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <div>
              <h2 className="text-base font-semibold text-foreground/90">최근 사용</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recentTools.map((tool) => (
              <BioToolCard key={tool.id} tool={tool} onSelect={onSelectTool} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {categoryCards.map((item) => (
            <button
              key={item.category}
              type="button"
              onClick={() => setSelectedCategory(item.category)}
              data-testid={`bio-tools-category-${item.category}`}
              className={cn(
                'flex h-full min-h-[72px] rounded-[1rem] bg-surface-container-lowest px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-container-low',
                item.category === selectedCategory ? 'shadow-none bg-surface-container-lowest' : 'bg-surface-container-lowest',
              )}
              style={item.category === selectedCategory ? BIO_HUB_ACTIVE_CARD_STYLE : undefined}
              aria-pressed={item.category === selectedCategory}
              aria-current={item.category === selectedCategory ? 'true' : undefined}
            >
              <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                <span
                  className={cn(
                    'truncate text-sm font-semibold tracking-tight',
                    item.category === selectedCategory ? 'text-foreground' : 'text-foreground/90',
                  )}
                >
                  {item.label}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
                    item.category === selectedCategory
                      ? 'bg-surface-container-lowest/80 text-foreground/75'
                      : 'bg-surface-container-low text-muted-foreground/75',
                  )}
                >
                  {item.tools.length}개
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedCategoryMeta && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {selectedCategoryMeta.label}
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="bio-tools-category-panel">
            {selectedTools.map((tool) => (
              <BioToolCard key={tool.id} tool={tool} onSelect={onSelectTool} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
})
