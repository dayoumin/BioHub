"use client"

import { useMemo, memo } from "react"
import { useTheme } from "next-themes"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LazyReactECharts } from "@/lib/charts/LazyECharts"
import { statBaseOption, statValueAxis, statTooltip, STAT_COLORS, SCATTER_LARGE_THRESHOLD, selectScatterRenderer } from "@/lib/charts/echarts-stat-utils"
import { resolveChartPalette } from "@/lib/charts/chart-color-resolver"
import type { EChartsOption } from "echarts"

interface ScatterplotProps {
  data: Array<{ x: number; y: number }>
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  showTrendLine?: boolean
  color?: string
  correlationCoefficient?: number
  pValue?: number
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

  const meanX = sumX / n
  const meanY = sumY / n

  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return { slope: 0, intercept: meanY, r2: 0 }
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = meanY - slope * meanX

  // Calculate R-squared
  const totalSumSquares = sumYY - n * meanY * meanY
  const residualSumSquares = data.reduce((sum, point) => {
    const predicted = slope * point.x + intercept
    return sum + Math.pow(point.y - predicted, 2)
  }, 0)

  const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0

  return { slope, intercept, r2 }
}

export const Scatterplot = memo(function Scatterplot({
  data,
  title = "산점도",
  xAxisLabel = "X 변수",
  yAxisLabel = "Y 변수",
  showTrendLine = true,
  color,
  correlationCoefficient,
  pValue
}: ScatterplotProps) {
  const { resolvedTheme } = useTheme()
  const dotColor = color ?? STAT_COLORS[0]

  const { trendLine, xExtent, meanX, meanY } = useMemo(() => {
    if (data.length === 0) {
      return { trendLine: null, xExtent: [0, 1] as [number, number], meanX: 0, meanY: 0 }
    }

    const trendLine = showTrendLine ? calculateTrendLine(data) : null
    let xMin = Infinity, xMax = -Infinity, sumX = 0, sumY = 0
    for (const p of data) {
      if (p.x < xMin) xMin = p.x
      if (p.x > xMax) xMax = p.x
      sumX += p.x
      sumY += p.y
    }

    return {
      trendLine,
      xExtent: [xMin, xMax] as [number, number],
      meanX: sumX / data.length,
      meanY: sumY / data.length,
    }
  }, [data, showTrendLine])

  const chartOption = useMemo((): EChartsOption => {
    const scatterData = data.map((p) => [p.x, p.y])

    const series: NonNullable<EChartsOption['series']> = [
      {
        name: '데이터',
        type: 'scatter',
        data: scatterData,
        symbolSize: 8,
        itemStyle: { color: dotColor, opacity: 0.7 },
        emphasis: {
          itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)', opacity: 1 },
        },
        large: true,
        largeThreshold: SCATTER_LARGE_THRESHOLD,
      } as Record<string, unknown>,
    ]

    // 추세선 (실제 데이터 범위만 — 외삽 방지)
    if (showTrendLine && trendLine && data.length >= 2) {
      const { slope, intercept } = trendLine
      const trendData = [
        [xExtent[0], slope * xExtent[0] + intercept],
        [xExtent[1], slope * xExtent[1] + intercept],
      ]
      series.push({
        name: '추세선',
        type: 'line',
        data: trendData,
        symbol: 'none',
        lineStyle: { color: resolveChartPalette(3)[2], width: 2, type: 'dashed' as const },
        tooltip: { show: false },
      } as Record<string, unknown>)
    }

    return {
      ...statBaseOption(),
      xAxis: { ...statValueAxis(xAxisLabel), type: 'value' as const, scale: true },
      yAxis: { ...statValueAxis(yAxisLabel), name: yAxisLabel, scale: true },
      series,
      tooltip: statTooltip({
        formatter(params: unknown) {
          const p = params as { seriesName: string; value: number[] }
          if (p.seriesName === '추세선') return ''
          return `<b>${xAxisLabel}</b>: ${p.value[0].toFixed(4)}<br/><b>${yAxisLabel}</b>: ${p.value[1].toFixed(4)}`
        },
      }),
      toolbox: {
        right: 10,
        top: 0,
        feature: { saveAsImage: { title: 'PNG 저장', pixelRatio: 2 } },
      },
    }
  }, [data, dotColor, showTrendLine, trendLine, xExtent, xAxisLabel, yAxisLabel, resolvedTheme])

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>데이터가 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            두 개의 숫자 변수를 선택해주세요
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <div className="flex items-center gap-2">
            {correlationCoefficient !== undefined && (
              <Badge variant={Math.abs(correlationCoefficient) > 0.7 ? "default" : "secondary"}>
                r = {correlationCoefficient.toFixed(4)}
              </Badge>
            )}
            {pValue !== undefined && (
              <Badge variant={pValue < 0.05 ? "default" : "secondary"}>
                p = {pValue.toFixed(6)}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          두 변수 간 관계 (n = {data.length})
          {trendLine && ` • R² = ${trendLine.r2.toFixed(4)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LazyReactECharts
          option={chartOption}
          style={{ height: 320 }}
          opts={{ renderer: selectScatterRenderer(data.length) }}
        />

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">데이터 요약</h4>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">{xAxisLabel}: </span>
                <span>평균 {meanX.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{yAxisLabel}: </span>
                <span>평균 {meanY.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">데이터 포인트: </span>
                <span>{data.length}개</span>
              </div>
            </div>
          </div>

          {trendLine && (
            <div>
              <h4 className="font-medium mb-2">추세선 정보</h4>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">기울기: </span>
                  <span>{trendLine.slope.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">절편: </span>
                  <span>{trendLine.intercept.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">결정계수(R²): </span>
                  <span>{trendLine.r2.toFixed(6)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  y = {trendLine.slope.toFixed(3)}x {trendLine.intercept >= 0 ? '+' : ''} {trendLine.intercept.toFixed(3)}
                </div>
              </div>
            </div>
          )}
        </div>

        {correlationCoefficient !== undefined && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <span className="font-medium">상관관계 해석: </span>
              {Math.abs(correlationCoefficient) > 0.9 ? "매우 강한" :
               Math.abs(correlationCoefficient) > 0.7 ? "강한" :
               Math.abs(correlationCoefficient) > 0.5 ? "중간" :
               Math.abs(correlationCoefficient) > 0.3 ? "약한" : "매우 약한"}
              {" "}
              {correlationCoefficient > 0 ? "양의" : "음의"} 상관관계
              {pValue !== undefined && (
                <span className="ml-2">
                  ({pValue < 0.001 ? "p < 0.001" : `p = ${pValue.toFixed(3)}`})
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
})
