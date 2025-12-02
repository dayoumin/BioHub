'use client'

import { cn } from '@/lib/utils'

interface ProgressIndicatorProps {
  current: number
  total: number
  className?: string
}

export function ProgressIndicator({
  current,
  total,
  className
}: ProgressIndicatorProps) {
  const percentage = Math.round((current / total) * 100)

  return (
    <div className={cn('space-y-2', className)}>
      {/* 상단 텍스트 */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          질문 <span className="font-medium text-foreground">{current}</span> / {total}
        </span>
        <span className="text-muted-foreground">
          {percentage}%
        </span>
      </div>

      {/* 프로그레스 바 */}
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
