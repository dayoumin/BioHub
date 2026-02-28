'use client';

/**
 * Chart preview panel
 *
 * Uses Apache ECharts (via echarts-for-react) for rendering.
 * ChartSpec -> chartSpecToECharts() -> ReactECharts
 *
 * echartsRef: 부모(GraphStudioPage)에서 주입 — Export 시 getEchartsInstance() 호출용
 * opts.renderer: exportConfig.format === 'svg' 시 'svg' 렌더러로 자동 전환
 *
 * 유의성 마커: chart.on('finished') 후 convertToPixel → graphic 오버레이
 * - SIG_CHART_TYPES 차트에서만 동작 (bar / grouped-bar / error-bar)
 * - isDrawingRef로 무한 루프 방지 (setOption({ graphic }) 재진입 차단)
 */

import { useCallback, useMemo, useRef, type RefObject } from 'react';
import ReactECharts from 'echarts-for-react';
import type EChartsReactCore from 'echarts-for-react/lib/core';
import type { ECharts } from 'echarts';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { chartSpecToECharts, columnsToRows } from '@/lib/graph-studio';
import { getPValueLabel } from '@/lib/graph-studio/chart-spec-utils';
import type { ChartSpec } from '@/types/graph-studio';

interface ChartPreviewProps {
  /** Export 시 getEchartsInstance() 접근용. GraphStudioPage에서 주입. */
  echartsRef?: RefObject<EChartsReactCore | null>;
}

/** 유의성 브래킷을 렌더링할 차트 유형 */
const SIG_CHART_TYPES = new Set<string>(['bar', 'grouped-bar', 'error-bar']);

const BRACKET_LINE_STYLE = { stroke: '#333', lineWidth: 1.5 };
const BRACKET_TICK_H = 6;   // 수직 틱 높이 (px)
const BRACKET_LABEL_GAP = 14; // 라벨과 수평 막대 사이 거리 (px)
const BRACKET_Y_RATIO = 1.12; // yMax 대비 브래킷 높이 배율

/**
 * 유의성 브래킷(horizontal bar + 틱 + 라벨)을 ECharts graphic으로 주입.
 * chart.on('finished') 콜백 안에서만 호출 — convertToPixel 실제 픽셀 좌표 필요.
 */
function drawSignificanceBrackets(
  instance: ECharts,
  spec: ChartSpec,
  rows: Record<string, unknown>[],
): void {
  const marks = spec.significance;
  if (!marks?.length) return;

  const xField = spec.encoding.x.field;
  const yField = spec.encoding.y.field;

  // x 카테고리 목록 (행 순서 기준, 중복 제거)
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const row of rows) {
    const v = String(row[xField]);
    if (!seen.has(v)) { seen.add(v); categories.push(v); }
  }

  // Y 최댓값 (브래킷 위치 기준)
  let yMax = 0;
  for (const row of rows) {
    const v = Number(row[yField]);
    if (!isNaN(v) && v > yMax) yMax = v;
  }

  // 브래킷 Y 픽셀 위치
  const rawBracketY = instance.convertToPixel({ yAxisIndex: 0 }, yMax * BRACKET_Y_RATIO);
  const bracketY = Array.isArray(rawBracketY) ? rawBracketY[1] : rawBracketY;
  if (bracketY === null || bracketY === undefined) return;

  const graphics: Record<string, unknown>[] = [];

  for (const mark of marks) {
    const idxA = categories.indexOf(mark.groupA);
    const idxB = categories.indexOf(mark.groupB);
    if (idxA < 0 || idxB < 0) continue;

    const rawA = instance.convertToPixel({ xAxisIndex: 0 }, idxA);
    const rawB = instance.convertToPixel({ xAxisIndex: 0 }, idxB);
    const pxA = Array.isArray(rawA) ? rawA[0] : rawA;
    const pxB = Array.isArray(rawB) ? rawB[0] : rawB;
    if (pxA === null || pxA === undefined || pxB === null || pxB === undefined) continue;

    const x1 = Math.min(pxA, pxB);
    const x2 = Math.max(pxA, pxB);
    const xMid = (x1 + x2) / 2;
    const label = getPValueLabel(mark);

    // 수평 막대
    graphics.push({
      type: 'line',
      shape: { x1, y1: bracketY, x2, y2: bracketY },
      style: BRACKET_LINE_STYLE,
      silent: true,
    });
    // 왼쪽 수직 틱
    graphics.push({
      type: 'line',
      shape: { x1, y1: bracketY, x2: x1, y2: bracketY + BRACKET_TICK_H },
      style: BRACKET_LINE_STYLE,
      silent: true,
    });
    // 오른쪽 수직 틱
    graphics.push({
      type: 'line',
      shape: { x1: x2, y1: bracketY, x2, y2: bracketY + BRACKET_TICK_H },
      style: BRACKET_LINE_STYLE,
      silent: true,
    });
    // 라벨
    if (label) {
      graphics.push({
        type: 'text',
        x: xMid,
        y: bracketY - BRACKET_LABEL_GAP,
        style: {
          text: label,
          textAlign: 'center',
          fill: '#333',
          fontSize: 13,
        },
        silent: true,
      });
    }
  }

  if (graphics.length) {
    instance.setOption({ graphic: graphics });
  }
}

export function ChartPreview({ echartsRef }: ChartPreviewProps): React.ReactElement {
  const { chartSpec, dataPackage } = useGraphStudioStore();

  // localRef: echartsRef가 주입되지 않을 때 폴백 (유의성 마커 렌더 사용)
  const localRef = useRef<EChartsReactCore | null>(null);

  // setOption({ graphic }) 호출 중 finished 재진입 차단
  const isDrawingRef = useRef(false);

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

  const handleFinished = useCallback(() => {
    if (isDrawingRef.current) return;
    if (!chartSpec?.significance?.length) return;
    if (!SIG_CHART_TYPES.has(chartSpec.chartType)) return;

    const ref = echartsRef ?? localRef;
    const instance = ref.current?.getEchartsInstance();
    if (!instance) return;

    isDrawingRef.current = true;
    drawSignificanceBrackets(instance, chartSpec, rows);
    isDrawingRef.current = false;
  }, [echartsRef, chartSpec, rows]);

  const onEvents = useMemo(
    () => ({ finished: handleFinished }),
    [handleFinished],
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
          ref={echartsRef ?? localRef}
          option={option}
          opts={opts}
          onEvents={onEvents}
          style={{ width: '100%', height: '100%' }}
          notMerge
          lazyUpdate={false}
        />
      </div>

      {/* Bottom status bar */}
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
        <span>
          {chartSpec.encoding.x.field ?? '?'} × {chartSpec.encoding.y.field ?? '?'}
        </span>
        <span>
          {chartSpec.chartType}{chartSpec.chartType === 'violin' ? ' (박스 플롯)' : ''} | {chartSpec.style.preset} | n={rows.length}
        </span>
      </div>
    </div>
  );
}
