'use client'

import { memo, useMemo } from 'react'
import { PlotlyChartImproved } from './PlotlyChartImproved'
import { ChartErrorBoundary } from './ChartErrorBoundary'
import { ColumnStatistics } from '@/types/smart-flow'
import {
  validateNumericData,
  validateBarChartData,
  validateScatterData,
  validateBoxPlotData,
  checkDataSize,
  sampleData
} from '@/lib/chart-validators'
import { getDefaultLayout, getHeatmapLayout, CHART_STYLES } from '@/lib/plotly-config'
import type { Data, Layout } from 'plotly.js'

interface BaseChartProps {
  className?: string
  onError?: (error: Error) => void
}

interface HistogramChartProps extends BaseChartProps {
  data: number[]
  title: string
  xLabel?: string
}

export const HistogramChart = memo(function HistogramChart({
  data,
  title,
  xLabel = 'Value',
  className,
  onError
}: HistogramChartProps) {
  const plotData = useMemo(() => {
    try {
      const validData = validateNumericData(data)
      const { shouldSample } = checkDataSize(validData)
      const finalData = shouldSample ? sampleData(validData) : validData

      return [{
        x: finalData,
        type: 'histogram' as const,
        ...CHART_STYLES.histogram,
        nbinsx: Math.min(30, Math.ceil(Math.sqrt(finalData.length))),
        name: 'Distribution',
        hovertemplate: '범위: %{x}<br>빈도: %{y}<extra></extra>'
      }] as unknown as Data[]
    } catch (error) {
      onError?.(error as Error)
      return []
    }
  }, [data, onError])

  const layout = useMemo(() => getDefaultLayout({
    title: { text: title },
    xaxis: { title: { text: xLabel } },
    yaxis: { title: { text: '빈도' } },
    showlegend: false,
    height: 300,
    bargap: 0.05
  }), [title, xLabel])

  return (
    <ChartErrorBoundary onError={onError}>
      <PlotlyChartImproved
        data={plotData}
        layout={layout}
        className={className}
        onError={onError}
      />
    </ChartErrorBoundary>
  )
})

interface BoxPlotChartProps extends BaseChartProps {
  data: number[] | { [key: string]: number[] }
  title: string
  orientation?: 'v' | 'h'
}

export const BoxPlotChart = memo(function BoxPlotChart({
  data,
  title,
  orientation = 'v',
  className,
  onError
}: BoxPlotChartProps) {
  const plotData = useMemo(() => {
    try {
      const validated = validateBoxPlotData(data)

      if (!validated.isGrouped && Array.isArray(validated.data)) {
        const validData = validated.data.filter(v => !isNaN(v) && isFinite(v))
        return [{
          y: orientation === 'v' ? validData : undefined,
          x: orientation === 'h' ? validData : undefined,
          type: 'box' as const,
          name: title || 'Data',
          ...CHART_STYLES.box,
          boxmean: 'sd' as const,
          hovertemplate: orientation === 'v'
            ? '값: %{y}<br>%{text}<extra></extra>'
            : '값: %{x}<br>%{text}<extra></extra>',
          text: `n=${validData.length}`
        }] as unknown as Data[]
      } else if (validated.isGrouped && !Array.isArray(validated.data)) {
        return Object.entries(validated.data).map(([name, values]) => {
          const validValues = values.filter(v => !isNaN(v) && isFinite(v))
          return {
            y: orientation === 'v' ? validValues : undefined,
            x: orientation === 'h' ? validValues : undefined,
            type: 'box' as const,
            name,
            ...CHART_STYLES.box,
            boxmean: 'sd' as const,
            hovertemplate: orientation === 'v'
              ? '%{y}<br>%{text}<extra></extra>'
              : '%{x}<br>%{text}<extra></extra>',
            text: `n=${validValues.length}`
          }
        }) as Data[]
      }
      return []
    } catch (error) {
      onError?.(error as Error)
      return []
    }
  }, [data, title, orientation, onError])

  const layout = useMemo(() => {
    const baseLayout = getDefaultLayout({
      title: { text: title },
      showlegend: typeof data === 'object' && !Array.isArray(data),
      height: 350
    })

    // 박스플롯의 경우 축 레이블 자동 마진 활성화
    if (orientation === 'h' && baseLayout.xaxis) {
      baseLayout.xaxis.automargin = true
    }
    if (orientation === 'v' && baseLayout.yaxis) {
      baseLayout.yaxis.automargin = true
    }

    return baseLayout
  }, [title, data, orientation])

  return (
    <ChartErrorBoundary onError={onError}>
      <PlotlyChartImproved
        data={plotData}
        layout={layout}
        className={className}
        onError={onError}
      />
    </ChartErrorBoundary>
  )
})

interface BarChartProps extends BaseChartProps {
  categories: string[]
  values: number[]
  title: string
  orientation?: 'v' | 'h'
}

