'use client'

/**
 * QuickAccessBar — 빠른 분석 pills + 최근 분석 히스토리
 *
 * 기존 ChatCentricHub의 빠른분석/히스토리 로직을 분리한 컴포넌트.
 * - 빠른 분석: 커스텀 가능한 메서드 pill 목록
 * - 최근 분석: 히스토리 미리보기 (최대 3개)
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Zap,
  Clock,
  Settings2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'

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

// ===== Props =====

interface QuickAccessBarProps {
  onQuickAnalysis: (methodId: string) => void
  onHistoryClick: (historyId: string) => void
}

// ===== Component =====

export function QuickAccessBar({ onQuickAnalysis, onHistoryClick }: QuickAccessBarProps) {
  const t = useTerminology()
  const prefersReducedMotion = useReducedMotion()
  const { analysisHistory } = useSmartFlowStore()

  // Quick methods state
  const [quickMethods, setQuickMethods] = useState<string[]>(DEFAULT_QUICK_METHODS)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingMethods, setEditingMethods] = useState<string[]>([])

  useEffect(() => {
    setQuickMethods(loadQuickMethods())
  }, [])

  const quickMethodsInfo = useMemo(() => {
    return quickMethods
      .map(id => {
        const method = STATISTICAL_METHODS[id]
        return method ? { id, name: t.hub.quickMethodNames[id] || method.koreanName || method.name } : null
      })
      .filter(Boolean) as Array<{ id: string; name: string }>
  }, [quickMethods, t])

  const recentHistory = useMemo(() => {
    return analysisHistory.slice(0, 3).map(h => ({
      ...h,
      timeAgo: formatTimeAgo(new Date(h.timestamp), t.hub.timeAgo)
    }))
  }, [analysisHistory, t])

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

      {/* 최근 분석 */}
      {recentHistory.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Clock className="w-3.5 h-3.5" />
            <span>{t.hub.cards.recentTitle}</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {recentHistory.map(h => (
              <button
                key={h.id}
                type="button"
                onClick={() => onHistoryClick(h.id)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border',
                  'bg-background/60 hover:bg-accent',
                  'transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
                )}
              >
                <span className="truncate max-w-[120px]">
                  {h.method?.name || t.hub.cards.unknownMethod}
                </span>
                <span className="text-muted-foreground/50 shrink-0">
                  {h.timeAgo}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

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
    </motion.div>
  )
}
