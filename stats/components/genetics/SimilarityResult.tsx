'use client'

import { useCallback, useMemo } from 'react'
import { downloadCsvFile } from '@/lib/utils/download-file'
import { Download, RotateCcw } from 'lucide-react'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { resolveAxisColors } from '@/lib/charts/chart-color-resolver'
import { Button } from '@/components/ui/button'
import type { EChartsOption } from 'echarts'
import type { SimilarityResultData } from '@/app/genetics/similarity/SimilarityContent'

interface SimilarityResultProps {
  result: SimilarityResultData
  analysisName: string
  onReset: () => void
}

export function SimilarityResult({ result, analysisName, onReset }: SimilarityResultProps): React.ReactElement {
  // resolveAxisColors()는 매번 새 객체 반환 — useMemo로 theme 변경 시에만 재계산
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ax = useMemo(() => resolveAxisColors(), [])

  const heatmapOption = useMemo((): EChartsOption => {
    const { distanceMatrix, labels } = result
    const data: [number, number, number][] = []
    for (let y = 0; y < labels.length; y++) {
      for (let x = 0; x < labels.length; x++) {
        data.push([x, y, distanceMatrix[y][x]])
      }
    }

    return {
      grid: { left: 100, right: 80, top: 30, bottom: 100, containLabel: false },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 10, color: ax.axisLabel, rotate: 45 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: labels,
        axisLabel: { fontSize: 10, color: ax.axisLabel },
        splitLine: { show: false },
      },
      visualMap: {
        min: 0,
        max: Math.max(result.maxDistance, 0.01),
        calculable: true,
        orient: 'vertical',
        right: 0,
        top: 'center',
        inRange: { color: ['#f0f9ff', '#3b82f6', '#1e3a5f'] },
        textStyle: { color: ax.axisLabel, fontSize: 11 },
      },
      series: [{
        type: 'heatmap',
        data,
        label: {
          show: labels.length <= 15,
          fontSize: 9,
          formatter: (params: unknown) => {
            const p = params as { value: [number, number, number] }
            return p.value[2] === 0 ? '' : p.value[2].toFixed(3)
          },
        },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' } },
      }],
      tooltip: {
        formatter: (params: unknown) => {
          const p = params as { value: [number, number, number] }
          const xi = p.value[0], yi = p.value[1]
          return `${labels[yi]} × ${labels[xi]}<br/>거리 = <b>${p.value[2].toFixed(4)}</b>`
        },
      },
    }
  }, [result, ax])

  const dendrogramOption = useMemo((): EChartsOption | null => {
    const { dendrogram } = result
    if (!dendrogram?.mergeMatrix?.length) return null

    const { labels, mergeMatrix } = dendrogram
    const n = labels.length

    // linkage matrix → tree 변환
    type TreeNode = { name: string; children?: TreeNode[]; value?: number }
    const nodes: TreeNode[] = labels.map(l => ({ name: l }))

    for (const [a, b, dist] of mergeMatrix) {
      const left = nodes[a]
      const right = nodes[b]
      if (!left || !right) continue
      const parent: TreeNode = {
        name: '',
        children: [left, right],
        value: dist,
      }
      nodes.push(parent)
    }

    const root = nodes[nodes.length - 1]
    if (!root) return null

    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name?: string; value?: number }
          if (!p.name) return `거리: ${p.value?.toFixed(4) ?? '-'}`
          return p.name
        },
      },
      series: [{
        type: 'tree',
        data: [root],
        layout: 'orthogonal',
        orient: 'LR',
        symbol: 'circle',
        symbolSize: 6,
        label: {
          position: 'right',
          fontSize: 11,
          color: ax.axisLabel,
        },
        leaves: {
          label: { position: 'right', align: 'left' },
        },
        lineStyle: { color: ax.splitLine, width: 1.5 },
        expandAndCollapse: false,
        animationDuration: 300,
      }],
    }
  }, [result, ax])

  const handleExportCsv = useCallback(() => {
    const { labels, distanceMatrix } = result
    const header = ['', ...labels].join(',')
    const rows = labels.map((label, i) =>
      [label, ...distanceMatrix[i].map(d => d.toFixed(6))].join(',')
    )
    const csv = [header, ...rows].join('\n')
    downloadCsvFile(csv, `distance_matrix_${result.model}_${new Date().toISOString().slice(0, 10)}.csv`)
  }, [result])

  const heatmapHeight = Math.max(350, result.sequenceCount * 30 + 150)

  return (
    <div className="space-y-6" role="region" aria-label="유사도 분석 결과">
      {/* 요약 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{analysisName}</h2>
          <p className="text-sm text-muted-foreground">
            {result.sequenceCount}개 서열 · {result.alignmentLength} bp 정렬 · {result.model}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            새 분석
          </Button>
        </div>
      </div>

      {/* 통계 요약 카드 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">최소 거리</p>
          <p className="text-xl font-bold font-mono">{result.minDistance.toFixed(4)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">평균 거리</p>
          <p className="text-xl font-bold font-mono">{result.meanDistance.toFixed(4)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-xs text-muted-foreground">최대 거리</p>
          <p className="text-xl font-bold font-mono">{result.maxDistance.toFixed(4)}</p>
        </div>
      </div>

      {result.saturatedPairCount > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-50/50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
          {result.saturatedPairCount}개 쌍에서 거리 포화 (∞) — 행렬에 9.999로 표시, 요약 통계에서는 제외됨
        </div>
      )}

      {/* 히트맵 */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">거리 행렬 히트맵</h3>
        <LazyReactECharts
          option={heatmapOption}
          style={{ height: heatmapHeight }}
          opts={{ renderer: 'svg' }}
        />
      </div>

      {/* 덴드로그램 */}
      {dendrogramOption && (
        <div className="rounded-lg border bg-card p-4">
          <div className="mb-3 flex items-baseline gap-2">
            <h3 className="text-sm font-semibold">UPGMA 덴드로그램</h3>
            <span className="text-[10px] text-muted-foreground">토폴로지만 표시 — 가지 길이는 실제 거리 비례가 아닙니다. 거리값은 노드 클릭으로 확인하세요.</span>
          </div>
          <LazyReactECharts
            option={dendrogramOption}
            style={{ height: Math.max(300, result.sequenceCount * 35) }}
            opts={{ renderer: 'svg' }}
          />
        </div>
      )}

      {/* 거리 행렬 테이블 */}
      {result.sequenceCount <= 20 && (
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">거리 행렬</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs font-mono">
              <thead>
                <tr>
                  <th className="pb-2 pr-3 text-left" />
                  {result.labels.map(l => (
                    <th key={l} className="pb-2 px-2 text-right font-medium">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.labels.map((rowLabel, i) => (
                  <tr key={rowLabel}>
                    <td className="py-1 pr-3 font-medium">{rowLabel}</td>
                    {result.distanceMatrix[i].map((d, j) => (
                      <td key={j} className={`py-1 px-2 text-right ${i === j ? 'text-gray-300' : ''}`}>
                        {d.toFixed(4)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
