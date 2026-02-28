'use client';

/**
 * 스타일 탭 — 시각적 표현 (어떻게 보일?)
 *
 * Y축 범위·로그 스케일·X축 범위·범례 위치·학술 스타일 프리셋.
 * PropertiesTab에서 분리. 데이터 매핑은 DataTab 참조.
 */

import { useCallback, useState, useEffect } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check } from 'lucide-react';
import { STYLE_PRESETS } from '@/lib/graph-studio/chart-spec-defaults';
import type { ChartType, LegendSpec, StylePreset } from '@/types/graph-studio';

/** 데이터 레이블을 지원하는 차트 유형 */
const DATA_LABEL_CHART_TYPES = new Set<ChartType>(['bar', 'grouped-bar', 'stacked-bar']);

const PRESET_LIST: { key: StylePreset; label: string; description: string }[] = [
  { key: 'default',   label: 'Default',   description: '깔끔한 기본 스타일 (Arial, 컬러)' },
  { key: 'science',   label: 'Science',   description: 'Nature/Science 유사 (Times New Roman)' },
  { key: 'ieee',      label: 'IEEE',      description: 'IEEE 학회 스타일 (흑백, 작은 폰트)' },
  { key: 'grayscale', label: 'Grayscale', description: '흑백 전용 (인쇄 친화)' },
];

