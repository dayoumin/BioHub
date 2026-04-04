/**
 * Facet (small multiples) builder.
 */

import type { ChartSpec } from '@/types/graph-studio';
import type { EChartsOption } from 'echarts';
import type { StyleConfig } from './types';
import { partitionRowsByFacet, computeFacetLayout } from '../facet-layout';
import { toNumber, toStr, getBaseGraphics } from './shared';

/** 패싯 최대 개수 — 초과 시 첫 N개만 렌더 (성능 보호) */
const MAX_FACETS = 12;

export function buildFacetOption(
  spec: ChartSpec,
  rows: Record<string, unknown>[],
  style: StyleConfig,
  base: EChartsOption,
): EChartsOption {
  const facet = spec.facet;
  if (!facet) return base;
  const xField = spec.encoding.x.field;
  const yField = spec.encoding.y.field;

  const yScale = spec.encoding.y.scale;
  const facetYAxisType = yScale?.type === 'log' ? ('log' as const) : ('value' as const);
  const yDomain = (
    yScale?.domain &&
    yScale.domain.length === 2 &&
    typeof yScale.domain[0] === 'number'
  ) ? (yScale.domain as [number, number]) : undefined;

  const allGroups = partitionRowsByFacet(rows, facet.field);
  const groups = allGroups.size > MAX_FACETS
    ? new Map([...allGroups].slice(0, MAX_FACETS))
    : allGroups;

  const layout = computeFacetLayout(groups.size, facet.ncol);

  const grids: Record<string, unknown>[] = [];
  const xAxes: Record<string, unknown>[] = [];
  const yAxes: Record<string, unknown>[] = [];
  const allSeries: Record<string, unknown>[] = [];
  const titleGraphics: Record<string, unknown>[] = [];

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
      if (isScatterFacet) {
        const vx = toNumber(row[xField]);
        if (!isNaN(vx)) {
          globalXMin = globalXMin === undefined ? vx : Math.min(globalXMin, vx);
          globalXMax = globalXMax === undefined ? vx : Math.max(globalXMax, vx);
        }
      }
    }
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

    const isHFacet = isBarFacet && spec.orientation === 'horizontal';
    if (spec.chartType === 'scatter') {
      xAxes.push({
        gridIndex: i,
        type: 'value',
        scale: true,
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
        scale: true,
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
        xAxes.push(valAxisConfig);
        yAxes.push(catAxisConfig);
      } else {
        xAxes.push(catAxisConfig);
        yAxes.push(valAxisConfig);
      }
    }

    if (spec.chartType === 'bar') {
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
      ...getBaseGraphics(base),
      ...titleGraphics,
    ],
    legend: { show: false },
    tooltip: { trigger: 'item' },
  };
}
