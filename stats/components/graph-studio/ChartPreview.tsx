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
 * - isDrawingRef + double-rAF로 무한 루프 방지 (setOption → finished 재진입 차단)
 * - 기존 annotations graphic과 병합하여 덮어쓰기 방지
 */

import { useCallback, useMemo, useRef, type RefObject } from 'react';
import ReactECharts from 'echarts-for-react';
import type EChartsReactCore from 'echarts-for-react/lib/core';
import type { ECharts, EChartsOption } from 'echarts';
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
const BRACKET_TICK_H = 6;   // 틱 길이 (px) — 수직 막대에서 아래 방향, 수평 막대에서 왼쪽 방향
const BRACKET_LABEL_GAP = 14; // 라벨과 브래킷 사이 거리 (px)
const BRACKET_Y_RATIO = 1.12; // 값 축 최댓값 대비 첫 번째 브래킷 위치 배율
const BRACKET_Y_STEP = 0.10;  // 브래킷 간 추가 높이 간격 (좁은→낮게, 넓은→높게)

/**
 * 유의성 브래킷을 ECharts graphic[]으로 생성.
 *
 * 수직 막대(기본): 카테고리=xAxis, 값=yAxis → 수평 브래킷 + 수직 틱
 * 수평 막대: 카테고리=yAxis, 값=xAxis → 수직 브래킷 + 수평 틱
 *
 * baseGraphic: 기존 annotations graphic (덮어쓰기 방지용 — 앞에 유지)
 */
