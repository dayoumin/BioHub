'use client'

import { memo } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTerminology } from '@/hooks/use-terminology'
import type { ColumnStatistics } from '@/types/smart-flow'

interface OutlierAnalysisCardProps {
  columnStats: ColumnStatistics[]
}

export const OutlierAnalysisCard = memo(function OutlierAnalysisCard({
  columnStats
}: OutlierAnalysisCardProps) {
  const t = useTerminology()
  const vd = t.validationDetails.outlier

  const numericColumnsWithOutliers = columnStats.filter(
    s => s.type === 'numeric' && s.outliers && s.outliers.length > 0
  )

  if (numericColumnsWithOutliers.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          {vd.title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {columnStats
            .filter(s => s.type === 'numeric')
            .map((stat, idx) => {
              const outlierCount = stat.outliers?.length || 0
              const outlierPercent = stat.numericCount > 0 ? (outlierCount / stat.numericCount * 100) : 0

              return (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{stat.name}</h4>
                    <Badge
                      variant={outlierCount === 0 ? "success" :
                              outlierPercent > 10 ? "warning" : "secondary"}
                      className="text-xs"
                    >
                      {vd.outlierCount(outlierCount, outlierPercent)}
                    </Badge>
                  </div>

                  {outlierCount > 0 && (
                    <>
                      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-muted-foreground">{vd.detectionMethod}:</span>
                          <span className="ml-2">IQR × 1.5</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{vd.position}:</span>
                          <span className="ml-2">
                            {vd.lowerCount(stat.outliers?.filter((v: number) => v < (stat.q25! - 1.5 * ((stat.q75 || 0) - (stat.q25 || 0)))).length ?? 0)},
                            {vd.upperCount(stat.outliers?.filter((v: number) => v > (stat.q75! + 1.5 * ((stat.q75 || 0) - (stat.q25 || 0)))).length ?? 0)}
                          </span>
                        </div>
                      </div>

                      <div className="p-2 bg-muted/30 rounded text-xs">
                        <p className="font-medium mb-1">{vd.outlierValues}:</p>
                        <p className="font-mono">
                          {stat.outliers?.slice(0, 10).map((v: number) => v.toFixed(2)).join(', ')}
                          {(stat.outliers?.length ?? 0) > 10 && vd.moreValues((stat.outliers?.length ?? 0) - 10)}
                        </p>
                      </div>

                      {/* 처리 방법 제안 */}
                      <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs">
                        <p className="font-medium text-amber-900 dark:text-amber-100 mb-1">{vd.treatmentTitle}</p>
                        {outlierPercent < 5 ? (
                          <p className="text-amber-700 dark:text-amber-300">
                            {vd.treatmentUnder5}
                          </p>
                        ) : outlierPercent < 10 ? (
                          <p className="text-amber-700 dark:text-amber-300">
                            {vd.treatment5to10}
                          </p>
                        ) : (
                          <p className="text-amber-700 dark:text-amber-300">
                            {vd.treatmentOver10}
                          </p>
                        )}
                      </div>
                    </>
                  )}

                  {outlierCount === 0 && (
                    <p className="text-sm text-muted-foreground">{vd.noOutliers}</p>
                  )}
                </div>
              )
            })}
        </div>
      </CardContent>
    </Card>
  )
})
