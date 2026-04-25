'use client'

import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SectionWritingBannerProps {
  visible: boolean
  onCancel: () => void
  onTakeOwnership: () => void
}

export default function SectionWritingBanner({
  visible,
  onCancel,
  onTakeOwnership,
}: SectionWritingBannerProps): React.ReactElement | null {
  if (!visible) {
    return null
  }

  return (
    <div className="flex items-start gap-3 rounded-[24px] bg-surface px-4 py-4">
      <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">이 섹션은 자동으로 작성 중입니다.</p>
        <p className="text-xs leading-5 text-muted-foreground">
          계속 두면 이 섹션에 초안이 반영됩니다. 직접 수정하려면 이 섹션을 직접 편집으로 전환하고, 이 섹션의 자동 반영만 멈추려면 중단을 누르세요.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          className="rounded-full bg-surface-container px-3"
        >
          이 섹션 중단
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onTakeOwnership}
          className="rounded-full px-3"
        >
          직접 편집
        </Button>
      </div>
    </div>
  )
}
