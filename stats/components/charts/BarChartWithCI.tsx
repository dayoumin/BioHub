'use client'

import React, { useMemo, useState, useCallback, memo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

/**
 * BarChartWithCI 컴포넌트
 *
 * 신뢰구간(Confidence Interval)이 포함된 막대차트를 표시하는 컴포넌트
 * 평균값과 오차 범위를 함께 시각화하여 통계적 불확실성을 표현
 *
 * @component
 * @example
 * ```tsx
 * <BarChartWithCI
 *   data={[
 *     { name: '그룹A', value: 25, ci: [20, 30], se: 2.5 }
 *   ]}
 *   title="그룹별 평균 비교"
 *   showCI={true}
 *   ciLevel={95}
 *   baseline={20}
 * />
 * ```
 */
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
  const [selectedBar, setSelectedBar] = useState<number | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')

  // 데이터 범위 계산 (early return 전에 훅 호출)
  const { minValue, maxValue, range } = useMemo(() => {
    // 빈 데이터 처리
    if (data.length === 0) {
      return { minValue: 0, maxValue: 1, range: 1 }
    }

    let min = Math.min(baseline, 0)
    let max = 0

    data.forEach(d => {
      min = Math.min(min, d.value)
      max = Math.max(max, d.value)
      if (d.ci) {
        min = Math.min(min, d.ci[0])
        max = Math.max(max, d.ci[1])
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
  }, [data, baseline])

  // 값을 픽셀 위치로 변환
  const valueToPosition = (value: number) => {
    const plotHeight = height - 120
    return plotHeight - ((value - minValue) / range) * plotHeight
  }

  // 막대 너비 및 간격 계산
  const barWidth = Math.min(60, 500 / data.length)
  const barSpacing = 600 / data.length

  // 색상 생성 함수
  const getBarColor = (index: number, value: number, customColor?: string) => {
    if (customColor) return customColor

    // 기준선과 비교하여 색상 결정
    if (showBaseline && baseline !== undefined) {
      if (value > baseline) return '#10B981' // emerald-500
      if (value < baseline) return '#EF4444' // red-500
      return '#6B7280' // gray-500
    }

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

  // CI 너비 계산
  const calculateCIWidth = (d: BarChartData) => {
    if (!d.ci) return null
    return d.ci[1] - d.ci[0]
  }

  // 효과크기 계산 (간단한 예시)
  const calculateEffectSize = (value: number) => {
    if (!baseline) return null
    const diff = Math.abs(value - baseline)
    if (diff < 0.2) return '작음'
    if (diff < 0.5) return '중간'
    if (diff < 0.8) return '큼'
    return '매우 큼'
  }

  // CSV 다운로드 함수 (메모이제이션)
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
    } catch (error) {
      console.error('CSV 다운로드 실패:', error)
      // 사용자에게 오류 알림
    }
  }, [data])

  // 로딩 상태 처리 (훅 이후)
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

  const renderBar = (d: BarChartData, index: number) => {
    const color = getBarColor(index, d.value, d.color)
    const isHovered = hoveredBar === index
    const isSelected = selectedBar === index
    const x = index * barSpacing + barSpacing / 2

    return (
      <g
        key={d.name}
        role="button"
        tabIndex={interactive ? 0 : -1}
        aria-label={`${d.name || d.label} 막대: 값 ${d.value.toFixed(2)}${unit}`}
        onMouseEnter={() => interactive && setHoveredBar(index)}
        onMouseLeave={() => interactive && setHoveredBar(null)}
        onClick={() => {
          if (interactive) {
            setSelectedBar(index === selectedBar ? null : index)
            onBarClick?.(d, index)
          }
        }}
        onKeyDown={(e) => {
          if (interactive && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            setSelectedBar(index === selectedBar ? null : index)
            onBarClick?.(d, index)
          }
        }}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
        className="transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary rounded"
      >
        {/* 막대 */}
        <rect
          x={x - barWidth / 2}
          y={Math.min(valueToPosition(d.value), valueToPosition(baseline))}
          width={barWidth}
          height={Math.abs(valueToPosition(d.value) - valueToPosition(baseline))}
          fill={color}
          fillOpacity={isHovered ? 0.8 : 0.6}
          stroke={color}
          strokeWidth={isSelected ? 2 : 0}
          rx={2}
        />

        {/* 신뢰구간 */}
        {showCI && d.ci && (
          <>
            {/* CI 선 */}
            <line
              x1={x}
              y1={valueToPosition(d.ci[0])}
              x2={x}
              y2={valueToPosition(d.ci[1])}
              stroke={color}
              strokeWidth={isHovered ? 3 : 2}
              opacity={0.8}
            />

            {/* CI 캡 (위) */}
            <line
              x1={x - barWidth / 4}
              y1={valueToPosition(d.ci[1])}
              x2={x + barWidth / 4}
              y2={valueToPosition(d.ci[1])}
              stroke={color}
              strokeWidth={isHovered ? 2 : 1.5}
            />

            {/* CI 캡 (아래) */}
            <line
              x1={x - barWidth / 4}
              y1={valueToPosition(d.ci[0])}
              x2={x + barWidth / 4}
              y2={valueToPosition(d.ci[0])}
              stroke={color}
              strokeWidth={isHovered ? 2 : 1.5}
            />
          </>
        )}

        {/* 값 표시 */}
        {showValues && (
          <text
            x={x}
            y={valueToPosition(d.value) - 5}
            textAnchor="middle"
            className="text-xs font-medium fill-foreground"
            style={{ display: isHovered || isSelected ? 'block' : 'none' }}
          >
            {d.value.toFixed(2)}{unit}
          </text>
        )}

        {/* 레이블 */}
        <text
          x={x}
          y={height - 90}
          textAnchor="middle"
          className="text-xs fill-muted-foreground"
          fontWeight={isHovered || isSelected ? 600 : 400}
        >
          {d.label || d.name}
        </text>

        {/* CI 범위 표시 (호버 시) */}
        {isHovered && d.ci && (
          <text
            x={x}
            y={height - 75}
            textAnchor="middle"
            className="text-xs fill-muted-foreground"
          >
            [{d.ci[0].toFixed(1)}, {d.ci[1].toFixed(1)}]
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
        {/* Y축 */}
        <line
          x1={40}
          y1={0}
          x2={40}
          y2={height - 120}
          stroke="currentColor"
          strokeWidth={1}
          className="text-muted-foreground/30"
        />

        {/* Y축 눈금 및 레이블 */}
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

        {/* 격자선 */}
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

        {/* 기준선 */}
        {showBaseline && (
          <>
            <line
              x1={40}
              y1={valueToPosition(baseline)}
              x2={640}
              y2={valueToPosition(baseline)}
              stroke="currentColor"
              strokeWidth={2}
              className="text-muted-foreground/50"
            />
            <text
              x={645}
              y={valueToPosition(baseline) + 4}
              className="text-xs fill-muted-foreground font-medium"
            >
              기준선
            </text>
          </>
        )}
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
              const color = getBarColor(i, d.value, d.color)
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
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: color }}
                      />
                      {d.label || d.name}
                    </div>
                  </td>
                  <td className="text-right py-2 px-3 font-medium">
                    {d.value.toFixed(3)}{unit}
                  </td>
                  {showCI && (
                    <>
                      <td className="text-right py-2 px-3">
                        {d.ci ? `${d.ci[0].toFixed(3)}${unit}` : '-'}
                      </td>
                      <td className="text-right py-2 px-3">
                        {d.ci ? `${d.ci[1].toFixed(3)}${unit}` : '-'}
                      </td>
                      <td className="text-right py-2 px-3">
                        {d.ci ? `${(d.ci[1] - d.ci[0]).toFixed(3)}${unit}` : '-'}
                      </td>
                    </>
                  )}
                  {data.some(d => d.se) && (
                    <td className="text-right py-2 px-3">
                      {d.se ? `±${d.se.toFixed(3)}${unit}` : '-'}
                    </td>
                  )}
                  {showBaseline && (
                    <td className="text-right py-2 px-3">
                      <div className="flex items-center justify-end gap-1">
                        {diff > 0 ? (
                          <TrendingUp className="h-3 w-3 text-success" />
                        ) : diff < 0 ? (
                          <TrendingDown className="h-3 w-3 text-error" />
                        ) : null}
                        <span className={cn(
                          diff > 0 && "text-success",
                          diff < 0 && "text-error"
                        )}>
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
              {/* 신뢰수준 표시 */}
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

              {/* SVG 차트 */}
              <div className="relative">
                <svg
                  width="100%"
                  height={height}
                  viewBox={`0 0 680 ${height}`}
                  className="overflow-visible"
                  role="img"
                  aria-label={`${title || 'BarChart'} 차트`}
                >
                  {renderAxis()}
                  {data.map((d, i) => renderBar(d, i))}
                </svg>
              </div>

              {/* 선택된 막대 상세 정보 */}
              {selectedBar !== null && (
                <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3 animate-in slide-in-from-bottom-2 duration-200">
                  <h4 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    {data[selectedBar].label || data[selectedBar].name} 상세 정보
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-muted-foreground">값</div>
                      <div className="font-medium text-lg">
                        {data[selectedBar].value.toFixed(3)}{unit}
                      </div>
                    </div>

                    {data[selectedBar].ci && (
                      <>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{ciLevel}% 신뢰구간</div>
                          <div className="font-medium">
                            [{data[selectedBar].ci![0].toFixed(3)}, {data[selectedBar].ci![1].toFixed(3)}]{unit}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">CI 너비</div>
                          <div className="font-medium">
                            {(data[selectedBar].ci![1] - data[selectedBar].ci![0]).toFixed(3)}{unit}
                          </div>
                        </div>
                      </>
                    )}

                    {data[selectedBar].se && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground">표준오차</div>
                        <div className="font-medium">
                          ±{data[selectedBar].se!.toFixed(3)}{unit}
                        </div>
                      </div>
                    )}

                    {showBaseline && (
                      <>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">기준선 대비</div>
                          <div className="font-medium flex items-center gap-1">
                            {data[selectedBar].value > baseline ? (
                              <TrendingUp className="h-4 w-4 text-success" />
                            ) : data[selectedBar].value < baseline ? (
                              <TrendingDown className="h-4 w-4 text-error" />
                            ) : null}
                            <span className={cn(
                              data[selectedBar].value > baseline && "text-success",
                              data[selectedBar].value < baseline && "text-error"
                            )}>
                              {data[selectedBar].value > baseline ? '+' : ''}
                              {(data[selectedBar].value - baseline).toFixed(3)}{unit}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">효과크기</div>
                          <div className="font-medium">
                            {calculateEffectSize(data[selectedBar].value) || '-'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* CI 해석 */}
                  {data[selectedBar].ci && (
                    <div className="mt-3 pt-3 border-t text-sm space-y-1">
                      <p className="text-muted-foreground">
                        💡 {ciLevel}% 확률로 실제 값이 {data[selectedBar].ci![0].toFixed(2)}
                        {unit}와 {data[selectedBar].ci![1].toFixed(2)}{unit} 사이에 있습니다.
                      </p>
                      {showBaseline && baseline !== undefined && (
                        <p className="text-muted-foreground">
                          {data[selectedBar].ci![0] > baseline
                            ? `✅ 신뢰구간 전체가 기준선(${baseline})보다 높으므로 통계적으로 유의한 증가입니다.`
                            : data[selectedBar].ci![1] < baseline
                            ? `📉 신뢰구간 전체가 기준선(${baseline})보다 낮으므로 통계적으로 유의한 감소입니다.`
                            : `⚠️ 신뢰구간이 기준선(${baseline})을 포함하므로 통계적으로 유의하지 않습니다.`}
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