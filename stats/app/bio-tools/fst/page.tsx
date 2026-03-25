'use client'

import { useCallback, useState } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { parseNumericCell } from '@/lib/bio-tools/parse-numeric-cell'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { detectPopulationColumn } from '@/lib/bio-tools/genetics-columns'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { FstResult } from '@/types/bio-tools-results'

const FST_THRESHOLDS = [
  { max: 0.05, label: '약한 분화', level: 'weak' },
  { max: 0.15, label: '중간 분화', level: 'moderate' },
  { max: 0.25, label: '큰 분화', level: 'great' },
  { max: Infinity, label: '매우 큰 분화', level: 'very_great' },
] as const

const tool = getBioToolById('fst')

export default function FstPage(): React.ReactElement {
  const [popCol, setPopCol] = useState('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, setError, runAnalysis } =
    useBioToolAnalysis<FstResult>({ worker: PyodideWorker.Genetics })
  const resultsRef = useScrollToResults(results)

  const onDataLoaded = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    setPopCol(detectPopulationColumn(data.headers))
  }, [handleDataLoaded])

  const handleAnalyze = useCallback(() => {
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

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  const fstLevel = results
    ? FST_THRESHOLDS.find((t) => results.globalFst < t.max)
    : null
  const isStrong = fstLevel ? fstLevel.level === 'great' || fstLevel.level === 'very_great' : false

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={onDataLoaded}
          onClear={handleClear}
          description="Allele count matrix CSV (첫 열: 집단명, 나머지 열: 대립유전자 개수)"
        />

        {csvData && (
          <div className="flex flex-wrap items-center gap-4">
            <BioColumnSelect label="집단 열" headers={csvData.headers} value={popCol} onChange={setPopCol} />
            <Button onClick={handleAnalyze} disabled={isAnalyzing || !popCol} size="sm">
              {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
            </Button>
          </div>
        )}

        <BioErrorBanner error={error} />

        {results && (
          <div ref={resultsRef} className="space-y-6">
            <div className="p-4 border rounded-lg space-y-3">
              <div className="text-sm text-muted-foreground">Global Fst</div>
              <div className="text-2xl font-bold font-mono">{results.globalFst.toFixed(6)}</div>
              <div className="flex items-center gap-2">
                {fstLevel && (
                  <span
                    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                    style={isStrong ? SIGNIFICANCE_BADGE.significant : SIGNIFICANCE_BADGE.nonSignificant}
                  >
                    {fstLevel.label}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {results.nPopulations}개 집단
                </span>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">{results.interpretation}</p>

            {results.pairwiseFst && (
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
            )}

            <div className="p-3 border rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Wright (1978) Fst 해석 기준</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>0 ~ 0.05: 약한 분화 (little differentiation)</li>
                <li>0.05 ~ 0.15: 중간 분화 (moderate differentiation)</li>
                <li>0.15 ~ 0.25: 큰 분화 (great differentiation)</li>
                <li>0.25+: 매우 큰 분화 (very great differentiation)</li>
              </ul>
              <p className="mt-2">Hudson (1992) Fst + Bhatia et al. (2013) 편향 보정 사용. 입력은 allele count (빈도 아님).</p>
            </div>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
