'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ResultMetricsGrid, type MetricItem } from './ResultMetricsGrid'

interface BioResultSummaryProps {
  /** 상단 핵심 메트릭 (선택) — ResultMetricsGrid로 렌더링 */
  metrics?: MetricItem[]
  /** 메트릭 그리드 컬럼 수 */
  columns?: 2 | 3 | 4
  /** 결과 테이블/차트 등 메인 콘텐츠 */
  children: ReactNode
  className?: string
}

/**
 * Bio-Tools 결과 표시 래퍼.
 *
 * Analysis Flow의 결과 표시 패턴(메트릭 그리드 → 상세 콘텐츠)과
 * 동일한 시각 언어를 사용하여 일관된 UX 제공.
 *
 * 사용 예:
 * ```tsx
 * <BioResultSummary
 *   metrics={[
 *     { label: 'Shannon', value: '2.45', tooltip: 'Shannon diversity index' },
 *     { label: 'Simpson', value: '0.89', tooltip: 'Simpson diversity index' },
 *   ]}
 * >
 *   <DataTable ... />
 * </BioResultSummary>
 * ```
 */
export function BioResultSummary({
  metrics,
  columns = 4,
  children,
  className,
}: BioResultSummaryProps): React.ReactElement {
  return (
    <div className={cn('space-y-6', className)}>
      {metrics && metrics.length > 0 && (
        <ResultMetricsGrid items={metrics} columns={columns} />
      )}
      {children}
    </div>
  )
}
