/**
 * ChartSpec → Vega-Lite Spec 변환기
 *
 * 내부 chartSpec을 Vega-Lite JSON으로 변환하여 미리보기 렌더링에 사용.
 * Vega-Lite 공식 스키마: https://vega.github.io/schema/vega-lite/v5.json
 */

import type { ChartSpec, AxisSpec, StyleSpec, DataType } from '@/types/graph-studio';
import { STYLE_PRESETS } from './chart-spec-defaults';

// ─── Vega-Lite 타입 (최소 정의) ────────────────────────────

interface VegaLiteSpec {
  $schema: string;
  title?: string;
  width: number;
  height: number;
  data: { values: Record<string, unknown>[] };
  mark?: VegaMark | string;
  layer?: VegaLayerSpec[];
  encoding?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

interface VegaMark {
  type: string;
  tooltip?: boolean;
  opacity?: number;
  size?: number;
  extent?: string;
}

interface VegaLayerSpec {
  mark: VegaMark | string;
  encoding?: Record<string, unknown>;
}

// ─── 데이터 타입 매핑 ──────────────────────────────────────

function toVegaType(type: DataType): string {
  const map: Record<DataType, string> = {
    quantitative: 'quantitative',
    nominal: 'nominal',
    ordinal: 'ordinal',
    temporal: 'temporal',
  };
  return map[type];
}

// ─── 축 인코딩 변환 ────────────────────────────────────────

function convertAxis(axis: AxisSpec): Record<string, unknown> {
  const result: Record<string, unknown> = {
    field: axis.field,
    type: toVegaType(axis.type),
  };

  if (axis.title !== undefined) result.title = axis.title;
  if (axis.sort !== undefined) result.sort = axis.sort;
  if (axis.format) result.format = axis.format;

  const axisConfig: Record<string, unknown> = {};
  if (axis.labelAngle !== undefined) axisConfig.labelAngle = axis.labelAngle;
  if (axis.labelFontSize) axisConfig.labelFontSize = axis.labelFontSize;
  if (axis.titleFontSize) axisConfig.titleFontSize = axis.titleFontSize;
  if (axis.grid !== undefined) axisConfig.grid = axis.grid;

  if (Object.keys(axisConfig).length > 0) {
    result.axis = axisConfig;
  }

  if (axis.scale) {
    const scaleConfig: Record<string, unknown> = {};
    if (axis.scale.domain) scaleConfig.domain = axis.scale.domain;
    if (axis.scale.type) scaleConfig.type = axis.scale.type;
    if (axis.scale.zero !== undefined) scaleConfig.zero = axis.scale.zero;
    if (Object.keys(scaleConfig).length > 0) {
      result.scale = scaleConfig;
    }
  }

  return result;
}

// ─── 스타일 → Vega config ──────────────────────────────────

function convertStyle(style: StyleSpec): Record<string, unknown> {
  const preset = STYLE_PRESETS[style.preset] ?? STYLE_PRESETS.default;
  const font = style.font ?? preset.font;

  const config: Record<string, unknown> = {
    background: style.background ?? preset.background ?? 'white',
    font: font?.family ?? 'Arial, Helvetica, sans-serif',
    title: {
      fontSize: font?.titleSize ?? 14,
      anchor: 'start' as const,
    },
    axis: {
      labelFontSize: font?.labelSize ?? 11,
      titleFontSize: font?.size ?? 12,
    },
    legend: {
      labelFontSize: font?.labelSize ?? 11,
      titleFontSize: font?.size ?? 12,
    },
  };

  if (style.colors?.length) {
    config.range = { category: style.colors };
  }

  return config;
}

// ─── Mark 변환 ─────────────────────────────────────────────

function getVegaMark(chartSpec: ChartSpec): VegaMark | string {
  const markMap: Record<string, string> = {
    'bar': 'bar',
    'grouped-bar': 'bar',
    'stacked-bar': 'bar',
    'line': 'line',
    'scatter': 'point',
    'boxplot': 'boxplot',
    'histogram': 'bar',
    'error-bar': 'bar',
    'heatmap': 'rect',
    'violin': 'area',
  };

  const markType = markMap[chartSpec.chartType] ?? 'bar';

  if (chartSpec.chartType === 'scatter') {
    return { type: 'point', tooltip: true, size: 60 };
  }

  if (chartSpec.chartType === 'boxplot') {
    return { type: 'boxplot', extent: 'min-max' };
  }

  return { type: markType, tooltip: true };
}

// ─── 메인 변환 함수 ────────────────────────────────────────

export function chartSpecToVegaLite(
  chartSpec: ChartSpec,
  data: Record<string, unknown>[],
): VegaLiteSpec {
  const encoding: Record<string, unknown> = {
    x: convertAxis(chartSpec.encoding.x),
    y: convertAxis(chartSpec.encoding.y),
  };

  // 히스토그램: x를 bin으로, y를 count로
  if (chartSpec.chartType === 'histogram') {
    encoding.x = {
      ...convertAxis(chartSpec.encoding.x),
      bin: true,
    };
    encoding.y = { aggregate: 'count', type: 'quantitative', title: 'Count' };
  }

  // 집계
  if (chartSpec.aggregate && chartSpec.chartType !== 'histogram') {
    encoding.y = {
      ...convertAxis(chartSpec.encoding.y),
      aggregate: chartSpec.aggregate.y,
    };
  }

  // 색상/그룹
  if (chartSpec.encoding.color) {
    const colorEnc: Record<string, unknown> = {
      field: chartSpec.encoding.color.field,
      type: toVegaType(chartSpec.encoding.color.type),
    };
    if (chartSpec.encoding.color.scale?.scheme) {
      colorEnc.scale = { scheme: chartSpec.encoding.color.scale.scheme };
    }
    if (chartSpec.encoding.color.scale?.range) {
      colorEnc.scale = { range: chartSpec.encoding.color.scale.range };
    }
    if (chartSpec.encoding.color.legend?.orient === 'none') {
      colorEnc.legend = null;
    } else if (chartSpec.encoding.color.legend) {
      colorEnc.legend = {
        ...(chartSpec.encoding.color.legend.title && { title: chartSpec.encoding.color.legend.title }),
        ...(chartSpec.encoding.color.legend.orient && { orient: chartSpec.encoding.color.legend.orient }),
      };
    }
    encoding.color = colorEnc;
  }

  // Stacked bar
  if (chartSpec.chartType === 'stacked-bar') {
    const yEnc = encoding.y as Record<string, unknown>;
    yEnc.stack = 'zero';
  }

  // Size (scatter)
  if (chartSpec.encoding.size) {
    encoding.size = {
      field: chartSpec.encoding.size.field,
      type: toVegaType(chartSpec.encoding.size.type),
    };
  }

  // 에러바 → layer 구조
  if (chartSpec.errorBar && chartSpec.chartType !== 'boxplot') {
    const errorExtent = chartSpec.errorBar.type === 'ci' ? 'ci'
      : chartSpec.errorBar.type === 'stderr' ? 'stderr'
      : chartSpec.errorBar.type === 'stdev' ? 'stdev'
      : 'iqr';

    return {
      $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
      title: chartSpec.title,
      width: chartSpec.exportConfig.width,
      height: chartSpec.exportConfig.height,
      data: { values: data },
      layer: [
        {
          mark: getVegaMark(chartSpec),
          encoding,
        },
        {
          mark: { type: 'errorbar', extent: errorExtent },
          encoding: {
            x: encoding.x,
            y: encoding.y,
          },
        },
      ],
      config: convertStyle(chartSpec.style),
    };
  }

  // Heatmap 색상 인코딩
  if (chartSpec.chartType === 'heatmap') {
    encoding.color = {
      field: chartSpec.encoding.y.field,
      type: 'quantitative',
      aggregate: chartSpec.aggregate?.y ?? 'mean',
    };
  }

  return {
    $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
    title: chartSpec.title,
    width: chartSpec.exportConfig.width,
    height: chartSpec.exportConfig.height,
    data: { values: data },
    mark: getVegaMark(chartSpec),
    encoding,
    config: convertStyle(chartSpec.style),
  };
}
