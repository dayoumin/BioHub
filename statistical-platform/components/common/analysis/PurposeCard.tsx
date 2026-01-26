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
  /** 부제목 (옵션) */
  subtitle?: string
  /** 카드 설명 */
  description: string
  /** 예시 텍스트 (옵션) */
  examples?: string
  /** 추가 콘텐츠 (옵션) - 커스텀 UI 삽입용 */
  children?: React.ReactNode
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
  subtitle,
  description,
  examples,
  children,
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
        'group cursor-pointer transition-all duration-300 relative overflow-hidden',
        'border-2',
        !disabled && 'hover:shadow-xl hover:scale-[1.02] hover:border-primary/50',
        selected
          ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
          : 'border-border',
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
      {/* Selection Indicator (Corner) */}
      {selected && (
        <div className="absolute top-0 right-0 p-1.5 bg-primary rounded-bl-xl shadow-sm animate-in fade-in zoom-in duration-200">
          <Check className="w-3.5 h-3.5 text-primary-foreground" data-testid="check-icon" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-xl transition-colors duration-300',
                selected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'
              )}
            >
              {icon}
            </div>
            <div>
              <CardTitle className="text-base font-bold tracking-tight">{title}</CardTitle>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/80 transition-colors">
          {description}
        </p>
        {examples && (
          <p className="text-xs text-muted-foreground/80 italic border-t pt-2 mt-2">
            예: {examples}
          </p>
        )}
        {children}
      </CardContent>
    </Card>
  )
}
