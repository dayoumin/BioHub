// stats/components/genetics/SeqStatsResult.tsx
'use client'

import { useCallback, useMemo, useRef, useEffect } from 'react'
import { downloadCsvFile } from '@/lib/utils/download-file'
import { Download } from 'lucide-react'
import type { SeqStatsResult } from '@/lib/genetics/seq-stats-engine'
import { Button } from '@/components/ui/button'

interface SeqStatsResultProps {
  result: SeqStatsResult
  analysisName: string
  onReset: () => void
}

// ── CSV Export ──

function buildCsv(result: SeqStatsResult): string {
  const lines: string[] = []

  // Summary
  lines.push('=== Summary ===')
  lines.push('Metric,Value')
  lines.push(`Sequence Count,${result.sequenceCount}`)
  lines.push(`Total Length (bp),${result.totalLength}`)
  lines.push(`Mean Length (bp),${result.meanLength.toFixed(1)}`)
  lines.push(`Median Length (bp),${result.medianLength.toFixed(1)}`)
  lines.push(`Min Length (bp),${result.minLength}`)
  lines.push(`Max Length (bp),${result.maxLength}`)
  lines.push(`Std Dev Length,${result.stdDevLength.toFixed(1)}`)
  lines.push(`Overall GC Content,${(result.overallGcContent * 100).toFixed(2)}%`)
  lines.push('')

  // Base composition
  lines.push('=== Base Composition ===')
  lines.push('Base,Count,Percentage')
  const total = result.totalLength
  for (const base of ['A', 'T', 'G', 'C', 'N'] as const) {
    const count = result.baseComposition[base]
    lines.push(`${base},${count},${total > 0 ? ((count / total) * 100).toFixed(2) : '0'}%`)
  }
  lines.push('')

  // Per-sequence
  lines.push('=== Per Sequence ===')
  lines.push('Label,Length (bp),GC Content (%)')
  for (const ps of result.perSequence) {
    lines.push(`${ps.label},${ps.length},${(ps.gcContent * 100).toFixed(2)}`)
  }

  return lines.join('\n')
}

// ── Charts (ECharts lazy) ──

function useECharts(
  containerRef: React.RefObject<HTMLDivElement | null>,
  optionFn: () => Record<string, unknown>,
  deps: unknown[],
): void {
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let chart: { setOption: (opt: Record<string, unknown>) => void; resize: () => void; dispose: () => void } | null = null

    void import('echarts/core').then(async (ec) => {
      const [{ BarChart }, { GridComponent, TooltipComponent, LegendComponent }, { CanvasRenderer }] = await Promise.all([
        import('echarts/charts'),
        import('echarts/components'),
        import('echarts/renderers'),
      ])
      ec.use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])
      if (!el.isConnected) return

      chart = ec.init(el)
      chart.setOption(optionFn())
    })

    const onResize = (): void => { chart?.resize() }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      chart?.dispose()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

function BaseCompositionChart({ result }: { result: SeqStatsResult }): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useECharts(ref, () => {
    const bases = ['A', 'T', 'G', 'C', 'N'] as const
    const colors = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#94a3b8']
    const total = result.totalLength
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 40, right: 16, top: 16, bottom: 28 },
      xAxis: { type: 'category', data: bases },
      yAxis: { type: 'value', name: '%', axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: bases.map((b, i) => ({
          value: total > 0 ? Number(((result.baseComposition[b] / total) * 100).toFixed(2)) : 0,
          itemStyle: { color: colors[i] },
        })),
        barMaxWidth: 40,
      }],
    }
  }, [result])

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">염기 조성</h3>
      <div ref={ref} className="h-[220px] w-full" />
    </div>
  )
}

