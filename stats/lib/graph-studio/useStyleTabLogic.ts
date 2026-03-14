/**
 * StyleTab 로직 훅 (G5.2)
 *
 * StyleTab.tsx에서 모든 상태/핸들러/파생값을 추출.
 * UI 컴포넌트는 이 훅의 반환값만 사용하는 thin wrapper.
 */

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { STYLE_PRESETS } from '@/lib/graph-studio/chart-spec-defaults';
import type { ChartType, LegendSpec, StylePreset } from '@/types/graph-studio';

/** 폰트 옵션 목록 */
export const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: 'Arial, Helvetica, sans-serif',  label: 'Arial (sans-serif)' },
  { value: 'Times New Roman, serif',         label: 'Times New Roman (serif)' },
  { value: 'Noto Sans KR, sans-serif',       label: 'Noto Sans KR (한국어)' },
  { value: 'Courier New, monospace',         label: 'Courier New (monospace)' },
  { value: 'Georgia, serif',                 label: 'Georgia (serif)' },
];

/** 데이터 레이블을 지원하는 차트 유형 */
const DATA_LABEL_CHART_TYPES = new Set<ChartType>(['bar', 'grouped-bar', 'stacked-bar']);
/** n= 표본 수 표기를 지원하는 차트 유형 */
const SAMPLE_COUNT_CHART_TYPES = new Set<ChartType>(['bar', 'grouped-bar', 'stacked-bar', 'error-bar']);

export const PRESET_LIST: { key: StylePreset; label: string; description: string }[] = [
  { key: 'default',   label: 'Default',   description: '깔끔한 기본 스타일 (Arial, 컬러)' },
  { key: 'science',   label: 'Science',   description: 'Nature/Science 유사 (Times New Roman)' },
  { key: 'ieee',      label: 'IEEE',      description: 'IEEE 학회 스타일 (흑백, 작은 폰트)' },
  { key: 'grayscale', label: 'Grayscale', description: '흑백 전용 (인쇄 친화)' },
];

export interface StyleTabLogic {
  // 상태
  yMinInput: string;
  setYMinInput: (v: string) => void;
  yMaxInput: string;
  setYMaxInput: (v: string) => void;
  xMinInput: string;
  setXMinInput: (v: string) => void;
  xMaxInput: string;
  setXMaxInput: (v: string) => void;
  customLabelDraft: Record<string, string>;

  // 핸들러
  handleLogScaleToggle: (checked: boolean) => void;
  handleYRangeBlur: () => void;
  handleXRangeBlur: () => void;
  handleLegendOrientChange: (value: string) => void;
  handleDataLabelsToggle: (checked: boolean) => void;
  handleSampleCountsToggle: (checked: boolean) => void;
  handleCustomLabelChange: (raw: string, value: string) => void;
  commitCustomLabels: () => void;
  handleFontChange: (fontFamily: string) => void;
  handleApplyPreset: (presetKey: StylePreset) => void;
  handleBackgroundChange: (color: string) => void;
  handleFontSizeChange: (key: 'size' | 'titleSize' | 'labelSize', value: number) => void;
  handleSortChange: (sort: 'ascending' | 'descending' | null) => void;
  handleColorChange: (index: number, color: string) => void;
  handleResetColors: () => void;
  currentTitleSize: number;
  currentLabelSize: number;
  currentFontSize: number;
  currentSort: 'ascending' | 'descending' | null;
  isCategoryX: boolean;
  currentColors: string[];

  // 파생값
  isQuantitativeY: boolean;
  isQuantitativeX: boolean;
  isLogScale: boolean;
  currentFont: string;
  showLegend: boolean;
  showDataLabelOption: boolean;
  showSampleCountOption: boolean;
  colorGroups: string[];
}

