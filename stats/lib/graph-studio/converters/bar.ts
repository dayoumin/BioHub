/**
 * Bar chart converters: bar, grouped-bar, stacked-bar, error-bar.
 */

import type { EChartsOption } from 'echarts';
import type { ConverterContext } from './types';
import {
  CHART_TYPE_HINTS,
  toNumber, toStr,
  aggregateRows,
  applyCategorySort,
  reorderByIndexMap,
  countSamplesPerCategory,
  buildGroupedData,
  buildErrorBarData,
  buildErrorBarOverlay,
  applyMarkLineAnnotations,
  xAxisBase, yAxisBase,
  buildY2Axis, buildY2Series,
  buildBarLabel, buildBarAxes, buildBarSeriesLayout,
  buildLegend,
} from './shared';

type BarAggregateMethod = 'mean' | 'median' | 'sum' | 'count' | 'min' | 'max';

interface SimpleBarData {
  categories: string[];
  sourceRows: Record<string, unknown>[];
  data: Array<[string, number]>;
  horizontalData: Array<[number, string]>;
}

function getNumericTooltipValue(value: unknown, isHorizontal: boolean): number | null {
  if (Array.isArray(value)) {
    const rawValue = isHorizontal ? value[0] : value[1];
    const numericValue = Number(rawValue);
    return Number.isFinite(numericValue) ? numericValue : null;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatTooltipValue(value: number): string {
  return value.toLocaleString('en-US', {
    maximumFractionDigits: 4,
  });
}

function buildSingleBarTooltip(isHorizontal: boolean): Record<string, unknown> {
  return {
    trigger: 'item',
    formatter: (params: unknown): string => {
      const p = params as {
        name?: string;
        marker?: string;
        seriesName?: string;
        value?: unknown;
        data?: unknown;
      };
      const numericValue = getNumericTooltipValue(p.value ?? p.data, isHorizontal);
      const marker = p.marker ?? '';
      const label = p.seriesName ?? '';
      const category = p.name ?? '';
      const valueText = numericValue === null ? '' : formatTooltipValue(numericValue);
      return [
        category,
        `${marker}${label ? `${label}: ` : ''}${valueText}`,
      ].filter(Boolean).join('<br/>');
    },
  };
}

function buildSimpleBarData(
  rows: Record<string, unknown>[],
  xField: string,
  yField: string,
  aggregateMethod: BarAggregateMethod,
  sort: Parameters<typeof applyCategorySort>[1],
): SimpleBarData {
  const aggregatedRows = aggregateRows(rows, [xField], yField, aggregateMethod);
  const categories = aggregatedRows.map(row => toStr(row[xField]));
  const values = aggregatedRows.map(row => toNumber(row[yField]));
  const sorted = applyCategorySort(categories, sort);
  const sortedValues = sort ? reorderByIndexMap(values, sorted.indexMap) : values;
  const data = sorted.sorted.map((category, index) => [category, sortedValues[index] ?? 0] as [string, number]);

  return {
    categories: sorted.sorted,
    sourceRows: data.map(([category, value]) => ({ [xField]: category, [yField]: value })),
    data,
    horizontalData: data.map(([category, value]) => [value, category]),
  };
}

// ── bar ────────────────────────────────────────────────────

export function buildBarChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, workRows, style, base, xField, yField, colorField } = ctx;
  const barLabel = buildBarLabel(spec, style);
  const singleBarLayout = buildBarSeriesLayout(spec);

  // 에러바 있으면 explicit data 모드
  if (spec.errorBar) {
    const errorBarLayout = buildBarSeriesLayout(spec, 'single', 'vertical');
    const { categories, means, lowers, uppers } = buildErrorBarData(
      rows, xField, yField, spec.errorBar.type, spec.errorBar.value ?? 95, spec.encoding.x.sort,
    );
    const barEbCounts = spec.style.showSampleCounts
      ? countSamplesPerCategory(rows, xField)
      : undefined;
    const barEbAxBase = xAxisBase(spec, style, 'category');
    const barEbAxisLabel = (barEbAxBase.axisLabel ?? {}) as Record<string, unknown>;
    return applyMarkLineAnnotations({
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        ...barEbAxBase,
        data: categories,
        axisLabel: barEbCounts
          ? { ...barEbAxisLabel, formatter: (val: string) => `${val}\n(n=${barEbCounts.get(val) ?? '?'})` }
          : barEbAxisLabel,
      } as Record<string, unknown>,
      yAxis: yAxisBase(spec, style),
      series: [
        { type: 'bar', data: means, name: yField, z: 2, ...errorBarLayout, ...(barLabel ? { label: barLabel } : {}) },
        buildErrorBarOverlay(categories, means, lowers, uppers),
      ],
    }, spec.annotations);
  }

  const isH = spec.orientation === 'horizontal';
  const y2Axis = spec.encoding.y2;
  const hasY2 = !!y2Axis && CHART_TYPE_HINTS[spec.chartType].supportsY2
    && !colorField && !isH;
  const aggregateMethod = spec.aggregate?.y ?? 'mean';
  const simpleBarData = !hasY2
    ? buildSimpleBarData(rows, xField, yField, aggregateMethod, spec.encoding.x.sort)
    : null;
  const barSeries: Record<string, unknown>[] = [{
    type: 'bar',
    ...singleBarLayout,
    ...(simpleBarData
      ? { data: isH ? simpleBarData.horizontalData : simpleBarData.data }
      : { encode: { x: isH ? yField : xField, y: isH ? xField : yField } }),
    name: yField,
    ...(barLabel ? { label: barLabel } : {}),
  }];
  if (hasY2 && y2Axis) {
    barSeries.push(buildY2Series(workRows, xField, y2Axis.field, style, isH));
  }

  if (spec.style.showSampleCounts) {
    const catOrder = simpleBarData?.categories
      ?? [...new Map(workRows.map(r => [toStr(r[xField]), true])).keys()];
    const counts = countSamplesPerCategory(rows, xField);
    const { xAxis: barXAxisN, yAxis: barYAxisN } = buildBarAxes(spec, style, catOrder, counts);
    return applyMarkLineAnnotations({
      ...base,
      tooltip: hasY2
        ? { trigger: 'axis', axisPointer: { type: 'cross' } }
        : buildSingleBarTooltip(isH),
      xAxis: barXAxisN,
      yAxis: hasY2 && y2Axis
        ? [barYAxisN, buildY2Axis(y2Axis, style)]
        : barYAxisN,
      dataset: { source: simpleBarData?.sourceRows ?? workRows },
      series: barSeries,
    }, spec.annotations, spec.orientation);
  }

  const { xAxis: barXAxis, yAxis: barYAxis } = buildBarAxes(
    spec,
    style,
    simpleBarData?.categories,
  );
  return applyMarkLineAnnotations({
    ...base,
    tooltip: hasY2
      ? { trigger: 'axis', axisPointer: { type: 'cross' } }
      : buildSingleBarTooltip(isH),
    xAxis: barXAxis,
    yAxis: hasY2 && y2Axis
      ? [barYAxis, buildY2Axis(y2Axis, style)]
      : barYAxis,
    dataset: { source: simpleBarData?.sourceRows ?? workRows },
    series: barSeries,
  }, spec.annotations, spec.orientation);
}