function LengthDistributionChart({ result }: { result: SeqStatsResult }): React.ReactElement | null {
  const ref = useRef<HTMLDivElement>(null)
  const bins = result.lengthDistribution

  useECharts(ref, () => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: 50, right: 16, top: 16, bottom: 28 },
    xAxis: {
      type: 'category',
      data: bins.map(b => b.binStart === b.binEnd ? `${b.binStart}` : `${b.binStart}-${b.binEnd}`),
      axisLabel: { fontSize: 10 },
    },
    yAxis: { type: 'value', name: '개수', minInterval: 1 },
    series: [{
      type: 'bar',
      data: bins.map(b => b.count),
      barMaxWidth: 40,
      itemStyle: { color: '#6366f1' },
    }],
  }), [bins])

  if (bins.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">길이 분포</h3>
      <div ref={ref} className="h-[220px] w-full" />
    </div>
  )
}

// ── Main ──

export function SeqStatsResultView({ result, analysisName, onReset }: SeqStatsResultProps): React.ReactElement {
  const handleExportCsv = useCallback(() => {
    const csv = buildCsv(result)
    downloadCsvFile(csv, `seq-stats_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [result])

  const gcPercent = (result.overallGcContent * 100).toFixed(1)

  const sortedPerSeq = useMemo(
    () => [...result.perSequence].sort((a, b) => b.length - a.length),
    [result.perSequence],
  )

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-lg font-semibold">{analysisName}</h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{result.sequenceCount}개 서열</span>
            <span>평균 {result.meanLength.toFixed(0)} bp</span>
            <span>GC {gcPercent}%</span>
            <span>총 {result.totalLength.toLocaleString()} bp</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          CSV
        </Button>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <BaseCompositionChart result={result} />
        <LengthDistributionChart result={result} />
      </div>

      {/* Per-sequence table */}
      {sortedPerSeq.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">서열별 통계</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500">
                  <th className="pb-2">#</th>
                  <th className="pb-2">라벨</th>
                  <th className="pb-2 text-right">길이 (bp)</th>
                  <th className="pb-2 text-right">GC%</th>
                  <th className="pb-2 text-right">A</th>
                  <th className="pb-2 text-right">T</th>
                  <th className="pb-2 text-right">G</th>
                  <th className="pb-2 text-right">C</th>
                  <th className="pb-2 text-right">N</th>
                </tr>
              </thead>
              <tbody>
                {sortedPerSeq.map((ps, i) => (
                  <tr key={ps.label} className="border-b border-gray-50">
                    <td className="py-2 text-gray-400">{i + 1}</td>
                    <td className="py-2 font-mono text-xs">{ps.label}</td>
                    <td className="py-2 text-right font-mono">{ps.length}</td>
                    <td className="py-2 text-right font-mono">{(ps.gcContent * 100).toFixed(1)}%</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.A}</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.T}</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.G}</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.C}</td>
                    <td className="py-2 text-right font-mono text-gray-500">{ps.baseComposition.N}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dinucleotide frequency */}
      {Object.keys(result.dinucleotideFrequency).length > 0 && (
        <DinucleotideTable frequency={result.dinucleotideFrequency} />
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onReset}>
          새 분석
        </Button>
      </div>
    </div>
  )
}

function DinucleotideTable({ frequency }: { frequency: Record<string, number> }): React.ReactElement {
  const bases = ['A', 'T', 'G', 'C']
  const total = Object.values(frequency).reduce((s, v) => s + v, 0)

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">디뉴클레오티드 빈도</h3>
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="text-xs text-gray-500">
              <th className="pb-2 pr-3" />
              {bases.map(b => <th key={b} className="pb-2 px-2 text-center font-mono">{b}</th>)}
            </tr>
          </thead>
          <tbody>
            {bases.map(b1 => (
              <tr key={b1}>
                <td className="py-1 pr-3 font-mono text-xs text-gray-500">{b1}</td>
                {bases.map(b2 => {
                  const di = b1 + b2
                  const count = frequency[di] ?? 0
                  const pct = total > 0 ? (count / total) * 100 : 0
                  return (
                    <td key={di} className="px-2 py-1 text-center font-mono text-xs" title={`${di}: ${count}`}>
                      {pct.toFixed(1)}%
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
