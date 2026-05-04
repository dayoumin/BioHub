'use client'

import type React from 'react'
import { RefreshCw } from 'lucide-react'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DOCUMENT_SECTION_REGENERATION_BODY_PRESERVING_MODE,
  DOCUMENT_SECTION_REGENERATION_DESTRUCTIVE_MODE,
  type DocumentSectionRegenerationMode,
} from '@/lib/research/document-section-regeneration-contract'

interface DocumentSectionRegenerationControlsProps {
  sectionTitle: string
  disabled: boolean
  pendingMode: DocumentSectionRegenerationMode | null
  reviewSourceCount: number
  hasChangedSources: boolean
  onRefreshLinkedSources: () => void
  onRegenerateSection: () => void
}

export default function DocumentSectionRegenerationControls({
  sectionTitle,
  disabled,
  pendingMode,
  reviewSourceCount,
  hasChangedSources,
  onRefreshLinkedSources,
  onRegenerateSection,
}: DocumentSectionRegenerationControlsProps): React.ReactElement {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 text-xs"
        data-testid="paper-section-refresh-sources-btn"
        disabled={disabled}
        onClick={onRefreshLinkedSources}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        {pendingMode === DOCUMENT_SECTION_REGENERATION_BODY_PRESERVING_MODE ? '갱신 중' : '본문 보존 갱신'}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 gap-1 text-xs"
            data-testid="paper-section-regenerate-btn"
            disabled={disabled}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {pendingMode === DOCUMENT_SECTION_REGENERATION_DESTRUCTIVE_MODE ? '재생성 중' : '섹션 다시 생성'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent data-testid="paper-section-regenerate-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>섹션 본문을 새 초안으로 교체할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 &ldquo;{sectionTitle}&rdquo; 본문이 연결 자료 기준의 새 자동 초안으로 대체됩니다.
              수동 편집 문장을 유지하려면 이 작업 대신 <span className="font-medium text-foreground">본문 보존 갱신</span>을 사용하세요.
              {reviewSourceCount > 0 && (
                <span className="mt-2 block">
                  확인이 필요한 원본 {reviewSourceCount}개가 포함되어 있습니다. 자동 초안 반영 후 수치와 해석 범위를 다시 확인해야 합니다.
                </span>
              )}
              {hasChangedSources && (
                <span className="mt-2 block">
                  원본 자료 변경이 감지된 상태입니다. 재생성은 최신 저장 자료를 기준으로 시도되지만, 문서 전체 구조 확인이 필요하면 먼저 재조립을 실행하세요.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              data-testid="paper-section-regenerate-confirm-btn"
              onClick={onRegenerateSection}
            >
              본문 교체하고 재생성
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