// ── grouped-bar ────────────────────────────────────────────

export function buildGroupedBarChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, workRows, style, base, xField, yField, colorField } = ctx;
  const barLabel = buildBarLabel(spec, style);
  const isH = spec.orientation === 'horizontal';
  const groupedBarLayout = buildBarSeriesLayout(spec, 'grouped');

  if (colorField) {
    const { categories, groups, seriesData } = buildGroupedData(workRows, xField, colorField, yField, spec.encoding.x.sort);
    const gbCounts = spec.style.showSampleCounts
      ? countSamplesPerCategory(rows, xField)
      : undefined;
    const { xAxis: gbXAxis, yAxis: gbYAxis } = buildBarAxes(spec, style, categories, gbCounts);
    return applyMarkLineAnnotations({
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: buildLegend(spec, style, groups),
      xAxis: gbXAxis,
      yAxis: gbYAxis,
      series: groups.map(g => ({
        type: 'bar' as const,
        ...groupedBarLayout,
        name: g,
        data: seriesData.get(g) ?? [],
        ...(barLabel ? { label: barLabel } : {}),
      })),
    }, spec.annotations, spec.orientation);
  }

  const { xAxis: gbXAxis2, yAxis: gbYAxis2 } = buildBarAxes(spec, style);
  return applyMarkLineAnnotations({
    ...base,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: gbXAxis2,
    yAxis: gbYAxis2,
    dataset: { source: workRows },
    series: [{
      type: 'bar',
      ...groupedBarLayout,
      encode: { x: isH ? yField : xField, y: isH ? xField : yField },
      name: yField,
      ...(barLabel ? { label: barLabel } : {}),
    }],
  }, spec.annotations, spec.orientation);
}

