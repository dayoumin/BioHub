'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell
} from 'recharts'
import { Card } from '@/components/ui/card'
import { AnalysisResult } from '@/types/smart-flow'
import { useSmartFlowStore } from '@/lib/stores/smart-flow-store'

// 타입 안전성을 위한 확장 인터페이스
interface RegressionResult extends AnalysisResult {
  additional?: {
    intercept?: number
    rmse?: number
  }
}

interface ChartDataPoint {
  x: number
  y: number
  group?: string
}

interface GroupData {
  name: string
  mean: number
  std: number
  n: number
}

interface ResultsVisualizationProps {
  results: AnalysisResult
}

export function ResultsVisualization({ results }: ResultsVisualizationProps) {
  const { uploadedData, selectedMethod } = useSmartFlowStore()

  // 대용량 데이터 샘플링 함수
  const sampleLargeData = <T,>(data: T[], maxSize: number = 1000): T[] => {
    if (data.length <= maxSize) return data
    const step = Math.ceil(data.length / maxSize)
    return data.filter((_, index) => index % step === 0)
  }

  const chartData = useMemo(() => {
    if (!uploadedData || uploadedData.length === 0) {
      // 샘플 데이터 사용
      return {
        groupData: [
          { name: 'Group A', mean: 25, std: 2.3, n: 10 },
          { name: 'Group B', mean: 32.5, std: 2.1, n: 10 }
        ],
        scatterData: Array.from({ length: 20 }, (_, i) => ({
          x: Math.random() * 10 + 20,
          y: Math.random() * 15 + 25,
          group: i < 10 ? 'A' : 'B'
        })),
        distributionData: Array.from({ length: 50 }, (_, i) => {
          const x = i / 5 - 5
          return {
            x,
            normal1: Math.exp(-Math.pow(x + 1, 2) / 2) / Math.sqrt(2 * Math.PI),
            normal2: Math.exp(-Math.pow(x - 1, 2) / 2) / Math.sqrt(2 * Math.PI)
          }
        })
      }
    }

    // 실제 데이터 처리 (샘플링 적용)
    const sampledData = sampleLargeData(uploadedData, 1000)
    const columns = Object.keys(sampledData[0])
    const numericColumns = columns.filter(col => {
      const values = sampledData.slice(0, 100).map(row => row[col]) // 최대 100개만 검사
      return values.every(v => v != null && !isNaN(Number(v)))
    })

    if (numericColumns.length >= 2) {
      // 두 개의 숫자 컬럼이 있는 경우 산점도용 데이터
      const scatterData: ChartDataPoint[] = sampledData.map(row => ({
        x: Number(row[numericColumns[0]]),
        y: Number(row[numericColumns[1]])
      }))

      return { scatterData, groupData: [], distributionData: [] }
    } else if (numericColumns.length === 1) {
      // 하나의 숫자 컬럼과 그룹 컬럼
      const numericCol = numericColumns[0]
      const categoricalCol = columns.find(col => col !== numericCol)
      
      if (categoricalCol) {
        const groups = [...new Set(sampledData.map(row => row[categoricalCol]))]
        const groupData: GroupData[] = groups.slice(0, 10).map(group => { // 최대 10개 그룹
          const values = sampledData
            .filter(row => row[categoricalCol] === group)
            .map(row => Number(row[numericCol]))
            .filter(v => !isNaN(v)) // NaN 필터링

          if (values.length === 0) {
            return { name: String(group), mean: 0, std: 0, n: 0 }
          }
          
          const mean = values.reduce((a, b) => a + b, 0) / values.length
          const std = Math.sqrt(
            values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
          )
          
          return {
            name: String(group),
            mean,
            std,
            n: values.length
          }
        })

        return { groupData, scatterData: [], distributionData: [] }
      }
    }

    return { groupData: [], scatterData: [], distributionData: [] }
  }, [uploadedData])

  // t-검정이나 ANOVA의 경우 막대 그래프
  if (results.method?.includes('검정') || results.method?.includes('ANOVA')) {
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50/30 to-success-bg/30 dark:from-blue-950/20 dark:to-success-bg/20">
        <h4 className="text-lg font-semibold mb-4">📊 그룹 간 평균 비교</h4>
        
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.groupData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              formatter={(value: number) => value.toFixed(2)}
              labelStyle={{ color: '#000' }}
              contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb' }}
            />
            <Legend />
            <Bar
              dataKey="mean"
              fill="#3b82f6"
              name="평균"
              label={{ position: 'top' }}
              radius={[8, 8, 0, 0]}
            >
              {chartData.groupData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#10b981'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {chartData.groupData.map((group, index) => (
            <div key={index} className="bg-muted/50 rounded p-3">
              <p className="font-medium">{group.name}</p>
              <p>평균: {group.mean.toFixed(2)} ± {group.std.toFixed(2)}</p>
              <p>표본 크기: {group.n}</p>
            </div>
          ))}
        </div>

        {results.pValue < 0.05 && (
          <div className="mt-4 p-3 bg-success-bg dark:bg-success-bg rounded">
            <p className="text-sm">
              ✅ 통계적으로 유의한 차이가 있습니다 (p = {results.pValue.toFixed(4)})
            </p>
          </div>
        )}
      </Card>
    )
  }

  // 상관분석의 경우 산점도
  if (results.method?.includes('상관')) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/20">
        <h4 className="text-lg font-semibold mb-4">📊 상관관계 분석</h4>
        
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="X" />
            <YAxis dataKey="y" name="Y" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter 
              name="데이터" 
              data={chartData.scatterData} 
              fill="#3b82f6"
            />
            {/* 추세선 추가 가능 */}
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="bg-muted/50 rounded p-3">
            <p className="text-sm text-muted-foreground">상관계수</p>
            <p className="text-lg font-bold">{results.statistic.toFixed(3)}</p>
          </div>
          <div className="bg-muted/50 rounded p-3">
            <p className="text-sm text-muted-foreground">결정계수</p>
            <p className="text-lg font-bold">
              {results.effectSize ? results.effectSize.toFixed(3) : 'N/A'}
            </p>
          </div>
          <div className="bg-muted/50 rounded p-3">
            <p className="text-sm text-muted-foreground">p-value</p>
            <p className={`text-lg font-bold ${
              results.pValue < 0.05 ? 'text-success' : 'text-muted-foreground'
            }`}>
              {results.pValue.toFixed(4)}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // 회귀분석의 경우 산점도와 회귀선
  if (results.method?.includes('회귀')) {
    const regressionResult = results as RegressionResult
    const slope = regressionResult.statistic
    const intercept = regressionResult.additional?.intercept || 0
    
    // 회귀선을 위한 데이터 생성
    const lineData = chartData.scatterData.length > 0 
      ? [
          { x: Math.min(...chartData.scatterData.map(d => d.x)), y: 0 },
          { x: Math.max(...chartData.scatterData.map(d => d.x)), y: 0 }
        ].map(point => ({
          ...point,
          y: slope * point.x + intercept
        }))
      : []

    return (
      <Card className="p-6 bg-gradient-to-br from-orange-50/30 to-red-50/30 dark:from-orange-950/20 dark:to-red-950/20">
        <h4 className="text-lg font-semibold mb-4">📊 회귀분석 결과</h4>
        
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="독립변수" />
            <YAxis dataKey="y" name="종속변수" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter 
              name="데이터" 
              data={chartData.scatterData} 
              fill="#3b82f6"
            />
            {lineData.length > 0 && (
              <Line 
                data={lineData}
                type="monotone"
                dataKey="y"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="회귀선"
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-3">
          <div className="bg-muted/50 rounded p-3">
            <p className="text-sm font-medium">회귀방정식</p>
            <p className="font-mono mt-1">
              Y = {slope.toFixed(3)}X {intercept >= 0 ? '+' : ''} {intercept.toFixed(3)}
            </p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded p-3">
              <p className="text-sm text-muted-foreground">R²</p>
              <p className="text-lg font-bold">
                {results.effectSize ? results.effectSize.toFixed(3) : 'N/A'}
              </p>
            </div>
            <div className="bg-muted/50 rounded p-3">
              <p className="text-sm text-muted-foreground">RMSE</p>
              <p className="text-lg font-bold">
                {regressionResult.additional?.rmse
                  ? regressionResult.additional.rmse.toFixed(3)
                  : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  // 기본 막대 그래프
  return (
    <Card className="p-6">
      <h4 className="text-lg font-semibold mb-4">📊 분석 결과 시각화</h4>
      <div className="text-center py-8 text-muted-foreground">
        <p>이 분석 유형에 대한 시각화를 준비 중입니다.</p>
      </div>
    </Card>
  )
}