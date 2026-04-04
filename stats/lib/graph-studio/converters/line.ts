/**
 * Line chart converter.
 */

import type { EChartsOption } from 'echarts';
import type { ConverterContext } from './types';
import {
  CHART_TYPE_HINTS,
  getAxisType, sortByDate,
  toNumber, toStr,
  buildGroupedData,
  buildErrorBarData,
  buildErrorBarOverlay,
  applyMarkLineAnnotations,
  xAxisBase, yAxisBase,
  buildY2Axis, buildY2Series,
  buildLegend,
} from './shared';

export function buildLineChart(ctx: ConverterContext): EChartsOption {
  const { spec, rows, workRows, style, base, xField, yField, colorField } = ctx;
  const xType = getAxisType(spec.encoding.x.type);

  if (colorField) {
    if (xType === 'time') {
      // Temporal + color: preserve time axis
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
      for (const g of groupOrder) {
        const arr = groupMap.get(g);
        if (arr) arr.sort(sortByDate);
      }
      return applyMarkLineAnnotations({
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
      }, spec.annotations, spec.orientation);
    }

    // Non-temporal: category pivot
    const { categories, groups, seriesData } = buildGroupedData(workRows, xField, colorField, yField, spec.encoding.x.sort);
    return applyMarkLineAnnotations({
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
    }, spec.annotations, spec.orientation);
  }

  // Temporal (no color)
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
    return applyMarkLineAnnotations({
      ...base,
      tooltip: hasY2Time
        ? { trigger: 'axis', axisPointer: { type: 'cross' } }
        : { trigger: 'axis' },
      xAxis: { ...xAxisBase(spec, style, 'time') },
      yAxis: hasY2Time && y2AxisTime
        ? [yAxisBase(spec, style), buildY2Axis(y2AxisTime, style)]
        : yAxisBase(spec, style),
      series: timeSeries,
    }, spec.annotations, spec.orientation);
  }

  // 에러바 (category X만 지원)
  if (spec.errorBar && xType === 'category') {
    const { categories, means, lowers, uppers } = buildErrorBarData(
      rows, xField, yField, spec.errorBar.type, spec.errorBar.value ?? 95, spec.encoding.x.sort,
    );
    return applyMarkLineAnnotations({
      ...base,
      tooltip: { trigger: 'axis' },
      xAxis: { ...xAxisBase(spec, style, 'category'), data: categories },
      yAxis: yAxisBase(spec, style),
      series: [
        { type: 'line', data: means, name: yField, smooth: false, z: 2 },
        buildErrorBarOverlay(categories, means, lowers, uppers),
      ],
    }, spec.annotations, spec.orientation);
  }

  // Default: category/value line
  const y2AxisLine = spec.encoding.y2;
  const hasY2Line = !!y2AxisLine && CHART_TYPE_HINTS[spec.chartType].supportsY2;
  const lineSeries: Record<string, unknown>[] = [
    { type: 'line', encode: { x: xField, y: yField }, name: yField, smooth: false },
  ];
  if (hasY2Line && y2AxisLine) {
    lineSeries.push(buildY2Series(workRows, xField, y2AxisLine.field, style, false));
  }
  return applyMarkLineAnnotations({
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
  }, spec.annotations, spec.orientation);
}
