'use client'

import { useCallback, useState } from 'react'
import { parseNumericCell } from '@/lib/bio-tools/parse-numeric-cell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { detectLocusColumn } from '@/lib/bio-tools/genetics-columns'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { ToolComponentProps } from './types'
import type { HardyWeinbergResult } from '@/types/bio-tools-results'

export default function HardyWeinbergTool({ tool, meta }: ToolComponentProps): React.ReactElement {
  const [inputMode, setInputMode] = useState<'direct' | 'csv'>('direct')

  // 직접 입력
  const [countAA, setCountAA] = useState('')
  const [countAa, setCountAa] = useState('')
  const [countaa, setCountaa] = useState('')

  // CSV 입력
  const [locusCol, setLocusCol] = useState('')
  const [aaCol, setAaCol] = useState('')   // AA 열
  const [abCol, setAbCol] = useState('')   // Aa 열
  const [bbCol, setBbCol] = useState('')   // aa 열

  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, setError, runAnalysis } =
    useBioToolAnalysis<HardyWeinbergResult>({ worker: PyodideWorker.Genetics })
  const resultsRef = useScrollToResults(results)

  const onDataLoaded = useCallback((data: Parameters<typeof handleDataLoaded>[0]) => {
    handleDataLoaded(data)
    const h = data.headers
    const locus = detectLocusColumn(h)
    setLocusCol(locus)
    // locus 제외한 나머지에서 AA/Aa/aa 순서로 자동 매핑
    const rest = h.filter((c) => c !== locus)
    setAaCol(rest[0] ?? '')
    setAbCol(rest[1] ?? '')
    setBbCol(rest[2] ?? '')
  }, [handleDataLoaded])

  const handleAnalyzeDirect = useCallback(() => {
    const aaVal = Number(countAA)
    const abVal = Number(countAa)
    const bbVal = Number(countaa)
    if (isNaN(aaVal) || isNaN(abVal) || isNaN(bbVal)) {
      setError('AA, Aa, aa 값을 모두 입력하세요')
      return
    }
    if (!Number.isInteger(aaVal) || !Number.isInteger(abVal) || !Number.isInteger(bbVal)) {
      setError('관측 빈도는 정수여야 합니다')
      return
    }
    if (aaVal < 0 || abVal < 0 || bbVal < 0) {
      setError('음수는 입력할 수 없습니다')
      return
    }
    const aa = aaVal, ab = abVal, bb = bbVal
    runAnalysis('hardy_weinberg', { rows: [[aa, ab, bb]] })
  }, [countAA, countAa, countaa, runAnalysis, setError])

  const handleAnalyzeCsv = useCallback(() => {
    if (!csvData || !locusCol || !aaCol || !abCol || !bbCol) return
    if (new Set([aaCol, abCol, bbCol]).size !== 3) {
      setError('AA, Aa, aa 열은 서로 다른 열을 선택해야 합니다')
      return
    }
    const rows = csvData.rows.map((r) =>
      [aaCol, abCol, bbCol].map((c) => parseNumericCell(r[c])),
    )
    if (rows.some((r) => r.some((v) => isNaN(v)))) {
      setError('유전자형 열에 빈 셀 또는 숫자가 아닌 값이 포함되어 있습니다')
      return
    }
    const locusLabels = csvData.rows.map((r) => String(r[locusCol]))
    runAnalysis('hardy_weinberg', { rows, locusLabels })
  }, [csvData, locusCol, aaCol, abCol, bbCol, runAnalysis, setError])

  const isDirectValid = countAA !== '' && countAa !== '' && countaa !== ''

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as 'direct' | 'csv')}>
        <TabsList>
          <TabsTrigger value="direct">직접 입력</TabsTrigger>
          <TabsTrigger value="csv">CSV 업로드</TabsTrigger>
        </TabsList>

        <TabsContent value="direct" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">관측된 유전자형 수를 입력하세요 (AA, Aa, aa)</p>
          <div className="flex items-center gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">AA</label>
              <Input type="number" min={0} step={1} className="w-24 h-8 text-sm" value={countAA} onChange={(e) => setCountAA(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Aa</label>
              <Input type="number" min={0} step={1} className="w-24 h-8 text-sm" value={countAa} onChange={(e) => setCountAa(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">aa</label>
              <Input type="number" min={0} step={1} className="w-24 h-8 text-sm" value={countaa} onChange={(e) => setCountaa(e.target.value)} />
            </div>
            <Button onClick={handleAnalyzeDirect} disabled={isAnalyzing || !isDirectValid} size="sm" className="self-end">
              {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />검정 중...</> : '검정 실행'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="csv" className="space-y-4 mt-4">
          <BioCsvUpload
            onDataLoaded={onDataLoaded}
            onClear={handleClear}
            description="CSV (유전자좌 열 + 유전자형 3열: AA, Aa, aa)"
            exampleDataPath={meta.exampleDataPath}
          />
          {csvData && (
            <div className="flex flex-wrap items-center gap-4">
              <BioColumnSelect label="유전자좌 열" headers={csvData.headers} value={locusCol} onChange={setLocusCol} />
              <BioColumnSelect label="AA 열" headers={csvData.headers} value={aaCol} onChange={setAaCol} />
              <BioColumnSelect label="Aa 열" headers={csvData.headers} value={abCol} onChange={setAbCol} />
              <BioColumnSelect label="aa 열" headers={csvData.headers} value={bbCol} onChange={setBbCol} />
              <Button onClick={handleAnalyzeCsv} disabled={isAnalyzing || !locusCol || !aaCol || !abCol || !bbCol} size="sm">
                {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />검정 중...</> : '검정 실행'}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 border rounded-lg text-center">
              <div className="text-xs text-muted-foreground">p (빈도)</div>
              <div className="text-lg font-semibold font-mono">{results.alleleFreqP.toFixed(4)}</div>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <div className="text-xs text-muted-foreground">q (빈도)</div>
              <div className="text-lg font-semibold font-mono">{results.alleleFreqQ.toFixed(4)}</div>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <div className="text-xs text-muted-foreground">&chi;&sup2;</div>
              <div className="text-lg font-semibold font-mono">{results.chiSquare}</div>
            </div>
            <div className="p-3 border rounded-lg text-center">
              <div className="text-xs text-muted-foreground">N</div>
              <div className="text-lg font-semibold font-mono">{results.nTotal}</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {results.isMonomorphic ? (
              <span className={`${BIO_BADGE_CLASS} bg-muted text-muted-foreground`}>
                단형성 (monomorphic) — 검정 불가
              </span>
            ) : (
              <span
                className={BIO_BADGE_CLASS}
                style={results.inEquilibrium ? SIGNIFICANCE_BADGE.nonSignificant : SIGNIFICANCE_BADGE.significant}
              >
                p = {results.exactPValue.toFixed(4)} — {results.inEquilibrium ? 'HW 평형 유지' : 'HW 평형 이탈'}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">관측 vs 기대 빈도</h3>
            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                    <th className={`text-left ${BIO_TABLE.headerCell}`}>유전자형</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>관측</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>기대</th>
                  </tr>
                </thead>
                <tbody>
                  {['AA', 'Aa', 'aa'].map((gt, i) => (
                    <tr key={gt} className="border-b last:border-b-0">
                      <td className={`${BIO_TABLE.bodyCell} font-medium`}>{gt}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.observedCounts[i]}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{results.expectedCounts[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{results.interpretation}</p>

          {results.lowExpectedWarning && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              기대빈도 &lt; 5인 셀이 있어 chi-square 근사가 부정확할 수 있습니다. Exact test p-value를 판정 기준으로 사용합니다.
            </p>
          )}

          {results.locusResults && results.locusResults.length > 1 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">유전자좌별 결과</h3>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                      <th className={`text-left ${BIO_TABLE.headerCell}`}>유전자좌</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>p</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>q</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>&chi;&sup2;</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>&chi;&sup2; p</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>exact p</th>
                      <th className={`text-center ${BIO_TABLE.headerCell}`}>판정</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.locusResults.map((lr) => (
                      <tr key={lr.locus} className="border-b last:border-b-0">
                        <td className={`${BIO_TABLE.bodyCell} font-medium`}>{lr.locus}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{lr.alleleFreqP.toFixed(4)}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{lr.alleleFreqQ.toFixed(4)}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{lr.isMonomorphic ? '—' : lr.chiSquare}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{lr.isMonomorphic ? '—' : lr.pValue.toFixed(4)}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell} font-mono`}>{lr.isMonomorphic ? '—' : lr.exactPValue.toFixed(4)}</td>
                        <td className={`text-center ${BIO_TABLE.bodyCell}`}>
                          {lr.isMonomorphic ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground">
                              단형성
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold"
                              style={lr.inEquilibrium ? SIGNIFICANCE_BADGE.nonSignificant : SIGNIFICANCE_BADGE.significant}
                            >
                              {lr.inEquilibrium ? '평형' : '이탈'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
