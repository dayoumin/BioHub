"use client"

import { useMemo, useState, useCallback, memo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChartBar, Table as TableIcon, Maximize2, Minimize2, Download, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface HistogramProps {
  data: number[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  bins?: number
  color?: string
  height?: number
  interactive?: boolean
  className?: string
  /** Whether to wrap content in a Card component (default: true) */
  showCard?: boolean
}

interface HistogramData {
  bin: string
  count: number
  range: string
  binStart: number
  binEnd: number
}

export const Histogram = memo(function Histogram({
  data,
  title = "분포 히스토그램",
  xAxisLabel = "값",
  yAxisLabel = "빈도",
  bins = 10,
  color = "#8884d8",
  height = 256,
  interactive = true,
  className,
  showCard = true
}: HistogramProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Calculate statistics
  const statistics = useMemo(() => {
    if (data.length === 0) return null

    const sortedData = [...data].sort((a, b) => a - b)
    const n = data.length
    const sum = data.reduce((acc, val) => acc + val, 0)
    const mean = sum / n
    const median = n % 2 === 0
      ? (sortedData[n / 2 - 1] + sortedData[n / 2]) / 2
      : sortedData[Math.floor(n / 2)]
    const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n
    const std = Math.sqrt(variance)
    const min = sortedData[0]
    const max = sortedData[n - 1]
    const q1Index = Math.floor(n * 0.25)
    const q3Index = Math.floor(n * 0.75)
    const q1 = sortedData[q1Index]
    const q3 = sortedData[q3Index]

    return { n, mean, median, std, min, max, q1, q3 }
  }, [data])

  const histogramData = useMemo((): HistogramData[] => {
    if (data.length === 0) return []

    const min = Math.min(...data)
    const max = Math.max(...data)

    // Handle constant data (all values identical): single bin with all counts
    if (min === max) {
      return [{
        bin: '1',
        count: data.length,
        range: `${min.toFixed(1)}-${max.toFixed(1)}`,
        binStart: min,
        binEnd: max
      }]
    }

    const binWidth = (max - min) / bins

    // Create bins
    const binCounts = new Array(bins).fill(0)
    const binRanges: Array<{ start: number; end: number }> = []

    // Calculate bin ranges
    for (let i = 0; i < bins; i++) {
      const start = min + i * binWidth
      const end = min + (i + 1) * binWidth
      binRanges.push({ start, end })
    }

    // Count data points in each bin
    data.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), bins - 1)
      binCounts[binIndex]++
    })

    // Create chart data
    return binCounts.map((count, index) => ({
      bin: `${index + 1}`,
      count,
      range: `${binRanges[index].start.toFixed(1)}-${binRanges[index].end.toFixed(1)}`,
      binStart: binRanges[index].start,
      binEnd: binRanges[index].end
    }))
  }, [data, bins])

  const maxCount = histogramData.length > 0 ? Math.max(...histogramData.map(d => d.count)) : 0

  // CSV download function
  const downloadCSV = useCallback(() => {
    try {
      const headers = ['Bin', 'Range Start', 'Range End', 'Count', 'Frequency (%)']
      const totalCount = histogramData.reduce((sum, d) => sum + d.count, 0)
      const rows = histogramData.map(d => [
        d.bin,
        d.binStart.toFixed(4),
        d.binEnd.toFixed(4),
        d.count.toString(),
        ((d.count / totalCount) * 100).toFixed(2)
      ].join(','))

      // Add statistics summary
      if (statistics) {
        rows.push('')
        rows.push('Statistics Summary')
        rows.push(`N,${statistics.n}`)
        rows.push(`Mean,${statistics.mean.toFixed(4)}`)
        rows.push(`Median,${statistics.median.toFixed(4)}`)
        rows.push(`Std Dev,${statistics.std.toFixed(4)}`)
        rows.push(`Min,${statistics.min.toFixed(4)}`)
        rows.push(`Max,${statistics.max.toFixed(4)}`)
      }

      const csv = [headers.join(','), ...rows].join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `histogram_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('CSV download failed:', error)
    }
  }, [histogramData, statistics])

  // Render table view
  const renderTable = () => {
    const totalCount = histogramData.reduce((sum, d) => sum + d.count, 0)

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">구간</th>
              <th className="text-left py-2 px-3">범위</th>
              <th className="text-right py-2 px-3">빈도</th>
              <th className="text-right py-2 px-3">비율 (%)</th>
            </tr>
          </thead>
          <tbody>
            {histogramData.map((d) => (
              <tr key={d.bin} className="border-b hover:bg-muted/50">
                <td className="py-2 px-3">{d.bin}</td>
                <td className="py-2 px-3">{d.range}</td>
                <td className="text-right py-2 px-3 font-medium">{d.count}</td>
                <td className="text-right py-2 px-3">
                  {((d.count / totalCount) * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-medium">
              <td className="py-2 px-3" colSpan={2}>합계</td>
              <td className="text-right py-2 px-3">{totalCount}</td>
              <td className="text-right py-2 px-3">100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    )
  }

  // Empty data handling
  if (data.length === 0) {
    if (!showCard) {
      return <p className="text-sm text-muted-foreground">표시할 데이터가 없습니다.</p>
    }
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">표시할 데이터가 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  // Header controls
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
          <UITooltip>
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
          </UITooltip>
        </TooltipProvider>
      )}

      <TooltipProvider>
        <UITooltip>
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
        </UITooltip>
      </TooltipProvider>
    </div>
  )

  // Main content
  const mainContent = (
    <div className="space-y-4">
      {viewMode === 'chart' ? (
        <>
          <div style={{ height: isFullscreen ? 'calc(100vh - 350px)' : height }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={histogramData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="bin"
                  label={{ value: xAxisLabel, position: 'insideBottom', offset: -10 }}
                />
                <YAxis
                  label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
                  domain={[0, maxCount + 1]}
                />
                <Tooltip
                  formatter={(value?: number) => [value ?? 0, '빈도']}
                  labelFormatter={(label) => {
                    const item = histogramData.find(d => d.bin === label)
                    return item ? `구간 ${label}: ${item.range}` : `구간 ${label}`
                  }}
                />
                <Bar
                  dataKey="count"
                  fill={color}
                  stroke={color}
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Statistics summary */}
          {statistics && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">평균: </span>
                {statistics.mean.toFixed(3)}
              </div>
              <div>
                <span className="font-medium">중앙값: </span>
                {statistics.median.toFixed(3)}
              </div>
              <div>
                <span className="font-medium">표준편차: </span>
                {statistics.std.toFixed(3)}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {renderTable()}

          {/* Statistics in table mode */}
          {statistics && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">기술통계량</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">N: </span>
                  <span className="font-medium">{statistics.n}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">평균: </span>
                  <span className="font-medium">{statistics.mean.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">중앙값: </span>
                  <span className="font-medium">{statistics.median.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">표준편차: </span>
                  <span className="font-medium">{statistics.std.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">최소값: </span>
                  <span className="font-medium">{statistics.min.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">최대값: </span>
                  <span className="font-medium">{statistics.max.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Q1: </span>
                  <span className="font-medium">{statistics.q1.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Q3: </span>
                  <span className="font-medium">{statistics.q3.toFixed(3)}</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Info tooltip - same style as BoxPlot */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
        <Info className="h-4 w-4 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
          <p className="font-medium">히스토그램 해석 가이드</p>
          <p>• 각 막대는 해당 구간에 속하는 데이터의 빈도를 나타냅니다</p>
          <p>• 막대가 높을수록 해당 구간에 데이터가 많이 분포합니다</p>
          <p>• 분포의 모양으로 정규성을 시각적으로 판단할 수 있습니다</p>
          <p className="pt-1 font-medium">💡 종 모양에 가까울수록 정규분포에 가깝습니다.</p>
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
            <p className="text-sm text-muted-foreground">
              데이터 분포 (n = {data.length}, bins = {bins})
            </p>
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
            <CardTitle>{title}</CardTitle>
            <CardDescription className="mt-1">
              데이터 분포 (n = {data.length}, bins = {bins})
            </CardDescription>
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

export default Histogram
