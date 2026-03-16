'use client'

/**
 * AssumptionBadges — 가정 검정 결과 뱃지 (공통 컴포넌트)
 *
 * recommendation.assumptions 배열을 받아 passed/failed 뱃지를 렌더링합니다.
 * AutoRecommendationConfirm과 NaturalLanguageInput에서 공유합니다.
 */

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Check, AlertTriangle } from 'lucide-react'

interface AssumptionEntry {
  name: string
  passed: boolean
  pValue?: number
}

interface AssumptionBadgesProps {
  assumptions: AssumptionEntry[]
  className?: string
}

export const AssumptionBadges = memo(function AssumptionBadges({
  assumptions,
  className,
}: AssumptionBadgesProps) {
  if (assumptions.length === 0) return null

  return (
    <div className={className ?? 'flex flex-wrap gap-2'}>
      {assumptions.map((assumption, i) => (
        <Badge
          key={i}
          variant={assumption.passed ? 'default' : 'destructive'}
          className="text-xs"
        >
          {assumption.passed
            ? <Check className="w-3 h-3 mr-1" />
            : <AlertTriangle className="w-3 h-3 mr-1" />}
          {assumption.name}
          {assumption.pValue !== undefined && ` (p=${assumption.pValue.toFixed(3)})`}
        </Badge>
      ))}
    </div>
  )
})
