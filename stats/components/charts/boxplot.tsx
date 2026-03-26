'use client'

import React, { useMemo, useState, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Info,
  Download,
  Maximize2,
  Minimize2,
  TrendingUp,
  TrendingDown,
  Activity,
  ChartBar,
  Table as TableIcon,
  AlertCircle,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChartSkeleton } from './ChartSkeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statCategoryAxis, statValueAxis, statTooltip, STAT_COLORS } from '@/lib/charts/echarts-stat-utils'
import { resolveCssVar } from '@/lib/charts/chart-color-resolver'
import type { EChartsOption } from 'echarts'

interface BoxPlotData {
  name: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers?: number[]
  mean?: number
  std?: number
  color?: string
}

interface BoxPlotProps {
  data: BoxPlotData[]
  title?: string
  description?: string
  height?: number
  showMean?: boolean
  showOutliers?: boolean
  orientation?: 'horizontal' | 'vertical'
  showLegend?: boolean
  unit?: string
  showStatistics?: boolean
  interactive?: boolean
  className?: string
  isLoading?: boolean
  error?: Error | null
  onDataPointClick?: (data: BoxPlotData, point: string) => void
  /** Whether to wrap content in a Card component (default: true) */
  showCard?: boolean
}

/** BoxPlotData → ECharts option 변환 */
function toEChartsOption(
  data: BoxPlotData[],
  opts: { showMean: boolean; showOutliers: boolean; unit: string; height: number },
): EChartsOption {
  const categories = data.map((d) => d.name);
  const boxData = data.map((d) => [d.min, d.q1, d.median, d.q3, d.max]);
  const colors = data.map((d, i) => d.color ?? STAT_COLORS[i % STAT_COLORS.length]);

  const series: NonNullable<EChartsOption['series']> = [
    {
      name: '분포',
      type: 'boxplot',
      data: boxData.map((row, i) => ({
        value: row,
        itemStyle: { color: colors[i] + '33', borderColor: colors[i] },
      })),
      emphasis: {
        itemStyle: { borderWidth: 2, shadowBlur: 6, shadowColor: 'rgba(0,0,0,0.15)' },
      },
      tooltip: {
        formatter(params: unknown) {
          const p = params as { value: number[]; dataIndex: number };
          const val = p.value;
          const idx = p.dataIndex;
          const name = categories[idx];
          const u = opts.unit;
          return `<b>${name}</b><br/>
최대: ${val[4].toFixed(2)}${u}<br/>
Q3: ${val[3].toFixed(2)}${u}<br/>
중앙값: ${val[2].toFixed(2)}${u}<br/>
Q1: ${val[1].toFixed(2)}${u}<br/>
최소: ${val[0].toFixed(2)}${u}`;
        },
      },
    } as Record<string, unknown>,
  ];

  // 평균 마커
  if (opts.showMean) {
    const meanData = data
      .map((d, i) =>
        d.mean != null ? { value: [i, d.mean], itemStyle: { color: resolveCssVar('--background', '#fff'), borderColor: colors[i] } } : null,
      )
      .filter(Boolean);
    if (meanData.length > 0) {
      series.push({
        name: '평균',
        type: 'scatter',
        symbol: 'diamond',
        symbolSize: 10,
        data: meanData,
        z: 10,
        tooltip: {
          formatter(params: unknown) {
            const val = (params as { value: number[] }).value;
            const idx = val[0];
            return `<b>${categories[idx]}</b> 평균: ${val[1].toFixed(2)}${opts.unit}`;
          },
        },
      } as Record<string, unknown>);
    }
  }

  // 이상치
  if (opts.showOutliers) {
    const outlierPoints: Array<{ value: number[]; itemStyle: { color: string } }> = [];
    data.forEach((d, i) => {
      (d.outliers ?? []).forEach((v) => {
        outlierPoints.push({ value: [i, v], itemStyle: { color: colors[i] } });
      });
    });
    if (outlierPoints.length > 0) {
      series.push({
        name: '이상치',
        type: 'scatter',
        symbol: 'circle',
        symbolSize: 6,
        data: outlierPoints,
        itemStyle: { opacity: 0.7 },
        tooltip: {
          formatter(params: unknown) {
            const val = (params as { value: number[] }).value;
            const idx = val[0];
            return `<b>${categories[idx]}</b> 이상치: ${val[1].toFixed(2)}${opts.unit}`;
          },
        },
      } as Record<string, unknown>);
    }
  }

  return {
    ...statBaseOption(),
    xAxis: statCategoryAxis(categories),
    yAxis: {
      ...statValueAxis(opts.unit || undefined),
      name: opts.unit || '',
    },
    series,
    dataZoom: [{ type: 'inside', yAxisIndex: 0 }],
    toolbox: {
      right: 10,
      top: 0,
      feature: {
        saveAsImage: { title: 'PNG 저장', pixelRatio: 2 },
      },
    },
  };
}

