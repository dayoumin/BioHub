/**
 * ChartSpec -> ECharts Option converter
 *
 * Converts the internal ChartSpec format into an Apache ECharts option object.
 * This is the sole rendering path for Graph Studio.
 *
 * AI generation path: LLM -> ChartSpec JSON (directly, no intermediate format)
 */

import type { ChartSpec, AxisSpec, AnnotationSpec, TrendlineSpec, StylePreset, DataType } from '@/types/graph-studio';
import type { EChartsOption } from 'echarts';
import { STYLE_PRESETS, ALL_PALETTES, CHART_TYPE_HINTS } from './chart-spec-defaults';
import { partitionRowsByFacet, computeFacetLayout } from './facet-layout';

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

// ─── Facet constants ──────────────────────────────────────

/** 패싯을 렌더링할 차트 유형 */
const FACET_CHART_TYPES = new Set<string>(['bar', 'scatter']);

/** 패싯 최대 개수 — 초과 시 첫 N개만 렌더 (성능 보호) */
const MAX_FACETS = 12;

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
  // preset font를 base로 깔고 spec.style.font로 오버라이드 (family만 바꿔도 preset 크기 유지)
  const font = spec.style.font
    ? { ...preset.font, ...spec.style.font }
    : preset.font;
  return {
    fontFamily: font?.family ?? 'Arial, Helvetica, sans-serif',
    fontSize: font?.size ?? 12,
    titleSize: font?.titleSize ?? 14,
    labelSize: font?.labelSize ?? 11,
    colors: spec.style.colors
      ?? (spec.style.scheme ? ALL_PALETTES[spec.style.scheme] : undefined)
      ?? PRESET_COLORS[spec.style.preset]
      ?? PRESET_COLORS.default,
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

/** x축 카테고리별 원시 row 수를 집계 (n= 표기용). 반드시 집계 전 rows로 호출. */
function countSamplesPerCategory(
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
      const sd = seriesData.get(grp);
      const sc = seriesCount.get(grp);
      if (sd && sc) { sd[idx] += val; sc[idx]++; }
    }
  }

  // Duplicate (x, group) rows → take mean (spec.aggregate absent, raw data case)
  for (const grp of groupOrder) {
    const vals = seriesData.get(grp);
    const counts = seriesCount.get(grp);
    if (!vals || !counts) continue;
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

// ─── Linear regression ─────────────────────────────────────

interface LinearRegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
}

/**
 * OLS 단순 선형 회귀: y = slope·x + intercept
 * 통계 추정이 아닌 시각화 보조선용 — 결정론적 산술 연산.
 */
function computeLinearRegression(
  points: [number, number][],
): LinearRegressionResult | null {
  const n = points.length;
  if (n < 2) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const [x, y] of points) { sumX += x; sumY += y; sumXY += x * y; sumX2 += x * x; }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const [x, y] of points) {
    const pred = slope * x + intercept;
    ssTot += (y - yMean) ** 2;
    ssRes += (y - pred) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return { slope, intercept, rSquared };
}

/**
 * 선형 회귀선 series 생성. 50점 line으로 x 범위 내 회귀선 표현.
 * showEquation: true → tooltip에 방정식 + R² 표시.
 */
