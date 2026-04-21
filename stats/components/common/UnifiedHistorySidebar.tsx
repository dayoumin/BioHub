'use client'

/**
 * UnifiedHistorySidebar — 모듈 공통 히스토리 사이드바
 *
 * 유전학 HistorySidebar 패턴을 기반으로:
 * - 접기/펼치기 가능한 우측 사이드바
 * - 핀, 다중 삭제, 전체 선택
 * - renderItem prop으로 모듈별 커스텀 렌더링
 * - 항상 표시 (lg 이상), 모바일 숨김
 *
 * 사용처: 통계 분석, 유전학, Bio-Tools
 */

import { memo, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { Clock, PanelRightClose, PanelRightOpen, Pin, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { HistoryItem, UnifiedHistorySidebarProps } from '@/types/history'
import { useAppPreferences } from '@/hooks/use-app-preferences'

// ── 기본 아이템 렌더러 ──

function DefaultItemContent<T>({ item }: { item: HistoryItem<T> }): ReactNode {
  const { locale } = useAppPreferences()
  const dateStr = new Date(item.createdAt).toLocaleDateString(locale, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-w-0 flex-1">
      <div className="truncate text-xs font-medium leading-tight">{item.title}</div>
      {item.subtitle && (
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.subtitle}</div>
      )}
      {item.badges && item.badges.length > 0 && (
        <div className="mt-0.5 flex flex-wrap items-center gap-1">
          {item.badges.map((badge, i) => (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-0.5 text-[10px]',
                badge.variant === 'primary' && 'text-primary',
                badge.variant === 'mono' && 'font-mono',
                (!badge.variant || badge.variant === 'default' || badge.variant === 'muted') && 'text-muted-foreground',
              )}
            >
              {badge.label && <span className="text-border">{badge.label}</span>}
              <span>{badge.value}</span>
            </span>
          ))}
        </div>
      )}
      <div className="mt-0.5 text-[10px] text-muted-foreground/50">{dateStr}</div>
    </div>
  )
}

// ── 개별 행 ──

interface HistoryRowProps<T> {
  item: HistoryItem<T>
  active: boolean
  selected: boolean
  onToggleSelect: (id: string) => void
  onPin?: (id: string) => void
  onSelect: (item: HistoryItem<T>) => void
  renderItem?: (item: HistoryItem<T>) => ReactNode
}

const HistoryRow = memo(function HistoryRow<T>({
  item,
  active,
  selected,
  onToggleSelect,
  onPin,
  onSelect,
  renderItem,
}: HistoryRowProps<T>): ReactNode {
  return (
    <div
      className={cn(
        'group relative rounded py-2 transition',
        active && 'bg-primary/5 ring-1 ring-primary/20',
        selected && !active && 'bg-muted/40',
        item.hasResult && 'cursor-pointer hover:bg-muted/30',
      )}
      onClick={() => item.hasResult && onSelect(item)}
    >
      <div className="flex items-start gap-1.5 px-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(item.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-3 w-3 shrink-0 rounded border-gray-300 accent-primary"
        />

        {renderItem ? renderItem(item) : <DefaultItemContent item={item} />}

        {onPin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onPin(item.id)
            }}
            className={cn(
              'mt-0.5 shrink-0 rounded p-0.5 transition-colors',
              item.pinned ? 'text-primary' : 'text-muted-foreground/20 hover:text-primary',
            )}
            title={item.pinned ? '고정 해제' : '상단 고정'}
          >
            <Pin className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  )
}) as <T>(props: HistoryRowProps<T>) => ReactNode

// ── 메인 사이드바 ──

export function UnifiedHistorySidebar<T>({
  items,
  onSelect,
  onPin,
  onDelete,
  onDeleteMultiple,
  title = '최근 분석',
  emptyMessage = '분석을 실행하면\n여기에 기록됩니다',
  renderItem,
  actionSlot,
  toolbarSlot,
  activeId = null,
  defaultOpen = true,
}: UnifiedHistorySidebarProps<T>): ReactNode {
  const [open, setOpen] = useState(defaultOpen)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // items가 바뀌면 현재 목록에 없는 stale selection 정리
  const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items])
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev
      const cleaned = new Set([...prev].filter((id) => itemIds.has(id)))
      return cleaned.size === prev.size ? prev : cleaned
    })
  }, [itemIds])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDeleteSelected = useCallback(() => {
    if (onDeleteMultiple) {
      onDeleteMultiple(selectedIds)
    } else if (onDelete) {
      selectedIds.forEach((id) => onDelete(id))
    }
    setSelectedIds(new Set())
  }, [selectedIds, onDeleteMultiple, onDelete])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(items.map((e) => e.id)))
    }
  }, [selectedIds.size, items])

  const allSelected = useMemo(
    () => items.length > 0 && selectedIds.size === items.length,
    [items.length, selectedIds.size],
  )
  const someSelected = selectedIds.size > 0 && selectedIds.size < items.length

  // ── 접힌 상태: 아이콘만 ──

  if (!open) {
    return (
      <div className="hidden lg:block">
        <div className="sticky top-24">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="group relative flex h-8 w-8 items-center justify-center rounded-full border border-border/60 text-muted-foreground/50 transition-all hover:border-border hover:bg-muted/50 hover:text-foreground"
            title="히스토리 패널 열기"
          >
            <PanelRightOpen className="h-4 w-4" />
            {items.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {items.length > 99 ? '99+' : items.length}
              </span>
            )}
          </button>
        </div>
      </div>
    )
  }

  // ── 펼친 상태 ──

  return (
    <div className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-24">
        {/* 헤더 */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">{title}</h2>
            {items.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                {items.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {actionSlot}
            {selectedIds.size > 0 && (onDelete || onDeleteMultiple) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-1.5 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDeleteSelected}
              >
                <Trash2 className="mr-0.5 h-3 w-3" />
                {selectedIds.size}건
              </Button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-muted-foreground/30 transition-colors hover:bg-muted hover:text-foreground"
              title="패널 접기"
            >
              <PanelRightClose className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 툴바 슬롯 (검색, 필터 등) */}
        {toolbarSlot && <div className="mb-2">{toolbarSlot}</div>}

        {/* 전체 선택 */}
        {items.length > 1 && (onDelete || onDeleteMultiple) && (
          <div className="mb-1 flex items-center gap-1.5 pl-0.5">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = someSelected
              }}
              onChange={handleSelectAll}
              className="h-3 w-3 rounded border-gray-300 accent-primary"
              title="전체 선택"
            />
            <span className="text-[11px] text-muted-foreground/50">전체 선택</span>
          </div>
        )}

        {/* 콘텐츠 */}
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
            <p className="whitespace-pre-line text-xs text-muted-foreground/50">{emptyMessage}</p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-12rem)] divide-y divide-border/30 overflow-y-auto">
            {items.map((item) => (
              <HistoryRow
                key={item.id}
                item={item}
                active={item.id === activeId}
                selected={selectedIds.has(item.id)}
                onToggleSelect={handleToggleSelect}
                onPin={onPin}
                onSelect={onSelect}
                renderItem={renderItem}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