export function StyleTab(): React.ReactElement {
  const { chartSpec, updateChartSpec } = useGraphStudioStore();

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
  const [xMinInput, setXMinInput] = useState(
    chartSpec?.encoding.x.scale?.domain?.[0] !== undefined
      ? String(chartSpec.encoding.x.scale.domain[0])
      : '',
  );
  const [xMaxInput, setXMaxInput] = useState(
    chartSpec?.encoding.x.scale?.domain?.[1] !== undefined
      ? String(chartSpec.encoding.x.scale.domain[1])
      : '',
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

  // ─── 로그 스케일 ──────────────────────────────────────────

  const handleLogScaleToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    const currentDomain = chartSpec.encoding.y.scale?.domain;
    // 로그 스케일 활성화 시 min ≤ 0인 numeric domain은 무효 → 자동 제거 (로그(0) = -∞)
    const invalidMinForLog =
      checked &&
      typeof currentDomain?.[0] === 'number' &&
      currentDomain[0] <= 0;
    const domain = invalidMinForLog ? undefined : currentDomain;
    if (invalidMinForLog) {
      setYMinInput('');
      setYMaxInput('');
    }
    updateChartSpec({
      ...chartSpec,
      encoding: {
        ...chartSpec.encoding,
        y: {
          ...chartSpec.encoding.y,
          scale: { ...chartSpec.encoding.y.scale, type: checked ? 'log' : 'linear', domain },
        },
      },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── Y축 범위 ─────────────────────────────────────────────

  const handleYRangeBlur = useCallback(() => {
    if (!chartSpec) return;
    const min = parseFloat(yMinInput);
    const max = parseFloat(yMaxInput);
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

  // ─── X축 범위 ─────────────────────────────────────────────

  const handleXRangeBlur = useCallback(() => {
    if (!chartSpec) return;
    const min = parseFloat(xMinInput);
    const max = parseFloat(xMaxInput);
    const domain: [number, number] | undefined =
      (!isNaN(min) && !isNaN(max)) ? [min, max] : undefined;
    const currentDomain = chartSpec.encoding.x.scale?.domain;
    if (JSON.stringify(domain) !== JSON.stringify(currentDomain)) {
      updateChartSpec({
        ...chartSpec,
        encoding: {
          ...chartSpec.encoding,
          x: {
            ...chartSpec.encoding.x,
            scale: { ...chartSpec.encoding.x.scale, domain },
          },
        },
      });
    }
  }, [chartSpec, xMinInput, xMaxInput, updateChartSpec]);

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

  // ─── 데이터 레이블 ────────────────────────────────────────

  const handleDataLabelsToggle = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      style: { ...chartSpec.style, showDataLabels: checked || undefined },
    });
  }, [chartSpec, updateChartSpec]);

  // ─── 스타일 프리셋 ────────────────────────────────────────

  const handleApplyPreset = useCallback((presetKey: StylePreset) => {
    if (!chartSpec) return;
    const preset = STYLE_PRESETS[presetKey];
    updateChartSpec({ ...chartSpec, style: { ...preset } });
  }, [chartSpec, updateChartSpec]);

  // ─── 렌더 ─────────────────────────────────────────────────

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  const isQuantitativeY = chartSpec.encoding.y.type === 'quantitative';
  const isQuantitativeX = chartSpec.encoding.x.type === 'quantitative';
  const isLogScale = chartSpec.encoding.y.scale?.type === 'log';
  const showLegend = chartSpec.encoding.color !== undefined;
  const showDataLabelOption = DATA_LABEL_CHART_TYPES.has(chartSpec.chartType);

  return (
    <div className="space-y-4">
      {/* Y축 범위 + 로그 스케일 (quantitative only) */}
      {isQuantitativeY && (
        <div className="space-y-2">
          <Label className="text-xs">Y축 스케일</Label>

          <div className="flex items-center justify-between">
            <Label htmlFor="log-scale" className="text-xs cursor-pointer">로그 스케일</Label>
            <Switch
              id="log-scale"
              checked={isLogScale}
              onCheckedChange={handleLogScaleToggle}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Y축 범위</Label>
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
            {(yMinInput !== '') !== (yMaxInput !== '') && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                최솟값·최댓값을 모두 입력해야 적용됩니다.
              </p>
            )}
            {isLogScale && parseFloat(yMinInput) === 0 && (
              <p className="text-xs text-destructive">
                로그 스케일에서 최솟값 0은 사용할 수 없습니다.
              </p>
            )}
          </div>
        </div>
      )}

      {/* X축 범위 (quantitative X only — scatter 등) */}
      {isQuantitativeX && (
        <div className="space-y-2">
          <Label className="text-xs">X축 범위</Label>
          <div className="flex gap-1.5">
            <Input
              value={xMinInput}
              onChange={(e) => setXMinInput(e.target.value)}
              onBlur={handleXRangeBlur}
              placeholder="최솟값"
              className="h-7 text-xs"
              type="number"
            />
            <Input
              value={xMaxInput}
              onChange={(e) => setXMaxInput(e.target.value)}
              onBlur={handleXRangeBlur}
              placeholder="최댓값"
              className="h-7 text-xs"
              type="number"
            />
          </div>
          {(xMinInput !== '') !== (xMaxInput !== '') && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              최솟값·최댓값을 모두 입력해야 적용됩니다.
            </p>
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

      {/* 데이터 레이블 (bar 계열만) */}
      {showDataLabelOption && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="data-labels" className="text-xs cursor-pointer">막대 값 표시</Label>
            <Switch
              id="data-labels"
              checked={chartSpec.style.showDataLabels ?? false}
              onCheckedChange={handleDataLabelsToggle}
            />
          </div>
        </div>
      )}

      {/* 학술 스타일 프리셋 */}
      <div className="space-y-1.5">
        <Label className="text-xs">학술 스타일</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {PRESET_LIST.map(preset => {
            const isActive = chartSpec.style.preset === preset.key;
            return (
              <Button
                key={preset.key}
                variant={isActive ? 'default' : 'outline'}
                className="h-auto py-2 px-3 justify-between"
                onClick={() => handleApplyPreset(preset.key)}
              >
                <div className="text-left">
                  <div className="text-xs font-medium">{preset.label}</div>
                  <div className={`text-xs mt-0.5 ${isActive ? 'text-primary-foreground/90' : 'text-muted-foreground'}`}>
                    {preset.description}
                  </div>
                </div>
                {isActive && <Check className="h-3 w-3 shrink-0 ml-1" />}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
