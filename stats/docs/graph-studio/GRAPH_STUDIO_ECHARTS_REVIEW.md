# Graph Studio ECharts Implementation - AI Review Package

**Last updated:** 2026-02-28 (3rd review cycle)
**TypeScript:** 0 errors | **Tests:** 102/102 passing (32 converter + 25 store + 32 utils + 13 storage)

---

## Files Changed

| File | Change |
|------|--------|
| `lib/graph-studio/echarts-converter.ts` | **NEW** (~805 lines) - core converter |
| `components/graph-studio/ChartPreview.tsx` | **REPLACED** - vega-embed -> ReactECharts |
| `lib/graph-studio/index.ts` | `chartSpecToVegaLite` -> `chartSpecToECharts`; added `columnsToRows` re-export |
| `lib/graph-studio/vega-lite-converter.ts` | **DELETED** |
| `types/graph-studio.ts` | `previewMode` removed from `GraphStudioState` (dead state; ChartPreview never read it) |
| `lib/stores/graph-studio-store.ts` | `previewMode` field + `setPreviewMode` action removed; MAX_HISTORY `if` -> `while` |
| `lib/graph-studio/chart-spec-defaults.ts` | heatmap `suggestedYType: 'nominal'` -> `'quantitative'` (type error fix) |
| `__tests__/lib/graph-studio/echarts-converter.test.ts` | **NEW** - 32 unit tests |
| `package.json` | added `echarts@6.0.0`, `echarts-for-react@3.0.6` |

---

## Core Types (unchanged -- for context)

```typescript
// types/graph-studio.ts

type ChartType =
  | 'bar' | 'grouped-bar' | 'stacked-bar'
  | 'line' | 'scatter'
  | 'boxplot' | 'histogram' | 'error-bar'
  | 'heatmap' | 'violin';

type DataType = 'quantitative' | 'nominal' | 'ordinal' | 'temporal';

interface ChartSpec {
  version: '1.0';
  chartType: ChartType;
  title?: string;
  data: { sourceId: string; columns: ColumnMeta[] };
  encoding: {
    x: AxisSpec;          // { field, type, title?, labelAngle?, grid?, sort? }
    y: AxisSpec;
    color?: ColorSpec;    // { field, type } -- used for grouping and heatmap value
    shape?: ShapeSpec;
    size?: { field: string; type: DataType };
  };
  errorBar?: ErrorBarSpec;  // { type: 'ci'|'stderr'|'stdev'|'iqr', value?: number }
  aggregate?: {
    y: 'mean' | 'median' | 'sum' | 'count' | 'min' | 'max';
    groupBy: string[];
  };
  style: StyleSpec;         // { preset: 'default'|'science'|'ieee'|'grayscale', font?, colors? }
  annotations: AnnotationSpec[];
  exportConfig: ExportConfig;
}

interface DataPackage {
  id: string;
  data: Record<string, unknown[]>;  // column-based: { colName: [val0, val1, ...] }
  columns: ColumnMeta[];
}
```

---

## Converter Architecture (`echarts-converter.ts`)

### Public API

```typescript
export function chartSpecToECharts(
  spec: ChartSpec,
  rows: Record<string, unknown>[],  // row-based (converted from DataPackage)
): EChartsOption
```

### Internal helper functions

| Function | Purpose |
|----------|---------|
| `sortByDate([a], [b])` | Comparator for `[dateStr, number][]` - used by temporal line paths |
| `getAxisType(dataType)` | 'quantitative' -> 'value', 'temporal' -> 'time', else 'category' |
| `getStyleConfig(spec)` | Resolves font, colors, background from StylePreset |
| `toNumber(v)` | Safe unknown -> number; returns NaN on parse failure |
| `toStr(v)` | Safe unknown -> string; null/undefined -> '' |
| `aggregateRows(rows, groupBy, yField, method)` | Pre-aggregation for bar/line when `spec.aggregate` is set |
| `buildGroupedData(rows, xField, colorField, yField)` | Pivot for grouped-bar, stacked-bar, multi-line (nominal x) |
| `percentile(sorted, p)` | Linear interpolation (numpy-compatible); used for boxplot and error-bar IQR |
| `buildBoxplotData(rows, xField, yField)` | [min, Q1, median, Q3, max] per category |
| `buildHistogramData(rows, field)` | Sturges' rule bins -> `{ labels, counts }` |
| `buildErrorBarData(rows, xField, yField, errorType, ciValue)` | mean +/- error per category |
| `buildHeatmapData(rows, xField, yField, valueField, method)` | Aggregate value per (x,y) cell |
| `buildBaseOption(spec, style)` | Shared backgroundColor, color, textStyle, grid, title |
| `xAxisBase(spec, style, type)` | Shared x-axis config |
| `yAxisBase(spec, style)` | Shared y-axis config |