// ── stacked-bar ────────────────────────────────────────────

export function buildStackedBarChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, workRows, style, base, xField, yField, colorField } = ctx;
  const barLabel = buildBarLabel(spec, style);
  const isH = spec.orientation === 'horizontal';
  const singleBarLayout = buildBarSeriesLayout(spec);

  if (colorField) {
    const { categories, groups, seriesData } = buildGroupedData(workRows, xField, colorField, yField, spec.encoding.x.sort);
    const sbCounts = spec.style.showSampleCounts
      ? countSamplesPerCategory(rows, xField)
      : undefined;
    const { xAxis: sbXAxis, yAxis: sbYAxis } = buildBarAxes(spec, style, categories, sbCounts);
    return applyMarkLineAnnotations({
      ...base,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: buildLegend(spec, style, groups),
      xAxis: sbXAxis,
      yAxis: sbYAxis,
      series: groups.map(g => ({
        type: 'bar' as const,
        ...singleBarLayout,
        name: g,
        stack: 'total',
        data: seriesData.get(g) ?? [],
        ...(barLabel ? { label: barLabel } : {}),
      })),
    }, spec.annotations, spec.orientation);
  }

  const { xAxis: sbXAxis2, yAxis: sbYAxis2 } = buildBarAxes(spec, style);
  return applyMarkLineAnnotations({
    ...base,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: sbXAxis2,
    yAxis: sbYAxis2,
    dataset: { source: workRows },
    series: [{
      type: 'bar',
      ...singleBarLayout,
      encode: { x: isH ? yField : xField, y: isH ? xField : yField },
      name: yField,
      ...(barLabel ? { label: barLabel } : {}),
    }],
  }, spec.annotations, spec.orientation);
}

// ── error-bar ──────────────────────────────────────────────

export function buildErrorBarChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, style, base, xField, yField } = ctx;
  const singleBarLayout = buildBarSeriesLayout(spec, 'single', 'vertical');
  const errorType = spec.errorBar?.type ?? 'stderr';
  const ciValue = spec.errorBar?.value ?? 95;
  const { categories, means, lowers, uppers } = buildErrorBarData(
    rows, xField, yField, errorType, ciValue, spec.encoding.x.sort,
  );
  const ebCounts = spec.style.showSampleCounts
    ? countSamplesPerCategory(rows, xField)
    : undefined;
  const ebXBase = xAxisBase(spec, style, 'category');
  const ebAxisLabel = (ebXBase.axisLabel ?? {}) as Record<string, unknown>;

  return applyMarkLineAnnotations({
    ...base,
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      ...ebXBase,
      data: categories,
      axisLabel: ebCounts
        ? { ...ebAxisLabel, formatter: (val: string) => `${val}\n(n=${ebCounts.get(val) ?? '?'})` }
        : ebAxisLabel,
    } as Record<string, unknown>,
    yAxis: yAxisBase(spec, style),
    series: [
      { type: 'bar', name: yField, data: means, z: 2, ...singleBarLayout },
      buildErrorBarOverlay(categories, means, lowers, uppers),
    ],
  }, spec.annotations);
}
