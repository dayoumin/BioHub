/**
 * Shared helper functions used by multiple chart-type converters.
 *
 * Contains: data parsing, aggregation, axis builders, base option,
 * annotation helpers, legend, error-bar overlay, linear regression.
 */

import type {
  ChartSpec, AxisSpec, AnnotationSpec,
  GraphicAnnotation, HLineAnnotation, VLineAnnotation,
  TrendlineSpec, StylePreset, DataType,
} from '@/types/graph-studio';
import type { EChartsOption, XAXisComponentOption, YAXisComponentOption } from 'echarts';
import { STYLE_PRESETS, ALL_PALETTES, CHART_TYPE_HINTS } from '../chart-spec-defaults';
import { getPercentile } from '@/lib/utils/stats-math';
import type { StyleConfig } from './types';
import { TOP_LEGEND_ORIENTS, BOTTOM_LEGEND_ORIENTS } from '../legend-orients';

// ─── Re-exports for convenience ─────────────────────────────
export { CHART_TYPE_HINTS };

// ─── Axis type mapping ─────────────────────────────────────

export function getAxisType(dataType: DataType): 'category' | 'value' | 'time' {
  if (dataType === 'quantitative') return 'value';
  if (dataType === 'temporal') return 'time';
  return 'category';
}

/** Sort comparator for temporal [dateStr, value][] data. */
export function sortByDate([a]: [string, number], [b]: [string, number]): number {
  const da = new Date(a).getTime();
  const db = new Date(b).getTime();
  if (!isNaN(da) && !isNaN(db)) return da - db;
  return a.localeCompare(b);
}

function countFormatDecimals(format: string): number {
  const match = format.match(/\.(0+)/);
  return match?.[1].length ?? 0;
}

