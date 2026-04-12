/**
 * Scatter chart converter with trendline support.
 */

import type { EChartsOption } from 'echarts';
import type { ConverterContext } from './types';
import {
  toNumber, toStr,
  buildLinearTrendlineSeries,
  applyMarkLineAnnotations,
  xAxisBase, yAxisBase,
  buildLegend,
} from './shared';

export function buildScatterChart(ctx: ConverterContext): EChartsOption {
  const { spec, workRows, style, base, xField, yField, colorField } = ctx;
  const xScale = spec.encoding.x.scale?.zero === true ? false : true;
  const yScale = spec.encoding.y.scale?.zero === true ? false : true;

  if (colorField) {
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
    if (spec.trendline?.type === 'linear') {
      const allPoints: [number, number][] = [];
      for (const pts of groupMap.values()) allPoints.push(...pts);
      const trendSeries = buildLinearTrendlineSeries(allPoints, spec.trendline, style, yField);
      if (trendSeries) scatterSeries.push(trendSeries);
    }
    return applyMarkLineAnnotations({
      ...base,
      tooltip: { trigger: 'item' },
      legend: buildLegend(spec, style),
      xAxis: { ...xAxisBase(spec, style, 'value'), scale: xScale },
      yAxis: { ...yAxisBase(spec, style), scale: yScale },
      series: scatterSeries,
    }, spec.annotations, spec.orientation);
  }

  // 단순 scatter (colorField 없음)
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
  return applyMarkLineAnnotations({
    ...base,
    tooltip: { trigger: 'item' },
    xAxis: { ...xAxisBase(spec, style, 'value'), scale: xScale },
    yAxis: { ...yAxisBase(spec, style), scale: yScale },
    dataset: { source: workRows },
    series: simpleSeries,
  }, spec.annotations, spec.orientation);
}
