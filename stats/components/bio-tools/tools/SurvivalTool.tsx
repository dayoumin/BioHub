'use client'

import { useCallback, useMemo, useState } from 'react'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { formatNumber, formatPValue } from '@/lib/statistics/formatters'
import { BIO_CHART_COLORS } from '@/lib/bio-tools/bio-chart-colors'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { BarChart3, Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildKmCurveColumns } from '@/lib/graph-studio/analysis-adapter'
import type { SurvivalResult, KmCurve } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

export default function SurvivalTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
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

  const { curveEntries, maxTime } = useMemo(() => {
    if (!results) return { curveEntries: [] as [string, KmCurve][], maxTime: 0 }
    const entries = Object.entries(results.curves)
    let max = 0
    for (const [, c] of entries) {
      for (const t of c.time) {
        if (t > max) max = t
      }
    }
    return { curveEntries: entries, maxTime: max }
  }, [results])

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
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} />
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

          {/* Kaplan-Meier 곡선 (SVG) */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Kaplan-Meier 생존 곡선</h3>
            <div className="border rounded-lg p-4 bg-card">
              <svg viewBox="0 0 400 300" className="w-full max-w-lg mx-auto">
                {/* 배경 */}
                <rect x="50" y="10" width="320" height="240" fill="none" stroke="currentColor" strokeOpacity="0.2" />

                {/* 그리드 */}
                {[0.2, 0.4, 0.6, 0.8].map(v => (
                  <g key={v}>
                    <line
                      x1={50} y1={250 - v * 240} x2={370} y2={250 - v * 240}
                      stroke="currentColor" strokeOpacity="0.08"
                    />
                    <text x="45" y={254 - v * 240} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">
                      {v.toFixed(1)}
                    </text>
                  </g>
                ))}
                <text x="45" y="14" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">1.0</text>
                <text x="45" y="254" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">0.0</text>

                {/* X축 눈금 */}
                {maxTime > 0 && [0, 0.25, 0.5, 0.75, 1].map(frac => {
                  const timeVal = Math.round(frac * maxTime)
                  return (
                    <text key={frac} x={50 + frac * 320} y="268" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
                      {timeVal}
                    </text>
                  )
                })}

                {/* 곡선 */}
                {curveEntries.map(([groupName, curve], gi) => {
                  const color = BIO_CHART_COLORS[gi % BIO_CHART_COLORS.length]
                  const toX = (t: number): number => 50 + (t / maxTime) * 320
                  const toY = (s: number): number => 250 - s * 240

                  // 계단 함수 포인트 생성
                  const stepPoints: string[] = []
                  for (let i = 0; i < curve.time.length; i++) {
                    if (i === 0) {
                      stepPoints.push(`${toX(curve.time[i])},${toY(curve.survival[i])}`)
                    } else {
                      // 수평선 → 수직선 (계단)
                      stepPoints.push(`${toX(curve.time[i])},${toY(curve.survival[i - 1])}`)
                      stepPoints.push(`${toX(curve.time[i])},${toY(curve.survival[i])}`)
                    }
                  }

                  // CI 영역 (위쪽 + 아래쪽)
                  const ciUpperPoints: string[] = []
                  const ciLowerPoints: string[] = []
                  for (let i = 0; i < curve.time.length; i++) {
                    if (i > 0) {
                      ciUpperPoints.push(`${toX(curve.time[i])},${toY(curve.ciHi[i - 1])}`)
                      ciLowerPoints.push(`${toX(curve.time[i])},${toY(curve.ciLo[i - 1])}`)
                    }
                    ciUpperPoints.push(`${toX(curve.time[i])},${toY(curve.ciHi[i])}`)
                    ciLowerPoints.push(`${toX(curve.time[i])},${toY(curve.ciLo[i])}`)
                  }
                  const ciPath = [...ciUpperPoints, ...ciLowerPoints.reverse()].join(' ')

                  return (
                    <g key={groupName}>
                      {/* CI 밴드 */}
                      <polygon points={ciPath} fill={color} fillOpacity="0.1" />
                      {/* KM 곡선 */}
                      <polyline
                        points={stepPoints.join(' ')}
                        fill="none"
                        stroke={color}
                        strokeWidth="2"
                      />
                      {/* 중도절단 마커 (+) */}
                      {curve.censored.map((ct, ci) => {
                        // 중도절단 시점의 생존율 찾기
                        let survAtCensor = 1.0
                        for (let i = 0; i < curve.time.length; i++) {
                          if (curve.time[i] <= ct) survAtCensor = curve.survival[i]
                          else break
                        }
                        return (
                          <g key={`${groupName}-c-${ci}`}>
                            <line
                              x1={toX(ct) - 3} y1={toY(survAtCensor)}
                              x2={toX(ct) + 3} y2={toY(survAtCensor)}
                              stroke={color} strokeWidth="1.5"
                            />
                            <line
                              x1={toX(ct)} y1={toY(survAtCensor) - 3}
                              x2={toX(ct)} y2={toY(survAtCensor) + 3}
                              stroke={color} strokeWidth="1.5"
                            />
                          </g>
                        )
                      })}
                    </g>
                  )
                })}

                {/* 범례 */}
                {curveEntries.length > 1 && curveEntries.map(([groupName], gi) => (
                  <g key={`legend-${groupName}`}>
                    <line
                      x1={60} y1={22 + gi * 16}
                      x2={78} y2={22 + gi * 16}
                      stroke={BIO_CHART_COLORS[gi % BIO_CHART_COLORS.length]}
                      strokeWidth="2"
                    />
                    <text x={82} y={26 + gi * 16} fontSize="10" fill="currentColor">
                      {groupName}
                    </text>
                  </g>
                ))}

                {/* 축 라벨 */}
                <text x="210" y="290" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">
                  Time
                </text>
                <text
                  x="15" y="130" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6"
                  transform="rotate(-90, 15, 130)"
                >
                  Survival Probability
                </text>
              </svg>
            </div>
          </div>

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
}