function formatNumericAxisValue(value: number, format: string): string {
  if (!isFinite(value)) return '';
  const trimmed = format.trim();

  if (trimmed.includes('{value}')) {
    return trimmed.replaceAll('{value}', String(value));
  }

  const decimals = countFormatDecimals(trimmed);
  const useGrouping = trimmed.includes(',');
  const numericValue = trimmed.endsWith('%') ? value * 100 : value;
  const rendered = numericValue.toLocaleString('en-US', {
    useGrouping,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return trimmed.endsWith('%') ? `${rendered}%` : rendered;
}

function buildCategoryAxisLabelFormatter(format: string | undefined):
  NonNullable<XAXisComponentOption['axisLabel']>['formatter'] | undefined {
  const trimmed = format?.trim();
  if (!trimmed || !trimmed.includes('{value}')) return undefined;
  return (value: string) => trimmed.replaceAll('{value}', value);
}

function buildNumericAxisLabelFormatter(format: string | undefined):
  NonNullable<YAXisComponentOption['axisLabel']>['formatter'] | undefined {
  const trimmed = format?.trim();
  if (!trimmed) return undefined;

  return (value: number) => formatNumericAxisValue(value, trimmed);
}

function buildTimeAxisLabelFormatter(format: string | undefined):
  NonNullable<XAXisComponentOption['axisLabel']>['formatter'] | undefined {
  const trimmed = format?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function buildAxisScaleFlag(
  scale: AxisSpec['scale'],
  axisType: 'category' | 'value' | 'time' | 'log',
): { scale?: boolean } {
  if (axisType !== 'value' && axisType !== 'log') return {};
  if (axisType === 'log') return {};
  if (typeof scale?.zero !== 'boolean') return {};
  return { scale: !scale.zero };
}

/**
 * encoding.x.sort 적용 — 카테고리 배열을 정렬하고 연관 배열도 같은 순서로 재배열.
 */
export function applyCategorySort(categories: string[], sort: AxisSpec['sort']): { sorted: string[]; indexMap: number[] } {
  if (!sort) return { sorted: categories, indexMap: categories.map((_, i) => i) };
  const indexed = categories.map((c, i) => ({ c, i }));
  indexed.sort((a, b) => a.c.localeCompare(b.c));
  if (sort === 'descending') indexed.reverse();
  return { sorted: indexed.map(e => e.c), indexMap: indexed.map(e => e.i) };
}

/** 인덱스 맵에 따라 배열 재배열 */
export function reorderByIndexMap<T>(arr: T[], indexMap: number[]): T[] {
  return indexMap.map(i => arr[i]);
}

// ─── Style/theme helpers ───────────────────────────────────

const PRESET_COLORS: Record<StylePreset, string[]> = {
  default: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4'],
  science: ['#2878b5', '#9ac9db', '#f8ac8c', '#c82423', '#ff8884', '#58be9b', '#a076a1', '#f5c242'],
  ieee: ['#000000', '#555555', '#999999', '#cccccc'],
  grayscale: ['#000000', '#404040', '#808080', '#b0b0b0', '#d0d0d0'],
};

export function getStyleConfig(spec: ChartSpec): StyleConfig {
  const preset = STYLE_PRESETS[spec.style.preset] ?? STYLE_PRESETS.default;
  const font = spec.style.font
    ? { ...preset.font, ...spec.style.font }
    : preset.font;
  return {
    fontFamily: font?.family ?? 'Arial, Helvetica, sans-serif',
    fontSize: font?.size ?? 12,
    titleSize: font?.titleSize ?? 14,
    labelSize: font?.labelSize ?? 11,
    axisTitleSize: font?.axisTitleSize ?? font?.labelSize ?? 11,
    colors: spec.style.colors
      ?? (spec.style.scheme ? ALL_PALETTES[spec.style.scheme] : undefined)
      ?? PRESET_COLORS[spec.style.preset]
      ?? PRESET_COLORS.default,
    background: spec.style.background ?? preset.background ?? '#ffffff',
  };
}

// ─── Data helpers ──────────────────────────────────────────

export function toNumber(v: unknown): number {
  if (typeof v === 'number') return isFinite(v) ? v : NaN;
  if (typeof v === 'string') {
    const n = Number(v);
    return isFinite(n) ? n : NaN;
  }
  return NaN;
}

export function toStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v);
}

/** x축 카테고리별 원시 row 수를 집계 (n= 표기용). 반드시 집계 전 rows로 호출. */
export function countSamplesPerCategory(
  rows: Record<string, unknown>[],
  xField: string,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const cat = toStr(row[xField]);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  return counts;
}

/** Aggregate rows by groupBy fields. */
export function aggregateRows(
  rows: Record<string, unknown>[],
  groupBy: string[],
  yField: string,
  method: 'mean' | 'median' | 'sum' | 'count' | 'min' | 'max',
): Record<string, unknown>[] {
  if (rows.length > 0 && !(yField in rows[0])) {
    console.warn(`[echarts-converter] yField "${yField}" 가 데이터에 존재하지 않습니다. 집계 결과가 비어있을 수 있습니다.`);
  }

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
    if (!isNaN(val)) {
      const arr = groups.get(key);
      if (arr) arr.push(val);
    }
  }

  const result: Record<string, unknown>[] = [];
  for (const [key, vals] of groups) {
    const base = { ...(groupKeys.get(key) ?? {}) };
    if (method === 'count') {
      base[yField] = vals.length;
    } else if (method === 'sum') {
      base[yField] = vals.reduce((a, b) => a + b, 0);
    } else if (method === 'min') {
      let minVal = Infinity;
      for (const v of vals) if (v < minVal) minVal = v;
      base[yField] = vals.length ? minVal : 0;
    } else if (method === 'max') {
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
      base[yField] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    }
    result.push(base);
  }
  return result;
}

