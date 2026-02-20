'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTerminology } from '@/hooks/use-terminology'
import type { ColumnStatistics } from '@/types/smart-flow'

interface AdditionalStatsCardProps {
  columnStats: ColumnStatistics[]
}

export const AdditionalStatsCard = memo(function AdditionalStatsCard({
  columnStats
}: AdditionalStatsCardProps) {
  const t = useTerminology()
  const vd = t.validationDetails.additional

  const numericColumns = columnStats.filter(s => s.type === 'numeric')

  if (numericColumns.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vd.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {numericColumns.map((stat, idx) => (
            <div key={idx} className="border rounded-lg p-3">
              <h4 className="font-medium text-sm mb-2">{stat.name}</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{vd.labels.quartileRange}:</span>
                  <span>
                    Q1: {((stat.q25 || 0)).toFixed(1)} | Q3: {((stat.q75 || 0)).toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{vd.labels.iqr}:</span>
                  <span>{((stat.q75 || 0) - (stat.q25 || 0)).toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{vd.labels.range}:</span>
                  <span>{stat.min?.toFixed(1)} ~ {stat.max?.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{vd.labels.standardError}:</span>
                  <span>{(stat.std && stat.numericCount ? (stat.std / Math.sqrt(stat.numericCount)).toFixed(3) : '-')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{vd.labels.confidenceInterval}:</span>
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
