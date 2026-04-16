'use client'

import { type ReactNode } from 'react'
import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { BIOLOGY_PANEL_SOFT } from '@/lib/design-tokens/biology'
import { cn } from '@/lib/utils'

export interface MetricItem {
  label: string
  value: ReactNode
  tooltip?: string
  className?: string
}

interface ResultMetricsGridProps {
  items: MetricItem[]
  columns?: 2 | 3 | 4
  className?: string
}

/**
 * 통계 결과 메트릭을 일관된 그리드로 표시.
 *
 * 사용 예:
 * ```tsx
 * <ResultMetricsGrid
 *   items={[
 *     { label: 't 통계량', value: '2.45', tooltip: 'Student t 검정 통계량' },
 *     { label: 'p-값', value: <PValueBadge p={0.012} />, tooltip: '유의확률' },
 *   ]}
 *   columns={4}
 * />
 * ```
 */
export function ResultMetricsGrid({
  items,
  columns = 4,
  className,
}: ResultMetricsGridProps): React.ReactElement {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }

  return (
    <TooltipProvider>
      <div className={cn('grid gap-3', gridCols[columns], className)}>
        {items.map((item, i) => (
          <div key={i} className={cn(BIOLOGY_PANEL_SOFT, 'p-3 text-center', item.className)}>
            {item.tooltip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-help">
                    <p className="mb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      {item.label}
                      <HelpCircle className="w-3 h-3" />
                    </p>
                    <div className="text-lg font-bold font-mono tabular-nums">
                      {item.value}
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">{item.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <p className="mb-1 text-xs text-muted-foreground">{item.label}</p>
                <div className="text-lg font-bold font-mono tabular-nums">
                  {item.value}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </TooltipProvider>
  )
}
