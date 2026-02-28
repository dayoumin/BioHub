'use client';

/**
 * 속성 탭 — 차트 유형, 축, 에러바, 범례 등 직접 편집
 */

import { useCallback, useState, useEffect } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import type { ChartType, ErrorBarSpec, LegendSpec } from '@/types/graph-studio';

/** 에러바를 지원하는 차트 유형 */
const ERROR_BAR_CHART_TYPES = new Set<ChartType>(['bar', 'line', 'error-bar']);

export function PropertiesTab(): React.ReactElement {
  const { chartSpec, updateChartSpec } = useGraphStudioStore();

  // ─── 로컬 입력 state (onBlur 시에만 updateChartSpec) ─────────────────────
  // onChange마다 updateChartSpec하면 키입력 하나당 undo history 항목 생성

  const [titleInput, setTitleInput] = useState(chartSpec?.title ?? '');
  const [xTitleInput, setXTitleInput] = useState(chartSpec?.encoding.x.title ?? '');
  const [yTitleInput, setYTitleInput] = useState(chartSpec?.encoding.y.title ?? '');
  const [yMinInput, setYMinInput] = useState(
    chartSpec?.encoding.y.scale?.domain?.[0] !== undefined
      ? String(chartSpec.encoding.y.scale.domain[0])
      : '',
  );
  const [yMaxInput, setYMaxInput] = useState(
    chartSpec?.encoding.y.scale?.domain?.[1] !== undefined
      ? String(chartSpec.encoding.y.scale.domain[1])
      : '',
  );

  // 외부 변경(AI 편집 등) 시 로컬 입력 동기화
  useEffect(() => { setTitleInput(chartSpec?.title ?? ''); }, [chartSpec?.title]);
  useEffect(() => { setXTitleInput(chartSpec?.encoding.x.title ?? ''); }, [chartSpec?.encoding.x.title]);
  useEffect(() => { setYTitleInput(chartSpec?.encoding.y.title ?? ''); }, [chartSpec?.encoding.y.title]);
  useEffect(() => {
    const domain = chartSpec?.encoding.y.scale?.domain;
    setYMinInput(domain?.[0] !== undefined ? String(domain[0]) : '');
    setYMaxInput(domain?.[1] !== undefined ? String(domain[1]) : '');
  }, [chartSpec?.encoding.y.scale?.domain]);

  // ─── 차트 제목 ────────────────────────────────────────────

  const handleTitleBlur = useCallback(() => {
    if (!chartSpec) return;
    const newTitle = titleInput.trim() || undefined;
    if (newTitle !== chartSpec.title) {
      updateChartSpec({ ...chartSpec, title: newTitle });
    }
  }, [chartSpec, titleInput, updateChartSpec]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      // isComposing: 한국어 IME 확정 Enter와 저장 Enter 구분
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.currentTarget.blur();
      }
    },
    [],
  );

  // ─── 축 제목 (공통 패턴) ──────────────────────────────────

  const makeAxisTitleHandler = useCallback(
    (axis: 'x' | 'y', inputVal: string) => () => {
      if (!chartSpec) return;
      const newTitle = inputVal.trim() || undefined;
      const current = chartSpec.encoding[axis].title;
      if (newTitle !== current) {
        updateChartSpec({
          ...chartSpec,
          encoding: {
            ...chartSpec.encoding,
            [axis]: { ...chartSpec.encoding[axis], title: newTitle },
          },
        });
      }
    },
    [chartSpec, updateChartSpec],
  );

  const handleAxisTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
        e.currentTarget.blur();
      }
    },
    [],
  );

  // ─── 차트 유형 ────────────────────────────────────────────

  const handleChartTypeChange = useCallback((value: string) => {
    if (!chartSpec) return;
    const newType = value as ChartType;
    const hint = CHART_TYPE_HINTS[newType];
    const columns = chartSpec.data.columns;

    const { xField, yField } = selectXYFields(columns, hint);
    const xCol = columns.find(c => c.name === xField);
    const yCol = columns.find(c => c.name === yField);

    updateChartSpec({
      ...chartSpec,
      chartType: newType,
      encoding: {
        ...chartSpec.encoding,
        x: { ...chartSpec.encoding.x, field: xField, type: xCol?.type ?? hint.suggestedXType },
        y: { ...chartSpec.encoding.y, field: yField, type: yCol?.type ?? 'quantitative' },
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── X축 필드 ─────────────────────────────────────────────

  const handleXFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === chartSpec.encoding.y.field) return;
    const column = chartSpec.data.columns.find(c => c.name === value);
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        x: { ...chartSpec.encoding.x, field: value, type: column?.type ?? 'nominal' },
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── Y축 필드 ─────────────────────────────────────────────

  const handleYFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === chartSpec.encoding.x.field) return;
    const column = chartSpec.data.columns.find(c => c.name === value);
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        y: { ...chartSpec.encoding.y, field: value, type: column?.type ?? 'quantitative' },
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── 로그 스케일 ──────────────────────────────────────────

  const handleLogScaleToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        y: {
          ...chartSpec.encoding.y,
          scale: { ...chartSpec.encoding.y.scale, type: checked ? 'log' : 'linear' },
        },
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── Y축 범위 ─────────────────────────────────────────────

  const handleYRangeBlur = useCallback(() => {
    if (!chartSpec) return;
    const min = parseFloat(yMinInput);
    const max = parseFloat(yMaxInput);
    // 둘 다 유효한 숫자일 때만 domain 설정, 아니면 undefined (auto)
    const domain: [number, number] | undefined =
      (!isNaN(min) && !isNaN(max)) ? [min, max] : undefined;
    const currentDomain = chartSpec.encoding.y.scale?.domain;
    if (JSON.stringify(domain) !== JSON.stringify(currentDomain)) {
      updateChartSpec({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          y: {
            ...chartSpec.encoding.y,
            scale: { ...chartSpec.encoding.y.scale, domain },
          },
        },
      });
    }
  }, [chartSpec, yMinInput, yMaxInput, updateChartSpec]);

  // ─── 에러바 ───────────────────────────────────────────────

  const handleErrorBarTypeChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === 'none') {
      updateChartSpec({ ...chartSpec, errorBar: undefined });
    } else {
      updateChartSpec({
        ...chartSpec,
        errorBar: { ...chartSpec.errorBar, type: value as ErrorBarSpec['type'] },
      });
    }
  }, [chartSpec, updateChartSpec]);

  const handleCiValueChange = useCallback((value: string) => {
    if (!chartSpec?.errorBar) return;
    updateChartSpec({
      ...chartSpec,
      errorBar: { ...chartSpec.errorBar, value: Number(value) },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── 범례 위치 ────────────────────────────────────────────

  const handleLegendOrientChange = useCallback((value: string) => {
    if (!chartSpec?.encoding.color) return;
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        color: {
          ...chartSpec.encoding.color,
          legend: {
            ...chartSpec.encoding.color.legend,
            orient: value as LegendSpec['orient'],
          },
        },
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── 렌더 ─────────────────────────────────────────────────

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  const columns = chartSpec.data.columns;
  const isQuantitativeY = chartSpec.encoding.y.type === 'quantitative';
  const isLogScale = chartSpec.encoding.y.scale?.type === 'log';
  // line 차트는 colorField 없고 category X일 때만 에러바 컨버터가 지원
  const showErrorBar = ERROR_BAR_CHART_TYPES.has(chartSpec.chartType) && (
    chartSpec.chartType !== 'line' ||
    (!chartSpec.encoding.color?.field && chartSpec.encoding.x.type !== 'temporal')
  );
  const showLegend = chartSpec.encoding.color !== undefined;

  return (
    <div className="space-y-4">
      {/* 차트 제목 */}
      <div className="space-y-1.5">
        <Label htmlFor="chart-title" className="text-xs">제목</Label>
        <Input
          id="chart-title"
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          onBlur={handleTitleBlur}
          onKeyDown={handleTitleKeyDown}
          placeholder="차트 제목"
          className="h-8 text-sm"
        />
      </div>

      {/* 차트 유형 */}
      <div className="space-y-1.5">
        <Label className="text-xs">차트 유형</Label>
        <Select value={chartSpec.chartType} onValueChange={handleChartTypeChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(CHART_TYPE_HINTS).map(([type, hint]) => (
              <SelectItem key={type} value={type} className="text-sm">
                {hint.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* violin은 ECharts 미지원 → box plot으로 렌더링됨 */}
        {chartSpec.chartType === 'violin' && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            현재 박스 플롯으로 표시됩니다 (ECharts 제한)
          </p>
        )}
      </div>

      {/* X축 */}
      <div className="space-y-1.5">
        <Label className="text-xs">X축 필드</Label>
        <Select value={chartSpec.encoding.x.field} onValueChange={handleXFieldChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columns.map(col => {
              const isUsedByY = col.name === chartSpec.encoding.y.field;
              return (
                <SelectItem
                  key={col.name}
                  value={col.name}
                  className="text-sm"
                  disabled={isUsedByY}
                >
                  {col.name} ({col.type}){isUsedByY ? ' — Y축 사용 중' : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Input
          value={xTitleInput}
          onChange={(e) => setXTitleInput(e.target.value)}
          onBlur={makeAxisTitleHandler('x', xTitleInput)}
          onKeyDown={handleAxisTitleKeyDown}
          placeholder="X축 제목 (빈칸=필드명)"
          className="h-7 text-xs"
        />
      </div>

      {/* Y축 */}
      <div className="space-y-1.5">
        <Label className="text-xs">Y축 필드</Label>
        <Select value={chartSpec.encoding.y.field} onValueChange={handleYFieldChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {columns.map(col => {
              const isUsedByX = col.name === chartSpec.encoding.x.field;
              return (
                <SelectItem
                  key={col.name}
                  value={col.name}
                  className="text-sm"
                  disabled={isUsedByX}
                >
                  {col.name} ({col.type}){isUsedByX ? ' — X축 사용 중' : ''}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Input
          value={yTitleInput}
          onChange={(e) => setYTitleInput(e.target.value)}
          onBlur={makeAxisTitleHandler('y', yTitleInput)}
          onKeyDown={handleAxisTitleKeyDown}
          placeholder="Y축 제목 (빈칸=필드명)"
          className="h-7 text-xs"
        />
        {/* 로그 스케일 (quantitative only) */}
        {isQuantitativeY && (
          <div className="flex items-center justify-between pt-0.5">
            <Label htmlFor="log-scale" className="text-xs cursor-pointer">로그 스케일</Label>
            <Switch
              id="log-scale"
              checked={isLogScale}
              onCheckedChange={handleLogScaleToggle}
            />
          </div>
        )}
        {/* Y축 범위 (quantitative only) */}
        {isQuantitativeY && (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Y축 범위 (빈칸=자동)</Label>
            <div className="flex gap-1.5">
              <Input
                value={yMinInput}
                onChange={(e) => setYMinInput(e.target.value)}
                onBlur={handleYRangeBlur}
                placeholder="최솟값"
                className="h-7 text-xs"
                type="number"
              />
              <Input
                value={yMaxInput}
                onChange={(e) => setYMaxInput(e.target.value)}
                onBlur={handleYRangeBlur}
                placeholder="최댓값"
                className="h-7 text-xs"
                type="number"
              />
            </div>
          </div>
        )}
      </div>

      {/* 에러바 (bar / line / error-bar 차트만) */}
      {showErrorBar && (
        <div className="space-y-1.5">
          <Label className="text-xs">에러바</Label>
          <Select
            value={chartSpec.errorBar?.type ?? 'none'}
            onValueChange={handleErrorBarTypeChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="없음" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-sm">없음</SelectItem>
              <SelectItem value="stderr" className="text-sm">SEM (표준오차)</SelectItem>
              <SelectItem value="stdev" className="text-sm">SD (표준편차)</SelectItem>
              <SelectItem value="ci" className="text-sm">신뢰구간 (CI)</SelectItem>
              <SelectItem value="iqr" className="text-sm">IQR (사분위 범위)</SelectItem>
            </SelectContent>
          </Select>
          {/* CI 수준 — ci 유형 선택 시만 표시 */}
          {chartSpec.errorBar?.type === 'ci' && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">신뢰 수준</Label>
              <Select
                value={String(chartSpec.errorBar.value ?? 95)}
                onValueChange={handleCiValueChange}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90" className="text-sm">90%</SelectItem>
                  <SelectItem value="95" className="text-sm">95% (권장)</SelectItem>
                  <SelectItem value="99" className="text-sm">99%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* 범례 위치 (color encoding 있을 때만) */}
      {showLegend && (
        <div className="space-y-1.5">
          <Label className="text-xs">범례 위치</Label>
          <Select
            value={chartSpec.encoding.color?.legend?.orient ?? 'top'}
            onValueChange={handleLegendOrientChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top" className="text-sm">위</SelectItem>
              <SelectItem value="right" className="text-sm">오른쪽</SelectItem>
              <SelectItem value="bottom" className="text-sm">아래</SelectItem>
              <SelectItem value="left" className="text-sm">왼쪽</SelectItem>
              <SelectItem value="none" className="text-sm">숨김</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
