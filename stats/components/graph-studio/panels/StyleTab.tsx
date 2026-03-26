'use client';

/**
 * 스타일 탭 — 시각적 표현 (어떻게 보일?)
 *
 * Y축 범위·로그 스케일·X축 범위·범례 위치·학술 스타일 프리셋.
 * 모든 상태/핸들러는 useStyleTabLogic 훅에서 관리. (G5.2)
 */

import { useState, useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import {
  useStyleTabLogic,
  FONT_OPTIONS,
  PRESET_LIST,
} from '@/lib/graph-studio/useStyleTabLogic';
import { saveTemplate } from '@/lib/graph-studio/style-template-storage';
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
import { Check, Save } from 'lucide-react';
import { toast } from 'sonner';
import { TOAST } from '@/lib/constants/toast-messages';

export function StyleTab(): React.ReactElement {
  const chartSpec = useGraphStudioStore(state => state.chartSpec);
  const logic = useStyleTabLogic();

  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const handleSaveTemplate = useCallback(() => {
    if (!chartSpec || !templateName.trim()) return;
    const now = new Date().toISOString();
    try {
      saveTemplate({
        id: `tmpl-${Date.now()}`,
        name: templateName.trim(),
        style: { ...chartSpec.style },
        exportConfig: { ...chartSpec.exportConfig },
        createdAt: now,
        updatedAt: now,
      });
      toast.success(TOAST.graphStudio.templateSaved(templateName.trim()));
    } catch {
      toast.error(TOAST.graphStudio.templateSaveError);
      return;
    }
    setTemplateName('');
    setShowTemplateInput(false);
  }, [chartSpec, templateName]);

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
    handleFontChange, handleApplyPreset, handleBackgroundChange,
    handleFontSizeChange, handleSortChange, handleColorChange, handleResetColors,
    currentTitleSize, currentAxisTitleSize, currentLabelSize, currentFontSize, currentSort, isCategoryX, currentColors,
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

      {/* X축 카테고리 정렬 (nominal/ordinal X만) */}
      {isCategoryX && (
        <div className="space-y-1.5">
          <Label className="text-xs">X축 정렬</Label>
          <Select
            value={currentSort ?? 'none'}
            onValueChange={(v) => handleSortChange(v === 'none' ? null : v as 'ascending' | 'descending')}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-sm">원본 순서</SelectItem>
              <SelectItem value="ascending" className="text-sm">오름차순 (A→Z)</SelectItem>
              <SelectItem value="descending" className="text-sm">내림차순 (Z→A)</SelectItem>
            </SelectContent>
          </Select>
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

      {/* 글꼴 크기 개별 조정 */}
      <div className="space-y-1.5">
        <Label className="text-xs">글꼴 크기</Label>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-16 shrink-0">차트 제목</span>
            <Input
              type="number"
              value={currentTitleSize}
              onChange={(e) => handleFontSizeChange('titleSize', parseInt(e.target.value, 10))}
              className="h-6 text-xs w-16"
              min={6} max={36}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-16 shrink-0">축 제목</span>
            <Input
              type="number"
              value={currentAxisTitleSize}
              onChange={(e) => handleFontSizeChange('axisTitleSize', parseInt(e.target.value, 10))}
              className="h-6 text-xs w-16"
              min={6} max={36}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-16 shrink-0">눈금 라벨</span>
            <Input
              type="number"
              value={currentLabelSize}
              onChange={(e) => handleFontSizeChange('labelSize', parseInt(e.target.value, 10))}
              className="h-6 text-xs w-16"
              min={6} max={36}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground w-16 shrink-0">기본 텍스트</span>
            <Input
              type="number"
              value={currentFontSize}
              onChange={(e) => handleFontSizeChange('size', parseInt(e.target.value, 10))}
              className="h-6 text-xs w-16"
              min={6} max={36}
            />
            <span className="text-xs text-muted-foreground">px</span>
          </div>
        </div>
      </div>

      {/* 배경색 */}
      <div className="space-y-1.5">
        <Label className="text-xs">배경색</Label>
        <div className="flex gap-1.5 items-center">
          <Input
            type="color"
            value={chartSpec.style.background ?? '#ffffff'}
            onChange={(e) => handleBackgroundChange(e.target.value)}
            className="h-7 w-10 p-0.5 cursor-pointer"
          />
          <Input
            value={chartSpec.style.background ?? ''}
            onChange={(e) => handleBackgroundChange(e.target.value)}
            placeholder="#ffffff"
            className="h-7 text-xs flex-1"
          />
          {chartSpec.style.background && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => handleBackgroundChange('')}
            >
              초기화
            </Button>
          )}
        </div>
      </div>

      {/* 시리즈 색상 개별 지정 */}
      {currentColors.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">시리즈 색상</Label>
            {chartSpec.style.colors && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-xs"
                onClick={handleResetColors}
              >
                초기화
              </Button>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex gap-1 flex-wrap">
              {currentColors.slice(0, 8).map((color, i) => (
                <Input
                  key={i}
                  type="color"
                  value={color}
                  onChange={(e) => handleColorChange(i, e.target.value)}
                  className="h-7 w-7 p-0.5 cursor-pointer rounded"
                  title={`색상 ${i + 1}: ${color}`}
                />
              ))}
            </div>
            <div className="flex gap-1 flex-wrap">
              {currentColors.slice(0, 8).map((color, i) => (
                <button
                  key={i}
                  type="button"
                  className="text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer select-all"
                  title="클릭하여 복사"
                  onClick={() => {
                    void navigator.clipboard.writeText(color);
                    toast.success(TOAST.graphStudio.colorCopied(color));
                  }}
                >
                  {color}
                </button>
              ))}
            </div>
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

      {/* 템플릿으로 저장 */}
      <div className="space-y-1.5 pt-2 border-t border-border">
        {showTemplateInput ? (
          <div className="flex gap-1.5">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); }}
              placeholder="템플릿 이름 (예: Nature 투고용)"
              className="h-7 text-xs flex-1"
              autoFocus
              data-testid="style-tab-template-name-input"
            />
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleSaveTemplate}
              disabled={!templateName.trim()}
            >
              저장
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => { setShowTemplateInput(false); setTemplateName(''); }}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1"
            onClick={() => setShowTemplateInput(true)}
            data-testid="style-tab-save-template-btn"
          >
            <Save className="h-3 w-3" />
            템플릿으로 저장
          </Button>
        )}
      </div>
    </div>
  );
}
