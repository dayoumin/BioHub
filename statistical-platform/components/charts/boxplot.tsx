'use client'

import React, { useMemo, useState, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  onDataPointClick
}: BoxPlotProps) {
  const [selectedBox, setSelectedBox] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoveredBox, setHoveredBox] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // 로딩 상태 처리
  if (isLoading) {
    return <ChartSkeleton height={height} title={!!title} description={!!description} />
  }

  // 에러 상태 처리
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

  // 전체 데이터 범위 계산
  const { minValue, maxValue, range } = useMemo(() => {
    // 빈 데이터 처리
    if (data.length === 0) {
      return { minValue: 0, maxValue: 1, range: 1 }
    }

    let min = Infinity
    let max = -Infinity

    data.forEach(d => {
      min = Math.min(min, d.min)
      max = Math.max(max, d.max)
      if (d.outliers) {
        d.outliers.forEach(outlier => {
          min = Math.min(min, outlier)
          max = Math.max(max, outlier)
        })
      }
    })

    // Infinity 체크
    if (!isFinite(min) || !isFinite(max)) {
      return { minValue: 0, maxValue: 1, range: 1 }
    }

    const padding = (max - min) * 0.1
    return {
      minValue: min - padding,
      maxValue: max + padding,
      range: max - min + padding * 2
    }
  }, [data])

  // 값을 픽셀 위치로 변환
  const valueToPosition = (value: number) => {
    const plotHeight = height - 100
    return plotHeight - ((value - minValue) / range) * plotHeight
  }

  // 박스 너비 및 간격 계산
  const boxWidth = Math.min(80, 500 / data.length)
  const boxSpacing = 600 / data.length

  // 통계 요약 계산
  const calculateStatistics = (d: BoxPlotData) => {
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
  }

  // 색상 생성 함수
  const getBoxColor = (index: number, customColor?: string) => {
    if (customColor) return customColor

    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // emerald-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#8B5CF6', // violet-500
      '#EC4899', // pink-500
    ]

    return colors[index % colors.length]
  }

  // CSV 다운로드 함수 (메모이제이션)
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
    } catch (error) {
      console.error('CSV 다운로드 실패:', error)
      // 사용자에게 오류 알림 (toast 사용 가능)
    }
  }, [data])

  const renderBox = (d: BoxPlotData, index: number) => {
    const stats = calculateStatistics(d)
    const color = getBoxColor(index, d.color)
    const isHovered = hoveredBox === index
    const isSelected = selectedBox === index

    const x = index * boxSpacing + boxSpacing / 2

    return (
      <g
        key={d.name}
        role="button"
        tabIndex={interactive ? 0 : -1}
        aria-label={`${d.name} 박스플롯: 중앙값 ${d.median.toFixed(2)}${unit}`}
        onMouseEnter={() => interactive && setHoveredBox(index)}
        onMouseLeave={() => interactive && setHoveredBox(null)}
        onClick={() => interactive && setSelectedBox(index === selectedBox ? null : index)}
        onKeyDown={(e) => {
          if (interactive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setSelectedBox(index === selectedBox ? null : index)
          }
        }}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
        className="transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary rounded"
      >
        {/* Whiskers */}
        <line
          x1={x}
          y1={valueToPosition(stats.whiskerUpper)}
          x2={x}
          y2={valueToPosition(stats.whiskerLower)}
          stroke={color}
          strokeWidth={isHovered ? 2 : 1}
          strokeDasharray="2,2"
          opacity={isHovered ? 1 : 0.6}
        />

        {/* Whisker caps */}
        <line
          x1={x - boxWidth / 4}
          y1={valueToPosition(stats.whiskerUpper)}
          x2={x + boxWidth / 4}
          y2={valueToPosition(stats.whiskerUpper)}
          stroke={color}
          strokeWidth={isHovered ? 2 : 1}
        />
        <line
          x1={x - boxWidth / 4}
          y1={valueToPosition(stats.whiskerLower)}
          x2={x + boxWidth / 4}
          y2={valueToPosition(stats.whiskerLower)}
          stroke={color}
          strokeWidth={isHovered ? 2 : 1}
        />

        {/* Box */}
        <rect
          x={x - boxWidth / 2}
          y={valueToPosition(d.q3)}
          width={boxWidth}
          height={Math.abs(valueToPosition(d.q3) - valueToPosition(d.q1))}
          fill={color}
          fillOpacity={isHovered ? 0.3 : 0.2}
          stroke={color}
          strokeWidth={isHovered ? 2 : 1}
          rx={2}
        />

        {/* Median line */}
        <line
          x1={x - boxWidth / 2}
          y1={valueToPosition(d.median)}
          x2={x + boxWidth / 2}
          y2={valueToPosition(d.median)}
          stroke={color}
          strokeWidth={isHovered ? 3 : 2}
        />

        {/* Mean point */}
        {showMean && d.mean && (
          <>
            <circle
              cx={x}
              cy={valueToPosition(d.mean)}
              r={isHovered ? 5 : 4}
              fill="white"
              stroke={color}
              strokeWidth={2}
              onClick={(e) => {
                e.stopPropagation()
                onDataPointClick?.(d, 'mean')
              }}
            />
            <text
              x={x + boxWidth / 2 + 5}
              y={valueToPosition(d.mean) + 3}
              className="text-xs fill-muted-foreground"
              style={{ display: isHovered ? 'block' : 'none' }}
            >
              평균
            </text>
          </>
        )}

        {/* Outliers */}
        {showOutliers && d.outliers?.map((outlier, i) => (
          <circle
            key={i}
            cx={x}
            cy={valueToPosition(outlier)}
            r={isHovered ? 4 : 3}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            opacity={isHovered ? 1 : 0.6}
            onClick={(e) => {
              e.stopPropagation()
              onDataPointClick?.(d, `outlier-${i}`)
            }}
          />
        ))}

        {/* Label */}
        <text
          x={x}
          y={height - 70}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
          fontWeight={isHovered || isSelected ? 600 : 400}
        >
          {d.name}
        </text>

        {/* N count if available */}
        {d.outliers && (
          <text
            x={x}
            y={height - 55}
            textAnchor="middle"
            className="text-xs fill-muted-foreground"
          >
            n={d.outliers.length + 5}
          </text>
        )}
      </g>
    )
  }

  const renderAxis = () => {
    const ticks = 5
    const tickValues = Array.from({ length: ticks }, (_, i) =>
      minValue + (range / (ticks - 1)) * i
    )

    return (
      <>
        {/* Y-axis */}
        <line
          x1={40}
          y1={0}
          x2={40}
          y2={height - 100}
          stroke="currentColor"
          strokeWidth={1}
          className="text-muted-foreground/30"
        />

        {/* Y-axis ticks and labels */}
        {tickValues.map((value, i) => (
          <g key={i}>
            <line
              x1={35}
              y1={valueToPosition(value)}
              x2={40}
              y2={valueToPosition(value)}
              stroke="currentColor"
              strokeWidth={1}
              className="text-muted-foreground/50"
            />
            <text
              x={30}
              y={valueToPosition(value) + 4}
              textAnchor="end"
              className="text-xs fill-muted-foreground"
            >
              {value.toFixed(1)}{unit}
            </text>
          </g>
        ))}

        {/* Grid lines */}
        {tickValues.map((value, i) => (
          <line
            key={`grid-${i}`}
            x1={40}
            y1={valueToPosition(value)}
            x2={640}
            y2={valueToPosition(value)}
            stroke="currentColor"
            strokeWidth={0.5}
            strokeDasharray="2,4"
            className="text-muted-foreground/10"
          />
        ))}
      </>
    )
  }

  const renderTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
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
                    {d.mean ? `${d.mean.toFixed(2)}${unit}` : '-'}
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
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {viewMode === 'chart' ? (
            <>
              {/* SVG Plot */}
              <div className="relative">
                <svg
                  width="100%"
                  height={height}
                  viewBox={`0 0 680 ${height}`}
                  className="overflow-visible"
                  role="img"
                  aria-label={`${title || 'BoxPlot'} 차트`}
                >
                  {renderAxis()}
                  {data.map((d, i) => renderBox(d, i))}
                </svg>
              </div>

              {/* Statistics Panel */}
              {showStatistics && selectedBox !== null && (
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
                    {data[selectedBox].mean && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">평균</div>
                        <div className="font-medium text-blue-600">{data[selectedBox].mean.toFixed(2)}{unit}</div>
                      </div>
                    )}
                    {data[selectedBox].std && (
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
                    {data[selectedBox].mean && data[selectedBox].median && (
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
            <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
              <p className="font-medium">박스플롯 해석 가이드</p>
              <p>• 박스: 데이터의 50%가 포함된 범위 (Q1~Q3, IQR)</p>
              <p>• 중앙선: 데이터를 반으로 나누는 중앙값</p>
              <p>• 수염: 이상치를 제외한 데이터의 범위</p>
              {showMean && <p>• 흰색 점: 데이터의 평균값</p>}
              {showOutliers && <p>• 빈 원: 극단적인 값 (이상치)</p>}
              <p className="pt-1 font-medium">💡 박스가 작을수록 데이터가 밀집되어 있고, 클수록 분산되어 있습니다.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export default BoxPlot