/**
 * BoxPlot 컴포넌트
 *
 * 데이터의 5개 요약 통계량(최소값, Q1, 중앙값, Q3, 최대값)을 시각화하는 박스플롯 차트
 *
 * @component
 * @example
 * ```tsx
 * <BoxPlot
 *   data={[
 *     { name: '그룹A', min: 10, q1: 20, median: 30, q3: 40, max: 50, mean: 31 }
 *   ]}
 *   title="데이터 분포"
 *   showMean={true}
 *   unit="kg"
 * />
 * ```
 */
export const BoxPlot = memo(function BoxPlot({
  data,
  title,
  description,
  height = 400,
  showMean = true,
  showOutliers = true,
  orientation = 'vertical',
  showLegend = true,
  unit = '',
  showStatistics = true,
  interactive = true,
  className,
  isLoading = false,
  error = null,
  onDataPointClick,
  showCard = true
}: BoxPlotProps) {
  const [selectedBox, setSelectedBox] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  const chartOption = useMemo(
    () => toEChartsOption(data, { showMean, showOutliers, unit, height }),
    [data, showMean, showOutliers, unit, height],
  )

  // 통계 요약 계산
  const calculateStatistics = useCallback((d: BoxPlotData) => {
    const iqr = d.q3 - d.q1
    const whiskerLower = Math.max(d.min, d.q1 - 1.5 * iqr)
    const whiskerUpper = Math.min(d.max, d.q3 + 1.5 * iqr)

    return {
      iqr,
      whiskerLower,
      whiskerUpper,
      range: d.max - d.min,
      outlierCount: d.outliers?.length || 0,
      cv: d.mean && d.std ? (d.std / d.mean * 100) : null
    }
  }, [])

  // 색상 생성 함수
  const getBoxColor = useCallback((index: number, customColor?: string) => {
    if (customColor) return customColor
    return STAT_COLORS[index % STAT_COLORS.length]
  }, [])

  // CSV 다운로드 함수
  const downloadCSV = useCallback(() => {
    try {
    const headers = ['Group', 'Min', 'Q1', 'Median', 'Q3', 'Max', 'Mean', 'StdDev', 'IQR', 'Outliers']
    const rows = data.map(d => {
      const stats = calculateStatistics(d)
      return [
        d.name,
        d.min.toFixed(4),
        d.q1.toFixed(4),
        d.median.toFixed(4),
        d.q3.toFixed(4),
        d.max.toFixed(4),
        d.mean?.toFixed(4) || '',
        d.std?.toFixed(4) || '',
        stats.iqr.toFixed(4),
        d.outliers?.join(';') || ''
      ].join(',')
    })

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `boxplot_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    } catch (err) {
      console.error('CSV 다운로드 실패:', err)
    }
  }, [data, calculateStatistics])

  // ECharts 이벤트 핸들러
  const onChartClick = useCallback(
    (params: Record<string, unknown>) => {
      const idx = params.dataIndex as number | undefined
      if (idx == null) return

      if (params.seriesType === 'boxplot') {
        setSelectedBox((prev) => (prev === idx ? null : idx))
        if (onDataPointClick && data[idx]) {
          onDataPointClick(data[idx], 'box')
        }
      } else if (params.seriesName === '평균') {
        const val = params.value as number[]
        const dataIdx = val[0]
        if (onDataPointClick && data[dataIdx]) {
          onDataPointClick(data[dataIdx], 'mean')
        }
      } else if (params.seriesName === '이상치') {
        const val = params.value as number[]
        const dataIdx = val[0]
        if (onDataPointClick && data[dataIdx]) {
          onDataPointClick(data[dataIdx], `outlier`)
        }
      }
    },
    [data, onDataPointClick],
  )

  const echartsEvents = useMemo(
    () => (interactive ? { click: onChartClick } : undefined),
    [interactive, onChartClick],
  )

  // 로딩 상태 처리
  if (isLoading) {
    return <ChartSkeleton height={height} title={!!title} description={!!description} showCard={showCard} />
  }

  // 에러 상태 처리
  if (error) {
    if (!showCard) {
      return (
        <Alert variant="destructive" className={className}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            차트를 불러오는 중 오류가 발생했습니다: {error.message}
          </AlertDescription>
        </Alert>
      )
    }
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
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-base">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">그룹</th>
              <th className="text-right py-2 px-3">최소값</th>
              <th className="text-right py-2 px-3">Q1</th>
              <th className="text-right py-2 px-3">중앙값</th>
              <th className="text-right py-2 px-3">Q3</th>
              <th className="text-right py-2 px-3">최대값</th>
              <th className="text-right py-2 px-3">평균</th>
              <th className="text-right py-2 px-3">IQR</th>
              <th className="text-right py-2 px-3">이상치</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d, i) => {
              const stats = calculateStatistics(d)
              const color = getBoxColor(i, d.color)
              return (
                <tr
                  key={d.name}
                  className={cn(
                    "border-b hover:bg-muted/50 cursor-pointer transition-colors",
                    selectedBox === i && "bg-muted"
                  )}
                  onClick={() => setSelectedBox(i === selectedBox ? null : i)}
                >
                  <td className="py-2 px-3 font-medium">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {d.name}
                    </div>
                  </td>
                  <td className="text-right py-2 px-3">{d.min.toFixed(2)}{unit}</td>
                  <td className="text-right py-2 px-3">{d.q1.toFixed(2)}{unit}</td>
                  <td className="text-right py-2 px-3 font-medium">{d.median.toFixed(2)}{unit}</td>
                  <td className="text-right py-2 px-3">{d.q3.toFixed(2)}{unit}</td>
                  <td className="text-right py-2 px-3">{d.max.toFixed(2)}{unit}</td>
                  <td className="text-right py-2 px-3">
                    {d.mean != null ? `${d.mean.toFixed(2)}${unit}` : '-'}
                  </td>
                  <td className="text-right py-2 px-3">{stats.iqr.toFixed(2)}{unit}</td>
                  <td className="text-right py-2 px-3">
                    {stats.outlierCount > 0 ? `${stats.outlierCount}개` : '-'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  // Header controls (reusable)
  const headerControls = (
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
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                aria-label={isFullscreen ? '원래 크기로' : '전체 화면'}
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? '원래 크기로' : '전체 화면'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={downloadCSV}
              aria-label="CSV 다운로드"
            >
              <Download className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>CSV 다운로드</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )

  // Main content (reusable)
  const mainContent = (
    <div className="space-y-4">
      {viewMode === 'chart' ? (
        <>
          {/* ECharts Plot */}
          <LazyReactECharts
            option={chartOption}
            style={{ height: isFullscreen ? height * 1.5 : height }}
            opts={{ renderer: 'svg' }}
            onEvents={echartsEvents}
          />

          {/* Statistics Panel */}
          {showStatistics && selectedBox !== null && data[selectedBox] && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-2 animate-in slide-in-from-bottom-2 duration-200">
              <h4 className="font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {data[selectedBox].name} 상세 통계
              </h4>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">최소값</div>
                  <div className="font-medium">{data[selectedBox].min.toFixed(2)}{unit}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Q1 (25%)</div>
                  <div className="font-medium">{data[selectedBox].q1.toFixed(2)}{unit}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">중앙값</div>
                  <div className="font-medium text-primary">{data[selectedBox].median.toFixed(2)}{unit}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Q3 (75%)</div>
                  <div className="font-medium">{data[selectedBox].q3.toFixed(2)}{unit}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">최대값</div>
                  <div className="font-medium">{data[selectedBox].max.toFixed(2)}{unit}</div>
                </div>
                {data[selectedBox].mean != null && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">평균</div>
                    <div className="font-medium text-blue-600">{data[selectedBox].mean.toFixed(2)}{unit}</div>
                  </div>
                )}
                {data[selectedBox].std != null && (
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">표준편차</div>
                    <div className="font-medium">{data[selectedBox].std.toFixed(2)}{unit}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">IQR</div>
                  <div className="font-medium">
                    {(data[selectedBox].q3 - data[selectedBox].q1).toFixed(2)}{unit}
                  </div>
                </div>
              </div>

              {/* 분포 해석 */}
              <div className="mt-3 pt-3 border-t space-y-2">
                {data[selectedBox].mean != null && (
                  <div className="flex items-center gap-2 text-sm">
                    {data[selectedBox].median > data[selectedBox].mean! ? (
                      <>
                        <TrendingDown className="h-4 w-4 text-blue-600" />
                        <span>왼쪽 꼬리 분포 (negative skew) - 중앙값이 평균보다 큼</span>
                      </>
                    ) : data[selectedBox].median < data[selectedBox].mean! ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <span>오른쪽 꼬리 분포 (positive skew) - 평균이 중앙값보다 큼</span>
                      </>
                    ) : (
                      <>
                        <Activity className="h-4 w-4 text-success" />
                        <span>대칭 분포 - 평균과 중앙값이 유사</span>
                      </>
                    )}
                  </div>
                )}
                {data[selectedBox].outliers && data[selectedBox].outliers!.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>이상치가 {data[selectedBox].outliers!.length}개 발견되었습니다.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        renderTable()
      )}

      {/* Legend */}
      {showLegend && data.length > 1 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {data.map((d, i) => (
            <Badge
              key={d.name}
              variant={selectedBox === i ? 'default' : 'outline'}
              className="cursor-pointer transition-all duration-200"
              onClick={() => setSelectedBox(i === selectedBox ? null : i)}
              style={{
                borderColor: getBoxColor(i, d.color),
                backgroundColor: selectedBox === i ? getBoxColor(i, d.color) : 'transparent',
                color: selectedBox === i ? 'white' : getBoxColor(i, d.color)
              }}
            >
              {d.name}
            </Badge>
          ))}
        </div>
      )}

      {/* Info tooltip */}
      <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1.5">
          <p className="font-medium">박스플롯 해석 가이드</p>
          <p>• 박스: 데이터의 50%가 포함된 범위 (Q1~Q3, IQR)</p>
          <p>• 중앙선: 데이터를 반으로 나누는 중앙값</p>
          <p>• 수염: 이상치를 제외한 데이터의 범위</p>
          {showMean && <p>• 다이아몬드: 데이터의 평균값</p>}
          {showOutliers && <p>• 원: 극단적인 값 (이상치)</p>}
        </div>
      </div>
    </div>
  )

  // Render without Card wrapper
  if (!showCard) {
    return (
      <div className={cn('w-full', className, isFullscreen && 'fixed inset-4 z-50 bg-background p-6 rounded-lg shadow-lg')}>
        <div className="flex items-center justify-between mb-4">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {headerControls}
        </div>
        {mainContent}
      </div>
    )
  }

  // Render with Card wrapper
  return (
    <Card className={cn('w-full', className, isFullscreen && 'fixed inset-4 z-50')}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            {title && <CardTitle>{title}</CardTitle>}
            {description && <CardDescription className="mt-1">{description}</CardDescription>}
          </div>
          {headerControls}
        </div>
      </CardHeader>
      <CardContent>
        {mainContent}
      </CardContent>
    </Card>
  )
})

export default BoxPlot
