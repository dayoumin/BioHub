'use client'

/**
 * 유전학 히스토리 사이드바 — UnifiedHistorySidebar 래퍼
 *
 * 기존 HistorySidebar의 데이터 로직을 유지하면서
 * UI를 공통 UnifiedHistorySidebar로 위임.
 */

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { UnifiedHistorySidebar } from '@/components/common/UnifiedHistorySidebar'
import { toGeneticsHistoryItems } from '@/lib/utils/history-adapters'
import type { HistoryItem } from '@/types/history'
import type { AnalysisHistoryEntry } from '@/lib/genetics/analysis-history'
import {
  loadAnalysisHistory,
  deleteMultipleEntries,
  togglePinEntry,
  HISTORY_KEY,
  HISTORY_CHANGE_EVENT,
} from '@/lib/genetics/analysis-history'

export function GeneticsHistorySidebar(): ReactNode {
  const router = useRouter()
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([])
  const lastRawRef = useRef<string | null>(null)

  useEffect(() => {
    setActiveHistoryId(new URLSearchParams(window.location.search).get('history'))
  }, [])

  const refreshHistory = useCallback((): void => {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw === lastRawRef.current) return
    lastRawRef.current = raw
    setHistory(loadAnalysisHistory(raw))
  }, [])

  useEffect(() => {
    refreshHistory()
  }, [refreshHistory])

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

  const handleSelect = useCallback(
    (item: HistoryItem<AnalysisHistoryEntry>) => {
      setActiveHistoryId(item.id)
      router.push(`/genetics/barcoding?history=${item.id}`)
    },
    [router],
  )

  const handlePin = useCallback((id: string) => {
    setHistory(togglePinEntry(id))
  }, [])

  const handleDeleteMultiple = useCallback((ids: Set<string>) => {
    setHistory(deleteMultipleEntries(ids))
  }, [])

  const items = useMemo(() => toGeneticsHistoryItems(history), [history])

  // 커스텀 렌더: 종명 이탤릭 + 마커 + 일치도 인라인
  const renderItem = useCallback(
    (item: HistoryItem<AnalysisHistoryEntry>): ReactNode => {
      const entry = item.data
      const identityText =
        entry.topIdentity != null ? `${(entry.topIdentity * 100).toFixed(1)}%` : null

      return (
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs leading-tight">
            {entry.sampleName || entry.sequencePreview}
          </div>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
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
      )
    },
    [],
  )

  return (
    <UnifiedHistorySidebar<AnalysisHistoryEntry>
      items={items}
      onSelect={handleSelect}
      onPin={handlePin}
      onDeleteMultiple={handleDeleteMultiple}
      activeId={activeHistoryId}
      renderItem={renderItem}
    />
  )
}
