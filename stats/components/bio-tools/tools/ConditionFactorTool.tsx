'use client'

import { useCallback, useMemo, useState } from 'react'
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
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildConditionFactorColumns } from '@/lib/graph-studio/analysis-adapter'
import type { VLineAnnotation } from '@/types/graph-studio'
import type { ToolComponentProps } from './types'
import type { ConditionFactorResult } from '@/types/bio-tools-results'

export default function ConditionFactorTool({ tool, meta }: ToolComponentProps): React.ReactElement {
  const [lengthCol, setLengthCol] = useState<string>('')
  const [weightCol, setWeightCol] = useState<string>('')
  const [groupCol, setGroupCol] = useState<string>('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<ConditionFactorResult>({ worker: PyodideWorker.Fisheries })
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
      { type: 'vline', value: results.mean, text: `Mean = ${results.mean.toFixed(4)}`, color: '#E64B35' },
      { type: 'vline', value: results.median, text: `Median = ${results.median.toFixed(4)}`, color: '#4DBBD5', strokeDash: [4, 3] },
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
    // 참조선 SVG X좌표 (IIFE 제거)
    const range = kMax - kMin || 1
    const meanX = 50 + ((results.mean - kMin) / range) * 320
    const medianX = 50 + ((results.median - kMin) / range) * 320
    return { kMin, kMax, nBins, binWidth, bins, maxCount, meanX, medianX }
  }, [results])

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
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} />
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

          {histData && (
            <div>
              <h3 className="text-sm font-semibold mb-2">K 분포</h3>
              <div className="border rounded-lg p-4 bg-card">
                <svg viewBox="0 0 400 300" className="w-full max-w-lg mx-auto">
                  {/* 배경 */}
                  <rect x="50" y="20" width="320" height="230" fill="none" stroke="currentColor" strokeOpacity="0.2" />
                  {/* Y축 눈금 */}
                  {[0.25, 0.5, 0.75, 1].map(frac => (
                    <g key={frac}>
                      <line x1={50} y1={250 - frac * 230} x2={370} y2={250 - frac * 230} stroke="currentColor" strokeOpacity="0.08" />
                      <text x="45" y={254 - frac * 230} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">
                        {Math.round(histData.maxCount * frac)}
                      </text>
                    </g>
                  ))}
                  <text x="45" y="254" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">0</text>
                  {/* X축 눈금 */}
                  {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                    const val = histData.kMin + (histData.kMax - histData.kMin) * frac
                    return (
                      <text key={frac} x={50 + frac * 320} y="268" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
                        {val.toFixed(2)}
                      </text>
                    )
                  })}
                  {/* 히스토그램 막대 */}
                  {histData.bins.map((count, i) => {
                    const barW = 320 / histData.nBins
                    const barH = histData.maxCount > 0 ? (count / histData.maxCount) * 230 : 0
                    return (
                      <rect
                        key={i}
                        x={50 + i * barW + 1}
                        y={250 - barH}
                        width={Math.max(barW - 2, 1)}
                        height={barH}
                        fill={BIO_CHART_COLORS[0]}
                        fillOpacity="0.6"
                        stroke={BIO_CHART_COLORS[0]}
                        strokeWidth="0.5"
                      />
                    )
                  })}
                  {/* Mean/Median 참조선 */}
                  <line x1={histData.meanX} y1={20} x2={histData.meanX} y2={250} stroke={BIO_CHART_COLORS[1]} strokeWidth="1.5" />
                  <line x1={histData.medianX} y1={20} x2={histData.medianX} y2={250} stroke={BIO_CHART_COLORS[2]} strokeWidth="1.5" strokeDasharray="4 3" />
                  {/* 범례 */}
                  <line x1={60} y1={32} x2={78} y2={32} stroke={BIO_CHART_COLORS[1]} strokeWidth="1.5" />
                  <text x={82} y={36} fontSize="9" fill="currentColor">Mean</text>
                  <line x1={120} y1={32} x2={138} y2={32} stroke={BIO_CHART_COLORS[2]} strokeWidth="1.5" strokeDasharray="4 3" />
                  <text x={142} y={36} fontSize="9" fill="currentColor">Median</text>
                  {/* 축 라벨 */}
                  <text x="210" y="290" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">Condition Factor (K)</text>
                  <text x="15" y="135" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6" transform="rotate(-90, 15, 135)">Frequency</text>
                </svg>
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
        </div>
      )}
    </div>
  )
}