/** Build pivoted data for grouped/stacked bar and multi-line charts. */
export function buildGroupedData(
  rows: Record<string, unknown>[],
  xField: string,
  colorField: string,
  yField: string,
  sort?: AxisSpec['sort'],
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
      const sd = seriesData.get(grp);
      const sc = seriesCount.get(grp);
      if (sd && sc) { sd[idx] += val; sc[idx]++; }
    }
  }

  for (const grp of groupOrder) {
    const vals = seriesData.get(grp);
    const counts = seriesCount.get(grp);
    if (!vals || !counts) continue;
    for (let i = 0; i < vals.length; i++) {
      if (counts[i] > 1) vals[i] = vals[i] / counts[i];
    }
  }

  const { sorted: sortedCats, indexMap } = applyCategorySort(catOrder, sort);
  if (sort) {
    for (const grp of groupOrder) {
      const vals = seriesData.get(grp);
      if (vals) seriesData.set(grp, reorderByIndexMap(vals, indexMap));
    }
  }

  return { categories: sortedCats, groups: groupOrder, seriesData };
}

/** getPercentile 래퍼 — ECharts는 number 반환 필요 */
export function percentile(sorted: number[], p: number): number {
  return getPercentile(sorted, p) ?? 0;
}

// ─── Error bar data builder ────────────────────────────────

/** Compute mean ± error per category for error-bar charts. */
export function buildErrorBarData(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
  errorType: 'ci' | 'stderr' | 'stdev' | 'iqr',
  ciValue: number = 95,
  sort?: AxisSpec['sort'],
): { categories: string[]; means: number[]; lowers: number[]; uppers: number[] } {
  const explicitRows = rows
    .map((row) => {
      const category = toStr(row[xField]);
      const mean = toNumber(row[yField]);
      const explicitLower = toNumber(row.lower);
      const explicitUpper = toNumber(row.upper);
      const explicitCiLower = toNumber(row.ciLower);
      const explicitCiUpper = toNumber(row.ciUpper);
      const explicitError = toNumber(row.error);
      if (isNaN(mean)) return null;
      if (!isNaN(explicitLower) && !isNaN(explicitUpper)) {
        return { category, mean, lower: explicitLower, upper: explicitUpper };
      }
      if (!isNaN(explicitCiLower) && !isNaN(explicitCiUpper)) {
        return {
          category,
          mean,
          lower: Math.max(0, mean - explicitCiLower),
          upper: Math.max(0, explicitCiUpper - mean),
        };
      }
      if (!isNaN(explicitError)) {
        return { category, mean, lower: explicitError, upper: explicitError };
      }
      return null;
    })
    .filter((row): row is { category: string; mean: number; lower: number; upper: number } => row !== null);

  if (explicitRows.length === rows.length && explicitRows.length > 0) {
    const categories = explicitRows.map((row) => row.category);
    const means = explicitRows.map((row) => row.mean);
    const lowers = explicitRows.map((row) => row.lower);
    const uppers = explicitRows.map((row) => row.upper);

    if (sort) {
      const { sorted, indexMap } = applyCategorySort(categories, sort);
      return {
        categories: sorted,
        means: reorderByIndexMap(means, indexMap),
        lowers: reorderByIndexMap(lowers, indexMap),
        uppers: reorderByIndexMap(uppers, indexMap),
      };
    }

    return { categories, means, lowers, uppers };
  }

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
      const zMap: Record<number, number> = { 90: 1.645, 95: 1.96, 99: 2.576 };
      const z = zMap[ciValue] ?? 1.96;
      const halfWidth = n > 1 ? z * std / Math.sqrt(n) : 0;
      lowers.push(halfWidth);
      uppers.push(halfWidth);
    }
  }

  if (sort) {
    const { sorted, indexMap } = applyCategorySort(categories, sort);
    return {
      categories: sorted,
      means: reorderByIndexMap(means, indexMap),
      lowers: reorderByIndexMap(lowers, indexMap),
      uppers: reorderByIndexMap(uppers, indexMap),
    };
  }

  return { categories, means, lowers, uppers };
}

// ─── Linear regression ─────────────────────────────────────

interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