export const BarChart = memo(function BarChart({
  categories,
  values,
  title,
  orientation = 'v',
  className,
  onError
}: BarChartProps) {
  const plotData = useMemo(() => {
    try {
      const validated = validateBarChartData(categories, values)

      return [{
        x: orientation === 'v' ? validated.categories : validated.values,
        y: orientation === 'v' ? validated.values : validated.categories,
        type: 'bar' as const,
        ...CHART_STYLES.bar,
        text: validated.values.map(v => v.toFixed(1)),
        textposition: 'auto',
        orientation,
        hovertemplate: orientation === 'v'
          ? '%{x}: %{y}<extra></extra>'
          : '%{y}: %{x}<extra></extra>'
      }] as unknown as Data[]
    } catch (error) {
      onError?.(error as Error)
      return []
    }
  }, [categories, values, orientation, onError])

  const layout = useMemo(() => getDefaultLayout({
    title: { text: title },
    xaxis: orientation === 'v' ? { title: { text: '카테고리' } } : { title: { text: '값' } },
    yaxis: orientation === 'v' ? { title: { text: '빈도' } } : { title: { text: '카테고리' } },
    showlegend: false,
    height: 300
  }), [title, orientation])

  return (
    <ChartErrorBoundary onError={onError}>
      <PlotlyChartImproved
        data={plotData}
        layout={layout}
        className={className}
        onError={onError}
      />
    </ChartErrorBoundary>
  )
})

interface ScatterPlotProps extends BaseChartProps {
  xData: number[]
  yData: number[]
  title: string
  xLabel?: string
  yLabel?: string
  showTrendline?: boolean
}

export const ScatterPlot = memo(function ScatterPlot({
  xData,
  yData,
  title,
  xLabel = 'X',
  yLabel = 'Y',
  showTrendline = false,
  className,
  onError
}: ScatterPlotProps) {
  const plotData = useMemo(() => {
    try {
      const validated = validateScatterData(xData, yData)
      const traces: Data[] = [{
        x: validated.x,
        y: validated.y,
        mode: 'markers',
        type: 'scatter',
        name: '데이터',
        ...CHART_STYLES.scatter,
        hovertemplate: 'X: %{x}<br>Y: %{y}<extra></extra>'
      }]

      if (showTrendline && validated.x.length > 1) {
        // Simple linear regression for trendline
        const n = validated.x.length
        const sumX = validated.x.reduce((a, b) => a + b, 0)
        const sumY = validated.y.reduce((a, b) => a + b, 0)
        const sumXY = validated.x.reduce((sum, x, i) => sum + x * validated.y[i], 0)
        const sumX2 = validated.x.reduce((sum, x) => sum + x * x, 0)

        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
        const intercept = (sumY - slope * sumX) / n

        const xMin = Math.min(...validated.x)
        const xMax = Math.max(...validated.x)

        traces.push({
          x: [xMin, xMax],
          y: [slope * xMin + intercept, slope * xMax + intercept],
          mode: 'lines',
          type: 'scatter',
          name: '추세선',
          line: {
            color: 'hsl(var(--destructive))',
            width: 2,
            dash: 'dash'
          }
        })
      }

      return traces
    } catch (error) {
      onError?.(error as Error)
      return []
    }
  }, [xData, yData, showTrendline, onError])

  const layout = useMemo(() => getDefaultLayout({
    title: { text: title },
    xaxis: { title: { text: xLabel } },
    yaxis: { title: { text: yLabel } },
    showlegend: showTrendline,
    height: 400
  }), [title, xLabel, yLabel, showTrendline])

  return (
    <ChartErrorBoundary onError={onError}>
      <PlotlyChartImproved
        data={plotData}
        layout={layout}
        className={className}
        onError={onError}
      />
    </ChartErrorBoundary>
  )
})

interface HeatmapChartProps extends BaseChartProps {
  data: number[][]
  xLabels: string[]
  yLabels: string[]
  title: string
}

export const HeatmapChart = memo(function HeatmapChart({
  data,
  xLabels,
  yLabels,
  title,
  className,
  onError
}: HeatmapChartProps) {
  const plotData = useMemo(() => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Heatmap data must be a non-empty 2D array')
      }

      return [{
        z: data,
        x: xLabels,
        y: yLabels,
        type: 'heatmap' as const,
        ...CHART_STYLES.heatmap,
        hovertemplate: '%{y} - %{x}<br>값: %{z:.2f}<extra></extra>'
      }] as unknown as Data[]
    } catch (error) {
      onError?.(error as Error)
      return []
    }
  }, [data, xLabels, yLabels, onError])

  const layout = useMemo(() => getHeatmapLayout({
    title: { text: title },
    height: 400,
    xaxis: {
      side: 'bottom' as const,
      tickangle: -45
    }
  }), [title])

  return (
    <ChartErrorBoundary onError={onError}>
      <PlotlyChartImproved
        data={plotData}
        layout={layout}
        className={className}
        onError={onError}
      />
    </ChartErrorBoundary>
  )
})

// Utility function to prepare data for statistical charts
export function prepareColumnStatisticsChart(stats: ColumnStatistics) {
  if (stats.type === 'numeric' && stats.mean !== undefined) {
    return {
      type: 'box',
      data: {
        mean: stats.mean,
        median: stats.median || 0,
        q1: stats.q1 || 0,
        q3: stats.q3 || 0,
        min: stats.min || 0,
        max: stats.max || 0,
        outliers: stats.outliers || []
      }
    }
  } else if (stats.type === 'categorical' && stats.topCategories) {
    return {
      type: 'bar',
      data: {
        categories: stats.topCategories.map(c => c.value),
        values: stats.topCategories.map(c => c.count)
      }
    }
  }
  return null
}