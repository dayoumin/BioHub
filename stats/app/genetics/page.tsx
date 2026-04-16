'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { SortablePinnedCardGrid } from '@/components/common/SortablePinnedCardGrid'
import { GeneticsToolCard } from '@/components/genetics/GeneticsToolCard'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import {
  GENETICS_ACCENT_TEXT,
  GENETICS_HUB_ACTIVE_CARD_STYLE,
  GENETICS_HUB_PANEL_STYLE,
} from '@/lib/design-tokens/genetics'
import { usePinnedGeneticsToolsStore } from '@/lib/genetics/pinned-tools-store'
import { cn } from '@/lib/utils'

interface Tool {
  id: string
  title: string
  description: string
  input: string
  href: string
  ready: boolean
}

type ToolCategoryId = 'identification' | 'reference' | 'comparison' | 'protein'

interface ToolCategory {
  id: ToolCategoryId
  label: string
  toolIds: readonly string[]
}

const TOOLS: readonly Tool[] = [
  {
    id: 'barcoding',
    title: 'DNA 바코드 종 동정',
    description: '시료 하나로 종 후보와 해석 방향을 빠르게 확인합니다.',
    input: 'FASTA 1개',
    href: '/genetics/barcoding',
    ready: true,
  },
  {
    id: 'blast-search',
    title: 'BLAST 서열 검색',
    description: '가까운 범위의 유사 서열을 빠르게 확인합니다.',
    input: 'DNA 또는 단백질',
    href: '/genetics/blast',
    ready: true,
  },
  {
    id: 'genbank-search',
    title: 'GenBank 서열 검색',
    description: '참조 서열을 검색하고 FASTA로 내려받습니다.',
    input: '키워드',
    href: '/genetics/genbank',
    ready: true,
  },
  {
    id: 'seq-stats',
    title: '서열 기본 통계',
    description: '길이, GC 함량, 염기 조성 등을 한 번에 요약합니다.',
    input: '다중 FASTA',
    href: '/genetics/seq-stats',
    ready: true,
  },
  {
    id: 'similarity',
    title: '다중 유사도 행렬',
    description: '거리 행렬과 히트맵으로 종 간 차이를 비교합니다.',
    input: '정렬된 FASTA',
    href: '/genetics/similarity',
    ready: true,
  },
  {
    id: 'phylogeny',
    title: '계통수 시각화',
    description: 'NJ 또는 UPGMA 기반 계통수를 만들고 해석합니다.',
    input: '정렬된 FASTA',
    href: '/genetics/phylogeny',
    ready: true,
  },
  {
    id: 'bold-id',
    title: 'BOLD ID 종 동정',
    description: 'BOLD 참조 라이브러리 기준으로 종 동정과 BIN을 확인합니다.',
    input: 'DNA 바코드 FASTA',
    href: '/genetics/bold-id',
    ready: true,
  },
  {
    id: 'translation',
    title: 'Translation 워크벤치',
    description: 'DNA를 단백질로 번역하고 ORF와 코돈 사용을 검토합니다.',
    input: 'DNA 서열',
    href: '/genetics/translation',
    ready: true,
  },
  {
    id: 'protein',
    title: '단백질 특성 분석',
    description: '분자량, 등전점, 소수성 같은 물리화학 특성을 계산합니다.',
    input: '단백질',
    href: '/genetics/protein',
    ready: true,
  },
] as const

const TOOL_MAP: Readonly<Record<string, Tool>> = TOOLS.reduce<Record<string, Tool>>((acc, tool) => {
  acc[tool.id] = tool
  return acc
}, {})

const TOOL_CATEGORIES: readonly ToolCategory[] = [
  {
    id: 'identification',
    label: '종 동정',
    toolIds: ['barcoding', 'bold-id'],
  },
  {
    id: 'reference',
    label: '참조 서열 찾기',
    toolIds: ['blast-search', 'genbank-search'],
  },
  {
    id: 'comparison',
    label: '비교와 계통',
    toolIds: ['seq-stats', 'similarity', 'phylogeny'],
  },
  {
    id: 'protein',
    label: '번역과 단백질',
    toolIds: ['translation', 'protein'],
  },
] as const

