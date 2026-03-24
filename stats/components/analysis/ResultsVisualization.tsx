'use client'

import { useMemo } from 'react'
import { useTerminology } from '@/hooks/use-terminology'
import { Card } from '@/components/ui/card'
import { AnalysisResult } from '@/types/analysis'
import { useAnalysisStore } from '@/lib/stores/analysis-store'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statCategoryAxis, statValueAxis, statTooltip, errorBarSeries, STAT_COLORS } from '@/lib/charts/echarts-stat-utils'
import type { EChartsOption } from 'echarts'

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

/** 공통 bar+errorBar ECharts option 생성 (t-검정/ANOVA/비모수) */
function groupBarOption(
  groupData: GroupData[],
  color: string,
  altColor?: string,
): EChartsOption {
  const categories = groupData.map((g) => g.name)
  const means = groupData.map((g) => g.mean)


  const errorBarUpper = groupData.map((g) => g.mean + g.std)
  const errorBarLower = groupData.map((g) => g.mean - g.std)

  return {
    ...statBaseOption(),
    xAxis: statCategoryAxis(categories),
    yAxis: statValueAxis(),
    tooltip: statTooltip({
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params: unknown) {
        const arr = params as Array<Record<string, unknown>>
        const p = arr[0]
        const idx = p.dataIndex as number
        const g = groupData[idx]
        if (!g) return ''
        return `<b>${g.name}</b><br/>평균: ${g.mean.toFixed(2)}<br/>표준편차: ${g.std.toFixed(2)}<br/>n = ${g.n}`
      },
    }),
    series: [
      {
        type: 'bar',
        data: means.map((val, i) => ({
          value: val,
          itemStyle: {
            color: altColor && i > 0 ? altColor : color,
            borderRadius: [8, 8, 0, 0],
          },
        })),
        label: {
          show: true,
          position: 'top',
          formatter: (p: Record<string, unknown>) => (p.value as number).toFixed(2),
          fontSize: 11,
        },
        barMaxWidth: 60,
      },
      errorBarSeries(groupData.map((_, i) => [i, errorBarUpper[i], errorBarLower[i]])),
    ] as NonNullable<EChartsOption['series']>,
  }
}

/** 대용량 데이터 샘플링 (순수 함수 — 컴포넌트 외부) */
function sampleLargeData<T>(data: T[], maxSize: number = 1000): T[] {
  if (data.length <= maxSize) return data
  const step = Math.ceil(data.length / maxSize)
  return data.filter((_, index) => index % step === 0)
}

