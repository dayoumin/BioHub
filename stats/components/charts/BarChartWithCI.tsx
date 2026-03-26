'use client'

import React, { useMemo, useState, useCallback, memo } from 'react'
import { useTheme } from 'next-themes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Info,
  Download,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  ChartBar,
  Table as TableIcon,
  AlertCircle,
  BarChart3,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChartSkeleton } from './ChartSkeleton'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statCategoryAxis, statValueAxis, statTooltip, errorBarSeries, STAT_COLORS } from '@/lib/charts/echarts-stat-utils'
import { resolveSemanticColors } from '@/lib/charts/chart-color-resolver'
import type { EChartsOption } from 'echarts'

interface BarChartData {
  name: string
  value: number
  ci?: [number, number] // 신뢰구간 [lower, upper]
  se?: number // 표준오차
  color?: string
  label?: string
}

interface BarChartWithCIProps {
  data: BarChartData[]
  title?: string
  description?: string
  height?: number
  showCI?: boolean
  ciLevel?: number // 신뢰수준 (예: 95)
  showValues?: boolean
  orientation?: 'horizontal' | 'vertical'
  unit?: string
  baseline?: number
  showBaseline?: boolean
  interactive?: boolean
  className?: string
  isLoading?: boolean
  error?: Error | null
  onBarClick?: (data: BarChartData, index: number) => void
}

/** 기준선 대비 색상 결정. sem은 호출자에서 1회 resolve하여 전달. */
function getBarColor(
  index: number, value: number, baseline: number, showBaseline: boolean,
  sem: ReturnType<typeof resolveSemanticColors>, customColor?: string,
): string {
  if (customColor) return customColor
  if (showBaseline) {
    if (value > baseline) return sem.success
    if (value < baseline) return sem.error
    return sem.neutral
  }
  return STAT_COLORS[index % STAT_COLORS.length]
}

