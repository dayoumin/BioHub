'use client'

import { memo, useMemo } from 'react'
import { useTerminology } from '@/hooks/use-terminology'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statTooltip } from '@/lib/charts/echarts-stat-utils'
import type { EChartsOption } from 'echarts'

interface CorrelationHeatmapProps {
  matrix: number[][]
  labels: string[]
  height?: number
}

export const CorrelationHeatmap = memo(function CorrelationHeatmap({
  matrix,
  labels,
  height = 400
}: CorrelationHeatmapProps) {
  const t = useTerminology()
  const vs = t.validationSummary

  const option = useMemo((): EChartsOption => {
    // ECharts heatmap: data = [[x, y, value], ...]
    const heatData: Array<[number, number, number]> = []
    matrix.forEach((row, y) => {
      row.forEach((val, x) => {
        heatData.push([x, y, val])
      })
    })

    return {
      ...statBaseOption(),
      grid: { left: 100, right: 60, top: 30, bottom: 80, containLabel: true },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 10, color: '#64748b', rotate: 45 },
        splitArea: { show: true },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 10, color: '#64748b' },
        splitArea: { show: true },
      },
      visualMap: {
        min: -1,
        max: 1,
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        inRange: {
          color: ['#2563EB', '#FFFFFF', '#DC2626'],
        },
        textStyle: { fontSize: 11 },
      },
      series: [{
        type: 'heatmap',
        data: heatData,
        label: {
          show: true,
          formatter: (params: unknown) => {
            const p = params as { value: [number, number, number] }
            return p.value[2].toFixed(2)
          },
          fontSize: 10,
          color: '#000',
        },
        emphasis: {
          itemStyle: { shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.2)' },
        },
      }],
      tooltip: statTooltip({
        formatter(params: unknown) {
          const p = params as { value: [number, number, number] }
          return `${labels[p.value[0]]} × ${labels[p.value[1]]}<br/>r = ${p.value[2].toFixed(4)}`
        },
      }),
    }
  }, [matrix, labels])

  return (
    <LazyReactECharts option={option} style={{ height }} opts={{ renderer: 'svg' }} />
  )
})
