'use client'

import { Clock3, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

interface DocumentRevisionHistorySheetProps {
  open: boolean
  revisions: DocumentBlueprintRevision[]
  loading: boolean
  actionPending: boolean
  disabled?: boolean
  onOpenChange: (open: boolean) => void
  onCreateSnapshot: () => void
  onRestoreRevision: (revisionId: string) => void
}

const REVISION_REASON_LABELS: Record<DocumentRevisionReason, string> = {
  manual: '수동 저장 지점',
  'before-reassemble': '재조립 전',
  'before-section-regeneration': '섹션 재생성 전',
  'before-export': '내보내기 전',
  'before-restore': '복원 전',
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

export default function DocumentRevisionHistorySheet({
  open,
  revisions,
  loading,
  actionPending,
  disabled,
  onOpenChange,
  onCreateSnapshot,
  onRestoreRevision,
}: DocumentRevisionHistorySheetProps): React.ReactElement {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            autosave가 실수까지 저장할 수 있으므로, 주요 작업 전 문서 전체 snapshot을 남기고 필요할 때 되돌립니다.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-3 px-4">
          <div className="text-xs leading-5 text-muted-foreground">
            현재는 문서 전체 복원을 우선 제공합니다. 섹션 단위 비교/복원은 후속 단계입니다.
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
                      onClick={() => onRestoreRevision(revision.id)}
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
    </Sheet>
  )
}
