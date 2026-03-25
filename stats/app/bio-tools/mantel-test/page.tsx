'use client'

import { useCallback, useState } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload, type CsvData } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { getBioToolMeta } from '@/lib/bio-tools/bio-tool-metadata'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type { MantelResult } from '@/types/bio-tools-results'

const tool = getBioToolById('mantel-test')
const meta = getBioToolMeta('mantel-test')

export default function MantelTestPage(): React.ReactElement {
  const [csvDataX, setCsvDataX] = useState<CsvData | null>(null)
  const [csvDataY, setCsvDataY] = useState<CsvData | null>(null)
  const [siteColX, setSiteColX] = useState<string>('')
  const [siteColY, setSiteColY] = useState<string>('')
  const [method, setMethod] = useState<'pearson' | 'spearman'>('pearson')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<MantelResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const resultsRef = useScrollToResults(results)

  const handleDataLoadedX = useCallback((data: CsvData) => {
    setCsvDataX(data)
    setSiteColX(data.headers[0])
    setResults(null)
    setError(null)
  }, [])

  const handleClearX = useCallback(() => {
    setCsvDataX(null)
    setSiteColX('')
    setResults(null)
    setError(null)
  }, [])

  const handleDataLoadedY = useCallback((data: CsvData) => {
    setCsvDataY(data)
    setSiteColY(data.headers[0])
    setResults(null)
    setError(null)
  }, [])

  const handleClearY = useCallback(() => {
    setCsvDataY(null)
    setSiteColY('')
    setResults(null)
    setError(null)
  }, [])

  const handleAnalyze = useCallback(async () => {
    if (!csvDataX || !csvDataY) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const pyodide = PyodideCoreService.getInstance()

      const [betaX, betaY] = await Promise.all([
        pyodide.callWorkerMethod<{ distanceMatrix: number[][] }>(
          PyodideWorker.Ecology,
          'beta_diversity',
          { rows: csvDataX.rows, site_col: siteColX },
        ),
        pyodide.callWorkerMethod<{ distanceMatrix: number[][] }>(
          PyodideWorker.Ecology,
          'beta_diversity',
          { rows: csvDataY.rows, site_col: siteColY },
        ),
      ])

      if (betaX.distanceMatrix.length !== betaY.distanceMatrix.length) {
        throw new Error('두 거리행렬의 크기가 같아야 합니다 (지점 수 일치)')
      }

      const result = await pyodide.callWorkerMethod<MantelResult>(
        PyodideWorker.Ecology,
        'mantel_test',
        {
          matrix_x: betaX.distanceMatrix,
          matrix_y: betaY.distanceMatrix,
          method,
        },
      )
      setResults(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }, [csvDataX, csvDataY, siteColX, siteColY, method])

  const significant = results ? results.pValue < 0.05 : false

  if (!tool || !meta) return <div>도구를 찾을 수 없습니다</div>

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioToolIntro meta={meta} collapsed={!!results} />
        <div>
          <h3 className="text-sm font-semibold mb-2">거리행렬 X (데이터셋 1)</h3>
          <BioCsvUpload
            onDataLoaded={handleDataLoadedX}
            onClear={handleClearX}
            description="종×지점 행렬 CSV (첫 번째 데이터셋)"
            exampleDataPath="/example-data/mantel-species.csv"
            exampleLabel="종 행렬 예제"
          />
          {csvDataX && (
            <div className="flex items-center gap-3 mt-2">
              <BioColumnSelect label="지점명 열" headers={csvDataX.headers} value={siteColX} onChange={setSiteColX} labelSize="xs" />
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-2">거리행렬 Y (데이터셋 2)</h3>
          <BioCsvUpload
            onDataLoaded={handleDataLoadedY}
            onClear={handleClearY}
            description="종×지점 행렬 CSV (두 번째 데이터셋)"
            exampleDataPath="/example-data/mantel-env.csv"
            exampleLabel="환경 행렬 예제"
          />
          {csvDataY && (
            <div className="flex items-center gap-3 mt-2">
              <BioColumnSelect label="지점명 열" headers={csvDataY.headers} value={siteColY} onChange={setSiteColY} labelSize="xs" />
            </div>
          )}
        </div>

        {csvDataX && csvDataY && (
          <div className="flex items-center gap-4">
            <label className="text-sm text-muted-foreground">상관 방법:</label>
            <Select value={method} onValueChange={(v) => setMethod(v as 'pearson' | 'spearman')}>
              <SelectTrigger className="h-8 text-sm w-[180px]">
                <SelectValue placeholder="선택..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pearson">Pearson</SelectItem>
                <SelectItem value="spearman">Spearman</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
              {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
            </Button>
          </div>
        )}

        <BioErrorBanner error={error} />

        {results && (
          <div ref={resultsRef} className="space-y-4">
            <div className="flex items-center gap-2">
              <span
                className={BIO_BADGE_CLASS}
                style={significant ? SIGNIFICANCE_BADGE.significant : SIGNIFICANCE_BADGE.nonSignificant}
              >
                p = {results.pValue} (양측) {significant ? '(유의)' : '(비유의)'}
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
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>Mantel r</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.r}</td></tr>
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>p-value (양측)</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.pValue}</td></tr>
                  <tr className="border-b"><td className={BIO_TABLE.bodyCell}>방법</td><td className="text-right px-3 py-2">{results.method === 'pearson' ? 'Pearson' : 'Spearman'}</td></tr>
                  <tr><td className={BIO_TABLE.bodyCell}>순열 수</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.permutations}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
