'use client'

import { useCallback, useMemo } from 'react'
import { useTheme } from 'next-themes'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { resolveAxisColors, resolveChartPalette } from '@/lib/charts/chart-color-resolver'
import { BarChart3, Loader2 } from 'lucide-react'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildRarefactionColumns } from '@/lib/graph-studio/analysis-adapter'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statValueAxis, statTooltip } from '@/lib/charts/echarts-stat-utils'
import type { RarefactionResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

export default function RarefactionTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { resolvedTheme } = useTheme()
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<RarefactionResult>({ initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)
  const openInGraphStudio = useOpenInGraphStudio()

  const handleOpenInGraphStudio = useCallback(() => {
    if (!results) return
    openInGraphStudio({
      built: buildRarefactionColumns(results),
      chartType: 'line',
      label: '종 희박화 곡선',
    })
  }, [results, openInGraphStudio])

  const handleAnalyze = useCallback(() => {
    if (!csvData) return
    runAnalysis('rarefaction', { rows: csvData.rows, site_col: siteCol })
  }, [csvData, siteCol, runAnalysis])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { siteCol },
    })
  }, [saveToHistory, tool, siteCol])

  const chartOption = useMemo(() => {
    if (!results || results.curves.length === 0) return null
    const palette = resolveChartPalette()
    const ax = resolveAxisColors()
    return {
      ...statBaseOption(),
      tooltip: statTooltip({ trigger: 'axis' }),
      xAxis: statValueAxis('개체 수'),
      yAxis: statValueAxis('기대 종 수'),
      legend: {
        show: results.curves.length > 1,
        top: 0,
        textStyle: { fontSize: 11, color: ax.axisLabel },
      },
      series: results.curves.map((curve, i) => ({
        type: 'line',
        name: curve.siteName,
        data: curve.steps.map((s, j) => [s, curve.expectedSpecies[j]]),
        showSymbol: false,
        lineStyle: { width: 2 },
        itemStyle: { color: palette[i % palette.length] },
      })),
    } as Record<string, unknown>
  }, [results, resolvedTheme])

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={handleDataLoaded}
        onClear={handleClear}
        description="종×지점 행렬 CSV (행=지점, 열=종)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex items-center gap-4">
          <BioColumnSelect label="지점명 열" headers={csvData.headers} value={siteCol} onChange={setSiteCol} />
          <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
          </Button>
        </div>
      )}

      <BioErrorBanner error={error} />

      {results && chartOption && (
        <div ref={resultsRef} className="space-y-4">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
          <h3 className="text-sm font-semibold">종 희박화 곡선</h3>

          <div className="border rounded-lg bg-card max-w-2xl">
            <LazyReactECharts option={chartOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
          </div>

          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>

          <p className="text-xs text-muted-foreground">
            곡선이 평탄해지면 샘플링이 충분함을 의미합니다.
          </p>
        </div>
      )}
    </div>
  )
}
