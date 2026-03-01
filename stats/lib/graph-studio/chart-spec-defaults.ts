/**
 * ChartSpec 기본값 및 프리셋
 *
 * 데이터 업로드 시 자동으로 적절한 chartSpec을 생성하기 위한 기본값
 */

import type { ChartSpec, ChartType, StyleSpec, ExportConfig, StylePreset, ErrorBarSpec, TrendlineSpec } from '@/types/graph-studio';

// ─── ColorBrewer + viridis 팔레트 ──────────────────────────

/** 정성형/순차형/발산형 팔레트 맵. colorblind-safe 팔레트 포함. */
export const COLORBREWER_PALETTES: Record<string, string[]> = {
  // 정성적(Qualitative) — 그룹 구분
  Set2:    ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
  Set1:    ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#a65628', '#f781bf', '#999999'],
  Paired:  ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00'],
  Dark2:   ['#1b9e77', '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02', '#a6761d', '#666666'],
  // 순차적(Sequential) — 연속값/강도
  viridis: ['#440154', '#3b528b', '#21908c', '#5dc963', '#fde725'],
  Blues:   ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c'],
  Greens:  ['#edf8e9', '#bae4b3', '#74c476', '#31a354', '#006d2c'],
  Oranges: ['#feedde', '#fdbe85', '#fd8d3c', '#e6550d', '#a63603'],
  // 발산형(Diverging) — 양극 비교
  RdBu:    ['#d73027', '#f46d43', '#fdae61', '#fee090', '#abd9e9', '#74add1', '#4575b4'],
  RdYlGn:  ['#d73027', '#f46d43', '#fdae61', '#ffffbf', '#a6d96a', '#66bd63', '#1a9850'],
};

// ─── 저널 색상 팔레트 ──────────────────────────────────────

/**
 * 저널별 공식 색상 팔레트 (ggsci 기반, hex 검증).
 * 출처: R ggsci 패키지 소스 + 각 저널 그래픽 가이드라인.
 * Okabe-Ito: Wong (2011) Nature Methods — APA/PLOS 권장 색맹 친화 팔레트.
 */
export const JOURNAL_PALETTES: Record<string, string[]> = {
  NPG:      ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4', '#91D1C2'],
  AAAS:     ['#3B4992', '#EE0000', '#008B45', '#631879', '#008280', '#BB0021', '#5F559B', '#A20056'],
  NEJM:     ['#BC3C29', '#0072B5', '#E18727', '#20854E', '#7876B1', '#6F99AD', '#FFDC91', '#EE4C97'],
  Lancet:   ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91', '#AD002A'],
  JAMA:     ['#374E55', '#DF8F44', '#00A1D5', '#B24745', '#79AF97', '#6A6599', '#80796B'],
  OkabeIto: ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7'],
};

/** ColorBrewer + 저널 팔레트 통합 맵 — scheme 조회 단일 진입점 */
export const ALL_PALETTES: Record<string, string[]> = {
  ...COLORBREWER_PALETTES,
  ...JOURNAL_PALETTES,
};

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

// ─── 저널 사이즈 프리셋 ─────────────────────────────────────
// 각 저널의 표준 칼럼 너비 (mm). height는 그래프 종류마다 가변.
// 출처: Nature (86/178mm), Cell (88/183mm), PNAS (87/180mm), ACS (84/178mm), KCI (80mm)
//       JKMS (85/175mm), Ann Lab Med (174mm), IEEE (89/190mm)

export const JOURNAL_SIZE_PRESETS = [
  { key: 'nature-single', label: 'Nature 단일 칼럼', width: 86 },
  { key: 'nature-double', label: 'Nature 전체 너비', width: 178 },
  { key: 'cell-single',   label: 'Cell 단일 칼럼',   width: 88 },
  { key: 'pnas-single',   label: 'PNAS 단일 칼럼',   width: 87 },
  { key: 'acs-single',    label: 'ACS 단일 칼럼',    width: 84 },
  { key: 'kci-single',    label: 'KCI 단일 칼럼',    width: 80 },
  { key: 'jkms-single',   label: 'JKMS 단일 칼럼',   width: 85 },
  { key: 'jkms-double',   label: 'JKMS 전체 너비',   width: 175 },
  { key: 'annlabmed',     label: 'Ann Lab Med 전폭',  width: 174 },
  { key: 'ieee-single',   label: 'IEEE 단일 칼럼',    width: 89 },
  { key: 'ieee-double',   label: 'IEEE 전체 너비',    width: 190 },
] as const;

