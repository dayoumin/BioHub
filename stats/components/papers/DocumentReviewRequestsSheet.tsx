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
  const [pendingRestoreRequestId, setPendingRestoreRequestId] = useState<string | null>(null)
  const activeCount = requests.filter((request) => request.status !== 'done').length
  const pendingRestoreRequest = pendingRestoreRequestId
    ? requests.find((request) => request.id === pendingRestoreRequestId) ?? null
    : null
  const pendingRestorePreview = pendingRestoreRequest
    ? baselinePreviews[pendingRestoreRequest.id]
    : undefined

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
    } catch {
      // The editor owns the toast. Keeping the note lets the user retry without retyping.
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
            심사·학위 수정 의견을 작업 단위로 남깁니다. 새 요청은 현재 문서를 기준 저장 지점으로 보관해 섹션별 비교와 부분 복원을 안전하게 지원합니다.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-4">
          <div className="rounded-2xl bg-surface-container px-4 py-3">
            <div className="mb-3 grid gap-2 text-[11px] leading-4 text-muted-foreground sm:grid-cols-3">
              <div className="rounded-xl bg-surface-container-lowest px-3 py-2">
                <span className="font-medium text-foreground">1. 기록</span>
                <br />
                의견을 문서/섹션 작업으로 남김
              </div>
              <div className="rounded-xl bg-surface-container-lowest px-3 py-2">
                <span className="font-medium text-foreground">2. 기준</span>
                <br />
                요청 생성 시 현재 상태 보관
              </div>
              <div className="rounded-xl bg-surface-container-lowest px-3 py-2">
                <span className="font-medium text-foreground">3. 복원</span>
                <br />
                필요한 섹션만 기준점으로 되돌림
              </div>
            </div>
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
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span>{formatRequestTime(request.createdAt)}</span>
                        {request.baselineRevisionId && (
                          <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-foreground">
                            기준 저장 지점 있음
                          </span>
                        )}
                      </div>
                      {baselinePreview && (
                        <div className="mt-2 rounded-xl bg-surface-container-lowest px-3 py-2">
                          {baselinePreview.unavailableReason ? (
                            <p className="text-[11px] leading-4 text-muted-foreground">
                              {baselinePreview.unavailableReason}
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-medium text-muted-foreground">
                                  기준 지점 비교
                                </p>
                                <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] text-muted-foreground">
                                  {baselinePreview.changed ? '변경 있음' : '동일'}
                                </span>
                              </div>
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
                                onClick={() => setPendingRestoreRequestId(request.id)}
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
      <AlertDialog
        open={pendingRestoreRequest !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setPendingRestoreRequestId(null)
          }
        }}
      >
        <AlertDialogContent className="bg-surface-container-lowest">
          <AlertDialogHeader>
            <AlertDialogTitle>섹션 복원 확인</AlertDialogTitle>
            <AlertDialogDescription>
              현재 섹션을 기준 저장 지점 내용으로 되돌립니다. 복원 전 현재 문서는 자동으로 저장 지점에 보관됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingRestoreRequest && (
            <div className="space-y-2 rounded-2xl bg-surface-container px-4 py-3 text-sm">
              <p className="font-medium text-foreground">
                {pendingRestoreRequest.sectionTitle ?? '문서 전체'}
              </p>
              {pendingRestorePreview && !pendingRestorePreview.unavailableReason && (
                <div className="grid gap-1 text-xs leading-5 text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">현재</span>
                    {' '}
                    {pendingRestorePreview.currentExcerpt}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">기준</span>
                    {' '}
                    {pendingRestorePreview.baselineExcerpt}
                  </p>
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={disabled || !pendingRestoreRequest}
              onClick={() => {
                if (!pendingRestoreRequest) return
                onRestoreBaselineSection(pendingRestoreRequest.id)
                setPendingRestoreRequestId(null)
              }}
            >
              섹션 복원
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
