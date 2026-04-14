/**
 * DataTab 로직 훅 (G5.2)
 *
 * DataTab.tsx에서 모든 상태/핸들러/파생값을 추출.
 * UI 컴포넌트는 이 훅의 반환값만 사용하는 thin wrapper.
 */

import { useCallback, useState, useEffect, useMemo } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { CHART_TYPE_HINTS, ALL_PALETTES, FIGURE_PRESETS } from '@/lib/graph-studio/chart-spec-defaults';
import { getChartCapabilities } from '@/lib/graph-studio/chart-capabilities';
import {
  assignFieldRole,
  changeChartType,
  getRoleAssignmentVisibility,
  normalizeChartSpecForEditorRules,
} from '@/lib/graph-studio/editor-actions';
import { selectXYFields, getPValueLabel } from '@/lib/graph-studio/chart-spec-utils';
import type { ChartType, ErrorBarSpec, SignificanceMark, ColumnMeta } from '@/types/graph-studio';

/** 과학 기호 헬퍼 목록 */
export const SCIENCE_SYMBOLS: { label: string; value: string }[] = [
  { label: 'µ',  value: 'µ' },
  { label: '±',  value: '±' },
  { label: '×',  value: '×' },
  { label: '°',  value: '°' },
  { label: 'Å',  value: 'Å' },
  { label: '⁻¹', value: '⁻¹' },
  { label: '²',  value: '²' },
  { label: '³',  value: '³' },
  { label: '₀',  value: '₀' },
  { label: '₂',  value: '₂' },
  { label: 'α',  value: 'α' },
  { label: 'β',  value: 'β' },
  { label: 'σ',  value: 'σ' },
  { label: 'λ',  value: 'λ' },
];

/** ColorBrewer 팔레트 옵션 */
export const COLORBREWER_OPTIONS: { value: string; label: string }[] = [
  { value: 'Set2',    label: 'Set2 — colorblind-safe' },
  { value: 'Set1',    label: 'Set1 — 선명' },
  { value: 'Paired',  label: 'Paired — 쌍 구분' },
  { value: 'Dark2',   label: 'Dark2 — 진한 정성형' },
  { value: 'viridis', label: 'viridis — 순차형' },
  { value: 'Blues',   label: 'Blues — 파란 순차형' },
  { value: 'Oranges', label: 'Oranges — 주황 순차형' },
  { value: 'RdBu',    label: 'RdBu — 발산형 (빨↔파)' },
  { value: 'RdYlGn',  label: 'RdYlGn — 발산형 (빨↔녹)' },
];

/** 저널 팔레트 옵션 */
export const JOURNAL_OPTIONS: { value: string; label: string }[] = [
  { value: 'NPG',      label: 'NPG — Nature' },
  { value: 'AAAS',     label: 'AAAS — Science' },
  { value: 'NEJM',     label: 'NEJM' },
  { value: 'Lancet',   label: 'Lancet' },
  { value: 'JAMA',     label: 'JAMA' },
  { value: 'OkabeIto', label: 'Okabe-Ito — 색맹 친화' },
];

export interface DataTabLogic {
  // 상태
  titleInput: string;
  setTitleInput: (v: string) => void;
  xTitleInput: string;
  setXTitleInput: (v: string) => void;
  yTitleInput: string;
  setYTitleInput: (v: string) => void;
  y2TitleInput: string;
  setY2TitleInput: (v: string) => void;
  newMarkA: string;
  setNewMarkA: (v: string) => void;
  newMarkB: string;
  setNewMarkB: (v: string) => void;
  newMarkPValue: string;
  setNewMarkPValue: (v: string) => void;

