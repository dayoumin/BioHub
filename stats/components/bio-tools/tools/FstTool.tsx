'use client'

import { useCallback, useState } from 'react'
import { parseNumericCell } from '@/lib/bio-tools/parse-numeric-cell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { detectPopulationColumn, detectIndividualColumn } from '@/lib/bio-tools/genetics-columns'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { ToolComponentProps } from './types'
import type { FstResult } from '@/types/bio-tools-results'

const FST_THRESHOLDS = [
  { max: 0.05, label: '약한 분화', level: 'weak' },
  { max: 0.15, label: '중간 분화', level: 'moderate' },
  { max: 0.25, label: '큰 분화', level: 'great' },
  { max: Infinity, label: '매우 큰 분화', level: 'very_great' },
] as const

export default function FstTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const [inputMode, setInputMode] = useState<'simple' | 'genotype'>('simple')

  // v1 간편 분석
  const [popCol, setPopCol] = useState('')

  // v2 상세 분석
  const [indCol, setIndCol] = useState('')
  const [popColV2, setPopColV2] = useState('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, setError, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<FstResult>({ worker: PyodideWorker.Genetics, initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)

  const onDataLoadedV1 = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    setPopCol(detectPopulationColumn(data.headers))
  }, [handleDataLoaded])

  const onDataLoadedV2 = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    setIndCol(detectIndividualColumn(data.headers))
    setPopColV2(detectPopulationColumn(data.headers))
  }, [handleDataLoaded])

  // v1: allele count matrix
  const handleAnalyzeV1 = useCallback(() => {
    if (!csvData || !popCol) return
    const alleleCols = csvData.headers.filter((h) => h !== popCol)
    if (alleleCols.length < 2) {
      setError('대립유전자 열이 최소 2개 필요합니다')
      return
    }
    const populations = csvData.rows.map((row) =>
      alleleCols.map((col) => parseNumericCell(row[col])),
    )
    if (populations.some((row) => row.some((v) => Number.isNaN(v)))) {
      setError('빈 셀 또는 숫자가 아닌 값이 포함되어 있습니다')
      return
    }
    const populationLabels = csvData.rows.map((row) => String(row[popCol]))
    runAnalysis('fst', { populations, populationLabels })
  }, [csvData, popCol, runAnalysis, setError])

  // v2: 개체별 유전자형
  const handleAnalyzeV2 = useCallback(() => {
    if (!csvData || !indCol || !popColV2) return
    if (indCol === popColV2) {
      setError('개체 열과 집단 열을 다르게 선택해주세요')
      return
    }
    const locusCols = csvData.headers.filter((h) => h !== indCol && h !== popColV2)
    if (locusCols.length < 1) {
      setError('유전자좌 열이 최소 1개 필요합니다')
      return
    }
    const genotypes = csvData.rows.map((row) =>
      locusCols.map((col) => String(row[col] ?? '')),
    )
    const individualPopulations = csvData.rows.map((row) => String(row[popColV2]))
    const uniquePops = new Set(individualPopulations)
    if (uniquePops.size < 2) {
      setError('최소 2개 집단이 필요합니다')
      return
    }
    runAnalysis('fst', { genotypes, individualPopulations, locusNames: locusCols })
  }, [csvData, indCol, popColV2, runAnalysis, setError])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { inputMode, popCol, indCol, popColV2 },
    })
  }, [saveToHistory, tool, inputMode, popCol, indCol, popColV2])

  const fstLevel = results
    ? FST_THRESHOLDS.find((t) => results.globalFst < t.max)
    : null
  const isStrong = fstLevel ? fstLevel.level === 'great' || fstLevel.level === 'very_great' : false

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <Tabs value={inputMode} onValueChange={(v) => { setInputMode(v as 'simple' | 'genotype'); handleClear(); setPopCol(''); setIndCol(''); setPopColV2('') }}>
        <TabsList>
          <TabsTrigger value="simple">간편 분석</TabsTrigger>
          <TabsTrigger value="genotype">상세 분석</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-4 mt-4">
          <BioCsvUpload
            onDataLoaded={onDataLoadedV1}
            onClear={handleClear}
            description="Allele count matrix CSV (첫 열: 집단명, 나머지 열: 대립유전자 개수)"
          />
          {csvData && (
            <div className="flex flex-wrap items-center gap-4">
              <BioColumnSelect label="집단 열" headers={csvData.headers} value={popCol} onChange={setPopCol} />
              <Button onClick={handleAnalyzeV1} disabled={isAnalyzing || !popCol} size="sm">
                {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="genotype" className="space-y-4 mt-4">
          <BioCsvUpload
            onDataLoaded={onDataLoadedV2}
            onClear={handleClear}
            description="개체별 유전자형 CSV (개체 열 + 집단 열 + 유전자좌 열). 유전자형: A/B 형식"
            exampleDataPath={meta.exampleDataPath}
          />
          {csvData && (
            <div className="flex flex-wrap items-center gap-4">
              <BioColumnSelect label="개체 열" headers={csvData.headers} value={indCol} onChange={setIndCol} />
              <BioColumnSelect label="집단 열" headers={csvData.headers} value={popColV2} onChange={setPopColV2} />
              <Button onClick={handleAnalyzeV2} disabled={isAnalyzing || !indCol || !popColV2} size="sm">
                {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-6">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
          <div className="p-4 border rounded-lg space-y-3">
            <div className="text-sm text-muted-foreground">Global Fst</div>
            <div className="text-2xl font-bold font-mono">
              {results.globalFst.toFixed(6)}
              {results.bootstrapCi != null && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  95% CI [{results.bootstrapCi[0].toFixed(4)}, {results.bootstrapCi[1].toFixed(4)}]
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {fstLevel && (
                <span
                  className={BIO_BADGE_CLASS}
                  style={isStrong ? SIGNIFICANCE_BADGE.significant : SIGNIFICANCE_BADGE.nonSignificant}
                >
                  {fstLevel.label}
                </span>
              )}
              {results.permutationPValue != null && (
                <span
                  className={BIO_BADGE_CLASS}
                  style={results.permutationPValue < 0.05 ? SIGNIFICANCE_BADGE.significant : SIGNIFICANCE_BADGE.nonSignificant}
                >
                  permutation p = {results.permutationPValue.toFixed(4)}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {results.nPopulations}개 집단
                {results.nIndividuals != null && ` · ${results.nIndividuals}개체`}
                {results.nLoci != null && ` · ${results.nLoci}유전자좌`}
                {results.nPermutations != null && results.nPermutations > 0 && ` · ${results.nPermutations} perms`}
              </span>
            </div>
            {results.bootstrapWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400">{results.bootstrapWarning}</p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{results.interpretation}</p>

          <div>
            <h3 className="text-sm font-semibold mb-2">쌍별 Fst 행렬</h3>
            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                    <th className={`text-left ${BIO_TABLE.headerCell}`}></th>
                    {results.populationLabels.map((label) => (
                      <th key={label} className={`text-right ${BIO_TABLE.headerCell}`}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.pairwiseFst.map((row, i) => (
                    <tr key={results.populationLabels[i]} className="border-b last:border-b-0">
                      <td className={`${BIO_TABLE.bodyCell} font-medium`}>{results.populationLabels[i]}</td>
                      {row.map((val, j) => (
                        <td key={j} className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>
                          {i === j ? '—' : val.toFixed(4)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 border rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground text-sm">Wright (1978) Fst 해석 기준</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>0 ~ 0.05: 약한 분화 (little differentiation)</li>
              <li>0.05 ~ 0.15: 중간 분화 (moderate differentiation)</li>
              <li>0.15 ~ 0.25: 큰 분화 (great differentiation)</li>
              <li>0.25+: 매우 큰 분화 (very great differentiation)</li>
            </ul>
            <p className="mt-2">
              Hudson (1992) Fst + Bhatia et al. (2013) 편향 보정 사용.
              {results.nLoci != null
                ? ' Multilocus Fst = Σnum / Σden (ratio of sums).'
                : ' 입력은 allele count (빈도 아님).'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