function buildLinearTrendlineSeries(
  points: [number, number][],
  trendline: TrendlineSpec,
  style: StyleConfig,
  seriesName: string,
): Record<string, unknown> | null {
  const valid = points.filter(([x, y]) => !isNaN(x) && !isNaN(y));
  const reg = computeLinearRegression(valid);
  if (!reg) return null;

  let xMin = Infinity, xMax = -Infinity;
  for (const [x] of valid) { if (x < xMin) xMin = x; if (x > xMax) xMax = x; }

  const N = 50;
  const step = (xMax - xMin) / (N - 1);
  const lineData: [number, number][] = Array.from({ length: N }, (_, i) => {
    const x = xMin + i * step;
    return [x, reg.slope * x + reg.intercept];
  });

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

/**
 * AnnotationSpec[] → ECharts graphic[] 오버레이 변환.
 *
 * 좌표 규칙:
 *   - number 값: 절댓값 픽셀 (컨테이너 왼쪽·위 기준)
 *   - string 값: ECharts 그대로 전달 ('50%', '100px' 등)
 *     단, line/rect의 shape 속성은 % 미지원 → number 좌표 전용
 *
 * text  → { type: 'text', left, top, style: { text, fill, fontSize, fontFamily } }
 * line  → { type: 'line', shape: { x1, y1, x2, y2 }, style: { stroke, lineDash } }
 * rect  → { type: 'rect', shape: { x, y, width, height }, style: { stroke, fill } }
 */
function buildGraphicAnnotations(
  annotations: AnnotationSpec[],
  style: StyleConfig,
): Record<string, unknown>[] {
  if (!annotations.length) return [];

  return annotations.map((ann): Record<string, unknown> => {
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

  const graphic = buildGraphicAnnotations(spec.annotations, style);
  if (graphic.length > 0) {
    base.graphic = graphic;
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

/**
 * Y2 (이중 Y축) 오른쪽 축 설정을 빌드.
 * yAxisBase를 기반으로 position/nameGap을 오른쪽에 맞게 조정.
 */
function buildY2Axis(axis: AxisSpec, style: StyleConfig): Record<string, unknown> {
  const scale = axis.scale;
  const axisType = scale?.type === 'log' ? ('log' as const) : ('value' as const);
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
    nameTextStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
    axisLabel: { fontFamily: style.fontFamily, fontSize: style.labelSize },
    splitLine: { show: false },  // 오른쪽 축은 그리드 라인 비표시 (좌측과 중복 방지)
    ...(domain ? { min: domain[0], max: domain[1] } : {}),
  };
}

/**
 * Y2 series를 빌드. bar 차트에서는 line으로, line 차트에서도 line으로 렌더.
 * isHorizontal: 수평 막대에서는 x/y 매핑이 반전됨 (xAxis=value, yAxis=category).
 *   Y2도 동일하게 반전해야 ECharts가 올바르게 배치.
 */
function buildY2Series(
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
    // 수평 막대: xAxis=value, yAxis=category → Y2 line도 동일하게 [y2Value, category]
    data: isHorizontal
      ? workRows.map(r => [toNumber(r[y2Field]), toStr(r[xField])])
      : workRows.map(r => [toStr(r[xField]), toNumber(r[y2Field])]),
    lineStyle: { color: style.colors[1] ?? '#dc3545' },
    itemStyle: { color: style.colors[1] ?? '#dc3545' },
  };
}

/** 막대 데이터 레이블 설정. showDataLabels가 false/undefined이면 undefined 반환. */
function buildBarLabel(
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

/**
 * 막대 orientation에 따라 xAxis/yAxis를 결정한다.
 * horizontal: value(Y)가 xAxis, category(X)가 yAxis.
 */
function buildBarAxes(
  spec: ChartSpec,
  style: StyleConfig,
  categories?: string[],
  sampleCounts?: Map<string, number>,
): { xAxis: Record<string, unknown>; yAxis: Record<string, unknown> } {
  const base = xAxisBase(spec, style, 'category');
  const catAxis = {
    ...base,
    ...(categories ? {
      data: categories,
      ...(sampleCounts ? {
        axisLabel: {
          ...base.axisLabel,
          formatter: (val: string) => `${val}\n(n=${sampleCounts.get(val) ?? '?'})`,
        },
      } : {}),
    } : {}),
  };
  const valAxis = yAxisBase(spec, style);
  return spec.orientation === 'horizontal'
    ? { xAxis: valAxis, yAxis: catAxis }
    : { xAxis: catAxis, yAxis: valAxis };
}

/** encoding.color.legend.orient → ECharts legend 포지셔닝. seriesNames 제공 시 customLabels formatter 적용. */
function buildLegend(
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
  const hasCustom = Object.keys(customLabels).length > 0;
  return {
    ...(orient && posMap[orient] ? posMap[orient] : { orient: 'horizontal' }),
    textStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
    ...(hasCustom && seriesNames?.length ? {
      formatter: (name: string) => customLabels[name] ?? name,
    } : {}),
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

// ─── Facet builder ─────────────────────────────────────────

/**
 * 패싯(소규모 배치) 옵션을 빌드.
 * 단일 ECharts 인스턴스에 멀티 grid/xAxis/yAxis를 배치.
 */
function buildFacetOption(
  spec: ChartSpec,
  rows: Record<string, unknown>[],
  style: StyleConfig,
  base: EChartsOption,
): EChartsOption {
  const facet = spec.facet;
  if (!facet) return base;  // 타입 가드 (호출부에서 이미 검증하지만 non-null assertion 방지)
  const xField = spec.encoding.x.field;
  const yField = spec.encoding.y.field;

  // y축 scale 설정 반영 (log, domain 등)
  const yScale = spec.encoding.y.scale;
  const facetYAxisType = yScale?.type === 'log' ? ('log' as const) : ('value' as const);
  const yDomain = (
    yScale?.domain &&
    yScale.domain.length === 2 &&
    typeof yScale.domain[0] === 'number'
  ) ? (yScale.domain as [number, number]) : undefined;

  const allGroups = partitionRowsByFacet(rows, facet.field);

  // 패싯 수 제한 (quantitative 필드 선택 시 폭발 방지)
  const groups = allGroups.size > MAX_FACETS
    ? new Map([...allGroups].slice(0, MAX_FACETS))
    : allGroups;

  const layout = computeFacetLayout(groups.size, facet.ncol);

  const grids: Record<string, unknown>[] = [];
  const xAxes: Record<string, unknown>[] = [];
  const yAxes: Record<string, unknown>[] = [];
  const allSeries: Record<string, unknown>[] = [];
  const titleGraphics: Record<string, unknown>[] = [];

  // 공통 y 범위 계산 (shareAxis 기본 true)
  // bar 차트는 기본적으로 0에서 시작해야 하므로 min을 0으로 강제
  const isBarFacet = spec.chartType === 'bar';
  const isScatterFacet = spec.chartType === 'scatter';
  let globalYMin: number | undefined;
  let globalYMax: number | undefined;
  let globalXMin: number | undefined;
  let globalXMax: number | undefined;
  if (facet.shareAxis !== false) {
    for (const row of rows) {
      const v = toNumber(row[yField]);
      if (!isNaN(v)) {
        globalYMin = globalYMin === undefined ? v : Math.min(globalYMin, v);
        globalYMax = globalYMax === undefined ? v : Math.max(globalYMax, v);
      }
      // scatter: x축도 공유 범위 계산
      if (isScatterFacet) {
        const vx = toNumber(row[xField]);
        if (!isNaN(vx)) {
          globalXMin = globalXMin === undefined ? vx : Math.min(globalXMin, vx);
          globalXMax = globalXMax === undefined ? vx : Math.max(globalXMax, vx);
        }
      }
    }
    // bar 차트: 0 기준선 보장 (막대가 떠오르거나 잘리는 현상 방지)
    if (isBarFacet) {
      if (globalYMin === undefined || globalYMin > 0) globalYMin = 0;
      if (globalYMax === undefined || globalYMax < 0) globalYMax = 0;
    }
  }

  let i = 0;
  for (const [groupValue, groupRows] of groups) {
    const item = layout.items[i];

    grids.push({
      left: item.left,
      top: item.top,
      width: item.width,
      height: item.height,
      containLabel: true,
    });

    // x축/y축: 차트 유형 + orientation에 따라 결정
    const isHFacet = isBarFacet && spec.orientation === 'horizontal';
    if (spec.chartType === 'scatter') {
      // scatter: value 축 + shareAxis 시 x 범위 공유
      xAxes.push({
        gridIndex: i,
        type: 'value',
        name: i >= groups.size - layout.cols ? xField : undefined,
        nameLocation: 'middle' as const,
        nameGap: 24,
        axisLabel: {
          fontFamily: style.fontFamily,
          fontSize: style.labelSize,
          show: i >= groups.size - layout.cols,
        },
        ...(globalXMin !== undefined ? { min: globalXMin } : {}),
        ...(globalXMax !== undefined ? { max: globalXMax } : {}),
      });
      yAxes.push({
        gridIndex: i,
        type: facetYAxisType,
        axisLabel: {
          fontFamily: style.fontFamily,
          fontSize: style.labelSize,
          show: i % layout.cols === 0,
        },
        splitLine: { show: true },
        ...(yDomain ? { min: yDomain[0], max: yDomain[1] }
          : {
            ...(globalYMin !== undefined ? { min: globalYMin } : {}),
            ...(globalYMax !== undefined ? { max: globalYMax } : {}),
          }),
      });
    } else {
      // bar (vertical/horizontal): category + value 축
      const seen = new Set<string>();
      const cats: string[] = [];
      for (const r of groupRows) {
        const v = toStr(r[xField]);
        if (!seen.has(v)) { seen.add(v); cats.push(v); }
      }
      const catAxisConfig = {
        gridIndex: i,
        type: 'category' as const,
        data: cats,
        axisLabel: {
          fontFamily: style.fontFamily,
          fontSize: style.labelSize,
          show: isHFacet ? (i % layout.cols === 0) : (i >= groups.size - layout.cols),
        },
        axisLine: { show: true },
      };
      const valAxisConfig = {
        gridIndex: i,
        type: facetYAxisType,
        axisLabel: {
          fontFamily: style.fontFamily,
          fontSize: style.labelSize,
          show: isHFacet ? (i >= groups.size - layout.cols) : (i % layout.cols === 0),
        },
        splitLine: { show: true },
        ...(yDomain ? { min: yDomain[0], max: yDomain[1] }
          : {
            ...(globalYMin !== undefined ? { min: globalYMin } : {}),
            ...(globalYMax !== undefined ? { max: globalYMax } : {}),
          }),
      };
      if (isHFacet) {
        // 수평: xAxis=value, yAxis=category
        xAxes.push(valAxisConfig);
        yAxes.push(catAxisConfig);
      } else {
        // 수직: xAxis=category, yAxis=value
        xAxes.push(catAxisConfig);
        yAxes.push(valAxisConfig);
      }
    }

    // chartType별 series 빌드
    if (spec.chartType === 'bar') {
      // 중복 카테고리 집계 (같은 x 값에 여러 행이 있으면 평균)
      const catAgg = new Map<string, { sum: number; count: number }>();
      for (const r of groupRows) {
        const cat = toStr(r[xField]);
        const val = toNumber(r[yField]);
        if (isNaN(val)) continue;
        const entry = catAgg.get(cat);
        if (entry) { entry.sum += val; entry.count++; }
        else catAgg.set(cat, { sum: val, count: 1 });
      }
      const barData = [...catAgg.entries()].map(([cat, { sum, count }]) => [cat, sum / count]);
      const isH = spec.orientation === 'horizontal';
      allSeries.push({
        type: 'bar',
        xAxisIndex: i,
        yAxisIndex: i,
        data: isH ? barData.map(([cat, val]) => [val, cat]) : barData,
        name: groupValue,
      });
    } else if (spec.chartType === 'scatter') {
      allSeries.push({
        type: 'scatter',
        xAxisIndex: i,
        yAxisIndex: i,
        data: groupRows.map(r => [toNumber(r[xField]), toNumber(r[yField])]),
        name: groupValue,
      });
    }

    // 패싯 제목
    if (facet.showTitle !== false) {
      titleGraphics.push({
        type: 'text',
        left: item.titleLeft,
        top: item.titleTop,
        style: {
          text: `${facet.field}: ${groupValue}`,
          textAlign: 'center',
          fontSize: 11,
          fontFamily: style.fontFamily,
          fill: '#555',
        },
        silent: true,
      });
    }
    i++;
  }

  return {
    ...base,
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    series: allSeries,
    graphic: [
      ...((base as Record<string, unknown>).graphic as Record<string, unknown>[] ?? []),
      ...titleGraphics,
    ],
    legend: { show: false },
    tooltip: { trigger: 'item' },
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
  // km-curve / roc-curve: requiresNoAgg에 추가 (사전 집계 금지 — 이미 계산된 곡선 데이터)
  requiresNoAgg.add('km-curve');
  requiresNoAgg.add('roc-curve');

  // facet 활성 시 facet.field를 groupBy에 포함해야 패싯별 집계가 올바름
  const aggGroupBy = spec.aggregate
    ? (spec.facet && !spec.aggregate.groupBy.includes(spec.facet.field)
        ? [...spec.aggregate.groupBy, spec.facet.field]
        : spec.aggregate.groupBy)
    : [];
  const workRows = (spec.aggregate && !requiresNoAgg.has(spec.chartType))
    ? aggregateRows(rows, aggGroupBy, yField, spec.aggregate.y)
    : rows;

  // ── facet (최우선 분기) ──────────────────────────────────
  if (spec.facet && FACET_CHART_TYPES.has(spec.chartType)) {
    return buildFacetOption(spec, workRows, style, base);
  }

  // ── bar ────────────────────────────────────────────────────
  if (spec.chartType === 'bar') {
    const barLabel = buildBarLabel(spec, style);
    // 에러바 있으면 explicit data 모드 (custom renderItem이 x-index 필요)
    // orientation은 에러바와 함께 사용하지 않음 (renderItem 좌표계 복잡)
    if (spec.errorBar) {
      const { categories, means, lowers, uppers } = buildErrorBarData(
        rows, xField, yField, spec.errorBar.type, spec.errorBar.value ?? 95,
      );
      const barEbCounts = spec.style.showSampleCounts
        ? countSamplesPerCategory(rows, xField)
        : undefined;
      const barEbAxBase = xAxisBase(spec, style, 'category');
      return {
        ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: {
          ...barEbAxBase,
          data: categories,
          axisLabel: barEbCounts
            ? { ...barEbAxBase.axisLabel, formatter: (val: string) => `${val}\n(n=${barEbCounts.get(val) ?? '?'})` }
            : barEbAxBase.axisLabel,
        } as Record<string, unknown>,
        yAxis: yAxisBase(spec, style),
        series: [
          { type: 'bar', data: means, name: yField, z: 2, ...(barLabel ? { label: barLabel } : {}) },
          buildErrorBarOverlay(categories, means, lowers, uppers),
        ],
      };
    }
    const isH = spec.orientation === 'horizontal';
    const y2Axis = spec.encoding.y2;
    // Y2 방어: color 그룹이 있으면 colors[1] 충돌 → Y2 무시
    // horizontal 모드는 축 구조 복잡 → Y2 미지원
    const hasY2 = !!y2Axis && CHART_TYPE_HINTS[spec.chartType].supportsY2
      && !colorField && !isH;
    const barSeries: Record<string, unknown>[] = [{
      type: 'bar',
      encode: { x: isH ? yField : xField, y: isH ? xField : yField },
      name: yField,
      ...(barLabel ? { label: barLabel } : {}),
    }];
    if (hasY2 && y2Axis) {
      barSeries.push(buildY2Series(workRows, xField, y2Axis.field, style, isH));
    }
    // showSampleCounts: dataset 모드에서 categories를 rows에서 명시적으로 추출해야 함
    if (spec.style.showSampleCounts) {
      const catOrder = [...new Map(rows.map(r => [toStr(r[xField]), true])).keys()];
      const counts = countSamplesPerCategory(rows, xField);
      const { xAxis: barXAxisN, yAxis: barYAxisN } = buildBarAxes(spec, style, catOrder, counts);
      return {
        ...base,
        tooltip: hasY2
          ? { trigger: 'axis', axisPointer: { type: 'cross' } }
          : { trigger: 'axis', axisPointer: { type: 'shadow' } },
        xAxis: barXAxisN,
        yAxis: hasY2 && y2Axis
          ? [barYAxisN, buildY2Axis(y2Axis, style)]
          : barYAxisN,
        dataset: { source: workRows },
        series: barSeries,
      };
    }
    const { xAxis: barXAxis, yAxis: barYAxis } = buildBarAxes(spec, style);
    return {
      ...base,
      tooltip: hasY2
        ? { trigger: 'axis', axisPointer: { type: 'cross' } }
        : { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: barXAxis,
      yAxis: hasY2 && y2Axis
        ? [barYAxis, buildY2Axis(y2Axis, style)]
        : barYAxis,
      dataset: { source: workRows },
      series: barSeries,
    };
  }

  // ── grouped-bar ────────────────────────────────────────────
  if (spec.chartType === 'grouped-bar') {
    const barLabel = buildBarLabel(spec, style);
    const isH = spec.orientation === 'horizontal';
    if (colorField) {
      const { categories, groups, seriesData } = buildGroupedData(workRows, xField, colorField, yField);
      const gbCounts = spec.style.showSampleCounts
        ? countSamplesPerCategory(rows, xField)
        : undefined;
      const { xAxis: gbXAxis, yAxis: gbYAxis } = buildBarAxes(spec, style, categories, gbCounts);
      return {
        ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: buildLegend(spec, style, groups),
        xAxis: gbXAxis,
        yAxis: gbYAxis,
        series: groups.map(g => ({
          type: 'bar' as const,
          name: g,
          data: seriesData.get(g) ?? [],
          ...(barLabel ? { label: barLabel } : {}),
        })),
      };
    }
    // no color field → fall through to plain bar
    const { xAxis: gbXAxis2, yAxis: gbYAxis2 } = buildBarAxes(spec, style);
    return {
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: gbXAxis2,
      yAxis: gbYAxis2,
      dataset: { source: workRows },
      series: [{
        type: 'bar',
        encode: { x: isH ? yField : xField, y: isH ? xField : yField },
        name: yField,
        ...(barLabel ? { label: barLabel } : {}),
      }],
    };
  }

  // ── stacked-bar ────────────────────────────────────────────
  if (spec.chartType === 'stacked-bar') {
    const barLabel = buildBarLabel(spec, style);
    const isH = spec.orientation === 'horizontal';
    if (colorField) {
      const { categories, groups, seriesData } = buildGroupedData(workRows, xField, colorField, yField);
      const sbCounts = spec.style.showSampleCounts
        ? countSamplesPerCategory(rows, xField)
        : undefined;
      const { xAxis: sbXAxis, yAxis: sbYAxis } = buildBarAxes(spec, style, categories, sbCounts);
      return {
        ...base,
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        legend: buildLegend(spec, style, groups),
        xAxis: sbXAxis,
        yAxis: sbYAxis,
        series: groups.map(g => ({
          type: 'bar' as const,
          name: g,
          stack: 'total',
          data: seriesData.get(g) ?? [],
          ...(barLabel ? { label: barLabel } : {}),
        })),
      };
    }
    const { xAxis: sbXAxis2, yAxis: sbYAxis2 } = buildBarAxes(spec, style);
    return {
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: sbXAxis2,
      yAxis: sbYAxis2,
      dataset: { source: workRows },
      series: [{
        type: 'bar',
        encode: { x: isH ? yField : xField, y: isH ? xField : yField },
        name: yField,
        ...(barLabel ? { label: barLabel } : {}),
      }],
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
          if (!isNaN(y)) {
            const arr = groupMap.get(g);
            if (arr) arr.push([toStr(r[xField]), y]);
          }
        }
        // Sort each group by date so ECharts draws lines without zigzag
        for (const g of groupOrder) {
          const arr = groupMap.get(g);
          if (arr) arr.sort(sortByDate);
        }
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
      const y2AxisTime = spec.encoding.y2;
      const hasY2Time = !!y2AxisTime && CHART_TYPE_HINTS[spec.chartType].supportsY2;
      const timeSeries: Record<string, unknown>[] = [{
        type: 'line',
        name: yField,
        smooth: false,
        data: workRows
          .map(r => [toStr(r[xField]), toNumber(r[yField])] as [string, number])
          .filter(([, y]) => !isNaN(y))
          .sort(sortByDate),
      }];
      if (hasY2Time && y2AxisTime) {
        timeSeries.push({
          type: 'line',
          name: y2AxisTime.field,
          yAxisIndex: 1,
          showSymbol: false,
          data: workRows
            .map(r => [toStr(r[xField]), toNumber(r[y2AxisTime.field])] as [string, number])
            .filter(([, y]) => !isNaN(y))
            .sort(sortByDate),
          lineStyle: { color: style.colors[1] ?? '#dc3545' },
          itemStyle: { color: style.colors[1] ?? '#dc3545' },
        });
      }
      return {
        ...base,
        tooltip: hasY2Time
          ? { trigger: 'axis', axisPointer: { type: 'cross' } }
          : { trigger: 'axis' },
        xAxis: { ...xAxisBase(spec, style, 'time') },
        yAxis: hasY2Time && y2AxisTime
          ? [yAxisBase(spec, style), buildY2Axis(y2AxisTime, style)]
          : yAxisBase(spec, style),
        series: timeSeries,
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

    const y2AxisLine = spec.encoding.y2;
    const hasY2Line = !!y2AxisLine && CHART_TYPE_HINTS[spec.chartType].supportsY2;
    const lineSeries: Record<string, unknown>[] = [
      { type: 'line', encode: { x: xField, y: yField }, name: yField, smooth: false },
    ];
    if (hasY2Line && y2AxisLine) {
      lineSeries.push(buildY2Series(workRows, xField, y2AxisLine.field, style, false));
    }
    return {
      ...base,
      tooltip: hasY2Line
        ? { trigger: 'axis', axisPointer: { type: 'cross' } }
        : { trigger: 'axis' },
      xAxis: { ...xAxisBase(spec, style, xType) },
      yAxis: hasY2Line && y2AxisLine
        ? [yAxisBase(spec, style), buildY2Axis(y2AxisLine, style)]
        : yAxisBase(spec, style),
      dataset: { source: workRows },
      series: lineSeries,
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
        const arr = groupMap.get(g);
        if (arr) arr.push([toNumber(r[xField]), toNumber(r[yField])]);
      }
      const scatterSeries: Record<string, unknown>[] = groupOrder.map(g => ({
        type: 'scatter' as const,
        name: g,
        data: groupMap.get(g) ?? [],
      }));
      // 그룹이 없는 경우에만 trendline 추가 (다중 그룹은 개별 trendline 미지원)
      if (spec.trendline?.type === 'linear') {
        const allPoints: [number, number][] = [];
        for (const pts of groupMap.values()) allPoints.push(...pts);
        const trendSeries = buildLinearTrendlineSeries(allPoints, spec.trendline, style, yField);
        if (trendSeries) scatterSeries.push(trendSeries);
      }
      return {
        ...base,
        tooltip: { trigger: 'item' },
        legend: buildLegend(spec, style),
        xAxis: { ...xAxisBase(spec, style, 'value') },
        yAxis: yAxisBase(spec, style),
        series: scatterSeries,
      };
    }

    // 단순 scatter (colorField 없음) — trendline 지원
    const simpleSeries: Record<string, unknown>[] = [
      { type: 'scatter', encode: { x: xField, y: yField }, name: yField },
    ];
    if (spec.trendline?.type === 'linear') {
      const pts: [number, number][] = workRows
        .map(r => [toNumber(r[xField]), toNumber(r[yField])] as [number, number])
        .filter(([x, y]) => !isNaN(x) && !isNaN(y));
      const trendSeries = buildLinearTrendlineSeries(pts, spec.trendline, style, yField);
      if (trendSeries) simpleSeries.push(trendSeries);
    }
    if (simpleSeries.length === 1) {
      // trendline 없음 → dataset 경로 유지 (메모리 효율적)
      return {
        ...base,
        tooltip: { trigger: 'item' },
        xAxis: { ...xAxisBase(spec, style, 'value') },
        yAxis: yAxisBase(spec, style),
        dataset: { source: workRows },
        series: [{ type: 'scatter', encode: { x: xField, y: yField }, name: yField }],
      };
    }
    return {
      ...base,
      tooltip: { trigger: 'item' },
      xAxis: { ...xAxisBase(spec, style, 'value') },
      yAxis: yAxisBase(spec, style),
      dataset: { source: workRows },
      series: simpleSeries,
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
    const ebCounts = spec.style.showSampleCounts
      ? countSamplesPerCategory(rows, xField)
      : undefined;
    const ebXBase = xAxisBase(spec, style, 'category');

    return {
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        ...ebXBase,
        data: categories,
        axisLabel: ebCounts
          ? { ...ebXBase.axisLabel, formatter: (val: string) => `${val}\n(n=${ebCounts.get(val) ?? '?'})` }
          : ebXBase.axisLabel,
      } as Record<string, unknown>,
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
    const aggY = spec.aggregate?.y;
    const aggMethod = (aggY === 'mean' || aggY === 'sum' || aggY === 'count')
      ? aggY
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

  // ── km-curve ──────────────────────────────────────────────
  // 컬럼 규약:
  //   xField = time, yField = survival (or yField 이름 그대로)
  //   colorField = group (선택)
  //   ciLo, ciHi: 95% CI 하/상한 (열 이름 고정)
  //   isCensored: 1이면 중도절단 표시
  //   __logRankP: 첫 번째 row에 log-rank p-value (선택)
  if (spec.chartType === 'km-curve') {
    const timeField = xField;
    const survivalField = yField;

    // 그룹별 데이터 수집
    const groupMap = new Map<string, {
      time: number[];
      survival: number[];
      ciLo: number[];
      ciHi: number[];
      censoredTimes: number[];
    }>();

    for (const r of rows) {
      const grp = colorField ? toStr(r[colorField]) : '__single__';
      if (!groupMap.has(grp)) {
        groupMap.set(grp, { time: [], survival: [], ciLo: [], ciHi: [], censoredTimes: [] });
      }
      const entry = groupMap.get(grp);
      if (!entry) continue;
      const t = toNumber(r[timeField]);
      const s = toNumber(r[survivalField]);
      if (isNaN(t) || isNaN(s)) continue;
      entry.time.push(t);
      entry.survival.push(s);
      const lo = toNumber(r['ciLo']);
      const hi = toNumber(r['ciHi']);
      entry.ciLo.push(isNaN(lo) ? s : lo);
      entry.ciHi.push(isNaN(hi) ? s : hi);
      if (toNumber(r['isCensored']) === 1) entry.censoredTimes.push(t);
    }

    // log-rank p-value (첫 번째 행의 __logRankP 컬럼)
    const logRankP = toNumber(rows[0]?.['__logRankP']);

    const allSeries: Record<string, unknown>[] = [];
    const groupNames = [...groupMap.keys()].filter(g => g !== '__single__');
    let colorIdx = 0;

    for (const [grp, data] of groupMap) {
      const color = style.colors[colorIdx % style.colors.length];
      const displayName = grp === '__single__' ? survivalField : grp;

      // 시간순 정렬 (step 함수 올바름 보장)
      const sortedIndices = data.time
        .map((t, i) => ({ t, i }))
        .sort((a, b) => a.t - b.t)
        .map(({ i }) => i);
      const sortedTime = sortedIndices.map(i => data.time[i]);
      const sortedSurvival = sortedIndices.map(i => data.survival[i]);
      const sortedCiLo = sortedIndices.map(i => data.ciLo[i]);
      const sortedCiHi = sortedIndices.map(i => data.ciHi[i]);

      // CI 밴드: stack 방식 (lower 투명 + (upper - lower) 반투명 fill)
      const ciStackName = `ci_${colorIdx}`;
      allSeries.push({
        type: 'line',
        name: `${displayName}_ciLo`,
        step: 'end',
        data: sortedTime.map((t, i) => [t, sortedCiLo[i]]),
        lineStyle: { width: 0, opacity: 0 },
        areaStyle: { color: style.background, opacity: 1 },
        symbol: 'none',
        stack: ciStackName,
        legendHoverLink: false,
        tooltip: { show: false },
        z: 1,
      });
      allSeries.push({
        type: 'line',
        name: `${displayName}_ciHi`,
        step: 'end',
        data: sortedTime.map((t, i) => [t, Math.max(0, sortedCiHi[i] - sortedCiLo[i])]),
        lineStyle: { width: 0, opacity: 0 },
        areaStyle: { color, opacity: 0.15 },
        symbol: 'none',
        stack: ciStackName,
        legendHoverLink: false,
        tooltip: { show: false },
        z: 1,
      });

      // 주 생존 곡선 (step:'end')
      const mainSeries: Record<string, unknown> = {
        type: 'line',
        name: displayName,
        step: 'end',
        data: sortedTime.map((t, i) => [t, sortedSurvival[i]]),
        lineStyle: { color, width: 2 },
        symbol: 'none',
        z: 3,
      };

      // 중도절단 markPoint (수직 티크 기호)
      if (data.censoredTimes.length > 0) {
        const censoredMarkData = data.censoredTimes.map(ct => {
          let survAtCt = 1.0;
          for (let i = 0; i < sortedTime.length; i++) {
            if (sortedTime[i] <= ct) survAtCt = sortedSurvival[i];
            else break;
          }
          return { coord: [ct, survAtCt], name: `Censored t=${ct.toFixed(2)}` };
        });
        mainSeries['markPoint'] = {
          symbol: 'path://M0,-5 L0,5',
          symbolSize: 8,
          itemStyle: { color },
          data: censoredMarkData,
          label: { show: false },
        };
      }

      allSeries.push(mainSeries);
      colorIdx++;
    }

    // Log-rank p-value 우상단 그래픽
    const kmGraphics: Record<string, unknown>[] = [];
    if (!isNaN(logRankP)) {
      const pLabel = logRankP < 0.001 ? 'p < 0.001' : `p = ${logRankP.toFixed(4)}`;
      kmGraphics.push({
        type: 'text',
        right: '8%',
        top: spec.title ? '18%' : '8%',
        style: {
          text: `Log-rank ${pLabel}`,
          fill: '#444444',
          fontSize: style.labelSize,
          fontFamily: style.fontFamily,
        },
      });
    }

    const baseGraphics = Array.isArray((base as Record<string, unknown>)['graphic'])
      ? (base as Record<string, unknown>)['graphic'] as Record<string, unknown>[]
      : [];

    return {
      ...base,
      tooltip: { trigger: 'axis' },
      legend: groupNames.length > 0 ? buildLegend(spec, style) : { show: false },
      xAxis: {
        type: 'value',
        name: spec.encoding.x.title ?? timeField,
        nameLocation: 'middle' as const,
        nameGap: 32,
        nameTextStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        axisLabel: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        min: 0,
      },
      yAxis: {
        type: 'value',
        name: spec.encoding.y.title ?? 'Survival Probability',
        nameLocation: 'middle' as const,
        nameGap: 48,
        nameTextStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        axisLabel: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        min: 0,
        max: 1,
      },
      series: allSeries,
      graphic: [...baseGraphics, ...kmGraphics],
    };
  }

  // ── roc-curve ─────────────────────────────────────────────
  // 컬럼 규약:
  //   xField = fpr (False Positive Rate), yField = tpr (True Positive Rate)
  //   __auc: 첫 번째 row에 AUC 값 (선택)
  //   __aucLo, __aucHi: 95% CI (선택)
  if (spec.chartType === 'roc-curve') {
    const fprField = xField;
    const tprField = yField;

    // AUC 메타데이터 (첫 번째 행)
    const auc = toNumber(rows[0]?.['__auc']);
    const aucLo = toNumber(rows[0]?.['__aucLo']);
    const aucHi = toNumber(rows[0]?.['__aucHi']);

    // ROC 좌표 정렬 (FPR 오름차순)
    const rocData: [number, number][] = rows
      .map(r => [toNumber(r[fprField]), toNumber(r[tprField])] as [number, number])
      .filter(([f, t]) => !isNaN(f) && !isNaN(t))
      .sort((a, b) => a[0] - b[0]);

    const primaryColor = style.colors[0] ?? '#5470c6';

    const rocSeries: Record<string, unknown>[] = [
      // 대각선 기준선 (FPR = TPR, AUC = 0.5)
      {
        type: 'line',
        name: 'Reference',
        data: [[0, 0], [1, 1]] as [number, number][],
        lineStyle: { color: '#aaaaaa', width: 1, type: [4, 4] as number[] },
        symbol: 'none',
        tooltip: { show: false },
        legendHoverLink: false,
        z: 1,
      },
      // ROC 곡선 (fill 포함)
      {
        type: 'line',
        name: 'ROC Curve',
        data: rocData,
        lineStyle: { color: primaryColor, width: 2 },
        symbol: 'none',
        smooth: false,
        areaStyle: { color: primaryColor, opacity: 0.08 },
        z: 3,
      },
    ];

    // AUC 텍스트 그래픽 (좌하단)
    const rocGraphics: Record<string, unknown>[] = [];
    if (!isNaN(auc)) {
      let aucText = `AUC = ${auc.toFixed(4)}`;
      if (!isNaN(aucLo) && !isNaN(aucHi)) {
        aucText += `\n95% CI [${aucLo.toFixed(3)}, ${aucHi.toFixed(3)}]`;
      }
      rocGraphics.push({
        type: 'text',
        left: '15%',
        bottom: '22%',
        style: {
          text: aucText,
          fill: primaryColor,
          fontSize: style.labelSize + 1,
          fontFamily: style.fontFamily,
          fontWeight: 'bold',
          lineHeight: 18,
        },
      });
    }

    const baseGraphics = Array.isArray((base as Record<string, unknown>)['graphic'])
      ? (base as Record<string, unknown>)['graphic'] as Record<string, unknown>[]
      : [];

    return {
      ...base,
      tooltip: { trigger: 'axis' },
      legend: { show: false },
      xAxis: {
        type: 'value',
        name: spec.encoding.x.title ?? 'False Positive Rate (1 - Specificity)',
        nameLocation: 'middle' as const,
        nameGap: 32,
        nameTextStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        axisLabel: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        min: 0,
        max: 1,
      },
      yAxis: {
        type: 'value',
        name: spec.encoding.y.title ?? 'True Positive Rate (Sensitivity)',
        nameLocation: 'middle' as const,
        nameGap: 48,
        nameTextStyle: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        axisLabel: { fontFamily: style.fontFamily, fontSize: style.labelSize },
        min: 0,
        max: 1,
      },
      series: rocSeries,
      graphic: [...baseGraphics, ...rocGraphics],
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
