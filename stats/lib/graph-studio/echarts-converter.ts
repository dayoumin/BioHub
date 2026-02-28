/**
 * ChartSpec -> ECharts Option converter
 *
 * Converts the internal ChartSpec format into an Apache ECharts option object.
 * This is the sole rendering path for Graph Studio.
 *
 * AI generation path: LLM -> ChartSpec JSON (directly, no intermediate format)
 */

import type { ChartSpec, StylePreset, DataType } from '@/types/graph-studio';
import type { EChartsOption } from 'echarts';
import { STYLE_PRESETS } from './chart-spec-defaults';

// ─── Axis type mapping ─────────────────────────────────────

function getAxisType(dataType: DataType): 'category' | 'value' | 'time' {
  if (dataType === 'quantitative') return 'value';
  if (dataType === 'temporal') return 'time';
  return 'category';
}

/** Sort comparator for temporal [dateStr, value][] data — used by both line paths. */
function sortByDate([a]: [string, number], [b]: [string, number]): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!isNaN(da) && !isNaN(db)) return da - db;
  return a.localeCompare(b);
}

// ─── Style/theme helpers ───────────────────────────────────

const PRESET_COLORS: Record<StylePreset, string[]> = {
  default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
  science: ['#2878b5', '#9ac9db', '#f8ac8c', '#c82423', '#ff8884', '#58be9b', '#a076a1', '#f5c242'],
  ieee: ['#000000', '#555555', '#999999', '#cccccc'],
  grayscale: ['#000000', '#404040', '#808080', '#b0b0b0', '#d0d0d0'],
};

interface StyleConfig {
  fontFamily: string;
  fontSize: number;
  titleSize: number;
  labelSize: number;
  colors: string[];
  background: string;
}

function getStyleConfig(spec: ChartSpec): StyleConfig {
  const preset = STYLE_PRESETS[spec.style.preset] ?? STYLE_PRESETS.default;
  const font = spec.style.font ?? preset.font;
  return {
    fontFamily: font?.family ?? 'Arial, Helvetica, sans-serif',
    fontSize: font?.size ?? 12,
    titleSize: font?.titleSize ?? 14,
    labelSize: font?.labelSize ?? 11,
    colors: spec.style.colors ?? PRESET_COLORS[spec.style.preset] ?? PRESET_COLORS.default,
    background: spec.style.background ?? preset.background ?? '#ffffff',
  };
}

// ─── Data helpers ──────────────────────────────────────────

function toNumber(v: unknown): number {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  if (typeof v === 'string') {
    const n = Number(v);
    return isFinite(n) ? n : NaN;
  }
  return NaN;
}

function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Aggregate rows by groupBy fields. */
function aggregateRows(
  rows: Record<string, unknown>[],
  groupBy: string[],
  yField: string,
  method: 'mean' | 'median' | 'sum' | 'count' | 'min' | 'max',
): Record<string, unknown>[] {
  const groups = new Map<string, number[]>();
  const groupKeys = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const key = groupBy.map(f => toStr(row[f])).join('\u0000');
    if (!groups.has(key)) {
      groups.set(key, []);
      const keyRow: Record<string, unknown> = {};
      for (const f of groupBy) keyRow[f] = row[f];
      groupKeys.set(key, keyRow);
    }
    const val = toNumber(row[yField]);
    if (!isNaN(val)) groups.get(key)!.push(val);
  }

  const result: Record<string, unknown>[] = [];
  for (const [key, vals] of groups) {
    const base = { ...groupKeys.get(key)! };
    if (method === 'count') {
      base[yField] = vals.length;
    } else if (method === 'sum') {
      base[yField] = vals.reduce((a, b) => a + b, 0);
    } else if (method === 'min') {
      // Use loop instead of Math.min(...vals) spread to avoid call stack overflow on large groups
      let minVal = Infinity;
      for (const v of vals) if (v < minVal) minVal = v;
      base[yField] = vals.length ? minVal : 0;
    } else if (method === 'max') {
      // Use loop instead of Math.max(...vals) spread to avoid call stack overflow on large groups
      let maxVal = -Infinity;
      for (const v of vals) if (v > maxVal) maxVal = v;
      base[yField] = vals.length ? maxVal : 0;
    } else if (method === 'median') {
      if (!vals.length) { base[yField] = 0; }
      else {
        const s = [...vals].sort((a, b) => a - b);
        const m = Math.floor(s.length / 2);
        base[yField] = s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
      }
    } else {
      // mean (default)
      base[yField] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    result.push(base);
  }
  return result;
}

