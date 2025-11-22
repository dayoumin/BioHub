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
  Cell,
  ErrorBar
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

  // t-검정이나 ANOVA의 경우 막대 그래프 + Error Bar
  if (results.method?.includes('검정') || results.method?.includes('ANOVA')) {
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50/30 to-success-bg/30 dark:from-blue-950/20 dark:to-success-bg/20">
        <h4 className="text-lg font-semibold mb-4">📊 그룹 간 평균 비교 (평균 ± 표준편차)</h4>

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
              label={{ position: 'top', formatter: (value: number) => value.toFixed(2) }}
              radius={[8, 8, 0, 0]}
            >
              {chartData.groupData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#10b981'} />
              ))}
              <ErrorBar dataKey="std" width={4} strokeWidth={2} stroke="#374151" />
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
              {results.effectSize
                ? (typeof results.effectSize === 'number'
                    ? results.effectSize.toFixed(3)
                    : results.effectSize.value.toFixed(3))
                : 'N/A'}
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
                {results.effectSize
                  ? (typeof results.effectSize === 'number'
                      ? results.effectSize.toFixed(3)
                      : results.effectSize.value.toFixed(3))
                  : 'N/A'}
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

  // 비모수 검정 (Mann-Whitney, Wilcoxon, Kruskal-Wallis 등) - Error Bar 포함
  if (results.method?.includes('Mann-Whitney') ||
      results.method?.includes('Wilcoxon') ||
      results.method?.includes('Kruskal') ||
      results.method?.includes('비모수')) {
    return (
      <Card className="p-6 bg-gradient-to-br from-teal-50/30 to-cyan-50/30 dark:from-teal-950/20 dark:to-cyan-950/20">
        <h4 className="text-lg font-semibold mb-4">📊 비모수 검정 결과 (중위수/평균 ± 분산)</h4>

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
              fill="#14b8a6"
              name="중위수/평균"
              label={{ position: 'top', formatter: (value: number) => value.toFixed(2) }}
              radius={[8, 8, 0, 0]}
            >
              {chartData.groupData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#14b8a6' : '#06b6d4'} />
              ))}
              <ErrorBar dataKey="std" width={4} strokeWidth={2} stroke="#0f766e" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {chartData.groupData.map((group, index) => (
            <div key={index} className="bg-muted/50 rounded p-3">
              <p className="font-medium">{group.name}</p>
              <p>중위수/평균: {group.mean.toFixed(2)}</p>
              <p>표본 크기: {group.n}</p>
            </div>
          ))}
        </div>

        {results.pValue < 0.05 && (
          <div className="mt-4 p-3 bg-teal-100 dark:bg-teal-900/30 rounded">
            <p className="text-sm">
              ✅ 통계적으로 유의한 차이가 있습니다 (p = {results.pValue.toFixed(4)})
            </p>
          </div>
        )}
      </Card>
    )
  }

  // 기술통계 - 히스토그램/분포
  if (results.method?.includes('기술통계') || results.method?.includes('EDA')) {
    return (
      <Card className="p-6 bg-gradient-to-br from-gray-50/50 to-slate-50/50 dark:from-gray-950/20 dark:to-slate-950/20">
        <h4 className="text-lg font-semibold mb-4">📊 기술통계 요약</h4>

        {chartData.distributionData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData.distributionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="normal1" stroke="#3b82f6" name="분포" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>분포 데이터를 표시할 수 없습니다.</p>
          </div>
        )}

        <div className="mt-4 text-sm">
          <p className="text-muted-foreground">
            기술통계량이 결과 섹션에 표시됩니다.
          </p>
        </div>
      </Card>
    )
  }

  // PCA/요인분석 - 분산 설명률 바 차트
  if (results.method?.includes('주성분') ||
      results.method?.includes('PCA') ||
      results.method?.includes('요인')) {
    const explainedRatios = results.additional?.explainedVarianceRatio || []
    const varianceData = explainedRatios.map((ratio, idx) => ({
      name: `PC${idx + 1}`,
      variance: ratio * 100,
      cumulative: explainedRatios.slice(0, idx + 1).reduce((a, b) => a + b, 0) * 100
    }))

    return (
      <Card className="p-6 bg-gradient-to-br from-indigo-50/30 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/20">
        <h4 className="text-lg font-semibold mb-4">📊 분산 설명률</h4>

        {varianceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={varianceData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis unit="%" />
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
              <Bar dataKey="variance" fill="#6366f1" name="개별 분산" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="cumulative" stroke="#f59e0b" name="누적 분산" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>분산 설명률 데이터가 없습니다.</p>
          </div>
        )}

        {varianceData.length > 0 && (
          <div className="mt-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded text-sm">
            <p>
              총 {varianceData.length}개 주성분이 전체 분산의{' '}
              <span className="font-medium">
                {varianceData[varianceData.length - 1]?.cumulative.toFixed(1)}%
              </span>
              를 설명합니다.
            </p>
          </div>
        )}
      </Card>
    )
  }

  // 군집분석 - 산점도 (클러스터별 색상)
  if (results.method?.includes('군집') || results.method?.includes('K-평균')) {
    const clusterColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-50/30 to-green-50/30 dark:from-emerald-950/20 dark:to-green-950/20">
        <h4 className="text-lg font-semibold mb-4">📊 군집 분석 결과</h4>

        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="차원 1" />
            <YAxis dataKey="y" name="차원 2" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              name="데이터"
              data={chartData.scatterData}
              fill="#10b981"
            />
          </ScatterChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {results.additional?.silhouetteScore !== undefined && (
            <div className="bg-muted/50 rounded p-3">
              <p className="text-muted-foreground">Silhouette Score</p>
              <p className="text-lg font-bold">{results.additional.silhouetteScore.toFixed(3)}</p>
            </div>
          )}
          {results.additional?.clusters && (
            <div className="bg-muted/50 rounded p-3">
              <p className="text-muted-foreground">군집 수</p>
              <p className="text-lg font-bold">{new Set(results.additional.clusters).size}</p>
            </div>
          )}
        </div>
      </Card>
    )
  }

  // 신뢰도 분석 - 항목별 상관 바 차트
  if (results.method?.includes('신뢰도') || results.method?.includes('Cronbach')) {
    const itemData = results.additional?.itemTotalCorrelations?.map((corr, idx) => ({
      name: `항목 ${idx + 1}`,
      correlation: corr
    })) || []

    return (
      <Card className="p-6 bg-gradient-to-br from-amber-50/30 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/20">
        <h4 className="text-lg font-semibold mb-4">📊 항목-총점 상관</h4>

        {itemData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={itemData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 1]} />
              <YAxis dataKey="name" type="category" width={60} />
              <Tooltip formatter={(value: number) => value.toFixed(3)} />
              <Bar dataKey="correlation" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                {itemData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.correlation < 0.3 ? '#ef4444' : '#f59e0b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>항목 상관 데이터가 없습니다.</p>
          </div>
        )}

        {results.additional?.alpha !== undefined && (
          <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded">
            <p className="text-sm">
              Cronbach's α = <span className="font-bold">{results.additional.alpha.toFixed(3)}</span>
              {' '}
              ({results.additional.alpha >= 0.7 ? '수용 가능' : '낮음'})
            </p>
          </div>
        )}
      </Card>
    )
  }

  // 검정력 분석 - 검정력 곡선
  if (results.method?.includes('검정력')) {
    // 샘플 크기별 검정력 곡선 생성
    const powerCurveData = Array.from({ length: 20 }, (_, i) => {
      const n = (i + 1) * 10
      const power = results.additional?.power || 0.8
      const adjustedPower = Math.min(1, power * Math.sqrt(n / 100))
      return { n, power: adjustedPower * 100 }
    })

    return (
      <Card className="p-6 bg-gradient-to-br from-rose-50/30 to-pink-50/30 dark:from-rose-950/20 dark:to-pink-950/20">
        <h4 className="text-lg font-semibold mb-4">📊 검정력 곡선</h4>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={powerCurveData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="n" name="표본 크기" />
            <YAxis unit="%" domain={[0, 100]} />
            <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="5 5" label="80%" />
            <Line type="monotone" dataKey="power" stroke="#ec4899" strokeWidth={2} name="검정력" />
          </LineChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {results.additional?.power !== undefined && (
            <div className="bg-muted/50 rounded p-3">
              <p className="text-muted-foreground">현재 검정력</p>
              <p className={`text-lg font-bold ${results.additional.power >= 0.8 ? 'text-green-600' : 'text-yellow-600'}`}>
                {(results.additional.power * 100).toFixed(1)}%
              </p>
            </div>
          )}
          {results.additional?.requiredSampleSize !== undefined && (
            <div className="bg-muted/50 rounded p-3">
              <p className="text-muted-foreground">필요 표본 크기</p>
              <p className="text-lg font-bold">{results.additional.requiredSampleSize}</p>
            </div>
          )}
        </div>
      </Card>
    )
  }

  // 기본 - 시각화 준비 중
  return (
    <Card className="p-6">
      <h4 className="text-lg font-semibold mb-4">📊 분석 결과 시각화</h4>
      <div className="text-center py-8 text-muted-foreground">
        <p>이 분석 유형({results.method})에 대한 시각화를 준비 중입니다.</p>
        <p className="text-sm mt-2">결과 데이터는 아래 섹션에서 확인할 수 있습니다.</p>
      </div>
    </Card>
  )
}