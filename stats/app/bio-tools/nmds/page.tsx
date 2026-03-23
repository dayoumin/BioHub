'use client'

import { useCallback, useMemo, useState } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { BIO_CHART_COLORS } from '@/lib/bio-tools/bio-chart-colors'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface NmdsResult {
  coordinates: number[][]
  stress: number
  stressInterpretation: string
  siteLabels: string[]
  groups: string[] | null
}

const STRESS_COLORS: Record<string, string> = {
  excellent: 'text-green-600',
  good: 'text-blue-600',
  fair: 'text-yellow-600',
  poor: 'text-red-600',
}

const STRESS_LABELS: Record<string, string> = {
  excellent: '우수 (< 0.05)',
  good: '양호 (< 0.1)',
  fair: '허용 (< 0.2)',
  poor: '불량 (≥ 0.2)',
}

const tool = getBioToolById('nmds')

export default function NmdsPage(): React.ReactElement {
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, handleClear, setError, runAnalysis } =
    useBioToolAnalysis<NmdsResult>()
  const [groupCol, setGroupCol] = useState<string>('')

  const handleAnalyze = useCallback(async () => {
    if (!csvData) return
    setError(null)

    try {
      const pyodide = PyodideCoreService.getInstance()

      // Beta Diversity → 거리행렬
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

      await runAnalysis('nmds', {
        distance_matrix: betaResult.distanceMatrix,
        site_labels: betaResult.siteLabels,
        groups,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '거리행렬 계산 중 오류가 발생했습니다')
    }
  }, [csvData, siteCol, groupCol, setError, runAnalysis])

  const coords = results?.coordinates ?? []

  const bounds = useMemo(() => {
    if (coords.length === 0) return { minX: 0, maxX: 1, minY: 0, maxY: 1, rangeX: 1, rangeY: 1 }
    const xs = coords.map((c) => c[0])
    const ys = coords.map((c) => c[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    return { minX, maxX, minY, maxY, rangeX: maxX - minX || 1, rangeY: maxY - minY || 1 }
  }, [coords])

  const uniqueGroups = useMemo(
    () => (results?.groups ? [...new Set(results.groups)] : []),
    [results?.groups],
  )

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={handleDataLoaded}
          onClear={handleClear}
          description="종×지점 행렬 CSV (행=지점, 열=종)"
        />

        {csvData && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-muted-foreground">지점명 열:</label>
            <select
              value={siteCol}
              onChange={(e) => setSiteCol(e.target.value)}
              className="text-sm border rounded-md px-2 py-1 bg-background"
            >
              {csvData.headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <label className="text-sm text-muted-foreground">그룹 열 (선택):</label>
            <select
              value={groupCol}
              onChange={(e) => setGroupCol(e.target.value)}
              className="text-sm border rounded-md px-2 py-1 bg-background"
            >
              <option value="">없음</option>
              {csvData.headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
              {isAnalyzing ? '분석 중...' : '분석 실행'}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {results && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Stress:</span>
              <span className={`text-sm font-semibold ${STRESS_COLORS[results.stressInterpretation] ?? ''}`}>
                {results.stress} — {STRESS_LABELS[results.stressInterpretation] ?? results.stressInterpretation}
              </span>
            </div>

            <div className="border rounded-lg p-4 bg-card">
              <svg viewBox="0 0 500 400" className="w-full max-w-2xl">
                <line x1="50" y1="350" x2="480" y2="350" stroke="currentColor" strokeOpacity={0.15} />
                <line x1="50" y1="350" x2="50" y2="20" stroke="currentColor" strokeOpacity={0.15} />
                <text x="265" y="385" textAnchor="middle" fontSize={11} className="fill-muted-foreground">NMDS1</text>
                <text x="15" y="185" textAnchor="middle" fontSize={11} className="fill-muted-foreground"
                  transform="rotate(-90 15 185)">NMDS2</text>

                {coords.map((c, i) => {
                  const sx = 60 + ((c[0] - bounds.minX) / bounds.rangeX) * 400
                  const sy = 340 - ((c[1] - bounds.minY) / bounds.rangeY) * 310
                  const groupIdx = results.groups
                    ? uniqueGroups.indexOf(results.groups[i])
                    : 0
                  const color = BIO_CHART_COLORS[groupIdx % BIO_CHART_COLORS.length]

                  return (
                    <g key={i}>
                      <circle cx={sx} cy={sy} r={5} fill={color} opacity={0.8} />
                      <text x={sx + 7} y={sy + 3} fontSize={8} fill={color}>
                        {results.siteLabels[i]}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            {uniqueGroups.length > 0 && (
              <div className="flex gap-4">
                {uniqueGroups.map((g, i) => (
                  <div key={g} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: BIO_CHART_COLORS[i % BIO_CHART_COLORS.length] }}
                    />
                    {g}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
