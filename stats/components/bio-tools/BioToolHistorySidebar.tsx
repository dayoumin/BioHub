'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronRight, Clock, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import {
  loadBioToolHistory,
  deleteBioToolEntries,
  togglePinBioToolEntry,
  BIO_HISTORY_KEY,
  BIO_HISTORY_CHANGE_EVENT,
  type BioToolHistoryEntry,
} from '@/lib/bio-tools/bio-tool-history'

interface BioToolHistorySidebarProps {
  onLoadHistory: (entry: BioToolHistoryEntry) => void
}

export function BioToolHistorySidebar({ onLoadHistory }: BioToolHistorySidebarProps): React.ReactElement {
  const [open, setOpen] = useState(true)
  const [history, setHistory] = useState<BioToolHistoryEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastRawRef = useRef<string | null>(null)

  const refreshHistory = useCallback((): void => {
    const raw = localStorage.getItem(BIO_HISTORY_KEY)
    if (raw === lastRawRef.current) return
    lastRawRef.current = raw
    setHistory(loadBioToolHistory(raw))
  }, [])

  useEffect(() => { refreshHistory() }, [refreshHistory])

  useEffect(() => {
    function onHistoryChange(): void { refreshHistory() }
    window.addEventListener(BIO_HISTORY_CHANGE_EVENT, onHistoryChange)
    function onStorage(e: StorageEvent): void {
      if (e.key === BIO_HISTORY_KEY) refreshHistory()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(BIO_HISTORY_CHANGE_EVENT, onHistoryChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshHistory])

  const handleTogglePin = useCallback((id: string): void => {
    setHistory(togglePinBioToolEntry(id))
  }, [])

  const handleToggleSelect = useCallback((id: string): void => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDeleteSelected = useCallback((): void => {
    setHistory(deleteBioToolEntries(selectedIds))
    setSelectedIds(new Set())
  }, [selectedIds])

  // 접힌 상태
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
            <Clock className="h-4 w-4" />
            {history.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {history.length}
              </span>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="hidden w-52 shrink-0 lg:block">
      <div className="sticky top-24">
        {/* 헤더 */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
            <h2 className="text-xs font-semibold tracking-wide text-muted-foreground">최근 분석</h2>
            {history.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                {history.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {selectedIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-1.5 py-0.5 text-[11px] font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDeleteSelected}
              >
                {selectedIds.size}건 삭제
              </Button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded p-0.5 text-muted-foreground/30 transition-colors hover:bg-muted hover:text-foreground"
              title="패널 접기"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 전체 선택 */}
        {history.length > 1 && (
          <div className="mb-1 flex items-center gap-1.5 pl-0.5">
            <input
              type="checkbox"
              checked={selectedIds.size === history.length}
              ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < history.length }}
              onChange={() => {
                if (selectedIds.size === history.length) setSelectedIds(new Set())
                else setSelectedIds(new Set(history.map(e => e.id)))
              }}
              className="h-3 w-3 rounded border-gray-300 accent-primary"
              title="전체 선택"
            />
            <span className="text-[11px] text-muted-foreground/50">전체 선택</span>
          </div>
        )}

        {/* 콘텐츠 */}
        {history.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground/50">
              분석을 실행하면<br />여기에 기록됩니다
            </p>
          </div>
        ) : (
          <div className="max-h-[calc(100vh-12rem)] divide-y divide-border/30 overflow-y-auto">
            {history.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                selected={selectedIds.has(entry.id)}
                onToggleSelect={handleToggleSelect}
                onTogglePin={handleTogglePin}
                onClick={onLoadHistory}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── HistoryRow ──

interface HistoryRowProps {
  entry: BioToolHistoryEntry
  selected: boolean
  onToggleSelect: (id: string) => void
  onTogglePin: (id: string) => void
  onClick: (entry: BioToolHistoryEntry) => void
}

function HistoryRow({ entry, selected, onToggleSelect, onTogglePin, onClick }: HistoryRowProps): React.ReactElement {
  const tool = getBioToolById(entry.toolId)
  const Icon = tool?.icon

  const dateStr = new Date(entry.createdAt).toLocaleDateString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={`group relative rounded py-2 transition cursor-pointer hover:bg-muted/30 ${selected ? 'bg-muted/40' : ''}`}
      onClick={() => onClick(entry)}
    >
      <div className="flex items-start gap-1.5 px-1">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(entry.id)}
          onClick={(e) => e.stopPropagation()}
          className="mt-0.5 h-3 w-3 shrink-0 rounded border-gray-300 accent-primary"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 truncate text-xs leading-tight">
            {Icon && <Icon className="h-3 w-3 shrink-0 text-muted-foreground/50" />}
            <span className="font-medium">{entry.toolNameEn}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            <span className="truncate">{entry.csvFileName}</span>
            <span className="text-border">·</span>
            <span className="shrink-0">{dateStr}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePin(entry.id) }}
          className={`mt-0.5 shrink-0 rounded p-0.5 transition-colors ${entry.pinned ? 'text-primary' : 'text-muted-foreground/20 hover:text-primary'}`}
          title={entry.pinned ? '고정 해제' : '상단 고정'}
        >
          <Pin className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
