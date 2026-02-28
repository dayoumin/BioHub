'use client';

/**
 * Chart preview panel
 *
 * Uses Apache ECharts (via echarts-for-react) for rendering.
 * ChartSpec -> chartSpecToECharts() -> ReactECharts
 */

import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { chartSpecToECharts, columnsToRows } from '@/lib/graph-studio';

export function ChartPreview(): React.ReactElement {
  const { chartSpec, dataPackage } = useGraphStudioStore();

  const rows = useMemo(
    () => dataPackage ? columnsToRows(dataPackage.data) : [],
    [dataPackage],
  );

  const option = useMemo(
    () => chartSpec ? chartSpecToECharts(chartSpec, rows) : null,
    [chartSpec, rows],
  );

  if (!chartSpec) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Upload data to start
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* ECharts canvas */}
      <div className="flex-1 min-h-0">
        <ReactECharts
          option={option}
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
          {chartSpec.chartType} | {chartSpec.style.preset} | {rows.length} rows
        </span>
      </div>
    </div>
  );
}
