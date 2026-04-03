'use client'

/**
 * QuickAccessBar — 최근 활동 카드 리스트 (2칼럼 그리드)
 *
 * 통계 분석(Smart Flow) + 시각화(Graph Studio) 통합 표시:
 * - 통계: 초록 아이콘 (CheckCircle2) + p-value
 * - 시각화: 보라 아이콘 (BarChart3 등) + 차트 유형
 * - 시간순 통합 정렬, pinned 우선
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Clock,
  CheckCircle2,
  Loader2,
  MoreVertical,
  X,
  Pin,
  PinOff,
  BarChart3,
  LineChart,
  ScatterChart,
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
import { focusRing } from '@/components/common/card-styles'
import { useTerminology } from '@/hooks/use-terminology'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'
import { useHistoryStore } from '@/lib/stores/history-store'
import {
  usePinnedHistoryIds,
  MAX_PINNED,
  MAX_VISIBLE_PILLS,
} from '@/lib/utils/pinned-history-storage'
import { listProjects, deleteProjectCascade } from '@/lib/graph-studio/project-storage'
import { EmptyState } from '@/components/common/EmptyState'
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults'
import type { ChartType } from '@/types/graph-studio'
import { toast } from 'sonner'
import { formatTimeAgo } from '@/lib/utils/format-time'

// ===== Helpers =====

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

/** 차트 유형에 맞는 lucide 아이콘 반환 */
function getChartIcon(chartType: ChartType): typeof BarChart3 {
  switch (chartType) {
    case 'line':
    case 'km-curve':
    case 'roc-curve':
      return LineChart
    case 'scatter':
      return ScatterChart
    default:
      return BarChart3
  }
}

// ===== Types =====

type ActivityType = 'statistics' | 'visualization'

interface ActivityCard {
  id: string
  type: ActivityType
  timestamp: Date
  timeAgo: string
  isPinned: boolean
  name: string
  // 통계 전용
  method?: { id: string; name: string; category: string; description?: string } | null
  pValue?: number | null
  hasResults?: boolean
  dataFileName?: string
  // 시각화 전용
  chartType?: ChartType
  chartTypeLabel?: string
}

// ===== Props =====

interface QuickAccessBarProps {
  onHistoryClick: (historyId: string) => void
  onHistoryDelete: (historyId: string) => Promise<void>
  onShowMore?: () => void
}

// ===== Component =====