export function computeLinearRegression(
  points: [number, number][],
): LinearRegressionResult | null {
  const n = points.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const [x, y] of points) { sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; }
  const denom = n * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-12) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const [x, y] of points) {
    const pred = slope * x + intercept;
    ssTot += (y - yMean) ** 2;
    ssRes += (y - pred) ** 2;
  }
  const rSquared = ssTot < 1e-12 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, rSquared };
}

export function buildLinearTrendlineSeries(
  points: [number, number][],
  trendline: TrendlineSpec,
  style: StyleConfig,
  seriesName: string,
): Record<string, unknown> | null {
  const fittedPoints = trendline.fittedPoints
    ?.filter(([x, y]) => !isNaN(x) && !isNaN(y))
    .sort((left, right) => left[0] - right[0]);
  const hasUsableFittedPoints = (fittedPoints?.length ?? 0) >= 2;
  const sourcePoints = hasUsableFittedPoints ? fittedPoints ?? [] : points;
  const valid = sourcePoints.filter(([x, y]) => !isNaN(x) && !isNaN(y));
  const reg = computeLinearRegression(valid);
  if (!reg) return null;

  const lineData: [number, number][] = hasUsableFittedPoints
    ? valid
    : (() => {
      let xMin = Infinity, xMax = -Infinity;
      for (const [x] of valid) { if (x < xMin) xMin = x; if (x > xMax) xMax = x; }
      if (valid.length === 1 || Math.abs(xMax - xMin) < 1e-12) {
        return valid;
      }

      const N = 50;
      const step = (xMax - xMin) / (N - 1);
      return Array.from({ length: N }, (_, i) => {
        const x = xMin + i * step;
        return [x, reg.slope * x + reg.intercept] as [number, number];
      });
    })();

  const slopeStr = reg.slope >= 0 ? `+${reg.slope.toFixed(4)}` : reg.slope.toFixed(4);
  const interceptStr = reg.intercept >= 0 ? `+${reg.intercept.toFixed(4)}` : reg.intercept.toFixed(4);
  const equationStr = `y = ${slopeStr}x ${interceptStr}`;
  const r2Str = `R² = ${reg.rSquared.toFixed(4)}`;

  return {
    type: 'line',
    name: `${seriesName} 회귀선`,
    data: lineData,
    showSymbol: false,
    smooth: false,
    lineStyle: {
      color: trendline.color ?? style.colors[0] ?? '#666666',
      width: 1.5,
      opacity: 0.7,
      ...(trendline.strokeDash ? { type: trendline.strokeDash } : {}),
    },
    tooltip: trendline.showEquation !== false
      ? { formatter: () => `${equationStr}<br/>${r2Str}` }
      : {},
  };
}

// ─── Graphic overlay builder ───────────────────────────────

export function buildGraphicAnnotations(
  annotations: AnnotationSpec[],
  style: StyleConfig,
): Record<string, unknown>[] {
  const graphicAnns = annotations.filter(
    (a): a is GraphicAnnotation => a.type === 'text' || a.type === 'line' || a.type === 'rect',
  );
  if (!graphicAnns.length) return [];

  return graphicAnns.map((ann): Record<string, unknown> => {
    const color = ann.color ?? '#333333';

    if (ann.type === 'text') {
      return {
        type: 'text',
        left: ann.x ?? 'center',
        top: ann.y ?? 'middle',
        style: {
          text: ann.text ?? '',
          fill: color,
          fontSize: ann.fontSize ?? style.fontSize,
          fontFamily: style.fontFamily,
        },
      };
    }

    if (ann.type === 'line') {
      return {
        type: 'line',
        shape: {
          x1: typeof ann.x === 'number' ? ann.x : 0,
          y1: typeof ann.y === 'number' ? ann.y : 0,
          x2: typeof ann.x2 === 'number' ? ann.x2 : 0,
          y2: typeof ann.y2 === 'number' ? ann.y2 : 0,
        },
        style: {
          stroke: color,
          lineWidth: 1.5,
          ...(ann.strokeDash ? { lineDash: ann.strokeDash } : {}),
        },
      };
    }

    // rect
    const rx = typeof ann.x === 'number' ? ann.x : 0;
    const ry = typeof ann.y === 'number' ? ann.y : 0;
    const rx2 = typeof ann.x2 === 'number' ? ann.x2 : rx + 60;
    const ry2 = typeof ann.y2 === 'number' ? ann.y2 : ry + 30;
    return {
      type: 'rect',
      shape: { x: rx, y: ry, width: rx2 - rx, height: ry2 - ry },
      style: {
        fill: 'rgba(0,0,0,0)',
        stroke: color,
        lineWidth: 1.5,
        ...(ann.strokeDash ? { lineDash: ann.strokeDash } : {}),
      },
    };
  });
}

