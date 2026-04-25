'use client'

import { AlertTriangle, CheckCircle2, FileSearch, Loader2, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  DocumentQualityFreshness,
  DocumentQualityReport,
  DocumentReviewEvidence,
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
  canOpenEvidenceSource?: (sourceKind: string, sourceId: string) => boolean
  onOpenEvidenceSource?: (sourceKind: string, sourceId: string) => void
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

type FindingStatusFilter = 'all' | DocumentReviewFindingStatus

const FINDING_FILTERS: Array<{ value: FindingStatusFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '열림' },
  { value: 'ignored', label: '무시됨' },
  { value: 'resolved', label: '해결됨' },
]

type EvidenceComparisonStatus = 'match' | 'mismatch' | 'incomplete'

const COMPARISON_META: Record<EvidenceComparisonStatus, { label: string; className: string }> = {
  match: {
    label: '일치',
    className: 'bg-secondary-container text-secondary',
  },
  mismatch: {
    label: '불일치',
    className: 'bg-destructive/10 text-destructive',
  },
  incomplete: {
    label: '확인 필요',
    className: 'bg-surface text-on-surface-variant',
  },
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

function getEvidenceSourceLabel(evidence: DocumentReviewEvidence): string | null {
  if (!evidence.sourceKind && !evidence.sourceId) {
    return null
  }

  return [evidence.sourceKind, evidence.sourceId].filter(Boolean).join(':')
}

function normalizeEvidenceValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function getEvidenceComparisonStatus(evidence: DocumentReviewEvidence): EvidenceComparisonStatus | null {
  if (!evidence.observedValue && !evidence.expectedValue) {
    return null
  }
  if (!evidence.observedValue || !evidence.expectedValue) {
    return 'incomplete'
  }
  return normalizeEvidenceValue(evidence.observedValue) === normalizeEvidenceValue(evidence.expectedValue)
    ? 'match'
    : 'mismatch'
}

export default function DocumentPreflightPanel({
  report,
  freshness,
  pending,
  disabled = false,
  actionsDisabled = false,
  onRun,
  onSelectSection,
  canOpenEvidenceSource,
  onOpenEvidenceSource,
  onUpdateFindingStatus,
}: DocumentPreflightPanelProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<FindingStatusFilter>('all')
  const findings = report?.findings ?? []
  const visibleFindings = statusFilter === 'all'
    ? findings
    : findings.filter((finding) => finding.status === statusFilter)
  const statusLabel = getPanelStatusLabel(report, freshness)
  const hasFindings = findings.length > 0
  const hasVisibleFindings = visibleFindings.length > 0

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

      {hasFindings && (
        <div className="mt-3 flex flex-wrap gap-1">
          {FINDING_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              variant={statusFilter === filter.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
              aria-pressed={statusFilter === filter.value}
              className={cn(
                'h-7 rounded-full px-2.5 text-[11px]',
                statusFilter === filter.value
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant',
              )}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      )}

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
        {hasFindings && !hasVisibleFindings && (
          <div className="rounded-2xl bg-surface-container px-3 py-3 text-xs text-on-surface-variant">
            해당 상태의 항목 없음
          </div>
        )}
        {visibleFindings.map((finding) => {
          const severityMeta = SEVERITY_META[finding.severity]
          const canSelectSection = Boolean(finding.sectionId && onSelectSection)
          const evidenceItems = finding.evidence ?? []
          const hasEvidence = evidenceItems.length > 0
          const visibleEvidenceItems = evidenceItems.slice(0, 2)
          const hiddenEvidenceCount = evidenceItems.length - visibleEvidenceItems.length
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
              {hasEvidence && (
                <div className="mt-2 space-y-1.5 rounded-xl bg-surface-container-high px-2 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">근거</p>
                  {visibleEvidenceItems.map((evidence, evidenceIndex) => {
                    const sourceLabel = getEvidenceSourceLabel(evidence)
                    const evidenceSourceKind = evidence.sourceKind?.trim()
                    const evidenceSourceId = evidence.sourceId?.trim()
                    const comparisonStatus = getEvidenceComparisonStatus(evidence)
                    const comparisonMeta = comparisonStatus ? COMPARISON_META[comparisonStatus] : null
                    const canOpenSource = Boolean(
                      evidenceSourceKind
                      && evidenceSourceId
                      && onOpenEvidenceSource
                      && (canOpenEvidenceSource?.(evidenceSourceKind, evidenceSourceId) ?? true),
                    )
                    return (
                      <div key={`${finding.id}-evidence-${evidenceIndex}`} className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[11px] font-medium text-on-surface">{evidence.label}</p>
                          {sourceLabel && (
                            <span className="flex min-w-0 shrink-0 items-center gap-1">
                              <span className="max-w-28 truncate rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
                                {sourceLabel}
                              </span>
                              {canOpenSource && evidenceSourceKind && evidenceSourceId && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onOpenEvidenceSource?.(evidenceSourceKind, evidenceSourceId)}
                                  className="h-5 rounded-full px-1.5 text-[10px] text-on-surface-variant"
                                >
                                  원본
                                </Button>
                              )}
                            </span>
                          )}
                        </div>
                        {comparisonMeta && (
                          <div className="rounded-lg bg-surface px-2 py-1.5">
                            <div className="mb-1 flex items-center justify-between gap-2">
                              <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                                비교
                              </span>
                              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', comparisonMeta.className)}>
                                {comparisonMeta.label}
                              </span>
                            </div>
                            <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-x-2 gap-y-1 text-[10px]">
                              <span className="text-muted-foreground">관찰</span>
                              <span className="truncate text-on-surface-variant">
                                {evidence.observedValue ?? '-'}
                              </span>
                              <span className="text-muted-foreground">기대</span>
                              <span className="truncate text-on-surface-variant">
                                {evidence.expectedValue ?? '-'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {hiddenEvidenceCount > 0 && (
                    <p className="text-[10px] text-muted-foreground">외 {hiddenEvidenceCount}개</p>
                  )}
                </div>
              )}
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
