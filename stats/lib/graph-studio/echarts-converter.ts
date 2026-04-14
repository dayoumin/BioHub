/**
 * ChartSpec -> ECharts Option converter
 *
 * Converts the internal ChartSpec format into an Apache ECharts option object.
 * This is the sole rendering path for Graph Studio.
 *
 * AI generation path: LLM -> ChartSpec JSON (directly, no intermediate format)
 *
 * Chart-type builders live in ./converters/<type>.ts.
 * Shared helpers (axis, style, annotation, data) are in ./converters/shared.ts.
 */

import type { ChartSpec } from '@/types/graph-studio';
import type { EChartsOption } from 'echarts';
import { getChartCapabilities, isRegisteredChartType } from './chart-capabilities';
import type { ConverterContext } from './converters/types';
import {
  getStyleConfig,
  buildBaseOption,
  aggregateRows,
  buildFacetOption,
  buildBarChart,
  buildGroupedBarChart,
  buildStackedBarChart,
  buildErrorBarChart,
  buildLineChart,
  buildScatterChart,
  buildBoxplotChart,
  buildViolinChart,
  buildHistogramChart,
  buildHeatmapChart,
  buildKmCurveChart,
  buildRocCurveChart,
} from './converters';

function buildUnsupportedChartOption(
  base: EChartsOption,
  chartType: string,
): EChartsOption {
  return {
    ...base,
    title: {
      text: 'Unsupported chart type',
      subtext: `"${chartType}" is not registered in Graph Studio.`,
      left: 'center',
      top: 'middle',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal',
      },
      subtextStyle: {
        fontSize: 12,
      },
    },
    grid: undefined,
    xAxis: undefined,
    yAxis: undefined,
    dataset: undefined,
    series: [],
    tooltip: undefined,
    graphic: undefined,
  };
}

export function chartSpecToECharts(
  spec: ChartSpec,
  rows: Record<string, unknown>[],
): EChartsOption {
  if (!rows.length) {
    return { title: { text: 'No data', left: 'center', top: 'middle' } };
  }

  const style = getStyleConfig(spec);
  const base = buildBaseOption(spec, style);
  if (!isRegisteredChartType(spec.chartType)) {
    return buildUnsupportedChartOption(base, spec.chartType);
  }
  const capabilities = getChartCapabilities(spec.chartType);
  if (!capabilities) {
    return buildUnsupportedChartOption(base, spec.chartType);
  }
  const xField = spec.encoding.x.field;
  const yField = spec.encoding.y.field;
  const colorField = spec.encoding.color?.field;

  // Apply aggregation (not for chart types that do their own internal aggregation)
  const requiresNoAgg = new Set([
    'histogram', 'boxplot', 'violin', 'scatter', 'heatmap', 'error-bar',
    'grouped-bar', 'stacked-bar', 'km-curve', 'roc-curve',
  ]);

  const aggGroupBy = spec.aggregate
    ? (spec.facet && !spec.aggregate.groupBy.includes(spec.facet.field)
        ? [...spec.aggregate.groupBy, spec.facet.field]
        : spec.aggregate.groupBy)
    : [];
  const rawWorkRows = (spec.aggregate && !requiresNoAgg.has(spec.chartType))
    ? aggregateRows(rows, aggGroupBy, yField, spec.aggregate.y)
    : rows;

  // encoding.x.sort
  const workRows = spec.encoding.x.sort
    ? [...rawWorkRows].sort((a, b) => {
        const cmp = String(a[xField] ?? '').localeCompare(String(b[xField] ?? ''));
        return spec.encoding.x.sort === 'descending' ? -cmp : cmp;
      })
    : rawWorkRows;

  // ── facet (최우선 분기) ──────────────────────────────────
  if (spec.facet && capabilities.supportsFacet) {
    return buildFacetOption(spec, workRows, style, base);
  }

  // ── Build context for chart-type builders ─────────────────
  const ctx: ConverterContext = {
    spec, rows, workRows, style, base, xField, yField, colorField,
  };

  switch (spec.chartType) {
    case 'bar':         return buildBarChart(ctx);
    case 'grouped-bar': return buildGroupedBarChart(ctx);
    case 'stacked-bar': return buildStackedBarChart(ctx);
    case 'line':        return buildLineChart(ctx);
    case 'scatter':     return buildScatterChart(ctx);
    case 'boxplot':     return buildBoxplotChart(ctx);
    case 'violin':      return buildViolinChart(ctx);
    case 'histogram':   return buildHistogramChart(ctx);
    case 'error-bar':   return buildErrorBarChart(ctx);
    case 'heatmap':     return buildHeatmapChart(ctx);
    case 'km-curve':    return buildKmCurveChart(ctx);
    case 'roc-curve':   return buildRocCurveChart(ctx);
    default:
      return buildUnsupportedChartOption(base, String(spec.chartType));
  }
}
