'use client';

/**
 * 데이터 탭 — 차트 유형, 데이터 매핑 (어떤 데이터를?)
 *
 * PropertiesTab에서 분리. 스타일·출력 관련은 StyleTab 참조.
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
import { CHART_TYPE_HINTS, COLORBREWER_PALETTES } from '@/lib/graph-studio/chart-spec-defaults';
import { selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import type { ChartType, ErrorBarSpec } from '@/types/graph-studio';

/** 에러바를 지원하는 차트 유형 */
const ERROR_BAR_CHART_TYPES = new Set<ChartType>(['bar', 'line', 'error-bar']);

/** orientation(수평 막대)을 지원하는 차트 유형 */
const ORIENTATION_CHART_TYPES = new Set<ChartType>(['bar', 'grouped-bar', 'stacked-bar']);

/** 팔레트 선택 목록 */
const PALETTE_OPTIONS: { value: string; label: string }[] = [
  { value: 'none',    label: '기본 (프리셋)' },
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

export function DataTab(): React.ReactElement {
  const { chartSpec, updateChartSpec } = useGraphStudioStore();

  // ─── 로컬 입력 state (onBlur 시에만 updateChartSpec) ─────────────────────
  const [titleInput, setTitleInput] = useState(chartSpec?.title ?? '');
  const [xTitleInput, setXTitleInput] = useState(chartSpec?.encoding.x.title ?? '');
  const [yTitleInput, setYTitleInput] = useState(chartSpec?.encoding.y.title ?? '');
  const [y2TitleInput, setY2TitleInput] = useState(chartSpec?.encoding.y2?.title ?? '');

  useEffect(() => {
    setTitleInput(chartSpec?.title ?? '');
    setXTitleInput(chartSpec?.encoding.x.title ?? '');
    setYTitleInput(chartSpec?.encoding.y.title ?? '');
    setY2TitleInput(chartSpec?.encoding.y2?.title ?? '');
  }, [chartSpec?.title, chartSpec?.encoding.x.title, chartSpec?.encoding.y.title, chartSpec?.encoding.y2?.title]);

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

    const { color: _c, ...baseEncoding } = chartSpec.encoding;
    updateChartSpec({
      ...chartSpec,
      chartType: newType,
      encoding: {
        ...(hint.supportsColor ? chartSpec.encoding : baseEncoding),
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

  // ─── 색상 그룹 필드 ──────────────────────────────────────

  const handleColorFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === 'none') {
      const { color: _c, ...restEncoding } = chartSpec.encoding;
      updateChartSpec({ ...chartSpec, encoding: restEncoding });
    } else {
      const column = chartSpec.data.columns.find(c => c.name === value);
      updateChartSpec({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          color: { field: value, type: column?.type ?? 'nominal' },
        },
      });
    }
  }, [chartSpec, updateChartSpec]);

  // ─── 팔레트 (scheme) ─────────────────────────────────────

  const handleSchemeChange = useCallback((value: string) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      style: {
        ...chartSpec.style,
        scheme: value === 'none' ? undefined : value,
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── 수평 막대 (orientation) ─────────────────────────────

  const handleOrientationToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      orientation: checked ? 'horizontal' : undefined,
    });
  }, [chartSpec, updateChartSpec]);

  // ─── 회귀선 (scatter 전용) ────────────────────────────────

  const handleTrendlineToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      trendline: checked ? { type: 'linear' } : undefined,
    });
  }, [chartSpec, updateChartSpec]);

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

  // ─── 보조 Y축 (Y2) ─────────────────────────────────────────

  const handleY2FieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === 'none') {
      const { y2: _y2, ...restEncoding } = chartSpec.encoding;
      updateChartSpec({ ...chartSpec, encoding: restEncoding });
    } else {
      const col = chartSpec.data.columns.find(c => c.name === value);
      updateChartSpec({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          y2: { field: value, type: col?.type ?? 'quantitative' },
        },
      });
    }
  }, [chartSpec, updateChartSpec]);

  const handleY2TitleBlur = useCallback(() => {
    if (!chartSpec?.encoding.y2) return;
    const newTitle = y2TitleInput.trim() || undefined;
    if (newTitle !== chartSpec.encoding.y2.title) {
      updateChartSpec({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          y2: { ...chartSpec.encoding.y2, title: newTitle },
        },
      });
    }
  }, [chartSpec, y2TitleInput, updateChartSpec]);

  // ─── 패싯 (소규모 배치) ────────────────────────────────────

  const handleFacetFieldChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value === 'none') {
      const { facet: _f, ...restSpec } = chartSpec;
      updateChartSpec(restSpec);
    } else {
      updateChartSpec({
        ...chartSpec,
        facet: { field: value },
      });
    }
  }, [chartSpec, updateChartSpec]);

  // ─── 렌더 ─────────────────────────────────────────────────

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  const columns = chartSpec.data.columns;
  const hints = CHART_TYPE_HINTS[chartSpec.chartType];
  const hasY2 = !!chartSpec.encoding.y2;
  const hasFacet = !!chartSpec.facet;

  // Y2 ↔ facet 상호 배타: 하나만 노출
  const showY2 = hints.supportsY2 && !hasFacet;
  const showFacet = hints.supportsFacet && !hasY2;

  // Y2 있으면 color 그룹 비활성 (colors[1] 충돌)
  const showColorField = hints.supportsColor && !hasY2;

  // 에러바 표시 조건:
  // - bar / error-bar: 항상 표시
  // - line: 단일 선(color 그룹 없음) + 비-시계열(temporal 아님)일 때만
  //   (다중선·시계열에서는 에러바 의미가 불명확하므로 숨김)
  // - Y2 있으면 에러바 비활성
  const showErrorBar = ERROR_BAR_CHART_TYPES.has(chartSpec.chartType) && !hasY2 && (
    chartSpec.chartType !== 'line' ||
    (!chartSpec.encoding.color?.field && chartSpec.encoding.x.type !== 'temporal')
  );
  const showTrendline = chartSpec.chartType === 'scatter';

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
        <Label className="text-xs text-muted-foreground">X축 제목</Label>
        <Input
          value={xTitleInput}
          onChange={(e) => setXTitleInput(e.target.value)}
          onBlur={makeAxisTitleHandler('x', xTitleInput)}
          onKeyDown={handleAxisTitleKeyDown}
          placeholder="빈칸이면 필드명 사용"
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
        <Label className="text-xs text-muted-foreground">Y축 제목</Label>
        <Input
          value={yTitleInput}
          onChange={(e) => setYTitleInput(e.target.value)}
          onBlur={makeAxisTitleHandler('y', yTitleInput)}
          onKeyDown={handleAxisTitleKeyDown}
          placeholder="빈칸이면 필드명 사용"
          className="h-7 text-xs"
        />
      </div>

      {/* 보조 Y축 (이중 Y축, bar/line만) */}
      {showY2 && (
        <div className="space-y-1.5">
          <Label className="text-xs">보조 Y축 (오른쪽)</Label>
          <Select
            value={chartSpec.encoding.y2?.field ?? 'none'}
            onValueChange={handleY2FieldChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="없음 (단일 Y축)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-sm">없음 (단일 Y축)</SelectItem>
              {columns
                .filter(c =>
                  c.type === 'quantitative' &&
                  c.name !== chartSpec.encoding.x.field &&
                  c.name !== chartSpec.encoding.y.field
                )
                .map(col => (
                  <SelectItem key={col.name} value={col.name} className="text-sm">
                    {col.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {chartSpec.encoding.y2 && (
            <>
              <Label className="text-xs text-muted-foreground">보조 Y축 제목</Label>
              <Input
                value={y2TitleInput}
                onChange={(e) => setY2TitleInput(e.target.value)}
                onBlur={handleY2TitleBlur}
                onKeyDown={handleAxisTitleKeyDown}
                placeholder="빈칸이면 필드명 사용"
                className="h-7 text-xs"
              />
            </>
          )}
        </div>
      )}

      {/* 색상 그룹 필드 (supportsColor + Y2 미사용) */}
      {showColorField && (
        <div className="space-y-1.5">
          <Label className="text-xs">색상 그룹</Label>
          <Select
            value={chartSpec.encoding.color?.field ?? 'none'}
            onValueChange={handleColorFieldChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="없음 (단일 색상)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-sm">없음 (단일 색상)</SelectItem>
              {columns.map(col => {
                const isUsed = col.name === chartSpec.encoding.x.field || col.name === chartSpec.encoding.y.field;
                return (
                  <SelectItem
                    key={col.name}
                    value={col.name}
                    className="text-sm"
                    disabled={isUsed}
                  >
                    {col.name} ({col.type}){isUsed ? ' — 축 사용 중' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* 수평 막대 (bar / grouped-bar / stacked-bar만) */}
      {ORIENTATION_CHART_TYPES.has(chartSpec.chartType) && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="orientation-toggle"
              className={`text-xs ${chartSpec.errorBar ? 'text-muted-foreground cursor-not-allowed' : 'cursor-pointer'}`}
            >
              수평 막대
              {chartSpec.errorBar && <span className="ml-1 text-xs">(에러바와 함께 사용 불가)</span>}
            </Label>
            <Switch
              id="orientation-toggle"
              checked={chartSpec.orientation === 'horizontal'}
              onCheckedChange={handleOrientationToggle}
              disabled={!!chartSpec.errorBar}
            />
          </div>
        </div>
      )}

      {/* 색상 팔레트 */}
      <div className="space-y-1.5">
        <Label className="text-xs">색상 팔레트</Label>
        <Select
          value={chartSpec.style.scheme ?? 'none'}
          onValueChange={handleSchemeChange}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PALETTE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {chartSpec.style.scheme && (
          <div className="flex gap-1 mt-1">
            {(COLORBREWER_PALETTES[chartSpec.style.scheme] ?? []).slice(0, 6).map((c, i) => (
              <span
                key={i}
                className="inline-block h-3 w-3 rounded-sm border border-border"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 패싯 (소규모 배치, bar/scatter만) */}
      {showFacet && (
        <div className="space-y-1.5">
          <Label className="text-xs">패싯 (소규모 배치)</Label>
          <Select
            value={chartSpec.facet?.field ?? 'none'}
            onValueChange={handleFacetFieldChange}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="없음" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-sm">없음</SelectItem>
              {columns
                .filter(c => c.type === 'nominal' || c.type === 'ordinal')
                .map(col => (
                  <SelectItem key={col.name} value={col.name} className="text-sm">
                    {col.name} ({col.uniqueCount}개 그룹)
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {chartSpec.facet && (
            <p className="text-xs text-muted-foreground">
              최대 12개 그룹까지 표시됩니다
            </p>
          )}
        </div>
      )}

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

      {/* 회귀선 (scatter 전용) */}
      {showTrendline && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="trendline-toggle" className="text-xs cursor-pointer">
              회귀선 (선형)
            </Label>
            <Switch
              id="trendline-toggle"
              checked={!!chartSpec.trendline}
              onCheckedChange={handleTrendlineToggle}
            />
          </div>
          {chartSpec.trendline && (
            <p className="text-xs text-muted-foreground">
              R² 값은 툴팁에서 확인 가능합니다
            </p>
          )}
        </div>
      )}
    </div>
  );
}