// ─── markLine annotation helpers ──────────────────────────

function buildMarkLineAnnotations(
  annotations: AnnotationSpec[],
  orientation?: 'vertical' | 'horizontal',
): Record<string, unknown> | null {
  const lines = annotations.filter(
    (a): a is HLineAnnotation | VLineAnnotation =>
      a.type === 'hline' || a.type === 'vline',
  );
  if (lines.length === 0) return null;

  return {
    silent: true,
    symbol: 'none',
    data: lines.map(a => {
      const isH = orientation === 'horizontal';
      const axisKey = a.type === 'hline'
        ? (isH ? 'xAxis' : 'yAxis')
        : (isH ? 'yAxis' : 'xAxis');
      return {
        [axisKey]: a.value,
        label: {
          show: !!a.text,
          formatter: a.text ?? `${a.value}`,
          position: a.labelPosition ?? 'end',
          fontSize: a.fontSize,
        },
        lineStyle: {
          color: a.color ?? '#999',
          type: a.strokeDash ?? 'solid',
          width: a.lineWidth ?? 1,
        },
      };
    }),
  };
}

/** Inject markLine annotations into the first series of an ECharts option. */
export function applyMarkLineAnnotations(
  option: EChartsOption,
  annotations: AnnotationSpec[] | undefined,
  orientation?: 'vertical' | 'horizontal',
): EChartsOption {
  if (!annotations?.length) return option;
  const markLine = buildMarkLineAnnotations(annotations, orientation);
  if (!markLine) return option;

  if (Array.isArray(option.series) && option.series.length > 0) {
    const first = option.series[0] as Record<string, unknown>;
    const existing = first.markLine as { data: unknown[] } | undefined;
    if (existing) {
      existing.data.push(...(markLine.data as unknown[]));
    } else {
      first.markLine = markLine;
    }
  }
  return option;
}

// ─── Legend orient helpers ─────────────────────────────────
// Single source of truth so grid/legend math stays in sync if new orients are added.

const TOP_ORIENTS = new Set(TOP_LEGEND_ORIENTS);
const BOTTOM_ORIENTS = new Set(BOTTOM_LEGEND_ORIENTS);

function isTopOrient(orient: string | undefined): boolean {
  return orient === undefined ? false : TOP_ORIENTS.has(orient as never);
}

function isBottomOrient(orient: string | undefined): boolean {
  return orient === undefined ? false : BOTTOM_ORIENTS.has(orient as never);
}

// title.top=8 기본. legend가 top 계열일 때 이 오프셋만큼 아래로 밀어서 겹침 방지.
const TITLE_TOP = 8;
const TITLE_BOTTOM_PADDING = 10;
const TOP_LEGEND_GRID_DEFAULT_PERCENT = 12;
const TOP_LEGEND_WITH_TITLE_GRID_DEFAULT_PERCENT = 20;
const TITLE_ONLY_GRID_DEFAULT_PERCENT = 14;
const BASE_GRID_TOP_PERCENT = 8;
const GRID_TOP_HEIGHT_ESTIMATE_PX = 200;
const TOP_LEGEND_GRID_GUARD_RATIO = 0.18;
const LEGEND_ROW_ESTIMATE_PX = 12;

function legendTopBelowTitle(style: StyleConfig): number {
  return TITLE_TOP + style.titleSize + TITLE_BOTTOM_PADDING;
}

