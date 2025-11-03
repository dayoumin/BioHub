'use client'

import { memo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PlotlyChartImproved } from '@/components/charts/PlotlyChartImproved'
import { BarChart as BarChartComponent } from '@/components/charts/StatisticalChartsImproved'
import { getModalLayout, CHART_STYLES } from '@/lib/plotly-config'
import { ColumnStatistics } from '@/types/smart-flow'
import { getNumericColumnData } from '../utils/correlationUtils'
import type { Data } from 'plotly.js'

interface ColumnDetailModalProps {
  column: ColumnStatistics | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  data: any[]
}

export const ColumnDetailModal = memo(function ColumnDetailModal({
  column,
  isOpen,
  onOpenChange,
  data
}: ColumnDetailModalProps) {
  if (!column) return null

  const numericData = column.type === 'numeric' ? getNumericColumnData(data, column.name) : []

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1400px] w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{column.name} 상세 분석</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {column.type === 'numeric' ? (
            <>
              <Tabs defaultValue="histogram" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="histogram">히스토그램</TabsTrigger>
                  <TabsTrigger value="boxplot">박스플롯</TabsTrigger>
                </TabsList>

                <TabsContent value="histogram" className="mt-4">
                  <div className="h-[400px] w-full">
                    <PlotlyChartImproved
                      data={[{
                        x: numericData,
                        type: 'histogram',
                        ...CHART_STYLES.histogram,
                        nbinsx: 20,
                        name: column.name,
                        hovertemplate: '%{x}: %{y}개<extra></extra>'
                      } as Data]}
                      layout={getModalLayout({
                        title: { text: '' },
                        xaxis: { title: { text: column.name } },
                        yaxis: { title: { text: '빈도' } },
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
                </TabsContent>

                <TabsContent value="boxplot" className="mt-4">
                  <div className="h-[400px] w-full">
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
                </TabsContent>
              </Tabs>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="bg-muted rounded p-3">
                  <p className="text-sm text-muted-foreground">평균</p>
                  <p className="text-lg font-bold">{column.mean?.toFixed(2)}</p>
                </div>
                <div className="bg-muted rounded p-3">
                  <p className="text-sm text-muted-foreground">표준편차</p>
                  <p className="text-lg font-bold">{column.std?.toFixed(2)}</p>
                </div>
                <div className="bg-muted rounded p-3">
                  <p className="text-sm text-muted-foreground">최소/최대</p>
                  <p className="text-lg font-bold">
                    {column.min?.toFixed(2)} / {column.max?.toFixed(2)}
                  </p>
                </div>
                <div className="bg-muted rounded p-3">
                  <p className="text-sm text-muted-foreground">이상치</p>
                  <p className="text-lg font-bold">{column.outliers?.length || 0}개</p>
                </div>
              </div>
            </>
          ) : column.type === 'categorical' && column.topCategories ? (
            <div>
              <BarChartComponent
                categories={column.topCategories.map(c => c.value)}
                values={column.topCategories.map(c => c.count)}
                title="카테고리별 빈도"
                orientation="h"
              />
            </div>
          ) : (
            <p className="text-muted-foreground">혼합 타입 변수는 시각화가 제한됩니다.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})