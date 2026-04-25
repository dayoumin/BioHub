'use client'

import { AlertTriangle, CheckCircle2, FileSearch, Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  DocumentQualityFreshness,
  DocumentQualityReport,
  DocumentReviewFindingStatus,
  DocumentReviewFindingSeverity,
} from '@/lib/research/document-quality-types'
import { cn } from '@/lib/utils'

interface DocumentPreflightPanelProps {
  report: DocumentQualityReport | null
  freshness: DocumentQualityFreshness
  pending: boolean
  disabled?: boolean
  actionsDisabled?: boolean
  onRun: () => void
  onSelectSection?: (sectionId: string) => void
  onUpdateFindingStatus?: (findingId: string, status: DocumentReviewFindingStatus) => void
}

const FRESHNESS_LABELS: Record<DocumentQualityFreshness, string> = {
  missing: '검사 전',
  fresh: '최신',
  stale: '오래됨',
}

const SEVERITY_META: Record<DocumentReviewFindingSeverity, { label: string; className: string }> = {
  info: {
    label: '정보',
    className: 'bg-surface-container-high text-on-surface-variant',
  },
  warning: {
    label: '주의',
    className: 'bg-secondary-container text-secondary',
  },
  error: {
    label: '수정',
    className: 'bg-destructive/10 text-destructive',
  },
  critical: {
    label: '중요',
    className: 'bg-destructive/10 text-destructive',
  },
}

const FINDING_STATUS_LABELS: Record<DocumentReviewFindingStatus, string> = {
  open: '열림',
  resolved: '해결됨',
  ignored: '무시됨',
}

function getPanelStatusLabel(report: DocumentQualityReport | null, freshness: DocumentQualityFreshness): string {
  if (freshness !== 'fresh') {
    return FRESHNESS_LABELS[freshness]
  }
  if (!report || report.summary.openFindings === 0) {
    return '통과'
  }
  if (report.summary.unresolvedCritical > 0 || report.summary.error > 0) {
    return '수정 필요'
  }
  return '주의'
}

export default function DocumentPreflightPanel({
  report,
  freshness,
  pending,
  disabled = false,
  actionsDisabled = false,
  onRun,
  onSelectSection,
  onUpdateFindingStatus,
}: DocumentPreflightPanelProps): React.ReactElement {
  const findings = report?.findings ?? []
  const statusLabel = getPanelStatusLabel(report, freshness)
  const hasFindings = findings.length > 0

  return (
    <section className="rounded-[24px] bg-surface px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <FileSearch className="h-3.5 w-3.5" />
            Preflight
          </p>
          <h3 className="text-sm font-semibold text-on-surface">논문 점검</h3>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            'rounded-full px-2.5 py-1 text-[10px] font-medium',
            freshness === 'fresh'
              ? 'bg-secondary-container text-secondary'
              : 'bg-surface-container-high text-on-surface-variant',
          )}
        >
          {statusLabel}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-2xl bg-surface-container px-3 py-2">
          <p className="text-[10px] text-muted-foreground">전체</p>
          <p className="text-sm font-semibold text-on-surface">{report?.summary.totalFindings ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-surface-container px-3 py-2">
          <p className="text-[10px] text-muted-foreground">열림</p>
          <p className="text-sm font-semibold text-on-surface">{report?.summary.openFindings ?? 0}</p>
        </div>
        <div className="rounded-2xl bg-surface-container px-3 py-2">
          <p className="text-[10px] text-muted-foreground">중요</p>
          <p className="text-sm font-semibold text-on-surface">{report?.summary.unresolvedCritical ?? 0}</p>
        </div>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onRun}
        disabled={pending || disabled}
        className="mt-4 w-full gap-1 rounded-full bg-surface-container-high"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
        {pending ? '점검 중...' : freshness === 'missing' ? '점검 실행' : '다시 점검'}
      </Button>

      <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
        {!hasFindings && freshness === 'fresh' && (
          <div className="flex items-center gap-2 rounded-2xl bg-surface-container px-3 py-3 text-xs text-on-surface-variant">
            <CheckCircle2 className="h-4 w-4 text-secondary" />
            점검 통과
          </div>
        )}
        {!hasFindings && freshness !== 'fresh' && (
          <div className="flex items-center gap-2 rounded-2xl bg-surface-container px-3 py-3 text-xs text-on-surface-variant">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            {freshness === 'missing' ? '점검 기록 없음' : '다시 점검 필요'}
          </div>
        )}
        {findings.map((finding) => {
          const severityMeta = SEVERITY_META[finding.severity]
          const canSelectSection = Boolean(finding.sectionId && onSelectSection)
          return (
            <div
              key={finding.id}
              className={cn(
                'rounded-2xl bg-surface-container px-3 py-3',
                finding.status !== 'open' && 'opacity-70',
              )}
            >
              <button
                type="button"
                disabled={!canSelectSection}
                onClick={() => {
                  if (finding.sectionId) {
                    onSelectSection?.(finding.sectionId)
                  }
                }}
                aria-label={finding.sectionId ? `${finding.title} 섹션으로 이동` : finding.title}
                className={cn(
                  'w-full rounded-xl text-left',
                  canSelectSection && 'transition-colors hover:bg-surface-container-high',
                  !canSelectSection && 'cursor-default',
                )}
              >
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', severityMeta.className)}
                  >
                    {severityMeta.label}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-on-surface-variant"
                  >
                    {FINDING_STATUS_LABELS[finding.status]}
                  </Badge>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {finding.sectionId ?? '문서 전체'}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-on-surface">{finding.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-muted-foreground">{finding.message}</p>
              </button>
              {onUpdateFindingStatus && finding.status !== 'resolved' && (
                <div className="mt-2 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={actionsDisabled || disabled || pending || freshness !== 'fresh'}
                    onClick={() => {
                      onUpdateFindingStatus(finding.id, finding.status === 'ignored' ? 'open' : 'ignored')
                    }}
                    className="h-7 rounded-full px-2.5 text-[11px] text-on-surface-variant"
                  >
                    {finding.status === 'ignored' ? '다시 열기' : '무시'}
                  </Button>
                </div>
              )}
              {finding.ignoredReason && (
                <p className="mt-2 rounded-xl bg-surface-container-high px-2 py-1.5 text-[11px] text-muted-foreground">
                  {finding.ignoredReason}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
