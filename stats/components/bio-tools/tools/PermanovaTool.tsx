'use client'

import { useCallback, useState } from 'react'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type { PermanovaResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

export default function PermanovaTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, handleClear, runWithPreStep, saveToHistory, isSaved } =
    useBioToolAnalysis<PermanovaResult>({ initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)
  const [groupCol, setGroupCol] = useState<string>('')

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

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { siteCol, groupCol },
    })
  }, [saveToHistory, tool, siteCol, groupCol])

  const significant = results ? results.pValue < 0.05 : false

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={handleDataLoaded}
        onClear={handleClear}
        description="종×지점 행렬 CSV (행=지점, 열=종, 그룹 열 포함)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex flex-wrap items-center gap-4">
          <BioColumnSelect label="지점명 열" headers={csvData.headers} value={siteCol} onChange={setSiteCol} />
          <BioColumnSelect label="그룹 열" headers={csvData.headers} value={groupCol} onChange={setGroupCol} />

          <Button onClick={handleAnalyze} disabled={isAnalyzing || !groupCol} size="sm">
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
          </Button>
        </div>
      )}

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-4">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
          <div className="flex items-center gap-2">
            <span
              className={BIO_BADGE_CLASS}
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
  )
}
