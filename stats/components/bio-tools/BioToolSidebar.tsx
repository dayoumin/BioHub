'use client'

/**
 * Bio-Tools 히스토리 사이드바 — UnifiedHistorySidebar 래퍼
 *
 * 기존 BioToolHistoryPopover의 데이터 로직을 유지하면서
 * UI를 공통 UnifiedHistorySidebar로 위임.
 */

import { memo, useCallback, useMemo, type ReactNode } from 'react'
import { useTerminology } from '@/hooks/use-terminology'
import { UnifiedHistorySidebar } from '@/components/common/UnifiedHistorySidebar'
import { toBioToolHistoryItems } from '@/lib/utils/history-adapters'
import { useLocalStorageSync } from '@/lib/hooks/use-local-storage-sync'
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

export const BioToolSidebar = memo(function BioToolSidebar({ toolId, onLoadHistory }: BioToolSidebarProps): ReactNode {
  const t = useTerminology()
  const parser = useCallback(
    (raw: string | null): BioToolHistoryEntry[] => {
      const all = loadBioToolHistory(raw)
      return toolId ? all.filter((e) => e.toolId === toolId) : all
    },
    [toolId],
  )

  const { value: history } = useLocalStorageSync<BioToolHistoryEntry[]>(
    BIO_HISTORY_KEY,
    BIO_HISTORY_CHANGE_EVENT,
    parser,
  )

  const handleSelect = useCallback(
    (item: HistoryItem<BioToolHistoryEntry>) => {
      onLoadHistory(item.data)
    },
    [onLoadHistory],
  )

  const handlePin = useCallback((id: string) => {
    togglePinBioToolEntry(id)
  }, [])

  const handleDeleteMultiple = useCallback(
    (ids: Set<string>) => {
      deleteBioToolEntries(ids)
    },
    [],
  )

  const items = useMemo(() => toBioToolHistoryItems(history), [history])

  return (
    <UnifiedHistorySidebar<BioToolHistoryEntry>
      items={items}
      onSelect={handleSelect}
      onPin={handlePin}
      onDeleteMultiple={handleDeleteMultiple}
      title={t.history.sidebar.bioTitle}
      emptyMessage={t.history.sidebar.bioEmpty}
    />
  )
})
