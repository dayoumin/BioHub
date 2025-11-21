/**
 * PurposeCard - 범용 선택 카드 컴포넌트
 *
 * 사용처:
 * 1. Smart Flow: 분석 목적 선택 (그룹 비교, 관계 분석 등)
 * 2. 개별 통계 페이지: 분석 방법 확인 카드
 * 3. 기타: 선택 가능한 옵션 카드
 *
 * 특징:
 * - 호버 효과 (shadow, scale)
 * - 선택 상태 표시 (border, background, check icon)
 * - 아이콘 + 제목 + 설명 + 예시
 * - 완전한 타입 안전성
 */

'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PurposeCardProps {
  /** 카드 아이콘 (lucide-react 권장) */
  icon: React.ReactNode
  /** 카드 제목 */
  title: string
  /** 카드 설명 */
  description: string
  /** 예시 텍스트 (옵션) */
  examples?: string
  /** 클릭 핸들러 */
  onClick: () => void
  /** 선택 상태 */
  selected: boolean
  /** 비활성화 상태 (옵션) */
  disabled?: boolean
  /** 추가 CSS 클래스 (옵션) */
  className?: string
}

export function PurposeCard({
  icon,
  title,
  description,
  examples,
  onClick,
  selected,
  disabled = false,
  className
}: PurposeCardProps) {
  // 키보드 핸들러 추가 (Enter, Space)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault() // Space의 기본 스크롤 동작 방지
      onClick()
    }
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        'border-2',
        !disabled && 'hover:shadow-lg hover:scale-[1.02]',
        selected
          ? 'border-primary bg-primary/5 shadow-md'
          : 'border-border hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={disabled ? undefined : onClick}
      onKeyDown={disabled ? undefined : handleKeyDown}
      role="radio"
      tabIndex={disabled ? -1 : 0}
      aria-checked={selected}
      aria-disabled={disabled}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2 rounded-lg transition-colors',
                selected ? 'bg-primary/20' : 'bg-muted'
              )}
            >
              {icon}
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {selected && (
            <Check className="w-5 h-5 text-primary shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {description}
        </p>
        {examples && (
          <p className="text-xs text-muted-foreground/80 italic">
            {examples}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