export function useStyleTabLogic(): StyleTabLogic | null {
  const { chartSpec, updateChartSpec, dataPackage } = useGraphStudioStore();

  const [yMinInput, setYMinInput] = useState(
    chartSpec?.encoding.y.scale?.domain?.[0] !== undefined ? String(chartSpec.encoding.y.scale.domain[0]) : '',
  );
  const [yMaxInput, setYMaxInput] = useState(
    chartSpec?.encoding.y.scale?.domain?.[1] !== undefined ? String(chartSpec.encoding.y.scale.domain[1]) : '',
  );
  const [xMinInput, setXMinInput] = useState(
    chartSpec?.encoding.x.scale?.domain?.[0] !== undefined ? String(chartSpec.encoding.x.scale.domain[0]) : '',
  );
  const [xMaxInput, setXMaxInput] = useState(
    chartSpec?.encoding.x.scale?.domain?.[1] !== undefined ? String(chartSpec.encoding.x.scale.domain[1]) : '',
  );
  const [customLabelDraft, setCustomLabelDraft] = useState<Record<string, string>>(
    () => chartSpec?.encoding.color?.legend?.customLabels ?? {},
  );

  useEffect(() => {
    const domain = chartSpec?.encoding.y.scale?.domain;
    setYMinInput(domain?.[0] !== undefined ? String(domain[0]) : '');
    setYMaxInput(domain?.[1] !== undefined ? String(domain[1]) : '');
  }, [chartSpec?.encoding.y.scale?.domain]);

  useEffect(() => {
    const domain = chartSpec?.encoding.x.scale?.domain;
    setXMinInput(domain?.[0] !== undefined ? String(domain[0]) : '');
    setXMaxInput(domain?.[1] !== undefined ? String(domain[1]) : '');
  }, [chartSpec?.encoding.x.scale?.domain]);

  useEffect(() => {
    setCustomLabelDraft(chartSpec?.encoding.color?.legend?.customLabels ?? {});
  }, [chartSpec?.encoding.color?.legend?.customLabels]);

  // ─── 로그 스케일 ───────────────────────────────────────
  const handleLogScaleToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    const currentDomain = chartSpec.encoding.y.scale?.domain;
    const invalidMinForLog = checked && typeof currentDomain?.[0] === 'number' && currentDomain[0] <= 0;
    const domain = invalidMinForLog ? undefined : currentDomain;
    if (invalidMinForLog) { setYMinInput(''); setYMaxInput(''); }
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        y: { ...chartSpec.encoding.y, scale: { ...chartSpec.encoding.y.scale, type: checked ? 'log' : 'linear', domain } },
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── Y축 범위 ──────────────────────────────────────────
  const handleYRangeBlur = useCallback(() => {
    if (!chartSpec) return;
    const min = parseFloat(yMinInput);
    const max = parseFloat(yMaxInput);
    const domain: [number, number] | undefined = (!isNaN(min) && !isNaN(max)) ? [min, max] : undefined;
    if (JSON.stringify(domain) !== JSON.stringify(chartSpec.encoding.y.scale?.domain)) {
      updateChartSpec({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          y: { ...chartSpec.encoding.y, scale: { ...chartSpec.encoding.y.scale, domain } },
        },
      });
    }
  }, [chartSpec, yMinInput, yMaxInput, updateChartSpec]);

  // ─── X축 범위 ──────────────────────────────────────────
  const handleXRangeBlur = useCallback(() => {
    if (!chartSpec) return;
    const min = parseFloat(xMinInput);
    const max = parseFloat(xMaxInput);
    const domain: [number, number] | undefined = (!isNaN(min) && !isNaN(max)) ? [min, max] : undefined;
    if (JSON.stringify(domain) !== JSON.stringify(chartSpec.encoding.x.scale?.domain)) {
      updateChartSpec({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          x: { ...chartSpec.encoding.x, scale: { ...chartSpec.encoding.x.scale, domain } },
        },
      });
    }
  }, [chartSpec, xMinInput, xMaxInput, updateChartSpec]);

  // ─── 범례 ──────────────────────────────────────────────
  const handleLegendOrientChange = useCallback((value: string) => {
    if (!chartSpec?.encoding.color) return;
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        color: {
          ...chartSpec.encoding.color,
          legend: { ...chartSpec.encoding.color.legend, orient: value as LegendSpec['orient'] },
        },
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── 데이터 레이블 ────────────────────────────────────
  const handleDataLabelsToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, style: { ...chartSpec.style, showDataLabels: checked ? true : undefined } });
  }, [chartSpec, updateChartSpec]);

  const handleSampleCountsToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, style: { ...chartSpec.style, showSampleCounts: checked ? true : undefined } });
  }, [chartSpec, updateChartSpec]);

  // ─── 범례 레이블 편집 ──────────────────────────────────
  const handleCustomLabelChange = useCallback((raw: string, value: string) => {
    setCustomLabelDraft(prev => ({ ...prev, [raw]: value }));
  }, []);

  const commitCustomLabels = useCallback(() => {
    if (!chartSpec?.encoding.color) return;
    const cleaned = Object.fromEntries(Object.entries(customLabelDraft).filter(([, v]) => v.trim() !== ''));
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        color: {
          ...chartSpec.encoding.color,
          legend: {
            ...chartSpec.encoding.color.legend,
            customLabels: Object.keys(cleaned).length > 0 ? cleaned : undefined,
          },
        },
      },
    });
  }, [chartSpec, customLabelDraft, updateChartSpec]);

  // ─── 폰트 / 프리셋 ────────────────────────────────────
  const handleFontChange = useCallback((fontFamily: string) => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, style: { ...chartSpec.style, font: { ...chartSpec.style.font, family: fontFamily } } });
  }, [chartSpec, updateChartSpec]);

  const handleApplyPreset = useCallback((presetKey: StylePreset) => {
    if (!chartSpec) return;
    const preset = STYLE_PRESETS[presetKey];
    updateChartSpec({ ...chartSpec, style: { ...preset } });
  }, [chartSpec, updateChartSpec]);

  const handleBackgroundChange = useCallback((color: string) => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, style: { ...chartSpec.style, background: color || undefined } });
  }, [chartSpec, updateChartSpec]);

  const handleFontSizeChange = useCallback((key: 'size' | 'titleSize' | 'labelSize', value: number) => {
    if (!chartSpec || value < 6 || value > 36) return;
    updateChartSpec({ ...chartSpec, style: { ...chartSpec.style, font: { ...chartSpec.style.font, [key]: value } } });
  }, [chartSpec, updateChartSpec]);

  const handleSortChange = useCallback((sort: 'ascending' | 'descending' | null) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      encoding: { ...chartSpec.encoding, x: { ...chartSpec.encoding.x, sort } },
    });
  }, [chartSpec, updateChartSpec]);

  const handleColorChange = useCallback((index: number, color: string) => {
    if (!chartSpec) return;
    const preset = STYLE_PRESETS[chartSpec.style.preset];
    const base = chartSpec.style.colors ?? preset?.colors ?? [];
    const updated = [...base];
    updated[index] = color;
    updateChartSpec({ ...chartSpec, style: { ...chartSpec.style, colors: updated } });
  }, [chartSpec, updateChartSpec]);

  const handleResetColors = useCallback(() => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, style: { ...chartSpec.style, colors: undefined } });
  }, [chartSpec, updateChartSpec]);

  // ─── 파생값 ────────────────────────────────────────────
  const colorGroups = useMemo((): string[] => {
    if (!chartSpec?.encoding.color) return [];
    const colorField = chartSpec.encoding.color.field;
    if (dataPackage) {
      const col = (dataPackage.data[colorField] ?? []) as unknown[];
      return [...new Set(col.map(v => String(v ?? '')).filter(Boolean))];
    }
    return chartSpec.data.columns.find(c => c.name === colorField)?.sampleValues ?? [];
  }, [chartSpec?.encoding.color, chartSpec?.data.columns, dataPackage]);

  if (!chartSpec) return null;

  const isQuantitativeY = chartSpec.encoding.y.type === 'quantitative';
  const isQuantitativeX = chartSpec.encoding.x.type === 'quantitative';
  const isLogScale = chartSpec.encoding.y.scale?.type === 'log';
  const currentFont =
    chartSpec.style.font?.family
    ?? STYLE_PRESETS[chartSpec.style.preset]?.font?.family
    ?? 'Arial, Helvetica, sans-serif';
  const showLegend = chartSpec.encoding.color !== undefined;
  const showDataLabelOption = DATA_LABEL_CHART_TYPES.has(chartSpec.chartType);
  const showSampleCountOption = SAMPLE_COUNT_CHART_TYPES.has(chartSpec.chartType);
  const currentSort = chartSpec.encoding.x.sort ?? null;
  const isCategoryX = chartSpec.encoding.x.type === 'nominal' || chartSpec.encoding.x.type === 'ordinal';
  const presetColors = STYLE_PRESETS[chartSpec.style.preset]?.colors ?? [];
  const currentColors = chartSpec.style.colors ?? presetColors;
  const presetFont = STYLE_PRESETS[chartSpec.style.preset]?.font;
  const currentTitleSize = chartSpec.style.font?.titleSize ?? presetFont?.titleSize ?? 14;
  const currentLabelSize = chartSpec.style.font?.labelSize ?? presetFont?.labelSize ?? 11;
  const currentFontSize = chartSpec.style.font?.size ?? presetFont?.size ?? 12;

  return {
    yMinInput, setYMinInput, yMaxInput, setYMaxInput,
    xMinInput, setXMinInput, xMaxInput, setXMaxInput,
    customLabelDraft,
    handleLogScaleToggle, handleYRangeBlur, handleXRangeBlur,
    handleLegendOrientChange, handleDataLabelsToggle, handleSampleCountsToggle,
    handleCustomLabelChange, commitCustomLabels,
    handleFontChange, handleApplyPreset, handleBackgroundChange,
    handleFontSizeChange, handleSortChange, handleColorChange, handleResetColors,
    currentTitleSize, currentLabelSize, currentFontSize, currentSort, isCategoryX, currentColors,
    isQuantitativeY, isQuantitativeX, isLogScale, currentFont,
    showLegend, showDataLabelOption, showSampleCountOption, colorGroups,
  };
}

// Re-export for backward compat
export { STYLE_PRESETS };
