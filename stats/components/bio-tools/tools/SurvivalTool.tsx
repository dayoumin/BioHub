'use client'

import { memo, useCallback, useMemo, useState } from 'react'
import { useTheme } from 'next-themes'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { formatNumber, formatPValue } from '@/lib/statistics/formatters'
import { resolveAxisColors, resolveChartPalette } from '@/lib/charts/chart-color-resolver'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { BarChart3, Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildKmCurveColumns } from '@/lib/graph-studio/analysis-adapter'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { statBaseOption, statValueAxis, statTooltip } from '@/lib/charts/echarts-stat-utils'
import type { SurvivalResult, KmCurve } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

const SurvivalTool = memo(function SurvivalTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { resolvedTheme } = useTheme()
  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<SurvivalResult>({ worker: PyodideWorker.Survival, initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)

  const openInGraphStudio = useOpenInGraphStudio()

  const [timeCol, setTimeCol] = useState('')
  const [eventCol, setEventCol] = useState('')
  const [groupCol, setGroupCol] = useState('')

  const handleData = useCallback(
    (data: Parameters<typeof handleDataLoaded>[0]) => {
      handleDataLoaded(data)
      const headers = data.headers
      setTimeCol(headers.find(h => /time|duration|day/i.test(h)) ?? headers[0] ?? '')
      setEventCol(headers.find(h => /event|status|censor/i.test(h)) ?? headers[1] ?? '')
      setGroupCol(headers.find(h => /group|treatment|arm/i.test(h)) ?? '')
    },
    [handleDataLoaded],
  )

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { timeCol, eventCol, groupCol },
    })
  }, [saveToHistory, tool, timeCol, eventCol, groupCol])

  const handleAnalyze = useCallback(() => {
    if (!csvData) return
    const time = csvData.rows.map(r => Number(r[timeCol]))
    const event = csvData.rows.map(r => Number(r[eventCol]))
    const group = groupCol ? csvData.rows.map(r => String(r[groupCol])) : null

    runAnalysis('kaplan_meier_analysis', { time, event, group })
  }, [csvData, timeCol, eventCol, groupCol, runAnalysis])

  const handleOpenInGraphStudio = useCallback(() => {
    if (!results) return
    openInGraphStudio({
      built: buildKmCurveColumns(results),
      chartType: 'km-curve',
      label: 'Kaplan-Meier 생존 곡선',
    })
  }, [results, openInGraphStudio])

  const curveEntries = useMemo(
    () => (results ? Object.entries(results.curves) : []) as [string, KmCurve][],
    [results],
  )

  const chartOption = useMemo(() => {
    if (!results || curveEntries.length === 0) return null
    const palette = resolveChartPalette()
    const ax = resolveAxisColors()

    const series: Record<string, unknown>[] = []

    for (let gi = 0; gi < curveEntries.length; gi++) {
      const [groupName, curve] = curveEntries[gi]
      const color = palette[gi % palette.length]

      // CI lower bound (invisible stack base)
      series.push({
        type: 'line', step: 'end',
        data: curve.time.map((t, i) => [t, curve.ciLo[i]]),
        lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 },
        stack: `ci-${gi}`, symbol: 'none', silent: true,
        tooltip: { show: false },
      })
      // CI band (upper - lower)
      series.push({
        type: 'line', step: 'end',
        data: curve.time.map((t, i) => [t, curve.ciHi[i] - curve.ciLo[i]]),
        lineStyle: { opacity: 0 }, areaStyle: { color, opacity: 0.1 },
        stack: `ci-${gi}`, symbol: 'none', silent: true,
        tooltip: { show: false },
      })
      // KM curve
      series.push({
        type: 'line', step: 'end', name: groupName,
        data: curve.time.map((t, i) => [t, curve.survival[i]]),
        showSymbol: false,
        lineStyle: { color, width: 2 }, itemStyle: { color },
      })
      // Censoring markers
      if (curve.censored.length > 0) {
        const censorData = curve.censored.map(ct => {
          let surv = 1.0
          for (let i = 0; i < curve.time.length; i++) {
            if (curve.time[i] <= ct) surv = curve.survival[i]
            else break
          }
          return [ct, surv]
        })
        series.push({
          type: 'scatter', data: censorData,
          symbol: 'path://M-3,0L3,0M0,-3L0,3', symbolSize: 8,
          itemStyle: { color }, silent: true,
        })
      }
    }

    return {
      ...statBaseOption(),
      tooltip: statTooltip({ trigger: 'axis' }),
      xAxis: statValueAxis('Time'),
      yAxis: { ...statValueAxis('Survival Probability'), min: 0, max: 1 },
      legend: {
        show: curveEntries.length > 1,
        top: 0,
        textStyle: { fontSize: 11, color: ax.axisLabel },
      },
      series,
    } as Record<string, unknown>
  }, [results, curveEntries, resolvedTheme])

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={handleData}
        onClear={handleClear}
        description="생존 분석 CSV (time, event, group 열)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex flex-wrap items-end gap-4">
          <BioColumnSelect label="시간 열" headers={csvData.headers} value={timeCol} onChange={setTimeCol} labelSize="xs" />
          <BioColumnSelect label="사건 열 (1=사건, 0=중도절단)" headers={csvData.headers} value={eventCol} onChange={setEventCol} labelSize="xs" />
          <BioColumnSelect label="그룹 열 (선택)" headers={csvData.headers} value={groupCol} onChange={setGroupCol} labelSize="xs" allowNone noneLabel="없음 (단일 그룹)" />
          <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
          </Button>
        </div>
      )}

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-6">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
          {/* Log-rank 결과 */}
          {results.logRankP !== null && (
            <div className="flex items-center gap-4 p-3 rounded-lg border bg-card">
              <span className="text-sm text-muted-foreground">Log-rank 검정:</span>
              <span className="text-sm font-semibold">
                p = {formatPValue(results.logRankP)}
              </span>
              <span
                className={BIO_BADGE_CLASS}
                style={results.logRankP < 0.05 ? SIGNIFICANCE_BADGE.significant : SIGNIFICANCE_BADGE.nonSignificant}
              >
                {results.logRankP < 0.05 ? '유의함' : '유의하지 않음'}
              </span>
            </div>
          )}

          {/* Kaplan-Meier 곡선 */}
          {chartOption && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Kaplan-Meier 생존 곡선</h3>
              <div className="border rounded-lg bg-card max-w-lg mx-auto">
                <LazyReactECharts option={chartOption} style={{ height: 300 }} opts={{ renderer: 'svg' }} />
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>

          {/* 그룹별 요약 */}
          <div>
            <h3 className="text-sm font-semibold mb-2">그룹별 요약</h3>
            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                    <th className={`text-left ${BIO_TABLE.headerCell}`}>그룹</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>중앙 생존 시간</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>관측 수</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>사건 수</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>중도절단 수</th>
                  </tr>
                </thead>
                <tbody>
                  {curveEntries.map(([groupName, curve]) => {
                    const nTotal = curve.atRisk[0]
                    const nCensored = curve.censored.length
                    return (
                      <tr key={groupName} className="border-b last:border-b-0">
                        <td className={`${BIO_TABLE.bodyCell} font-medium`}>{groupName}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>
                          {curve.medianSurvival !== null ? formatNumber(curve.medianSurvival) : '—'}
                        </td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{nTotal}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{curve.nEvents}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{nCensored}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default SurvivalTool
