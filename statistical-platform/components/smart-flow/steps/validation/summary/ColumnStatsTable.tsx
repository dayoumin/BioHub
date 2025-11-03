'use client'

import { memo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BarChart, LineChart } from 'lucide-react'
import { ColumnStatistics } from '@/types/smart-flow'
import { TableSkeleton } from './TableSkeleton'

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
  if (isLoading) {
    return <TableSkeleton rows={5} columns={6} />
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-2">변수명</th>
            <th className="text-left p-2">타입</th>
            <th className="text-left p-2">결측값</th>
            <th className="text-left p-2">고유값</th>
            <th className="text-left p-2">통계</th>
            <th className="text-left p-2">작업</th>
          </tr>
        </thead>
        <tbody>
          {columnStats.map((stat, idx) => (
            <tr key={idx} className="border-b hover:bg-muted/50">
              <td className="p-2 font-medium">{stat.name}</td>
              <td className="p-2">
                <Badge variant={stat.type === 'numeric' ? 'default' : stat.type === 'categorical' ? 'secondary' : 'outline'}>
                  {stat.type === 'numeric' ? '숫자형' : stat.type === 'categorical' ? '범주형' : '혼합'}
                </Badge>
              </td>
              <td className="p-2">
                <span className={stat.missingCount > 0 ? 'text-yellow-600' : ''}>
                  {stat.missingCount} ({stat.count ? ((stat.missingCount / (stat.count + stat.missingCount)) * 100).toFixed(1) : 'N/A'}%)
                </span>
              </td>
              <td className="p-2">{stat.uniqueValues}</td>
              <td className="p-2">
                {stat.type === 'numeric' ? (
                  <div className="text-xs">
                    <div>평균: {stat.mean?.toFixed(2)}</div>
                    <div>표준편차: {stat.std?.toFixed(2)}</div>
                  </div>
                ) : stat.type === 'categorical' && stat.topCategories ? (
                  <div className="text-xs">
                    <div>최빈값: {stat.topCategories[0]?.value}</div>
                    <div>빈도: {stat.topCategories[0]?.count}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="p-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onColumnClick(stat)}
                  className="h-7"
                  aria-label={`${stat.name} 변수 상세 보기`}
                >
                  {stat.type === 'numeric' ? (
                    <LineChart className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <BarChart className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="ml-1">보기</span>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})