'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

import { CorrelationHeatmap } from '@/components/analysis/steps/validation/charts/CorrelationHeatmap'
import { Scatterplot } from '@/components/charts/scatterplot'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FilterToggle } from '@/components/ui/filter-toggle'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useTerminology } from '@/hooks/use-terminology'
import { cn } from '@/lib/utils'

import { calculateCorrelation } from './correlation-utils'
import type { CorrelationPair, ScatterplotConfig } from './correlation-utils'

interface ScatterHeatmapSectionProps {
  numericVariables: string[]
  correlationMatrix: CorrelationPair[]
  heatmapMatrix: number[][]
  scatterVisibility: 'primary' | 'secondary' | 'hidden'
  heatmapVisibility: 'primary' | 'secondary' | 'hidden'
  getPairedData: (var1: string, var2: string) => { x: number[]; y: number[] }
}

export const ScatterHeatmapSection = memo(function ScatterHeatmapSection({
  numericVariables,
  correlationMatrix,
  heatmapMatrix,
  scatterVisibility,
  heatmapVisibility,
  getPairedData,
}: ScatterHeatmapSectionProps) {
  const t = useTerminology()
  const scatterEnabled = scatterVisibility !== 'hidden'
  const heatmapEnabled = heatmapVisibility !== 'hidden'

  const [chartType, setChartType] = useState<'scatterplots' | 'heatmap'>(
    scatterEnabled ? 'scatterplots' : 'heatmap'
  )
  const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>([])
  const scatterplotsRef = useRef(scatterplots)

  useEffect(() => {
    scatterplotsRef.current = scatterplots
  }, [scatterplots])

  useEffect(() => {
    if (numericVariables.length < 2) {
      if (scatterplotsRef.current.length > 0) setScatterplots([])
      return
    }

    if (scatterplotsRef.current.length === 0) {
      setScatterplots([
        {
          id: '1',
          xVariable: numericVariables[0],
          yVariable: numericVariables[1],
        },
      ])
      return
    }

    const updated = scatterplotsRef.current.map((scatterplot) => {
      const xValid = numericVariables.includes(scatterplot.xVariable)
      const yValid = numericVariables.includes(scatterplot.yVariable)

      if (xValid && yValid) return scatterplot

      const nextX = xValid ? scatterplot.xVariable : numericVariables[0]
      const nextY =
        yValid && nextX !== scatterplot.yVariable
          ? scatterplot.yVariable
          : numericVariables.find((value) => value !== nextX) ?? numericVariables[1]

      return { ...scatterplot, xVariable: nextX, yVariable: nextY }
    })

    const changed = updated.some((scatterplot, index) => {
      const current = scatterplotsRef.current[index]
      return (
        scatterplot.xVariable !== current.xVariable ||
        scatterplot.yVariable !== current.yVariable
      )
    })

    if (changed) setScatterplots(updated)
  }, [numericVariables])

  useEffect(() => {
    if (chartType === 'scatterplots' && !scatterEnabled && heatmapEnabled) {
      setChartType('heatmap')
    }
    if (chartType === 'heatmap' && !heatmapEnabled && scatterEnabled) {
      setChartType('scatterplots')
    }
  }, [chartType, heatmapEnabled, scatterEnabled])

  const updateXVariable = useCallback((id: string, newX: string) => {
    setScatterplots((previous) =>
      previous.map((scatterplot) =>
        scatterplot.id === id ? { ...scatterplot, xVariable: newX } : scatterplot
      )
    )
  }, [])

  const updateYVariable = useCallback((id: string, newY: string) => {
    setScatterplots((previous) =>
      previous.map((scatterplot) =>
        scatterplot.id === id ? { ...scatterplot, yVariable: newY } : scatterplot
      )
    )
  }, [])

  const removeScatterplot = useCallback((id: string) => {
    setScatterplots((previous) => previous.filter((scatterplot) => scatterplot.id !== id))
  }, [])

  if (!scatterEnabled && !heatmapEnabled) return null

  const secondaryClass = scatterVisibility === 'secondary' && heatmapVisibility === 'secondary'
    ? 'opacity-50 border-l-2 border-l-muted-foreground/30'
    : ''

  const toggleOptions = [
    scatterEnabled ? { id: 'scatterplots', label: t.dataExploration.scatterTabs.scatter } : null,
    heatmapEnabled ? { id: 'heatmap', label: t.dataExploration.scatterTabs.heatmap } : null,
  ].filter(Boolean) as Array<{ id: string; label: string }>

  const activeScatter = scatterplots[0]
  const scatterCorrelation = activeScatter
    ? calculateCorrelation(
        getPairedData(activeScatter.xVariable, activeScatter.yVariable).x,
        getPairedData(activeScatter.xVariable, activeScatter.yVariable).y
      )
    : null

  return (
    <Card className={cn('overflow-hidden border-border/40 shadow-sm', secondaryClass)}>
      <CardHeader className="bg-muted/10">
        <CardTitle className="text-base tracking-tight">
          {t.dataExploration.features.correlationTitle}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterToggle
          options={toggleOptions}
          value={chartType}
          onChange={(value) => setChartType(value as 'scatterplots' | 'heatmap')}
          ariaLabel={t.dataExploration.summaryCards.correlation}
        />

        {scatterEnabled && chartType === 'scatterplots' && activeScatter && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-muted/25 px-3 py-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {`${activeScatter.xVariable} vs ${activeScatter.yVariable}`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {`n = ${getPairedData(activeScatter.xVariable, activeScatter.yVariable).x.length}`}
                </span>
                {scatterCorrelation ? (
                  <>
                    <span className="text-xs text-muted-foreground">{`r = ${scatterCorrelation.r.toFixed(4)}`}</span>
                    <span className="text-xs text-muted-foreground">{`R² = ${(scatterCorrelation.r * scatterCorrelation.r).toFixed(4)}`}</span>
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-[124px]">
                  <label className="mb-1.5 block text-[11px] font-semibold text-foreground">X</label>
                  <Select
                    value={activeScatter.xVariable}
                    onValueChange={(value) => updateXVariable(activeScatter.id, value)}
                  >
                    <SelectTrigger className="h-9 border-border/50 bg-background transition-colors hover:border-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {numericVariables.map((variable) => (
                        <SelectItem
                          key={variable}
                          value={variable}
                          disabled={variable === activeScatter.yVariable}
                        >
                          {variable}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[124px]">
                  <label className="mb-1.5 block text-[11px] font-semibold text-foreground">Y</label>
                  <Select
                    value={activeScatter.yVariable}
                    onValueChange={(value) => updateYVariable(activeScatter.id, value)}
                  >
                    <SelectTrigger className="h-9 border-border/50 bg-background transition-colors hover:border-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {numericVariables.map((variable) => (
                        <SelectItem
                          key={variable}
                          value={variable}
                          disabled={variable === activeScatter.xVariable}
                        >
                          {variable}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {scatterplots.length > 1 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScatterplot(activeScatter.id)}
                    className="mb-0.5 h-9 w-9 p-0 hover:bg-destructive/10 hover:text-destructive"
                    aria-label="산점도 제거"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <Scatterplot
              data={getPairedData(activeScatter.xVariable, activeScatter.yVariable).x.map((x, index) => ({
                x,
                y: getPairedData(activeScatter.xVariable, activeScatter.yVariable).y[index],
              }))}
              title={`${activeScatter.xVariable} vs ${activeScatter.yVariable}`}
              xAxisLabel={activeScatter.xVariable}
              yAxisLabel={activeScatter.yVariable}
              showTrendLine
              correlationCoefficient={scatterCorrelation?.r}
              height={460}
              showCard={false}
            />
          </>
        )}

        {heatmapEnabled && chartType === 'heatmap' && (
          <>
            <CorrelationHeatmap
              matrix={heatmapMatrix}
              labels={numericVariables}
              height={Math.max(420, numericVariables.length * 48)}
              aria-label={t.dataExploration.heatmap.title}
            />

            <div className="rounded-lg border border-info-border bg-info-bg p-3 text-sm text-muted-foreground">
              <p className="mb-1 font-medium">{t.dataExploration.heatmapGuide.title}</p>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1 md:grid-cols-2">
                <div><span className="mr-1 inline-block h-3 w-3 rounded bg-red-500" /> <strong>r = +1</strong>: {t.dataExploration.heatmapGuide.strongPositive}</div>
                <div><span className="mr-1 inline-block h-3 w-3 rounded bg-blue-500" /> <strong>r = -1</strong>: {t.dataExploration.heatmapGuide.strongNegative}</div>
                <div><span className="mr-1 inline-block h-3 w-3 rounded bg-gray-200" /> <strong>r = 0</strong>: {t.dataExploration.heatmapGuide.noCorrelation}</div>
                <div><strong>|r| &gt;= 0.7</strong>: {t.dataExploration.heatmapGuide.veryStrong}</div>
              </div>
            </div>

            {correlationMatrix.filter((pair) => Math.abs(pair.r) >= 0.5).length > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">{t.dataExploration.strongCorrelations.title}</p>
                {correlationMatrix
                  .filter((pair) => Math.abs(pair.r) >= 0.5)
                  .slice(0, 5)
                  .map(({ var1, var2, r }) => (
                    <div key={`${var1}-${var2}`} className="flex items-center justify-between rounded-lg bg-muted/25 px-3 py-2 text-sm">
                      <span>{var1} - {var2}</span>
                      <span className="rounded bg-background px-2 py-0.5 font-mono text-xs shadow-sm">
                        {`r = ${r >= 0 ? '+' : ''}${r.toFixed(3)}`}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
})
