'use client'

import { useCallback, useMemo, useState } from 'react'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_TABLE } from '@/components/bio-tools/bio-styles'
import { BIO_CHART_COLORS } from '@/lib/bio-tools/bio-chart-colors'
import { detectAgeColumn, detectLengthColumn } from '@/lib/bio-tools/fisheries-columns'
import { cn } from '@/lib/utils'
import { BarChart3, Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { useRouter } from 'next/navigation'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import { buildVbgfColumns } from '@/lib/graph-studio/analysis-adapter'
import { createDefaultChartSpec } from '@/lib/graph-studio/chart-spec-defaults'
import type { DataPackage } from '@/types/graph-studio'
import type { ToolComponentProps } from './types'

import type { VbgfResult } from '@/types/bio-tools-results'

export default function VbgfTool({ tool, meta }: ToolComponentProps): React.ReactElement {
  const [ageCol, setAgeCol] = useState<string>('')
  const [lengthCol, setLengthCol] = useState<string>('')
  // 분석 시점의 컬럼 스냅샷 (stale scatter 방지)
  const [analyzedCols, setAnalyzedCols] = useState<{ age: string; length: string } | null>(null)

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<VbgfResult>({ worker: PyodideWorker.Fisheries })
  const resultsRef = useScrollToResults(results)
  const router = useRouter()
  const loadDataPackageWithSpec = useGraphStudioStore(s => s.loadDataPackageWithSpec)

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

  const handleOpenInGraphStudio = useCallback(() => {
    if (!results || !csvData || !analyzedCols) return
    const observedData = csvData.rows
      .map(r => ({ age: r[analyzedCols.age], length: r[analyzedCols.length] }))
      .filter(p => p.age != null && p.age !== '' && p.length != null && p.length !== '')
      .map(p => ({ age: Number(p.age), length: Number(p.length) }))
      .filter(p => !isNaN(p.age) && !isNaN(p.length))
    const built = buildVbgfColumns(results, observedData)
    const pkgId = crypto.randomUUID()
    const spec = createDefaultChartSpec(pkgId, 'scatter', built.xField, built.yField, built.columns)
    spec.encoding.color = { field: built.colorField, type: 'nominal' }
    const pkg: DataPackage = {
      id: pkgId,
      source: 'bio-tools',
      label: 'VBGF 성장곡선',
      columns: built.columns,
      data: built.data,
      createdAt: new Date().toISOString(),
    }
    loadDataPackageWithSpec(pkg, spec)
    router.push('/graph-studio')
  }, [results, csvData, analyzedCols, loadDataPackageWithSpec, router])

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

          {chartData && (
            <div>
              <h3 className="text-sm font-semibold mb-2">성장곡선</h3>
              <div className="border rounded-lg p-4 bg-card">
                <svg viewBox="0 0 400 300" className="w-full max-w-lg mx-auto">
                  {/* 배경 */}
                  <rect x="50" y="20" width="320" height="230" fill="none" stroke="currentColor" strokeOpacity="0.2" />
                  {/* Y축 그리드 */}
                  {[0.2, 0.4, 0.6, 0.8].map(frac => (
                    <g key={frac}>
                      <line x1={50} y1={250 - frac * 230} x2={370} y2={250 - frac * 230} stroke="currentColor" strokeOpacity="0.08" />
                      <text x="45" y={254 - frac * 230} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">
                        {(chartData.yMax * frac).toFixed(0)}
                      </text>
                    </g>
                  ))}
                  <text x="45" y="24" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">
                    {chartData.yMax.toFixed(0)}
                  </text>
                  <text x="45" y="254" textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">0</text>
                  {/* X축 눈금 */}
                  {[0, 0.25, 0.5, 0.75, 1].map(frac => {
                    const val = chartData.ageMin + (chartData.ageMax - chartData.ageMin) * frac
                    return (
                      <text key={frac} x={50 + frac * 320} y="268" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
                        {val.toFixed(1)}
                      </text>
                    )
                  })}
                  {/* 산점도 (관측값) */}
                  {chartData.points.map((p, i) => {
                    const x = 50 + ((p.age - chartData.ageMin) / (chartData.ageMax - chartData.ageMin || 1)) * 320
                    const y = 250 - (p.length / chartData.yMax) * 230
                    return <circle key={i} cx={x} cy={y} r="3" fill="currentColor" fillOpacity="0.3" />
                  })}
                  {/* 적합곡선 */}
                  <polyline
                    points={chartData.curvePoints.map(p => {
                      const x = 50 + ((p.t - chartData.ageMin) / (chartData.ageMax - chartData.ageMin || 1)) * 320
                      const y = 250 - (p.l / chartData.yMax) * 230
                      return `${x},${y}`
                    }).join(' ')}
                    fill="none"
                    stroke={BIO_CHART_COLORS[0]}
                    strokeWidth="2"
                  />
                  {/* 축 라벨 */}
                  <text x="210" y="290" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">Age</text>
                  <text x="15" y="135" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6" transform="rotate(-90, 15, 135)">Length</text>
                </svg>
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
