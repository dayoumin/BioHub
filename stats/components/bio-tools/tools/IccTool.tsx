'use client'

import { memo, useCallback, useState } from 'react'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'
import { formatNumber, formatPValue } from '@/lib/statistics/formatters'
import { BIO_BADGE_CLASS, BIO_TABLE, SIGNIFICANCE_BADGE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import type { IccResult, IccType } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

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

const IccTool = memo(function IccTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { csvData, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<IccResult>({ worker: PyodideWorker.Survival, initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)

  const [subjectCol, setSubjectCol] = useState('')
  const [iccType, setIccType] = useState<IccType>('ICC3_1')

  const handleData = useCallback(
    (data: Parameters<typeof handleDataLoaded>[0]) => {
      handleDataLoaded(data)
      const headers = data.headers
      setSubjectCol(headers.find(h => /subject|id|sample|fish/i.test(h)) ?? headers[0] ?? '')
    },
    [handleDataLoaded],
  )

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { subjectCol, iccType },
    })
  }, [saveToHistory, tool, subjectCol, iccType])

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

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={handleData}
        onClear={handleClear}
        description="ICC CSV (첫 열: 대상ID, 나머지 열: 측정값/평가자별 값)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex flex-wrap items-end gap-4">
          <BioColumnSelect label="대상(Subject) 열" headers={csvData.headers} value={subjectCol} onChange={setSubjectCol} labelSize="xs" />
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

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-6">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} exportData={getBioExportTables(tool.id, results)} toolName={tool.nameEn} />
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
                        className={BIO_BADGE_CLASS}
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
  )
})

export default IccTool
