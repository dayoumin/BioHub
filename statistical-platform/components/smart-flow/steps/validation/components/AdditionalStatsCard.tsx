'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ColumnStatistics } from '@/types/smart-flow'

interface AdditionalStatsCardProps {
  columnStats: ColumnStatistics[]
}

export const AdditionalStatsCard = memo(function AdditionalStatsCard({
  columnStats
}: AdditionalStatsCardProps) {
  const numericColumns = columnStats.filter(s => s.type === 'numeric')

  if (numericColumns.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>추가 기초 통계</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {numericColumns.map((stat, idx) => (
            <div key={idx} className="border rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2">{stat.name}</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">분위수 범위:</span>
                  <span>
                    Q1: {((stat.q25 || 0)).toFixed(1)} | Q3: {((stat.q75 || 0)).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IQR:</span>
                  <span>{((stat.q75 || 0) - (stat.q25 || 0)).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">범위:</span>
                  <span>{stat.min?.toFixed(1)} ~ {stat.max?.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">표준오차 (SE):</span>
                  <span>{(stat.std && stat.numericCount ? (stat.std / Math.sqrt(stat.numericCount)).toFixed(3) : '-')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">95% CI:</span>
                  <span className="text-[10px]">
                    [{(stat.mean! - 1.96 * (stat.std! / Math.sqrt(stat.numericCount))).toFixed(1)},
                     {(stat.mean! + 1.96 * (stat.std! / Math.sqrt(stat.numericCount))).toFixed(1)}]
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
})
