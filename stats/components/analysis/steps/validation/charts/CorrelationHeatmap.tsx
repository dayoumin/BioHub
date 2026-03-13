'use client'

import { memo } from 'react'
import { PlotlyChartImproved } from '@/components/charts/PlotlyChartImproved'
import { getHeatmapLayout } from '@/lib/plotly-config'
import { CORRELATION_HEATMAP_COLORS } from '../constants/chartStyles'
import type { Data } from 'plotly.js'
import { useTerminology } from '@/hooks/use-terminology'

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
        hovertemplate: vs.heatmapHoverTemplate
      } as unknown as Data]}
      layout={getHeatmapLayout({
        title: { text: vs.correlationTitle },
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