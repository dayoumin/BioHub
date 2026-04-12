/**
 * Distribution chart converters: boxplot, violin, histogram.
 * Includes KDE utilities for violin rendering.
 */

import type { EChartsOption } from 'echarts';
import type { ConverterContext } from './types';
import type { AxisSpec } from '@/types/graph-studio';
import {
  toNumber, toStr,
  applyCategorySort, reorderByIndexMap,
  percentile,
  boxplotTooltipFormatter,
  applyMarkLineAnnotations,
  xAxisBase, yAxisBase,
} from './shared';

// ─── Data builders ─────────────────────────────────────────

/** Compute boxplot statistics [min, Q1, median, Q3, max] per category. */
function buildBoxplotData(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
  sort?: AxisSpec['sort'],
): { categories: string[]; data: [number, number, number, number, number][] } {
  const order: string[] = [];
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const cat = toStr(row[xField]);
    const val = toNumber(row[yField]);
    if (!groups.has(cat)) { groups.set(cat, []); order.push(cat); }
    if (!isNaN(val)) {
      const arr = groups.get(cat);
      if (arr) arr.push(val);
    }
  }

  const categories: string[] = [];
  const data: [number, number, number, number, number][] = [];

  for (const cat of order) {
    const vals = groups.get(cat) ?? [];
    if (!vals.length) continue;
    const s = [...vals].sort((a, b) => a - b);
    categories.push(cat);
    data.push([s[0], percentile(s, 0.25), percentile(s, 0.5), percentile(s, 0.75), s[s.length - 1]]);
  }

  if (sort) {
    const { sorted, indexMap } = applyCategorySort(categories, sort);
    return { categories: sorted, data: reorderByIndexMap(data, indexMap) };
  }
  return { categories, data };
}

/** Group raw values per category for violin KDE rendering. */
function buildViolinGroups(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
  sort?: AxisSpec['sort'],
): { categories: string[]; groups: number[][] } {
  const order: string[] = [];
  const map = new Map<string, number[]>();

  for (const row of rows) {
    const cat = toStr(row[xField]);
    const val = toNumber(row[yField]);
    if (isNaN(val)) continue;
    if (!map.has(cat)) { map.set(cat, []); order.push(cat); }
    const arr = map.get(cat);
    if (arr) arr.push(val);
  }

  const categories = order;
  const grps = order.map(c => map.get(c) ?? []);

  if (sort) {
    const { sorted, indexMap } = applyCategorySort(categories, sort);
    return { categories: sorted, groups: reorderByIndexMap(grps, indexMap) };
  }
  return { categories, groups: grps };
}

// ─── Violin KDE utilities ────────────────────────────────────

function epanechnikovKernel(u: number): number {
  return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0;
}

function silvermanBandwidth(values: number[]): number {
  const n = values.length;
  if (n < 2) return 1;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1);
  const std = Math.sqrt(variance);
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const iqrScaled = iqr > 0 ? iqr / 1.34 : Infinity;
  const spread = Math.min(std, iqrScaled);
  if (spread <= 0) {
    const range = sorted[sorted.length - 1] - sorted[0];
    return Math.max(range * 0.1, Math.abs(mean) * 0.1, 0.1);
  }
  return 0.9 * spread * n ** (-0.2);
}

function computeKDE(
  values: number[],
  binCount: number,
): { y: number; density: number }[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bw = silvermanBandwidth(values);
  const lo = min - 2 * bw;
  const hi = max + 2 * bw;
  const step = (hi - lo) / (binCount - 1);

  const result: { y: number; density: number }[] = [];
  for (let i = 0; i < binCount; i++) {
    const yVal = lo + i * step;
    let sum = 0;
    for (const v of values) {
      sum += epanechnikovKernel((yVal - v) / bw);
    }
    result.push({ y: yVal, density: sum / (values.length * bw) });
  }
  return result;
}

/** Bin numeric data for histogram using Sturges' rule. */
function buildHistogramData(
  rows: Record<string, unknown>[],
  field: string,
): { labels: string[]; counts: number[] } {
  const vals = rows.map(r => toNumber(r[field])).filter(v => !isNaN(v));
  if (!vals.length) return { labels: [], counts: [] };

  let min = Infinity;
  let max = -Infinity;
  for (const v of vals) { if (v < min) min = v; if (v > max) max = v; }
  const binCount = Math.max(5, Math.ceil(Math.log2(vals.length) + 1));
  const binWidth = (max - min) / binCount || 1;

  const counts = new Array<number>(binCount).fill(0);
  for (const v of vals) {
    const idx = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
    counts[idx]++;
  }

  const fmt = (n: number): string => Number.isInteger(n) ? String(n) : n.toFixed(2);
  const labels = Array.from({ length: binCount }, (_, i) =>
    `[${fmt(min + i * binWidth)}, ${fmt(min + (i + 1) * binWidth)})`
  );

  return { labels, counts };
}

// ─── Chart builders ────────────────────────────────────────

export function buildBoxplotChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, style, base, xField, yField } = ctx;
  const { categories, data } = buildBoxplotData(rows, xField, yField, spec.encoding.x.sort);
  return applyMarkLineAnnotations({
    ...base,
    tooltip: { trigger: 'item', formatter: boxplotTooltipFormatter },
    xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
    yAxis: yAxisBase(spec, style),
    series: [{ type: 'boxplot', data }],
  }, spec.annotations, spec.orientation);
}

