'use client'

import { memo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ColumnStatistics } from '@/types/smart-flow'
import { VALIDATION_CONSTANTS } from '../utils'

interface CategoricalFrequencyCardProps {
  columnStats: ColumnStatistics[]
}

export const CategoricalFrequencyCard = memo(function CategoricalFrequencyCard({
  columnStats
}: CategoricalFrequencyCardProps) {
  const categoricalColumns = columnStats.filter(s => s.type === 'categorical')

  if (categoricalColumns.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>범주형 변수 빈도 분석</CardTitle>
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
                      {stat.uniqueValues}개 카테고리
                    </Badge>
                    {hasSkewedDistribution && (
                      <Badge variant="warning" className="text-xs">편향 분포</Badge>
                    )}
                    {hasSparseCategories && !hasSkewedDistribution && (
                      <Badge variant="warning" className="text-xs">희소 카테고리</Badge>
                    )}
                  </div>
                </div>
                {stat.topValues && stat.topValues.length > 0 ? (
                  <div className="space-y-2">
                    {stat.topValues.slice(0, VALIDATION_CONSTANTS.MAX_DISPLAY_CATEGORIES).map((val, vidx) => {
                      const percentage = ((val.count / totalValidCount) * 100).toFixed(1)
                      return (
                        <div key={vidx} className="flex items-center gap-3">
                          <span className="text-sm flex-1 truncate">{val.value || '(빈 값)'}</span>
                          <span className="text-sm text-muted-foreground">{val.count}개</span>
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
                        ... 외 {stat.uniqueValues - VALIDATION_CONSTANTS.MAX_DISPLAY_CATEGORIES}개 카테고리
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">빈도 정보 없음</p>
                )}
                {stat.missingCount > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    결측값: {stat.missingCount}개
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
