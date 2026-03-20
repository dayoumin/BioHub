'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { getBioToolById } from '@/lib/bio-tools/bio-tool-registry'
import { BioToolShell } from '@/components/bio-tools/BioToolShell'
import { BioCsvUpload } from '@/components/bio-tools/BioCsvUpload'
import { Button } from '@/components/ui/button'
import { useBioToolAnalysis } from '@/hooks/use-bio-tool-analysis'
import { BIO_TABLE } from '@/components/bio-tools/bio-styles'

interface BetaDiversityResult {
  distanceMatrix: number[][]
  siteLabels: string[]
  metric: string
}

type MetricOption = 'braycurtis' | 'jaccard' | 'sorensen'

const METRIC_LABELS: Record<MetricOption, string> = {
  braycurtis: 'Bray-Curtis',
  jaccard: 'Jaccard',
  sorensen: 'Sorensen',
}

const tool = getBioToolById('beta-diversity')

export default function BetaDiversityPage(): React.ReactElement {
  const { csvData, siteCol, setSiteCol, isAnalyzing, results, error, handleDataLoaded, runAnalysis } =
    useBioToolAnalysis<BetaDiversityResult>()
  const [metric, setMetric] = useState<MetricOption>('braycurtis')

  const handleAnalyze = useCallback(() => {
    if (!csvData) return
    runAnalysis('beta_diversity', { rows: csvData.rows, site_col: siteCol, metric })
  }, [csvData, siteCol, metric, runAnalysis])

  if (!tool) return <div>도구를 찾을 수 없습니다</div>

  return (
    <BioToolShell tool={tool}>
      <div className="space-y-6">
        <BioCsvUpload
          onDataLoaded={handleDataLoaded}
          description="종×지점 행렬 CSV (행=지점, 열=종)"
        />

        {csvData && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm text-muted-foreground">지점명 열:</label>
            <select
              value={siteCol}
              onChange={(e) => setSiteCol(e.target.value)}
              className="text-sm border rounded-md px-2 py-1 bg-background"
            >
              {csvData.headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>

            <label className="text-sm text-muted-foreground">거리 측도:</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricOption)}
              className="text-sm border rounded-md px-2 py-1 bg-background"
            >
              {Object.entries(METRIC_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>

            <Button onClick={handleAnalyze} disabled={isAnalyzing} size="sm">
              {isAnalyzing ? '분석 중...' : '분석 실행'}
            </Button>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {results && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">
              거리행렬 ({METRIC_LABELS[results.metric as MetricOption] ?? results.metric})
            </h3>

            <div className="overflow-auto border rounded-lg">
              <table className="text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
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
                              : `oklch(0.9 0.05 145 / ${Math.min(val, 1) * 0.6})`,
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
              <Link href="/bio-tools/nmds" className="text-sm text-primary hover:underline">
                NMDS 시각화 →
              </Link>
              <Link href="/bio-tools/permanova" className="text-sm text-primary hover:underline">
                PERMANOVA 검정 →
              </Link>
            </div>
          </div>
        )}
      </div>
    </BioToolShell>
  )
}