function resolveGridTop(spec: ChartSpec, style: StyleConfig, hasTopLegend: boolean): string {
  const defaultPercent = spec.title
    ? (hasTopLegend ? TOP_LEGEND_WITH_TITLE_GRID_DEFAULT_PERCENT : TITLE_ONLY_GRID_DEFAULT_PERCENT)
    : (hasTopLegend ? TOP_LEGEND_GRID_DEFAULT_PERCENT : BASE_GRID_TOP_PERCENT);

  if (!spec.title || !hasTopLegend) {
    return `${defaultPercent}%`;
  }

  const legendTopPx = legendTopBelowTitle(style);
  if (legendTopPx / GRID_TOP_HEIGHT_ESTIMATE_PX <= TOP_LEGEND_GRID_GUARD_RATIO) {
    return `${defaultPercent}%`;
  }

  const minPercent = Math.ceil(
    ((legendTopPx + LEGEND_ROW_ESTIMATE_PX) / GRID_TOP_HEIGHT_ESTIMATE_PX) * 100,
  );
  return `${Math.max(defaultPercent, minPercent)}%`;
}

// ─── Base option builder ───────────────────────────────────

export function buildBaseOption(spec: ChartSpec, style: StyleConfig): EChartsOption {
  const legendOrient = spec.encoding.color?.legend?.orient;
  const showLegend = !!spec.encoding.color && legendOrient !== 'none';
  // 명시 orient가 없으면 buildLegend가 'top'으로 fallback → top legend로 취급
  const hasTopLegend = showLegend && (!legendOrient || isTopOrient(legendOrient));
  const hasBottomLegend = showLegend && isBottomOrient(legendOrient);
  const hasLeftLegend = showLegend && legendOrient === 'left';
  const hasRightLegend = showLegend && legendOrient === 'right';
  const needsExtraBottomRoom =
    !!spec.style.showSampleCounts ||
    Math.abs(spec.encoding.x.labelAngle ?? 0) >= 30;

  const base: EChartsOption = {
    backgroundColor: style.background,
    color: style.colors,
    textStyle: { fontFamily: style.fontFamily, fontSize: style.fontSize },
    grid: {
      containLabel: true,
      left: hasLeftLegend ? '16%' : '10%',
      right: hasRightLegend ? '16%' : '7%',
      top: resolveGridTop(spec, style, hasTopLegend),
      bottom: hasBottomLegend
        ? (needsExtraBottomRoom ? '22%' : '18%')
        : (needsExtraBottomRoom ? '18%' : '12%'),
    },
    tooltip: { trigger: 'axis' as const },
  };

  if (spec.title) {
    base.title = {
      text: spec.title,
      textStyle: { fontFamily: style.fontFamily, fontSize: style.titleSize, fontWeight: 'normal' },
      left: 'center',
      top: TITLE_TOP,
    };
  }

  const graphic = buildGraphicAnnotations(spec.annotations, style);
  if (graphic.length > 0) {
    base.graphic = graphic;
  }

  return base;
}

// ─── Axis helpers ──────────────────────────────────────────

export function xAxisBase<T extends 'category' | 'value' | 'time'>(
  spec: ChartSpec,
  style: StyleConfig,
  type: T,
): Record<string, unknown> {
  const scale = spec.encoding.x.scale;
  const formatter = type === 'time'
    ? buildTimeAxisLabelFormatter(spec.encoding.x.format)
    : type === 'category'
      ? buildCategoryAxisLabelFormatter(spec.encoding.x.format)
      : buildNumericAxisLabelFormatter(spec.encoding.x.format);
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
    nameTextStyle: { fontFamily: style.fontFamily, fontSize: spec.encoding.x.titleFontSize ?? style.axisTitleSize },
    axisLabel: {
      fontFamily: style.fontFamily,
      fontSize: spec.encoding.x.labelFontSize ?? style.labelSize,
      rotate: spec.encoding.x.labelAngle ?? 0,
      ...(formatter ? { formatter } : {}),
    },
    splitLine: { show: spec.encoding.x.grid ?? false },
    ...buildAxisScaleFlag(scale, type),
    ...(domain ? { min: domain[0], max: domain[1] } : {}),
  } as unknown as Record<string, unknown>;
}

