'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { BIO_CHART_COLORS } from '@/lib/bio-tools/bio-chart-colors'
import { AlertCircle, Loader2 } from 'lucide-react'

interface RarefactionCurve {
  siteName: string
  steps: number[]
  expectedSpecies: number[]
}

interface RarefactionResult {
  curves: RarefactionCurve[]
}

const tool = getBioToolById('rarefaction')

export default function RarefactionPage(): React.ReactElement {
  const resultsRef = useRef<HTMLDivElement>(null)
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<RarefactionResult>()

  useEffect(() => {
    if (results) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [results])

  const handleAnalyze = useCallback(() => {
    if (!csvData) return
    runAnalysis('rarefaction', { rows: csvData.rows, site_col: siteCol })
  }, [csvData, siteCol, runAnalysis])

  const { maxX, maxY } = useMemo(() => {
    if (!results || results.curves.length === 0) return { maxX: 0, maxY: 0 }
    return {
      maxX: Math.max(...results.curves.flatMap((c) => c.steps)),
      maxY: Math.max(...results.curves.flatMap((c) => c.expectedSpecies)),
    }
  }, [results])

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
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted-foreground">지점명 열:</label>
            <Select value={siteCol || undefined} onValueChange={setSiteCol}>
              <SelectTrigger className="h-8 text-sm w-[180px]">
                <SelectValue placeholder="선택..." />
              </SelectTrigger>
              <SelectContent>
                {csvData.headers.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
              {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
            </Button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {results && results.curves.length > 0 && (
          <div ref={resultsRef} className="space-y-4">
            <h3 className="text-sm font-semibold">종 희박화 곡선</h3>

            <div className="border rounded-lg p-4 bg-card">
              <svg viewBox="0 0 500 300" className="w-full max-w-2xl">
                <line x1="50" y1="250" x2="480" y2="250" stroke="currentColor" strokeOpacity={0.2} />
                <line x1="50" y1="250" x2="50" y2="20" stroke="currentColor" strokeOpacity={0.2} />
                <text x="265" y="290" textAnchor="middle" className="text-xs fill-muted-foreground" fontSize={11}>
                  개체 수
                </text>
                <text x="15" y="135" textAnchor="middle" className="text-xs fill-muted-foreground" fontSize={11}
                  transform="rotate(-90 15 135)">
                  기대 종 수
                </text>

                {results.curves.map((curve, ci) => {
                  if (curve.steps.length === 0) return null
                  const color = BIO_CHART_COLORS[ci % BIO_CHART_COLORS.length]
                  const points = curve.steps.map((s, i) => {
                    const x = 50 + (s / maxX) * 430
                    const y = 250 - (curve.expectedSpecies[i] / maxY) * 230
                    return `${x},${y}`
                  }).join(' ')

                  return (
                    <g key={curve.siteName}>
                      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
                      <text
                        x={50 + (curve.steps[curve.steps.length - 1] / maxX) * 430 + 4}
                        y={250 - (curve.expectedSpecies[curve.expectedSpecies.length - 1] / maxY) * 230}
                        fontSize={9} fill={color}
                      >
                        {curve.siteName}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>

            <p className="text-xs text-muted-foreground">
              곡선이 평탄해지면 샘플링이 충분함을 의미합니다.
            </p>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
