'use client'

import { useState, useMemo, useCallback } from 'react'
import type { KeyboardEvent } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ENTITY_TAB_REGISTRY,
  loadTabSettings,
  getTabEntry,
} from '@/lib/research/entity-tab-registry'
import type { ProjectEntityKind } from '@/lib/types/research'
import type { ResolvedEntity } from '@/lib/research/entity-resolver'
import { EntityListItem } from './EntityListItem'
import { ReportComposer } from './ReportComposer'

type SortMode = 'newest' | 'name'
type PeriodFilter = 'all' | '1w' | '1m' | '3m'

const PERIOD_MS: Record<PeriodFilter, number> = {
  all: Infinity,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
  '3m': 90 * 24 * 60 * 60 * 1000,
}

interface EntityBrowserProps {
  entities: ResolvedEntity[]
  projectId: string
  projectName: string
  onNavigate: (url: string) => void
  onUnlink: (entity: ResolvedEntity) => void
}

export function EntityBrowser({ entities, projectId, projectName, onNavigate, onUnlink }: EntityBrowserProps): React.ReactElement {
  const [activeTab, setActiveTab] = useState<'all' | ProjectEntityKind>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortMode>('newest')
  const [period, setPeriod] = useState<PeriodFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [reportOpen, setReportOpen] = useState(false)

  const [tabSettings] = useState(() => loadTabSettings())

  const tabsWithCounts = useMemo(() => {
    const counts = new Map<ProjectEntityKind, number>()
    for (const e of entities) {
      if (e.loaded) {
        counts.set(e.ref.entityKind, (counts.get(e.ref.entityKind) ?? 0) + 1)
      }
    }

    // 설정에서 켜진 탭은 항목 0개여도 표시 (빈 상태 안내 활용)
    return ENTITY_TAB_REGISTRY
      .filter(tab => tabSettings[tab.id] === true)
      .map(tab => ({ ...tab, count: counts.get(tab.id) ?? 0 }))
  }, [entities, tabSettings])

  const tabOrder = useMemo<Array<'all' | ProjectEntityKind>>(
    () => ['all', ...tabsWithCounts.map(tab => tab.id)],
    [tabsWithCounts],
  )

  const loadedCount = useMemo(
    () => entities.filter(e => e.loaded).length,
    [entities],
  )

  const filtered = useMemo(() => {
    const now = Date.now()
    const periodMs = PERIOD_MS[period]
    const query = search.toLowerCase().trim()

    let result = entities

    // 탭 필터
    if (activeTab !== 'all') {
      result = result.filter(e => e.ref.entityKind === activeTab)
    }

    // 기간 필터
    if (period !== 'all') {
      result = result.filter(e => now - e.summary.timestamp < periodMs)
    }

    // 검색
    if (query) {
      result = result.filter(e => {
        const text = `${e.summary.title} ${e.summary.subtitle ?? ''}`.toLowerCase()
        return text.includes(query)
      })
    }

    // 정렬
    if (sort === 'newest') {
      result = [...result].sort((a, b) => b.summary.timestamp - a.summary.timestamp)
    } else {
      result = [...result].sort((a, b) => a.summary.title.localeCompare(b.summary.title, 'ko'))
    }

    return result
  }, [entities, activeTab, search, sort, period])

  const handleTabClick = useCallback((tab: 'all' | ProjectEntityKind) => {
    setActiveTab(tab)
  }, [])

  const handleTabKeyDown = useCallback((
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: 'all' | ProjectEntityKind,
  ) => {
    const currentIndex = tabOrder.indexOf(currentTab)
    if (currentIndex === -1) return

    let nextIndex = currentIndex

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % tabOrder.length
        break
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = tabOrder.length - 1
        break
      default:
        return
    }

    event.preventDefault()
    const nextTab = tabOrder[nextIndex]
    setActiveTab(nextTab)
    document.getElementById(`entity-tab-${nextTab}`)?.focus()
  }, [tabOrder])

  const handleToggleSelect = useCallback((refId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(refId)) next.delete(refId)
      else next.add(refId)
      return next
    })
  }, [])

  const selectedEntities = useMemo(
    () => entities.filter(e => selectedIds.has(e.ref.id) && e.loaded),
    [entities, selectedIds],
  )

  return (
    <div>
      {/* 탭 */}
      <div
        role="tablist"
        aria-label="엔티티 유형 탭"
        className="flex items-center gap-1 border-b mb-4 overflow-x-auto"
      >
        <button
          id="entity-tab-all"
          role="tab"
          aria-selected={activeTab === 'all'}
          aria-controls="entity-browser-panel"
          tabIndex={activeTab === 'all' ? 0 : -1}
          onClick={() => handleTabClick('all')}
          onKeyDown={e => handleTabKeyDown(e, 'all')}
          className={`shrink-0 px-3 pb-2 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          전체 ({loadedCount})
        </button>
        {tabsWithCounts.map(tab => (
          <button
            key={tab.id}
            id={`entity-tab-${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls="entity-browser-panel"
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => handleTabClick(tab.id)}
            onKeyDown={e => handleTabKeyDown(e, tab.id)}
            className={`shrink-0 px-3 pb-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="검색..."
            className="pl-9 h-9"
          />
        </div>
        <Select value={period} onValueChange={v => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-28 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="1w">최근 1주</SelectItem>
            <SelectItem value="1m">최근 1개월</SelectItem>
            <SelectItem value="3m">최근 3개월</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={v => setSort(v as SortMode)}>
          <SelectTrigger className="w-24 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">최신순</SelectItem>
            <SelectItem value="name">이름순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 목록 */}
      <div
        role="tabpanel"
        id="entity-browser-panel"
        aria-labelledby={`entity-tab-${activeTab}`}
      >
        {filtered.length === 0 ? (
          <EmptyState activeTab={activeTab} hasEntities={entities.length > 0} />
        ) : (
          <div className="space-y-2">
            {filtered.map(entity => (
              <EntityListItem
                key={entity.ref.id}
                entity={entity}
                showKindBadge={activeTab === 'all'}
                selected={selectedIds.has(entity.ref.id)}
                onToggleSelect={() => handleToggleSelect(entity.ref.id)}
                onNavigate={onNavigate}
                onUnlink={() => onUnlink(entity)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 하단 고정 바 */}
      {selectedEntities.length > 0 && (
        <div className="sticky bottom-0 mt-4 flex items-center justify-between rounded-lg border bg-card/95 backdrop-blur px-4 py-3 shadow-sm">
          <span className="text-sm text-muted-foreground">
            {selectedEntities.length}개 선택됨
          </span>
          <Button size="sm" onClick={() => setReportOpen(true)}>
            보고서 만들기
          </Button>
        </div>
      )}

      <ReportComposer
        open={reportOpen}
        onOpenChange={setReportOpen}
        entities={selectedEntities}
        projectId={projectId}
        projectName={projectName}
      />
    </div>
  )
}

// ── 빈 상태 안내 ──

function EmptyState({ activeTab, hasEntities }: { activeTab: 'all' | ProjectEntityKind; hasEntities: boolean }): React.ReactElement {
  // 검색/필터로 걸러진 경우
  if (hasEntities) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-sm text-muted-foreground">검색 조건에 맞는 항목이 없습니다</p>
      </div>
    )
  }

  // 특정 탭의 빈 상태 — 레지스트리에서 안내 메시지 가져오기
  if (activeTab !== 'all') {
    const tab = getTabEntry(activeTab)
    if (tab) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-sm text-muted-foreground">{tab.emptyMessage}</p>
          {tab.emptyActionPath && tab.emptyActionLabel && (
            <Link
              href={tab.emptyActionPath}
              className="mt-2 text-sm text-primary hover:underline"
            >
              {tab.emptyActionLabel}
            </Link>
          )}
        </div>
      )
    }
  }

  // 전체 빈 상태
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-sm text-muted-foreground">아직 연결된 항목이 없습니다</p>
      <p className="mt-2 text-xs text-muted-foreground/70">
        통계 분석, Graph Studio, 종 동정에서 결과를 저장하면 여기에 표시됩니다
      </p>
      <div className="mt-4 flex gap-2">
        <Link href="/" className="text-xs text-primary hover:underline">분석 시작</Link>
        <span className="text-xs text-muted-foreground/30">·</span>
        <Link href="/graph-studio" className="text-xs text-primary hover:underline">Graph Studio</Link>
        <span className="text-xs text-muted-foreground/30">·</span>
        <Link href="/genetics/barcoding" className="text-xs text-primary hover:underline">종 동정</Link>
      </div>
    </div>
  )
}
