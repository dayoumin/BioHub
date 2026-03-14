'use client'

import { useMemo } from 'react'
import { useTerminology } from '@/hooks/use-terminology'
import {
  BarChart,
  Bar,
  ComposedChart,
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
import { AnalysisResult } from '@/types/analysis'
import { useAnalysisStore } from '@/lib/stores/analysis-store'

// CSS 변수를 Recharts용 HEX 색상으로 변환 (Design System 통일)
// Canvas 2D를 사용하여 oklch/hsl/rgb 등 모든 CSS 색상 형식을 HEX로 변환
let _colorCtx: CanvasRenderingContext2D | null = null

const getCSSColor = (variable: string): string => {
  if (typeof window === 'undefined') return '#000000' // SSR 안전성

  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim()
  if (!value) return '#000000'

  if (!_colorCtx) {
    _colorCtx = document.createElement('canvas').getContext('2d')
  }
  if (!_colorCtx) return '#000000'

  _colorCtx.fillStyle = '#000000' // Reset to detect unsupported values
  _colorCtx.fillStyle = value
  return _colorCtx.fillStyle
}

// Design System 색상 (shadcn/ui)
const CHART_COLORS = {
  primary: () => getCSSColor('--primary'),        // 메인 색상 (파란색)
  success: () => getCSSColor('--success'),        // 성공 색상 (초록색)
  accent: () => getCSSColor('--accent'),          // 강조 색상 (보라색)
  muted: () => getCSSColor('--muted'),            // 배경/비활성 색상
  destructive: () => getCSSColor('--destructive'), // 삭제/에러 색상
  foreground: () => getCSSColor('--foreground'),  // 기본 텍스트 색상
  warning: () => getCSSColor('--warning'),        // 경고 색상 (노란색)
  info: () => getCSSColor('--info'),              // 정보 색상 (파란색)
  error: () => getCSSColor('--error'),            // 에러 색상 (빨간색)
}

// Custom Tooltip 컴포넌트 (Recharts 최신 UX - 깔끔한 hover 정보)
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    value: number
    name: string
    dataKey: string
    color?: string
  }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3">
      {label && (
        <p className="font-semibold text-sm mb-2 text-foreground">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color || CHART_COLORS.primary() }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{entry.value.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}


// 타입 안전성을 위한 확장 인터페이스 — additional에 regression 필드 추가
interface RegressionResult extends AnalysisResult {
  additional?: AnalysisResult['additional'] & {
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
  const t = useTerminology()
  const rv = t.resultsVisualization
  const { uploadedData, selectedMethod } = useAnalysisStore()

  // 대용량 데이터 샘플링 함수
  const sampleLargeData = <T,>(data: T[], maxSize: number = 1000): T[] => {
    if (data.length <= maxSize) return data
    const step = Math.ceil(data.length / maxSize)
    return data.filter((_, index) => index % step === 0)
  }

  const chartData = useMemo(() => {
    const empty = { groupData: [] as GroupData[], scatterData: [] as ChartDataPoint[], distributionData: [] as Array<{ x: number; normal1: number; normal2: number }> }

    // ── 1차 소스: results.visualizationData (분석 엔진이 제공하는 정확한 데이터) ──
    const vizData = results.visualizationData
    if (vizData?.data) {
      const d = vizData.data as Record<string, unknown>

      // scatter: {x: number[], y: number[]} — 상관분석, 회귀분석
      if (vizData.type === 'scatter' && Array.isArray(d.x) && Array.isArray(d.y)) {
        const xArr = d.x as number[]
        const yArr = d.y as number[]
        const scatterData: ChartDataPoint[] = sampleLargeData(
          xArr.map((x, i) => ({ x, y: yArr[i] })),
          1000
        )
        return { ...empty, scatterData }
      }

      // boxplot: {groups: string[], values: number[][]} — 독립표본 t-test, ANOVA, 비모수
      if (vizData.type === 'boxplot' && Array.isArray(d.groups) && Array.isArray(d.values)) {
        const groups = d.groups as string[]
        const values = d.values as number[][]
        const groupData: GroupData[] = groups.map((name, i) => {
          const vals = values[i] ?? []
          if (vals.length === 0) return { name, mean: 0, std: 0, n: 0 }
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length
          const std = Math.sqrt(vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length)
          return { name, mean, std, n: vals.length }
        })
        return { ...empty, groupData }
      }

      // paired-plot: {before: number[], after: number[], labels?: string[]} — 대응표본 t-test, Wilcoxon
      if (vizData.type === 'paired-plot' && Array.isArray(d.before) && Array.isArray(d.after)) {
        const before = d.before as number[]
        const after = d.after as number[]
        const labels = (d.labels as string[]) ?? ['Before', 'After']
        const groupData: GroupData[] = [before, after].map((vals, i) => {
          const mean = vals.reduce((a, b) => a + b, 0) / vals.length
          const std = Math.sqrt(vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length)
          return { name: labels[i] ?? `Group ${i + 1}`, mean, std, n: vals.length }
        })
        return { ...empty, groupData }
      }

      // cluster-plot: {points: number[][], clusters: number[], centers: number[][]}
      if (vizData.type === 'cluster-plot' && Array.isArray(d.points) && Array.isArray(d.clusters)) {
        const points = d.points as number[][]
        const clusters = d.clusters as number[]
        const scatterData: ChartDataPoint[] = points.map((pt, i) => ({
          x: pt[0] ?? 0, y: pt[1] ?? 0, group: `Cluster ${clusters[i]}`
        }))
        return { ...empty, scatterData }
      }

      // histogram, power-curve 등 chartData로 변환할 필요 없는 타입은 fallback으로 진행
    }

    // ── 2차 소스: groupStats (분석 결과에 포함된 그룹 통계) ──
    if (results.groupStats && results.groupStats.length > 0) {
      const groupData: GroupData[] = results.groupStats.map(g => ({
        name: g.name ?? 'Group',
        mean: g.mean,
        std: g.std,
        n: g.n
      }))
      return { ...empty, groupData }
    }

    // ── 3차 소스: uploadedData (fallback — visualizationData가 없는 레거시) ──
    if (uploadedData && uploadedData.length > 0) {
      const sampledData = sampleLargeData(uploadedData, 1000)
      const columns = Object.keys(sampledData[0])
      const numericColumns = columns.filter(col => {
        const values = sampledData.slice(0, 100).map(row => row[col])
        return values.every(v => v != null && !isNaN(Number(v)))
      })

      if (numericColumns.length >= 2) {
        const scatterData: ChartDataPoint[] = sampledData.map(row => ({
          x: Number(row[numericColumns[0]]),
          y: Number(row[numericColumns[1]])
        }))
        return { ...empty, scatterData }
      } else if (numericColumns.length === 1) {
        const numericCol = numericColumns[0]
        const categoricalCol = columns.find(col => col !== numericCol)
        if (categoricalCol) {
          const uniqueGroups = [...new Set(sampledData.map(row => row[categoricalCol]))]
          const groupData: GroupData[] = uniqueGroups.slice(0, 10).map(group => {
            const values = sampledData
              .filter(row => row[categoricalCol] === group)
              .map(row => Number(row[numericCol]))
              .filter(v => !isNaN(v))
            if (values.length === 0) return { name: String(group), mean: 0, std: 0, n: 0 }
            const mean = values.reduce((a, b) => a + b, 0) / values.length
            const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
            return { name: String(group), mean, std, n: values.length }
          })
          return { ...empty, groupData }
        }
      }
    }

    return empty
  }, [results.visualizationData, results.groupStats, uploadedData])

  // t-검정이나 ANOVA의 경우 막대 그래프 + Error Bar
  if (results.method?.includes('검정') || results.method?.includes('ANOVA')) {
    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50/30 to-success-bg/30 dark:from-blue-950/20 dark:to-success-bg/20">
        <h4 className="text-lg font-semibold mb-4">{rv.groupComparison.title}</h4>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.groupData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <Legend />
            <Bar
              dataKey="mean"
              fill={CHART_COLORS.primary()}
              name={rv.labels.mean}
              label={{ position: 'top', formatter: (label) => typeof label === 'number' ? label.toFixed(2) : String(label) }}
              radius={[8, 8, 0, 0]}
            >
              {chartData.groupData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === 0 ? CHART_COLORS.primary() : CHART_COLORS.success()} />
              ))}
              <ErrorBar dataKey="std" width={4} strokeWidth={2} stroke={CHART_COLORS.foreground()} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {chartData.groupData.map((group, index) => (
            <div key={index} className="bg-muted/50 rounded p-3">
              <p className="font-medium">{group.name}</p>
              <p>{rv.labels.mean}: {group.mean.toFixed(2)} ± {group.std.toFixed(2)}</p>
              <p>{rv.labels.sampleSize}: {group.n}</p>
            </div>
          ))}
        </div>

        {results.pValue < 0.05 && (
          <div className="mt-4 p-3 bg-success-bg dark:bg-success-bg rounded">
            <p className="text-sm">
              {rv.significantDifference(results.pValue.toFixed(4))}
            </p>
          </div>
        )}
      </Card>
    )
  }

  // 상관분석의 경우 산점도 (수치 요약은 StatsCards/MethodSpecificResults에서 표시)
  if (results.method?.includes('상관')) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.correlation.title}</h4>

        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name="X" />
            <YAxis dataKey="y" name="Y" />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              name={rv.labels.data}
              data={chartData.scatterData}
              fill={CHART_COLORS.primary()}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    )
  }

  // 회귀분석의 경우 산점도와 회귀선
  if (results.method?.includes('회귀')) {
    const regressionResult = results as RegressionResult
    // visualizationData에서 regression 파라미터 우선 사용, 없으면 coefficients fallback
    const vizRegression = results.visualizationData?.data as Record<string, unknown> | undefined
    const vizReg = vizRegression?.regression as { slope?: number; intercept?: number } | undefined
    const intercept = vizReg?.intercept ?? regressionResult.additional?.intercept ?? 0
    const slopeCoeff = regressionResult.coefficients?.find(c => c.name !== 'Intercept' && c.name !== '(Intercept)')
    const slope = vizReg?.slope ?? slopeCoeff?.value ?? 0
    const hasRegressionLine = vizReg?.slope !== undefined || slopeCoeff !== undefined

    // 회귀선을 위한 데이터 생성
    const lineData = hasRegressionLine && chartData.scatterData.length > 0
      ? (() => {
          const xMin = Math.min(...chartData.scatterData.map(d => d.x))
          const xMax = Math.max(...chartData.scatterData.map(d => d.x))
          return [
            { x: xMin, y: slope * xMin + intercept },
            { x: xMax, y: slope * xMax + intercept },
          ]
        })()
      : []

    return (
      <Card className="p-6 bg-gradient-to-br from-orange-50/30 to-red-50/30 dark:from-orange-950/20 dark:to-red-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.regression.title}</h4>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData.scatterData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" type="number" name={rv.regression.independentVar} />
            <YAxis dataKey="y" type="number" name={rv.regression.dependentVar} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              name={rv.labels.data}
              data={chartData.scatterData}
              fill={CHART_COLORS.primary()}
            />
            {lineData.length > 0 && (
              <Line
                data={lineData}
                type="monotone"
                dataKey="y"
                stroke={CHART_COLORS.destructive()}
                strokeWidth={2}
                dot={false}
                name={rv.regression.regressionLine}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {hasRegressionLine && (
          <div className="mt-4 bg-muted/50 rounded p-3">
            <p className="text-sm font-medium">{rv.regression.equationLabel}</p>
            <p className="font-mono mt-1">
              Y = {slope.toFixed(3)}X {intercept >= 0 ? '+' : ''} {intercept.toFixed(3)}
            </p>
          </div>
        )}
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
        <h4 className="text-lg font-semibold mb-4">{rv.nonparametric.title}</h4>

        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData.groupData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <Legend />
            <Bar
              dataKey="mean"
              fill={CHART_COLORS.accent()}
              name={rv.nonparametric.medianMean}
              label={{ position: 'top', formatter: (label) => typeof label === 'number' ? label.toFixed(2) : String(label) }}
              radius={[8, 8, 0, 0]}
            >
              {chartData.groupData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS.accent()} />
              ))}
              <ErrorBar dataKey="std" width={4} strokeWidth={2} stroke={CHART_COLORS.foreground()} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {chartData.groupData.map((group, index) => (
            <div key={index} className="bg-muted/50 rounded p-3">
              <p className="font-medium">{group.name}</p>
              <p>{rv.nonparametric.medianMean}: {group.mean.toFixed(2)}</p>
              <p>{rv.labels.sampleSize}: {group.n}</p>
            </div>
          ))}
        </div>

        {results.pValue < 0.05 && (
          <div className="mt-4 p-3 bg-teal-100 dark:bg-teal-900/30 rounded">
            <p className="text-sm">
              {rv.significantDifference(results.pValue.toFixed(4))}
            </p>
          </div>
        )}
      </Card>
    )
  }

  // 기술통계는 데이터 탐색 단계에서 표시됨 (제거됨)

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
        <h4 className="text-lg font-semibold mb-4">{rv.pca.title}</h4>

        {varianceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={varianceData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="variance" fill={CHART_COLORS.accent()} name={rv.pca.individualVariance} radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="cumulative" stroke={CHART_COLORS.accent()} name={rv.pca.cumulativeVariance} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{rv.pca.noDataMessage}</p>
          </div>
        )}

        {varianceData.length > 0 && (
          <div className="mt-4 p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded text-sm">
            <p>
              {rv.pca.summary(varianceData.length, varianceData[varianceData.length - 1]?.cumulative.toFixed(1) ?? '0')}
            </p>
          </div>
        )}
      </Card>
    )
  }

  // 군집분석 - 산점도 (클러스터별 색상)
  if (results.method?.includes('군집') || results.method?.includes('K-평균')) {
    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-50/30 to-green-50/30 dark:from-emerald-950/20 dark:to-green-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.cluster.title}</h4>

        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" name={rv.cluster.dimension1} />
            <YAxis dataKey="y" name={rv.cluster.dimension2} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter
              name={rv.labels.data}
              data={chartData.scatterData}
              fill={CHART_COLORS.success()}
            />
          </ScatterChart>
        </ResponsiveContainer>

      </Card>
    )
  }

  // 신뢰도 분석 - 항목별 상관 바 차트
  if (results.method?.includes('신뢰도') || results.method?.includes('Cronbach')) {
    const itemData = results.additional?.itemTotalCorrelations?.map((corr, idx) => ({
      name: rv.reliability.itemLabel(idx + 1),
      correlation: corr
    })) || []

    return (
      <Card className="p-6 bg-gradient-to-br from-amber-50/30 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.reliability.title}</h4>

        {itemData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={itemData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 1]} />
              <YAxis dataKey="name" type="category" width={60} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="correlation" fill={CHART_COLORS.warning()} radius={[0, 4, 4, 0]}>
                {itemData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.correlation < 0.3 ? CHART_COLORS.error() : CHART_COLORS.warning()}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{rv.reliability.noDataMessage}</p>
          </div>
        )}

      </Card>
    )
  }

  // 검정력 분석 — 실제 power curve 데이터가 있을 때만 곡선 표시
  if (results.method?.includes('검정력')) {
    // 1차: additional.powerCurve, 2차: visualizationData.data (executor가 {sampleSizes, powers}로 제공)
    const vizPower = results.visualizationData?.type === 'power-curve'
      ? results.visualizationData.data as { sampleSizes?: number[]; powers?: number[] }
      : undefined
    const powerCurveData = results.additional?.powerCurve
      ?? (vizPower?.sampleSizes && vizPower?.powers
        ? vizPower.sampleSizes.map((n, i) => ({ n, power: vizPower.powers![i] }))
        : undefined)

    return (
      <Card className="p-6 bg-gradient-to-br from-rose-50/30 to-pink-50/30 dark:from-rose-950/20 dark:to-pink-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.power.title}</h4>

        {powerCurveData && powerCurveData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={powerCurveData.map(d => ({ ...d, power: d.power * 100 }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="n" name={rv.labels.sampleSize} />
              <YAxis unit="%" domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={80} stroke={CHART_COLORS.destructive()} strokeDasharray="5 5" label="80%" />
              <Line type="monotone" dataKey="power" stroke={CHART_COLORS.primary()} strokeWidth={2} name={rv.power.powerLabel} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>{rv.power.currentPower}</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          {results.additional?.power !== undefined && (() => {
            const power = results.additional.power
            return (
              <div className="bg-muted/50 rounded p-3">
                <p className="text-muted-foreground">{rv.power.currentPower}</p>
                <p className={`text-lg font-bold ${power >= 0.8 ? 'text-success' : 'text-warning'}`}>
                  {(power * 100).toFixed(1)}%
                </p>
              </div>
            )
          })()}
          {results.additional?.requiredSampleSize !== undefined && (
            <div className="bg-muted/50 rounded p-3">
              <p className="text-muted-foreground">{rv.power.requiredSampleSize}</p>
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
      <h4 className="text-lg font-semibold mb-4">{rv.fallback.title}</h4>
      <div className="text-center py-8 text-muted-foreground">
        <p>{rv.fallback.preparing(results.method)}</p>
        <p className="text-sm mt-2">{rv.fallback.seeBelow}</p>
      </div>
    </Card>
  )
}