export function ResultsVisualization({ results }: ResultsVisualizationProps) {
  const t = useTerminology()
  const rv = t.resultsVisualization
  const { uploadedData } = useAnalysisStore()

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
    const option = groupBarOption(chartData.groupData, STAT_COLORS[0], STAT_COLORS[2])

    return (
      <Card className="p-6 bg-gradient-to-br from-blue-50/30 to-success-bg/30 dark:from-blue-950/20 dark:to-success-bg/20">
        <h4 className="text-lg font-semibold mb-4">{rv.groupComparison.title}</h4>

        <LazyReactECharts option={option} style={{ height: 300 }} opts={{ renderer: 'svg' }} />

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

  // 상관분석의 경우 산점도
  if (results.method?.includes('상관')) {
    const scatterOption: EChartsOption = {
      ...statBaseOption(),
  
      xAxis: { type: 'value', name: 'X', ...statValueAxis() },
      yAxis: { type: 'value', name: 'Y', ...statValueAxis() },
      series: [{
        type: 'scatter',
        data: chartData.scatterData.map((p) => [p.x, p.y]),
        symbolSize: 8,
        itemStyle: { color: STAT_COLORS[4], opacity: 0.7 },
        emphasis: { itemStyle: { shadowBlur: 8, shadowColor: 'rgba(0,0,0,0.2)', opacity: 1 } },
      }],
      tooltip: statTooltip({
        formatter(params: unknown) {
          const p = params as { value: number[] }
          return `X: ${p.value[0].toFixed(4)}<br/>Y: ${p.value[1].toFixed(4)}`
        },
      }),
    }

    return (
      <Card className="p-6 bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.correlation.title}</h4>
        <LazyReactECharts option={scatterOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
      </Card>
    )
  }

  // 회귀분석의 경우 산점도와 회귀선
  if (results.method?.includes('회귀')) {
    const regressionResult = results as RegressionResult
    const vizRegression = results.visualizationData?.data as Record<string, unknown> | undefined
    const vizReg = vizRegression?.regression as { slope?: number; intercept?: number } | undefined
    const intercept = vizReg?.intercept ?? regressionResult.additional?.intercept ?? 0
    const slopeCoeff = regressionResult.coefficients?.find(c => c.name !== 'Intercept' && c.name !== '(Intercept)')
    const slope = vizReg?.slope ?? slopeCoeff?.value ?? 0
    const hasRegressionLine = vizReg?.slope !== undefined || slopeCoeff !== undefined

    const scatterPoints = chartData.scatterData.map((p) => [p.x, p.y])
    const series: NonNullable<EChartsOption['series']> = [
      {
        type: 'scatter',
        data: scatterPoints,
        symbolSize: 8,
        itemStyle: { color: STAT_COLORS[0], opacity: 0.7 },
        name: rv.labels.data,
      } as Record<string, unknown>,
    ]

    if (hasRegressionLine && chartData.scatterData.length > 0) {
      const xMin = Math.min(...chartData.scatterData.map((d) => d.x))
      const xMax = Math.max(...chartData.scatterData.map((d) => d.x))
      series.push({
        type: 'line',
        data: [
          [xMin, slope * xMin + intercept],
          [xMax, slope * xMax + intercept],
        ],
        symbol: 'none',
        lineStyle: { color: STAT_COLORS[5], width: 2 },
        name: rv.regression.regressionLine,
      } as Record<string, unknown>)
    }

    const regressionOption: EChartsOption = {
      ...statBaseOption(),
      xAxis: { type: 'value', name: rv.regression.independentVar, ...statValueAxis() },
      yAxis: { type: 'value', name: rv.regression.dependentVar, ...statValueAxis() },
      series,
      tooltip: statTooltip({
        formatter(params: unknown) {
          const p = params as { value: number[] }
          return `X: ${p.value[0].toFixed(4)}<br/>Y: ${p.value[1].toFixed(4)}`
        },
      }),
    }

    return (
      <Card className="p-6 bg-gradient-to-br from-orange-50/30 to-red-50/30 dark:from-orange-950/20 dark:to-red-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.regression.title}</h4>
        <LazyReactECharts option={regressionOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />

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

  // 비모수 검정 (Mann-Whitney, Wilcoxon, Kruskal-Wallis 등)
  if (results.method?.includes('Mann-Whitney') ||
      results.method?.includes('Wilcoxon') ||
      results.method?.includes('Kruskal') ||
      results.method?.includes('비모수')) {
    const option = groupBarOption(chartData.groupData, STAT_COLORS[6])

    return (
      <Card className="p-6 bg-gradient-to-br from-teal-50/30 to-cyan-50/30 dark:from-teal-950/20 dark:to-cyan-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.nonparametric.title}</h4>

        <LazyReactECharts option={option} style={{ height: 300 }} opts={{ renderer: 'svg' }} />

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

  // PCA/요인분석 - 분산 설명률 바+라인 차트
  if (results.method?.includes('주성분') ||
      results.method?.includes('PCA') ||
      results.method?.includes('요인')) {
    const explainedRatios = results.additional?.explainedVarianceRatio || []
    const varianceData = explainedRatios.map((ratio, idx) => ({
      name: `PC${idx + 1}`,
      variance: ratio * 100,
      cumulative: explainedRatios.slice(0, idx + 1).reduce((a, b) => a + b, 0) * 100
    }))

    const pcaOption: EChartsOption = varianceData.length > 0 ? {
      ...statBaseOption(),
      xAxis: statCategoryAxis(varianceData.slice(0, 10).map((d) => d.name)),
      yAxis: { ...statValueAxis(), name: '%', axisLabel: { formatter: '{value}%' } },
      series: [
        {
          type: 'bar',
          data: varianceData.slice(0, 10).map((d) => d.variance),
          itemStyle: { color: STAT_COLORS[6], borderRadius: [4, 4, 0, 0] },
          name: rv.pca.individualVariance,
        },
        {
          type: 'line',
          data: varianceData.slice(0, 10).map((d) => d.cumulative),
          itemStyle: { color: STAT_COLORS[4] },
          lineStyle: { color: STAT_COLORS[4] },
          name: rv.pca.cumulativeVariance,
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
      tooltip: statTooltip({ trigger: 'axis' }),
      legend: { bottom: 0 },
    } : { ...statBaseOption() }

    return (
      <Card className="p-6 bg-gradient-to-br from-indigo-50/30 to-violet-50/30 dark:from-indigo-950/20 dark:to-violet-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.pca.title}</h4>

        {varianceData.length > 0 ? (
          <LazyReactECharts option={pcaOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
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
    // 클러스터별 시리즈 분리
    const clusterGroups = new Map<string, Array<[number, number]>>()
    chartData.scatterData.forEach((p) => {
      const key = p.group ?? 'default'
      if (!clusterGroups.has(key)) clusterGroups.set(key, [])
      clusterGroups.get(key)!.push([p.x, p.y])
    })

    const clusterSeries: NonNullable<EChartsOption['series']> = Array.from(clusterGroups.entries()).map(
      ([name, points], i) => ({
        type: 'scatter' as const,
        name,
        data: points,
        symbolSize: 8,
        itemStyle: { color: STAT_COLORS[i % STAT_COLORS.length] },
      }),
    )

    const clusterOption: EChartsOption = {
      ...statBaseOption(),
      xAxis: { type: 'value', name: rv.cluster.dimension1, ...statValueAxis() },
      yAxis: { type: 'value', name: rv.cluster.dimension2, ...statValueAxis() },
      series: clusterSeries,
      legend: { bottom: 0 },
      tooltip: statTooltip({
        formatter(params: unknown) {
          const p = params as { value: number[]; seriesName: string }
          return `<b>${p.seriesName}</b><br/>X: ${p.value[0].toFixed(4)}<br/>Y: ${p.value[1].toFixed(4)}`
        },
      }),
    }

    return (
      <Card className="p-6 bg-gradient-to-br from-emerald-50/30 to-green-50/30 dark:from-emerald-950/20 dark:to-green-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.cluster.title}</h4>
        <LazyReactECharts option={clusterOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
      </Card>
    )
  }

  // 신뢰도 분석 - 항목별 상관 바 차트 (horizontal)
  if (results.method?.includes('신뢰도') || results.method?.includes('Cronbach')) {
    const itemData = results.additional?.itemTotalCorrelations?.map((corr, idx) => ({
      name: rv.reliability.itemLabel(idx + 1),
      correlation: corr
    })) || []

    const reliabilityOption: EChartsOption = itemData.length > 0 ? {
      ...statBaseOption(),
      grid: { left: 80, right: 20, top: 30, bottom: 50, containLabel: true },
      xAxis: { type: 'value', min: 0, max: 1, ...statValueAxis() },
      yAxis: { type: 'category', data: itemData.map((d) => d.name), axisLabel: { fontSize: 11, color: '#64748b' } },
      series: [{
        type: 'bar',
        data: itemData.map((d) => ({
          value: d.correlation,
          itemStyle: {
            color: d.correlation < 0.3 ? '#ef4444' : STAT_COLORS[0],
            borderRadius: [0, 4, 4, 0],
          },
        })),
      }],
      tooltip: {
        ...statTooltip({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
      },
    } : { ...statBaseOption() }

    return (
      <Card className="p-6 bg-gradient-to-br from-amber-50/30 to-yellow-50/30 dark:from-amber-950/20 dark:to-yellow-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.reliability.title}</h4>

        {itemData.length > 0 ? (
          <LazyReactECharts option={reliabilityOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>{rv.reliability.noDataMessage}</p>
          </div>
        )}
      </Card>
    )
  }

  // 검정력 분석 — power curve
  if (results.method?.includes('검정력')) {
    const vizPower = results.visualizationData?.type === 'power-curve'
      ? results.visualizationData.data as { sampleSizes?: number[]; powers?: number[] }
      : undefined
    const powerCurveData = results.additional?.powerCurve
      ?? (vizPower?.sampleSizes && vizPower?.powers
        ? vizPower.sampleSizes.map((n, i) => ({ n, power: vizPower.powers![i] }))
        : undefined)

    const powerOption: EChartsOption = powerCurveData && powerCurveData.length > 0 ? {
      ...statBaseOption(),
      xAxis: { type: 'value', name: rv.labels.sampleSize, ...statValueAxis() },
      yAxis: { type: 'value', name: '%', min: 0, max: 100, ...statValueAxis(), axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'line',
        data: powerCurveData.map((d) => [d.n, d.power * 100]),
        smooth: true,
        lineStyle: { color: STAT_COLORS[0], width: 2 },
        itemStyle: { color: STAT_COLORS[0] },
        name: rv.power.powerLabel,
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#ef4444', type: 'dashed' as const, width: 1.5 },
          data: [{ yAxis: 80, label: { formatter: '80%', position: 'end' as const } }],
        },
      }],
      tooltip: statTooltip({
        trigger: 'axis',
        formatter(params: unknown) {
          const arr = params as Array<Record<string, unknown>>
          const p = arr[0]
          const val = p.value as number[]
          return `n = ${val[0]}<br/>검정력: ${val[1].toFixed(1)}%`
        },
      }),
    } : { ...statBaseOption() }

    return (
      <Card className="p-6 bg-gradient-to-br from-rose-50/30 to-pink-50/30 dark:from-rose-950/20 dark:to-pink-950/20">
        <h4 className="text-lg font-semibold mb-4">{rv.power.title}</h4>

        {powerCurveData && powerCurveData.length > 0 ? (
          <LazyReactECharts option={powerOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
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
