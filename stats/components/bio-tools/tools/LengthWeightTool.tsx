'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { resolveChartPalette } from '@/lib/charts/chart-color-resolver'
import { detectLengthColumn, detectWeightColumn } from '@/lib/bio-tools/fisheries-columns'
import { cn } from '@/lib/utils'
import { ArrowRight, BarChart3, Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildLengthWeightColumns } from '@/lib/graph-studio/analysis-adapter'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statValueAxis, statTooltip, SCATTER_LARGE_THRESHOLD, selectScatterRenderer } from '@/lib/charts/echarts-stat-utils'
import type { ToolComponentProps } from './types'
import type { LengthWeightResult } from '@/types/bio-tools-results'

const GROWTH_TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  isometric: { ko: '등성장', en: 'Isometric (b ≈ 3)' },
  positive_allometric: { ko: '양의 이성장', en: 'Positive allometric (b > 3)' },
  negative_allometric: { ko: '음의 이성장', en: 'Negative allometric (b < 3)' },
}

const LengthWeightTool = memo(function LengthWeightTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { resolvedTheme } = useTheme()
  const [lengthCol, setLengthCol] = useState<string>('')
  const [weightCol, setWeightCol] = useState<string>('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<LengthWeightResult>({ worker: PyodideWorker.Fisheries, initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)
  const openInGraphStudio = useOpenInGraphStudio()

  const onDataLoaded = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    setLengthCol(detectLengthColumn(data.headers))
    setWeightCol(detectWeightColumn(data.headers))
  }, [handleDataLoaded])

  const onClear = useCallback(() => {
    handleClear()
    setLengthCol('')
    setWeightCol('')
  }, [handleClear])

  const handleAnalyze = useCallback(() => {
    if (!csvData || !lengthCol || !weightCol) return
    const lengths = csvData.rows.map((r) => r[lengthCol] as number | null)
    const weights = csvData.rows.map((r) => r[weightCol] as number | null)
    runAnalysis('length_weight', { lengths, weights })
  }, [csvData, lengthCol, weightCol, runAnalysis])

  const handleOpenInGraphStudio = useCallback(() => {
    if (!results) return
    openInGraphStudio({
      built: buildLengthWeightColumns(results),
      chartType: 'scatter',
      label: '체장-체중 관계 (Log-Log)',
      customize: (spec) => { spec.trendline = { type: 'linear', showEquation: true } },
    })
  }, [results, openInGraphStudio])

  // log-log 산점도 데이터
  const chartData = useMemo(() => {
    if (!results || results.logLogPoints.length === 0) return null
    const pts = results.logLogPoints
    let logLMin = Infinity, logLMax = -Infinity, logWMin = Infinity, logWMax = -Infinity
    for (const p of pts) {
      if (p.logL < logLMin) logLMin = p.logL
      if (p.logL > logLMax) logLMax = p.logL
      if (p.logW < logWMin) logWMin = p.logW
      if (p.logW > logWMax) logWMax = p.logW
    }
    if (logLMin === logLMax) { logLMin -= 0.1; logLMax += 0.1 }
    if (logWMin === logWMax) { logWMin -= 0.1; logWMax += 0.1 }
    const pad = 0.05
    const xRange = logLMax - logLMin
    const yRange = logWMax - logWMin
    const xMin = logLMin - xRange * pad
    const xMax = logLMax + xRange * pad
    const regY1 = results.logA + results.b * xMin
    const regY2 = results.logA + results.b * xMax
    const yMin = Math.min(logWMin, regY1, regY2) - yRange * pad
    const yMax = Math.max(logWMax, regY1, regY2) + yRange * pad
    return { pts, xMin, xMax, yMin, yMax, regY1, regY2 }
  }, [results])

  const chartOption = useMemo(() => {
    if (!chartData || !results) return null
    const palette = resolveChartPalette()
    return {
      ...statBaseOption(),
      tooltip: statTooltip(),
      xAxis: { ...statValueAxis('log₁₀(Length)'), min: chartData.xMin, max: chartData.xMax },
      yAxis: { ...statValueAxis('log₁₀(Weight)'), min: chartData.yMin, max: chartData.yMax },
      graphic: [{
        type: 'text',
        left: 70,
        top: 10,
        style: {
          text: `log(W) = ${results.logA.toFixed(3)} + ${results.b.toFixed(3)} × log(L)`,
          fill: palette[0],
          fontSize: 12,
        },
      }],
      series: [
        {
          type: 'scatter',
          data: chartData.pts.map(p => [p.logL, p.logW]),
          symbolSize: 6,
          itemStyle: { color: palette[0], opacity: 0.3 },
          large: true,
          largeThreshold: SCATTER_LARGE_THRESHOLD,
        },
        {
          type: 'line',
          data: [[chartData.xMin, chartData.regY1], [chartData.xMax, chartData.regY2]],
          showSymbol: false,
          lineStyle: { color: palette[0], width: 2 },
          itemStyle: { color: palette[0] },
        },
      ],
    } as Record<string, unknown>
  }, [chartData, results, resolvedTheme])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { lengthCol, weightCol },
    })
  }, [saveToHistory, tool, lengthCol, weightCol])

  const growthLabel = results ? GROWTH_TYPE_LABELS[results.growthType] : null
  const isSignificant = results ? results.isometricPValue < 0.05 : false

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={onDataLoaded}
        onClear={onClear}
        description="CSV (체장 열 + 체중 열 포함)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex flex-wrap items-center gap-4">
          <BioColumnSelect label="체장 열" headers={csvData.headers} value={lengthCol} onChange={setLengthCol} width={160} />
          <BioColumnSelect label="체중 열" headers={csvData.headers} value={weightCol} onChange={setWeightCol} width={160} />
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !lengthCol || !weightCol || lengthCol === weightCol}
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
          <div className="p-4 border rounded-lg space-y-3">
            <div className="text-sm text-muted-foreground">추정된 관계식</div>
            <div className="text-lg font-semibold font-mono">
              W = {results.a.toExponential(4)} &times; L<sup>{results.b.toFixed(4)}</sup>
            </div>
            <div className="flex items-center gap-2">
              {growthLabel && (
                <Badge variant="secondary" style={isSignificant ? SIGNIFICANCE_BADGE.significant : SIGNIFICANCE_BADGE.nonSignificant}>
                  {growthLabel.ko}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {growthLabel?.en}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">파라미터</h3>
            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                    <th className={`text-left ${BIO_TABLE.headerCell}`}>항목</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>값</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className={`${BIO_TABLE.bodyCell}`}>a (절편)</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.a.toExponential(4)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className={`${BIO_TABLE.bodyCell}`}>b (기울기)</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.b.toFixed(4)} (&plusmn; {results.bStdError.toFixed(4)})</td>
                  </tr>
                  <tr className="border-b">
                    <td className={`${BIO_TABLE.bodyCell}`}>R&sup2;</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.rSquared.toFixed(4)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className={`${BIO_TABLE.bodyCell}`}>등성장 검정 (b = 3)</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>
                      t = {results.isometricTStat.toFixed(3)}, p = {results.isometricPValue.toFixed(4)}
                    </td>
                  </tr>
                  <tr className="border-b-0">
                    <td className={`${BIO_TABLE.bodyCell}`}>N</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.nObservations}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {chartOption && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Log-Log 산점도</h3>
              <div className="border rounded-lg bg-card max-w-lg mx-auto">
                <LazyReactECharts option={chartOption} style={{ height: 300 }} opts={{ renderer: selectScatterRenderer(chartData?.pts.length ?? 0) }} />
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>

          <div className="p-3 border rounded-lg bg-muted/30">
            <Link
              href="/bio-tools?tool=condition-factor"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowRight className="h-4 w-4" />
              비만도 (Fulton&apos;s K) 계산하러 가기
            </Link>
            {results.growthType !== 'isometric' && (
              <p className="text-xs text-muted-foreground mt-1">
                b &ne; 3이므로 Fulton&apos;s K 해석 시 주의 필요 (등성장 가정 위반)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
})

export default LengthWeightTool