export function QuickAccessBar({ onHistoryClick, onHistoryDelete, onShowMore }: QuickAccessBarProps) {
  const t = useTerminology()
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { analysisHistory } = useHistoryStore()

  // Pin & delete state
  const [pinnedIds, setPinnedIds] = usePinnedHistoryIds()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmType, setDeleteConfirmType] = useState<ActivityType>('statistics')
  // Graph Studio 프로젝트 삭제 시 UI 갱신을 위한 카운터
  const [vizRefreshKey, setVizRefreshKey] = useState(0)

  // 삭제된 히스토리 ID가 pinnedIds에 남아있으면 정리
  useEffect(() => {
    const validIds = new Set(analysisHistory.map(h => h.id))
    for (const p of listProjects()) validIds.add(p.id)
    setPinnedIds(prev => {
      const cleaned = prev.filter(id => validIds.has(id))
      return cleaned.length !== prev.length ? cleaned : prev
    })
  }, [analysisHistory, setPinnedIds, vizRefreshKey])

  // 통계 + 시각화 통합 리스트: pinned 우선 → 최신순
  // vizRefreshKey: deps에 포함 → 시각화 프로젝트 삭제 시 useMemo 재계산 트리거
  const { visibleItems } = useMemo(() => {
    const pinnedSet = new Set(pinnedIds)

    // 통계 분석 → ActivityCard
    const statsCards: ActivityCard[] = analysisHistory.map(h => ({
      id: h.id,
      type: 'statistics' as const,
      timestamp: new Date(h.timestamp),
      timeAgo: formatTimeAgo(new Date(h.timestamp), t.hub.timeAgo),
      isPinned: pinnedSet.has(h.id),
      name: h.name || h.method?.name || t.hub.cards.unknownMethod,
      method: h.method,
      pValue: extractPValue(h.results),
      hasResults: h.results !== null,
      dataFileName: h.dataFileName || '',
    }))

    // Graph Studio 프로젝트 → ActivityCard
    const projects = listProjects()
    const vizCards: ActivityCard[] = projects.map(p => {
      const updatedAt = new Date(p.updatedAt)
      const chartType = p.chartSpec.chartType
      const hint = CHART_TYPE_HINTS[chartType]
      return {
        id: p.id,
        type: 'visualization' as const,
        timestamp: updatedAt,
        timeAgo: formatTimeAgo(updatedAt, t.hub.timeAgo),
        isPinned: pinnedSet.has(p.id),
        name: p.name,
        chartType,
        chartTypeLabel: hint?.label ?? chartType,
      }
    })

    // 통합 + 정렬
    const all = [...statsCards, ...vizCards]
    const pinned = all
      .filter(c => c.isPinned)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const unpinned = all
      .filter(c => !c.isPinned)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const remaining = Math.max(0, MAX_VISIBLE_PILLS - pinned.length)
    return {
      visibleItems: [...pinned, ...unpinned.slice(0, remaining)],
      totalCount: all.length,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisHistory, pinnedIds, t, vizRefreshKey])

  // Card click handler
  const handleCardClick = useCallback((card: ActivityCard) => {
    if (card.type === 'statistics') {
      onHistoryClick(card.id)
    } else {
      router.push(`/graph-studio?project=${card.id}`)
    }
  }, [onHistoryClick, router])

  // Delete handler
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return
    if (deleteConfirmType === 'statistics') {
      await onHistoryDelete(deleteConfirmId)
    } else {
      await deleteProjectCascade(deleteConfirmId)
      setVizRefreshKey(k => k + 1)
    }
    setPinnedIds(prev => {
      if (!prev.includes(deleteConfirmId)) return prev
      return prev.filter(id => id !== deleteConfirmId)
    })
    setDeleteConfirmId(null)
  }, [deleteConfirmId, deleteConfirmType, onHistoryDelete, setPinnedIds])

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

  // Delete request (opens confirm dialog)
  const handleDeleteRequest = useCallback((id: string, type: ActivityType) => {
    setDeleteConfirmId(id)
    setDeleteConfirmType(type)
  }, [])

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{t.hub.cards.recentTitle}</h2>
        {/* "더보기"는 AnalysisHistoryPanel(통계 전용)을 열므로, 통계 개수만 표시 */}
        {analysisHistory.length > MAX_VISIBLE_PILLS && onShowMore && (
          <button
            type="button"
            data-testid="history-show-more"
            onClick={onShowMore}
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            {t.hub.cards.showMore(analysisHistory.length)}
          </button>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={t.hub.cards.emptyTitle}
          description={t.hub.cards.emptyDescription}
          variant="inline"
          className="py-10"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {visibleItems.map(card => (
            <ActivityCardItem
              key={card.id}
              card={card}
              t={t}
              onClick={() => handleCardClick(card)}
              onTogglePin={() => handleTogglePin(card.id)}
              onDelete={() => handleDeleteRequest(card.id, card.type)}
            />
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

// ===== Card Sub-component =====

interface ActivityCardItemProps {
  card: ActivityCard
  t: ReturnType<typeof useTerminology>
  onClick: () => void
  onTogglePin: () => void
  onDelete: () => void
}

function ActivityCardItem({ card, t, onClick, onTogglePin, onDelete }: ActivityCardItemProps) {
  const isViz = card.type === 'visualization'

  return (
    <div
      className={cn(
        'group flex items-center justify-between p-4 rounded-xl',
        'border bg-card',
        'hover:shadow-sm transition-shadow cursor-pointer',
        card.isPinned && 'border-primary/20 bg-primary/[0.02]',
        // 시각화 카드: 좌측 보라 악센트 라인
        isViz ? 'border-l-[3px] border-l-violet-400/60 border-t-border border-r-border border-b-border'
          : 'border-border',
      )}
      data-testid={`recent-activity-card-${card.id}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* 상태 아이콘 — 통계 vs 시각화 */}
        {isViz ? (
          <VisualizationIcon chartType={card.chartType} />
        ) : (
          <StatisticsIcon hasResults={card.hasResults ?? false} />
        )}

        {/* 제목 + 메타 */}
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">
            {isViz ? card.name : (card.method?.name || card.name)}
            {!isViz && card.dataFileName && (
              <span className="font-normal text-muted-foreground"> — {card.dataFileName}</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isViz ? (
              <>
                {t.hub.recentStatus.visualization}
                <span className="mx-1">·</span>
                <span className="text-violet-500 dark:text-violet-400">{card.chartTypeLabel}</span>
                <span className="mx-1">·</span>
                {card.timeAgo}
              </>
            ) : (
              <>
                {card.hasResults ? t.hub.recentStatus.completed : t.hub.recentStatus.inProgress}
                {card.pValue != null && (
                  <>, <span className="font-mono text-[11px]">
                    p={card.pValue < 0.001 ? '<0.001' : card.pValue.toFixed(3)}
                  </span></>
                )}
                <span className="mx-1">·</span>
                {card.timeAgo}
              </>
            )}
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
              `focus-visible:opacity-100 ${focusRing}`,
            )}
            aria-label="더보기"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onTogglePin}>
            {card.isPinned ? (
              <><PinOff className="w-3.5 h-3.5 mr-2" />{t.history.tooltips.unpin}</>
            ) : (
              <><Pin className="w-3.5 h-3.5 mr-2" />{t.history.tooltips.pin}</>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={onDelete}
          >
            <X className="w-3.5 h-3.5 mr-2" />
            {t.history.tooltips.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ===== Icon Sub-components =====

function StatisticsIcon({ hasResults }: { hasResults: boolean }) {
  if (hasResults) {
    return (
      <div className="shrink-0 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg">
        <CheckCircle2 className="w-4 h-4" />
      </div>
    )
  }
  return (
    <div className="shrink-0 bg-primary/10 text-primary p-2 rounded-lg">
      <Loader2 className="w-4 h-4 animate-spin" />
    </div>
  )
}

function VisualizationIcon({ chartType }: { chartType?: ChartType }) {
  const Icon = getChartIcon(chartType ?? 'bar')
  return (
    <div className="shrink-0 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 p-2 rounded-lg">
      <Icon className="w-4 h-4" />
    </div>
  )
}
