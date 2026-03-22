'use client'

import { useState, useEffect, useRef } from 'react'
import { Clock, PanelRightClose, Pin, X } from 'lucide-react'
import type { AnalysisHistoryEntry } from '@/lib/genetics/analysis-history'
import { loadAnalysisHistory, deleteMultipleEntries, deleteAnalysisEntry, togglePinEntry, HISTORY_KEY } from '@/lib/genetics/analysis-history'
import { formatTimeAgo } from '@/lib/utils/format-time'

export function HistorySidebar() {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const lastRawRef = useRef<string | null>(null)

  /** localStorage에서 히스토리를 읽되, 변경이 없으면 상태 업데이트 생략 */
  function refreshHistory(): void {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw === lastRawRef.current) return
    lastRawRef.current = raw
    const loaded = loadAnalysisHistory()
    setHistory(loaded)
    if (loaded.length > 0 && !open) setOpen(true)
  }

  useEffect(() => {
    refreshHistory()
  }, [])

  // 같은 탭에서 분석 완료 시 갱신 (saveAnalysisHistory가 커스텀 이벤트 발행)
  // + 다른 탭에서 변경 시 갱신 (window focus)
  useEffect(() => {
    function onHistoryChange(): void { refreshHistory() }
    window.addEventListener('genetics-history-changed', onHistoryChange)
    window.addEventListener('focus', onHistoryChange)
    return () => {
      window.removeEventListener('genetics-history-changed', onHistoryChange)
      window.removeEventListener('focus', onHistoryChange)
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
          onClick={() => setOpen(true)}
          className="fixed right-4 top-20 z-10 flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground shadow-sm transition hover:border-primary/20 hover:text-foreground"
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
      <div className="sticky top-8">
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
                onClick={() => setOpen(false)}
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
  const identityColor = entry.topIdentity != null
    ? entry.topIdentity >= 0.97 ? 'text-green-600'
    : entry.topIdentity >= 0.90 ? 'text-amber-600'
    : 'text-red-500'
    : ''

  return (
    <div className={`group relative px-4 py-3 transition ${selected ? 'bg-primary/5' : ''}`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(entry.id)}
          className="mt-0.5 h-3 w-3 shrink-0 rounded border-gray-300 accent-primary"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-medium">
            {entry.pinned && <Pin className="mr-1 inline-block h-2.5 w-2.5 text-primary" />}
            {entry.sampleName || entry.topSpecies || entry.sequencePreview}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
            {entry.sampleName && entry.topSpecies && (
              <>
                <span className="truncate italic">{entry.topSpecies}</span>
                <span className="text-border">·</span>
              </>
            )}
            <span>{entry.marker}</span>
            <span className="text-border">·</span>
            <span>{formatTimeAgo(entry.createdAt)}</span>
            {identityText && (
              <>
                <span className="text-border">·</span>
                <span className={`font-mono font-semibold ${identityColor}`}>{identityText}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 호버 시 액션 */}
      <div className="absolute right-2 top-2 hidden items-center gap-0.5 group-hover:flex">
        <button
          type="button"
          onClick={() => onTogglePin(entry.id)}
          className={`rounded p-1 transition ${entry.pinned ? 'text-primary' : 'text-muted-foreground/40 hover:text-primary'}`}
          title={entry.pinned ? '고정 해제' : '상단 고정'}
        >
          <Pin className="h-3 w-3" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(entry.id)}
          className="rounded p-1 text-muted-foreground/40 transition hover:text-destructive"
          title="삭제"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  )
}
