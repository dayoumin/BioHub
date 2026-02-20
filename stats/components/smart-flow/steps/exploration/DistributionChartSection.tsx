'use client'

import { memo, useState, useMemo, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FilterToggle } from '@/components/ui/filter-toggle'
import { BarChart3, GitCommitHorizontal, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Histogram } from '@/components/charts/histogram'
import { BoxPlot } from '@/components/charts/boxplot'
import type { DataRow } from '@/types/smart-flow'
import { useTerminology } from '@/hooks/use-terminology'

interface DistributionChartSectionProps {
  data: DataRow[]
  numericVariables: string[]
  visibility: 'primary' | 'secondary' | 'hidden'
  defaultChartType: 'histogram' | 'boxplot'
}

function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = p * (sorted.length - 1)
  const low = Math.floor(idx)
  const high = Math.ceil(idx)
  if (low === high) return sorted[low]
  return sorted[low] + (sorted[high] - sorted[low]) * (idx - low)
}

export const DistributionChartSection = memo(function DistributionChartSection({
  data,
  numericVariables,
  visibility,
  defaultChartType
}: DistributionChartSectionProps) {
  const t = useTerminology()

  const [chartType, setChartType] = useState<'histogram' | 'boxplot'>(defaultChartType)
  const [selectedHistogramVar, setSelectedHistogramVar] = useState(numericVariables[0] ?? '')
  const [selectedBoxplotVars, setSelectedBoxplotVars] = useState<string[]>(
    numericVariables.slice(0, Math.min(3, numericVariables.length))
  )

  // defaultChartType prop 변경 시 동기화 (빠른 분석 모드 전환)
  useEffect(() => {
    setChartType(defaultChartType)
  }, [defaultChartType])

  // numericVariables 변경 시 선택 상태 동기화 (데이터 교체)
  useEffect(() => {
    if (numericVariables.length === 0) return

    // 히스토그램: 현재 선택이 유효하지 않으면 첫 번째로 재설정
    setSelectedHistogramVar(prev => {
      if (prev === '' || !numericVariables.includes(prev)) return numericVariables[0]
      return prev
    })

    // 박스플롯: 유효하지 않은 변수 필터링 후 재설정
    setSelectedBoxplotVars(prev => {
      const valid = prev.filter(v => numericVariables.includes(v))
      if (valid.length > 0) return valid
      return numericVariables.slice(0, Math.min(3, numericVariables.length))
    })
  }, [numericVariables])

  const toggleBoxplotVar = useCallback((varName: string) => {
    setSelectedBoxplotVars(prev => {
      if (prev.includes(varName)) {
        if (prev.length <= 1) return prev
        return prev.filter(v => v !== varName)
      } else {
        if (prev.length >= 8) return prev
        return [...prev, varName]
      }
    })
  }, [])

  const boxplotMultiData = useMemo(() => {
    return selectedBoxplotVars.map(varName => {
      const colData = data
        .map(row => row[varName])
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(Number)
        .filter(v => !isNaN(v))

      if (colData.length === 0) return null

      const sortedData = [...colData].sort((a, b) => a - b)
      const n = sortedData.length
      const q1 = getPercentile(sortedData, 0.25)
      const q3 = getPercentile(sortedData, 0.75)
      const median = getPercentile(sortedData, 0.5)
      const min = sortedData[0]
      const max = sortedData[n - 1]
      const mean = colData.reduce((sum, v) => sum + v, 0) / n
      const std = Math.sqrt(colData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n - 1))
      const iqr = q3 - q1
      const outliers = colData.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr)

      return { name: varName, min, q1, median, q3, max, mean, std, outliers }
    }).filter(Boolean)
  }, [data, selectedBoxplotVars])

  if (visibility === 'hidden') return null

  const secondaryClass = visibility === 'secondary' ? 'opacity-50 border-l-2 border-l-muted-foreground/30' : ''

  return (
    <Card className={cn("border-border/40 shadow-sm overflow-hidden", secondaryClass)}>
      <CardHeader className="bg-muted/10">
        <CardTitle className="flex items-center gap-2.5 text-base tracking-tight">
          <div className="p-1.5 rounded-md bg-primary/10">
            <BarChart3 className="h-4 w-4 text-primary" />
          </div>
          {t.dataExploration.distribution.title}
        </CardTitle>
        <CardDescription>
          {t.dataExploration.distribution.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 차트 타입 선택 */}
        <FilterToggle
          options={[
            { id: 'histogram', label: t.dataExploration.chartTypes.histogram, icon: BarChart3 },
            { id: 'boxplot', label: t.dataExploration.chartTypes.boxplot, icon: GitCommitHorizontal }
          ]}
          value={chartType}
          onChange={(value) => setChartType(value as 'histogram' | 'boxplot')}
          ariaLabel={t.dataExploration.chartTypes.ariaLabel}
        />

        {/* 히스토그램 모드 */}
        {chartType === 'histogram' && (
          <>
            <div className="flex flex-wrap gap-1">
              {numericVariables.slice(0, 8).map(varName => (
                <Button
                  key={varName}
                  variant={selectedHistogramVar === varName ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedHistogramVar(varName)}
                  className="text-xs"
                >
                  {varName}
                </Button>
              ))}
            </div>
            {selectedHistogramVar && (() => {
              const colData = data
                .map(row => row[selectedHistogramVar])
                .filter(v => v !== null && v !== undefined && v !== '')
                .map(Number)
                .filter(v => !isNaN(v))

              if (colData.length === 0) return null

              const sortedData = [...colData].sort((a, b) => a - b)
              const q1 = getPercentile(sortedData, 0.25)
              const q3 = getPercentile(sortedData, 0.75)
              const iqr = q3 - q1
              const lowerBound = q1 - 1.5 * iqr
              const upperBound = q3 + 1.5 * iqr
              const outliers = colData.filter(v => v < lowerBound || v > upperBound)

              return (
                <div className="space-y-4">
                  <Histogram
                    data={colData}
                    title={t.dataExploration.histogram.title(selectedHistogramVar)}
                    xAxisLabel={selectedHistogramVar}
                    yAxisLabel={t.dataExploration.histogram.yAxisLabel}
                    bins={10}
                    showCard={false}
                  />
                  {outliers.length > 0 && (
                    <div className="text-xs bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 p-3 rounded-lg">
                      {t.dataExploration.outlier.info(outliers.length, lowerBound.toFixed(2), upperBound.toFixed(2))}
                    </div>
                  )}
                </div>
              )
            })()}
          </>
        )}

        {/* 박스플롯 모드 */}
        {chartType === 'boxplot' && (
          <>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t.dataExploration.boxplot.selectInstruction}</p>
              <div className="flex flex-wrap gap-1">
                {numericVariables.slice(0, 8).map(varName => (
                  <Button
                    key={varName}
                    variant={selectedBoxplotVars.includes(varName) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleBoxplotVar(varName)}
                    className="text-xs"
                  >
                    {selectedBoxplotVars.includes(varName) && <Check className="h-3 w-3 mr-1" />}
                    {varName}
                  </Button>
                ))}
              </div>
            </div>
            {boxplotMultiData.length > 0 && (
              <BoxPlot
                data={boxplotMultiData as Array<{name: string; min: number; q1: number; median: number; q3: number; max: number; mean: number; std: number; outliers: number[]}>}
                title={selectedBoxplotVars.length === 1
                  ? t.dataExploration.boxplot.singleTitle(selectedBoxplotVars[0])
                  : t.dataExploration.boxplot.multipleTitle(selectedBoxplotVars.length)}
                showMean={true}
                showOutliers={true}
                height={350}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})