export type JournalPresetKey = typeof JOURNAL_SIZE_PRESETS[number]['key'];

// ─── 차트 유형별 권장 설정 ──────────────────────────────────

interface ChartTypeHint {
  label: string;
  description: string;
  suggestedXType: 'nominal' | 'ordinal' | 'quantitative' | 'temporal';
  suggestedYType: 'quantitative';
  supportsColor: boolean;
  supportsErrorBar: boolean;
  supportsAggregate: boolean;
  /** 이중 Y축 지원 (bar, line만 true) */
  supportsY2: boolean;
  /** 패싯 지원 (bar, scatter만 true) */
  supportsFacet: boolean;
}

export const CHART_TYPE_HINTS: Record<ChartType, ChartTypeHint> = {
  bar: {
    label: '막대 차트',
    description: '범주별 값 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
    supportsY2: true,
    supportsFacet: true,
  },
  'grouped-bar': {
    label: '그룹 막대 차트',
    description: '그룹별 범주 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
    supportsY2: false,
    supportsFacet: false,
  },
  'stacked-bar': {
    label: '누적 막대 차트',
    description: '구성 비율 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: true,
    supportsY2: false,
    supportsFacet: false,
  },
  line: {
    label: '꺾은선 그래프',
    description: '시간/순서에 따른 추세',
    suggestedXType: 'temporal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
    supportsY2: true,
    supportsFacet: false,
  },
  scatter: {
    label: '산점도',
    description: '두 변수의 관계',
    suggestedXType: 'quantitative',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: true,
  },
  boxplot: {
    label: '박스 플롯',
    description: '분포 비교 (중앙값, 사분위수)',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
  },
  histogram: {
    label: '히스토그램',
    description: '빈도 분포',
    suggestedXType: 'quantitative',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
  },
  'error-bar': {
    label: '에러 바 차트',
    description: '평균 ± 오차 표시',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
    supportsY2: false,
    supportsFacet: false,
  },
  heatmap: {
    label: '히트맵',
    description: '행렬형 값 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: false,
    supportsErrorBar: false,
    supportsAggregate: true,
    supportsY2: false,
    supportsFacet: false,
  },
  violin: {
    // ECharts 네이티브 violin 미지원 → box plot으로 렌더링됨
    // PropertiesTab에서 선택 시 인라인 안내 표시 (chartType === 'violin' 조건)
    label: '바이올린 플롯',
    description: '분포 형태 비교',
    suggestedXType: 'nominal',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
  },
  'km-curve': {
    label: 'Kaplan-Meier 생존 곡선',
    description: '생존율 시간 경과 시각화 (그룹 비교 포함)',
    suggestedXType: 'quantitative',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
  },
  'roc-curve': {
    label: 'ROC 곡선',
    description: '진단 정확도 평가 (AUC, 민감도/특이도)',
    suggestedXType: 'quantitative',
    suggestedYType: 'quantitative',
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
  },
};

// ─── Figure 빠른 시작 프리셋 ───────────────────────────────

/** 분석 유형별 차트 구성 원클릭 적용용 프리셋 */
export interface FigurePreset {
  label: string;
  chartType: ChartType;
  errorBar?: ErrorBarSpec;
  trendline?: TrendlineSpec;
}

/**
 * 분석 목적별 빠른 시작 프리셋.
 * 클릭 시 chartType + errorBar + trendline만 덮어씀.
 * data/encoding/style은 현재 chartSpec에서 유지.
 */
export const FIGURE_PRESETS: Record<string, FigurePreset> = {
  'two-group': {
    label: '두 그룹 비교',
    chartType: 'bar',
    errorBar: { type: 'stderr' },
  },
  'distribution': {
    label: '분포 비교',
    chartType: 'violin',
  },
  'correlation': {
    label: '상관 분석',
    chartType: 'scatter',
    trendline: { type: 'linear', showEquation: true },
  },
  'timeseries': {
    label: '시계열',
    chartType: 'line',
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
