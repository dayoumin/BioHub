'use client'

import { useState } from 'react'
import { ClipboardCheck, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type { DocumentSection } from '@/lib/research/document-blueprint-types'
import type {
  DocumentReviewRequest,
  DocumentReviewRequestStatus,
} from '@/lib/research/document-review-requests'

interface DocumentReviewRequestsSheetProps {
  sections: DocumentSection[]
  activeSectionId: string | null
  requests: DocumentReviewRequest[]
  baselinePreviews: Record<string, DocumentReviewRequestBaselinePreview>
  disabled?: boolean
  onCreateRequest: (input: { sectionId: string | null; note: string }) => Promise<void>
  onUpdateStatus: (requestId: string, status: DocumentReviewRequestStatus) => void
  onRestoreBaselineSection: (requestId: string) => void
}

export interface DocumentReviewRequestBaselinePreview {
  currentExcerpt: string
  baselineExcerpt: string
  changed: boolean
  unavailableReason?: string
}

const STATUS_LABELS: Record<DocumentReviewRequestStatus, string> = {
  pending: '대기',
  'in-progress': '수정 중',
  done: '완료',
  deferred: '보류',
}

function getStatusBadgeClass(status: DocumentReviewRequestStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-surface-container-high text-foreground'
    case 'in-progress':
      return 'bg-blue-100 text-blue-900'
    case 'done':
      return 'bg-emerald-100 text-emerald-900'
    case 'deferred':
      return 'bg-amber-100 text-amber-900'
  }
}

function formatRequestTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export default function DocumentReviewRequestsSheet({
  sections,
  activeSectionId,
  requests,
  baselinePreviews,
  disabled,
  onCreateRequest,
  onUpdateStatus,
  onRestoreBaselineSection,
}: DocumentReviewRequestsSheetProps): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [selectedSectionId, setSelectedSectionId] = useState<string>(activeSectionId ?? 'document')
  const [note, setNote] = useState('')
  const [creating, setCreating] = useState(false)
  const activeCount = requests.filter((request) => request.status !== 'done').length

  const handleOpenChange = (nextOpen: boolean): void => {
    setOpen(nextOpen)
    if (nextOpen) {
      setSelectedSectionId(activeSectionId ?? 'document')
    }
  }

  const handleCreate = async (): Promise<void> => {
    const trimmedNote = note.trim()
    if (!trimmedNote || creating) return

    setCreating(true)
    try {
      await onCreateRequest({
        sectionId: selectedSectionId === 'document' ? null : selectedSectionId,
        note: trimmedNote,
      })
      setNote('')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled}
        >
          <ClipboardCheck className="h-3.5 w-3.5" />
          수정 요청
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[460px] max-w-[92vw] bg-surface-container-lowest">
        <SheetHeader>
          <SheetTitle>수정 요청 작업대</SheetTitle>
          <SheetDescription>
            심사·학위 수정 의견을 섹션별 작업 단위로 남깁니다. 새 요청을 만들면 현재 문서 상태가 자동으로 기준 저장 지점에 보관됩니다.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4">
          <div className="rounded-2xl bg-surface-container px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">대상 섹션</p>
            <Select value={selectedSectionId} onValueChange={setSelectedSectionId}>
              <SelectTrigger
                aria-label="수정 요청 대상 섹션"
                className="mt-2 w-full bg-surface-container-lowest"
                disabled={disabled || creating}
              >
                <SelectValue placeholder="대상 섹션 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">문서 전체</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              aria-label="수정 요청 메모"
              className="mt-3 min-h-24 bg-surface-container-lowest"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="예: 심사위원 2 의견. 결과 해석에서 효과크기와 p-value를 함께 설명하고, 표 2 문구를 더 보수적으로 수정."
              disabled={disabled || creating}
            />
            <Button
              type="button"
              size="sm"
              className="mt-3 gap-1"
              disabled={!note.trim() || creating || disabled}
              onClick={() => { void handleCreate() }}
            >
              <Plus className="h-3.5 w-3.5" />
              요청 추가
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {requests.length === 0 ? (
            <div className="rounded-2xl bg-surface-container px-4 py-6 text-sm leading-6 text-muted-foreground">
              아직 등록된 수정 요청이 없습니다. 심사 의견이나 지도교수 피드백을 받으면 문서 전체 또는 섹션 단위로 작업 항목을 남겨 두세요.
            </div>
          ) : (
            <div className="space-y-2">
              {requests.map((request) => (
                <div key={request.id} className="rounded-2xl bg-surface-container px-4 py-3">
                  {(() => {
                    const baselinePreview = baselinePreviews[request.id]
                    return (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {request.sectionTitle ?? '문서 전체'}
                        </p>
                        <Badge variant="secondary" className={getStatusBadgeClass(request.status)}>
                          {STATUS_LABELS[request.status]}
                        </Badge>
                      </div>
                      <p className="text-xs leading-5 text-muted-foreground">{request.note}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatRequestTime(request.createdAt)}
                        {request.baselineRevisionId ? ' · 기준 저장 지점 있음' : ''}
                      </p>
                      {baselinePreview && (
                        <div className="mt-2 rounded-xl bg-surface-container-lowest px-3 py-2">
                          {baselinePreview.unavailableReason ? (
                            <p className="text-[11px] leading-4 text-muted-foreground">
                              {baselinePreview.unavailableReason}
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              <p className="text-[11px] font-medium text-muted-foreground">
                                기준 지점 비교
                              </p>
                              <div className="grid gap-1 text-[11px] leading-4 text-muted-foreground">
                                <p>
                                  <span className="font-medium text-foreground">현재</span>
                                  {' '}
                                  {baselinePreview.currentExcerpt}
                                </p>
                                <p>
                                  <span className="font-medium text-foreground">기준</span>
                                  {' '}
                                  {baselinePreview.baselineExcerpt}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="mt-1 h-7 text-xs"
                                disabled={disabled || !baselinePreview.changed}
                                onClick={() => onRestoreBaselineSection(request.id)}
                              >
                                이 섹션만 기준 지점으로 복원
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <Select
                      value={request.status}
                      onValueChange={(value) => onUpdateStatus(request.id, value as DocumentReviewRequestStatus)}
                      disabled={disabled}
                    >
                      <SelectTrigger
                        size="sm"
                        className="w-24 shrink-0 bg-surface-container-lowest"
                        aria-label={`${request.sectionTitle ?? '문서 전체'} 수정 요청 상태`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
