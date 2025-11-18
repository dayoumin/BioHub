"use client"

import { useMemo } from "react"
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ScatterplotProps {
  data: Array<{ x: number; y: number }>
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  showTrendLine?: boolean
  color?: string
  correlationCoefficient?: number
  pValue?: number
}

interface ScatterData {
  x: number
  y: number
}

interface TrendLineData {
  slope: number
  intercept: number
  r2: number
}

function calculateTrendLine(data: ScatterData[]): TrendLineData {
  const n = data.length
  if (n < 2) return { slope: 0, intercept: 0, r2: 0 }
  
  const sumX = data.reduce((sum, point) => sum + point.x, 0)
  const sumY = data.reduce((sum, point) => sum + point.y, 0)
  const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0)
  const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0)
  const sumYY = data.reduce((sum, point) => sum + point.y * point.y, 0)
  
  const meanX = sumX / n
  const meanY = sumY / n
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = meanY - slope * meanX
  
  // Calculate R-squared
  const totalSumSquares = sumYY - n * meanY * meanY
  const residualSumSquares = data.reduce((sum, point) => {
    const predicted = slope * point.x + intercept
    return sum + Math.pow(point.y - predicted, 2)
  }, 0)
  
  const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0
  
  return { slope, intercept, r2 }
}

export function Scatterplot({ 
  data, 
  title = "산점도", 
  xAxisLabel = "X 변수",
  yAxisLabel = "Y 변수",
  showTrendLine = true,
  color = "#8884d8",
  correlationCoefficient,
  pValue
}: ScatterplotProps) {
  
  const { chartData, trendLine, xRange, yRange } = useMemo(() => {
    if (data.length === 0) {
      return { chartData: [], trendLine: null, xRange: [0, 1], yRange: [0, 1] }
    }
    
    const chartData = data.map((point, index) => ({
      ...point,
      index: index + 1
    }))
    
    const trendLine = showTrendLine ? calculateTrendLine(data) : null
    
    const xValues = data.map(p => p.x)
    const yValues = data.map(p => p.y)
    const xRange = [Math.min(...xValues), Math.max(...xValues)]
    const yRange = [Math.min(...yValues), Math.max(...yValues)]
    
    return { chartData, trendLine, xRange, yRange }
  }, [data, showTrendLine])
  
  const trendLinePoints = useMemo((): [{ x: number; y: number }, { x: number; y: number }] | null => {
    if (!trendLine || data.length === 0) return null

    const { slope, intercept } = trendLine
    return [
      { x: xRange[0], y: slope * xRange[0] + intercept },
      { x: xRange[1], y: slope * xRange[1] + intercept }
    ]
  }, [trendLine, xRange, data.length])
  
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>데이터가 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            두 개의 숫자 변수를 선택해주세요
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {title}
          <div className="flex items-center gap-2">
            {correlationCoefficient !== undefined && (
              <Badge variant={Math.abs(correlationCoefficient) > 0.7 ? "default" : "secondary"}>
                r = {correlationCoefficient.toFixed(4)}
              </Badge>
            )}
            {pValue !== undefined && (
              <Badge variant={pValue < 0.05 ? "default" : "secondary"}>
                p = {pValue.toFixed(6)}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          두 변수 간 관계 (n = {data.length})
          {trendLine && ` • R² = ${trendLine.r2.toFixed(4)}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="x" 
                type="number"
                domain={['dataMin - 5%', 'dataMax + 5%']}
                label={{ value: xAxisLabel, position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                dataKey="y"
                type="number"
                domain={['dataMin - 5%', 'dataMax + 5%']}
                label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  value.toFixed(4), 
                  name === 'x' ? xAxisLabel : yAxisLabel
                ]}
                labelFormatter={(label: any, payload: any) => {
                  if (payload && payload[0]) {
                    return `점 #${payload[0].payload.index}`
                  }
                  return ''
                }}
              />
              <Scatter 
                dataKey="y" 
                fill={color}
                strokeWidth={2}
                stroke={color}
              />

              {/* Trend line */}
              {showTrendLine && trendLine && trendLinePoints && (
                <ReferenceLine
                  segment={trendLinePoints}
                  stroke="#ff7300"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              )}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium mb-2">데이터 요약</h4>
            <div className="text-sm space-y-1">
              <div>
                <span className="text-muted-foreground">{xAxisLabel}: </span>
                <span>평균 {(data.reduce((sum, p) => sum + p.x, 0) / data.length).toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{yAxisLabel}: </span>
                <span>평균 {(data.reduce((sum, p) => sum + p.y, 0) / data.length).toFixed(3)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">데이터 포인트: </span>
                <span>{data.length}개</span>
              </div>
            </div>
          </div>
          
          {trendLine && (
            <div>
              <h4 className="font-medium mb-2">추세선 정보</h4>
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">기울기: </span>
                  <span>{trendLine.slope.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">절편: </span>
                  <span>{trendLine.intercept.toFixed(6)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">결정계수(R²): </span>
                  <span>{trendLine.r2.toFixed(6)}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  y = {trendLine.slope.toFixed(3)}x {trendLine.intercept >= 0 ? '+' : ''} {trendLine.intercept.toFixed(3)}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {correlationCoefficient !== undefined && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="text-sm">
              <span className="font-medium">상관관계 해석: </span>
              {Math.abs(correlationCoefficient) > 0.9 ? "매우 강한" :
               Math.abs(correlationCoefficient) > 0.7 ? "강한" :
               Math.abs(correlationCoefficient) > 0.5 ? "중간" :
               Math.abs(correlationCoefficient) > 0.3 ? "약한" : "매우 약한"}
              {" "}
              {correlationCoefficient > 0 ? "양의" : "음의"} 상관관계
              {pValue !== undefined && (
                <span className="ml-2">
                  ({pValue < 0.001 ? "p < 0.001" : `p = ${pValue.toFixed(3)}`})
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}