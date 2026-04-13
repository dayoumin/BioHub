'use client'

/**
 * 통계 분석 히스토리 사이드바 — UnifiedHistorySidebar 래퍼
 *
 * 기존 AnalysisHistoryPanel(Sheet)의 핵심 기능을 사이드바로 이전:
 * - 항상 표시되는 우측 사이드바 (lg 이상)
 * - 클릭: 결과 로드, 핀 토글, 삭제
 * - 고급 기능(내보내기, 재분석)은 per-item 드롭다운으로 접근
 */

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Pencil, RefreshCw, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { UnifiedHistorySidebar } from '@/components/common/UnifiedHistorySidebar'
import { toAnalysisHistoryItems } from '@/lib/utils/history-adapters'
import { useHistoryStore, type AnalysisHistory } from '@/lib/stores/history-store'
import { loadAndRestoreHistory } from '@/lib/stores/store-orchestration'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { useModeStore } from '@/lib/stores/mode-store'
import {
  usePinnedHistoryIds,
  MAX_PINNED,
  togglePinId,
} from '@/lib/utils/pinned-history-storage'
import { useTerminology } from '@/hooks/use-terminology'
import { toast } from 'sonner'
import { TOAST } from '@/lib/constants/toast-messages'
import { logger } from '@/lib/utils/logger'
import type { HistoryItem } from '@/types/history'