export function yAxisBase(spec: ChartSpec, style: StyleConfig): Record<string, unknown> {
  const scale = spec.encoding.y.scale;
  const axisType = scale?.type === 'log' ? ('log' as const) : ('value' as const);
  const formatter = buildNumericAxisLabelFormatter(spec.encoding.y.format);
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
    nameTextStyle: { fontFamily: style.fontFamily, fontSize: spec.encoding.y.titleFontSize ?? style.axisTitleSize },
    axisLabel: {
      fontFamily: style.fontFamily,
      fontSize: spec.encoding.y.labelFontSize ?? style.labelSize,
      ...(formatter ? { formatter } : {}),
    },
    splitLine: { show: spec.encoding.y.grid ?? true },
    ...buildAxisScaleFlag(scale, axisType),
    ...(domain ? { min: domain[0], max: domain[1] } : {}),
  } as unknown as Record<string, unknown>;
}

export function buildY2Axis(axis: AxisSpec, style: StyleConfig): Record<string, unknown> {
  const scale = axis.scale;
  const axisType = scale?.type === 'log' ? ('log' as const) : ('value' as const);
  const formatter = buildNumericAxisLabelFormatter(axis.format);
  const domain = (
    scale?.domain &&
    scale.domain.length === 2 &&
    typeof scale.domain[0] === 'number'
  ) ? (scale.domain as [number, number]) : undefined;

  return {
    type: axisType,
    name: axis.title ?? axis.field,
    nameLocation: 'middle' as const,
    nameGap: 48,
    position: 'right',
    nameTextStyle: { fontFamily: style.fontFamily, fontSize: axis.titleFontSize ?? style.axisTitleSize },
    axisLabel: {
      fontFamily: style.fontFamily,
      fontSize: axis.labelFontSize ?? style.labelSize,
      ...(formatter ? { formatter } : {}),
    },
    splitLine: { show: false },
    ...buildAxisScaleFlag(scale, axisType),
    ...(domain ? { min: domain[0], max: domain[1] } : {}),
  } as unknown as Record<string, unknown>;
}

export function buildY2Series(
  workRows: Record<string, unknown>[],
  xField: string,
  y2Field: string,
  style: StyleConfig,
  isHorizontal: boolean,
): Record<string, unknown> {
  return {
    type: 'line' as const,
    name: y2Field,
    yAxisIndex: 1,
    showSymbol: false,
    data: isHorizontal
      ? workRows.map(r => [toNumber(r[y2Field]), toStr(r[xField])])
      : workRows.map(r => [toStr(r[xField]), toNumber(r[y2Field])]),
    lineStyle: { color: style.colors[1] ?? '#dc3545' },
    itemStyle: { color: style.colors[1] ?? '#dc3545' },
  };
}

// ─── Bar helpers ───────────────────────────────────────────

/** 막대 데이터 레이블 설정. showDataLabels가 false/undefined이면 undefined 반환. */
export function buildBarLabel(
  spec: ChartSpec,
  style: StyleConfig,
): Record<string, unknown> | undefined {
  if (!spec.style.showDataLabels) return undefined;
  return {
    show: true,
    position: spec.orientation === 'horizontal' ? 'right' : 'top',
    fontFamily: style.fontFamily,
    fontSize: style.labelSize,
  };
}

const SINGLE_BAR_MAX_WIDTH = 88;
const GROUPED_BAR_MAX_WIDTH = 44;
const HORIZONTAL_BAR_MAX_WIDTH = 32;

