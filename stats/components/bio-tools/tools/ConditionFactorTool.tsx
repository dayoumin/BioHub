'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { BIO_CHART_COLORS } from '@/lib/bio-tools/bio-chart-colors'
import { detectLengthColumn, detectWeightColumn } from '@/lib/bio-tools/fisheries-columns'
import { cn } from '@/lib/utils'
import { BarChart3, Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { BioResultSummary, type MetricItem } from '@/components/common/results'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildConditionFactorColumns } from '@/lib/graph-studio/analysis-adapter'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statCategoryAxis, statValueAxis, statTooltip } from '@/lib/charts/echarts-stat-utils'
import { resolveChartPalette } from '@/lib/charts/chart-color-resolver'
import type { VLineAnnotation } from '@/types/graph-studio'
import type { ToolComponentProps } from './types'
import type { ConditionFactorResult } from '@/types/bio-tools-results'

const ConditionFactorTool = memo(function ConditionFactorTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { resolvedTheme } = useTheme()
  const [lengthCol, setLengthCol] = useState<string>('')
  const [weightCol, setWeightCol] = useState<string>('')
  const [groupCol, setGroupCol] = useState<string>('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<ConditionFactorResult>({ worker: PyodideWorker.Fisheries, initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)
  const openInGraphStudio = useOpenInGraphStudio()

  const onDataLoaded = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    setLengthCol(detectLengthColumn(data.headers))
    setWeightCol(detectWeightColumn(data.headers))
    setGroupCol('')
  }, [handleDataLoaded])

  const onClear = useCallback(() => {
    handleClear()
    setLengthCol('')
    setWeightCol('')
    setGroupCol('')
  }, [handleClear])

  const handleAnalyze = useCallback(() => {
    if (!csvData || !lengthCol || !weightCol) return
    const lengths = csvData.rows.map((r) => r[lengthCol] as number | null)
    const weights = csvData.rows.map((r) => r[weightCol] as number | null)
    const groups = groupCol
      ? csvData.rows.map((r) => r[groupCol] as string | null)
      : null
    runAnalysis('condition_factor', { lengths, weights, groups })
  }, [csvData, lengthCol, weightCol, groupCol, runAnalysis])

  const handleOpenInGraphStudio = useCallback(() => {
    if (!results) return
    const annotations: VLineAnnotation[] = [
      { type: 'vline', value: results.mean, text: `Mean = ${results.mean.toFixed(4)}`, color: BIO_CHART_COLORS[5] },
      { type: 'vline', value: results.median, text: `Median = ${results.median.toFixed(4)}`, color: BIO_CHART_COLORS[4], strokeDash: [4, 3] },
    ]
    openInGraphStudio({
      built: buildConditionFactorColumns(results),
      chartType: 'histogram',
      label: 'Condition Factor (K) 분포',
      customize: (spec) => { spec.annotations = annotations },
    })
  }, [results, openInGraphStudio])

  // 히스토그램 데이터
  const histData = useMemo(() => {
    if (!results || results.individualK.length === 0) return null
    const k = results.individualK
    const n = k.length
    let kMin = k[0], kMax = k[0]
    for (let i = 1; i < n; i++) {
      if (k[i] < kMin) kMin = k[i]
      if (k[i] > kMax) kMax = k[i]
    }
    if (kMin === kMax) { kMin -= 0.1; kMax += 0.1 }

    const nBins = Math.min(Math.ceil(Math.sqrt(n)), 20)
    const binWidth = (kMax - kMin) / nBins
    const bins = new Array<number>(nBins).fill(0)
    for (const val of k) {
      const idx = Math.min(Math.floor((val - kMin) / binWidth), nBins - 1)
      bins[idx]++
    }
    const maxCount = Math.max(...bins)
    return { kMin, kMax, nBins, binWidth, bins, maxCount }
  }, [results])

  const chartOption = useMemo(() => {
    if (!histData || !results) return null
    const palette = resolveChartPalette()
    const binLabels = histData.bins.map((_, i) => {
      const lo = histData.kMin + i * histData.binWidth
      return lo.toFixed(2)
    })
    const meanIdx = (results.mean - histData.kMin) / histData.binWidth - 0.5
    const medianIdx = (results.median - histData.kMin) / histData.binWidth - 0.5
    return {
      ...statBaseOption(),
      tooltip: statTooltip({
        trigger: 'axis',
        formatter: (params: unknown) => {
          const p = (params as Array<{ dataIndex: number; value: number }>)[0]
          const lo = histData.kMin + p.dataIndex * histData.binWidth
          const hi = lo + histData.binWidth
          return `${lo.toFixed(3)} – ${hi.toFixed(3)}<br/>빈도: ${p.value}`
        },
      }),
      xAxis: { ...statCategoryAxis(binLabels, 'Condition Factor (K)'), nameGap: 35 },
      yAxis: statValueAxis('Frequency'),
      series: [{
        type: 'bar',
        data: histData.bins,
        itemStyle: { color: palette[0], opacity: 0.6, borderColor: palette[0], borderWidth: 0.5 },
        barCategoryGap: '5%',
        markLine: {
          symbol: 'none',
          label: { position: 'end', fontSize: 10 },
          data: [
            { name: 'Mean', xAxis: meanIdx, lineStyle: { color: palette[5], width: 1.5 }, label: { formatter: 'Mean' } },
            { name: 'Median', xAxis: medianIdx, lineStyle: { color: palette[4], width: 1.5, type: 'dashed' }, label: { formatter: 'Median' } },
          ],
        },
      }],
    } as Record<string, unknown>
  }, [histData, results, resolvedTheme])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { lengthCol, weightCol, groupCol },
    })
  }, [saveToHistory, tool, lengthCol, weightCol, groupCol])

  const groupEntries = results?.groupStats ? Object.entries(results.groupStats) : []

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={onDataLoaded}
        onClear={onClear}
        description="CSV (체장 열 + 체중 열, 선택적으로 그룹 열 포함)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex flex-wrap items-center gap-4">
          <BioColumnSelect label="체장 열" headers={csvData.headers} value={lengthCol} onChange={setLengthCol} width={140} />
          <BioColumnSelect label="체중 열" headers={csvData.headers} value={weightCol} onChange={setWeightCol} width={140} />
          <BioColumnSelect label="그룹 열" headers={csvData.headers} value={groupCol} onChange={setGroupCol} width={140} allowNone />
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !lengthCol || !weightCol || lengthCol === weightCol
              || (!!groupCol && (groupCol === lengthCol || groupCol === weightCol))}
            size="sm"
          >
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
          </Button>
        </div>
      )}

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-6">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
          <BioResultSummary
            metrics={[
              { label: '평균 K', value: results.mean.toFixed(4), tooltip: `Fulton's K 평균 (SD: ${results.std.toFixed(4)})` },
              { label: '중앙값', value: results.median.toFixed(4) },
              { label: 'N', value: String(results.n) },
              { label: '범위', value: `${results.min.toFixed(4)} – ${results.max.toFixed(4)}` },
            ] satisfies MetricItem[]}
            columns={4}
          >
          <div>
            <h3 className="text-sm font-semibold mb-2">Fulton&apos;s K 요약</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { label: '평균', value: results.mean.toFixed(4) },
                { label: 'SD', value: results.std.toFixed(4) },
                { label: '중앙값', value: results.median.toFixed(4) },
                { label: '최소', value: results.min.toFixed(4) },
                { label: '최대', value: results.max.toFixed(4) },
                { label: 'N', value: String(results.n) },
              ].map((item) => (
                <div key={item.label} className="p-3 border rounded-lg text-center">
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                  <div className="text-sm font-semibold font-mono mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {chartOption && (
            <div>
              <h3 className="text-sm font-semibold mb-2">K 분포</h3>
              <div className="border rounded-lg bg-card max-w-lg mx-auto">
                <LazyReactECharts option={chartOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
              </div>
            </div>
          )}

          {groupEntries.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">그룹별 비교</h3>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                      <th className={`text-left ${BIO_TABLE.headerCell}`}>그룹</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>평균 K</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>SD</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>중앙값</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>N</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupEntries.map(([name, stats]) => (
                      <tr key={name} className="border-b last:border-b-0">
                        <td className={`${BIO_TABLE.bodyCell} font-medium`}>{name}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{stats.mean.toFixed(4)}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{stats.std.toFixed(4)}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{stats.median.toFixed(4)}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{stats.n}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {results.comparison && (
                <div className="flex items-center gap-2 mt-2 text-sm">
                  <Badge
                    variant="secondary"
                    style={results.comparison.pValue < 0.05
                      ? SIGNIFICANCE_BADGE.significant
                      : SIGNIFICANCE_BADGE.nonSignificant}
                  >
                    {results.comparison.test}
                  </Badge>
                  <span className="font-mono text-xs">
                    {results.comparison.test === 't-test' ? 't' : 'F'} = {results.comparison.statistic.toFixed(3)},
                    {' '}p = {results.comparison.pValue.toFixed(4)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    (df = {results.comparison.df}{results.comparison.df2 != null ? `, ${results.comparison.df2}` : ''})
                  </span>
                </div>
              )}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>

          <div className="p-3 border rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm">Fulton&apos;s K 주의사항</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>K는 등성장(isometric, b = 3)을 가정 — b &ne; 3이면 체장에 따라 K가 체계적으로 달라짐</li>
              <li>종간 비교에는 부적절 (종내 비교용)</li>
              <li>대안: relative condition factor (Kn = W / W<sub>expected</sub>)</li>
            </ul>
          </div>
          </BioResultSummary>
        </div>
      )}
    </div>
  )
})

export default ConditionFactorTool
