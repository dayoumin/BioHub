/**
 * 분석 차트 전용 ECharts 유틸
 *
 * Graph Studio의 ChartSpec 파이프라인과 독립.
 * 공유하는 건 ECharts 라이브러리 + OkabeIto 색상 팔레트뿐.
 */

import type { EChartsOption } from 'echarts';
import { JOURNAL_PALETTES } from '@/lib/graph-studio/chart-spec-defaults';
import { resolveAxisColors } from './chart-color-resolver';

/** 분석 차트 공통 색상 (OkabeIto — 색맹 안전) */
export const STAT_COLORS: string[] = JOURNAL_PALETTES.OkabeIto;

/** 분석 차트 공통 기본 옵션 */
export function statBaseOption(): Partial<EChartsOption> {
  return {
    animation: true,
    animationDuration: 300,
    textStyle: { fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 12 },
    grid: { left: 60, right: 20, top: 30, bottom: 50, containLabel: true },
  };
}

/** 카테고리 축 기본 설정 */
export function statCategoryAxis(
  categories: string[],
  label?: string,
): Record<string, unknown> {
  const ax = resolveAxisColors();
  return {
    type: 'category' as const,
    data: categories,
    name: label ?? '',
    nameLocation: 'middle',
    nameGap: 30,
    axisLine: { lineStyle: { color: ax.axisLine } },
    axisTick: { alignWithLabel: true },
    axisLabel: {
      fontSize: 11,
      color: ax.axisLabel,
      rotate: categories.length > 6 ? 30 : 0,
    },
  };
}

/** 수치 축 기본 설정 */
export function statValueAxis(title?: string): Record<string, unknown> {
  const ax = resolveAxisColors();
  return {
    type: 'value' as const,
    name: title ?? '',
    nameLocation: 'middle',
    nameGap: 45,
    axisLine: { lineStyle: { color: ax.axisLine } },
    splitLine: { lineStyle: { color: ax.splitLine, type: 'dashed' as const } },
    axisLabel: { fontSize: 11, color: ax.axisLabel },
  };
}

/** 공통 tooltip 스타일 (overrides로 trigger/formatter 등 확장 가능) */
export function statTooltip(overrides?: Record<string, unknown>): Record<string, unknown> {
  const ax = resolveAxisColors();
  return {
    trigger: 'item',
    backgroundColor: ax.tooltipBg,
    borderColor: ax.tooltipBorder,
    borderWidth: 1,
    textStyle: { color: ax.tooltipText, fontSize: 12 },
    extraCssText: 'box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
    ...overrides,
  };
}

/** 에러바 커스텀 시리즈 (mean ± std/sem 수직선 + 캡) */
export function errorBarSeries(
  data: Array<[number, number, number]>,
  opts?: { halfWidth?: number; stroke?: string; lineWidth?: number },
): Record<string, unknown> {
  const hw = opts?.halfWidth ?? 6;
  const stroke = opts?.stroke ?? resolveAxisColors().tooltipText;
  const lw = opts?.lineWidth ?? 2;
  return {
    type: 'custom',
    renderItem(_params: unknown, api: Record<string, (...args: unknown[]) => unknown>) {
      const categoryIndex = api.value(0);
      const upper = api.value(1) as number;
      const lower = api.value(2) as number;
      const coordUpper = api.coord([categoryIndex, upper]) as number[];
      const coordLower = api.coord([categoryIndex, lower]) as number[];
      return {
        type: 'group',
        children: [
          { type: 'line', shape: { x1: coordUpper[0], y1: coordUpper[1], x2: coordLower[0], y2: coordLower[1] }, style: { stroke, lineWidth: lw } },
          { type: 'line', shape: { x1: coordUpper[0] - hw, y1: coordUpper[1], x2: coordUpper[0] + hw, y2: coordUpper[1] }, style: { stroke, lineWidth: lw } },
          { type: 'line', shape: { x1: coordLower[0] - hw, y1: coordLower[1], x2: coordLower[0] + hw, y2: coordLower[1] }, style: { stroke, lineWidth: lw } },
        ],
      };
    },
    encode: { x: 0, y: [1, 2] },
    data,
    z: 10,
  };
}
