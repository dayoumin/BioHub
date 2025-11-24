"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface HistogramProps {
  data: number[]
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  bins?: number
  color?: string
}

interface HistogramData {
  bin: string
  count: number
  range: string
}

export function Histogram({ 
  data, 
  title = "분포 히스토그램", 
  xAxisLabel = "값",
  yAxisLabel = "빈도",
  bins = 10,
  color = "#8884d8"
}: HistogramProps) {
  
  const histogramData = useMemo(() => {
    if (data.length === 0) return []

    const min = Math.min(...data)
    const max = Math.max(...data)
    const binWidth = (max - min) / bins

    // Create bins
    const binCounts = new Array(bins).fill(0)
    const binRanges: string[] = []

    // Calculate bin ranges
    for (let i = 0; i < bins; i++) {
      const start = min + i * binWidth
      const end = min + (i + 1) * binWidth
      binRanges.push(`${start.toFixed(1)}-${end.toFixed(1)}`)
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
      range: binRanges[index]
    }))
  }, [data, bins])

  const maxCount = histogramData.length > 0 ? Math.max(...histogramData.map(d => d.count)) : 0

  // 빈 데이터 처리
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">표시할 데이터가 없습니다.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          데이터 분포 (n = {data.length}, bins = {bins})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
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
                formatter={(value: number, name: string) => [value, '빈도']}
                labelFormatter={(label: string) => {
                  const data = histogramData.find(d => d.bin === label)
                  return data ? `구간 ${label}: ${data.range}` : `구간 ${label}`
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
        
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium">평균: </span>
            {(data.reduce((sum, val) => sum + val, 0) / data.length).toFixed(3)}
          </div>
          <div>
            <span className="font-medium">중앙값: </span>
            {data.sort((a, b) => a - b)[Math.floor(data.length / 2)].toFixed(3)}
          </div>
          <div>
            <span className="font-medium">표준편차: </span>
            {(() => {
              const mean = data.reduce((sum, val) => sum + val, 0) / data.length
              const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
              return Math.sqrt(variance).toFixed(3)
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}