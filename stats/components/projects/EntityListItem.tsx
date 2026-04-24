'use client'

import { ExternalLink, FileText, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { getTabEntry } from '@/lib/research/entity-tab-registry'
import type { ResolvedEntity } from '@/lib/research/entity-resolver'

interface EntityListItemProps {
  entity: ResolvedEntity
  showKindBadge?: boolean
  selected?: boolean
  onToggleSelect?: () => void
  onNavigate?: (url: string) => void
  onUnlink?: () => void
  onCreateWriting?: () => void
  isCreatingWriting?: boolean
}

export function EntityListItem({
  entity,
  showKindBadge = false,
  selected = false,
  onToggleSelect,
  onNavigate,
  onUnlink,
  onCreateWriting,
  isCreatingWriting = false,
}: EntityListItemProps): React.ReactElement {
  const { ref, loaded, summary } = entity
  const tabEntry = getTabEntry(ref.entityKind)

  return (
    <div
      className={`group flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        loaded
          ? selected
            ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
            : 'border-border bg-card hover:border-primary/50'
          : 'border-dashed border-muted bg-muted/30'
      }`}
    >
      {/* 체크박스 */}
      {loaded && onToggleSelect && (
        <div className="mt-1 shrink-0">
          <Checkbox checked={selected} onCheckedChange={onToggleSelect} />
        </div>
      )}

      {/* 아이콘 */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-base">
        {tabEntry?.icon ?? '📎'}
      </div>

      {/* 내용 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium leading-snug truncate ${!loaded ? 'text-muted-foreground line-through' : ''}`}>
            {summary.title}
          </span>

          {showKindBadge && tabEntry && (
            <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
              {tabEntry.label}
            </Badge>
          )}

          {summary.badge && (
            <Badge
              variant={summary.badge.variant === 'warning' ? 'destructive' : 'secondary'}
              className={`shrink-0 text-[10px] px-1.5 py-0 ${
                summary.badge.variant === 'success' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-200' : ''
              }`}
            >
              {summary.badge.label}
            </Badge>
          )}
        </div>

        {summary.subtitle && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {summary.subtitle}
          </p>
        )}
      </div>

      {/* 날짜 */}
      <span className="shrink-0 text-xs text-muted-foreground pt-0.5">
        {summary.date}
      </span>

      {/* 액션 */}
      <div className="flex shrink-0 items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {loaded && onCreateWriting && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            aria-label="자료 작성"
            onClick={onCreateWriting}
            disabled={isCreatingWriting}
            title="자료 작성"
          >
            <FileText className="h-3.5 w-3.5" />
            자료 작성
          </Button>
        )}
        {loaded && summary.navigateTo != null && onNavigate && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="이동"
            onClick={() => onNavigate(summary.navigateTo ?? '')}
            title="이동"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}
        {onUnlink && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            aria-label="연결 해제"
            onClick={onUnlink}
            title="연결 해제"
          >
            <Unlink className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
