'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { detectLengthColumn, detectWeightColumn } from '@/lib/bio-tools/fisheries-columns'
import { cn } from '@/lib/utils'
import { ArrowRight, Loader2 } from 'lucide-react'

interface LengthWeightResult {
  a: number
  b: number
  logA: number
  rSquared: number
  bStdError: number
  isometricTStat: number
  isometricPValue: number
  growthType: 'isometric' | 'positive_allometric' | 'negative_allometric'
  predicted: number[]   // 2차: 적합곡선 차트용
  nObservations: number
  logLogPoints: Array<{ logL: number; logW: number }>  // 2차: log-log 산점도용
}

const GROWTH_TYPE_LABELS: Record<string, { ko: string; en: string }> = {
  isometric: { ko: '등성장', en: 'Isometric (b ≈ 3)' },
  positive_allometric: { ko: '양의 이성장', en: 'Positive allometric (b > 3)' },
  negative_allometric: { ko: '음의 이성장', en: 'Negative allometric (b < 3)' },
}

const tool = getBioToolById('length-weight')

export default function LengthWeightPage(): React.ReactElement {
  const [lengthCol, setLengthCol] = useState<string>('')
  const [weightCol, setWeightCol] = useState<string>('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<LengthWeightResult>({ worker: PyodideWorker.Fisheries })
  const resultsRef = useScrollToResults(results)

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

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  const growthLabel = results ? GROWTH_TYPE_LABELS[results.growthType] : null
  const isSignificant = results ? results.isometricPValue < 0.05 : false

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={onDataLoaded}
          onClear={onClear}
          description="CSV (체장 열 + 체중 열 포함)"
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
    </BioToolShell>
  )
}
