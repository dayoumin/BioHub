'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, PanelRightClose, Pin, X } from 'lucide-react'
import type { AnalysisHistoryEntry } from '@/lib/genetics/analysis-history'
import { loadAnalysisHistory, deleteMultipleEntries, deleteAnalysisEntry, togglePinEntry, HISTORY_KEY, HISTORY_CHANGE_EVENT } from '@/lib/genetics/analysis-history'
import { formatTimeAgo } from '@/lib/utils/format-time'

export function HistorySidebar() {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastRawRef = useRef<string | null>(null)
  const userClosedRef = useRef(false)

  function refreshHistory(): void {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw === lastRawRef.current) return
    lastRawRef.current = raw
    const loaded = loadAnalysisHistory(raw)
    setHistory(loaded)
    // 사용자가 명시적으로 닫은 경우 자동으로 다시 열지 않음
    if (loaded.length > 0 && !userClosedRef.current) setOpen(true)
  }

  useEffect(() => {
    refreshHistory()
  }, [])

  useEffect(() => {
    function onHistoryChange(): void { refreshHistory() }
    // 같은 탭: 커스텀 이벤트 (saveAnalysisHistory가 발행)
    window.addEventListener(HISTORY_CHANGE_EVENT, onHistoryChange)
    // 다른 탭: storage 이벤트 (같은 탭에서는 발화하지 않음)
    function onStorage(e: StorageEvent): void {
      if (e.key === HISTORY_KEY) refreshHistory()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(HISTORY_CHANGE_EVENT, onHistoryChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const handleDelete = (id: string): void => setHistory(deleteAnalysisEntry(id))
  const handleTogglePin = (id: string): void => setHistory(togglePinEntry(id))

  const handleToggleSelect = (id: string): void => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDeleteSelected = (): void => {
    setHistory(deleteMultipleEntries(selectedIds))
    setSelectedIds(new Set())
  }

  if (history.length === 0) return null

  // 닫혀 있을 때 — 열기 버튼만
  if (!open) {
    return (
      <div className="hidden lg:block">
        <button
          type="button"
          onClick={() => { userClosedRef.current = false; setOpen(true) }}
          className="fixed right-4 top-24 z-10 flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition hover:border-primary/20 hover:text-foreground"
        >
          <Clock className="h-3.5 w-3.5" />
          최근 분석
          <span className="rounded-full bg-muted px-1.5 text-[10px]">{history.length}</span>
        </button>
      </div>
    )
  }

  return (
    <div className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24">
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={history.length > 0 && selectedIds.size === history.length}
                ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < history.length }}
                onChange={() => {
                  if (selectedIds.size === history.length) setSelectedIds(new Set())
                  else setSelectedIds(new Set(history.map(e => e.id)))
                }}
                className="h-3 w-3 rounded border-gray-300 accent-primary"
                title="전체 선택"
              />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">최근 분석</h2>
            </div>
            <div className="flex items-center gap-1">
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium text-destructive transition hover:bg-destructive/10"
                >
                  {selectedIds.size}건 삭제
                </button>
              )}
              <button
                type="button"
                onClick={() => { userClosedRef.current = true; setOpen(false) }}
                className="rounded p-1 text-muted-foreground/40 transition hover:text-foreground"
                title="패널 닫기"
              >
                <PanelRightClose className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="max-h-[calc(100vh-10rem)] divide-y divide-border/50 overflow-y-auto">
            {history.map((entry) => (
              <HistoryRow
                key={entry.id}
                entry={entry}
                selected={selectedIds.has(entry.id)}
                onToggleSelect={handleToggleSelect}
                onTogglePin={handleTogglePin}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── HistoryRow ──

interface HistoryRowProps {
  entry: AnalysisHistoryEntry
  selected: boolean
  onToggleSelect: (id: string) => void
  onTogglePin: (id: string) => void
  onDelete: (id: string) => void
}

function HistoryRow({ entry, selected, onToggleSelect, onTogglePin, onDelete }: HistoryRowProps) {
  const identityText = entry.topIdentity != null
    ? `${(entry.topIdentity * 100).toFixed(1)}%`
    : null

  return (
    <div className={`group relative px-3 py-2 transition ${selected ? 'bg-primary/5' : ''}`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(entry.id)}
          className="mt-0.5 h-3 w-3 shrink-0 rounded border-gray-300 accent-primary"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px]">
            {entry.pinned && <Pin className="mr-1 inline-block h-2.5 w-2.5 text-primary" />}
            {entry.sampleName || entry.sequencePreview}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-gray-700">
            {entry.topSpecies && entry.topSpecies !== entry.sampleName && (
              <>
                <span className="truncate italic">{entry.topSpecies}</span>
                <span className="text-border">·</span>
              </>
            )}
            <span>{entry.marker}</span>
            {identityText && (
              <>
                <span className="text-border">·</span>
                <span className="font-mono">{identityText}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="absolute right-2 top-1.5 hidden items-center gap-0.5 group-hover:flex">
        <button type="button" onClick={() => onTogglePin(entry.id)}
          className={`rounded p-0.5 transition ${entry.pinned ? 'text-primary' : 'text-muted-foreground/40 hover:text-primary'}`}
          title={entry.pinned ? '고정 해제' : '상단 고정'}>
          <Pin className="h-2.5 w-2.5" />
        </button>
        <button type="button" onClick={() => onDelete(entry.id)}
          className="rounded p-0.5 text-muted-foreground/40 transition hover:text-destructive" title="삭제">
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  )
}
