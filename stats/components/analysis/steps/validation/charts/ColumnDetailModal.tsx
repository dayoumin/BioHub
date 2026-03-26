'use client'

import { memo, useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilterToggle } from '@/components/ui/filter-toggle'
import { ColumnStatistics } from '@/types/analysis'
import { getNumericColumnData } from '../utils/correlationUtils'
import { BarChart3, GitCommitHorizontal } from 'lucide-react'
import { useTerminology } from '@/hooks/use-terminology'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statCategoryAxis, statValueAxis, statTooltip, STAT_COLORS } from '@/lib/charts/echarts-stat-utils'
import { resolveAxisColors } from '@/lib/charts/chart-color-resolver'
import type { EChartsOption } from 'echarts'

interface ColumnDetailModalProps {
  column: ColumnStatistics | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  data: unknown[]
}

export const ColumnDetailModal = memo(function ColumnDetailModal({
  column,
  isOpen,
  onOpenChange,
  data
}: ColumnDetailModalProps) {
  const t = useTerminology()
  const vs = t.validationSummary
  const [chartType, setChartType] = useState<'histogram' | 'boxplot'>('histogram')

  const numericData = useMemo(() => {
    if (!column || !isOpen || column.type !== 'numeric') return []
    return getNumericColumnData(data, column.name)
  }, [column, isOpen, data])

  const histogramOption = useMemo((): EChartsOption | null => {
    if (!column || numericData.length === 0) return null

    const min = numericData.reduce((a, b) => Math.min(a, b), Infinity)
    const max = numericData.reduce((a, b) => Math.max(a, b), -Infinity)

    // constant data: single bin
    if (min === max) {
      return {
        ...statBaseOption(),
        xAxis: statCategoryAxis([`${min.toFixed(1)}`], column.name),
        yAxis: { ...statValueAxis(vs.axisLabels.frequency), name: vs.axisLabels.frequency },
        series: [{ type: 'bar', data: [numericData.length], itemStyle: { color: STAT_COLORS[1] }, barWidth: '50%' }],
        tooltip: statTooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
      }
    }

    const binCount = 20
    const binWidth = (max - min) / binCount
    const bins = new Array(binCount).fill(0) as number[]
    const binLabels: string[] = []

    for (let i = 0; i < binCount; i++) {
      binLabels.push(`${(min + i * binWidth).toFixed(1)}`)
    }

    numericData.forEach((v) => {
      const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1)
      bins[idx]++
    })

    return {
      ...statBaseOption(),
      xAxis: { ...statCategoryAxis(binLabels, column.name), axisLabel: { fontSize: 10, color: resolveAxisColors().axisLabel, rotate: 45 } },
      yAxis: { ...statValueAxis(vs.axisLabels.frequency), name: vs.axisLabels.frequency },
      series: [{ type: 'bar', data: bins, itemStyle: { color: STAT_COLORS[1], borderColor: STAT_COLORS[1], borderWidth: 1 }, barWidth: '90%' }],
      tooltip: statTooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
    }
  }, [column, numericData, vs])

  const boxplotOption = useMemo((): EChartsOption | null => {
    if (!column || numericData.length === 0) return null

    const sorted = [...numericData].sort((a, b) => a - b)
    const n = sorted.length
    const q1 = sorted[Math.floor(n * 0.25)]
    const median = sorted[Math.floor(n * 0.5)]
    const q3 = sorted[Math.floor(n * 0.75)]
    const minVal = sorted[0]
    const maxVal = sorted[n - 1]
    const mean = numericData.reduce((a, b) => a + b, 0) / n

    return {
      ...statBaseOption(),
      xAxis: { type: 'category', data: [column.name] },
      yAxis: { ...statValueAxis(column.name), name: column.name },
      series: [
        {
          type: 'boxplot',
          data: [[minVal, q1, median, q3, maxVal]],
          itemStyle: { color: STAT_COLORS[1] + '33', borderColor: STAT_COLORS[1] },
        },
        {
          type: 'scatter',
          symbol: 'diamond',
          symbolSize: 10,
          data: [[0, mean]],
          itemStyle: { color: '#fff', borderColor: STAT_COLORS[1], borderWidth: 2 },
          tooltip: { formatter: () => `평균: ${mean.toFixed(2)}` },
        },
      ],
      tooltip: statTooltip(),
    }
  }, [column, numericData])

  const barOption = useMemo((): EChartsOption | null => {
    if (!column || column.type !== 'categorical' || !column.topCategories) return null

    const categories = column.topCategories.map((c) => c.value)
    const values = column.topCategories.map((c) => c.count)

    return {
      ...statBaseOption(),
      grid: { left: 120, right: 20, top: 30, bottom: 50, containLabel: true },
      yAxis: { type: 'category', data: categories, axisLabel: { fontSize: 11, color: resolveAxisColors().axisLabel } },
      xAxis: { type: 'value', ...statValueAxis() },
      series: [{
        type: 'bar',
        data: values.map((v, i) => ({
          value: v,
          itemStyle: { color: STAT_COLORS[i % STAT_COLORS.length] },
        })),
      }],
      tooltip: statTooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
    }
  }, [column])

  if (!column) return null

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vs.detailAnalysisTitle(column.name)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {column.type === 'numeric' ? (
            <>
              <FilterToggle
                options={[
                  { id: 'histogram', label: vs.chartTypes.histogram, icon: BarChart3 },
                  { id: 'boxplot', label: vs.chartTypes.boxplot, icon: GitCommitHorizontal }
                ]}
                value={chartType}
                onChange={(value) => setChartType(value as 'histogram' | 'boxplot')}
                size="md"
                ariaLabel={vs.chartTypes.ariaLabel}
              />

              {chartType === 'histogram' && histogramOption && (
                <div className="mt-4">
                  <LazyReactECharts option={histogramOption} style={{ height: 380 }} opts={{ renderer: 'svg' }} />
                </div>
              )}

              {chartType === 'boxplot' && boxplotOption && (
                <div className="mt-4">
                  <LazyReactECharts option={boxplotOption} style={{ height: 380 }} opts={{ renderer: 'svg' }} />
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-muted rounded p-3">
                  <p className="text-sm text-muted-foreground">{vs.statistics.mean}</p>
                  <p className="text-lg font-bold">{column.mean?.toFixed(2)}</p>
                </div>
                <div className="bg-muted rounded p-3">
                  <p className="text-sm text-muted-foreground">{vs.statistics.stdDev}</p>
                  <p className="text-lg font-bold">{column.std?.toFixed(2)}</p>
                </div>
                <div className="bg-muted rounded p-3">
                  <p className="text-sm text-muted-foreground">{vs.statistics.minMax}</p>
                  <p className="text-lg font-bold">
                    {column.min?.toFixed(2)} / {column.max?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted rounded p-3">
                  <p className="text-sm text-muted-foreground">{vs.statistics.outliers}</p>
                  <p className="text-lg font-bold">{vs.outlierCount(column.outliers?.length || 0)}</p>
                </div>
              </div>
            </>
          ) : column.type === 'categorical' && column.topCategories && barOption ? (
            <div>
              <h4 className="text-sm font-medium mb-2">{vs.categoryFrequencyTitle}</h4>
              <LazyReactECharts option={barOption} style={{ height: 320 }} opts={{ renderer: 'svg' }} />
            </div>
          ) : (
            <p className="text-muted-foreground">{vs.mixedTypeMessage}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})