/** Build pivoted data for grouped/stacked bar and multi-line charts. */
function buildGroupedData(
  rows: Record<string, unknown>[],
  xField: string,
  colorField: string,
  yField: string,
): { categories: string[]; groups: string[]; seriesData: Map<string, number[]> } {
  const catOrder: string[] = [];
  const catSet = new Set<string>();
  const groupOrder: string[] = [];
  const groupSet = new Set<string>();

  for (const row of rows) {
    const cat = toStr(row[xField]);
    const grp = toStr(row[colorField]);
    if (!catSet.has(cat)) { catSet.add(cat); catOrder.push(cat); }
    if (!groupSet.has(grp)) { groupSet.add(grp); groupOrder.push(grp); }
  }

  // O(1) category lookup
  const catIndex = new Map<string, number>(catOrder.map((c, i) => [c, i]));

  const seriesData = new Map<string, number[]>();
  const seriesCount = new Map<string, number[]>();
  for (const grp of groupOrder) {
    seriesData.set(grp, new Array(catOrder.length).fill(0) as number[]);
    seriesCount.set(grp, new Array(catOrder.length).fill(0) as number[]);
  }

  for (const row of rows) {
    const cat = toStr(row[xField]);
    const grp = toStr(row[colorField]);
    const val = toNumber(row[yField]);
    const idx = catIndex.get(cat) ?? -1;
    if (idx >= 0 && !isNaN(val)) {
      seriesData.get(grp)![idx] += val;
      seriesCount.get(grp)![idx]++;
    }
  }

  // Duplicate (x, group) rows → take mean (spec.aggregate absent, raw data case)
  for (const grp of groupOrder) {
    const vals = seriesData.get(grp)!;
    const counts = seriesCount.get(grp)!;
    for (let i = 0; i < vals.length; i++) {
      if (counts[i] > 1) vals[i] = vals[i] / counts[i];
    }
  }

  return { categories: catOrder, groups: groupOrder, seriesData };
}

/** Linear interpolation percentile (inclusive, same as numpy default). */
function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Compute boxplot statistics [min, Q1, median, Q3, max] per category. */
function buildBoxplotData(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
): { categories: string[]; data: [number, number, number, number, number][] } {
  const order: string[] = [];
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const cat = toStr(row[xField]);
    const val = toNumber(row[yField]);
    if (!groups.has(cat)) { groups.set(cat, []); order.push(cat); }
    if (!isNaN(val)) groups.get(cat)!.push(val);
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

  return { categories, data };
}

