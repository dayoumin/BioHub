'use client'

import { memo, useCallback, useState } from 'react'
import Link from 'next/link'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { BioErrorBanner } from '@/components/bio-tools/BioErrorBanner'
import { BioColumnSelect } from '@/components/bio-tools/BioColumnSelect'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { useScrollToResults } from '@/hooks/use-scroll-to-results'
import { BioToolIntro } from '@/components/bio-tools/BioToolIntro'
import { BioResultsHeader } from '@/components/bio-tools/BioResultsHeader'
import { BioResultSummary } from '@/components/common/results'
import { getBioExportTables } from '@/lib/bio-tools/bio-export-tables'
import { BIO_TABLE } from '@/components/bio-tools/bio-styles'
import { BIOLOGY_TABLE_SHELL } from '@/lib/design-tokens/biology'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { BetaDiversityResult } from '@/types/bio-tools-results'
import type { ToolComponentProps } from './types'

type MetricOption = 'braycurtis' | 'jaccard' | 'sorensen'

const METRIC_LABELS: Record<MetricOption, string> = {
  braycurtis: 'Bray-Curtis',
  jaccard: 'Jaccard',
  sorensen: 'Sorensen',
}

/** Distance matrix cell background: oklch(lightness, chroma, hue) */
const DISTANCE_MATRIX_BG_COLOR = 'oklch(0.9 0.05 145'

const BetaDiversityTool = memo(function BetaDiversityTool({ tool, meta, initialEntry }: ToolComponentProps): React.ReactElement {
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, handleClear, runAnalysis, saveToHistory, isSaved } =
    useBioToolAnalysis<BetaDiversityResult>({ initialResults: initialEntry?.results })
  const resultsRef = useScrollToResults(results)
  const [metric, setMetric] = useState<MetricOption>('braycurtis')

  const handleAnalyze = useCallback(() => {
    if (!csvData) return
    runAnalysis('beta_diversity', { rows: csvData.rows, site_col: siteCol, metric })
  }, [csvData, siteCol, metric, runAnalysis])

  const handleSave = useCallback(() => {
    saveToHistory({
      toolId: tool.id,
      toolNameEn: tool.nameEn,
      toolNameKo: tool.nameKo,
      columnConfig: { siteCol, metric },
    })
  }, [saveToHistory, tool, siteCol, metric])

  return (
    <div className="space-y-6">
      <BioToolIntro meta={meta} collapsed={!!results} />
      <BioCsvUpload
        onDataLoaded={handleDataLoaded}
        onClear={handleClear}
        description="종×지점 행렬 CSV (행=지점, 열=종)"
        exampleDataPath={meta.exampleDataPath}
      />

      {csvData && (
        <div className="flex flex-wrap items-center gap-4">
          <BioColumnSelect label="지점명 열" headers={csvData.headers} value={siteCol} onChange={setSiteCol} />

          <label className="text-sm text-muted-foreground">거리 측도:</label>
          <Select value={metric} onValueChange={(v) => setMetric(v as MetricOption)}>
            <SelectTrigger className="h-8 text-sm w-[180px]">
              <SelectValue placeholder="선택..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METRIC_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
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
          <BioResultSummary>
          <h3 className="text-sm font-semibold">
            거리행렬 ({METRIC_LABELS[results.metric as MetricOption] ?? results.metric})
          </h3>

          <div className={BIOLOGY_TABLE_SHELL}>
            <table className="text-sm">
              <thead>
                <tr className={cn('border-b', BIO_TABLE.headerBg)}>
                  <th className={BIO_TABLE.headerCell} />
                  {results.siteLabels.map((l) => (
                    <th key={l} className={`text-right ${BIO_TABLE.headerCell} font-medium`}>{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.distanceMatrix.map((row, i) => (
                  <tr key={results.siteLabels[i]} className="border-b last:border-b-0">
                    <td className={`${BIO_TABLE.bodyCell} font-medium`}>{results.siteLabels[i]}</td>
                    {row.map((val, j) => (
                      <td
                        key={j}
                        className={`text-right ${BIO_TABLE.bodyCell} tabular-nums`}
                        style={{
                          backgroundColor: i === j
                            ? 'transparent'
                            : `${DISTANCE_MATRIX_BG_COLOR} / ${Math.min(val, 1) * 0.6})`,
                        }}
                      >
                        {i === j ? '—' : val.toFixed(4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex gap-3 pt-2">
            <Link href="/bio-tools?tool=nmds" className="text-sm text-primary hover:underline">
              NMDS 시각화 →
            </Link>
            <Link href="/bio-tools?tool=permanova" className="text-sm text-primary hover:underline">
              PERMANOVA 검정 →
            </Link>
          </div>
          </BioResultSummary>
        </div>
      )}
    </div>
  )
})

export default BetaDiversityTool