  // 핸들러
  handleTitleBlur: () => void;
  handleTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  makeAxisTitleHandler: (axis: 'x' | 'y', inputVal: string) => () => void;
  handleAxisTitleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleChartTypeChange: (value: string) => void;
  handleXFieldChange: (value: string) => void;
  handleYFieldChange: (value: string) => void;
  handleColorFieldChange: (value: string) => void;
  handleSchemeChange: (value: string) => void;
  handleFigurePreset: (presetKey: string) => void;
  handleOrientationToggle: (checked: boolean) => void;
  handleTrendlineToggle: (checked: boolean) => void;
  handleErrorBarTypeChange: (value: string) => void;
  handleCiValueChange: (value: string) => void;
  handleY2FieldChange: (value: string) => void;
  handleY2TitleBlur: () => void;
  addMark: () => void;
  removeMark: (idx: number) => void;
  handleFacetFieldChange: (value: string) => void;

  // 파생값
  columns: ColumnMeta[];
  xCategories: string[];
  hasY2: boolean;
  hasFacet: boolean;
  showY2: boolean;
  showFacet: boolean;
  showColorField: boolean;
  showErrorBar: boolean;
  showTrendline: boolean;
  showOrientation: boolean;
  showSignificance: boolean;
  paletteColors: string[];
}

