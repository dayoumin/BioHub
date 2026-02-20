'use client'

import { memo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FilterToggle } from '@/components/ui/filter-toggle'
import { PlotlyChartImproved } from '@/components/charts/PlotlyChartImproved'
import { BarChart as BarChartComponent } from '@/components/charts/StatisticalChartsImproved'
import { getModalLayout, CHART_STYLES } from '@/lib/plotly-config'
import { ColumnStatistics } from '@/types/smart-flow'
import { getNumericColumnData } from '../utils/correlationUtils'
import type { Data } from 'plotly.js'
import { BarChart3, GitCommitHorizontal } from 'lucide-react'
import { useTerminology } from '@/hooks/use-terminology'

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

  if (!column) return null

  const numericData = column.type === 'numeric' ? getNumericColumnData(data, column.name) : []

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

              {chartType === 'histogram' && (
                <div className="h-[400px] w-full mt-4">
                  <PlotlyChartImproved
                    data={[{
                      x: numericData,
                      type: 'histogram',
                      ...CHART_STYLES.histogram,
                      nbinsx: 20,
                      name: column.name,
                      hovertemplate: vs.histogramHoverTemplate
                    } as Data]}
                    layout={getModalLayout({
                      title: { text: '' },
                      xaxis: { title: { text: column.name } },
                      yaxis: { title: { text: vs.axisLabels.frequency } },
                      height: 380,
                      showlegend: false,
                      margin: { l: 50, r: 30, t: 20, b: 50 }
                    })}
                    config={{
                      displayModeBar: true,
                      displaylogo: false,
                      responsive: true
                    }}
                  />
                </div>
              )}

              {chartType === 'boxplot' && (
                <div className="h-[400px] w-full mt-4">
                  <PlotlyChartImproved
                    data={[{
                      y: numericData,
                      type: 'box',
                      ...CHART_STYLES.box,
                      name: column.name,
                      boxmean: true,
                      hovertemplate: '%{y}<extra></extra>'
                    } as Data]}
                    layout={getModalLayout({
                      title: { text: '' },
                      yaxis: { title: { text: column.name } },
                      height: 380,
                      showlegend: false,
                      margin: { l: 60, r: 30, t: 20, b: 40 }
                    })}
                    config={{
                      displayModeBar: true,
                      displaylogo: false,
                      responsive: true
                    }}
                  />
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
          ) : column.type === 'categorical' && column.topCategories ? (
            <div>
              <BarChartComponent
                categories={column.topCategories.map(c => c.value)}
                values={column.topCategories.map(c => c.count)}
                title={vs.categoryFrequencyTitle}
                orientation="h"
              />
            </div>
          ) : (
            <p className="text-muted-foreground">{vs.mixedTypeMessage}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})