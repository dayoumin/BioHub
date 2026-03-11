'use client';

/**
 * 스타일 탭 — 시각적 표현 (어떻게 보일?)
 *
 * Y축 범위·로그 스케일·X축 범위·범례 위치·학술 스타일 프리셋.
 * 모든 상태/핸들러는 useStyleTabLogic 훅에서 관리. (G5.2)
 */

import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import {
  useStyleTabLogic,
  FONT_OPTIONS,
  PRESET_LIST,
} from '@/lib/graph-studio/useStyleTabLogic';
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

export function StyleTab(): React.ReactElement {
  const chartSpec = useGraphStudioStore(state => state.chartSpec);
  const logic = useStyleTabLogic();

  if (!chartSpec || !logic) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  const {
    yMinInput, setYMinInput, yMaxInput, setYMaxInput,
    xMinInput, setXMinInput, xMaxInput, setXMaxInput,
    customLabelDraft,
    handleLogScaleToggle, handleYRangeBlur, handleXRangeBlur,
    handleLegendOrientChange, handleDataLabelsToggle, handleSampleCountsToggle,
    handleCustomLabelChange, commitCustomLabels,
    handleFontChange, handleApplyPreset,
    isQuantitativeY, isQuantitativeX, isLogScale, currentFont,
    showLegend, showDataLabelOption, showSampleCountOption, colorGroups,
  } = logic;

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

      {/* 범례 레이블 편집 (B2) — color encoding + 그룹 있을 때 */}
      {showLegend && colorGroups.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">범례 레이블 편집</Label>
          <div className="space-y-1">
            {colorGroups.map(raw => (
              <div key={raw} className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground w-20 truncate shrink-0" title={raw}>
                  {raw}
                </span>
                <Input
                  value={customLabelDraft[raw] ?? ''}
                  onChange={(e) => handleCustomLabelChange(raw, e.target.value)}
                  onBlur={commitCustomLabels}
                  placeholder={raw}
                  className="h-6 text-xs"
                />
              </div>
            ))}
          </div>
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

      {/* n= 표본 수 표기 (B1) — bar/grouped-bar/stacked-bar/error-bar */}
      {showSampleCountOption && (
        <div className="flex items-center justify-between">
          <Label htmlFor="sample-counts" className="text-xs cursor-pointer">
            n= 표본 수 표기
          </Label>
          <Switch
            id="sample-counts"
            checked={chartSpec.style.showSampleCounts ?? false}
            onCheckedChange={handleSampleCountsToggle}
          />
        </div>
      )}

      {/* 폰트 선택 */}
      <div className="space-y-1.5">
        <Label className="text-xs">폰트</Label>
        <Select value={currentFont} onValueChange={handleFontChange}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
