'use client'

import { useState, useEffect, useCallback } from 'react'
import { Clock } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  loadBioToolHistory,
  BIO_HISTORY_KEY,
  BIO_HISTORY_CHANGE_EVENT,
  type BioToolHistoryEntry,
} from '@/lib/bio-tools/bio-tool-history'

interface BioToolHistoryPopoverProps {
  toolId: string
  onLoadHistory: (entry: BioToolHistoryEntry) => void
}

export function BioToolHistoryPopover({
  toolId,
  onLoadHistory,
}: BioToolHistoryPopoverProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<BioToolHistoryEntry[]>([])

  const refreshHistory = useCallback((): void => {
    const all = loadBioToolHistory()
    const filtered = all.filter((e) => e.toolId === toolId)
    setHistory((prev) => {
      if (prev.length === filtered.length && prev.every((e, i) => e.id === filtered[i]?.id)) return prev
      return filtered
    })
  }, [toolId])

  useEffect(() => {
    refreshHistory()
    function onChange(): void { refreshHistory() }
    window.addEventListener(BIO_HISTORY_CHANGE_EVENT, onChange)
    function onStorage(e: StorageEvent): void {
      if (e.key === BIO_HISTORY_KEY) refreshHistory()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(BIO_HISTORY_CHANGE_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshHistory])

  const handleSelect = useCallback(
    (entry: BioToolHistoryEntry): void => {
      setOpen(false)
      onLoadHistory(entry)
    },
    [onLoadHistory],
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
          aria-label="분석 히스토리"
        >
          <Clock className="w-4 h-4" />
          {history.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {history.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <div className="px-3 py-2 border-b border-border">
          <h3 className="text-xs font-semibold text-muted-foreground">분석 히스토리</h3>
        </div>
        {history.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-muted-foreground/50">
              분석을 실행하면 여기에 기록됩니다
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto divide-y divide-border/30">
            {history.map((entry) => {
              const dateStr = new Date(entry.createdAt).toLocaleDateString(
                'ko-KR',
                { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' },
              )
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => handleSelect(entry)}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium truncate">{entry.csvFileName}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{dateStr}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
