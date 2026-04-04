/**
 * Bar chart converters: bar, grouped-bar, stacked-bar, error-bar.
 */

import type { EChartsOption } from 'echarts';
import type { ConverterContext } from './types';
import {
  CHART_TYPE_HINTS,
  toNumber, toStr,
  countSamplesPerCategory,
  buildGroupedData,
  buildErrorBarData,
  buildErrorBarOverlay,
  applyMarkLineAnnotations,
  xAxisBase, yAxisBase,
  buildY2Axis, buildY2Series,
  buildBarLabel, buildBarAxes,
  buildLegend,
} from './shared';

// ── bar ────────────────────────────────────────────────────

export function buildBarChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, workRows, style, base, xField, yField, colorField } = ctx;
  const barLabel = buildBarLabel(spec, style);

  // 에러바 있으면 explicit data 모드
  if (spec.errorBar) {
    const { categories, means, lowers, uppers } = buildErrorBarData(
      rows, xField, yField, spec.errorBar.type, spec.errorBar.value ?? 95, spec.encoding.x.sort,
    );
    const barEbCounts = spec.style.showSampleCounts
      ? countSamplesPerCategory(rows, xField)
      : undefined;
    const barEbAxBase = xAxisBase(spec, style, 'category');
    return applyMarkLineAnnotations({
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
    }, spec.annotations);
  }

  const isH = spec.orientation === 'horizontal';
  const y2Axis = spec.encoding.y2;
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

  if (spec.style.showSampleCounts) {
    const catOrder = [...new Map(workRows.map(r => [toStr(r[xField]), true])).keys()];
    const counts = countSamplesPerCategory(rows, xField);
    const { xAxis: barXAxisN, yAxis: barYAxisN } = buildBarAxes(spec, style, catOrder, counts);
    return applyMarkLineAnnotations({
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
    }, spec.annotations, spec.orientation);
  }

  const { xAxis: barXAxis, yAxis: barYAxis } = buildBarAxes(spec, style);
  return applyMarkLineAnnotations({
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
  }, spec.annotations, spec.orientation);
}

// ── grouped-bar ────────────────────────────────────────────

export function buildGroupedBarChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, workRows, style, base, xField, yField, colorField } = ctx;
  const barLabel = buildBarLabel(spec, style);
  const isH = spec.orientation === 'horizontal';

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
      encode: { x: isH ? yField : xField, y: isH ? xField : yField },
      name: yField,
      ...(barLabel ? { label: barLabel } : {}),
    }],
  }, spec.annotations, spec.orientation);
}

// ── error-bar ──────────────────────────────────────────────

export function buildErrorBarChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, style, base, xField, yField } = ctx;
  const errorType = spec.errorBar?.type ?? 'stderr';
  const ciValue = spec.errorBar?.value ?? 95;
  const { categories, means, lowers, uppers } = buildErrorBarData(
    rows, xField, yField, errorType, ciValue, spec.encoding.x.sort,
  );
  const ebCounts = spec.style.showSampleCounts
    ? countSamplesPerCategory(rows, xField)
    : undefined;
  const ebXBase = xAxisBase(spec, style, 'category');

  return applyMarkLineAnnotations({
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
  }, spec.annotations);
}
