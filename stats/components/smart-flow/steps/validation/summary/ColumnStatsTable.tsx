'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, LineChart } from 'lucide-react'
import { ColumnStatistics } from '@/types/smart-flow'
import { TableSkeleton } from './TableSkeleton'
import { useTerminology } from '@/hooks/use-terminology'
import { STEP_STYLES } from '@/components/smart-flow/common/style-constants'

interface ColumnStatsTableProps {
  columnStats: ColumnStatistics[]
  onColumnClick: (column: ColumnStatistics) => void
  isLoading?: boolean
}

export const ColumnStatsTable = memo(function ColumnStatsTable({
  columnStats,
  onColumnClick,
  isLoading = false
}: ColumnStatsTableProps) {
  const t = useTerminology()
  const vs = t.validationSummary

  if (isLoading) {
    return <TableSkeleton rows={5} columns={6} />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className={`text-left ${STEP_STYLES.tableHeaderCell}`}>{vs.tableHeaders.variableName}</th>
            <th className={`text-left ${STEP_STYLES.tableHeaderCell}`}>{vs.tableHeaders.type}</th>
            <th className={`text-left ${STEP_STYLES.tableHeaderCell}`}>{vs.tableHeaders.missingValues}</th>
            <th className={`text-left ${STEP_STYLES.tableHeaderCell}`}>{vs.tableHeaders.uniqueValues}</th>
            <th className={`text-left ${STEP_STYLES.tableHeaderCell}`}>{vs.tableHeaders.statistics}</th>
            <th className={`text-left ${STEP_STYLES.tableHeaderCell}`}>{vs.tableHeaders.actions}</th>
          </tr>
        </thead>
        <tbody>
          {columnStats.map((stat, idx) => (
            <tr key={idx} className="border-b hover:bg-muted/50">
              <td className={`${STEP_STYLES.tableBodyCell} font-medium`}>{stat.name}</td>
              <td className={STEP_STYLES.tableBodyCell}>
                <Badge variant={stat.type === 'numeric' ? 'default' : stat.type === 'categorical' ? 'secondary' : 'outline'}>
                  {stat.type === 'numeric' ? vs.typeLabels.numeric : stat.type === 'categorical' ? vs.typeLabels.categorical : vs.typeLabels.mixed}
                </Badge>
              </td>
              <td className={STEP_STYLES.tableBodyCell}>
                <span className={stat.missingCount > 0 ? 'text-warning' : ''}>
                  {stat.missingCount} ({stat.count ? ((stat.missingCount / (stat.count + stat.missingCount)) * 100).toFixed(1) : 'N/A'}%)
                </span>
              </td>
              <td className={STEP_STYLES.tableBodyCell}>{stat.uniqueValues}</td>
              <td className={STEP_STYLES.tableBodyCell}>
                {stat.type === 'numeric' ? (
                  <div className="text-xs">
                    <div>{vs.statistics.meanLabel}: {stat.mean?.toFixed(2)}</div>
                    <div>{vs.statistics.stdDevLabel}: {stat.std?.toFixed(2)}</div>
                  </div>
                ) : stat.type === 'categorical' && stat.topCategories ? (
                  <div className="text-xs">
                    <div>{vs.statistics.modeLabel}: {stat.topCategories[0]?.value}</div>
                    <div>{vs.statistics.frequencyLabel}: {stat.topCategories[0]?.count}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className={STEP_STYLES.tableBodyCell}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onColumnClick(stat)}
                  className="h-7"
                  aria-label={vs.viewDetailAriaLabel(stat.name)}
                >
                  {stat.type === 'numeric' ? (
                    <LineChart className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <BarChart className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="ml-1">{vs.buttons.view}</span>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
