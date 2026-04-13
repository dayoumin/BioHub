'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import type { CSSProperties } from 'react'
import { SortablePinnedCardGrid } from '@/components/common/SortablePinnedCardGrid'
import { GeneticsToolCard } from '@/components/genetics/GeneticsToolCard'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import {
  HISTORY_CHANGE_EVENT,
  HISTORY_KEY,
  loadGeneticsHistory,
  type GeneticsHistoryEntry,
  type GeneticsToolType,
} from '@/lib/genetics/analysis-history'
import { usePinnedGeneticsToolsStore } from '@/lib/genetics/pinned-tools-store'
import { useLocalStorageSync } from '@/lib/hooks/use-local-storage-sync'
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
  description: string
  toolIds: readonly string[]
}

interface RecentToolItem {
  historyId: string
  title: string
  subtitle: string
  href: string
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
    description: '시료가 어떤 종인지 먼저 확인합니다.',
    toolIds: ['barcoding', 'bold-id'],
  },
  {
    id: 'reference',
    label: '참조 서열 찾기',
    description: '데이터베이스에서 비슷한 서열이나 기준 서열을 찾습니다.',
    toolIds: ['blast-search', 'genbank-search'],
  },
  {
    id: 'comparison',
    label: '비교와 계통',
    description: '길이, 거리, 계통 관계를 비교합니다.',
    toolIds: ['seq-stats', 'similarity', 'phylogeny'],
  },
  {
    id: 'protein',
    label: '번역과 단백질',
    description: 'DNA를 단백질 수준으로 확장해서 봅니다.',
    toolIds: ['translation', 'protein'],
  },
] as const

const CROSS_LINK_TOOL_IDS = ['hardy-weinberg', 'fst'] as const

const HISTORY_TOOL_TO_TOOL_ID: Record<GeneticsToolType, string> = {
  barcoding: 'barcoding',
  blast: 'blast-search',
  genbank: 'genbank-search',
  'seq-stats': 'seq-stats',
  similarity: 'similarity',
  phylogeny: 'phylogeny',
  bold: 'bold-id',
  translation: 'translation',
  protein: 'protein',
}

const GENETICS_ACCENT_VAR = '--section-accent-hub' as const

const GENETICS_ACCENT_TEXT = {
  color: `var(${GENETICS_ACCENT_VAR})`,
} as const satisfies CSSProperties

const GENETICS_PANEL_STYLE = {
  backgroundColor: 'var(--surface-container-low)',
} as const satisfies CSSProperties

const GENETICS_ACTIVE_CATEGORY_STYLE = {
  backgroundColor: `color-mix(in srgb, var(${GENETICS_ACCENT_VAR}) 14%, var(--surface-container-high))`,
} as const satisfies CSSProperties