### ChartType -> ECharts mapping

| ChartSpec type | ECharts series.type | Notes |
|---------------|--------------------|----|
| `bar` | `bar` | dataset + encode |
| `grouped-bar` | `bar` (multiple) | buildGroupedData, no stack |
| `stacked-bar` | `bar` (multiple) | stack: 'total' |
| `line` (nominal x) | `line` | buildGroupedData if color field |
| `line` (temporal x) | `line` | always [string, number][] + sortByDate; color field = separate series, each sorted |
| `scatter` | `scatter` | color field -> single-pass Map -> per-group [number, number][] |
| `boxplot` | `boxplot` | percentile() for Q1/Q3 (linear interpolation) |
| `violin` | `boxplot` (fallback) | full violin deferred |
| `histogram` | `bar` | Sturges pre-computed; barWidth: '98%' |
| `error-bar` | `bar` + `custom` | bar = means; renderItem draws I-shaped error bars |
| `heatmap` | `heatmap` + `visualMap` | 3-var (color.field) or count mode |

### Style presets -> ECharts colors

| Preset | Font | Colors |
|--------|------|--------|
| `default` | Arial | ['#5470c6', '#91cc75', '#fac858', '#ee6666', ...] |
| `science` | Times New Roman | ['#2878b5', '#9ac9db', '#f8ac8c', '#c82423', ...] (Nature-style) |
| `ieee` | Times New Roman | ['#000000', '#555555', '#999999', '#cccccc'] |
| `grayscale` | Arial | ['#000000', '#404040', '#808080', '#b0b0b0', '#d0d0d0'] |

---

## ChartPreview Component (current)

```typescript
// components/graph-studio/ChartPreview.tsx
import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { chartSpecToECharts, columnsToRows } from '@/lib/graph-studio';

export function ChartPreview(): React.ReactElement {
  const { chartSpec, dataPackage } = useGraphStudioStore();

  // DataPackage is column-based; shared utility converts to row-based
  const rows = useMemo(
    () => dataPackage ? columnsToRows(dataPackage.data) : [],
    [dataPackage],
  );

  // memoize ECharts option -- only recomputes when spec or rows change
  const option = useMemo(
    () => chartSpec ? chartSpecToECharts(chartSpec, rows) : null,
    [chartSpec, rows],
  );

  if (!chartSpec) return <EmptyState />;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 min-h-0">
        <ReactECharts option={option} style={{ width: '100%', height: '100%' }}
          notMerge lazyUpdate={false} />
      </div>
      {/* status bar: "group x value | bar | default | 100 rows" */}
    </div>
  );
}
```

---

## Design Decisions

### 1. Heatmap value field
`ChartSpec.encoding` has no dedicated "z" field. 3-variable heatmap uses `encoding.color.field` as the value. No `color` field -> count mode.

```typescript
const valueField = spec.encoding.color?.field ?? null;
const defaultMethod = valueField ? 'mean' : 'count';
```

### 2. Temporal line - explicit [string, number][] + date sort
ECharts `dataset` mode does not parse date strings reliably for `type: 'time'` axes.
The temporal path converts to explicit pairs and sorts chronologically:

```typescript
// single series
data: workRows
  .map(r => [toStr(r[xField]), toNumber(r[yField])] as [string, number])
  .filter(([, y]) => !isNaN(y))
  .sort(sortByDate)

// multi-series (color field)
// -- builds [string, number][] per group, sorts each group with sortByDate
// -- xAxis stays type:'time' (does NOT fall back to category)
```

`sortByDate` falls back to `localeCompare` for non-parseable dates.

