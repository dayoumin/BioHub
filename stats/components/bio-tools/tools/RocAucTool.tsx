'use client'

import { useCallback, useMemo, useState } from 'react'
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
import { useRouter } from 'next/navigation'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import { buildRocCurveColumns } from '@/lib/graph-studio/analysis-adapter'
import { createDefaultChartSpec } from '@/lib/graph-studio/chart-spec-defaults'
import type { DataPackage } from '@/types/graph-studio'
import type { RocAucResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

function getAucInterpretation(auc: number): { label: string; style: React.CSSProperties } {
  if (auc >= 0.9) return { label: '우수 (Excellent)', style: SIGNIFICANCE_BADGE.significant }
  if (auc >= 0.8) return { label: '양호 (Good)', style: SIGNIFICANCE_BADGE.significant }
  if (auc >= 0.7) return { label: '허용 (Fair)', style: SIGNIFICANCE_BADGE.nonSignificant }
  return { label: '불량 (Poor)', style: SIGNIFICANCE_BADGE.nonSignificant }
}

export default function RocAucTool({ tool, meta }: ToolComponentProps): React.ReactElement {
  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<RocAucResult>({ worker: PyodideWorker.Survival })
  const resultsRef = useScrollToResults(results)

  const router = useRouter()
  const loadDataPackageWithSpec = useGraphStudioStore(s => s.loadDataPackageWithSpec)

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
    // RocAucResult는 RocCurveAnalysisResult와 구조적으로 동일
    const built = buildRocCurveColumns(results)
    const pkgId = crypto.randomUUID()
    const spec = createDefaultChartSpec(pkgId, 'roc-curve', built.xField, built.yField, built.columns)
    const pkg: DataPackage = {
      id: pkgId,
      source: 'bio-tools',
      label: 'ROC 곡선',
      columns: built.columns,
      data: built.data,
      createdAt: new Date().toISOString(),
    }
    loadDataPackageWithSpec(pkg, spec)
    router.push('/graph-studio')
  }, [results, loadDataPackageWithSpec, router])

  // ROC SVG 데이터: 1회 패스로 polygon, polyline, optimal point 계산
  const rocSvg = useMemo(() => {
    if (!results) return null
    const pts = results.rocPoints
    const polygonParts: string[] = ['40,270']
    const polylineParts: string[] = []
    let bestJ = -1
    let optX = 0
    let optY = 0

    for (let i = 0; i < pts.length; i++) {
      const x = 40 + pts[i].fpr * 260
      const y = 270 - pts[i].tpr * 260
      const coord = `${x},${y}`
      polygonParts.push(coord)
      polylineParts.push(coord)

      const j = pts[i].tpr - pts[i].fpr
      if (j > bestJ) {
        bestJ = j
        optX = x
        optY = y
      }
    }
    polygonParts.push('300,270')

    return {
      polygon: polygonParts.join(' '),
      polyline: polylineParts.join(' '),
      optX,
      optY,
    }
  }, [results])

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

          {/* ROC 곡선 (SVG) */}
          <div>
            <h3 className="text-sm font-semibold mb-2">ROC 곡선</h3>
            <div className="border rounded-lg p-4 bg-card">
              <svg viewBox="0 0 320 320" className="w-full max-w-md mx-auto">
                {/* 배경 */}
                <rect x="40" y="10" width="260" height="260" fill="none" stroke="currentColor" strokeOpacity="0.2" />

                {/* 그리드 */}
                {[0.2, 0.4, 0.6, 0.8].map(v => (
                  <g key={v}>
                    <line
                      x1={40 + v * 260} y1={10} x2={40 + v * 260} y2={270}
                      stroke="currentColor" strokeOpacity="0.08"
                    />
                    <line
                      x1={40} y1={270 - v * 260} x2={300} y2={270 - v * 260}
                      stroke="currentColor" strokeOpacity="0.08"
                    />
                  </g>
                ))}

                {/* 대각선 (chance line) */}
                <line x1="40" y1="270" x2="300" y2="10" stroke="currentColor" strokeOpacity="0.2" strokeDasharray="4 4" />

                {rocSvg && (
                  <>
                    {/* AUC 영역 */}
                    <polygon points={rocSvg.polygon} fill="currentColor" fillOpacity="0.06" />

                    {/* ROC 곡선 */}
                    <polyline points={rocSvg.polyline} fill="none" stroke="var(--section-accent-bio)" strokeWidth="2" />

                    {/* 최적 임계값 점 */}
                    <circle cx={rocSvg.optX} cy={rocSvg.optY} r="4" fill="var(--section-accent-bio)" stroke="white" strokeWidth="1.5" />
                  </>
                )}

                {/* 축 라벨 */}
                {[0, 0.2, 0.4, 0.6, 0.8, 1.0].map(v => (
                  <g key={v}>
                    <text x={40 + v * 260} y="285" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.5">
                      {v.toFixed(1)}
                    </text>
                    <text x="35" y={274 - v * 260} textAnchor="end" fontSize="9" fill="currentColor" fillOpacity="0.5">
                      {v.toFixed(1)}
                    </text>
                  </g>
                ))}
                <text x="170" y="302" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6">
                  False Positive Rate (1 - Specificity)
                </text>
                <text
                  x="12" y="140" textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.6"
                  transform="rotate(-90, 12, 140)"
                >
                  True Positive Rate (Sensitivity)
                </text>

                {/* AUC 텍스트 */}
                <text x="220" y="240" fontSize="12" fill="currentColor" fontWeight="600">
                  AUC = {formatNumber(results.auc)}
                </text>
              </svg>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenInGraphStudio}>
            <BarChart3 className="h-4 w-4 mr-1.5" />
            Graph Studio에서 열기
          </Button>
        </div>
      )}
    </div>
  )
}
