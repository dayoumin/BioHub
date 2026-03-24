'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { SIGNIFICANCE_BADGE, BIO_TABLE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { AlertCircle, Loader2 } from 'lucide-react'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface PermanovaResult {
  pseudoF: number
  pValue: number
  rSquared: number
  permutations: number
  ssBetween: number
  ssWithin: number
  ssTotal: number
}

const tool = getBioToolById('permanova')

export default function PermanovaPage(): React.ReactElement {
  const resultsRef = useRef<HTMLDivElement>(null)
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, handleClear, runWithPreStep } =
    useBioToolAnalysis<PermanovaResult>()
  const [groupCol, setGroupCol] = useState<string>('')

  useEffect(() => {
    if (results) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [results])

  const handleAnalyze = useCallback(async () => {
    if (!csvData || !groupCol) return

    await runWithPreStep(async () => {
      const pyodide = PyodideCoreService.getInstance()
      const betaResult = await pyodide.callWorkerMethod<{ distanceMatrix: number[][] }>(
        PyodideWorker.Ecology,
        'beta_diversity',
        { rows: csvData.rows, site_col: siteCol },
      )

      const grouping = csvData.rows.map((r) => String(r[groupCol] ?? ''))

      return {
        distance_matrix: betaResult.distanceMatrix,
        grouping,
      }
    }, 'permanova')
  }, [csvData, siteCol, groupCol, runWithPreStep])

  const significant = results ? results.pValue < 0.05 : false

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={handleDataLoaded}
          onClear={handleClear}
          description="종×지점 행렬 CSV (행=지점, 열=종, 그룹 열 포함)"
        />

        {csvData && (
          <div className="flex flex-wrap items-center gap-4">
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

            <label className="text-sm text-muted-foreground">그룹 열:</label>
            <Select value={groupCol || undefined} onValueChange={setGroupCol}>
              <SelectTrigger className="h-8 text-sm w-[180px]">
                <SelectValue placeholder="선택..." />
              </SelectTrigger>
              <SelectContent>
                {csvData.headers.map((h) => (
                  <SelectItem key={h} value={h}>{h}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleAnalyze} disabled={isAnalyzing || !groupCol} size="sm">
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

        {results && (
          <div ref={resultsRef} className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                style={significant ? SIGNIFICANCE_BADGE.significant : SIGNIFICANCE_BADGE.nonSignificant}
              >
                p = {results.pValue} {significant ? '(유의)' : '(비유의)'}
              </span>
            </div>

            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                    <th className={`text-left ${BIO_TABLE.headerCell}`}>항목</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>값</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>Pseudo-F</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.pseudoF}</td></tr>
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>p-value</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.pValue}</td></tr>
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>R²</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.rSquared}</td></tr>
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>순열 수</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.permutations}</td></tr>
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>SS (between)</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.ssBetween}</td></tr>
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>SS (within)</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.ssWithin}</td></tr>
                  <tr><td className={BIO_TABLE.bodyCell}>SS (total)</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.ssTotal}</td></tr>
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Anderson, M.J. (2001) Austral Ecology, 26, 32-46. Bray-Curtis 거리 기반.
            </p>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
