"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LazyReactECharts } from "@/lib/charts/LazyECharts"
import { statBaseOption, statCategoryAxis, statValueAxis, statTooltip, errorBarSeries, STAT_COLORS } from "@/lib/charts/echarts-stat-utils"
import type { EChartsOption } from "echarts"

interface GroupComparisonProps {
  data: Array<{ group: string; value: number }>
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  showErrorBars?: boolean
  colors?: string[]
  significantPairs?: Array<{ group1: string; group2: string; pValue: number }>
}

interface GroupSummary {
  group: string
  mean: number
  std: number
  sem: number
  n: number
  min: number
  max: number
  color: string
}

function calculateGroupStats(values: number[]): Omit<GroupSummary, 'group' | 'color'> {
  const n = values.length
  if (n === 0) {
    return { mean: 0, std: 0, sem: 0, n: 0, min: 0, max: 0 }
  }

  const mean = values.reduce((sum, val) => sum + val, 0) / n
  const variance = n > 1 ? values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1) : 0
  const std = Math.sqrt(variance)
  const sem = n > 1 ? std / Math.sqrt(n) : 0
  const min = values.reduce((a, b) => Math.min(a, b), Infinity)
  const max = values.reduce((a, b) => Math.max(a, b), -Infinity)

  return { mean, std, sem, n, min, max }
}

export function GroupComparison({
  data,
  title = "그룹별 평균 비교",
  xAxisLabel = "그룹",
  yAxisLabel = "평균값",
  showErrorBars = true,
  colors = STAT_COLORS,
  significantPairs = []
}: GroupComparisonProps) {

  const groupData = useMemo(() => {
    if (data.length === 0) return []

    const grouped = data.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = []
      acc[item.group].push(item.value)
      return acc
    }, {} as Record<string, number[]>)

    return Object.entries(grouped).map(([group, values], index) => {
      const stats = calculateGroupStats(values)
      return {
        group,
        ...stats,
        color: colors[index % colors.length]
      }
    })
  }, [data, colors])

  const chartOption = useMemo((): EChartsOption => {
    const categories = groupData.map((g) => g.group)
    const means = groupData.map((g) => g.mean)
    const errorUpper = groupData.map((g) => g.mean + g.sem)
    const errorLower = groupData.map((g) => g.mean - g.sem)

    return {
      ...statBaseOption(),
      xAxis: { ...statCategoryAxis(categories, xAxisLabel) },
      yAxis: { ...statValueAxis(yAxisLabel), name: yAxisLabel },
      tooltip: statTooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter(params: unknown) {
          const arr = params as Array<Record<string, unknown>>
          const p = arr[0]
          const idx = p.dataIndex as number
          const g = groupData[idx]
          if (!g) return ''
          return `<b>${g.group}</b><br/>평균: ${g.mean.toFixed(4)} ± ${g.sem.toFixed(4)}<br/>표준편차: ${g.std.toFixed(4)}<br/>n = ${g.n}<br/>범위: [${g.min.toFixed(2)}, ${g.max.toFixed(2)}]`
        },
      }),
      series: [
        {
          type: 'bar',
          data: means.map((val, i) => ({
            value: val,
            itemStyle: { color: groupData[i].color },
          })),
          barMaxWidth: 60,
        },
        ...(showErrorBars
          ? [errorBarSeries(
              groupData.map((_, i) => [i, errorUpper[i], errorLower[i]]),
              { lineWidth: 1 },
            )]
          : []),
      ] as NonNullable<EChartsOption['series']>,
    }
  }, [groupData, xAxisLabel, yAxisLabel, showErrorBars])

  if (groupData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>데이터가 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            그룹별 데이터를 선택해주세요
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {groupData.length}개 그룹 비교 (총 n = {data.length})
          {significantPairs.length > 0 && ` • ${significantPairs.length}개 유의한 차이`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LazyReactECharts option={chartOption} style={{ height: 320 }} opts={{ renderer: 'svg' }} />

        <div className="mt-4">
          <h4 className="font-medium mb-3">그룹별 상세 정보</h4>
          <div className="grid gap-3 max-h-40 overflow-y-auto">
            {groupData.map((group) => (
              <div key={group.group} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: group.color }}
                  />
                  <div>
                    <div className="font-medium">{group.group}</div>
                    <div className="text-sm text-muted-foreground">n = {group.n}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{group.mean.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">
                    ± {group.sem.toFixed(3)} SEM
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {significantPairs.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-3">유의한 그룹 간 차이</h4>
            <div className="grid gap-2 max-h-32 overflow-y-auto">
              {significantPairs.map((pair, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-success-bg border border-success-border rounded">
                  <span className="text-sm font-medium">
                    {pair.group1} vs {pair.group2}
                  </span>
                  <Badge variant={pair.pValue < 0.001 ? "default" : "secondary"}>
                    {pair.pValue < 0.001 ? "p < 0.001" : `p = ${pair.pValue.toFixed(3)}`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-sm">
            <div className="font-medium mb-1">해석 가이드:</div>
            <div>• 막대 높이는 각 그룹의 평균값을 나타냅니다</div>
            {showErrorBars && (
              <div>• 오차막대는 표준오차(SEM)를 나타냅니다</div>
            )}
            <div>• 유의한 차이가 있는 그룹 쌍은 별도로 표시됩니다</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
