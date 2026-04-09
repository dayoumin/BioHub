'use client'

/**
 * 통계 메서드 추천 카드 (컴팩트 인라인)
 *
 * 한 줄: 뱃지 + 메서드명 + "분석하기" 버튼
 * 클릭하면 이유 텍스트가 아래로 펼쳐짐
 */

import { useState, useCallback } from 'react'
import { ArrowRight, Star, CircleDot, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { recommendationCardBase } from '@/components/common/card-styles'
import type { MethodRecommendation } from '@/types/analysis'

interface RecommendationCardProps {
  recommendation: MethodRecommendation
  onSelect: (methodId: string) => void
}

export function RecommendationCard({ recommendation, onSelect }: RecommendationCardProps): React.ReactElement {
  const { methodId, methodName, koreanName, reason, badge } = recommendation
  const [expanded, setExpanded] = useState(false)

  const handleSelect = useCallback(() => {
    onSelect(methodId)
  }, [methodId, onSelect])

  const toggleExpand = useCallback(() => {
    setExpanded((prev) => !prev)
  }, [])

  return (
    <div>
      {/* 메인 행: 뱃지 + 메서드명 + 펼치기 + 분석하기 */}
      <div className={recommendationCardBase}>
        {/* 뱃지 */}
        {badge === 'recommended' ? (
          <Star className="w-3.5 h-3.5 text-primary shrink-0" />
        ) : (
          <CircleDot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}

        {/* 메서드명 — 클릭으로 이유 펼침 */}
        <button
          onClick={toggleExpand}
          className="flex items-center gap-1 min-w-0 text-left"
        >
          <span className="text-sm font-medium text-foreground truncate">{koreanName}</span>
          <ChevronDown className={cn(
            'w-3 h-3 text-muted-foreground shrink-0 transition-transform duration-200',
            expanded && 'rotate-180'
          )} />
        </button>

        {/* 우측 여백 채움 */}
        <div className="flex-1" />

        {/* 분석하기 버튼 */}
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1 text-primary hover:text-primary hover:bg-primary/10 h-7 px-2 text-xs"
          onClick={handleSelect}
        >
          분석하기
          <ArrowRight className="w-3 h-3" />
        </Button>
      </div>

      {/* 펼침 영역: 이유 + 영문명 */}
      {expanded && reason && (
        <div className="px-3 pb-2 pt-1 text-xs text-muted-foreground leading-relaxed border border-t-0 border-border/60 rounded-b-lg -mt-px bg-muted/30">
          <span className="text-muted-foreground/60">{methodName}</span>
          {' — '}
          {reason}
        </div>
      )}
    </div>
  )
}
