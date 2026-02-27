'use client';

/**
 * 차트 미리보기 패널
 *
 * Vega-Lite를 사용한 실시간 미리보기.
 * Vega-Lite/Vega-Embed는 동적 import로 로드 (번들 절약).
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { chartSpecToVegaLite } from '@/lib/graph-studio/vega-lite-converter';

export function ChartPreview(): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const { chartSpec, dataPackage } = useGraphStudioStore();
  const [error, setError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);

  const renderChart = useCallback(async () => {
    if (!containerRef.current || !chartSpec || !dataPackage) return;

    setError(null);
    setIsRendering(true);

    try {
      // 동적 import: vega-embed (Vega-Lite 포함)
      const vegaEmbed = (await import('vega-embed')).default;

      // 데이터를 row 형식으로 변환
      const columns = Object.keys(dataPackage.data);
      const rowCount = dataPackage.data[columns[0]]?.length ?? 0;
      const rows: Record<string, unknown>[] = [];

      for (let i = 0; i < rowCount; i++) {
        const row: Record<string, unknown> = {};
        for (const col of columns) {
          row[col] = dataPackage.data[col][i];
        }
        rows.push(row);
      }

      // chartSpec → Vega-Lite spec 변환
      const vegaSpec = chartSpecToVegaLite(chartSpec, rows);

      // 렌더링
      await vegaEmbed(containerRef.current, vegaSpec, {
        actions: false,  // Vega 기본 액션 버튼 숨김
        renderer: 'svg',
        theme: 'quartz',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '차트 렌더링 실패');
    } finally {
      setIsRendering(false);
    }
  }, [chartSpec, dataPackage]);

  useEffect(() => {
    renderChart();
  }, [renderChart]);

  if (!chartSpec) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        데이터를 업로드하세요
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-4">
      {/* 차트 제목 */}
      {chartSpec.title && (
        <h2 className="text-lg font-semibold mb-2 text-center">
          {chartSpec.title}
        </h2>
      )}

      {/* 차트 영역 */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}

        <div
          ref={containerRef}
          className="w-full h-full flex items-center justify-center"
        />

        {error && (
          <div className="absolute bottom-4 left-4 right-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
            {error}
          </div>
        )}
      </div>

      {/* 하단: 데이터 요약 */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
        <span>
          {chartSpec.encoding.x.field} × {chartSpec.encoding.y.field}
        </span>
        <span>
          {chartSpec.chartType} | {chartSpec.style.preset}
        </span>
      </div>
    </div>
  );
}