### 3. Error-bar - custom series coordinate math
ECharts has no native error-bar series. `type: 'custom'` with `renderItem` draws 3 lines
(vertical stem + top cap + bottom cap) using pixel coordinates from `api.coord()`.
The `api` parameter is typed as `unknown` because `CustomSeriesRenderItemAPI` is incompatible with TypeScript strict mode.

### 4. Aggregation opt-out list
Chart types that aggregate internally are excluded from the `spec.aggregate` pre-pass:

```typescript
const requiresNoAgg = new Set([
  'histogram',   // buildHistogramData bins raw values
  'boxplot',     // buildBoxplotData computes IQR from raw samples
  'violin',      // same as boxplot
  'scatter',     // point-level data; pre-aggregation loses information
  'heatmap',     // buildHeatmapData aggregates per cell
  'error-bar',   // buildErrorBarData needs raw samples to compute variance
]);
```

`error-bar` was added to this set in a later revision (bug fix -- pre-aggregating would destroy the variance information needed for CI/stderr/stdev computation).

### 5. Boxplot + error-bar percentile - linear interpolation
Both use the same `percentile()` function (numpy-compatible linear interpolation):

```typescript
function percentile(sorted: number[], p: number): number {
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}
```

### 6. buildGroupedData - O(1) category lookup + duplicate mean
Category index lookup uses a Map built after the first pass (not Array.indexOf):

```typescript
const catIndex = new Map<string, number>(catOrder.map((c, i) => [c, i]));
```

Duplicate `(x, group)` rows use **mean** (not sum). A `seriesCount` parallel array
tracks per-cell counts; cells with `count > 1` are divided after accumulation.
`spec.aggregate` explicit takes precedence via the `aggregateRows()` pre-pass.

### 7. Min/max computation - loop not spread
`Math.min(...largeArray)` causes stack overflow for >100k items.
`buildHistogramData` and `buildHeatmapData` use `for` loops:

```typescript
let min = Infinity, max = -Infinity;
for (const v of vals) { if (v < min) min = v; if (v > max) max = v; }
```

### 8. `columnsToRows` extracted to shared utility
`chart-spec-utils.ts` exports `columnsToRows(data: Record<string, unknown[]>)`.
`ChartPreview` imports it from `@/lib/graph-studio` (via index barrel), avoiding
duplication with other consumers (e.g., `loadDataPackage`).

---

## Known Limitations / Deferred Work

1. **Violin plot** - falls back to boxplot. Full violin requires KDE + ECharts `custom` series.
2. **Annotations** - `ChartSpec.annotations` exists but `markLine`/`markArea` conversion not yet implemented.
3. **Export** - `ChartSpec.exportConfig` (SVG/PNG/PDF/TIFF) not yet wired to ECharts `getDataURL`.
4. **Scale domain** - `AxisSpec.scale.domain` parsed in ChartSpec but not passed to ECharts `min`/`max`.
5. **Non-null assertions (`!`)** - ~11 instances in helper functions. All logically safe (key always set immediately before access). CLAUDE.md rule: `!` 절대 금지. Deferred.

---

## Open Review Questions

1. **Error-bar `renderItem` math:** `api.coord([xIdx, mean])` -- is using the category integer index `xIdx` correct here? ECharts category axis should accept integer indices, but behavior with `containLabel: true` grids has not been tested across chart sizes.

2. **Heatmap category order:** `xOrder`/`yOrder` use insertion order (first-seen in row scan). Should they be sorted (alphabetical or by frequency)? Currently relies on CSV row order.

3. **`toStr` null -> '' phantom category:** `null` values in x/color fields become empty-string categories rather than being filtered. Could produce misleading charts with an unlabeled bar/series. Should null rows be dropped at the `chartSpecToECharts` entry point?

4. **`notMerge` on ReactECharts:** Set to `true` to force full re-render on every `option` change. Combined with `lazyUpdate={false}` this prevents stale rendering, but may cause visible flicker on rapid property edits. Is this the right tradeoff?

5. **`option={option}` type:** `option` is `EChartsOption | null` (from `useMemo`). The early return for `!chartSpec` ensures `null` is never actually passed to `ReactECharts` at runtime, but TypeScript does not narrow across the `useMemo` boundary. Currently passes because `echarts-for-react` types are permissive. Worth making explicit with a type assertion or restructuring?
