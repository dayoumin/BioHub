'use client'

/**
 * QuickAccessBar - recent activity cards for statistics and graph projects.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
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
import { ConfirmAlertDialog } from '@/components/common/ConfirmAlertDialog'
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
  togglePinId,
} from '@/lib/utils/pinned-history-storage'
import {
  listProjects,
  deleteProjectCascade,
  CHART_TYPE_HINTS,
  GRAPH_PROJECTS_CHANGED_EVENT,
} from '@/lib/graph-studio'
import { STORAGE_KEYS } from '@/lib/constants/storage-keys'
import type { ChartType } from '@/types/graph-studio'
import { toast } from 'sonner'
import { formatTimeAgo } from '@/lib/utils/format-time'

function extractPValue(results: Record<string, unknown> | null): number | null {
  if (!results) return null
  const candidates = ['pValue', 'p_value', 'p', 'pval']

  for (const key of candidates) {
    const value = results[key]
    if (typeof value === 'number' && !Number.isNaN(value)) return value
  }

  return null
}

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

type ActivityType = 'statistics' | 'visualization'

interface ActivityCard {
  id: string
  type: ActivityType
  timestamp: Date
  timeAgo: string
  isPinned: boolean
  name: string
  purpose?: string
  method?: { id: string; name: string; category: string; description?: string } | null
  pValue?: number | null
  hasResults?: boolean
  dataFileName?: string
  chartType?: ChartType
  chartTypeLabel?: string
}

interface QuickAccessBarProps {
  onHistoryClick: (historyId: string) => void
  onHistoryDelete: (historyId: string) => Promise<void>
  showHeader?: boolean
  maxItems?: number
  compact?: boolean
  className?: string
}

function getActivitySummary(card: ActivityCard): string {
  if (card.type === 'visualization') {
    return card.chartTypeLabel
      ? `${card.chartTypeLabel} 시각화를 이어서 편집합니다.`
      : '최근 작업한 시각화를 이어서 열 수 있습니다.'
  }

  if (card.purpose && card.purpose.trim().length > 0) {
    return card.purpose
  }

  if (card.method?.description && card.method.description.trim().length > 0) {
    return card.method.description
  }

  if (card.dataFileName && card.dataFileName.trim().length > 0) {
    return `${card.dataFileName} 데이터로 진행한 분석입니다.`
  }

  return '최근 진행한 분석을 이어서 열 수 있습니다.'
}

function getDisplayFileName(fileName?: string): string | null {
  if (!fileName) return null

  const trimmed = fileName.trim()
  if (!trimmed) return null

  const normalized = trimmed.toLowerCase()
  if (normalized === 'unknown' || normalized === 'unknown.csv' || normalized === 'untitled' || normalized === 'untitled.csv') {
    return null
  }

  return trimmed
}

function getLocalizedActivitySummary(
  card: ActivityCard,
  text: {
    visualizationWithType: (chartTypeLabel: string) => string
    visualizationFallback: string
    analysisFallback: string
  },
): string {
  if (card.type === 'visualization') {
    return card.chartTypeLabel
      ? text.visualizationWithType(card.chartTypeLabel)
      : text.visualizationFallback
  }

  if (card.purpose && card.purpose.trim().length > 0) {
    return card.purpose
  }

  if (card.method?.description && card.method.description.trim().length > 0) {
    return card.method.description
  }

  return text.analysisFallback
}

export function QuickAccessBar({
  onHistoryClick,
  onHistoryDelete,
  showHeader = true,
  maxItems = MAX_VISIBLE_PILLS,
  compact = false,
  className,
}: QuickAccessBarProps) {
  const t = useTerminology()
  const router = useRouter()
  const prefersReducedMotion = useReducedMotion()
  const { analysisHistory } = useHistoryStore()

  const [pinnedIds, setPinnedIds] = usePinnedHistoryIds()
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleteConfirmType, setDeleteConfirmType] = useState<ActivityType>('statistics')
  const [vizRefreshKey, setVizRefreshKey] = useState(0)

  useEffect((): (() => void) => {
    const handleProjectRefresh = (): void => {
      setVizRefreshKey((prev) => prev + 1)
    }

    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEYS.graphStudio.projects) return
      handleProjectRefresh()
    }

    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleProjectRefresh)
    window.addEventListener('storage', handleStorage)

    return (): void => {
      window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleProjectRefresh)
      window.removeEventListener('storage', handleStorage)
    }
  }, [])

  useEffect((): void => {
    const validIds = new Set(analysisHistory.map((history) => history.id))
    for (const project of listProjects()) validIds.add(project.id)

    setPinnedIds((prev) => {
      const cleaned = prev.filter((id) => validIds.has(id))
      return cleaned.length !== prev.length ? cleaned : prev
    })
  }, [analysisHistory, setPinnedIds, vizRefreshKey])

  const { visibleItems } = useMemo(() => {
    const pinnedSet = new Set(pinnedIds)

    const statsCards: ActivityCard[] = analysisHistory.map((history) => ({
      id: history.id,
      type: 'statistics',
      timestamp: new Date(history.timestamp),
      timeAgo: formatTimeAgo(new Date(history.timestamp), t.hub.timeAgo),
      isPinned: pinnedSet.has(history.id),
      name: history.name || history.method?.name || t.hub.cards.unknownMethod,
      purpose: history.purpose,
      method: history.method,
      pValue: extractPValue(history.results),
      hasResults: history.results !== null,
      dataFileName: history.dataFileName || '',
    }))

    const vizCards: ActivityCard[] = listProjects().map((project) => {
      const updatedAt = new Date(project.updatedAt)
      const chartType = project.chartSpec.chartType
      const hint = CHART_TYPE_HINTS[chartType]

      return {
        id: project.id,
        type: 'visualization',
        timestamp: updatedAt,
        timeAgo: formatTimeAgo(updatedAt, t.hub.timeAgo),
        isPinned: pinnedSet.has(project.id),
        name: project.name,
        chartType,
        chartTypeLabel: hint?.label ?? chartType,
      }
    })

    const all = [...statsCards, ...vizCards]
    const pinned = all
      .filter((card) => card.isPinned)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const unpinned = all
      .filter((card) => !card.isPinned)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const remaining = Math.max(0, maxItems - Math.min(pinned.length, maxItems))

    return {
      visibleItems: [...pinned.slice(0, maxItems), ...unpinned.slice(0, remaining)],
    }
  }, [analysisHistory, maxItems, pinnedIds, t, vizRefreshKey])

  const handleCardClick = useCallback((card: ActivityCard): void => {
    if (card.type === 'statistics') {
      onHistoryClick(card.id)
      return
    }

    router.push(`/graph-studio?project=${card.id}`)
  }, [onHistoryClick, router])

  const handleDeleteConfirm = useCallback(async (): Promise<void> => {
    if (!deleteConfirmId) return

    if (deleteConfirmType === 'statistics') {
      await onHistoryDelete(deleteConfirmId)
    } else {
      await deleteProjectCascade(deleteConfirmId)
      setVizRefreshKey((prev) => prev + 1)
    }

    setPinnedIds((prev) => (
      prev.includes(deleteConfirmId)
        ? prev.filter((id) => id !== deleteConfirmId)
        : prev
    ))
    setDeleteConfirmId(null)
  }, [deleteConfirmId, deleteConfirmType, onHistoryDelete, setPinnedIds])

  const handleTogglePin = useCallback((historyId: string): void => {
    setPinnedIds((prev) => {
      const result = togglePinId(prev, historyId, MAX_PINNED)
      if (result === null) {
        toast.info(t.history.tooltips.maxPinned(MAX_PINNED))
        return prev
      }
      return result
    })
  }, [setPinnedIds, t])

  const handleDeleteRequest = useCallback((id: string, type: ActivityType): void => {
    setDeleteConfirmId(id)
    setDeleteConfirmType(type)
  }, [])

  return (
    <motion.div
      className={className}
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      {showHeader && (
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{t.hub.cards.recentTitle}</h2>
        </div>
      )}

      {visibleItems.length === 0 ? (
        <div className="flex min-h-[88px] items-center justify-center rounded-xl px-4 py-6 text-center">
          <p className="text-[11px] font-normal text-muted-foreground/70">
            {t.hub.cards.emptyTitle}
          </p>
        </div>
      ) : (
        <div className={cn(compact ? 'space-y-1.5' : 'grid grid-cols-1 gap-2.5 md:grid-cols-2')}>
          {visibleItems.map((card) => (
            <ActivityCardItem
              key={card.id}
              card={card}
              t={t}
              compact={compact}
              onClick={() => handleCardClick(card)}
              onTogglePin={() => handleTogglePin(card.id)}
              onDelete={() => handleDeleteRequest(card.id, card.type)}
            />
          ))}
        </div>
      )}

      <ConfirmAlertDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
        title={t.history.dialogs.deleteTitle}
        description={t.history.dialogs.deleteDescription}
        cancelLabel={t.history.buttons.cancel}
        confirmLabel={t.history.buttons.delete}
        onConfirm={handleDeleteConfirm}
      />
    </motion.div>
  )
}

interface ActivityCardItemProps {
  card: ActivityCard
  t: ReturnType<typeof useTerminology>
  compact: boolean
  onClick: () => void
  onTogglePin: () => void
  onDelete: () => void
}

function ActivityCardItem({ card, t, compact, onClick, onTogglePin, onDelete }: ActivityCardItemProps) {
  const isVisualization = card.type === 'visualization'
  const displayFileName = getDisplayFileName(card.dataFileName)
  const activitySummary = getLocalizedActivitySummary(card, {
    visualizationWithType: (chartTypeLabel) => t.hub.cards.visualizationSummaryWithType(chartTypeLabel),
    visualizationFallback: t.hub.cards.visualizationSummaryFallback,
    analysisFallback: t.hub.cards.analysisSummaryFallback,
  })
  const compactSecondaryText = compact
    ? (isVisualization ? (card.chartTypeLabel ?? activitySummary) : (displayFileName ?? activitySummary))
    : activitySummary

  return (
    <div
      className={cn(
        'group flex cursor-pointer items-start justify-between transition-all duration-200 active:scale-[0.99]',
        compact
          ? 'gap-3 rounded-xl bg-transparent px-2.5 py-2.5 hover:bg-surface-container-lowest/90'
          : 'gap-4 rounded-2xl bg-surface-container-low p-4 hover:bg-surface-container-high/70',
        card.isPinned && !compact && 'bg-primary/[0.06]',
      )}
      data-testid={`recent-activity-card-${card.id}`}
      data-activity-kind={card.type}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex min-w-0 items-start gap-3">
        {isVisualization ? (
          <VisualizationIcon chartType={card.chartType} compact={compact} />
        ) : (
          <StatisticsIcon hasResults={card.hasResults ?? false} compact={compact} />
        )}

        <div className="min-w-0">
          <p className={cn(
            'text-foreground',
            compact ? 'line-clamp-1 text-[11px] font-medium leading-4' : 'truncate text-sm font-semibold',
          )}>
            {isVisualization ? card.name : (card.method?.name || card.name)}
          </p>
          <p className={cn(
            'text-muted-foreground',
            compact ? 'mt-0.5 line-clamp-1 text-[10px] leading-4' : 'mt-1 line-clamp-2 text-[12px] leading-5',
          )}>
            {compactSecondaryText}
          </p>
          {!compact && !isVisualization && displayFileName && (
            <p className={cn(
              'truncate text-muted-foreground',
              compact ? 'mt-0.5 text-[10px]' : 'mt-0.5 text-xs',
            )}>
              {displayFileName}
            </p>
          )}
          <div className={cn(
            'flex flex-wrap items-center text-muted-foreground',
            compact ? 'mt-1 gap-1.5 text-[9px]' : 'mt-2 gap-1.5 text-[11px]',
          )}>
            {isVisualization ? (
              <>
                {!compact && (
                  <span className="rounded-full bg-background/70 px-2 py-0.5">
                    {t.hub.recentStatus.visualization}
                  </span>
                )}
                <span>{card.timeAgo}</span>
              </>
            ) : (
              <>
                {!compact && (
                  <span className="rounded-full bg-background/70 px-2 py-0.5">
                    {card.hasResults ? t.hub.recentStatus.completed : t.hub.recentStatus.inProgress}
                  </span>
                )}
                {card.pValue != null && (
                  <span className={cn(
                    'font-mono text-foreground/80',
                    compact ? 'px-0 py-0 text-[9px]' : 'rounded-full bg-background/80 px-2 py-0.5 text-[11px]',
                  )}>
                    p={card.pValue < 0.001 ? '<0.001' : card.pValue.toFixed(3)}
                  </span>
                )}
                <span>{card.timeAgo}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.stopPropagation()
              }
            }}
            className={cn(
              'rounded-md p-1.5 text-muted-foreground/60 transition-all',
              'hover:bg-background/80 hover:text-foreground',
              focusRing,
            )}
            aria-label={t.history.labels.moreActions}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={onTogglePin}>
            {card.isPinned ? (
              <><PinOff className="mr-2 h-3.5 w-3.5" />{t.history.tooltips.unpin}</>
            ) : (
              <><Pin className="mr-2 h-3.5 w-3.5" />{t.history.tooltips.pin}</>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
            <X className="mr-2 h-3.5 w-3.5" />
            {t.history.tooltips.delete}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function StatisticsIcon({ hasResults, compact }: { hasResults: boolean; compact: boolean }) {
  if (compact) {
    return (
      <div
        data-activity-icon={hasResults ? 'statistics-complete' : 'statistics-loading'}
        className="shrink-0 rounded-lg bg-surface-container-high p-1.5 text-muted-foreground"
      >
        {hasResults ? <CheckCircle2 className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
    )
  }

  if (hasResults) {
    return (
      <div
        data-activity-icon="statistics-complete"
        className={cn(
          'shrink-0 rounded-xl bg-[color-mix(in_oklch,var(--section-accent-analysis)_16%,var(--surface-container-lowest))] text-[var(--section-accent-analysis)]',
          compact ? 'p-2' : 'p-2.5',
        )}
      >
        <CheckCircle2 className="h-4 w-4" />
      </div>
    )
  }

  return (
    <div
      data-activity-icon="statistics-loading"
      className={cn(
        'shrink-0 rounded-xl bg-primary/10 text-primary',
        compact ? 'p-2' : 'p-2.5',
      )}
    >
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  )
}

function VisualizationIcon({ chartType, compact }: { chartType?: ChartType; compact: boolean }) {
  const Icon = getChartIcon(chartType ?? 'bar')

  if (compact) {
    return (
      <div
        data-activity-icon="visualization"
        className="shrink-0 rounded-lg bg-surface-container-high p-1.5 text-muted-foreground"
      >
        <Icon className="h-3 w-3" />
      </div>
    )
  }

  return (
    <div
      data-activity-icon="visualization"
      className={cn('shrink-0 rounded-xl', compact ? 'p-2' : 'p-2.5')}
      style={{
        background: 'color-mix(in oklch, var(--section-accent-graph) 12%, var(--surface-container-lowest))',
        color: 'var(--section-accent-graph)',
      }}
    >
      <Icon className="h-4 w-4" />
    </div>
  )
}
