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
import { formatNumber } from '@/lib/statistics/formatters'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { BarChart3, Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildRocCurveColumns } from '@/lib/graph-studio/analysis-adapter'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statValueAxis, statTooltip } from '@/lib/charts/echarts-stat-utils'
import { resolveAxisColors, resolveChartPalette } from '@/lib/charts/chart-color-resolver'
import type { RocAucResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

function getAucInterpretation(auc: number): { label: string; style: React.CSSProperties } {
  if (auc >= 0.9) return { label: '우수 (Excellent)', style: SIGNIFICANCE_BADGE.significant }
  if (auc >= 0.8) return { label: '양호 (Good)', style: SIGNIFICANCE_BADGE.significant }
  if (auc >= 0.7) return { label: '허용 (Fair)', style: SIGNIFICANCE_BADGE.nonSignificant }
  return { label: '불량 (Poor)', style: SIGNIFICANCE_BADGE.nonSignificant }
}

export default function RocAucTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { resolvedTheme } = useTheme()
  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<RocAucResult>({ worker: PyodideWorker.Survival, initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)

  const openInGraphStudio = useOpenInGraphStudio()

  const [actualCol, setActualCol] = useState('')
  const [predCol, setPredCol] = useState('')

  const handleData = useCallback(
    (data: Parameters<typeof handleDataLoaded>[0]) => {
      handleDataLoaded(data)
      const headers = data.headers
      setActualCol(headers.find(h => /actual|true|label|class/i.test(h)) ?? headers[0] ?? '')
      setPredCol(headers.find(h => /pred|prob|score/i.test(h)) ?? headers[1] ?? '')
    },
    [handleDataLoaded],
  )

  const handleAnalyze = useCallback(() => {
    if (!csvData) return
    const actualClass = csvData.rows.map(r => Number(r[actualCol]))
    const predictedProb = csvData.rows.map(r => Number(r[predCol]))
    runAnalysis('roc_curve_analysis', { actualClass, predictedProb })
  }, [csvData, actualCol, predCol, runAnalysis])

  const handleOpenInGraphStudio = useCallback(() => {
    if (!results) return
    openInGraphStudio({
      built: buildRocCurveColumns(results),
      chartType: 'roc-curve',
      label: 'ROC 곡선',
    })
  }, [results, openInGraphStudio])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { actualCol, predCol },
    })
  }, [saveToHistory, tool, actualCol, predCol])

  const chartOption = useMemo(() => {
    if (!results) return null
    const palette = resolveChartPalette()
    const pts = results.rocPoints
    let bestJ = -1, optFpr = 0, optTpr = 0
    for (const p of pts) {
      const j = p.tpr - p.fpr
      if (j > bestJ) { bestJ = j; optFpr = p.fpr; optTpr = p.tpr }
    }
    const rocData = pts.map(p => [p.fpr, p.tpr])
    const ax = resolveAxisColors()
    return {
      ...statBaseOption(),
      grid: { left: 60, right: 30, top: 30, bottom: 60, containLabel: true },
      tooltip: statTooltip({
        formatter: (p: unknown) => {
          const params = p as { data: number[] }
          return `FPR: ${params.data[0].toFixed(3)}<br/>TPR: ${params.data[1].toFixed(3)}`
        },
      }),
      xAxis: { ...statValueAxis('False Positive Rate'), min: 0, max: 1 },
      yAxis: { ...statValueAxis('True Positive Rate'), min: 0, max: 1 },
      series: [
        {
          type: 'line',
          data: [[0, 0], [1, 1]],
          showSymbol: false,
          lineStyle: { type: 'dashed', color: ax.splitLine, width: 1 },
          silent: true,
        },
        {
          type: 'line',
          data: rocData,
          showSymbol: false,
          lineStyle: { width: 0 },
          areaStyle: { color: palette[0], opacity: 0.06 },
          silent: true,
        },
        {
          type: 'line',
          data: rocData,
          showSymbol: false,
          lineStyle: { color: palette[0], width: 2 },
          itemStyle: { color: palette[0] },
        },
        {
          type: 'scatter',
          data: [[optFpr, optTpr]],
          symbolSize: 8,
          itemStyle: { color: palette[0], borderColor: ax.tooltipBg, borderWidth: 1.5 },
        },
      ],
      graphic: [{
        type: 'text',
        right: 50,
        bottom: 70,
        style: { text: `AUC = ${formatNumber(results.auc)}`, fill: palette[0], fontSize: 14, fontWeight: 600 },
      }],
    } as Record<string, unknown>
  }, [results, resolvedTheme])

  const aucInterp = results ? getAucInterpretation(results.auc) : null

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={handleData}
        onClear={handleClear}
        description="ROC 분석 CSV (actual: 0/1, predicted_prob: 예측 확률)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex flex-wrap items-end gap-4">
          <BioColumnSelect label="실제값 열 (0/1)" headers={csvData.headers} value={actualCol} onChange={setActualCol} labelSize="xs" />
          <BioColumnSelect label="예측 확률 열" headers={csvData.headers} value={predCol} onChange={setPredCol} labelSize="xs" />
          <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
          </Button>
        </div>
      )}

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-6">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
          {/* 결과 요약 */}
          <div>
            <h3 className="text-sm font-semibold mb-2">분석 결과</h3>
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
                    <td className={BIO_TABLE.bodyCell}>AUC</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell} font-medium`}>{formatNumber(results.auc)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className={BIO_TABLE.bodyCell}>AUC 95% CI</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell}`}>
                      [{formatNumber(results.aucCI.lower)}, {formatNumber(results.aucCI.upper)}]
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className={BIO_TABLE.bodyCell}>해석</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell} font-medium`}>
                      <span
                        className={BIO_BADGE_CLASS}
                        style={aucInterp?.style}
                      >
                        {aucInterp?.label ?? ''}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className={BIO_TABLE.bodyCell}>최적 임계값 (Youden&apos;s J)</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.optimalThreshold)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className={BIO_TABLE.bodyCell}>민감도 (Sensitivity)</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.sensitivity)}</td>
                  </tr>
                  <tr className="border-b last:border-b-0">
                    <td className={BIO_TABLE.bodyCell}>특이도 (Specificity)</td>
                    <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.specificity)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ROC 곡선 */}
          {chartOption && (
            <div>
              <h3 className="text-sm font-semibold mb-2">ROC 곡선</h3>
              <div className="border rounded-lg bg-card max-w-md mx-auto">
                <LazyReactECharts option={chartOption} style={{ height: 320 }} opts={{ renderer: 'svg' }} />
              </div>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>
        </div>
      )}
    </div>
  )
}