/** Bin numeric data for histogram using Sturges' rule. */
function buildHistogramData(
  rows: Record<string, unknown>[],
  field: string,
): { labels: string[]; counts: number[] } {
  const vals = rows.map(r => toNumber(r[field])).filter(v => !isNaN(v));
  if (!vals.length) return { labels: [], counts: [] };

  // Use loop instead of spread to avoid stack overflow on large datasets
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

/** Compute mean ± error per category for error-bar charts. */
function buildErrorBarData(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
  errorType: 'ci' | 'stderr' | 'stdev' | 'iqr',
  ciValue: number = 95,
): { categories: string[]; means: number[]; lowers: number[]; uppers: number[] } {
  const order: string[] = [];
  const groups = new Map<string, number[]>();

  for (const row of rows) {
    const cat = toStr(row[xField]);
    const val = toNumber(row[yField]);
    if (!groups.has(cat)) { groups.set(cat, []); order.push(cat); }
    if (!isNaN(val)) groups.get(cat)!.push(val);
  }

  const categories: string[] = [];
  const means: number[] = [];
  const lowers: number[] = [];
  const uppers: number[] = [];

  for (const cat of order) {
    const vals = groups.get(cat) ?? [];
    if (!vals.length) continue;
    const n = vals.length;
    const mean = vals.reduce((a, b) => a + b, 0) / n;
    const variance = n > 1 ? vals.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1) : 0;
    const std = Math.sqrt(variance);

    categories.push(cat);
    means.push(mean);

    if (errorType === 'iqr') {
      const s = [...vals].sort((a, b) => a - b);
      const q1 = percentile(s, 0.25);
      const q3 = percentile(s, 0.75);
      lowers.push(mean - q1);
      uppers.push(q3 - mean);
    } else if (errorType === 'stdev') {
      lowers.push(std);
      uppers.push(std);
    } else if (errorType === 'stderr') {
      const se = n > 1 ? std / Math.sqrt(n) : 0;
      lowers.push(se);
      uppers.push(se);
    } else {
      // ci
      const zMap: Record<number, number> = { 90: 1.645, 95: 1.96, 99: 2.576 };
      const z = zMap[ciValue] ?? 1.96;
      const halfWidth = n > 1 ? z * std / Math.sqrt(n) : 0;
      lowers.push(halfWidth);
      uppers.push(halfWidth);
    }
  }

  return { categories, means, lowers, uppers };
}

/**
 * Build heatmap data: aggregate value per (x-category, y-category) pair.
 *
 * valueField: the numeric column to aggregate.
 *   - If method='count', valueField is ignored (counts rows per cell).
 *   - Otherwise, non-numeric values in valueField are excluded from aggregation.
 */