export function buildBarSeriesLayout(
  spec: ChartSpec,
  mode: 'single' | 'grouped' = 'single',
  renderOrientation: 'auto' | 'vertical' | 'horizontal' = 'auto',
): Record<string, unknown> {
  const isHorizontal = renderOrientation === 'horizontal' ||
    (renderOrientation === 'auto' && spec.orientation === 'horizontal');
  const maxWidth = isHorizontal
    ? HORIZONTAL_BAR_MAX_WIDTH
    : mode === 'grouped'
      ? GROUPED_BAR_MAX_WIDTH
      : SINGLE_BAR_MAX_WIDTH;

  return {
    barMaxWidth: maxWidth,
    barCategoryGap: mode === 'grouped' ? '36%' : '48%',
  };
}

export function buildBarAxes(
  spec: ChartSpec,
  style: StyleConfig,
  categories?: string[],
  sampleCounts?: Map<string, number>,
): { xAxis: Record<string, unknown>; yAxis: Record<string, unknown> } {
  const base = xAxisBase(spec, style, 'category');
  const baseAxisLabel = (base.axisLabel ?? {}) as Record<string, unknown>;
  const catAxis = {
    ...base,
    ...(categories ? {
      data: categories,
      ...(sampleCounts ? {
        axisLabel: {
          ...baseAxisLabel,
          formatter: (val: string) => `${val}\n(n=${sampleCounts.get(val) ?? '?'})`,
        },
      } : {}),
    } : {}),
  };
  const valAxis = yAxisBase(spec, style);
  return spec.orientation === 'horizontal'
    ? {
        xAxis: valAxis as unknown as Record<string, unknown>,
        yAxis: catAxis as unknown as Record<string, unknown>,
      }
    : {
        xAxis: catAxis as unknown as Record<string, unknown>,
        yAxis: valAxis as unknown as Record<string, unknown>,
      };
}

// ─── Legend ─────────────────────────────────────────────────

export function buildLegend(
  spec: ChartSpec,
  style: StyleConfig,
  seriesNames?: string[],
): Record<string, unknown> {
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
  const customLabels = spec.encoding.color?.legend?.customLabels ?? {};
  const legend = spec.encoding.color?.legend;
  const hasCustom = Object.keys(customLabels).length > 0;
  const resolvedOrient = orient && posMap[orient] ? orient : 'top';
  const basePos = posMap[resolvedOrient];
  // spec.title이 있으면 title.top=8 + titleSize + padding만큼 legend를 아래로 밀어 겹침 방지.
  // titleSize가 사용자 설정으로 커져도 계산식으로 따라가도록 매직넘버 회피.
  const pos = spec.title && isTopOrient(resolvedOrient)
    ? { ...basePos, top: legendTopBelowTitle(style) }
    : basePos;
  return {
    ...pos,
    textStyle: { fontFamily: style.fontFamily, fontSize: legend?.fontSize ?? style.labelSize },
    ...(hasCustom && seriesNames?.length ? {
      formatter: (name: string) => customLabels[name] ?? name,
    } : {}),
  };
}

// ─── Base graphic extraction ───────────────────────────────

/** Extract existing graphic annotations from a base option (avoids unsafe casts in every builder). */
export function getBaseGraphics(base: EChartsOption): Record<string, unknown>[] {
  const g = (base as Record<string, unknown>)['graphic'];
  return Array.isArray(g) ? g as Record<string, unknown>[] : [];
}

// ─── Boxplot tooltip formatter ─────────────────────────────

/** Shared boxplot tooltip formatter (used by boxplot + violin fallback). */
export function boxplotTooltipFormatter(params: unknown): string {
  const p = params as { name: string; data: [number, number, number, number, number] };
  return [
    p.name,
    `Min: ${p.data[0].toFixed(3)}`,
    `Q1: ${p.data[1].toFixed(3)}`,
    `Median: ${p.data[2].toFixed(3)}`,
    `Q3: ${p.data[3].toFixed(3)}`,
    `Max: ${p.data[4].toFixed(3)}`,
  ].join('<br/>');
}

// ─── Error bar overlay ─────────────────────────────────────

export function buildErrorBarOverlay(
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
