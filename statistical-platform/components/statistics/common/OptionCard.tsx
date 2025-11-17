/**
 * OptionCard 컴포넌트
 *
 * 통계 메서드나 옵션 선택을 위한 카드 UI
 * 회귀분석 페이지의 유형 선택 패턴을 재사용 가능하게 추출
 */

import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ReactNode } from 'react'

interface OptionCardProps {
  /** 카드 제목 */
  title: string
  /** 영문 부제목 (선택) */
  subtitle?: string
  /** 설명 */
  description: string
  /** 아이콘 (선택) */
  icon?: ReactNode
  /** 예시 (선택) */
  example?: string
  /** 수식 (선택) */
  equation?: string
  /** 뱃지 텍스트 (선택) */
  badge?: string
  /** 선택 여부 */
  isSelected: boolean
  /** 클릭 핸들러 */
  onClick: () => void
  /** 추가 CSS 클래스 */
  className?: string
  /** 비활성화 여부 */
  disabled?: boolean
}

export function OptionCard({
  title,
  subtitle,
  description,
  icon,
  example,
  equation,
  badge,
  isSelected,
  onClick,
  className,
  disabled = false
}: OptionCardProps) {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5',
        isSelected && 'ring-2 ring-primary shadow-lg',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={() => !disabled && onClick()}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            {icon && (
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-lg transition-colors',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {icon}
              </div>
            )}
            <div className="flex-1">
              <CardTitle className="text-base">{title}</CardTitle>
              {subtitle && <CardDescription className="text-xs mt-0.5">{subtitle}</CardDescription>}
            </div>
          </div>
          {badge && (
            <Badge variant={isSelected ? 'default' : 'outline'} className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{description}</p>

        {example && (
          <div className="bg-muted/50 rounded-md p-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">예시:</span> {example}
            </p>
          </div>
        )}

        {equation && (
          <div className="bg-accent/10 rounded-md p-2 font-mono text-xs text-center">
            {equation}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