function buildHeatmapData(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
  valueField: string | null,
  method: 'mean' | 'sum' | 'count' = 'count',
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

  // O(1) 인덱스 조회용 Map (xOrder.indexOf → O(n²) 방지)
  const xIndex = new Map<string, number>(xOrder.map((x, i) => [x, i]));
  const yIndex = new Map<string, number>(yOrder.map((y, i) => [y, i]));

  // Map key → { count, sum, vals[] }
  const cells = new Map<string, { count: number; vals: number[] }>();
  for (const row of rows) {
    const key = `${toStr(row[xField])}\u0000${toStr(row[yField])}`;
    if (!cells.has(key)) cells.set(key, { count: 0, vals: [] });
    const cell = cells.get(key)!;
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

  // Use loop instead of spread to avoid stack overflow on large datasets
  let min = 0;
  let max = 1;
  if (data.length) {
    min = data[0][2];
    max = data[0][2];
    for (const [,, v] of data) { if (v < min) min = v; if (v > max) max = v; }
  }

  return { xCats: xOrder, yCats: yOrder, data, min, max };
}

// ─── Base option builder ───────────────────────────────────

function buildBaseOption(spec: ChartSpec, style: StyleConfig): EChartsOption {
  const base: EChartsOption = {
    backgroundColor: style.background,
    color: style.colors,
    textStyle: { fontFamily: style.fontFamily, fontSize: style.fontSize },
    grid: {
      containLabel: true,
      left: '8%',
      right: '5%',
      top: spec.title ? '14%' : '6%',
      bottom: '10%',
    },
    tooltip: { trigger: 'axis' as const },
  };

  if (spec.title) {
    base.title = {
      text: spec.title,
      textStyle: { fontFamily: style.fontFamily, fontSize: style.titleSize, fontWeight: 'normal' },
      left: 'center',
      top: 8,
    };
  }

  return base;
}

function xAxisBase(spec: ChartSpec, style: StyleConfig, type: 'category' | 'value' | 'time') {
  const scale = spec.encoding.x.scale;
  // numeric domain은 'value' 타입일 때만 적용 (category/time은 무시)
  const domain = (
    type === 'value' &&
    scale?.domain &&
    scale.domain.length === 2 &&
    typeof scale.domain[0] === 'number'
  ) ? (scale.domain as [number, number]) : undefined;

  return {
    type,
    name: spec.encoding.x.title ?? spec.encoding.x.field,
    nameLocation: 'middle' as const,
    nameGap: 32,
    nameTextStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
    axisLabel: {
      fontFamily: style.fontFamily,
      fontSize: style.labelSize,
      rotate: spec.encoding.x.labelAngle ?? 0,
    },
    splitLine: { show: spec.encoding.x.grid ?? false },
    ...(domain ? { min: domain[0], max: domain[1] } : {}),
  };
}

function yAxisBase(spec: ChartSpec, style: StyleConfig) {
  const scale = spec.encoding.y.scale;
  // ECharts는 'log' 타입만 지원. sqrt/symlog → 'value' fallback.
  const axisType = scale?.type === 'log' ? ('log' as const) : ('value' as const);
  // numeric domain만 min/max로 매핑 (string[] 카테고리 도메인은 무시)
  const domain = (
    scale?.domain &&
    scale.domain.length === 2 &&
    typeof scale.domain[0] === 'number'
  ) ? (scale.domain as [number, number]) : undefined;

  return {
    type: axisType,
    name: spec.encoding.y.title ?? spec.encoding.y.field,
    nameLocation: 'middle' as const,
    nameGap: 48,
    nameTextStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
    axisLabel: { fontFamily: style.fontFamily, fontSize: style.labelSize },
    splitLine: { show: spec.encoding.y.grid ?? true },
    ...(domain ? { min: domain[0], max: domain[1] } : {}),
  };
}

/** encoding.color.legend.orient → ECharts legend 포지셔닝 */
function buildLegend(spec: ChartSpec, style: StyleConfig): Record<string, unknown> {
  const orient = spec.encoding.color?.legend?.orient;
  if (orient === 'none') return { show: false };
  const posMap: Record<string, Record<string, unknown>> = {
    top:           { orient: 'horizontal', top: 0,      left: 'center' },
    bottom:        { orient: 'horizontal', bottom: 0,   left: 'center' },
    left:          { orient: 'vertical',   left: 0,     top: 'center'  },
    right:         { orient: 'vertical',   right: 0,    top: 'center'  },
    'top-left':    { orient: 'horizontal', top: 0,      left: 0        },
    'top-right':   { orient: 'horizontal', top: 0,      right: 0       },
    'bottom-left': { orient: 'horizontal', bottom: 0,   left: 0        },
    'bottom-right':{ orient: 'horizontal', bottom: 0,   right: 0       },
  };
  return {
    ...(orient && posMap[orient] ? posMap[orient] : { orient: 'horizontal' }),
    textStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
  };
}

/**
 * bar/line 차트에 에러바 오버레이 custom series를 추가.
 * 이미 buildErrorBarData로 계산된 결과를 받아 이중 계산 방지.
 */
function buildErrorBarOverlay(
  categories: string[],
  means: number[],
  lowers: number[],
  uppers: number[],
): Record<string, unknown> {
  return {
    type: 'custom',
    name: 'Error',
    z: 3,
    renderItem: (_params: unknown, api: unknown) => {
      const a = api as {
        value: (idx: number) => number | string;
        coord: (point: [number, number]) => [number, number];
        size: (dataSize: [number, number]) => [number, number];
      };
      const xIdx = Number(a.value(0));
      const mean = Number(a.value(1));
      const lower = Number(a.value(2));
      const upper = Number(a.value(3));
      const [cx] = a.coord([xIdx, mean]);
      const [, yTop] = a.coord([xIdx, mean + upper]);
      const [, yBot] = a.coord([xIdx, mean - lower]);
      const capHalf = a.size([1, 0])[0] * 0.12;
      const lineStyle = { stroke: '#333', lineWidth: 1.5 };
      return {
        type: 'group',
        children: [
          { type: 'line', shape: { x1: cx, y1: yTop, x2: cx, y2: yBot }, style: lineStyle },
          { type: 'line', shape: { x1: cx - capHalf, y1: yTop, x2: cx + capHalf, y2: yTop }, style: lineStyle },
          { type: 'line', shape: { x1: cx - capHalf, y1: yBot, x2: cx + capHalf, y2: yBot }, style: lineStyle },
        ],
      };
    },
    data: categories.map((_, i) => [i, means[i] ?? 0, lowers[i] ?? 0, uppers[i] ?? 0]),
  };
}

// ─── Main converter ────────────────────────────────────────

export function chartSpecToECharts(
  spec: ChartSpec,
  rows: Record<string, unknown>[],
): EChartsOption {
  if (!rows.length) {
    return { title: { text: 'No data', left: 'center', top: 'middle' } };
  }

  const style = getStyleConfig(spec);
  const base = buildBaseOption(spec, style);
  const xField = spec.encoding.x.field;
  const yField = spec.encoding.y.field;
  const colorField = spec.encoding.color?.field;

  // Apply aggregation (not for chart types that do their own internal aggregation)
  // - histogram: buildHistogramData bins raw values
  // - boxplot/violin: buildBoxplotData computes per-category IQR stats
  // - scatter: no aggregation makes sense for point-level data
  // - heatmap: buildHeatmapData aggregates per cell
  // - error-bar: buildErrorBarData computes mean ± error from raw samples;
  //              pre-aggregating would destroy the variance information needed
  // - grouped-bar/stacked-bar: buildGroupedData pivots by colorField internally;
  //              pre-aggregating with only xField in groupBy would collapse color groups
  const requiresNoAgg = new Set([
    'histogram', 'boxplot', 'violin', 'scatter', 'heatmap', 'error-bar',
    'grouped-bar', 'stacked-bar',
  ]);
  const workRows = (spec.aggregate && !requiresNoAgg.has(spec.chartType))
    ? aggregateRows(rows, spec.aggregate.groupBy, yField, spec.aggregate.y)
    : rows;

  // ── bar ────────────────────────────────────────────────────
  if (spec.chartType === 'bar') {
    // 에러바 있으면 explicit data 모드 (custom renderItem이 x-index 필요)
    if (spec.errorBar) {
      const { categories, means, lowers, uppers } = buildErrorBarData(
        rows, xField, yField, spec.errorBar.type, spec.errorBar.value ?? 95,
      );
      return {
        ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
        yAxis: yAxisBase(spec, style),
        series: [
          { type: 'bar', data: means, name: yField, z: 2 },
          buildErrorBarOverlay(categories, means, lowers, uppers),
        ],
      };
    }
    return {
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { ...xAxisBase(spec, style, 'category') },
      yAxis: yAxisBase(spec, style),
      dataset: { source: workRows },
      series: [{ type: 'bar', encode: { x: xField, y: yField }, name: yField }],
    };
  }

  // ── grouped-bar ────────────────────────────────────────────
  if (spec.chartType === 'grouped-bar') {
    if (colorField) {
      const { categories, groups, seriesData } = buildGroupedData(workRows, xField, colorField, yField);
      return {
        ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: buildLegend(spec, style),
        xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
        yAxis: yAxisBase(spec, style),
        series: groups.map(g => ({
          type: 'bar' as const,
          name: g,
          data: seriesData.get(g) ?? [],
        })),
      };
    }
    // no color field → fall through to plain bar
    return {
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { ...xAxisBase(spec, style, 'category') },
      yAxis: yAxisBase(spec, style),
      dataset: { source: workRows },
      series: [{ type: 'bar', encode: { x: xField, y: yField }, name: yField }],
    };
  }

  // ── stacked-bar ────────────────────────────────────────────
  if (spec.chartType === 'stacked-bar') {
    if (colorField) {
      const { categories, groups, seriesData } = buildGroupedData(workRows, xField, colorField, yField);
      return {
        ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: buildLegend(spec, style),
        xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
        yAxis: yAxisBase(spec, style),
        series: groups.map(g => ({
          type: 'bar' as const,
          name: g,
          stack: 'total',
          data: seriesData.get(g) ?? [],
        })),
      };
    }
    return {
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { ...xAxisBase(spec, style, 'category') },
      yAxis: yAxisBase(spec, style),
      dataset: { source: workRows },
      series: [{ type: 'bar', encode: { x: xField, y: yField }, name: yField }],
    };
  }

  // ── line ───────────────────────────────────────────────────
  if (spec.chartType === 'line') {
    const xType = getAxisType(spec.encoding.x.type);

    if (colorField) {
      if (xType === 'time') {
        // Temporal + color: preserve time axis — build [dateStr, value][] per group
        const groupMap = new Map<string, [string, number][]>();
        const groupOrder: string[] = [];
        for (const r of workRows) {
          const g = toStr(r[colorField]);
          if (!groupMap.has(g)) { groupMap.set(g, []); groupOrder.push(g); }
          const y = toNumber(r[yField]);
          if (!isNaN(y)) groupMap.get(g)!.push([toStr(r[xField]), y]);
        }
        // Sort each group by date so ECharts draws lines without zigzag
        for (const g of groupOrder) groupMap.get(g)!.sort(sortByDate);
        return {
          ...base,
          tooltip: { trigger: 'axis' },
          legend: buildLegend(spec, style),
          xAxis: { ...xAxisBase(spec, style, 'time') },
          yAxis: yAxisBase(spec, style),
          series: groupOrder.map(g => ({
            type: 'line' as const,
            name: g,
            data: groupMap.get(g) ?? [],
            smooth: false,
          })),
        };
      }

      // Non-temporal: category pivot
      const { categories, groups, seriesData } = buildGroupedData(workRows, xField, colorField, yField);
      return {
        ...base,
        tooltip: { trigger: 'axis' },
        legend: buildLegend(spec, style),
        xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
        yAxis: yAxisBase(spec, style),
        series: groups.map(g => ({
          type: 'line' as const,
          name: g,
          data: seriesData.get(g) ?? [],
          smooth: false,
        })),
      };
    }

    // For temporal axis, convert data to [x, y] pairs to ensure proper date parsing
    // (에러바는 temporal X에서 미지원 — 시계열은 그룹별 분산이 무의미)
    if (xType === 'time') {
      return {
        ...base,
        tooltip: { trigger: 'axis' },
        xAxis: { ...xAxisBase(spec, style, 'time') },
        yAxis: yAxisBase(spec, style),
        series: [{
          type: 'line',
          name: yField,
          smooth: false,
          data: workRows
            .map(r => [toStr(r[xField]), toNumber(r[yField])] as [string, number])
            .filter(([, y]) => !isNaN(y))
            .sort(sortByDate),
        }],
      };
    }

    // 에러바 있으면 explicit data 모드로 전환 (category X만 지원)
    if (spec.errorBar && xType === 'category') {
      const { categories, means, lowers, uppers } = buildErrorBarData(
        rows, xField, yField, spec.errorBar.type, spec.errorBar.value ?? 95,
      );
      return {
        ...base,
        tooltip: { trigger: 'axis' },
        xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
        yAxis: yAxisBase(spec, style),
        series: [
          { type: 'line', data: means, name: yField, smooth: false, z: 2 },
          buildErrorBarOverlay(categories, means, lowers, uppers),
        ],
      };
    }

    return {
      ...base,
      tooltip: { trigger: 'axis' },
      xAxis: { ...xAxisBase(spec, style, xType) },
      yAxis: yAxisBase(spec, style),
      dataset: { source: workRows },
      series: [{ type: 'line', encode: { x: xField, y: yField }, name: yField, smooth: false }],
    };
  }

  // ── scatter ────────────────────────────────────────────────
  if (spec.chartType === 'scatter') {
    if (colorField) {
      // Build group map in single pass to avoid O(n×g) repeated filter
      const groupMap = new Map<string, [number, number][]>();
      const groupOrder: string[] = [];
      for (const r of workRows) {
        const g = toStr(r[colorField]);
        if (!groupMap.has(g)) { groupMap.set(g, []); groupOrder.push(g); }
        groupMap.get(g)!.push([toNumber(r[xField]), toNumber(r[yField])]);
      }
      return {
        ...base,
        tooltip: { trigger: 'item' },
        legend: buildLegend(spec, style),
        xAxis: { ...xAxisBase(spec, style, 'value') },
        yAxis: yAxisBase(spec, style),
        series: groupOrder.map(g => ({
          type: 'scatter' as const,
          name: g,
          data: groupMap.get(g) ?? [],
        })),
      };
    }

    return {
      ...base,
      tooltip: { trigger: 'item' },
      xAxis: { ...xAxisBase(spec, style, 'value') },
      yAxis: yAxisBase(spec, style),
      dataset: { source: workRows },
      series: [{ type: 'scatter', encode: { x: xField, y: yField }, name: yField }],
    };
  }

  // ── boxplot / violin ────────────────────────────────────────
  // violin: ECharts는 네이티브 violin을 미지원. Stage 3에서 custom renderItem으로 구현 예정.
  // 현재는 동일 데이터를 boxplot으로 렌더링(5-number summary 동일).
  if (spec.chartType === 'boxplot' || spec.chartType === 'violin') {
    const { categories, data } = buildBoxplotData(rows, xField, yField);
    return {
      ...base,
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const p = params as { name: string; data: [number, number, number, number, number] };
          return [
            p.name,
            `Min: ${p.data[0].toFixed(3)}`,
            `Q1: ${p.data[1].toFixed(3)}`,
            `Median: ${p.data[2].toFixed(3)}`,
            `Q3: ${p.data[3].toFixed(3)}`,
            `Max: ${p.data[4].toFixed(3)}`,
          ].join('<br/>');
        },
      },
      xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
      yAxis: yAxisBase(spec, style),
      series: [{ type: 'boxplot', data }],
    };
  }

  // ── histogram ──────────────────────────────────────────────
  if (spec.chartType === 'histogram') {
    const { labels, counts } = buildHistogramData(rows, xField);
    return {
      ...base,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
      },
      xAxis: {
        ...xAxisBase(spec, style, 'category'),
        data: labels,
        axisLabel: { ...xAxisBase(spec, style, 'category').axisLabel, rotate: 30 },
      },
      yAxis: {
        ...yAxisBase(spec, style),
        name: 'Count',
      },
      series: [{ type: 'bar', data: counts, barWidth: '98%', name: 'Count' }],
    };
  }

  // ── error-bar ──────────────────────────────────────────────
  if (spec.chartType === 'error-bar') {
    const errorType = spec.errorBar?.type ?? 'stderr';
    const ciValue = spec.errorBar?.value ?? 95;
    const { categories, means, lowers, uppers } = buildErrorBarData(
      rows, xField, yField, errorType, ciValue,
    );

    return {
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
      yAxis: yAxisBase(spec, style),
      series: [
        { type: 'bar', name: yField, data: means, z: 2 },
        buildErrorBarOverlay(categories, means, lowers, uppers),
      ],
    };
  }

  // ── heatmap ────────────────────────────────────────────────
  if (spec.chartType === 'heatmap') {
    // valueField: encoding.color.field (3-variable heatmap) or null (count heatmap)
    const valueField = spec.encoding.color?.field ?? null;
    const defaultMethod = valueField ? 'mean' : 'count';
    const aggMethod = (['mean', 'sum', 'count'] as const).includes(
      spec.aggregate?.y as 'mean' | 'sum' | 'count',
    )
      ? (spec.aggregate!.y as 'mean' | 'sum' | 'count')
      : defaultMethod;

    const { xCats, yCats, data, min, max } = buildHeatmapData(
      rows, xField, yField, valueField, aggMethod,
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
        nameTextStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        axisLabel: { fontFamily: style.fontFamily, fontSize: style.labelSize },
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

  // ── fallback ───────────────────────────────────────────────
  return {
    ...base,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { ...xAxisBase(spec, style, 'category') },
    yAxis: yAxisBase(spec, style),
    dataset: { source: workRows },
    series: [{ type: 'bar', encode: { x: xField, y: yField }, name: yField }],
  };
}
