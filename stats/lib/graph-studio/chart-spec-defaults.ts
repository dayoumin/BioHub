/**
 * ChartSpec 기본값 및 프리셋
 *
 * 데이터 업로드 시 자동으로 적절한 chartSpec을 생성하기 위한 기본값
 */

import type { ChartSpec, ChartType, StyleSpec, ExportConfig, StylePreset } from '@/types/graph-studio';

// ─── 스타일 프리셋 ─────────────────────────────────────────

export const STYLE_PRESETS: Record<StylePreset, StyleSpec> = {
  default: {
    preset: 'default',
    font: {
      family: 'Arial, Helvetica, sans-serif',
      size: 12,
      titleSize: 14,
      labelSize: 11,
    },
    background: 'white',
    padding: 20,
  },

  science: {
    preset: 'science',
    font: {
      family: 'Times New Roman, serif',
      size: 10,
      titleSize: 12,
      labelSize: 9,
    },
    background: 'white',
    padding: 16,
  },

  ieee: {
    preset: 'ieee',
    font: {
      family: 'Times New Roman, serif',
      size: 8,
      titleSize: 10,
      labelSize: 8,
    },
    colors: [
      '#000000', '#555555', '#999999', '#cccccc',
    ],
    background: 'white',
    padding: 12,
  },

  grayscale: {
    preset: 'grayscale',
    font: {
      family: 'Arial, Helvetica, sans-serif',
      size: 11,
      titleSize: 13,
      labelSize: 10,
    },
    colors: [
      '#000000', '#404040', '#808080', '#b0b0b0', '#d0d0d0',
    ],
    background: 'white',
    padding: 16,
  },
} as const;

// ─── Export 기본값 ──────────────────────────────────────────

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  format: 'png',
  dpi: 300,
};

// ─── 차트 유형별 권장 설정 ──────────────────────────────────

interface ChartTypeHint {
  label: string;
  description: string;
  suggestedXType: 'nominal' | 'ordinal' | 'quantitative' | 'temporal';
  suggestedYType: 'quantitative';
  supportsColor: boolean;
  supportsErrorBar: boolean;
  supportsAggregate: boolean;
}

export const CHART_TYPE_HINTS: Record<ChartType, ChartTypeHint> = {
  bar: {
    label: 'Bar Chart',
    description: '범주별 값 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
  },
  'grouped-bar': {
    label: 'Grouped Bar',
    description: '그룹별 범주 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
  },
  'stacked-bar': {
    label: 'Stacked Bar',
    description: '구성 비율 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: true,
  },
  line: {
    label: 'Line Chart',
    description: '시간/순서에 따른 추세',
    suggestedXType: 'temporal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
  },
  scatter: {
    label: 'Scatter Plot',
    description: '두 변수의 관계',
    suggestedXType: 'quantitative',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
  },
  boxplot: {
    label: 'Box Plot',
    description: '분포 비교 (중앙값, 사분위수)',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
  },
  histogram: {
    label: 'Histogram',
    description: '빈도 분포',
    suggestedXType: 'quantitative',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
  },
  'error-bar': {
    label: 'Error Bar Chart',
    description: '평균 ± 오차 표시',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
  },
  heatmap: {
    label: 'Heatmap',
    description: '행렬형 값 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: false,
    supportsErrorBar: false,
    supportsAggregate: true,
  },
  violin: {
    label: 'Violin Plot',
    description: '분포 형태 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
  },
};

// ─── 기본 ChartSpec 생성 ───────────────────────────────────

export function createDefaultChartSpec(
  sourceId: string,
  chartType: ChartType,
  xField: string,
  yField: string,
  columns: ChartSpec['data']['columns'],
): ChartSpec {
  const xColumn = columns.find(c => c.name === xField);
  const yColumn = columns.find(c => c.name === yField);

  return {
    version: '1.0',
    chartType,
    data: {
      sourceId,
      columns,
    },
    encoding: {
      x: {
        field: xField,
        type: xColumn?.type ?? 'nominal',
      },
      y: {
        field: yField,
        type: yColumn?.type ?? 'quantitative',
      },
    },
    style: { ...STYLE_PRESETS.default },
    annotations: [],
    exportConfig: { ...DEFAULT_EXPORT_CONFIG },
  };
}
