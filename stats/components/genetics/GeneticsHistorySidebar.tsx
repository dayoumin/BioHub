'use client'

/**
 * 유전학 히스토리 사이드바 — 도구별 필터 + UnifiedHistorySidebar 래퍼
 *
 * 바코딩 / BLAST / GenBank 3종 히스토리를 통합 표시.
 * 필터 행으로 도구별 필터링 지원.
 */

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { UnifiedHistorySidebar } from '@/components/common/UnifiedHistorySidebar'
import { toGeneticsHistoryItems } from '@/lib/utils/history-adapters'
import type { HistoryItem } from '@/types/history'
import type {
  GeneticsHistoryEntry,
  GeneticsToolType,
} from '@/lib/genetics/analysis-history'
import {
  loadGeneticsHistory,
  hydrateGeneticsHistoryFromCloud,
  deleteGeneticsEntries,
  toggleGeneticsPin,
  HISTORY_KEY,
  HISTORY_CHANGE_EVENT,
} from '@/lib/genetics/analysis-history'

// ── 필터 ──

type ToolFilter = 'all' | GeneticsToolType

const FILTER_OPTIONS: { value: ToolFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'barcoding', label: '종동정' },
  { value: 'blast', label: 'BLAST' },
  { value: 'genbank', label: 'GenBank' },
]

const TYPE_DOT_COLOR: Record<GeneticsToolType, string> = {
  barcoding: 'bg-green-500',
  blast: 'bg-blue-500',
  genbank: 'bg-amber-500',
}

// ── 컴포넌트 ──

export function GeneticsHistorySidebar(): ReactNode {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [history, setHistory] = useState<GeneticsHistoryEntry[]>([])
  const [filter, setFilter] = useState<ToolFilter>('all')
  const lastRawRef = useRef<string | null>(null)
  const activeHistoryId = searchParams.get('history')

  const refreshHistory = useCallback((): void => {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw === lastRawRef.current) return
    lastRawRef.current = raw
    setHistory(loadGeneticsHistory(undefined, raw))
  }, [])

  useEffect(() => { refreshHistory() }, [refreshHistory])

  useEffect(() => {
    void hydrateGeneticsHistoryFromCloud()
  }, [])

  useEffect(() => {
    const onHistoryChange = (): void => { refreshHistory() }
    window.addEventListener(HISTORY_CHANGE_EVENT, onHistoryChange)
    const onStorage = (e: StorageEvent): void => {
      if (e.key === HISTORY_KEY) refreshHistory()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(HISTORY_CHANGE_EVENT, onHistoryChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshHistory])

  // 필터링
  const filteredHistory = useMemo(() => {
    if (filter === 'all') return history
    return history.filter(e => e.type === filter)
  }, [history, filter])

  const items = useMemo(() => toGeneticsHistoryItems(filteredHistory), [filteredHistory])

  // 2종류 이상일 때만 필터 표시
  const typeSet = useMemo(() => new Set(history.map(e => e.type)), [history])
  const showFilter = typeSet.size > 1

  // 핸들러
  const handleSelect = useCallback(
    (item: HistoryItem<GeneticsHistoryEntry>) => {
      const encodedId = encodeURIComponent(item.id)
      const typePath: Record<GeneticsToolType, string> = {
        barcoding: '/genetics/barcoding',
        blast: '/genetics/blast',
        genbank: '/genetics/genbank',
      }
      const base = typePath[item.data.type]
      const href = `${base}?history=${encodedId}`

      if (pathname === base) {
        window.history.pushState({}, '', href)
      } else {
        router.push(href)
      }
    },
    [pathname, router],
  )

  const handlePin = useCallback((id: string) => {
    setHistory(toggleGeneticsPin(id))
  }, [])

  const handleDeleteMultiple = useCallback((ids: Set<string>) => {
    setHistory(deleteGeneticsEntries(ids))
  }, [])

  // renderItem — type별 색상 도트 + 도구별 정보
  const renderItem = useCallback(
    (item: HistoryItem<GeneticsHistoryEntry>): ReactNode => {
      const entry = item.data

      return (
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <div className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TYPE_DOT_COLOR[entry.type]}`} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs leading-tight">{item.title}</div>
            {item.subtitle && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground/70">
                {item.subtitle}
              </div>
            )}
            {item.badges && item.badges.length > 0 && (
              <div className="mt-0.5 flex flex-wrap items-center gap-1">
                {item.badges.map((badge, i) => (
                  <span
                    key={i}
                    className={`text-[10px] ${
                      badge.variant === 'mono' ? 'font-mono text-muted-foreground'
                      : badge.variant === 'primary' ? 'font-medium text-primary'
                      : 'text-muted-foreground/70'
                    }`}
                  >
                    {badge.label && `${badge.label} `}{badge.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )
    },
    [],
  )

  // 필터 행
  const filterRow = showFilter ? (
    <div className="mb-2 flex gap-0.5 rounded-md bg-muted/30 p-0.5">
      {FILTER_OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setFilter(value)}
          className={`flex-1 rounded px-1 py-0.5 text-[10px] font-medium transition-colors duration-200 ${
            filter === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground/60 hover:text-muted-foreground'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  ) : null

  return (
    <div>
      <UnifiedHistorySidebar<GeneticsHistoryEntry>
        items={items}
        onSelect={handleSelect}
        onPin={handlePin}
        onDeleteMultiple={handleDeleteMultiple}
        activeId={activeHistoryId}
        renderItem={renderItem}
        actionSlot={filterRow}
      />
    </div>
  )
}
