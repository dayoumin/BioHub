"use client"

import { memo, type ReactNode, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LazyReactECharts } from "@/lib/charts/LazyECharts"
import {
  SCATTER_LARGE_THRESHOLD,
  STAT_COLORS,
  selectScatterRenderer,
  statBaseOption,
  statTooltip,
  statValueAxis,
} from "@/lib/charts/echarts-stat-utils"
import { resolveChartPalette } from "@/lib/charts/chart-color-resolver"
import type { EChartsOption } from "echarts"

interface ScatterplotProps {
  data: Array<{ x: number; y: number }>
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  height?: number
  showTrendLine?: boolean
  color?: string
  correlationCoefficient?: number
  pValue?: number
  headerActions?: ReactNode
  showCard?: boolean
}

interface TrendLineData {
  slope: number
  intercept: number
  r2: number
}

function calculateTrendLine(data: Array<{ x: number; y: number }>): TrendLineData {
  const n = data.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }

  const sumX = data.reduce((sum, point) => sum + point.x, 0)
  const sumY = data.reduce((sum, point) => sum + point.y, 0)
  const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0)
  const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0)
  const sumYY = data.reduce((sum, point) => sum + point.y * point.y, 0)

  const meanY = sumY / n
  const denominator = n * sumXX - sumX * sumX
  if (denominator === 0) return { slope: 0, intercept: meanY, r2: 0 }

  const slope = (n * sumXY - sumX * sumY) / denominator
  const intercept = meanY - slope * (sumX / n)
  const totalSumSquares = sumYY - n * meanY * meanY
  const residualSumSquares = data.reduce((sum, point) => {
    const predicted = slope * point.x + intercept
    return sum + Math.pow(point.y - predicted, 2)
  }, 0)

  return {
    slope,
    intercept,
    r2: totalSumSquares > 0 ? 1 - residualSumSquares / totalSumSquares : 0,
  }
}

export const Scatterplot = memo(function Scatterplot({
  data,
  title = "Scatter Plot",
  xAxisLabel = "X",
  yAxisLabel = "Y",
  height = 460,
  showTrendLine = true,
  color,
  correlationCoefficient,
  pValue,
  headerActions,
  showCard = true,
}: ScatterplotProps) {
  const dotColor = color ?? STAT_COLORS[0]

  const { trendLine, xExtent } = useMemo(() => {
    if (data.length === 0) {
      return { trendLine: null, xExtent: [0, 1] as [number, number] }
    }

    let xMin = Infinity
    let xMax = -Infinity

    for (const point of data) {
      if (point.x < xMin) xMin = point.x
      if (point.x > xMax) xMax = point.x
    }

    return {
      trendLine: showTrendLine ? calculateTrendLine(data) : null,
      xExtent: [xMin, xMax] as [number, number],
    }
  }, [data, showTrendLine])

  const chartOption = useMemo((): EChartsOption => {
    const scatterData = data.map((point) => [point.x, point.y])

    const series: NonNullable<EChartsOption["series"]> = [
      {
        name: "Data",
        type: "scatter",
        data: scatterData,
        symbolSize: 8,
        itemStyle: { color: dotColor, opacity: 0.7 },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: "rgba(0,0,0,0.2)", opacity: 1 },
        },
        large: true,
        largeThreshold: SCATTER_LARGE_THRESHOLD,
      } as Record<string, unknown>,
    ]

    if (showTrendLine && trendLine && data.length >= 2) {
      const trendData = [
        [xExtent[0], trendLine.slope * xExtent[0] + trendLine.intercept],
        [xExtent[1], trendLine.slope * xExtent[1] + trendLine.intercept],
      ]

      series.push({
        name: "Trend line",
        type: "line",
        data: trendData,
        symbol: "none",
        lineStyle: { color: resolveChartPalette(3)[2], width: 2, type: "dashed" as const },
        tooltip: { show: false },
      } as Record<string, unknown>)
    }

    return {
      ...statBaseOption(),
      xAxis: { ...statValueAxis(xAxisLabel), type: "value" as const, scale: true },
      yAxis: { ...statValueAxis(yAxisLabel), name: yAxisLabel, scale: true },
      series,
      tooltip: statTooltip({
        formatter(params: unknown) {
          const point = params as { seriesName: string; value: number[] }
          if (point.seriesName === "Trend line") return ""
          return `<b>${xAxisLabel}</b>: ${point.value[0].toFixed(4)}<br/><b>${yAxisLabel}</b>: ${point.value[1].toFixed(4)}`
        },
      }),
    }
  }, [data, dotColor, showTrendLine, trendLine, xExtent, xAxisLabel, yAxisLabel])

  if (data.length === 0) {
    if (!showCard) {
      return (
        <div className="flex h-64 items-center justify-center rounded-xl border border-border/40 bg-card text-muted-foreground">
          Select two numeric variables to draw a scatter plot.
        </div>
      )
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            Select two numeric variables to draw a scatter plot.
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartBody = (
    <LazyReactECharts
      option={chartOption}
      style={{ height }}
      opts={{ renderer: selectScatterRenderer(data.length) }}
    />
  )

  if (!showCard) {
    return chartBody
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>{title}</CardTitle>
          <div className="flex min-w-[280px] flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Badge variant="secondary">n = {data.length}</Badge>
              {trendLine ? <Badge variant="secondary">R² = {trendLine.r2.toFixed(4)}</Badge> : null}
              {correlationCoefficient !== undefined ? (
                <Badge variant={Math.abs(correlationCoefficient) > 0.7 ? "default" : "secondary"}>
                  r = {correlationCoefficient.toFixed(4)}
                </Badge>
              ) : null}
              {pValue !== undefined ? (
                <Badge variant={pValue < 0.05 ? "default" : "secondary"}>
                  p = {pValue.toFixed(6)}
                </Badge>
              ) : null}
            </div>
            {headerActions ? <div className="flex flex-wrap items-center justify-end gap-3">{headerActions}</div> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartBody}
      </CardContent>
    </Card>
  )
})
