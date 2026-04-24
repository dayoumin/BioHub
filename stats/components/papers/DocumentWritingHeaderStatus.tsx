'use client'

import { HardDriveDownload, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DocumentWritingStatus } from '@/lib/research/document-blueprint-types'

interface DocumentWritingHeaderStatusProps {
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'conflict'
  writingStatusLabel: string | null
  writingStatus?: DocumentWritingStatus
  onRetry?: () => void
}

export default function DocumentWritingHeaderStatus({
  saveStatus,
  writingStatusLabel,
  writingStatus,
  onRetry,
}: DocumentWritingHeaderStatusProps): React.ReactElement {
  return (
    <>
      <Badge variant="secondary" className="hidden text-[10px] md:inline-flex">
        <HardDriveDownload className="mr-1 h-3 w-3" />
        로컬 자동 저장
      </Badge>
      <Badge variant="outline" className="text-[10px]">
        {saveStatus === 'saved' && '저장됨'}
        {saveStatus === 'saving' && '저장 중...'}
        {saveStatus === 'unsaved' && '변경됨'}
        {saveStatus === 'conflict' && '충돌'}
      </Badge>
      {writingStatusLabel && (
        <Badge
          variant={writingStatus === 'failed' ? 'destructive' : 'secondary'}
          className="text-[10px]"
        >
          {writingStatusLabel}
        </Badge>
      )}
      {writingStatus === 'failed' && onRetry && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          재시도
        </Button>
      )}
    </>
  )
}
