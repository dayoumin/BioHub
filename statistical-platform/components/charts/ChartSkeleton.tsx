'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface ChartSkeletonProps {
  height?: number
  title?: boolean
  description?: boolean
  /** Whether to wrap content in a Card component (default: true) */
  showCard?: boolean
}

/**
 * ChartSkeleton 컴포넌트
 *
 * 차트 로딩 중에 표시되는 스켈레톤 UI
 *
 * @component
 */
export function ChartSkeleton({
  height = 400,
  title = true,
  description = true,
  showCard = true
}: ChartSkeletonProps) {
  // Content without Card wrapper
  const content = (
    <>
      <div className="mb-4">
        {title && (
          <Skeleton className="h-6 w-48 mb-2" />
        )}
        {description && (
          <Skeleton className="h-4 w-72" />
        )}
      </div>
      <Skeleton className="w-full" style={{ height }} />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </>
  )

  // Render without Card wrapper
  if (!showCard) {
    return <div className="w-full">{content}</div>
  }

  // Render with Card wrapper
  return (
    <Card className="w-full">
      <CardHeader>
        {title && (
          <Skeleton className="h-6 w-48 mb-2" />
        )}
        {description && (
          <Skeleton className="h-4 w-72" />
        )}
      </CardHeader>
      <CardContent>
        <Skeleton className="w-full" style={{ height }} />
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}

export default ChartSkeleton