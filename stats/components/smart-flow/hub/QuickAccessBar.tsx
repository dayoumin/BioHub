'use client'

/**
 * QuickAccessBar — 최근 분석 카드 리스트 (2칼럼 그리드)
 *
 * Stitch 시안 기반:
 * - 카드 스타일 히스토리 (상태 아이콘 + 메서드명 + p-value + 시간)
 * - 2칼럼 그리드 레이아웃
 * - 호버 시 더보기 메뉴 (핀/삭제)
 * - 고정(pinned) 항목은 테두리 강조
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Clock,
  CheckCircle2,
  Loader2,
  MoreVertical,
  X,
  Pin,
  PinOff,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import {
  usePinnedHistoryIds,
  MAX_PINNED,
  MAX_VISIBLE_PILLS,
} from '@/lib/utils/pinned-history-storage'
import { toast } from 'sonner'

// ===== Helpers =====

function formatTimeAgo(
  date: Date,
  timeAgo: { justNow: string; minutesAgo: (n: number) => string; hoursAgo: (n: number) => string; daysAgo: (n: number) => string }
): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffInSeconds < 60) return timeAgo.justNow
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return timeAgo.minutesAgo(diffInMinutes)
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return timeAgo.hoursAgo(diffInHours)
  const diffInDays = Math.floor(diffInHours / 24)
  return timeAgo.daysAgo(diffInDays)
}

/** results에서 p-value 추출 */
function extractPValue(results: Record<string, unknown> | null): number | null {
  if (!results) return null
  const candidates = ['pValue', 'p_value', 'p', 'pval']
  for (const key of candidates) {
    const val = results[key]
    if (typeof val === 'number' && !isNaN(val)) return val
  }
  return null
}

// ===== Types =====

interface HistoryCard {
  id: string
  method: { id: string; name: string; category: string; description?: string } | null
  timestamp: Date
  timeAgo: string
  isPinned: boolean
  pValue: number | null
  hasResults: boolean
  name: string
  dataFileName: string
}

// ===== Props =====

interface QuickAccessBarProps {
  onQuickAnalysis: (methodId: string) => void
  onHistoryClick: (historyId: string) => void
  onHistoryDelete: (historyId: string) => Promise<void>
  onShowMore?: () => void
}

// ===== Component =====

export function QuickAccessBar({ onHistoryClick, onHistoryDelete, onShowMore }: QuickAccessBarProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const { analysisHistory } = useSmartFlowStore()

  // Pin & delete state
  const [pinnedIds, setPinnedIds] = usePinnedHistoryIds()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // 삭제된 히스토리 ID가 pinnedIds에 남아있으면 정리
  useEffect(() => {
    const validIds = new Set(analysisHistory.map(h => h.id))
    setPinnedIds(prev => {
      const cleaned = prev.filter(id => validIds.has(id))
      return cleaned.length !== prev.length ? cleaned : prev
    })
  }, [analysisHistory, setPinnedIds])

  // pinned 우선 → 최신순
  const visibleHistory = useMemo((): HistoryCard[] => {
    const pinnedSet = new Set(pinnedIds)

    const mapEntry = (h: typeof analysisHistory[number], pinned: boolean): HistoryCard => ({
      id: h.id,
      method: h.method,
      timestamp: h.timestamp,
      timeAgo: formatTimeAgo(new Date(h.timestamp), t.hub.timeAgo),
      isPinned: pinned,
      pValue: extractPValue(h.results),
      hasResults: h.results !== null,
      name: h.name || h.method?.name || t.hub.cards.unknownMethod,
      dataFileName: h.dataFileName || '',
    })

    const pinned = analysisHistory
      .filter(h => pinnedSet.has(h.id))
      .map(h => mapEntry(h, true))

    const unpinned = analysisHistory
      .filter(h => !pinnedSet.has(h.id))
      .map(h => mapEntry(h, false))

    const remaining = Math.max(0, MAX_VISIBLE_PILLS - pinned.length)
    return [...pinned, ...unpinned.slice(0, remaining)]
  }, [analysisHistory, pinnedIds, t])

  // Delete handler
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return
    await onHistoryDelete(deleteConfirmId)
    setPinnedIds(prev => {
      if (!prev.includes(deleteConfirmId)) return prev
      return prev.filter(id => id !== deleteConfirmId)
    })
    setDeleteConfirmId(null)
  }, [deleteConfirmId, onHistoryDelete, setPinnedIds])

  // Pin toggle handler
  const handleTogglePin = useCallback((historyId: string) => {
    setPinnedIds(prev => {
      if (prev.includes(historyId)) {
        return prev.filter(id => id !== historyId)
      }
      if (prev.length >= MAX_PINNED) {
        toast.info(t.history.tooltips.maxPinned(MAX_PINNED))
        return prev
      }
      return [...prev, historyId]
    })
  }, [setPinnedIds, t])

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{t.hub.cards.recentTitle}</h2>
        {analysisHistory.length > MAX_VISIBLE_PILLS && onShowMore && (
          <button
            type="button"
            onClick={onShowMore}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {t.hub.cards.showMore(analysisHistory.length)}
          </button>
        )}
      </div>

      {visibleHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border">
          <Clock className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground/60">{t.hub.cards.emptyTitle}</p>
          <p className="text-xs text-muted-foreground/40 mt-1">{t.hub.cards.emptyDescription}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {visibleHistory.map(h => (
            <div
              key={h.id}
              className={cn(
                'group flex items-center justify-between p-4 rounded-xl',
                'border border-border bg-card',
                'hover:shadow-sm transition-shadow cursor-pointer',
                h.isPinned && 'border-primary/20 bg-primary/[0.02]',
              )}
              onClick={() => onHistoryClick(h.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') onHistoryClick(h.id) }}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* 상태 아이콘 */}
                {h.hasResults ? (
                  <div className="shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="shrink-0 bg-primary/10 text-primary p-2 rounded-lg">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                )}

                {/* 메서드명 + 데이터 + 메타 */}
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {h.method?.name || h.name}
                    {h.dataFileName && (
                      <span className="font-normal text-muted-foreground"> — {h.dataFileName}</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {h.hasResults ? t.hub.recentStatus.completed : t.hub.recentStatus.inProgress}
                    {h.pValue !== null && (
                      <>, <span className="font-mono text-[11px]">
                        p={h.pValue < 0.001 ? '<0.001' : h.pValue.toFixed(3)}
                      </span></>
                    )}
                    <span className="mx-1">·</span>
                    {h.timeAgo}
                  </p>
                </div>
              </div>

              {/* 액션 메뉴 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                      'p-1.5 rounded-md text-muted-foreground/40',
                      'hover:text-foreground hover:bg-accent',
                      'opacity-0 group-hover:opacity-100 transition-all',
                      'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    )}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  <DropdownMenuItem onClick={() => handleTogglePin(h.id)}>
                    {h.isPinned ? (
                      <><PinOff className="w-3.5 h-3.5 mr-2" />{t.history.tooltips.unpin}</>
                    ) : (
                      <><Pin className="w-3.5 h-3.5 mr-2" />{t.history.tooltips.pin}</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteConfirmId(h.id)}
                  >
                    <X className="w-3.5 h-3.5 mr-2" />
                    {t.history.tooltips.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.history.dialogs.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.history.dialogs.deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.history.buttons.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              {t.history.buttons.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}
