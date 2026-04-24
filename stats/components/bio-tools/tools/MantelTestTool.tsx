'use client'

import { memo, useCallback, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { BioCsvUpload, type CsvData } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { BioResultSummary, type MetricItem } from '@/components/common/results'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BIOLOGY_CALLOUT_INFO, BIOLOGY_TABLE_SHELL } from '@/lib/design-tokens/biology'
import { saveBioToolEntry } from '@/lib/bio-tools/bio-tool-history'
import { useResearchProjectStore, selectActiveProject } from '@/lib/stores/research-project-store'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import type { MantelResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

function getInitialMantelMethod(value: string | undefined): 'pearson' | 'spearman' {
  return value === 'spearman' ? 'spearman' : 'pearson'
}

function formatHistoryDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function resetFreshAnalysisState(
  setResults: Dispatch<SetStateAction<MantelResult | null>>,
  setError: Dispatch<SetStateAction<string | null>>,
  setIsSaved: Dispatch<SetStateAction<boolean>>,
  setIsRestoredHistoryVisible: Dispatch<SetStateAction<boolean>>,
  hasSavedRef: MutableRefObject<boolean>,
): void {
  setResults(null)
  setError(null)
  setIsSaved(false)
  setIsRestoredHistoryVisible(false)
  hasSavedRef.current = false
}

const MantelTestTool = memo(function MantelTestTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const initialColumnConfig = initialEntry?.columnConfig
  const [csvDataX, setCsvDataX] = useState<CsvData | null>(null)
  const [csvDataY, setCsvDataY] = useState<CsvData | null>(null)
  const [siteColX, setSiteColX] = useState<string>(initialColumnConfig?.siteColX ?? '')
  const [siteColY, setSiteColY] = useState<string>(initialColumnConfig?.siteColY ?? '')
  const [method, setMethod] = useState<'pearson' | 'spearman'>(getInitialMantelMethod(initialColumnConfig?.method))
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<MantelResult | null>((initialEntry?.results as MantelResult) ?? null)
  const [error, setError] = useState<string | null>(null)
  const [isSaved, setIsSaved] = useState(!!initialEntry?.results)
  const [isRestoredHistoryVisible, setIsRestoredHistoryVisible] = useState(!!initialEntry?.results)
  const resultsRef = useScrollToResults(results)
  const hasSavedRef = useRef(!!initialEntry?.results)

  const handleDataLoadedX = useCallback((data: CsvData) => {
    setCsvDataX(data)
    setSiteColX(data.headers[0])
    resetFreshAnalysisState(setResults, setError, setIsSaved, setIsRestoredHistoryVisible, hasSavedRef)
  }, [])

  const handleClearX = useCallback(() => {
    setCsvDataX(null)
    setSiteColX('')
    resetFreshAnalysisState(setResults, setError, setIsSaved, setIsRestoredHistoryVisible, hasSavedRef)
  }, [])

  const handleDataLoadedY = useCallback((data: CsvData) => {
    setCsvDataY(data)
    setSiteColY(data.headers[0])
    resetFreshAnalysisState(setResults, setError, setIsSaved, setIsRestoredHistoryVisible, hasSavedRef)
  }, [])

  const handleClearY = useCallback(() => {
    setCsvDataY(null)
    setSiteColY('')
    resetFreshAnalysisState(setResults, setError, setIsSaved, setIsRestoredHistoryVisible, hasSavedRef)
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
      setIsSaved(false)
      setIsRestoredHistoryVisible(false)
      hasSavedRef.current = false
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다')
    } finally {
      setIsAnalyzing(false)
    }
  }, [csvDataX, csvDataY, siteColX, siteColY, method])

  const handleSave = useCallback(() => {
    if (!results || !csvDataX || !csvDataY || hasSavedRef.current) return
    hasSavedRef.current = true

    const activeProject = selectActiveProject(useResearchProjectStore.getState())

    try {
      saveBioToolEntry({
        toolId: tool.id,
        toolNameEn: tool.nameEn,
        toolNameKo: tool.nameKo,
        csvFileName: `${csvDataX.fileName} + ${csvDataY.fileName}`,
        columnConfig: { siteColX, siteColY, method },
        results,
        projectId: activeProject?.id,
      })

      setIsSaved(true)
      toast.success(activeProject ? `${activeProject.name}에 저장됨` : '히스토리에 저장됨')
    } catch (err) {
      hasSavedRef.current = false
      if (err instanceof Error && err.message === 'QUOTA_EXCEEDED') {
        toast.error('저장 공간이 부족합니다. 오래된 히스토리를 삭제해주세요.')
      } else {
        toast.error('저장에 실패했습니다')
      }
    }
  }, [results, csvDataX, csvDataY, siteColX, siteColY, method, tool])

  const significant = results ? results.pValue < 0.05 : false

  return (
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
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
          {initialEntry && isRestoredHistoryVisible && (
            <div className={BIOLOGY_CALLOUT_INFO}>
              <div className="mb-3 text-sm font-semibold text-foreground">히스토리에서 복원된 결과</div>
              <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="mb-1 font-medium text-foreground/70">CSV</dt>
                  <dd className="font-mono text-foreground">{initialEntry.csvFileName}</dd>
                </div>
                <div>
                  <dt className="mb-1 font-medium text-foreground/70">저장 시각</dt>
                  <dd>{formatHistoryDate(initialEntry.createdAt)}</dd>
                </div>
                <div>
                  <dt className="mb-1 font-medium text-foreground/70">지점명 열</dt>
                  <dd>X: {siteColX || '-'} · Y: {siteColY || '-'}</dd>
                </div>
                <div>
                  <dt className="mb-1 font-medium text-foreground/70">상관 방법</dt>
                  <dd>{results.method === 'pearson' ? 'Pearson' : 'Spearman'}</dd>
                </div>
              </dl>
            </div>
          )}
          <BioResultSummary
            metrics={[
              { label: 'Mantel r', value: results.r, tooltip: `${results.method === 'pearson' ? 'Pearson' : 'Spearman'} 상관` },
              { label: 'p-value', value: results.pValue, tooltip: `${results.permutations} 순열 검정` },
              { label: '순열 수', value: String(results.permutations) },
            ] satisfies MetricItem[]}
            columns={3}
          >
          <div className="flex items-center gap-2">
            <span
              className={BIO_BADGE_CLASS}
              style={significant ? SIGNIFICANCE_BADGE.significant : SIGNIFICANCE_BADGE.nonSignificant}
            >
              p = {results.pValue} (양측) {significant ? '(유의)' : '(비유의)'}
            </span>
          </div>

          <div className={BIOLOGY_TABLE_SHELL}>
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
                <tr className="border-b"><td className={BIO_TABLE.bodyCell}>방법</td><td className={`text-right ${BIO_TABLE.bodyCell}`}>{results.method === 'pearson' ? 'Pearson' : 'Spearman'}</td></tr>
                <tr><td className={BIO_TABLE.bodyCell}>순열 수</td><td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.permutations}</td></tr>
              </tbody>
            </table>
          </div>
          </BioResultSummary>
        </div>
      )}
    </div>
  )
})

export default MantelTestTool
