'use client'

import { memo } from 'react'
import { PlotlyChartImproved } from '@/components/charts/PlotlyChartImproved'
import { getHeatmapLayout } from '@/lib/plotly-config'
import { CORRELATION_HEATMAP_COLORS } from '../constants/chartStyles'
import type { Data } from 'plotly.js'

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
  return (
    <PlotlyChartImproved
      data={[{
        z: matrix,
        x: labels,
        y: labels,
        type: 'heatmap',
        colorscale: CORRELATION_HEATMAP_COLORS,
        zmin: -1,
        zmax: 1,
        text: matrix.map(row => row.map(val => val.toFixed(2))),
        texttemplate: '%{text}',
        textfont: { size: 10, color: '#000' },
        hovertemplate: '%{x} vs %{y}: %{z:.2f}<extra></extra>'
      } as unknown as Data]}
      layout={getHeatmapLayout({
        title: { text: '변수 간 상관관계' },
        height: height
      })}
      config={{
        displayModeBar: true,
        displaylogo: false,
        responsive: true
      }}
    />
  )
})