'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { BioResultSummary, type MetricItem } from '@/components/common/results'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { BIO_BADGE_CLASS, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { resolveAxisColors, resolveChartPalette } from '@/lib/charts/chart-color-resolver'
import { BarChart3, Loader2 } from 'lucide-react'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildNmdsColumns } from '@/lib/graph-studio/analysis-adapter'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statValueAxis, statTooltip } from '@/lib/charts/echarts-stat-utils'
import type { NmdsResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

const STRESS_STYLES: Record<string, React.CSSProperties> = {
  excellent: SIGNIFICANCE_BADGE.significant,
  good: SIGNIFICANCE_BADGE.significant,
  fair: SIGNIFICANCE_BADGE.nonSignificant,
  poor: SIGNIFICANCE_BADGE.nonSignificant,
}

const STRESS_LABELS: Record<string, string> = {
  excellent: '우수 (< 0.05)',
  good: '양호 (< 0.1)',
  fair: '허용 (< 0.2)',
  poor: '불량 (≥ 0.2)',
}

const NmdsTool = memo(function NmdsTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { resolvedTheme } = useTheme()
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, handleClear, runWithPreStep, saveToHistory, isSaved } =
    useBioToolAnalysis<NmdsResult>({ initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)
  const openInGraphStudio = useOpenInGraphStudio()
  const [groupCol, setGroupCol] = useState<string>('')

  const handleAnalyze = useCallback(async () => {
    if (!csvData) return

    await runWithPreStep(async () => {
      const pyodide = PyodideCoreService.getInstance()
      const betaResult = await pyodide.callWorkerMethod<{
        distanceMatrix: number[][]
        siteLabels: string[]
      }>(
        PyodideWorker.Ecology,
        'beta_diversity',
        { rows: csvData.rows, site_col: siteCol },
      )

      const groups = groupCol
        ? csvData.rows.map((r) => String(r[groupCol] ?? ''))
        : null

      return {
        distance_matrix: betaResult.distanceMatrix,
        site_labels: betaResult.siteLabels,
        groups,
      }
    }, 'nmds')
  }, [csvData, siteCol, groupCol, runWithPreStep])

  const handleOpenInGraphStudio = useCallback(() => {
    if (!results) return
    openInGraphStudio({
      built: buildNmdsColumns(results),
      chartType: 'scatter',
      label: 'NMDS 좌표',
    })
  }, [results, openInGraphStudio])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { siteCol, groupCol },
    })
  }, [saveToHistory, tool, siteCol, groupCol])

  const coords = results?.coordinates ?? []

  const uniqueGroups = useMemo(
    () => (results?.groups ? [...new Set(results.groups)] : []),
    [results?.groups],
  )

  const chartOption = useMemo(() => {
    if (!results || coords.length === 0) return null
    const palette = resolveChartPalette()
    const ax = resolveAxisColors()
    const groups = uniqueGroups.length > 0 ? uniqueGroups : ['all']
    return {
      ...statBaseOption(),
      tooltip: statTooltip({
        formatter: (p: unknown) => {
          const params = p as { data: [number, number, string] }
          return `${params.data[2]}<br/>NMDS1: ${params.data[0].toFixed(3)}<br/>NMDS2: ${params.data[1].toFixed(3)}`
        },
      }),
      xAxis: statValueAxis('NMDS1'),
      yAxis: statValueAxis('NMDS2'),
      legend: {
        show: groups.length > 1 && groups[0] !== 'all',
        top: 0,
        textStyle: { fontSize: 11, color: ax.axisLabel },
      },
      series: groups.map((groupName, gi) => ({
        type: 'scatter',
        name: groupName === 'all' ? undefined : groupName,
        data: coords
          .map((c, i) => ({ coord: c, idx: i }))
          .filter(({ idx }) => !results.groups || results.groups[idx] === groupName)
          .map(({ coord, idx }) => [coord[0], coord[1], results.siteLabels[idx]]),
        symbolSize: 10,
        itemStyle: { color: palette[gi % palette.length] },
        label: {
          show: true,
          formatter: (p: unknown) => (p as { data: [number, number, string] }).data[2],
          position: 'right',
          fontSize: 9,
          color: 'inherit',
        },
      })),
    } as Record<string, unknown>
  }, [results, coords, uniqueGroups, resolvedTheme])

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
        <div className="flex flex-wrap items-center gap-4">
          <BioColumnSelect label="지점명 열" headers={csvData.headers} value={siteCol} onChange={setSiteCol} />
          <BioColumnSelect label="그룹 열 (선택)" headers={csvData.headers} value={groupCol} onChange={setGroupCol} allowNone noneLabel="없음 (단일 그룹)" />

          <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
          </Button>
        </div>
      )}

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-4">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
          <BioResultSummary
            metrics={[
              { label: 'Stress', value: results.stress, tooltip: STRESS_LABELS[results.stressInterpretation] ?? results.stressInterpretation },
              { label: '차원 수', value: coords.length > 0 ? coords[0].length : 2 },
              { label: '지점 수', value: results.siteLabels.length },
            ] satisfies MetricItem[]}
            columns={3}
          >
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Stress:</span>
            <span
              className={BIO_BADGE_CLASS}
              style={STRESS_STYLES[results.stressInterpretation] ?? {}}
            >
              {results.stress} — {STRESS_LABELS[results.stressInterpretation] ?? results.stressInterpretation}
            </span>
          </div>

          {chartOption && (
            <div className="border rounded-lg bg-card max-w-2xl">
              <LazyReactECharts option={chartOption} style={{ height: 400 }} opts={{ renderer: 'svg' }} />
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>
          </BioResultSummary>
        </div>
      )}
    </div>
  )
})

export default NmdsTool
