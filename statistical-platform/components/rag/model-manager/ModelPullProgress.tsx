'use client'

import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { X, Loader2, CheckCircle2 } from 'lucide-react'
import type { PullProgress } from '@/lib/rag/services/ollama-model-service'

interface ModelPullProgressProps {
  modelName: string
  progress: PullProgress | null
  onCancel: () => void
}

/**
 * 모델 다운로드 진행률 표시
 *
 * NDJSON 스트리밍에서 받은 progress를 시각화.
 * - Progress bar (0-100%)
 * - 상태 텍스트 (pulling manifest, downloading, verifying, success)
 * - 취소 버튼
 */
export function ModelPullProgress({ modelName, progress, onCancel }: ModelPullProgressProps) {
  const isComplete = progress?.status === 'success'
  const isDownloading = progress?.total !== undefined && progress.total > 0

  /** 바이트를 사람이 읽기 쉬운 크기로 변환 */
  const formatBytes = (bytes?: number): string => {
    if (bytes === undefined || bytes === null) return ''
    if (bytes === 0) return '0 MB'
    const gb = bytes / (1024 ** 3)
    if (gb >= 1) return `${gb.toFixed(2)} GB`
    const mb = bytes / (1024 ** 2)
    return `${mb.toFixed(0)} MB`
  }

  return (
    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className="font-medium text-sm">{modelName}</span>
        </div>

        {!isComplete && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* 진행률 바 */}
      <Progress value={progress?.percent ?? 0} className="h-2" />

      {/* 상태 텍스트 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{progress?.status ?? '준비 중...'}</span>
        <span>
          {isDownloading && progress?.completed !== undefined
            ? `${formatBytes(progress.completed)} / ${formatBytes(progress.total)} (${progress.percent}%)`
            : progress?.percent
              ? `${progress.percent}%`
              : ''}
        </span>
      </div>
    </div>
  )
}
