'use client'

import { useCallback, useState } from 'react'
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
import { Loader2 } from 'lucide-react'

interface ConditionFactorResult {
  individualK: number[]  // 2차: 히스토그램/박스플롯용
  mean: number
  std: number
  median: number
  min: number
  max: number
  n: number
  groupStats?: Record<string, { mean: number; std: number; n: number; median: number }>
  comparison?: { test: string; statistic: number; pValue: number; df: number; df2?: number }
}

const tool = getBioToolById('condition-factor')

export default function ConditionFactorPage(): React.ReactElement {
  const [lengthCol, setLengthCol] = useState<string>('')
  const [weightCol, setWeightCol] = useState<string>('')
  const [groupCol, setGroupCol] = useState<string>('')

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<ConditionFactorResult>({ worker: PyodideWorker.Fisheries })
  const resultsRef = useScrollToResults(results)

  const onDataLoaded = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    setLengthCol(detectLengthColumn(data.headers))
    setWeightCol(detectWeightColumn(data.headers))
    setGroupCol('')
  }, [handleDataLoaded])

  const onClear = useCallback(() => {
    handleClear()
    setLengthCol('')
    setWeightCol('')
    setGroupCol('')
  }, [handleClear])

  const handleAnalyze = useCallback(() => {
    if (!csvData || !lengthCol || !weightCol) return
    const lengths = csvData.rows.map((r) => r[lengthCol] as number | null)
    const weights = csvData.rows.map((r) => r[weightCol] as number | null)
    const groups = groupCol
      ? csvData.rows.map((r) => r[groupCol] as string | null)
      : null
    runAnalysis('condition_factor', { lengths, weights, groups })
  }, [csvData, lengthCol, weightCol, groupCol, runAnalysis])

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  const groupEntries = results?.groupStats ? Object.entries(results.groupStats) : []

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={onDataLoaded}
          onClear={onClear}
          description="CSV (체장 열 + 체중 열, 선택적으로 그룹 열 포함)"
        />

        {csvData && (
          <div className="flex flex-wrap items-center gap-4">
            <BioColumnSelect label="체장 열" headers={csvData.headers} value={lengthCol} onChange={setLengthCol} width={140} />
            <BioColumnSelect label="체중 열" headers={csvData.headers} value={weightCol} onChange={setWeightCol} width={140} />
            <BioColumnSelect label="그룹 열" headers={csvData.headers} value={groupCol} onChange={setGroupCol} width={140} allowNone />
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !lengthCol || !weightCol || lengthCol === weightCol
                || (!!groupCol && (groupCol === lengthCol || groupCol === weightCol))}
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
              <h3 className="text-sm font-semibold mb-2">Fulton&apos;s K 요약</h3>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: '평균', value: results.mean.toFixed(4) },
                  { label: 'SD', value: results.std.toFixed(4) },
                  { label: '중앙값', value: results.median.toFixed(4) },
                  { label: '최소', value: results.min.toFixed(4) },
                  { label: '최대', value: results.max.toFixed(4) },
                  { label: 'N', value: String(results.n) },
                ].map((item) => (
                  <div key={item.label} className="p-3 border rounded-lg text-center">
                    <div className="text-xs text-muted-foreground">{item.label}</div>
                    <div className="text-sm font-semibold font-mono mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {groupEntries.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">그룹별 비교</h3>
                <div className="overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                        <th className={`text-left ${BIO_TABLE.headerCell}`}>그룹</th>
                        <th className={`text-right ${BIO_TABLE.headerCell}`}>평균 K</th>
                        <th className={`text-right ${BIO_TABLE.headerCell}`}>SD</th>
                        <th className={`text-right ${BIO_TABLE.headerCell}`}>중앙값</th>
                        <th className={`text-right ${BIO_TABLE.headerCell}`}>N</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupEntries.map(([name, stats]) => (
                        <tr key={name} className="border-b last:border-b-0">
                          <td className={`${BIO_TABLE.bodyCell} font-medium`}>{name}</td>
                          <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{stats.mean.toFixed(4)}</td>
                          <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{stats.std.toFixed(4)}</td>
                          <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{stats.median.toFixed(4)}</td>
                          <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{stats.n}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {results.comparison && (
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <Badge
                      variant="secondary"
                      style={results.comparison.pValue < 0.05
                        ? SIGNIFICANCE_BADGE.significant
                        : SIGNIFICANCE_BADGE.nonSignificant}
                    >
                      {results.comparison.test}
                    </Badge>
                    <span className="font-mono text-xs">
                      {results.comparison.test === 't-test' ? 't' : 'F'} = {results.comparison.statistic.toFixed(3)},
                      {' '}p = {results.comparison.pValue.toFixed(4)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (df = {results.comparison.df}{results.comparison.df2 != null ? `, ${results.comparison.df2}` : ''})
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="p-3 border rounded-lg bg-muted/30 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground text-sm">Fulton&apos;s K 주의사항</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>K는 등성장(isometric, b = 3)을 가정 — b &ne; 3이면 체장에 따라 K가 체계적으로 달라짐</li>
                <li>종간 비교에는 부적절 (종내 비교용)</li>
                <li>대안: relative condition factor (Kn = W / W<sub>expected</sub>)</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
