'use client'

import { Save, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BioResultsHeaderProps {
  onSave: () => void
  isSaved: boolean
}

/** 결과 섹션 상단 액션 바 — 저장 버튼 */
export function BioResultsHeader({ onSave, isSaved }: BioResultsHeaderProps): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold">분석 결과</h3>
      <Button
        variant="outline"
        size="sm"
        onClick={onSave}
        disabled={isSaved}
        className="h-7 text-xs gap-1.5"
      >
        {isSaved ? (
          <><Check className="h-3.5 w-3.5" />저장됨</>
        ) : (
          <><Save className="h-3.5 w-3.5" />저장</>
        )}
      </Button>
    </div>
  )
}
