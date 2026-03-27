'use client'

/**
 * Bio-Tools 히스토리 사이드바 — UnifiedHistorySidebar 래퍼
 *
 * 기존 BioToolHistoryPopover의 데이터 로직을 유지하면서
 * UI를 공통 UnifiedHistorySidebar로 위임.
 */

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from 'react'
import { UnifiedHistorySidebar } from '@/components/common/UnifiedHistorySidebar'
import { toBioToolHistoryItems } from '@/lib/utils/history-adapters'
import type { HistoryItem } from '@/types/history'
import {
  loadBioToolHistory,
  deleteBioToolEntries,
  togglePinBioToolEntry,
  BIO_HISTORY_KEY,
  BIO_HISTORY_CHANGE_EVENT,
  type BioToolHistoryEntry,
} from '@/lib/bio-tools/bio-tool-history'

interface BioToolSidebarProps {
  /** 현재 선택된 도구 ID (해당 도구 히스토리만 표시) */
  toolId: string | null
  /** 히스토리 항목 선택 시 */
  onLoadHistory: (entry: BioToolHistoryEntry) => void
}

export function BioToolSidebar({ toolId, onLoadHistory }: BioToolSidebarProps): ReactNode {
  const [history, setHistory] = useState<BioToolHistoryEntry[]>([])
  const lastRawRef = useRef<string | null>(null)
  const lastToolIdRef = useRef<string | null>(toolId)

  const refreshHistory = useCallback((): void => {
    const raw = localStorage.getItem(BIO_HISTORY_KEY)
    const toolChanged = toolId !== lastToolIdRef.current
    // toolId가 바뀌면 같은 raw여도 필터 결과가 달라지므로 재실행
    if (raw === lastRawRef.current && !toolChanged) return
    lastRawRef.current = raw
    lastToolIdRef.current = toolId
    const all = loadBioToolHistory(raw)
    const filtered = toolId ? all.filter((e) => e.toolId === toolId) : all
    setHistory(filtered)
  }, [toolId])

  useEffect(() => {
    refreshHistory()
    const onChange = (): void => {
      if (skipNextEventRef.current) {
        skipNextEventRef.current = false
        return
      }
      refreshHistory()
    }
    window.addEventListener(BIO_HISTORY_CHANGE_EVENT, onChange)
    const onStorage = (e: StorageEvent): void => {
      if (e.key === BIO_HISTORY_KEY) refreshHistory()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(BIO_HISTORY_CHANGE_EVENT, onChange)
      window.removeEventListener('storage', onStorage)
    }
  }, [refreshHistory])

  const handleSelect = useCallback(
    (item: HistoryItem<BioToolHistoryEntry>) => {
      onLoadHistory(item.data)
    },
    [onLoadHistory],
  )

  // pin/delete 후 이벤트 리스너의 중복 갱신을 방지
  const skipNextEventRef = useRef(false)

  const handlePin = useCallback((id: string) => {
    skipNextEventRef.current = true
    const updated = togglePinBioToolEntry(id)
    const toolFiltered = toolId ? updated.filter((e) => e.toolId === toolId) : updated
    lastRawRef.current = localStorage.getItem(BIO_HISTORY_KEY)
    setHistory(toolFiltered)
  }, [toolId])

  const handleDeleteMultiple = useCallback(
    (ids: Set<string>) => {
      skipNextEventRef.current = true
      const remaining = deleteBioToolEntries(ids)
      const toolFiltered = toolId ? remaining.filter((e) => e.toolId === toolId) : remaining
      lastRawRef.current = localStorage.getItem(BIO_HISTORY_KEY)
      setHistory(toolFiltered)
    },
    [toolId],
  )

  const items = useMemo(() => toBioToolHistoryItems(history), [history])

  return (
    <UnifiedHistorySidebar<BioToolHistoryEntry>
      items={items}
      onSelect={handleSelect}
      onPin={handlePin}
      onDeleteMultiple={handleDeleteMultiple}
      title="분석 히스토리"
      emptyMessage={'분석을 실행하면\n여기에 기록됩니다'}
    />
  )
}
