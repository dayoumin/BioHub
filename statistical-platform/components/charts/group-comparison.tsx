"use client"

import { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ErrorBar } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface GroupComparisonProps {
  data: Array<{ group: string; value: number }>
  title?: string
  xAxisLabel?: string
  yAxisLabel?: string
  showErrorBars?: boolean
  colors?: string[]
  significantPairs?: Array<{ group1: string; group2: string; pValue: number }>
}

interface GroupSummary {
  group: string
  mean: number
  std: number
  sem: number
  n: number
  min: number
  max: number
  color: string
}

function calculateGroupStats(values: number[]): Omit<GroupSummary, 'group' | 'color'> {
  const n = values.length
  if (n === 0) {
    return { mean: 0, std: 0, sem: 0, n: 0, min: 0, max: 0 }
  }
  
  const mean = values.reduce((sum, val) => sum + val, 0) / n
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1)
  const std = Math.sqrt(variance)
  const sem = std / Math.sqrt(n) // Standard Error of Mean
  const min = Math.min(...values)
  const max = Math.max(...values)
  
  return { mean, std, sem, n, min, max }
}

export function GroupComparison({ 
  data, 
  title = "그룹별 평균 비교", 
  xAxisLabel = "그룹",
  yAxisLabel = "평균값",
  showErrorBars = true,
  colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1", "#d084d0", "#ffb347"],
  significantPairs = []
}: GroupComparisonProps) {
  
  const groupData = useMemo(() => {
    if (data.length === 0) return []
    
    // Group data by group name
    const grouped = data.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = []
      acc[item.group].push(item.value)
      return acc
    }, {} as Record<string, number[]>)
    
    // Calculate statistics for each group
    return Object.entries(grouped).map(([group, values], index) => {
      const stats = calculateGroupStats(values)
      return {
        group,
        ...stats,
        color: colors[index % colors.length]
      }
    })
  }, [data, colors])
  
  const maxMean = Math.max(...groupData.map(g => g.mean))
  const minMean = Math.min(...groupData.map(g => g.mean))
  const yDomain = [
    Math.min(0, minMean - Math.abs(minMean) * 0.1), 
    maxMean + Math.abs(maxMean) * 0.1
  ]
  
  if (groupData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>데이터가 없습니다</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            그룹별 데이터를 선택해주세요
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {groupData.length}개 그룹 비교 (총 n = {data.length})
          {significantPairs.length > 0 && ` • ${significantPairs.length}개 유의한 차이`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={groupData} 
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="group" 
                label={{ value: xAxisLabel, position: 'insideBottom', offset: -10 }}
              />
              <YAxis 
                domain={yDomain}
                label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (!active || !payload || !payload[0]) return null
                  
                  const data = payload[0].payload as GroupSummary
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <h4 className="font-medium">{data.group}</h4>
                      <div className="text-sm space-y-1">
                        <div>평균: {data.mean.toFixed(4)} ± {data.sem.toFixed(4)}</div>
                        <div>표준편차: {data.std.toFixed(4)}</div>
                        <div>표본 크기: {data.n}</div>
                        <div>범위: [{data.min.toFixed(2)}, {data.max.toFixed(2)}]</div>
                      </div>
                    </div>
                  )
                }}
              />
              <Bar dataKey="mean">
                {groupData.map((entry, index) => (
                  <Bar key={`bar-${index}`} fill={entry.color} />
                ))}
                {showErrorBars && (
                  <ErrorBar 
                    dataKey="sem" 
                    width={4}
                    stroke="#666"
                    strokeWidth={1}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4">
          <h4 className="font-medium mb-3">그룹별 상세 정보</h4>
          <div className="grid gap-3 max-h-40 overflow-y-auto">
            {groupData.map((group) => (
              <div key={group.group} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: group.color }}
                  />
                  <div>
                    <div className="font-medium">{group.group}</div>
                    <div className="text-sm text-muted-foreground">n = {group.n}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{group.mean.toFixed(3)}</div>
                  <div className="text-sm text-muted-foreground">
                    ± {group.sem.toFixed(3)} SEM
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {significantPairs.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium mb-3">유의한 그룹 간 차이</h4>
            <div className="grid gap-2 max-h-32 overflow-y-auto">
              {significantPairs.map((pair, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-success-bg border border-success-border rounded">
                  <span className="text-sm font-medium">
                    {pair.group1} vs {pair.group2}
                  </span>
                  <Badge variant={pair.pValue < 0.001 ? "default" : "secondary"}>
                    {pair.pValue < 0.001 ? "p < 0.001" : `p = ${pair.pValue.toFixed(3)}`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="text-sm">
            <div className="font-medium mb-1">해석 가이드:</div>
            <div>• 막대 높이는 각 그룹의 평균값을 나타냅니다</div>
            {showErrorBars && (
              <div>• 오차막대는 표준오차(SEM)를 나타냅니다</div>
            )}
            <div>• 유의한 차이가 있는 그룹 쌍은 별도로 표시됩니다</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}