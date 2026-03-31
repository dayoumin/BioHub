'use client'

import { useCallback, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_TABLE } from '@/components/bio-tools/bio-styles'
import { resolveChartPalette } from '@/lib/charts/chart-color-resolver'
import { detectAgeColumn, detectLengthColumn } from '@/lib/bio-tools/fisheries-columns'
import { cn } from '@/lib/utils'
import { BarChart3, Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildVbgfColumns } from '@/lib/graph-studio/analysis-adapter'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statValueAxis, statTooltip, SCATTER_LARGE_THRESHOLD, selectScatterRenderer } from '@/lib/charts/echarts-stat-utils'
import type { ToolComponentProps } from './types'

import type { VbgfResult } from '@/types/bio-tools-results'

export default function VbgfTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { resolvedTheme } = useTheme()
  const [ageCol, setAgeCol] = useState<string>('')
  const [lengthCol, setLengthCol] = useState<string>('')
  // 분석 시점의 컬럼 스냅샷 (stale scatter 방지)
  const [analyzedCols, setAnalyzedCols] = useState<{ age: string; length: string } | null>(null)

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<VbgfResult>({ worker: PyodideWorker.Fisheries, initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)
  const openInGraphStudio = useOpenInGraphStudio()

  const onDataLoaded = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    setAgeCol(detectAgeColumn(data.headers))
    setLengthCol(detectLengthColumn(data.headers))
  }, [handleDataLoaded])

  const onClear = useCallback(() => {
    handleClear()
    setAgeCol('')
    setLengthCol('')
    setAnalyzedCols(null)
  }, [handleClear])

  const handleAnalyze = useCallback(() => {
    if (!csvData || !ageCol || !lengthCol) return
    setAnalyzedCols({ age: ageCol, length: lengthCol })
    const ages = csvData.rows.map((r) => r[ageCol] as number | null)
    const lengths = csvData.rows.map((r) => r[lengthCol] as number | null)
    runAnalysis('fit_vbgf', { ages, lengths })
  }, [csvData, ageCol, lengthCol, runAnalysis])

  // 성장곡선 차트 데이터 (분석 시점 컬럼 사용)
  const chartData = useMemo(() => {
    if (!results || !csvData || !analyzedCols) return null
    const points = csvData.rows
      .map(r => ({ age: r[analyzedCols.age], length: r[analyzedCols.length] }))
      .filter(p => p.age != null && p.age !== '' && p.length != null && p.length !== '')
      .map(p => ({ age: Number(p.age), length: Number(p.length) }))
      .filter(p => !isNaN(p.age) && !isNaN(p.length))
    if (points.length === 0) return null

    let ageMin = Infinity, ageMax = -Infinity, lengthMax = -Infinity
    for (const p of points) {
      if (p.age < ageMin) ageMin = p.age
      if (p.age > ageMax) ageMax = p.age
      if (p.length > lengthMax) lengthMax = p.length
    }
    if (ageMin === ageMax) { ageMin -= 0.5; ageMax += 0.5 }

    // VBGF 적합곡선: L(t) = Linf * (1 - exp(-K * (t - t0)))
    const N_CURVE = 50
    const curvePoints: { t: number; l: number }[] = []
    let curveMax = 0
    for (let i = 0; i <= N_CURVE; i++) {
      const t = ageMin + (ageMax - ageMin) * (i / N_CURVE)
      const l = results.lInf * (1 - Math.exp(-results.k * (t - results.t0)))
      curvePoints.push({ t, l })
      if (l > curveMax) curveMax = l
    }

    const yMax = Math.max(lengthMax, curveMax, 0.1) * 1.1
    return { points, ageMin, ageMax, yMax, curvePoints }
  }, [results, csvData, analyzedCols])

  const chartOption = useMemo(() => {
    if (!chartData) return null
    const palette = resolveChartPalette()
    return {
      ...statBaseOption(),
      tooltip: statTooltip(),
      xAxis: { ...statValueAxis('Age'), min: chartData.ageMin, max: chartData.ageMax },
      yAxis: { ...statValueAxis('Length'), max: chartData.yMax },
      series: [
        {
          type: 'scatter',
          data: chartData.points.map(p => [p.age, p.length]),
          symbolSize: 6,
          itemStyle: { color: palette[0], opacity: 0.3 },
          large: true,
          largeThreshold: SCATTER_LARGE_THRESHOLD,
        },
        {
          type: 'line',
          data: chartData.curvePoints.map(p => [p.t, p.l]),
          smooth: true,
          showSymbol: false,
          lineStyle: { color: palette[0], width: 2 },
          itemStyle: { color: palette[0] },
        },
      ],
    } as Record<string, unknown>
  }, [chartData, resolvedTheme])

  const handleOpenInGraphStudio = useCallback(() => {
    if (!results || !chartData) return
    openInGraphStudio({
      built: buildVbgfColumns(results, chartData.points),
      chartType: 'scatter',
      label: 'VBGF 성장곡선',
    })
  }, [results, chartData, openInGraphStudio])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { ageCol, lengthCol },
    })
  }, [saveToHistory, tool, ageCol, lengthCol])

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={onDataLoaded}
        onClear={onClear}
        description="CSV (연령 열 + 체장 열 포함)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex flex-wrap items-center gap-4">
          <BioColumnSelect label="연령 열" headers={csvData.headers} value={ageCol} onChange={setAgeCol} width={160} />
          <BioColumnSelect label="체장 열" headers={csvData.headers} value={lengthCol} onChange={setLengthCol} width={160} />
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !ageCol || !lengthCol || ageCol === lengthCol}
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
          <div>
            <h3 className="text-sm font-semibold mb-2">파라미터 추정</h3>
            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                    <th className={`text-left ${BIO_TABLE.headerCell}`}>파라미터</th>
                    <th className={`text-left ${BIO_TABLE.headerCell}`}>단위</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>추정값</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>SE</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>95% CI</th>
                  </tr>
                </thead>
                <tbody>
                  {results.parameterTable.map((p) => (
                    <tr key={p.name} className="border-b last:border-b-0">
                      <td className={`${BIO_TABLE.bodyCell} font-medium`}>{p.name}</td>
                      <td className={`${BIO_TABLE.bodyCell} text-muted-foreground`}>{p.unit}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{p.estimate.toFixed(4)}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{p.standardError.toFixed(4)}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>
                        [{p.ciLower.toFixed(4)}, {p.ciUpper.toFixed(4)}]
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {chartOption && (
            <div>
              <h3 className="text-sm font-semibold mb-2">성장곡선</h3>
              <div className="border rounded-lg bg-card max-w-lg mx-auto">
                <LazyReactECharts option={chartOption} style={{ height: 300 }} opts={{ renderer: selectScatterRenderer(chartData?.points.length ?? 0) }} />
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>

          <div>
            <h3 className="text-sm font-semibold mb-2">적합도</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground">R²</div>
                <div className="text-lg font-semibold font-mono">{results.rSquared.toFixed(4)}</div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground">AIC</div>
                <div className="text-lg font-semibold font-mono">
                  {results.aic != null ? results.aic.toFixed(2) : '—'}
                </div>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="text-xs text-muted-foreground">N</div>
                <div className="text-lg font-semibold font-mono">{results.nObservations}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