export const BarChartWithCI = memo(function BarChartWithCI({
  data,
  title,
  description,
  height = 400,
  showCI = true,
  ciLevel = 95,
  showValues = true,
  orientation = 'vertical',
  unit = '',
  baseline = 0,
  showBaseline = true,
  interactive = true,
  className,
  isLoading = false,
  error = null,
  onBarClick
}: BarChartWithCIProps) {
  const { resolvedTheme } = useTheme()
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // 효과크기 계산
  const calculateEffectSize = useCallback((value: number) => {
    if (baseline == null) return null
    const diff = Math.abs(value - baseline)
    if (diff < 0.2) return '작음'
    if (diff < 0.5) return '중간'
    if (diff < 0.8) return '큼'
    return '매우 큼'
  }, [baseline])

  // ECharts option
  const chartOption = useMemo((): EChartsOption => {
    const categories = data.map((d) => d.label || d.name)
    const values = data.map((d) => d.value)
    const sem = resolveSemanticColors()
    const colors = data.map((d, i) => getBarColor(i, d.value, baseline, showBaseline, sem, d.color))

    const series: NonNullable<EChartsOption['series']> = [
      {
        type: 'bar',
        data: values.map((val, i) => ({
          value: val,
          itemStyle: { color: colors[i], borderRadius: [4, 4, 0, 0] },
        })),
        label: showValues ? {
          show: true,
          position: 'top',
          formatter: (p: Record<string, unknown>) => `${(p.value as number).toFixed(2)}${unit}`,
          fontSize: 11,
        } : undefined,
        barMaxWidth: 60,
      } as Record<string, unknown>,
    ]

    // 신뢰구간 에러바
    if (showCI) {
      const ciData = data.map((d, i) => {
        const upper = d.ci ? d.ci[1] : d.value
        const lower = d.ci ? d.ci[0] : d.value
        return [i, upper, lower]
      }).filter((_, i) => data[i].ci != null)

      if (ciData.length > 0) {
        series.push(errorBarSeries(ciData as Array<[number, number, number]>, { halfWidth: 8 }) as Record<string, unknown>)
      }
    }

    return {
      ...statBaseOption(),
      xAxis: statCategoryAxis(categories),
      yAxis: { ...statValueAxis(unit || undefined), name: unit || '' },
      series,
      tooltip: statTooltip({
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter(params: unknown) {
          const arr = params as Array<Record<string, unknown>>
          const p = arr[0]
          const idx = p.dataIndex as number
          const d = data[idx]
          if (!d) return ''
          let html = `<b>${d.label || d.name}</b><br/>값: ${d.value.toFixed(3)}${unit}`
          if (d.ci) html += `<br/>${ciLevel}% CI: [${d.ci[0].toFixed(3)}, ${d.ci[1].toFixed(3)}]`
          if (d.se) html += `<br/>SE: ±${d.se.toFixed(3)}`
          return html
        },
      }),
      toolbox: {
        right: 10,
        top: 0,
        feature: { saveAsImage: { title: 'PNG 저장', pixelRatio: 2 } },
      },
    }
  }, [data, showCI, showValues, showBaseline, baseline, unit, ciLevel, resolvedTheme])

  // 기준선 markLine을 series에 추가
  const finalOption = useMemo((): EChartsOption => {
    if (!showBaseline || !chartOption.series) return chartOption

    const seriesArr = Array.isArray(chartOption.series) ? chartOption.series : [chartOption.series]
    if (seriesArr.length === 0) return chartOption

    const firstSeries = { ...(seriesArr[0] as Record<string, unknown>) }
    firstSeries.markLine = {
      silent: true,
      symbol: 'none',
      lineStyle: { color: resolveSemanticColors().neutral, type: 'solid' as const, width: 2 },
      data: [{ yAxis: baseline, label: { formatter: '기준선', position: 'end' as const } }],
    }

    return {
      ...chartOption,
      series: [firstSeries, ...seriesArr.slice(1)] as NonNullable<EChartsOption['series']>,
    }
  }, [chartOption, showBaseline, baseline, resolvedTheme])

  // CSV 다운로드
  const downloadCSV = useCallback(() => {
    try {
      const headers = ['Group', 'Value', 'CI_Lower', 'CI_Upper', 'SE', 'CI_Width']
      const rows = data.map(d => [
        d.name,
        d.value.toFixed(4),
        d.ci ? d.ci[0].toFixed(4) : '',
        d.ci ? d.ci[1].toFixed(4) : '',
        d.se ? d.se.toFixed(4) : '',
        d.ci ? (d.ci[1] - d.ci[0]).toFixed(4) : ''
      ].join(','))

      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `barchart_ci_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV 다운로드 실패:', err)
    }
  }, [data])

  // ECharts 클릭 핸들러
  const onChartClick = useCallback(
    (params: Record<string, unknown>) => {
      const idx = params.dataIndex as number | undefined
      if (idx == null) return
      setSelectedBar((prev) => (prev === idx ? null : idx))
      if (onBarClick && data[idx]) onBarClick(data[idx], idx)
    },
    [data, onBarClick],
  )

  const echartsEvents = useMemo(
    () => (interactive ? { click: onChartClick } : undefined),
    [interactive, onChartClick],
  )

  if (isLoading) {
    return <ChartSkeleton height={height} title={!!title} description={!!description} />
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardHeader>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              차트를 불러오는 중 오류가 발생했습니다: {error.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const renderTable = () => {
    const tableSem = resolveSemanticColors()
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">그룹</th>
              <th className="text-right py-2 px-3">값</th>
              {showCI && (
                <>
                  <th className="text-right py-2 px-3">하한</th>
                  <th className="text-right py-2 px-3">상한</th>
                  <th className="text-right py-2 px-3">CI 너비</th>
                </>
              )}
              {data.some(d => d.se) && (
                <th className="text-right py-2 px-3">표준오차</th>
              )}
              {showBaseline && (
                <th className="text-right py-2 px-3">기준선 대비</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const color = getBarColor(i, d.value, baseline, showBaseline, tableSem, d.color)
              const diff = d.value - baseline
              return (
                <tr
                  key={d.name}
                  className={cn(
                    "border-b hover:bg-muted/50 cursor-pointer transition-colors",
                    selectedBar === i && "bg-muted"
                  )}
                  onClick={() => setSelectedBar(i === selectedBar ? null : i)}
                >
                  <td className="py-2 px-3 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                      {d.label || d.name}
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 font-medium">{d.value.toFixed(3)}{unit}</td>
                  {showCI && (
                    <>
                      <td className="text-right py-2 px-3">{d.ci ? `${d.ci[0].toFixed(3)}${unit}` : '-'}</td>
                      <td className="text-right py-2 px-3">{d.ci ? `${d.ci[1].toFixed(3)}${unit}` : '-'}</td>
                      <td className="text-right py-2 px-3">{d.ci ? `${(d.ci[1] - d.ci[0]).toFixed(3)}${unit}` : '-'}</td>
                    </>
                  )}
                  {data.some(d => d.se) && (
                    <td className="text-right py-2 px-3">{d.se ? `±${d.se.toFixed(3)}${unit}` : '-'}</td>
                  )}
                  {showBaseline && (
                    <td className="text-right py-2 px-3">
                      <div className="flex items-center justify-end gap-1">
                        {diff > 0 ? <TrendingUp className="h-3 w-3 text-success" /> : diff < 0 ? <TrendingDown className="h-3 w-3 text-error" /> : null}
                        <span className={cn(diff > 0 && "text-success", diff < 0 && "text-error")}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(3)}{unit}
                        </span>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <Card className={cn('w-full', className, isFullscreen && 'fixed inset-4 z-50')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'chart' | 'table')}>
              <TabsList className="h-9">
                <TabsTrigger value="chart" className="h-7">
                  <ChartBar className="h-4 w-4 mr-1" />
                  차트
                </TabsTrigger>
                <TabsTrigger value="table" className="h-7">
                  <TableIcon className="h-4 w-4 mr-1" />
                  테이블
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {interactive && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setIsFullscreen(!isFullscreen)} aria-label={isFullscreen ? '원래 크기로' : '전체 화면'}>
                      {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{isFullscreen ? '원래 크기로' : '전체 화면'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={downloadCSV} aria-label="CSV 다운로드">
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>CSV 다운로드</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {viewMode === 'chart' ? (
            <>
              {showCI && (
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    <BarChart3 className="h-3 w-3 mr-1" />
                    {ciLevel}% 신뢰구간
                  </Badge>
                  {data.some(d => !d.ci) && (
                    <Alert className="py-1 px-2">
                      <AlertCircle className="h-3 w-3" />
                      <AlertDescription className="text-xs ml-1">
                        일부 데이터에 신뢰구간이 없습니다
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              <LazyReactECharts
                option={finalOption}
                style={{ height: isFullscreen ? height * 1.5 : height }}
                opts={{ renderer: 'svg' }}
                onEvents={echartsEvents}
              />

              {/* 선택된 막대 상세 정보 */}
              {selectedBar !== null && data[selectedBar] && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {data[selectedBar].label || data[selectedBar].name} 상세 정보
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">값</div>
                      <div className="font-medium text-lg">{data[selectedBar].value.toFixed(3)}{unit}</div>
                    </div>

                    {data[selectedBar].ci && (
                      <>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{ciLevel}% 신뢰구간</div>
                          <div className="font-medium">[{data[selectedBar].ci![0].toFixed(3)}, {data[selectedBar].ci![1].toFixed(3)}]{unit}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">CI 너비</div>
                          <div className="font-medium">{(data[selectedBar].ci![1] - data[selectedBar].ci![0]).toFixed(3)}{unit}</div>
                        </div>
                      </>
                    )}

                    {data[selectedBar].se && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">표준오차</div>
                        <div className="font-medium">±{data[selectedBar].se!.toFixed(3)}{unit}</div>
                      </div>
                    )}

                    {showBaseline && (
                      <>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">기준선 대비</div>
                          <div className="font-medium flex items-center gap-1">
                            {data[selectedBar].value > baseline ? <TrendingUp className="h-4 w-4 text-success" /> : data[selectedBar].value < baseline ? <TrendingDown className="h-4 w-4 text-error" /> : null}
                            <span className={cn(data[selectedBar].value > baseline && "text-success", data[selectedBar].value < baseline && "text-error")}>
                              {data[selectedBar].value > baseline ? '+' : ''}{(data[selectedBar].value - baseline).toFixed(3)}{unit}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">효과크기</div>
                          <div className="font-medium">{calculateEffectSize(data[selectedBar].value) || '-'}</div>
                        </div>
                      </>
                    )}
                  </div>

                  {data[selectedBar].ci && (
                    <div className="mt-3 pt-3 border-t text-sm space-y-1">
                      <p className="text-muted-foreground">
                        {ciLevel}% 확률로 실제 값이 {data[selectedBar].ci![0].toFixed(2)}{unit}와 {data[selectedBar].ci![1].toFixed(2)}{unit} 사이에 있습니다.
                      </p>
                      {showBaseline && (
                        <p className="text-muted-foreground">
                          {data[selectedBar].ci![0] > baseline
                            ? `신뢰구간 전체가 기준선(${baseline})보다 높으므로 통계적으로 유의한 증가입니다.`
                            : data[selectedBar].ci![1] < baseline
                            ? `신뢰구간 전체가 기준선(${baseline})보다 낮으므로 통계적으로 유의한 감소입니다.`
                            : `신뢰구간이 기준선(${baseline})을 포함하므로 통계적으로 유의하지 않습니다.`}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            renderTable()
          )}

          {/* 정보 패널 */}
          <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p className="font-medium">신뢰구간이 있는 막대차트 해석 가이드</p>
              <p>• 막대: 측정된 평균값 또는 추정값</p>
              <p>• 오차 막대: {ciLevel}% 신뢰구간 (실제 값이 있을 것으로 예상되는 범위)</p>
              <p>• 좁은 신뢰구간: 높은 정밀도, 작은 변동성</p>
              <p>• 넓은 신뢰구간: 낮은 정밀도, 큰 변동성</p>
              {showBaseline && (
                <>
                  <p className="pt-1 font-medium">기준선 비교:</p>
                  <p>• 신뢰구간이 기준선을 포함하지 않으면 통계적으로 유의한 차이</p>
                  <p>• 신뢰구간이 기준선을 포함하면 통계적으로 유의하지 않은 차이</p>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default BarChartWithCI
