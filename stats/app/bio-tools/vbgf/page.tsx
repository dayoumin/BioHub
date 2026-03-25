'use client'

import { useCallback, useState } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_TABLE } from '@/components/bio-tools/bio-styles'
import { detectAgeColumn, detectLengthColumn } from '@/lib/bio-tools/fisheries-columns'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

import type { VbgfResult } from '@/types/bio-tools-results'

const tool = getBioToolById('vbgf')

export default function VbgfPage(): React.ReactElement {
  const [ageCol, setAgeCol] = useState<string>('')
  const [lengthCol, setLengthCol] = useState<string>('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<VbgfResult>({ worker: PyodideWorker.Fisheries })
  const resultsRef = useScrollToResults(results)

  const onDataLoaded = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    setAgeCol(detectAgeColumn(data.headers))
    setLengthCol(detectLengthColumn(data.headers))
  }, [handleDataLoaded])

  const onClear = useCallback(() => {
    handleClear()
    setAgeCol('')
    setLengthCol('')
  }, [handleClear])

  const handleAnalyze = useCallback(() => {
    if (!csvData || !ageCol || !lengthCol) return
    const ages = csvData.rows.map((r) => r[ageCol] as number | null)
    const lengths = csvData.rows.map((r) => r[lengthCol] as number | null)
    runAnalysis('fit_vbgf', { ages, lengths })
  }, [csvData, ageCol, lengthCol, runAnalysis])

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={onDataLoaded}
          onClear={onClear}
          description="CSV (연령 열 + 체장 열 포함)"
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
    </BioToolShell>
  )
}
