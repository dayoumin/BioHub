'use client';

/**
 * Chart preview panel
 *
 * Uses Apache ECharts (via echarts-for-react) for rendering.
 * ChartSpec -> chartSpecToECharts() -> ReactECharts
 *
 * echartsRef: 부모(GraphStudioPage)에서 주입 — Export 시 getEchartsInstance() 호출용
 * opts.renderer: exportConfig.format === 'svg' 시 'svg' 렌더러로 자동 전환
 */

import { useMemo, type RefObject } from 'react';
import ReactECharts from 'echarts-for-react';
import type EChartsReactCore from 'echarts-for-react/lib/core';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { chartSpecToECharts, columnsToRows } from '@/lib/graph-studio';

interface ChartPreviewProps {
  /** Export 시 getEchartsInstance() 접근용. GraphStudioPage에서 주입. */
  echartsRef?: RefObject<EChartsReactCore | null>;
}

export function ChartPreview({ echartsRef }: ChartPreviewProps): React.ReactElement {
  const { chartSpec, dataPackage } = useGraphStudioStore();

  const rows = useMemo(
    () => dataPackage ? columnsToRows(dataPackage.data) : [],
    [dataPackage],
  );

  const option = useMemo(
    () => chartSpec ? chartSpecToECharts(chartSpec, rows) : null,
    [chartSpec, rows],
  );

  // SVG export 선택 시 SVG 렌더러 사용 (getDataURL 정확도 보장)
  // useMemo로 안정화: opts 매 렌더 새 객체 생성 시 ECharts 불필요한 재초기화 방지
  const opts = useMemo(
    (): { renderer: 'svg' | 'canvas' } => ({
      renderer: chartSpec?.exportConfig.format === 'svg' ? 'svg' : 'canvas',
    }),
    [chartSpec?.exportConfig.format],
  );

  if (!chartSpec) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        데이터를 업로드하면 차트가 표시됩니다
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* ECharts canvas */}
      <div className="flex-1 min-h-0">
        <ReactECharts
          ref={echartsRef}
          option={option}
          opts={opts}
          style={{ width: '100%', height: '100%' }}
          notMerge
          lazyUpdate={false}
        />
      </div>

      {/* Bottom status bar */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
        <span>
          {chartSpec.encoding.x.field} × {chartSpec.encoding.y.field}
        </span>
        <span>
          {chartSpec.chartType}{chartSpec.chartType === 'violin' ? ' (박스 플롯)' : ''} | {chartSpec.style.preset} | n={rows.length}
        </span>
      </div>
    </div>
  );
}
