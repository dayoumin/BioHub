/**
 * Shared types for ECharts chart-type converters.
 */

import type { ChartSpec } from '@/types/graph-studio';
import type { EChartsOption } from 'echarts';

export interface StyleConfig {
  fontFamily: string;
  fontSize: number;
  titleSize: number;
  labelSize: number;
  axisTitleSize: number;
  colors: string[];
  background: string;
}

/** Context passed to every chart-type builder function. */
export interface ConverterContext {
  spec: ChartSpec;
  /** Original rows (before aggregation). */
  rows: Record<string, unknown>[];
  /** Rows after aggregation + encoding.x.sort. */
  workRows: Record<string, unknown>[];
  style: StyleConfig;
  base: EChartsOption;
  xField: string;
  yField: string;
  colorField: string | undefined;
}

/** Signature every chart-type builder must satisfy. */
export type ChartBuilder = (ctx: ConverterContext) => EChartsOption;
