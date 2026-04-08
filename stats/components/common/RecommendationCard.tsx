'use client'

/**
 * 통계 메서드 추천 카드
 *
 * 홈 챗에서 data-consultation 트랙 감지 시 표시.
 * 메서드명 + 뱃지(추천/대안) + 이유 + "이 분석 시작하기" 버튼
 */

import { useCallback } from 'react'
import { ArrowRight, Star, CircleDot } from 'lucide-react'
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

  const handleClick = useCallback(() => {
    onSelect(methodId)
  }, [methodId, onSelect])

  return (
    <div className={cn(recommendationCardBase, badge === 'recommended' && 'border-l-primary')}>
      {/* 헤더: 뱃지 + 메서드명 */}
      <div className="flex items-center gap-2">
        {badge === 'recommended' ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
            <Star className="w-3 h-3" />
            추천
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            <CircleDot className="w-3 h-3" />
            대안
          </span>
        )}
      </div>

      {/* 메서드명 */}
      <div>
        <p className="text-sm font-semibold text-foreground leading-snug">{koreanName}</p>
        <p className="text-xs text-muted-foreground/70">{methodName}</p>
      </div>

      {/* 이유 */}
      <p className="text-xs text-muted-foreground leading-relaxed">{reason}</p>

      {/* CTA */}
      <Button
        variant="ghost"
        size="sm"
        className="self-start gap-1 text-primary hover:text-primary hover:bg-primary/10 h-6 px-1.5 text-xs"
        onClick={handleClick}
      >
        이 분석 시작하기
        <ArrowRight className="w-3 h-3" />
      </Button>
    </div>
  )
}
