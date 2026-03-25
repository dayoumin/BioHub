'use client'

import { useCallback, useMemo, useState } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { formatNumber, formatPValue } from '@/lib/statistics/formatters'
import { BIO_TABLE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { MetaAnalysisResult } from '@/types/bio-tools-results'

const tool = getBioToolById('meta-analysis')

export default function MetaAnalysisPage(): React.ReactElement {
  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<MetaAnalysisResult>({ worker: PyodideWorker.Survival })
  const resultsRef = useScrollToResults(results)

  const [effectCol, setEffectCol] = useState('')
  const [seCol, setSeCol] = useState('')
  const [studyCol, setStudyCol] = useState('')
  const [model, setModel] = useState<'random' | 'fixed'>('random')

  const handleData = useCallback(
    (data: Parameters<typeof handleDataLoaded>[0]) => {
      handleDataLoaded(data)
      const headers = data.headers
      // 자동 감지
      setEffectCol(headers.find(h => /effect/i.test(h)) ?? headers[1] ?? '')
      setSeCol(headers.find(h => /^se$/i.test(h) || /standard.?error/i.test(h)) ?? headers[2] ?? '')
      setStudyCol(headers.find(h => /study|name|author/i.test(h)) ?? headers[0] ?? '')
    },
    [handleDataLoaded],
  )

  const handleAnalyze = useCallback(() => {
    if (!csvData) return

    const effectSizes = csvData.rows.map(r => Number(r[effectCol]))
    const standardErrors = csvData.rows.map(r => Number(r[seCol]))
    const studyNames = studyCol ? csvData.rows.map(r => String(r[studyCol])) : null

    runAnalysis('meta_analysis', {
      effectSizes,
      standardErrors,
      studyNames,
      model,
    })
  }, [csvData, effectCol, seCol, studyCol, model, runAnalysis])

  // Forest plot 데이터
  const forestData = useMemo(() => {
    if (!results) return null
    const maxAbsVal = Math.max(
      ...results.effectSizes.map(Math.abs),
      Math.abs(results.ci[0]),
      Math.abs(results.ci[1]),
    )
    const range = maxAbsVal * 1.3
    return { range }
  }, [results])

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={handleData}
          onClear={handleClear}
          description="메타분석 CSV (study, effect_size, se 열 포함)"
        />

        {csvData && (
          <div className="flex flex-wrap items-end gap-4">
            <BioColumnSelect label="연구명 열" headers={csvData.headers} value={studyCol} onChange={setStudyCol} labelSize="xs" />
            <BioColumnSelect label="효과크기 열" headers={csvData.headers} value={effectCol} onChange={setEffectCol} labelSize="xs" />
            <BioColumnSelect label="표준오차 열" headers={csvData.headers} value={seCol} onChange={setSeCol} labelSize="xs" />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">모델</label>
              <Select value={model} onValueChange={(v) => setModel(v as 'random' | 'fixed')}>
                <SelectTrigger className="h-8 text-sm w-[180px]">
                  <SelectValue placeholder="선택..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="random">랜덤 효과</SelectItem>
                  <SelectItem value="fixed">고정 효과</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
              {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
            </Button>
          </div>
        )}

        <BioErrorBanner error={error} />

        {results && forestData && (
          <div ref={resultsRef} className="space-y-6">
            {/* 통합 결과 테이블 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">통합 결과</h3>
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
                      <td className={BIO_TABLE.bodyCell}>모델</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-medium`}>
                        {results.model === 'random' ? '랜덤 효과' : '고정 효과'}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>통합 효과크기</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-medium`}>{formatNumber(results.pooledEffect)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>95% CI</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>
                        [{formatNumber(results.ci[0])}, {formatNumber(results.ci[1])}]
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>z</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.zValue)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>p-value</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-medium`}>{formatPValue(results.pValue)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>Q (이질성)</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.Q, 2)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>Q p-value</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatPValue(results.QpValue)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>I²</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.iSquared, 1)}%</td>
                    </tr>
                    <tr className="border-b last:border-b-0">
                      <td className={BIO_TABLE.bodyCell}>τ²</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.tauSquared, 4)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Forest Plot */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Forest Plot</h3>
              <div className="border rounded-lg p-4 bg-card space-y-1">
                {/* 헤더 */}
                <div className="flex items-center text-xs text-muted-foreground mb-2 px-1">
                  <span className="w-28 flex-shrink-0">연구</span>
                  <span className="flex-1 text-center">효과크기 [95% CI]</span>
                  <span className="w-20 text-right flex-shrink-0">가중치</span>
                </div>

                {/* 개별 연구 */}
                {results.studyNames.map((name, i) => {
                  const es = results.effectSizes[i]
                  const ciLo = results.studyCiLower[i]
                  const ciHi = results.studyCiUpper[i]
                  const weight = results.weights[i]
                  const { range } = forestData
                  const center = 50
                  const scale = 40 / range

                  return (
                    <div key={name} className="flex items-center text-xs h-6 px-1">
                      <span className="w-28 flex-shrink-0 truncate font-medium">{name}</span>
                      <div className="flex-1 relative h-full">
                        {/* 0 기준선 */}
                        <div
                          className="absolute top-0 bottom-0 w-px bg-muted-foreground/30"
                          style={{ left: `${center}%` }}
                        />
                        {/* CI 선 */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 h-px bg-foreground/60"
                          style={{
                            left: `${center + ciLo * scale}%`,
                            width: `${(ciHi - ciLo) * scale}%`,
                          }}
                        />
                        {/* 효과크기 점 (가중치 비례 크기) */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-sm bg-foreground"
                          style={{
                            left: `${center + es * scale}%`,
                            width: `${Math.max(4, Math.sqrt(weight) * 1.5)}px`,
                            height: `${Math.max(4, Math.sqrt(weight) * 1.5)}px`,
                          }}
                        />
                      </div>
                      <span className="w-20 text-right flex-shrink-0 tabular-nums">
                        {formatNumber(es)} [{formatNumber(ciLo)}, {formatNumber(ciHi)}]
                      </span>
                    </div>
                  )
                })}

                {/* 통합 효과 (다이아몬드) */}
                <div className="flex items-center text-xs h-8 px-1 border-t mt-2 pt-2">
                  <span className="w-28 flex-shrink-0 font-semibold">통합</span>
                  <div className="flex-1 relative h-full">
                    <div
                      className="absolute top-0 bottom-0 w-px bg-muted-foreground/30"
                      style={{ left: '50%' }}
                    />
                    {/* 다이아몬드 */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: `${50 + results.ci[0] * (40 / forestData.range)}%` }}
                    >
                      <svg
                        width={`${(results.ci[1] - results.ci[0]) * (40 / forestData.range)}%`}
                        height="12"
                        viewBox="0 0 100 12"
                        preserveAspectRatio="none"
                        style={{
                          width: `${Math.max(20, (results.ci[1] - results.ci[0]) * (40 / forestData.range) * 5)}px`,
                        }}
                      >
                        <polygon
                          points="0,6 50,0 100,6 50,12"
                          className="fill-foreground/70"
                        />
                      </svg>
                    </div>
                  </div>
                  <span className="w-20 text-right flex-shrink-0 tabular-nums font-semibold">
                    {formatNumber(results.pooledEffect)} [{formatNumber(results.ci[0])}, {formatNumber(results.ci[1])}]
                  </span>
                </div>
              </div>
            </div>

            {/* 개별 연구 상세 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">개별 연구</h3>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                      <th className={`text-left ${BIO_TABLE.headerCell}`}>연구</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>효과크기</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>95% CI</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>가중치 (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.studyNames.map((name, i) => (
                      <tr key={name} className="border-b last:border-b-0">
                        <td className={`${BIO_TABLE.bodyCell} font-medium`}>{name}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.effectSizes[i])}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>
                          [{formatNumber(results.studyCiLower[i])}, {formatNumber(results.studyCiUpper[i])}]
                        </td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.weights[i], 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