export function useDataTabLogic(): DataTabLogic | null {
  const { chartSpec, updateChartSpec, dataPackage } = useGraphStudioStore();

  // ─── 로컬 입력 state ───────────────────────────────────
  const [titleInput, setTitleInput] = useState(chartSpec?.title ?? '');
  const [xTitleInput, setXTitleInput] = useState(chartSpec?.encoding.x.title ?? '');
  const [yTitleInput, setYTitleInput] = useState(chartSpec?.encoding.y.title ?? '');
  const [y2TitleInput, setY2TitleInput] = useState(chartSpec?.encoding.y2?.title ?? '');
  const [newMarkA, setNewMarkA] = useState('');
  const [newMarkB, setNewMarkB] = useState('');
  const [newMarkPValue, setNewMarkPValue] = useState('');

  useEffect(() => {
    setTitleInput(chartSpec?.title ?? '');
    setXTitleInput(chartSpec?.encoding.x.title ?? '');
    setYTitleInput(chartSpec?.encoding.y.title ?? '');
    setY2TitleInput(chartSpec?.encoding.y2?.title ?? '');
  }, [chartSpec?.title, chartSpec?.encoding.x.title, chartSpec?.encoding.y.title, chartSpec?.encoding.y2?.title]);

  // ─── 차트 제목 ─────────────────────────────────────────
  const handleTitleBlur = useCallback(() => {
    if (!chartSpec) return;
    const newTitle = titleInput.trim() || undefined;
    if (newTitle !== chartSpec.title) {
      updateChartSpec({ ...chartSpec, title: newTitle });
    }
  }, [chartSpec, titleInput, updateChartSpec]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
    }, [],
  );

  // ─── 축 제목 ───────────────────────────────────────────
  const makeAxisTitleHandler = useCallback(
    (axis: 'x' | 'y', inputVal: string) => () => {
      if (!chartSpec) return;
      const newTitle = inputVal.trim() || undefined;
      if (newTitle !== chartSpec.encoding[axis].title) {
        updateChartSpec({
          ...chartSpec,
          encoding: {
            ...chartSpec.encoding,
            [axis]: { ...chartSpec.encoding[axis], title: newTitle },
          },
        });
      }
    }, [chartSpec, updateChartSpec],
  );

  const handleAxisTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) e.currentTarget.blur();
    }, [],
  );

  // ─── 차트 유형 ─────────────────────────────────────────
  const handleChartTypeChange = useCallback((value: string) => {
    if (!chartSpec) return;
    const newType = value as ChartType;
    updateChartSpec(changeChartType(chartSpec, newType));
  }, [chartSpec, updateChartSpec]);

  // ─── 필드 변경 ─────────────────────────────────────────
  const handleXFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    const column = chartSpec.data.columns.find(c => c.name === value);
    const nextSpec = assignFieldRole(chartSpec, value, 'x', column?.type ?? 'nominal');
    if (nextSpec) updateChartSpec(nextSpec);
  }, [chartSpec, updateChartSpec]);

  const handleYFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    const column = chartSpec.data.columns.find(c => c.name === value);
    const nextSpec = assignFieldRole(chartSpec, value, 'y', column?.type ?? 'quantitative');
    if (nextSpec) updateChartSpec(nextSpec);
  }, [chartSpec, updateChartSpec]);

  const handleColorFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === 'none') {
      const { color: _c, ...restEncoding } = chartSpec.encoding;
      updateChartSpec({ ...chartSpec, encoding: restEncoding });
    } else {
      const column = chartSpec.data.columns.find(c => c.name === value);
      const nextSpec = assignFieldRole(chartSpec, value, 'color', column?.type ?? 'nominal');
      if (nextSpec) updateChartSpec(nextSpec);
    }
  }, [chartSpec, updateChartSpec]);

  // ─── 팔레트 ────────────────────────────────────────────
  const handleSchemeChange = useCallback((value: string) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      style: { ...chartSpec.style, scheme: value === 'none' ? undefined : value },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── Figure 프리셋 ─────────────────────────────────────
  const handleFigurePreset = useCallback((presetKey: string) => {
    if (!chartSpec) return;
    const preset = FIGURE_PRESETS[presetKey];
    if (!preset) return;
    const nextSpec = changeChartType(chartSpec, preset.chartType);
    updateChartSpec(normalizeChartSpecForEditorRules({
      ...nextSpec,
      errorBar: preset.errorBar,
      trendline: preset.trendline,
    }));
  }, [chartSpec, updateChartSpec]);

  // ─── 토글 핸들러 ───────────────────────────────────────
  const handleOrientationToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, orientation: checked ? 'horizontal' : undefined });
  }, [chartSpec, updateChartSpec]);

  const handleTrendlineToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, trendline: checked ? { type: 'linear' } : undefined });
  }, [chartSpec, updateChartSpec]);

  // ─── 에러바 ────────────────────────────────────────────
  const handleErrorBarTypeChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === 'none') {
      updateChartSpec({ ...chartSpec, errorBar: undefined });
    } else {
      updateChartSpec({ ...chartSpec, errorBar: { ...chartSpec.errorBar, type: value as ErrorBarSpec['type'] } });
    }
  }, [chartSpec, updateChartSpec]);

  const handleCiValueChange = useCallback((value: string) => {
    if (!chartSpec?.errorBar) return;
    updateChartSpec({ ...chartSpec, errorBar: { ...chartSpec.errorBar, value: Number(value) } });
  }, [chartSpec, updateChartSpec]);

  // ─── Y2 ────────────────────────────────────────────────
  const handleY2FieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === 'none') {
      const { y2: _y2, ...restEncoding } = chartSpec.encoding;
      updateChartSpec({ ...chartSpec, encoding: restEncoding });
    } else {
      const nextSpec = assignFieldRole(chartSpec, value, 'y2', 'quantitative');
      if (nextSpec) updateChartSpec(nextSpec);
    }
  }, [chartSpec, updateChartSpec]);

  const handleY2TitleBlur = useCallback(() => {
    if (!chartSpec?.encoding.y2) return;
    const newTitle = y2TitleInput.trim() || undefined;
    if (newTitle !== chartSpec.encoding.y2.title) {
      updateChartSpec({
        ...chartSpec,
        encoding: { ...chartSpec.encoding, y2: { ...chartSpec.encoding.y2, title: newTitle } },
      });
    }
  }, [chartSpec, y2TitleInput, updateChartSpec]);

  // ─── 유의성 마커 ───────────────────────────────────────
  const xCategories = useMemo(() => {
    if (!dataPackage || !chartSpec?.encoding.x.field) return [];
    const xField = chartSpec.encoding.x.field;
    const col = (dataPackage.data[xField] ?? []) as unknown[];
    return [...new Set(col.map(v => String(v ?? '')).filter(Boolean))];
  }, [dataPackage, chartSpec?.encoding.x.field]);

  const addMark = useCallback(() => {
    if (!chartSpec || !newMarkA || !newMarkB || newMarkA === newMarkB) return;
    const pNum = parseFloat(newMarkPValue);
    const mark: SignificanceMark = {
      groupA: newMarkA,
      groupB: newMarkB,
      ...(isNaN(pNum) ? { label: newMarkPValue || '*' } : { pValue: pNum }),
    };
    updateChartSpec({ ...chartSpec, significance: [...(chartSpec.significance ?? []), mark] });
    setNewMarkPValue('');
  }, [chartSpec, newMarkA, newMarkB, newMarkPValue, updateChartSpec]);

  const removeMark = useCallback((idx: number) => {
    if (!chartSpec) return;
    updateChartSpec({ ...chartSpec, significance: chartSpec.significance?.filter((_, i) => i !== idx) });
  }, [chartSpec, updateChartSpec]);

  // ─── 패싯 ──────────────────────────────────────────────
  const handleFacetFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === 'none') {
      const { facet: _f, ...restSpec } = chartSpec;
      updateChartSpec(restSpec);
    } else {
      const column = chartSpec.data.columns.find(c => c.name === value);
      const nextSpec = assignFieldRole(chartSpec, value, 'facet', column?.type ?? 'nominal');
      if (nextSpec) updateChartSpec(nextSpec);
    }
  }, [chartSpec, updateChartSpec]);

  // ─── 파생값 ────────────────────────────────────────────
  if (!chartSpec) return null;

  const columns = chartSpec.data.columns;
  const hints = CHART_TYPE_HINTS[chartSpec.chartType];
  const capabilities = getChartCapabilities(chartSpec.chartType);
  if (!capabilities) return null;
  const hasY2 = !!chartSpec.encoding.y2;
  const hasFacet = !!chartSpec.facet;
  const roleVisibility = getRoleAssignmentVisibility(chartSpec);
  const showY2 = roleVisibility.showY2Field;
  const showFacet = roleVisibility.showFacetField;
  const showColorField = roleVisibility.showColorField;
  const showErrorBar = capabilities.supportsErrorBar && !hasY2 && !hasFacet && (
    chartSpec.chartType !== 'line' ||
    (!chartSpec.encoding.color?.field && chartSpec.encoding.x.type !== 'temporal')
  );
  const showTrendline = capabilities.supportsTrendline && !hasFacet;
  const showOrientation = capabilities.supportsOrientation;
  const showSignificance = capabilities.supportsSignificance;
  const paletteColors = chartSpec.style.scheme ? (ALL_PALETTES[chartSpec.style.scheme] ?? []).slice(0, 6) : [];

  return {
    titleInput, setTitleInput,
    xTitleInput, setXTitleInput,
    yTitleInput, setYTitleInput,
    y2TitleInput, setY2TitleInput,
    newMarkA, setNewMarkA,
    newMarkB, setNewMarkB,
    newMarkPValue, setNewMarkPValue,
    handleTitleBlur, handleTitleKeyDown,
    makeAxisTitleHandler, handleAxisTitleKeyDown,
    handleChartTypeChange, handleXFieldChange, handleYFieldChange,
    handleColorFieldChange, handleSchemeChange, handleFigurePreset,
    handleOrientationToggle, handleTrendlineToggle,
    handleErrorBarTypeChange, handleCiValueChange,
    handleY2FieldChange, handleY2TitleBlur,
    addMark, removeMark, handleFacetFieldChange,
    columns, xCategories,
    hasY2, hasFacet, showY2, showFacet, showColorField,
    showErrorBar, showTrendline, showOrientation, showSignificance,
    paletteColors,
  };
}

// Re-export for backward compat
export { CHART_TYPE_HINTS, FIGURE_PRESETS, ALL_PALETTES, getPValueLabel };
