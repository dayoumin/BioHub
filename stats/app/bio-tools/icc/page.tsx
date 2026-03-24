'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { formatNumber, formatPValue } from '@/lib/statistics/formatters'
import { BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { AlertCircle, Loader2 } from 'lucide-react'

type IccType = 'ICC1_1' | 'ICC2_1' | 'ICC3_1'

interface IccResult {
  icc: number
  iccType: IccType
  fValue: number
  df1: number
  df2: number
  pValue: number
  ci: [number, number]
  msRows: number
  msCols: number
  msError: number
  nSubjects: number
  nRaters: number
  interpretation: string
}

const tool = getBioToolById('icc')

const ICC_TYPE_LABELS: Record<string, string> = {
  ICC1_1: 'ICC(1,1) — One-way random, 단일 측정',
  ICC2_1: 'ICC(2,1) — Two-way random, 단일 측정',
  ICC3_1: 'ICC(3,1) — Two-way mixed, 단일 측정',
}

const INTERPRETATION_STYLES: Record<string, { label: string; style: React.CSSProperties }> = {
  poor: { label: '불량 (Poor, < 0.40)', style: SIGNIFICANCE_BADGE.nonSignificant },
  fair: { label: '보통 (Fair, 0.40–0.59)', style: SIGNIFICANCE_BADGE.nonSignificant },
  good: { label: '양호 (Good, 0.60–0.74)', style: SIGNIFICANCE_BADGE.significant },
  excellent: { label: '우수 (Excellent, ≥ 0.75)', style: SIGNIFICANCE_BADGE.significant },
}

export default function IccPage(): React.ReactElement {
  const resultsRef = useRef<HTMLDivElement>(null)
  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis } =
    useBioToolAnalysis<IccResult>({ worker: PyodideWorker.Survival })

  const [subjectCol, setSubjectCol] = useState('')
  const [iccType, setIccType] = useState<IccType>('ICC3_1')

  useEffect(() => {
    if (results) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [results])

  const handleData = useCallback(
    (data: Parameters<typeof handleDataLoaded>[0]) => {
      handleDataLoaded(data)
      const headers = data.headers
      setSubjectCol(headers.find(h => /subject|id|sample|fish/i.test(h)) ?? headers[0] ?? '')
    },
    [handleDataLoaded],
  )

  const handleAnalyze = useCallback(() => {
    if (!csvData || !subjectCol) return

    // subjectCol을 제외한 나머지 열이 평가자(rater) 데이터
    const raterCols = csvData.headers.filter(h => h !== subjectCol)
    if (raterCols.length < 2) {
      return
    }

    // n_subjects × n_raters 2D 행렬 생성
    const data = csvData.rows.map(row =>
      raterCols.map(col => Number(row[col]))
    )

    runAnalysis('icc_analysis', { data, iccType })
  }, [csvData, subjectCol, iccType, runAnalysis])

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={handleData}
          onClear={handleClear}
          description="ICC CSV (첫 열: 대상ID, 나머지 열: 측정값/평가자별 값)"
        />

        {csvData && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">대상(Subject) 열</label>
              <Select value={subjectCol || undefined} onValueChange={setSubjectCol}>
                <SelectTrigger className="h-8 text-sm w-[180px]">
                  <SelectValue placeholder="선택..." />
                </SelectTrigger>
                <SelectContent>
                  {csvData.headers.map(h => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ICC 유형</label>
              <Select value={iccType} onValueChange={(v) => setIccType(v as IccType)}>
                <SelectTrigger className="h-8 text-sm w-[220px]">
                  <SelectValue placeholder="선택..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ICC1_1">ICC(1,1) One-way random</SelectItem>
                  <SelectItem value="ICC2_1">ICC(2,1) Two-way random</SelectItem>
                  <SelectItem value="ICC3_1">ICC(3,1) Two-way mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
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
          <div ref={resultsRef} className="space-y-6">
            {/* ICC 결과 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">ICC 분석 결과</h3>
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
                      <td className={BIO_TABLE.bodyCell}>유형</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{ICC_TYPE_LABELS[results.iccType] ?? results.iccType}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>ICC</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-semibold text-lg`}>{formatNumber(results.icc)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>95% CI</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>
                        [{formatNumber(results.ci[0])}, {formatNumber(results.ci[1])}]
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>해석 (Cicchetti, 1994)</td>
                      <td
                        className={`text-right ${BIO_TABLE.bodyCell} font-medium`}
                        style={INTERPRETATION_STYLES[results.interpretation]?.style}
                      >
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={INTERPRETATION_STYLES[results.interpretation]?.style}
                        >
                          {INTERPRETATION_STYLES[results.interpretation]?.label ?? results.interpretation}
                        </span>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>F</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.fValue, 2)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>df</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>({results.df1}, {results.df2})</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>p-value</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell} font-medium`}>{formatPValue(results.pValue)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>대상 수 (n)</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{results.nSubjects}</td>
                    </tr>
                    <tr className="border-b last:border-b-0">
                      <td className={BIO_TABLE.bodyCell}>평가자/측정 수 (k)</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{results.nRaters}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ANOVA 테이블 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">ANOVA 분산분석</h3>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                      <th className={`text-left ${BIO_TABLE.headerCell}`}>변동원</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>MS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>대상간 (Between Subjects)</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.msRows, 4)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className={BIO_TABLE.bodyCell}>평가자간 (Between Raters)</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.msCols, 4)}</td>
                    </tr>
                    <tr className="border-b last:border-b-0">
                      <td className={BIO_TABLE.bodyCell}>잔차 (Residual)</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{formatNumber(results.msError, 4)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ICC 게이지 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">ICC 스케일</h3>
              <div className="border rounded-lg p-4 bg-card">
                <div className="relative h-8 rounded-full overflow-hidden bg-muted">
                  {/* 구간 색상 */}
                  <div className="absolute inset-0 flex">
                    <div className="h-full bg-red-200/50" style={{ width: '40%' }} />
                    <div className="h-full bg-yellow-200/50" style={{ width: '20%' }} />
                    <div className="h-full bg-blue-200/50" style={{ width: '15%' }} />
                    <div className="h-full bg-green-200/50" style={{ width: '25%' }} />
                  </div>
                  {/* ICC 마커 */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-foreground"
                    style={{ left: `${Math.max(0, Math.min(100, results.icc * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                  <span>0.0</span>
                  <span>0.40 불량</span>
                  <span>0.60 보통</span>
                  <span>0.75 양호</span>
                  <span>1.0 우수</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
