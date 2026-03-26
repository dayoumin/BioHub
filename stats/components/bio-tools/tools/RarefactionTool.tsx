'use client'

import { useCallback, useMemo } from 'react'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { BIO_CHART_COLORS } from '@/lib/bio-tools/bio-chart-colors'
import { BarChart3, Loader2 } from 'lucide-react'
import { useOpenInGraphStudio } from '@/hooks/use-open-in-graph-studio'
import { buildRarefactionColumns } from '@/lib/graph-studio/analysis-adapter'
import type { RarefactionResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

export default function RarefactionTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
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

  const { maxX, maxY } = useMemo(() => {
    if (!results || results.curves.length === 0) return { maxX: 0, maxY: 0 }
    return {
      maxX: Math.max(...results.curves.flatMap((c) => c.steps)),
      maxY: Math.max(...results.curves.flatMap((c) => c.expectedSpecies)),
    }
  }, [results])

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

      {results && results.curves.length > 0 && (
        <div ref={resultsRef} className="space-y-4">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
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
