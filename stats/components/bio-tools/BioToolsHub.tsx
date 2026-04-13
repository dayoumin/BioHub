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
import { BIO_ACCENT_TEXT, BIO_HUB_ACTIVE_CARD_STYLE } from './bio-styles'

interface BioToolsHubProps {
  onSelectTool?: (toolId: string) => void
}

interface BioCategoryCardMeta {
  category: BioToolCategory
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
    <div className="mx-auto max-w-5xl space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Bio-Tools</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          생물학 분석을 목적별로 빠르게 고르고 바로 시작할 수 있는 허브입니다.
        </p>
      </section>

      <SortablePinnedCardGrid
        items={pinnedTools}
        title="고정 도구"
        description="카드 오른쪽 위 별표로 고정하고, 고정한 도구는 드래그나 키보드로 원하는 순서에 배치할 수 있습니다."
        emptyTitle="아직 고정한 도구가 없습니다."
        emptyDescription="자주 쓰는 도구를 고정해 두면 허브 상단에서 바로 시작할 수 있습니다."
        maxItems={6}
        onReorder={reorderPins}
        renderCard={(tool, dragHandle) => (
          <BioToolCard tool={tool} onSelect={onSelectTool} dragHandle={dragHandle} />
        )}
        getItemLabel={(tool) => tool.nameKo}
        accentStyle={BIO_ACCENT_TEXT}
        dataTestId="bio-tools-pinned-section"
      />

      {recentTools.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <div>
              <h2 className="text-base font-semibold text-foreground/90">최근 사용</h2>
              <p className="mt-1 text-xs text-muted-foreground/70">
                고정하지 않은 최근 도구도 아래에서 바로 다시 열 수 있습니다.
              </p>
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
        <div>
          <h2 className="text-base font-semibold text-foreground/90">분야를 고르세요</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {categoryCards.map((item) => (
            <button
              key={item.category}
              type="button"
              onClick={() => setSelectedCategory(item.category)}
              data-testid={`bio-tools-category-${item.category}`}
              className={cn(
                'flex h-full min-h-[88px] rounded-[1.25rem] bg-surface-container-lowest px-5 py-4 text-left transition-colors duration-200 hover:bg-surface-container-low',
                item.category === selectedCategory ? 'shadow-none bg-surface-container-lowest' : 'bg-surface-container-lowest',
              )}
              style={item.category === selectedCategory ? BIO_HUB_ACTIVE_CARD_STYLE : undefined}
              aria-pressed={item.category === selectedCategory}
              aria-current={item.category === selectedCategory ? 'true' : undefined}
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'text-base font-semibold tracking-tight',
                      item.category === selectedCategory ? 'text-foreground' : 'text-foreground/90',
                    )}
                  >
                    {categoryLabel(item.category)}
                  </span>
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-xs font-medium',
                    item.category === selectedCategory ? 'text-foreground/70' : 'text-muted-foreground/70',
                  )}
                >
                  도구 {item.tools.length}개
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {selectedCategoryMeta && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                {categoryLabel(selectedCategoryMeta.category)}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                선택한 분야에서 바로 시작할 수 있는 도구입니다.
              </p>
            </div>
            <span className="text-xs font-medium text-muted-foreground/70">
              {selectedTools.length}개 도구
            </span>
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

function categoryLabel(category: BioToolCategory): string {
  switch (category) {
    case 'ecology':
      return '군집생태'
    case 'fisheries':
      return '수산자원'
    case 'genetics':
      return '유전학'
    case 'methods':
      return '방법론'
  }
}
