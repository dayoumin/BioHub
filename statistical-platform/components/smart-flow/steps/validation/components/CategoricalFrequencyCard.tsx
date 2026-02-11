'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useTerminology } from '@/hooks/use-terminology'
import type { ColumnStatistics } from '@/types/smart-flow'
import { VALIDATION_CONSTANTS } from '../utils'

interface CategoricalFrequencyCardProps {
  columnStats: ColumnStatistics[]
}

export const CategoricalFrequencyCard = memo(function CategoricalFrequencyCard({
  columnStats
}: CategoricalFrequencyCardProps) {
  const t = useTerminology()
  const vd = t.validationDetails.categorical

  const categoricalColumns = columnStats.filter(s => s.type === 'categorical')

  if (categoricalColumns.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{vd.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categoricalColumns.map((stat, idx) => {
            // 한 번만 계산
            const totalValidCount = stat.topValues?.reduce((acc, v) => acc + v.count, 0) || 1
            const hasSkewedDistribution = stat.topValues?.[0] &&
              (stat.topValues[0].count / totalValidCount) > VALIDATION_CONSTANTS.SKEWED_THRESHOLD
            const hasSparseCategories = stat.topValues?.some(v => v.count < VALIDATION_CONSTANTS.SPARSE_THRESHOLD)

            return (
              <div key={idx} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{stat.name}</h4>
                  <div className="flex gap-2">
                    <Badge variant="secondary">
                      {vd.categoryCount(stat.uniqueValues)}
                    </Badge>
                    {hasSkewedDistribution && (
                      <Badge variant="warning" className="text-xs">{vd.skewedDistribution}</Badge>
                    )}
                    {hasSparseCategories && !hasSkewedDistribution && (
                      <Badge variant="warning" className="text-xs">{vd.sparseCategory}</Badge>
                    )}
                  </div>
                </div>
                {stat.topValues && stat.topValues.length > 0 ? (
                  <div className="space-y-2">
                    {stat.topValues.slice(0, VALIDATION_CONSTANTS.MAX_DISPLAY_CATEGORIES).map((val, vidx) => {
                      const percentage = ((val.count / totalValidCount) * 100).toFixed(1)
                      return (
                        <div key={vidx} className="flex items-center gap-3">
                          <span className="text-sm flex-1 truncate">{val.value || vd.emptyValue}</span>
                          <span className="text-sm text-muted-foreground">{vd.itemCount(val.count)}</span>
                          <div className="w-24">
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{percentage}%</span>
                        </div>
                      )
                    })}
                    {stat.uniqueValues > VALIDATION_CONSTANTS.MAX_DISPLAY_CATEGORIES && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {vd.moreCategories(stat.uniqueValues - VALIDATION_CONSTANTS.MAX_DISPLAY_CATEGORIES)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{vd.noFrequencyInfo}</p>
                )}
                {stat.missingCount > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    {vd.missingCount(stat.missingCount)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
})
