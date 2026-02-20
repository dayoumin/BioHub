'use client'

import { memo, useState, useCallback, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { X, ChartScatter, ArrowRight, Sparkles, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Scatterplot } from '@/components/charts/scatterplot'
import { CorrelationHeatmap } from '@/components/smart-flow/steps/validation/charts/CorrelationHeatmap'
import { ContentTabs, ContentTabsContent } from '@/components/ui/content-tabs'
import { useTerminology } from '@/hooks/use-terminology'
import { calculateCorrelation } from './correlation-utils'
import type { ScatterplotConfig, CorrelationPair } from './correlation-utils'

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
  getPairedData
}: ScatterHeatmapSectionProps) {
  const t = useTerminology()

  const [explorationTab, setExplorationTab] = useState<'scatterplots' | 'heatmap'>('scatterplots')
  const [scatterplots, setScatterplots] = useState<ScatterplotConfig[]>([])

  // 산점도 상태 추적용 ref (useEffect 내 무한 루프 방지)
  const scatterplotsRef = useRef(scatterplots)
  useEffect(() => {
    scatterplotsRef.current = scatterplots
  }, [scatterplots])

  // 산점도 초기화 및 numericVariables 변경 시 동기화
  useEffect(() => {
    const current = scatterplotsRef.current

    if (numericVariables.length < 2) {
      if (current.length > 0) setScatterplots([])
      return
    }

    // 산점도가 없으면 초기화
    if (current.length === 0) {
      setScatterplots([{
        id: '1',
        xVariable: numericVariables[0],
        yVariable: numericVariables[1]
      }])
      return
    }

    // 기존 산점도의 변수가 유효한지 검증 및 재설정
    const updated = current.map(sp => {
      const xValid = numericVariables.includes(sp.xVariable)
      const yValid = numericVariables.includes(sp.yVariable)
      if (xValid && yValid) return sp

      const newX = xValid ? sp.xVariable : numericVariables[0]
      const newY = yValid && newX !== sp.yVariable
        ? sp.yVariable
        : numericVariables.find(v => v !== newX) || numericVariables[1]
      return { ...sp, xVariable: newX, yVariable: newY }
    })

    const hasChanges = updated.some((sp, i) =>
      sp.xVariable !== current[i].xVariable || sp.yVariable !== current[i].yVariable
    )
    if (hasChanges) setScatterplots(updated)
  }, [numericVariables])

  const updateXVariable = useCallback((id: string, newX: string) => {
    setScatterplots(prev => prev.map(s =>
      s.id === id ? { ...s, xVariable: newX } : s
    ))
  }, [])

  const updateYVariable = useCallback((id: string, newY: string) => {
    setScatterplots(prev => prev.map(s =>
      s.id === id ? { ...s, yVariable: newY } : s
    ))
  }, [])

  const removeScatterplot = useCallback((id: string) => {
    setScatterplots(prev => prev.filter(s => s.id !== id))
  }, [])

  if (scatterVisibility === 'hidden' && heatmapVisibility === 'hidden') return null

  const bothSecondary = scatterVisibility === 'secondary' && heatmapVisibility === 'secondary'

  return (
    <div className={cn("w-full", bothSecondary && 'opacity-50 border-l-2 border-l-muted-foreground/30')}>
      <ContentTabs
        tabs={[
          { id: 'scatterplots', label: t.dataExploration.scatterTabs.scatter, icon: ChartScatter },
          { id: 'heatmap', label: t.dataExploration.scatterTabs.heatmap, icon: Flame }
        ]}
        activeTab={explorationTab}
        onTabChange={(id) => setExplorationTab(id as 'scatterplots' | 'heatmap')}
        className="mb-4"
      />

      {/* 산점도 Tab */}
      <ContentTabsContent show={explorationTab === 'scatterplots'}>
        <div className="space-y-4">
          {scatterplots.map(config => {
            const { x: xData, y: yData } = getPairedData(config.xVariable, config.yVariable)
            const scatterData = xData.map((x, i) => ({ x, y: yData[i] }))
            const { r, r2 } = calculateCorrelation(xData, yData)

            return (
              <Card key={config.id} className="overflow-hidden border border-border/40 shadow-sm bg-card rounded-xl">
                {/* 헤더 - 변수 선택 */}
                <div className="px-4 py-4 border-b border-border/30 bg-muted/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <ChartScatter className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-sm">{t.dataExploration.scatter.variableRelation}</span>
                    </div>
                    {scatterplots.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeScatterplot(config.id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* X → Y 변수 선택 UI */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">{t.dataExploration.scatter.xAxis}</label>
                      <Select
                        value={config.xVariable}
                        onValueChange={(value) => updateXVariable(config.id, value)}
                      >
                        <SelectTrigger className="h-9 bg-background border-border/50 hover:border-primary/50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {numericVariables.map(v => (
                            <SelectItem key={v} value={v} disabled={v === config.yVariable}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end pb-0.5">
                      <div className="p-2 rounded-full bg-primary/5">
                        <ArrowRight className="h-4 w-4 text-primary/70" />
                      </div>
                    </div>

                    <div className="flex-1">
                      <label className="text-xs text-muted-foreground mb-1.5 block">{t.dataExploration.scatter.yAxis}</label>
                      <Select
                        value={config.yVariable}
                        onValueChange={(value) => updateYVariable(config.id, value)}
                      >
                        <SelectTrigger className="h-9 bg-background border-border/50 hover:border-primary/50 transition-colors">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {numericVariables.map(v => (
                            <SelectItem key={v} value={v} disabled={v === config.xVariable}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 상관계수 뱃지 바 */}
                <div className="px-4 py-2.5 border-b bg-gradient-to-r from-primary/5 to-transparent flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t.dataExploration.correlation.coefficient}</span>
                      <Badge
                        variant={Math.abs(r) >= 0.7 ? "default" : Math.abs(r) >= 0.4 ? "secondary" : "outline"}
                        className="font-mono text-xs"
                      >
                        r = {r >= 0 ? '+' : ''}{r.toFixed(3)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground">{t.dataExploration.correlation.determination}</span>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        R² = {r2.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      n = {xData.length}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs gap-1">
                    <Sparkles className="h-3 w-3" />
                    {Math.abs(r) >= 0.7 ? t.dataExploration.correlation.strong : Math.abs(r) >= 0.4 ? t.dataExploration.correlation.medium : t.dataExploration.correlation.weak}
                  </Badge>
                </div>

                {/* 그래프 */}
                <CardContent className="p-4">
                  <Scatterplot
                    data={scatterData}
                    title={`${config.xVariable} vs ${config.yVariable}`}
                    xAxisLabel={config.xVariable}
                    yAxisLabel={config.yVariable}
                    showTrendLine={true}
                    correlationCoefficient={r}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ContentTabsContent>

      {/* 상관 히트맵 Tab */}
      <ContentTabsContent show={explorationTab === 'heatmap'}>
        <Card className="border-border/40 shadow-sm overflow-hidden rounded-xl">
          <CardHeader className="bg-muted/10">
            <CardTitle className="text-base tracking-tight">{t.dataExploration.heatmap.title}</CardTitle>
            <CardDescription>
              {t.dataExploration.heatmap.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 히트맵 시각화 */}
            {heatmapMatrix.length >= 2 && (
              <CorrelationHeatmap
                matrix={heatmapMatrix}
                labels={numericVariables}
                height={Math.max(350, numericVariables.length * 40)}
              />
            )}

            {/* 해석 가이드 */}
            <div className="mt-4 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="font-medium mb-1">{t.dataExploration.heatmapGuide.title}</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div><span className="inline-block w-3 h-3 rounded bg-red-500 mr-1"></span> <strong>r = +1</strong>: {t.dataExploration.heatmapGuide.strongPositive}</div>
                <div><span className="inline-block w-3 h-3 rounded bg-blue-500 mr-1"></span> <strong>r = -1</strong>: {t.dataExploration.heatmapGuide.strongNegative}</div>
                <div><span className="inline-block w-3 h-3 rounded bg-gray-200 mr-1"></span> <strong>r = 0</strong>: {t.dataExploration.heatmapGuide.noCorrelation}</div>
                <div><strong>|r| &gt;= 0.7</strong>: {t.dataExploration.heatmapGuide.veryStrong}</div>
              </div>
            </div>

            {/* 강한 상관관계 목록 */}
            {correlationMatrix.filter(c => Math.abs(c.r) >= 0.5).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">{t.dataExploration.strongCorrelations.title}</p>
                <div className="space-y-1">
                  {correlationMatrix
                    .filter(c => Math.abs(c.r) >= 0.5)
                    .slice(0, 5)
                    .map(({ var1, var2, r }) => (
                      <div key={`${var1}-${var2}`} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded">
                        <span>{var1} - {var2}</span>
                        <Badge variant={Math.abs(r) >= 0.7 ? 'default' : 'secondary'}>
                          r = {r >= 0 ? '+' : ''}{r.toFixed(3)}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </ContentTabsContent>
    </div>
  )
})