export function buildViolinChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, style, base, xField, yField } = ctx;
  const { categories, groups } = buildViolinGroups(rows, xField, yField, spec.encoding.x.sort);
  const MIN_N_FOR_VIOLIN = 5;
  const allSmall = groups.every(g => g.length < MIN_N_FOR_VIOLIN);

  // 모든 그룹이 n<5이면 boxplot으로 fallback
  if (allSmall) {
    const { categories: bpCats, data: bpData } = buildBoxplotData(rows, xField, yField, spec.encoding.x.sort);
    return applyMarkLineAnnotations({
      ...base,
      tooltip: { trigger: 'item', formatter: boxplotTooltipFormatter },
      xAxis: { ...xAxisBase(spec, style, 'category'), data: bpCats },
      yAxis: yAxisBase(spec, style),
      series: [{ type: 'boxplot', data: bpData }],
    }, spec.annotations, spec.orientation);
  }

  const BIN_COUNT = 80;
  const AREA_OPACITY = 0.4;

  const kdeCurves = groups.map(g =>
    g.length >= MIN_N_FOR_VIOLIN ? computeKDE(g, BIN_COUNT) : [],
  );
  const kdeMaxDensities = kdeCurves.map(curve => {
    let max = 0;
    for (const p of curve) { if (p.density > max) max = p.density; }
    return max;
  });

  let globalYMin = Infinity;
  let globalYMax = -Infinity;
  for (const curve of kdeCurves) {
    if (curve.length === 0) continue;
    const lo = curve[0].y;
    const hi = curve[curve.length - 1].y;
    if (lo < globalYMin) globalYMin = lo;
    if (hi > globalYMax) globalYMax = hi;
  }
  if (!isFinite(globalYMin)) {
    for (const g of groups) {
      for (const v of g) {
        if (v < globalYMin) globalYMin = v;
        if (v > globalYMax) globalYMax = v;
      }
    }
  }

  const renderItem: (params: Record<string, unknown>, api: Record<string, unknown>) => unknown =
    (params, api) => {
      const dataIndex = params.dataIndex as number;
      const value = api.value as (dim: number) => number;
      const coord = api.coord as (val: [number, number]) => [number, number];
      const size = api.size as ((val: [number, number]) => [number, number]) | undefined;
      const catIdx = value(0);

      const curve = kdeCurves[catIdx];
      if (!curve || curve.length === 0) {
        const cx = coord([catIdx, 0])[0];
        const cy = coord([0, (globalYMin + globalYMax) / 2])[1];
        return {
          type: 'text',
          style: {
            text: `n<${MIN_N_FOR_VIOLIN}`,
            x: cx,
            y: cy,
            fill: '#999',
            fontSize: 11,
            align: 'center',
            verticalAlign: 'middle',
          },
        };
      }

      const maxDensity = kdeMaxDensities[catIdx];
      if (maxDensity <= 0) return null;

      const centerX = coord([catIdx, 0])[0];
      const bandWidth = size
        ? size([1, 0])[0]
        : (categories.length > 1 ? coord([1, 0])[0] - coord([0, 0])[0] : 120);
      const halfWidth = bandWidth * 0.4;

      const rightPoints: [number, number][] = [];
      const leftPoints: [number, number][] = [];

      for (const p of curve) {
        if (p.density < 1e-6) continue;
        const py = coord([0, p.y])[1];
        const dx = (p.density / maxDensity) * halfWidth;
        rightPoints.push([centerX + dx, py]);
        leftPoints.push([centerX - dx, py]);
      }

      if (rightPoints.length < 2) return null;

      const points = [...rightPoints, ...leftPoints.reverse()];

      const visual = api.visual as (key: string) => string;
      return {
        type: 'polygon',
        shape: { points },
        style: {
          fill: visual('color'),
          opacity: AREA_OPACITY,
          stroke: visual('color'),
          lineWidth: 1,
        },
        z2: dataIndex,
      };
    };

  const yMid = (globalYMin + globalYMax) / 2;
  const data: [number, number][] = categories.map((_, i) => [i, yMid]);

  return applyMarkLineAnnotations({
    ...base,
    tooltip: {
      trigger: 'item',
      formatter: (params: unknown) => {
        const p = params as { dataIndex: number };
        const catIdx = p.dataIndex;
        const vals = groups[catIdx];
        if (!vals?.length) return '';
        const s = [...vals].sort((a, b) => a - b);
        return [
          categories[catIdx],
          `N: ${vals.length}`,
          `Min: ${s[0].toFixed(3)}`,
          `Q1: ${percentile(s, 0.25).toFixed(3)}`,
          `Median: ${percentile(s, 0.5).toFixed(3)}`,
          `Q3: ${percentile(s, 0.75).toFixed(3)}`,
          `Max: ${s[s.length - 1].toFixed(3)}`,
        ].join('<br/>');
      },
    },
    xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
    yAxis: { ...yAxisBase(spec, style), min: globalYMin, max: globalYMax },
    series: [{
      type: 'custom',
      renderItem,
      data,
      encode: { x: 0, y: 1 },
    }] as EChartsOption['series'],
  }, spec.annotations, spec.orientation);
}

export function buildHistogramChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, style, base, xField } = ctx;
  const { labels, counts } = buildHistogramData(rows, xField);
  const histXBase = xAxisBase(spec, style, 'category');
  const histAxisLabel = (histXBase.axisLabel ?? {}) as Record<string, unknown>;
  return applyMarkLineAnnotations({
    ...base,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    xAxis: {
      ...histXBase,
      data: labels,
      axisLabel: { ...histAxisLabel, rotate: 30 },
    },
    yAxis: {
      ...yAxisBase(spec, style),
      name: 'Count',
    },
    series: [{ type: 'bar', data: counts, barWidth: '98%', name: 'Count' }],
  }, spec.annotations, spec.orientation);
}
