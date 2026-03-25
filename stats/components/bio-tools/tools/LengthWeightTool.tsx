'use client'

import { useCallback, useMemo, useState } from 'react'
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
import { BIO_CHART_COLORS } from '@/lib/bio-tools/bio-chart-colors'
import { detectLengthColumn, detectWeightColumn } from '@/lib/bio-tools/fisheries-columns'
import { cn } from '@/lib/utils'
import { ArrowRight, BarChart3, Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { useRouter } from 'next/navigation'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import { buildLengthWeightColumns } from '@/lib/graph-studio/analysis-adapter'
import { createDefaultChartSpec } from '@/lib/graph-studio/chart-spec-defaults'
import type { DataPackage } from '@/types/graph-studio'
import type { ToolComponentProps } from './types'
import type { LengthWeightResult } from '@/types/bio-tools-results'

const GROWTH_TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  isometric: { ko: '등성장', en: 'Isometric (b ≈ 3)' },
  positive_allometric: { ko: '양의 이성장', en: 'Positive allometric (b > 3)' },
  negative_allometric: { ko: '음의 이성장', en: 'Negative allometric (b < 3)' },
}

export default function LengthWeightTool({ tool, meta }: ToolComponentProps): React.ReactElement {
  const [lengthCol, setLengthCol] = useState<string>('')
  const [weightCol, setWeightCol] = useState<string>('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<LengthWeightResult>({ worker: PyodideWorker.Fisheries })
  const resultsRef = useScrollToResults(results)
  const router = useRouter()
  const loadDataPackageWithSpec = useGraphStudioStore(s => s.loadDataPackageWithSpec)

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
    const built = buildLengthWeightColumns(results)
    const pkgId = crypto.randomUUID()
    const spec = createDefaultChartSpec(pkgId, 'scatter', built.xField, built.yField, built.columns)
    spec.trendline = { type: 'linear', showEquation: true }
    const pkg: DataPackage = {
      id: pkgId,
      source: 'bio-tools',
      label: '체장-체중 관계 (Log-Log)',
      columns: built.columns,
      data: built.data,
      createdAt: new Date().toISOString(),
    }
    loadDataPackageWithSpec(pkg, spec)
    router.push('/graph-studio')
  }, [results, loadDataPackageWithSpec, router])

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
    // 회귀선 SVG 좌표 (IIFE 제거)
    const totalYRange = yMax - yMin || 1
    const regLineY1 = 250 - ((regY1 - yMin) / totalYRange) * 230
    const regLineY2 = 250 - ((regY2 - yMin) / totalYRange) * 230
    return { pts, xMin, xMax, yMin, yMax, regLineY1, regLineY2 }
  }, [results])

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

          {chartData && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Log-Log 산점도</h3>
              <div className="border rounded-lg p-4 bg-card">
                <svg viewBox="0 0 400 300" className="w-full max-w-lg mx-auto">
                  {/* 배경 */}
                  <rect x="50" y="20" width="320" height="230" fill="none" stroke="currentColor" strokeOpacity="0.2" />
                  {/* Y축 눈금 */}
                  {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                    const val = chartData.yMin + (chartData.yMax - chartData.yMin) * frac
                    return (
                      <g key={frac}>
                        {frac > 0 && frac < 1 && (
                          <line x1={50} y1={250 - frac * 230} x2={370} y2={250 - frac * 230} stroke="currentColor" strokeOpacity="0.08" />
                        )}
                        <text x="45" y={254 - frac * 230} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">
                          {val.toFixed(2)}
                        </text>
                      </g>
                    )
                  })}
                  {/* X축 눈금 */}
                  {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                    const val = chartData.xMin + (chartData.xMax - chartData.xMin) * frac
                    return (
                      <text key={frac} x={50 + frac * 320} y="268" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
                        {val.toFixed(2)}
                      </text>
                    )
                  })}
                  {/* 산점도 */}
                  {chartData.pts.map((p, i) => {
                    const xRange = chartData.xMax - chartData.xMin || 1
                    const yRange = chartData.yMax - chartData.yMin || 1
                    const x = 50 + ((p.logL - chartData.xMin) / xRange) * 320
                    const y = 250 - ((p.logW - chartData.yMin) / yRange) * 230
                    return <circle key={i} cx={x} cy={y} r="3" fill="currentColor" fillOpacity="0.3" />
                  })}
                  {/* 회귀선 */}
                  <line x1={50} y1={chartData.regLineY1} x2={370} y2={chartData.regLineY2} stroke={BIO_CHART_COLORS[0]} strokeWidth="2" />
                  {/* 수식 */}
                  <text x="60" y="38" fontSize="9" fill={BIO_CHART_COLORS[0]}>
                    log(W) = {results.logA.toFixed(3)} + {results.b.toFixed(3)} × log(L)
                  </text>
                  {/* 축 라벨 */}
                  <text x="210" y="290" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">log₁₀(Length)</text>
                  <text x="15" y="135" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6" transform="rotate(-90, 15, 135)">log₁₀(Weight)</text>
                </svg>
              </div>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>

          <div className="p-3 border rounded-lg bg-muted/30">
            <Link
              href="/bio-tools/condition-factor"
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
}
