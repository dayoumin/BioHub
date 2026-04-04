/**
 * Heatmap chart converter.
 */

import type { EChartsOption } from 'echarts';
import type { ConverterContext } from './types';
import type { AxisSpec } from '@/types/graph-studio';
import {
  toNumber, toStr,
  applyCategorySort,
  xAxisBase,
} from './shared';
import type { StyleConfig } from './types';

// ─── Data builder ──────────────────────────────────────────

function buildHeatmapData(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
  valueField: string | null,
  method: 'mean' | 'sum' | 'count' = 'count',
  sort?: AxisSpec['sort'],
): { xCats: string[]; yCats: string[]; data: [number, number, number][]; min: number; max: number } {
  const xOrder: string[] = [];
  const yOrder: string[] = [];
  const xSet = new Set<string>();
  const ySet = new Set<string>();

  for (const row of rows) {
    const x = toStr(row[xField]);
    const y = toStr(row[yField]);
    if (!xSet.has(x)) { xSet.add(x); xOrder.push(x); }
    if (!ySet.has(y)) { ySet.add(y); yOrder.push(y); }
  }

  const { sorted: sortedX } = applyCategorySort(xOrder, sort);
  const xIndex = new Map<string, number>(sortedX.map((x, i) => [x, i]));
  const yIndex = new Map<string, number>(yOrder.map((y, i) => [y, i]));

  const cells = new Map<string, { count: number; vals: number[] }>();
  for (const row of rows) {
    const key = `${toStr(row[xField])}\u0000${toStr(row[yField])}`;
    if (!cells.has(key)) cells.set(key, { count: 0, vals: [] });
    const cell = cells.get(key);
    if (!cell) continue;
    cell.count++;
    if (valueField !== null) {
      const val = toNumber(row[valueField]);
      if (!isNaN(val)) cell.vals.push(val);
    }
  }

  const data: [number, number, number][] = [];
  for (const [key, cell] of cells) {
    const parts = key.split('\u0000');
    if (parts.length !== 2) continue;
    const [xc, yc] = parts;
    const xi = xIndex.get(xc) ?? -1;
    const yi = yIndex.get(yc) ?? -1;
    if (xi < 0 || yi < 0) continue;
    let agg: number;
    if (method === 'count') {
      agg = cell.count;
    } else if (method === 'sum') {
      agg = cell.vals.reduce((a, b) => a + b, 0);
    } else {
      agg = cell.vals.length ? cell.vals.reduce((a, b) => a + b, 0) / cell.vals.length : 0;
    }
    data.push([xi, yi, agg]);
  }

  let min = 0;
  let max = 1;
  if (data.length) {
    min = data[0][2];
    max = data[0][2];
    for (const [,, v] of data) { if (v < min) min = v; if (v > max) max = v; }
  }

  return { xCats: sortedX, yCats: yOrder, data, min, max };
}

// ─── Chart builder ─────────────────────────────────────────

export function buildHeatmapChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, style, base, xField, yField } = ctx;
  const valueField = spec.encoding.color?.field ?? null;
  const defaultMethod = valueField ? 'mean' : 'count';
  const aggY = spec.aggregate?.y;
  const aggMethod = (aggY === 'mean' || aggY === 'sum' || aggY === 'count')
    ? aggY
    : defaultMethod;

  const { xCats, yCats, data, min, max } = buildHeatmapData(
    rows, xField, yField, valueField, aggMethod, spec.encoding.x.sort,
  );

  return {
    ...base,
    grid: { ...base.grid, bottom: '18%' },
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number] };
        const [xi, yi, val] = p.data;
        return `${xCats[xi]} × ${yCats[yi]}: ${val.toFixed(3)}`;
      },
    },
    xAxis: {
      ...xAxisBase(spec, style, 'category'),
      data: xCats,
      splitArea: { show: true },
    },
    yAxis: {
      type: 'category',
      data: yCats,
      name: spec.encoding.y.title ?? yField,
      nameLocation: 'middle',
      nameGap: 48,
      nameTextStyle: { fontFamily: style.fontFamily, fontSize: spec.encoding.y.titleFontSize ?? style.axisTitleSize },
      axisLabel: { fontFamily: style.fontFamily, fontSize: spec.encoding.y.labelFontSize ?? style.labelSize },
      splitArea: { show: true },
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '2%',
      inRange: { color: ['#f5f5f5', '#4575b4'] },
      textStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
    },
    series: [{
      type: 'heatmap',
      data,
      label: { show: data.length <= 100, fontFamily: style.fontFamily, fontSize: style.labelSize - 1 },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
  };
}
