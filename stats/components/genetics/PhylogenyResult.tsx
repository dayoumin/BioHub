'use client'

import { useState, useCallback, useMemo } from 'react'
import { Download, RotateCcw, Copy, Check } from 'lucide-react'
import { downloadTextFile } from '@/lib/utils/download-file'
import { LazyReactECharts } from '@/lib/charts/LazyECharts'
import { resolveAxisColors } from '@/lib/charts/chart-color-resolver'
import { parseNewick } from '@/lib/genetics/newick-parser'
import { ResultMetricsGrid, type MetricItem } from '@/components/common/results'
import { Button } from '@/components/ui/button'
import type { EChartsOption } from 'echarts'
import type { PhylogenyResultData } from '@/app/genetics/phylogeny/PhylogenyContent'
import {
  BIOLOGY_INSET_PANEL,
  BIOLOGY_PANEL,
  BIOLOGY_SEGMENTED,
  BIOLOGY_SEGMENTED_ACTIVE,
} from '@/lib/design-tokens/biology'

interface PhylogenyResultProps {
  result: PhylogenyResultData
  analysisName: string
  onReset: () => void
}

type TreeLayout = 'orthogonal' | 'radial'

export function PhylogenyResult({ result, analysisName, onReset }: PhylogenyResultProps): React.ReactElement {
  const [layout, setLayout] = useState<TreeLayout>('orthogonal')
  const [copied, setCopied] = useState(false)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ax = useMemo(() => resolveAxisColors(), [])

  const treeData = useMemo(() => parseNewick(result.newick), [result.newick])

  const treeOption = useMemo((): EChartsOption => {
    const isRadial = layout === 'radial'
    return {
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name?: string; value?: number }
          if (p.value != null) return `${p.name || '(내부 노드)'}<br/>거리: ${p.value.toFixed(6)}`
          return p.name || ''
        },
      },
      series: [{
        type: 'tree' as const,
        data: [treeData],
        layout: isRadial ? 'radial' : 'orthogonal',
        orient: 'LR',
        symbol: 'circle',
        symbolSize: 6,
        label: {
          position: 'right' as const,
          fontSize: 11,
          color: ax.axisLabel,
        },
        leaves: {
          label: {
            position: 'right' as const,
            align: 'left' as const,
          },
        },
        lineStyle: { color: ax.splitLine, width: 1.5 },
        expandAndCollapse: false,
        initialTreeDepth: -1,
        animationDuration: 300,
        roam: true,
      }],
    }
  }, [treeData, layout, ax])

  const handleCopyNewick = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(result.newick)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = result.newick
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result.newick])

  const handleDownloadNewick = useCallback(() => {
    downloadTextFile(result.newick, `phylogeny_${result.method}_${new Date().toISOString().slice(0, 10)}.nwk`)
  }, [result])

  const treeHeight = Math.max(400, result.sequenceCount * 30)
  const metrics: MetricItem[] = [
    { label: '서열 수', value: result.sequenceCount },
    { label: '정렬 길이', value: `${result.alignmentLength} bp` },
    { label: '거리 모델', value: result.distanceModel },
  ]

  return (
    <div className="space-y-6" role="region" aria-label="계통수 분석 결과">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{analysisName}</h2>
          <p className="text-sm text-muted-foreground">
            {result.sequenceCount}개 서열 · {result.alignmentLength} bp · {result.method} · {result.distanceModel}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadNewick} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Newick
          </Button>
          <Button variant="outline" size="sm" onClick={onReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            새 분석
          </Button>
        </div>
      </div>

      <ResultMetricsGrid items={metrics} columns={3} />

      {/* 레이아웃 토글 */}
      <div className="flex gap-2">
        <button
          onClick={() => setLayout('orthogonal')}
          className={layout === 'orthogonal' ? BIOLOGY_SEGMENTED_ACTIVE : BIOLOGY_SEGMENTED}
        >
          직교 (Orthogonal)
        </button>
        <button
          onClick={() => setLayout('radial')}
          className={layout === 'radial' ? BIOLOGY_SEGMENTED_ACTIVE : BIOLOGY_SEGMENTED}
        >
          방사형 (Radial)
        </button>
      </div>

      <div className={`${BIOLOGY_PANEL} p-4`}>
        <div className="mb-3 flex items-baseline gap-2">
          <h3 className="text-sm font-semibold">{result.method} 계통수</h3>
          <span className="text-[10px] text-muted-foreground">토폴로지 표시 — 가지 길이는 거리 비례가 아닙니다. 실제 거리는 Newick 또는 노드 클릭으로 확인하세요.</span>
        </div>
        <LazyReactECharts
          option={treeOption}
          style={{ height: treeHeight }}
          opts={{ renderer: 'svg' }}
        />
      </div>

      {/* Newick 문자열 */}
      <div className={`${BIOLOGY_PANEL} p-4`}>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Newick 문자열</h3>
          <Button variant="ghost" size="sm" onClick={handleCopyNewick} className="gap-1.5 text-xs">
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? '복사됨' : '복사'}
          </Button>
        </div>
        <pre className={`${BIOLOGY_INSET_PANEL} max-h-32 overflow-auto font-mono text-xs leading-relaxed break-all`}>
          {result.newick}
        </pre>
      </div>
    </div>
  )
}