export function AnalysisHistorySidebar(): ReactNode {
  const t = useTerminology()
  const [pinnedIds, setPinnedIds] = usePinnedHistoryIds()
  const [renameTarget, setRenameTarget] = useState<{ id: string; name: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const hasInitializedHistoryRef = useRef(false)

  const {
    analysisHistory,
    currentHistoryId,
    deleteFromHistory,
    loadSettingsFromHistory,
    renameHistory,
    setCurrentHistoryId,
    setLoadedAiInterpretation,
    setLoadedInterpretationChat,
    setLoadedPaperDraft,
  } = useHistoryStore(useShallow((s) => ({
    analysisHistory: s.analysisHistory,
    currentHistoryId: s.currentHistoryId,
    deleteFromHistory: s.deleteFromHistory,
    loadSettingsFromHistory: s.loadSettingsFromHistory,
    renameHistory: s.renameHistory,
    setCurrentHistoryId: s.setCurrentHistoryId,
    setLoadedAiInterpretation: s.setLoadedAiInterpretation,
    setLoadedInterpretationChat: s.setLoadedInterpretationChat,
    setLoadedPaperDraft: s.setLoadedPaperDraft,
  })))

  // 삭제된 히스토리 ID가 pinnedIds에 남아있으면 정리 (stale pin 방어)
  useEffect(() => {
    if (analysisHistory.length === 0 && !hasInitializedHistoryRef.current) {
      return
    }
    hasInitializedHistoryRef.current = true
    const validIds = new Set(analysisHistory.map((h) => h.id))
    setPinnedIds((prev) => {
      const cleaned = prev.filter((id) => validIds.has(id))
      return cleaned.length !== prev.length ? cleaned : prev
    })
  }, [analysisHistory, setPinnedIds])

  // pinned 우선 정렬된 아이템
  const items = useMemo(() => {
    const all = toAnalysisHistoryItems(analysisHistory, pinnedIds)
    const pinnedSet = new Set(pinnedIds)
    return [
      ...all.filter((h) => pinnedSet.has(h.id)),
      ...all.filter((h) => !pinnedSet.has(h.id)),
    ]
  }, [analysisHistory, pinnedIds])

  const handleSelect = useCallback(
    async (item: HistoryItem<AnalysisHistory>) => {
      try {
        await loadAndRestoreHistory(item.id)
        useModeStore.getState().setShowHub(false)
      } catch (error) {
        logger.error('[AnalysisHistorySidebar] Failed to load history', { error })
        toast.error(TOAST.history.loadError)
      }
    },
    [],
  )

  const handlePin = useCallback(
    (id: string) => {
      setPinnedIds((prev) => {
        const result = togglePinId(prev, id, MAX_PINNED)
        if (result === null) {
          toast.info(t.history.tooltips.maxPinned(MAX_PINNED))
          return prev
        }
        return result
      })
    },
    [setPinnedIds, t],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteFromHistory(id)
      setPinnedIds((prev) => {
        if (!prev.includes(id)) return prev
        return prev.filter((pid) => pid !== id)
      })
    },
    [deleteFromHistory, setPinnedIds],
  )

  const handleRenameRequest = useCallback((id: string, name: string) => {
    setRenameTarget({ id, name })
    setRenameValue(name)
  }, [])

  const handleRenameOpenChange = useCallback((open: boolean) => {
    if (open) return
    setRenameTarget(null)
    setRenameValue('')
  }, [])

  const handleRenameSubmit = useCallback(async () => {
    if (!renameTarget) return

    const nextName = renameValue.trim()
    if (!nextName) return

    try {
      await renameHistory(renameTarget.id, nextName)
      handleRenameOpenChange(false)
    } catch (error) {
      logger.error('[AnalysisHistorySidebar] Failed to rename history', { error })
      toast.error(TOAST.history.renameError)
    }
  }, [handleRenameOpenChange, renameHistory, renameTarget, renameValue])

  const handleReanalyze = useCallback(
    async (historyId: string) => {
      try {
        const settings = await loadSettingsFromHistory(historyId)
        if (settings) {
          setCurrentHistoryId(null)
          setLoadedAiInterpretation(null)
          setLoadedInterpretationChat(null)
          setLoadedPaperDraft(null)
          useAnalysisStore.getState().restoreSettingsFromHistory(settings)
          const modeStore = useModeStore.getState()
          modeStore.setStepTrack('reanalysis')
          modeStore.setShowHub(false)
        }
      } catch (error) {
        logger.error('[AnalysisHistorySidebar] Failed to load settings', { error })
        toast.error(TOAST.history.settingsLoadError)
      }
    },
    [loadSettingsFromHistory, setCurrentHistoryId, setLoadedAiInterpretation, setLoadedInterpretationChat, setLoadedPaperDraft],
  )

  // 커스텀 렌더: 메서드 + p값 + 더보기 메뉴
  const renderItem = useCallback(
    (item: HistoryItem<AnalysisHistory>): ReactNode => {
      const entry = item.data
      const methodName = entry.method?.name
      const results = entry.results as Record<string, unknown> | null
      const pValue = results && typeof results.pValue === 'number' ? results.pValue : null

      return (
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-xs font-medium leading-tight">{entry.name}</span>
            {/* 더보기 메뉴 (재분석, 내보내기) */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/30 opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                  aria-label={t.history.labels.moreActions}
                  data-testid={`analysis-history-more-actions-${item.id}`}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-36"
                onClick={(event) => event.stopPropagation()}
              >
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    handleRenameRequest(item.id, entry.name)
                  }}
                  onClick={(event) => event.stopPropagation()}
                  data-testid={`analysis-history-rename-action-${item.id}`}
                >
                  <Pencil className="mr-2 h-3 w-3" />
                  <span className="text-xs">{t.history.tooltips.rename}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    void handleReanalyze(item.id)
                  }}
                  onClick={(event) => event.stopPropagation()}
                  data-testid={`analysis-history-reanalyze-action-${item.id}`}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  <span className="text-xs">{t.history.tooltips.reanalyze}</span>
                </DropdownMenuItem>
                {/* 내보내기: AnalysisHistoryPanel의 export 로직 추출 후 연결 예정 */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {methodName && (
            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{methodName}</div>
          )}
          <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <span className="truncate">{entry.dataFileName}</span>
            {pValue !== null && (
              <>
                <span className="text-border">·</span>
                <span className={pValue < 0.05 ? 'font-mono text-primary' : 'font-mono'}>
                  p={pValue.toFixed(4)}
                </span>
              </>
            )}
          </div>
        </div>
      )
    },
    [handleReanalyze, handleRenameRequest, t.history.tooltips.reanalyze, t.history.tooltips.rename],
  )

  return (
    <>
      <UnifiedHistorySidebar<AnalysisHistory>
        items={items}
        onSelect={handleSelect}
        onPin={handlePin}
        onDelete={handleDelete}
        activeId={currentHistoryId}
        title={t.history.sidebar.title}
        renderItem={renderItem}
      />
      <Dialog open={renameTarget !== null} onOpenChange={handleRenameOpenChange}>
        <DialogContent className="sm:max-w-md" data-testid="analysis-history-rename-dialog">
          <DialogHeader>
            <DialogTitle>{t.history.dialogs.renameTitle}</DialogTitle>
            <DialogDescription>{t.history.dialogs.renameDescription}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void handleRenameSubmit()
            }}
          >
            <Input
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              placeholder={t.history.dialogs.renamePlaceholder}
              autoFocus
              data-testid="analysis-history-rename-input"
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleRenameOpenChange(false)}
                data-testid="analysis-history-rename-cancel"
              >
                {t.history.buttons.cancel}
              </Button>
              <Button
                type="submit"
                disabled={renameValue.trim().length === 0 || renameValue.trim() === renameTarget?.name}
                data-testid="analysis-history-rename-save"
              >
                {t.history.buttons.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
