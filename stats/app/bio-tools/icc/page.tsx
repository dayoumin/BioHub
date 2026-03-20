'use client'

import { useCallback, useState } from 'react'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

interface IccResult {
  icc: number
  iccType: string
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

const INTERPRETATION_LABELS: Record<string, { label: string; color: string }> = {
  poor: { label: '불량 (Poor, < 0.40)', color: 'text-red-600' },
  fair: { label: '보통 (Fair, 0.40–0.59)', color: 'text-yellow-600' },
  good: { label: '양호 (Good, 0.60–0.74)', color: 'text-blue-600' },
  excellent: { label: '우수 (Excellent, ≥ 0.75)', color: 'text-green-600' },
}

function formatNum(n: number, digits = 3): string {
  return Number(n).toFixed(digits)
}

function formatP(p: number): string {
  if (p < 0.001) return '< 0.001'
  return p.toFixed(3)
}

export default function IccPage(): React.ReactElement {
  const { csvData, isAnalyzing, results, error, handleDataLoaded, runAnalysis } =
    useBioToolAnalysis<IccResult>({ worker: PyodideWorker.Survival })

  const [subjectCol, setSubjectCol] = useState('')
  const [iccType, setIccType] = useState<string>('ICC3_1')

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
          description="ICC CSV (첫 열: 대상ID, 나머지 열: 측정값/평가자별 값)"
        />

        {csvData && (
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">대상(Subject) 열</label>
              <select
                value={subjectCol}
                onChange={(e) => setSubjectCol(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-background block"
              >
                {csvData.headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ICC 유형</label>
              <select
                value={iccType}
                onChange={(e) => setIccType(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-background block"
              >
                <option value="ICC1_1">ICC(1,1) One-way random</option>
                <option value="ICC2_1">ICC(2,1) Two-way random</option>
                <option value="ICC3_1">ICC(3,1) Two-way mixed</option>
              </select>
            </div>
            <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
              {isAnalyzing ? '분석 중...' : '분석 실행'}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {results && (
          <div className="space-y-6">
            {/* ICC 결과 */}
            <div>
              <h3 className="text-sm font-semibold mb-2">ICC 분석 결과</h3>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2">항목</th>
                      <th className="text-right px-3 py-2">값</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-2">유형</td>
                      <td className="text-right px-3 py-2">{ICC_TYPE_LABELS[results.iccType] ?? results.iccType}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">ICC</td>
                      <td className="text-right px-3 py-2 font-semibold text-lg">{formatNum(results.icc)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">95% CI</td>
                      <td className="text-right px-3 py-2">
                        [{formatNum(results.ci[0])}, {formatNum(results.ci[1])}]
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">해석 (Cicchetti, 1994)</td>
                      <td className={`text-right px-3 py-2 font-medium ${INTERPRETATION_LABELS[results.interpretation]?.color ?? ''}`}>
                        {INTERPRETATION_LABELS[results.interpretation]?.label ?? results.interpretation}
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">F</td>
                      <td className="text-right px-3 py-2">{formatNum(results.fValue, 2)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">df</td>
                      <td className="text-right px-3 py-2">({results.df1}, {results.df2})</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">p-value</td>
                      <td className="text-right px-3 py-2 font-medium">{formatP(results.pValue)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">대상 수 (n)</td>
                      <td className="text-right px-3 py-2">{results.nSubjects}</td>
                    </tr>
                    <tr className="border-b last:border-b-0">
                      <td className="px-3 py-2">평가자/측정 수 (k)</td>
                      <td className="text-right px-3 py-2">{results.nRaters}</td>
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
                    <tr className="border-b bg-muted/30">
                      <th className="text-left px-3 py-2">변동원</th>
                      <th className="text-right px-3 py-2">MS</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-3 py-2">대상간 (Between Subjects)</td>
                      <td className="text-right px-3 py-2">{formatNum(results.msRows, 4)}</td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-3 py-2">평가자간 (Between Raters)</td>
                      <td className="text-right px-3 py-2">{formatNum(results.msCols, 4)}</td>
                    </tr>
                    <tr className="border-b last:border-b-0">
                      <td className="px-3 py-2">잔차 (Residual)</td>
                      <td className="text-right px-3 py-2">{formatNum(results.msError, 4)}</td>
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