export default function GeneticsHome(): React.ReactElement {
  const [activeCategory, setActiveCategory] = useState<ToolCategoryId>('identification')
  const pinnedIds = usePinnedGeneticsToolsStore((state) => state.pinnedIds)
  const reorderPins = usePinnedGeneticsToolsStore((state) => state.reorderPins)
  const parser = useMemo(
    () => (raw: string | null): GeneticsHistoryEntry[] => loadGeneticsHistory(undefined, raw),
    [],
  )
  const { value: history } = useLocalStorageSync<GeneticsHistoryEntry[]>(
    HISTORY_KEY,
    HISTORY_CHANGE_EVENT,
    parser,
  )

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

  const recentTools = useMemo(() => {
    const seenToolIds = new Set<string>()
    const items: RecentToolItem[] = []

    for (const entry of history) {
      const toolId = HISTORY_TOOL_TO_TOOL_ID[entry.type]
      if (pinnedIds.includes(toolId) || seenToolIds.has(toolId)) {
        continue
      }

      const tool = TOOL_MAP[toolId]
      if (!tool) {
        continue
      }

      seenToolIds.add(toolId)
      items.push({
        historyId: entry.id,
        title: tool.title,
        subtitle: getRecentSubtitle(entry),
        href: `${tool.href}?history=${encodeURIComponent(entry.id)}`,
      })

      if (items.length >= 3) {
        break
      }
    }

    return items
  }, [history, pinnedIds])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">유전학 분석</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            서열 기반 종 동정, 참조 검색, 비교 분석, 단백질 확장까지 한 흐름으로 이어집니다.
          </p>
          <p className="mt-1 text-sm font-medium" style={GENETICS_ACCENT_TEXT}>
            처음이라면 DNA 바코드에서 시작하는 흐름이 가장 빠릅니다.
          </p>
        </div>
      </section>

      <SortablePinnedCardGrid
        items={pinnedTools}
        title="고정 도구"
        description="자주 쓰는 유전학 도구를 먼저 고정하고, 드래그나 키보드로 작업 순서에 맞게 다시 배치할 수 있습니다."
        emptyTitle="아직 고정한 도구가 없습니다."
        emptyDescription="카드 오른쪽 위의 별표로 도구를 고정하면 이 영역에 모아서 빠르게 접근할 수 있습니다."
        maxItems={6}
        onReorder={reorderPins}
        renderCard={(tool, dragHandle) => (
          <GeneticsToolCard tool={tool} accentStyle={GENETICS_ACCENT_TEXT} dragHandle={dragHandle} />
        )}
        getItemLabel={(tool) => tool.title}
        accentStyle={GENETICS_ACCENT_TEXT}
        dataTestId="genetics-pinned-section"
      />

      {recentTools.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-3.5 w-3.5 text-muted-foreground/60" />
            <div>
              <h2 className="text-base font-semibold text-foreground/90">최근 사용</h2>
              <p className="mt-1 text-xs text-muted-foreground/70">
                방금 보던 분석도 고정 도구 아래에서 바로 이어서 열 수 있습니다.
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {recentTools.map((item) => (
              <RecentToolCard key={item.historyId} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <div>
          <h2 className="text-base font-semibold text-foreground/90">분석 흐름을 고르세요</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
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
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{selectedCategory.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              선택한 흐름에서 바로 시작할 수 있는 도구입니다.
            </p>
          </div>
          <span className="text-xs font-medium text-muted-foreground/70">
            {selectedTools.length}개 도구
          </span>
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
        'flex h-full min-h-[88px] rounded-[1.25rem] bg-surface-container-lowest px-5 py-4 text-left transition-colors duration-200 hover:bg-surface-container-low',
        active ? 'shadow-none' : 'bg-surface-container-lowest',
      )}
      style={active ? GENETICS_ACTIVE_CATEGORY_STYLE : undefined}
      aria-pressed={active}
      aria-current={active ? 'true' : undefined}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <span
            className={cn(
              'text-base font-semibold tracking-tight',
              active ? 'text-foreground' : 'text-foreground/90',
            )}
          >
            {category.label}
          </span>
        </div>
        <span
          className={cn(
            'mt-1.5 text-xs font-medium',
            active ? 'text-foreground/70' : 'text-muted-foreground/70',
          )}
        >
          도구 {category.toolIds.length}개
        </span>
      </div>
    </button>
  )
}

function RecentToolCard({ item }: { item: RecentToolItem }): React.ReactElement {
  return (
    <Link href={item.href} className="block h-full">
      <div
        className="group flex h-full flex-col gap-3 rounded-[1.5rem] p-5 transition-colors duration-200 hover:bg-surface-container"
        style={GENETICS_PANEL_STYLE}
      >
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold tracking-tight text-foreground/90">{item.title}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground/75">{item.subtitle}</p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium" style={GENETICS_ACCENT_TEXT}>이어서 보기</span>
          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" style={GENETICS_ACCENT_TEXT} />
        </div>
      </div>
    </Link>
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
      style={GENETICS_PANEL_STYLE}
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

function getRecentSubtitle(entry: GeneticsHistoryEntry): string {
  switch (entry.type) {
    case 'barcoding':
      return entry.sampleName || '바코드 분석'
    case 'blast':
      return `${entry.program} · ${entry.database}`
    case 'genbank':
      return entry.organism ?? entry.query
    case 'seq-stats':
      return `${entry.sequenceCount}개 서열`
    case 'similarity':
      return `${entry.distanceModel} · ${entry.sequenceCount}개 서열`
    case 'phylogeny':
      return `${entry.treeMethod} · ${entry.sequenceCount}개 서열`
    case 'bold':
      return entry.sampleName || 'BOLD 종 동정'
    case 'translation':
      return entry.analysisMode === 'translate'
        ? '번역'
        : entry.analysisMode === 'orf'
          ? 'ORF 탐색'
          : '코돈 분석'
    case 'protein':
      return entry.analysisName || '단백질 특성 분석'
  }
}