const CROSS_LINK_TOOL_IDS = ['hardy-weinberg', 'fst'] as const

export default function GeneticsHome(): React.ReactElement {
  const [activeCategory, setActiveCategory] = useState<ToolCategoryId>('identification')
  const pinnedIds = usePinnedGeneticsToolsStore((state) => state.pinnedIds)
  const reorderPins = usePinnedGeneticsToolsStore((state) => state.reorderPins)

  const selectedCategory = useMemo(
    () => TOOL_CATEGORIES.find((category) => category.id === activeCategory) ?? TOOL_CATEGORIES[0],
    [activeCategory],
  )

  const pinnedTools = useMemo(
    () => pinnedIds
      .map((toolId) => TOOL_MAP[toolId])
      .filter((tool): tool is Tool => Boolean(tool) && tool.ready),
    [pinnedIds],
  )

  const selectedTools = useMemo(
    () => selectedCategory.toolIds
      .map((toolId) => TOOL_MAP[toolId])
      .filter((tool): tool is Tool => Boolean(tool) && tool.ready),
    [selectedCategory],
  )

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">유전학 분석</h1>
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
          <GeneticsToolCard tool={tool} accentStyle={GENETICS_ACCENT_TEXT} dragHandle={dragHandle} />
        )}
        getItemLabel={(tool) => tool.title}
        accentStyle={GENETICS_ACCENT_TEXT}
        dataTestId="genetics-pinned-section"
      />

      <section className="space-y-3">
        <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
          {TOOL_CATEGORIES.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              active={category.id === selectedCategory.id}
              onSelect={setActiveCategory}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{selectedCategory.label}</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {selectedTools.map((tool) => (
            <GeneticsToolCard key={tool.id} tool={tool} accentStyle={GENETICS_ACCENT_TEXT} />
          ))}
        </div>
      </section>

      <SupportPanel />
    </div>
  )
}

interface CategoryCardProps {
  category: ToolCategory
  active: boolean
  onSelect: (categoryId: ToolCategoryId) => void
}

function CategoryCard({
  category,
  active,
  onSelect,
}: CategoryCardProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      className={cn(
        'flex h-full min-h-[72px] rounded-[1rem] bg-surface-container-lowest px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-container-low',
        active ? 'shadow-none' : 'bg-surface-container-lowest',
      )}
      style={active ? GENETICS_HUB_ACTIVE_CARD_STYLE : undefined}
      aria-pressed={active}
      aria-current={active ? 'true' : undefined}
    >
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        <span
          className={cn(
            'truncate text-sm font-semibold tracking-tight',
            active ? 'text-foreground' : 'text-foreground/90',
          )}
        >
          {category.label}
        </span>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium',
            active
              ? 'bg-surface-container-lowest/80 text-foreground/75'
              : 'bg-surface-container-low text-muted-foreground/75',
          )}
        >
          {category.toolIds.length}개
        </span>
      </div>
    </button>
  )
}

function SupportPanel(): React.ReactElement | null {
  const tools = CROSS_LINK_TOOL_IDS.map(getBioToolById).filter(
    (tool): tool is Exclude<ReturnType<typeof getBioToolById>, undefined> => tool !== undefined,
  )

  if (tools.length === 0) {
    return null
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-[1.75rem] p-6 lg:flex-row lg:items-start lg:justify-between"
      style={GENETICS_HUB_PANEL_STYLE}
    >
      <div className="max-w-2xl">
        <h2 className="text-sm font-semibold text-foreground/90">집단 유전학 도구는 Bio-Tools에서 제공합니다.</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          집단 간 유전적 분화와 평형 검정을 하려면 아래 도구로 바로 이동하세요.
        </p>
      </div>
      <div className="flex flex-wrap gap-2.5">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={`/bio-tools?tool=${tool.id}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-lowest px-4 py-2 text-sm font-medium transition-colors duration-200 hover:bg-surface-container-low"
          >
            {tool.nameKo}
            <ArrowRight className="h-4 w-4" style={GENETICS_ACCENT_TEXT} />
          </Link>
        ))}
      </div>
    </section>
  )
}
