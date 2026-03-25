'use client'

import { useCallback } from 'react'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { BIO_TABLE } from '@/components/bio-tools/bio-styles'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { AlphaDiversityResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

const INDEX_LABELS: Record<string, string> = {
  shannonH: "Shannon H'",
  simpsonDiversity: 'Simpson 1-D',
  simpsonReciprocal: 'Simpson 1/D',
  margalef: 'Margalef d',
  pielou: "Pielou J'",
}

export default function AlphaDiversityTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<AlphaDiversityResult>({ initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)

  const handleAnalyze = useCallback(() => {
    if (!csvData) return
    runAnalysis('alpha_diversity', { rows: csvData.rows, site_col: siteCol })
  }, [csvData, siteCol, runAnalysis])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { siteCol },
    })
  }, [saveToHistory, tool, siteCol])

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={handleDataLoaded}
        onClear={handleClear}
        description="종×지점 행렬 CSV (행=지점, 열=종, 첫 열=지점명)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex items-center gap-4">
          <BioColumnSelect label="지점명 열" headers={csvData.headers} value={siteCol} onChange={setSiteCol} />
          <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
            {isAnalyzing ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />분석 중...</> : '분석 실행'}
          </Button>
        </div>
      )}

      <BioErrorBanner error={error} />

      {results && (
        <div ref={resultsRef} className="space-y-6">
          <BioResultsHeader onSave={handleSave} isSaved={isSaved} />
          <div>
            <h3 className="text-sm font-semibold mb-2">지점별 다양성 지수</h3>
            <div className="overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                    <th className={`text-left ${BIO_TABLE.headerCell}`}>지점</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>종수 (S)</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>개체수 (N)</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>Shannon H&apos;</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>Simpson 1-D</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>Margalef d</th>
                    <th className={`text-right ${BIO_TABLE.headerCell}`}>Pielou J&apos;</th>
                  </tr>
                </thead>
                <tbody>
                  {results.siteResults.map((r) => (
                    <tr key={r.siteName} className="border-b last:border-b-0">
                      <td className={`${BIO_TABLE.bodyCell} font-medium`}>{r.siteName}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{r.speciesRichness}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{r.totalAbundance}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{r.shannonH}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{r.simpsonDiversity}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{r.margalef}</td>
                      <td className={`text-right ${BIO_TABLE.bodyCell}`}>{r.pielou}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {results.summaryTable.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">요약 통계</h3>
              <div className="overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                      <th className={`text-left ${BIO_TABLE.headerCell}`}>지수</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>평균</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>표준편차</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>최소</th>
                      <th className={`text-right ${BIO_TABLE.headerCell}`}>최대</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.summaryTable.map((s) => (
                      <tr key={s.index} className="border-b last:border-b-0">
                        <td className={`${BIO_TABLE.bodyCell} font-medium`}>{INDEX_LABELS[s.index] ?? s.index}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{s.mean}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{s.sd}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{s.min}</td>
                        <td className={`text-right ${BIO_TABLE.bodyCell}`}>{s.max}</td>
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