function buildSignificanceGraphics(
  instance: ECharts,
  spec: ChartSpec,
  rows: Record<string, unknown>[],
  baseGraphic: Record<string, unknown>[],
): Record<string, unknown>[] | null {
  const marks = spec.significance;
  if (!marks?.length) return null;

  // error-bar는 converter에서 항상 수직(xAxis=category)으로 렌더링하므로
  // spec.orientation이 'horizontal'이라도 브래킷은 수직 레이아웃을 사용해야 함
  // TODO: converter에 horizontal error-bar 지원 추가 시 이 가드도 동기화 필요
  //       (이상적으로는 converter가 실제 축 레이아웃 메타를 반환하는 방식)
  const isH = spec.orientation === 'horizontal' && spec.chartType !== 'error-bar';
  const xField = spec.encoding.x.field;
  const yField = spec.encoding.y.field;

  // 카테고리 목록 (행 순서 기준, 중복 제거)
  const seen = new Set<string>();
  const categories: string[] = [];
  for (const row of rows) {
    const v = String(row[xField]);
    if (!seen.has(v)) { seen.add(v); categories.push(v); }
  }

  // 값 축 최댓값 (브래킷 위치 기준)
  let valMax = 0;
  for (const row of rows) {
    const v = Number(row[yField]);
    if (!isNaN(v) && v > valMax) valMax = v;
  }

  // 축 인덱스: 수직=카테고리→xAxis(0)/값→yAxis(0), 수평=카테고리→yAxis(0)/값→xAxis(0)
  const catAxisKey = isH ? 'yAxisIndex' : 'xAxisIndex';
  const valAxisKey = isH ? 'xAxisIndex' : 'yAxisIndex';

  // span 오름차순 정렬 (좁은 브래킷 → 낮은 위치, 넓은 브래킷 → 높은 위치)
  // [...marks]로 원본 spec.significance 배열 변이 방지
  const sortedMarks = [...marks].sort((a, b) => {
    const spanA = Math.abs(categories.indexOf(a.groupA) - categories.indexOf(a.groupB));
    const spanB = Math.abs(categories.indexOf(b.groupA) - categories.indexOf(b.groupB));
    return spanA - spanB;
  });

  const brackets: Record<string, unknown>[] = [];
  // 유효한 브래킷만 카운트 (idxA/idxB 미발견 mark 건너뜀 → 인덱스 갭 방지)
  let renderIdx = 0;

  for (const mark of sortedMarks) {
    const idxA = categories.indexOf(mark.groupA);
    const idxB = categories.indexOf(mark.groupB);
    if (idxA < 0 || idxB < 0) continue;

    // 브래킷별 개별 높이: span이 클수록 더 높게 배치
    const bracketVal = valMax * (BRACKET_Y_RATIO + renderIdx * BRACKET_Y_STEP);
    renderIdx++;
    const rawBracketPos = instance.convertToPixel({ [valAxisKey]: 0 }, bracketVal);
    const bracketPos = Array.isArray(rawBracketPos)
      ? (isH ? rawBracketPos[0] : rawBracketPos[1])
      : rawBracketPos;
    if (bracketPos == null) continue;

    const rawA = instance.convertToPixel({ [catAxisKey]: 0 }, idxA);
    const rawB = instance.convertToPixel({ [catAxisKey]: 0 }, idxB);
    // 카테고리 축 픽셀: 수직→x 좌표(index 0), 수평→y 좌표(index 1)
    const pxA = Array.isArray(rawA) ? (isH ? rawA[1] : rawA[0]) : rawA;
    const pxB = Array.isArray(rawB) ? (isH ? rawB[1] : rawB[0]) : rawB;
    if (pxA === null || pxA === undefined || pxB === null || pxB === undefined) continue;

    const c1 = Math.min(pxA, pxB);
    const c2 = Math.max(pxA, pxB);
    const cMid = (c1 + c2) / 2;
    const label = getPValueLabel(mark);

    if (isH) {
      // 수평 막대: 수직 브래킷 (값 축=x, 카테고리 축=y)
      // 수직 연결선
      brackets.push({
        type: 'line',
        shape: { x1: bracketPos, y1: c1, x2: bracketPos, y2: c2 },
        style: BRACKET_LINE_STYLE,
        silent: true,
      });
      // 위쪽 수평 틱
      brackets.push({
        type: 'line',
        shape: { x1: bracketPos, y1: c1, x2: bracketPos - BRACKET_TICK_H, y2: c1 },
        style: BRACKET_LINE_STYLE,
        silent: true,
      });
      // 아래쪽 수평 틱
      brackets.push({
        type: 'line',
        shape: { x1: bracketPos, y1: c2, x2: bracketPos - BRACKET_TICK_H, y2: c2 },
        style: BRACKET_LINE_STYLE,
        silent: true,
      });
      // 라벨 (브래킷 오른쪽)
      if (label) {
        brackets.push({
          type: 'text',
          x: bracketPos + BRACKET_LABEL_GAP,
          y: cMid,
          style: {
            text: label,
            textAlign: 'left',
            textVerticalAlign: 'middle',
            fill: '#333',
            fontSize: 13,
          },
          silent: true,
        });
      }
    } else {
      // 수직 막대(기본): 수평 브래킷 (값 축=y, 카테고리 축=x)
      // 수평 연결선
      brackets.push({
        type: 'line',
        shape: { x1: c1, y1: bracketPos, x2: c2, y2: bracketPos },
        style: BRACKET_LINE_STYLE,
        silent: true,
      });
      // 왼쪽 수직 틱
      brackets.push({
        type: 'line',
        shape: { x1: c1, y1: bracketPos, x2: c1, y2: bracketPos + BRACKET_TICK_H },
        style: BRACKET_LINE_STYLE,
        silent: true,
      });
      // 오른쪽 수직 틱
      brackets.push({
        type: 'line',
        shape: { x1: c2, y1: bracketPos, x2: c2, y2: bracketPos + BRACKET_TICK_H },
        style: BRACKET_LINE_STYLE,
        silent: true,
      });
      // 라벨 (브래킷 위)
      if (label) {
        brackets.push({
          type: 'text',
          x: cMid,
          y: bracketPos - BRACKET_LABEL_GAP,
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
  }

  if (!brackets.length) return null;
  return [...baseGraphic, ...brackets];
}

export function ChartPreview({ echartsRef }: ChartPreviewProps): React.ReactElement {
  const { chartSpec, dataPackage } = useGraphStudioStore();

  // localRef: echartsRef가 주입되지 않을 때 폴백 (유의성 마커 렌더 사용)
  const localRef = useRef<EChartsReactCore | null>(null);

  // setOption({ graphic }) → finished 재진입 차단 (double-rAF 해제)
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
    // 패싯 모드에서는 멀티 grid라 convertToPixel이 단일 grid 가정 → 무시
    if (chartSpec.facet) return;

    const ref = echartsRef ?? localRef;
    const instance = ref.current?.getEchartsInstance();
    if (!instance) return;

    // 기존 annotations graphic 추출 (덮어쓰기 방지)
    const baseGraphic = Array.isArray((option as EChartsOption | null)?.graphic)
      ? ((option as EChartsOption).graphic as Record<string, unknown>[])
      : [];

    const combined = buildSignificanceGraphics(instance, chartSpec, rows, baseGraphic);
    if (!combined) return;

    isDrawingRef.current = true;
    instance.setOption({ graphic: combined });
    // double-rAF: ECharts 내부 렌더 사이클(rAF) 완료 후 가드 해제
    // setOption → dirty flag → rAF 렌더 → finished 재발생 시점에 isDrawingRef=true 유지
    // NOTE: retry 메커니즘은 의도적으로 생략 — setOption 자체가 finished를 트리거하므로
    // 자동 retry는 무한 루프를 유발함. ~32ms 가드 중 missed finished는
    // 다음 사용자 인터랙션에서 자연 복구되며, 브래킷은 시각적 오버레이라 허용 가능.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        isDrawingRef.current = false;
      });
    });
  }, [echartsRef, chartSpec, rows, option]);

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
