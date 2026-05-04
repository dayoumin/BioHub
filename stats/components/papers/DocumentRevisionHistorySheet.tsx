'use client'

import { useMemo, useState } from 'react'
import { Clock3, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import type {
  DocumentBlueprintRevision,
  DocumentRevisionReason,
} from '@/lib/research/document-blueprint-revisions'
import type {
  DocumentBlueprint,
  DocumentSection,
} from '@/lib/research/document-blueprint-types'

interface DocumentRevisionHistorySheetProps {
  open: boolean
  currentDocument: DocumentBlueprint | null
  revisions: DocumentBlueprintRevision[]
  loading: boolean
  actionPending: boolean
  disabled?: boolean
  onOpenChange: (open: boolean) => void
  onCreateSnapshot: () => void
  onRestoreRevision: (revisionId: string) => void
}

interface RestorePreview {
  changedSectionTitles: string[]
  currentSectionCount: number
  targetSectionCount: number
  excerpt: string
}

const REVISION_REASON_LABELS: Record<DocumentRevisionReason, string> = {
  manual: '수동 저장 지점',
  'before-reassemble': '재조립 전',
  'before-section-regeneration': '섹션 재생성 전',
  'before-export': '내보내기 전',
  'before-restore': '복원 전',
  'review-request-baseline': '수정 요청 기준',
}

function formatRevisionTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function collectPlateText(value: unknown): string {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map((item) => collectPlateText(item)).join(' ')
  if (typeof value !== 'object' || value === null) return ''
  const record = value as Record<string, unknown>
  const ownText = typeof record.text === 'string' ? record.text : ''
  const childText = Array.isArray(record.children) ? collectPlateText(record.children) : ''
  return [ownText, childText].filter(Boolean).join(' ')
}

function getSectionComparableText(section: DocumentSection | undefined): string {
  if (!section) return ''
  const plateText = collectPlateText(section.plateValue).trim()
  return plateText || section.content.trim()
}

function getSectionExcerpt(section: DocumentSection | undefined): string {
  const text = getSectionComparableText(section).replace(/\s+/g, ' ').trim()
  if (!text) return '미리볼 본문이 없습니다.'
  return text.length > 140 ? `${text.slice(0, 140)}...` : text
}

function buildRestorePreview(
  currentDocument: DocumentBlueprint | null,
  revision: DocumentBlueprintRevision | null,
): RestorePreview {
  const targetSections = revision?.snapshot.sections ?? []
  const currentSections = currentDocument?.sections ?? []
  const currentById = new Map(currentSections.map((section) => [section.id, section]))
  const targetById = new Map(targetSections.map((section) => [section.id, section]))
  const changedTargetSections = targetSections.filter((targetSection) => {
    const currentSection = currentById.get(targetSection.id)
    if (!currentSection) return true
    return (
      currentSection.title !== targetSection.title
      || getSectionComparableText(currentSection) !== getSectionComparableText(targetSection)
      || JSON.stringify(currentSection.tables ?? []) !== JSON.stringify(targetSection.tables ?? [])
      || JSON.stringify(currentSection.figures ?? []) !== JSON.stringify(targetSection.figures ?? [])
    )
  })
  const removedSectionTitles = currentSections
    .filter((currentSection) => !targetById.has(currentSection.id))
    .map((section) => `${section.title} (복원 후 제외)`)
  const excerpt = changedTargetSections.length > 0
    ? getSectionExcerpt(changedTargetSections[0])
    : removedSectionTitles.length > 0
      ? '복원 후에는 현재 문서에만 있는 섹션이 제외됩니다.'
      : getSectionExcerpt(targetSections[0])

  return {
    changedSectionTitles: [
      ...changedTargetSections.map((section) => section.title),
      ...removedSectionTitles,
    ],
    currentSectionCount: currentSections.length,
    targetSectionCount: targetSections.length,
    excerpt,
  }
}

export default function DocumentRevisionHistorySheet({
  open,
  currentDocument,
  revisions,
  loading,
  actionPending,
  disabled,
  onOpenChange,
  onCreateSnapshot,
  onRestoreRevision,
}: DocumentRevisionHistorySheetProps): React.ReactElement {
  const [pendingRestoreRevisionId, setPendingRestoreRevisionId] = useState<string | null>(null)
  const pendingRestoreRevision = revisions.find((revision) => revision.id === pendingRestoreRevisionId) ?? null
  const restorePreview = useMemo(
    () => buildRestorePreview(currentDocument, pendingRestoreRevision),
    [currentDocument, pendingRestoreRevision],
  )
  const shownChangedSections = restorePreview.changedSectionTitles.slice(0, 5)
  const hiddenChangedSectionCount = Math.max(restorePreview.changedSectionTitles.length - shownChangedSections.length, 0)

  const handleOpenChange = (nextOpen: boolean): void => {
    if (!nextOpen) {
      setPendingRestoreRevisionId(null)
    }
    onOpenChange(nextOpen)
  }

  const handleConfirmRestore = (): void => {
    if (!pendingRestoreRevision) return
    onRestoreRevision(pendingRestoreRevision.id)
    setPendingRestoreRevisionId(null)
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
          <Clock3 className="h-3.5 w-3.5" />
          복원 기록
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[420px] max-w-[90vw] bg-surface-container-lowest">
        <SheetHeader>
          <SheetTitle>문서 복원 기록</SheetTitle>
          <SheetDescription>
            자동 저장과 별개로 되돌릴 기준점을 남깁니다. 이 패널의 복원은 문서 전체에 적용됩니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-3 px-4">
          <div className="rounded-2xl bg-surface-container px-3 py-2 text-xs leading-5 text-muted-foreground">
            특정 섹션만 기준 지점으로 되돌릴 때는 <span className="font-medium text-foreground">수정 요청 작업대</span>의 섹션 복원을 사용하세요.
          </div>
          <Button
            type="button"
            size="sm"
            className="shrink-0 gap-1"
            disabled={actionPending}
            onClick={onCreateSnapshot}
          >
            <Save className="h-3.5 w-3.5" />
            현재 저장
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="rounded-2xl bg-surface-container px-4 py-6 text-sm text-muted-foreground">
              복원 기록을 불러오는 중입니다.
            </div>
          ) : revisions.length === 0 ? (
            <div className="rounded-2xl bg-surface-container px-4 py-6 text-sm text-muted-foreground">
              아직 복원 기록이 없습니다. 중요한 편집 전에는 현재 저장 지점을 만들어 두세요.
            </div>
          ) : (
            <div className="space-y-2">
              {revisions.map((revision) => (
                <div
                  key={revision.id}
                  className="rounded-2xl bg-surface-container px-4 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {revision.label ?? REVISION_REASON_LABELS[revision.reason]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {REVISION_REASON_LABELS[revision.reason]} · {formatRevisionTime(revision.createdAt)}
                      </p>
                      {revision.documentUpdatedAt && (
                        <p className="text-[11px] text-muted-foreground">
                          문서 시각: {formatRevisionTime(revision.documentUpdatedAt)}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="shrink-0 gap-1"
                      disabled={actionPending}
                      aria-label={`${revision.label ?? REVISION_REASON_LABELS[revision.reason]} 복원`}
                      onClick={() => setPendingRestoreRevisionId(revision.id)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      복원
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>

      <AlertDialog
        open={pendingRestoreRevision !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingRestoreRevisionId(null)
        }}
      >
        <AlertDialogContent className="bg-surface-container-lowest">
          <AlertDialogHeader>
            <AlertDialogTitle>문서 복원 확인</AlertDialogTitle>
            <AlertDialogDescription>
              선택한 저장 지점으로 문서 전체를 되돌립니다. 복원 전 현재 상태는 자동으로 되돌림 저장 지점에 저장됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {pendingRestoreRevision && (
            <div className="space-y-3 text-sm">
              <div className="rounded-2xl bg-surface-container px-4 py-3">
                <p className="font-medium text-foreground">
                  {pendingRestoreRevision.label ?? REVISION_REASON_LABELS[pendingRestoreRevision.reason]}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {REVISION_REASON_LABELS[pendingRestoreRevision.reason]} · {formatRevisionTime(pendingRestoreRevision.createdAt)}
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-container px-4 py-3">
                  <p className="text-xs text-muted-foreground">현재 섹션</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{restorePreview.currentSectionCount}개</p>
                </div>
                <div className="rounded-2xl bg-surface-container px-4 py-3">
                  <p className="text-xs text-muted-foreground">복원 후 섹션</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">{restorePreview.targetSectionCount}개</p>
                </div>
              </div>

              <div className="rounded-2xl bg-surface-container px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">변경될 섹션</p>
                {shownChangedSections.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {shownChangedSections.map((title, index) => (
                      <span
                        key={`${title}:${index}`}
                        className="rounded-full bg-surface-container-high px-2 py-1 text-xs text-foreground"
                      >
                        {title}
                      </span>
                    ))}
                    {hiddenChangedSectionCount > 0 && (
                      <span className="rounded-full bg-surface-container-high px-2 py-1 text-xs text-muted-foreground">
                        외 {hiddenChangedSectionCount}개
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    현재 문서와 큰 차이가 감지되지 않았습니다.
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-surface-container px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">저장 지점 미리보기</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{restorePreview.excerpt}</p>
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPending || pendingRestoreRevision === null}
              onClick={handleConfirmRestore}
            >
              복원 실행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  )
}
