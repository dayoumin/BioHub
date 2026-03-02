'use client'

/**
 * QuickAccessBar — 빠른 분석 pills + 최근 분석 히스토리
 *
 * - 빠른 분석: 커스텀 가능한 메서드 pill 목록
 * - 최근 분석: 히스토리 미리보기 (pinned 우선 + 최신순, 최대 5개)
 *   - 항상 표시 (0개여도 빈 상태 메시지)
 *   - 호버 시 X 삭제 버튼
 *   - 고정(pinned) 항목은 primary dot + 테두리 강조
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Clock,
  Settings2,
  X,
  Pin,
  PinOff,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
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
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import {
  usePinnedHistoryIds,
  MAX_PINNED,
  MAX_VISIBLE_PILLS,
} from '@/lib/utils/pinned-history-storage'
import { toast } from 'sonner'

// ===== Constants =====

const STORAGE_KEY = 'main-hub-quick-analysis'
const DEFAULT_QUICK_METHODS = ['t-test', 'anova', 'correlation', 'regression', 'chi-square']

const METHODS_BY_CATEGORY = Object.entries(STATISTICAL_METHODS).reduce((acc, [id, method]) => {
  if (method.hasOwnPage !== false) {
    const cat = method.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push({
      id,
      name: method.koreanName || method.name,
      description: method.koreanDescription || method.description
    })
  }
  return acc
}, {} as Record<string, Array<{ id: string; name: string; description: string }>>)

// ===== Helpers =====

function loadQuickMethods(): string[] {
  if (typeof window === 'undefined') return DEFAULT_QUICK_METHODS
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_QUICK_METHODS
}

function saveQuickMethods(methods: string[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(methods))
  } catch {
    // ignore
  }
}

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

// ===== Types =====

interface HistoryPill {
  id: string
  method: { id: string; name: string; category: string; description?: string } | null
  timestamp: Date
  timeAgo: string
  isPinned: boolean
}

// ===== Props =====

interface QuickAccessBarProps {
  onQuickAnalysis: (methodId: string) => void
  onHistoryClick: (historyId: string) => void
  onHistoryDelete: (historyId: string) => Promise<void>
}

// ===== Component =====

export function QuickAccessBar({ onQuickAnalysis, onHistoryClick, onHistoryDelete }: QuickAccessBarProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const { analysisHistory } = useSmartFlowStore()

  // Quick methods state — lazy initializer로 초기 flash 방지
  const [quickMethods, setQuickMethods] = useState<string[]>(() => loadQuickMethods())
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMethods, setEditingMethods] = useState<string[]>([])

  // Pin & delete state
  const [pinnedIds, setPinnedIds] = usePinnedHistoryIds()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  // 삭제된 히스토리 ID가 pinnedIds에 남아있으면 정리 (방어적 백업)
  useEffect(() => {
    const validIds = new Set(analysisHistory.map(h => h.id))
    setPinnedIds(prev => {
      const cleaned = prev.filter(id => validIds.has(id))
      return cleaned.length !== prev.length ? cleaned : prev
    })
  }, [analysisHistory, setPinnedIds])

  const quickMethodsInfo = useMemo(() => {
    return quickMethods
      .map(id => {
        const method = STATISTICAL_METHODS[id]
        return method ? { id, name: t.hub.quickMethodNames[id] || method.koreanName || method.name } : null
      })
      .filter(Boolean) as Array<{ id: string; name: string }>
  }, [quickMethods, t])

  // pinned 우선 → 최신순, 최대 MAX_VISIBLE_PILLS개
  const visibleHistory = useMemo((): HistoryPill[] => {
    const pinnedSet = new Set(pinnedIds)

    const pinned = analysisHistory
      .filter(h => pinnedSet.has(h.id))
      .map(h => ({
        id: h.id,
        method: h.method,
        timestamp: h.timestamp,
        timeAgo: formatTimeAgo(new Date(h.timestamp), t.hub.timeAgo),
        isPinned: true,
      }))

    const unpinned = analysisHistory
      .filter(h => !pinnedSet.has(h.id))
      .map(h => ({
        id: h.id,
        method: h.method,
        timestamp: h.timestamp,
        timeAgo: formatTimeAgo(new Date(h.timestamp), t.hub.timeAgo),
        isPinned: false,
      }))

    const remaining = Math.max(0, MAX_VISIBLE_PILLS - pinned.length)
    return [...pinned, ...unpinned.slice(0, remaining)]
  }, [analysisHistory, pinnedIds, t])

  // Edit dialog handlers
  const handleOpenEdit = useCallback(() => {
    setEditingMethods([...quickMethods])
    setShowEditDialog(true)
  }, [quickMethods])

  const handleSaveEdit = useCallback(() => {
    setQuickMethods(editingMethods)
    saveQuickMethods(editingMethods)
    setShowEditDialog(false)
  }, [editingMethods])

  const handleToggleMethod = useCallback((methodId: string) => {
    setEditingMethods(prev =>
      prev.includes(methodId)
        ? prev.filter(id => id !== methodId)
        : [...prev, methodId]
    )
  }, [])

  // Delete handler
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return
    await onHistoryDelete(deleteConfirmId)
    // pinnedIds에서도 제거 (functional updater로 stale closure 방지)
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
      className="space-y-3"
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      {/* 빠른 분석 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Zap className="w-3.5 h-3.5" />
          <span>{t.hub.quickAnalysis.title}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {quickMethodsInfo.map(method => (
            <button
              key={method.id}
              type="button"
              onClick={() => onQuickAnalysis(method.id)}
              className={cn(
                'px-2.5 py-1 text-xs rounded-full border',
                'bg-background/60 hover:bg-accent',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
              )}
            >
              {method.name}
            </button>
          ))}

          <button
            type="button"
            onClick={handleOpenEdit}
            className="p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title={t.hub.quickAnalysis.editTooltip}
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 최근 분석 — 항상 표시 */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <Clock className="w-3.5 h-3.5" />
          <span>{t.hub.cards.recentTitle}</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {visibleHistory.length === 0 ? (
            <span className="text-xs text-muted-foreground/50 italic">
              {t.hub.cards.emptyTitle}
            </span>
          ) : (
            visibleHistory.map(h => (
              <div key={h.id} className="group relative flex items-center">
                {/* Pin indicator dot — 2px, 고정 시 항상 표시 */}
                {h.isPinned && (
                  <span className="absolute -top-0.5 -left-0.5 w-2 h-2 rounded-full bg-primary z-10" />
                )}

                <button
                  type="button"
                  onClick={() => onHistoryClick(h.id)}
                  className={cn(
                    'flex items-center gap-1 pl-2.5 pr-10 py-1 text-xs rounded-full border',
                    'bg-background/60 hover:bg-accent',
                    'transition-colors duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                    h.isPinned && 'border-primary/30 bg-primary/5'
                  )}
                >
                  <span className="truncate max-w-[120px]">
                    {h.method?.name || t.hub.cards.unknownMethod}
                  </span>
                  <span className="text-muted-foreground/50 shrink-0">
                    {h.timeAgo}
                  </span>
                </button>

                {/* Hover actions — pin toggle + delete */}
                <div className={cn(
                  'absolute right-1 top-1/2 -translate-y-1/2',
                  'flex items-center gap-0.5',
                  'pointer-events-none group-hover:pointer-events-auto',
                  'opacity-0 group-hover:opacity-100',
                  'transition-all duration-150',
                )}>
                  {/* Pin toggle */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleTogglePin(h.id) }}
                    className={cn(
                      'p-0.5 rounded-full',
                      'text-muted-foreground/60',
                      'hover:!text-primary hover:bg-primary/10',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40',
                      'focus-visible:text-primary focus-visible:pointer-events-auto'
                    )}
                    title={h.isPinned ? t.history.tooltips.unpin : t.history.tooltips.pin}
                  >
                    {h.isPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(h.id) }}
                    className={cn(
                      'p-0.5 rounded-full',
                      'text-muted-foreground/60',
                      'hover:!text-destructive hover:bg-destructive/10',
                      'transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive/40',
                      'focus-visible:text-destructive focus-visible:pointer-events-auto'
                    )}
                    title={t.history.tooltips.delete}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 편집 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t.hub.editDialog.title}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-4">
              {Object.entries(METHODS_BY_CATEGORY).map(([category, methods]) => (
                <div key={category}>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {t.hub.categoryLabels[category] || category}
                  </div>
                  <div className="space-y-1">
                    {methods.map(method => (
                      <label
                        key={method.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={editingMethods.includes(method.id)}
                          onCheckedChange={() => handleToggleMethod(method.id)}
                        />
                        <span className="text-sm">{method.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                {t.hub.editDialog.selectedCount(editingMethods.length)}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowEditDialog(false)}>
                  {t.hub.editDialog.cancel}
                </Button>
                <Button size="sm" onClick={handleSaveEdit}>
                  {t.hub.editDialog.save}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
