'use client';

/**
 * 스타일 탭 — 시각적 표현 (어떻게 보일?)
 *
 * Y축 범위·로그 스케일·X축 범위·범례 위치·학술 스타일 프리셋.
 * 모든 상태/핸들러는 useStyleTabLogic 훅에서 관리. (G5.2)
 */

import { useState, useCallback, useEffect } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import {
  useStyleTabLogic,
  FONT_OPTIONS,
  PRESET_LIST,
} from '@/lib/graph-studio/useStyleTabLogic';
import {
  deleteTemplate,
  GRAPH_STYLE_TEMPLATES_CHANGED_EVENT,
  loadTemplates,
  saveTemplate,
  STYLE_TEMPLATE_CATEGORIES,
  STYLE_TEMPLATE_CATEGORY_LABELS,
  templateMatchesChartSpec,
} from '@/lib/graph-studio/style-template-storage';
import type {
  StyleTemplate,
  StyleTemplateCategory,
} from '@/lib/graph-studio/style-template-storage';
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
import { Check, ChevronDown, ChevronUp, Pencil, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { TOAST } from '@/lib/constants/toast-messages';
import { STORAGE_KEYS } from '@/lib/constants/storage-keys';

export function StyleTab(): React.ReactElement {
  const chartSpec = useGraphStudioStore(state => state.chartSpec);
  const updateChartSpec = useGraphStudioStore(state => state.updateChartSpec);
  const setExportConfig = useGraphStudioStore(state => state.setExportConfig);
  const logic = useStyleTabLogic();

  const [showTemplateInput, setShowTemplateInput] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateCategory, setTemplateCategory] = useState<StyleTemplateCategory>('institution');
  const [templates, setTemplates] = useState<StyleTemplate[]>(() => loadTemplates());
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState('');
  const [editingTemplateCategory, setEditingTemplateCategory] = useState<StyleTemplateCategory>('institution');
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);

  const refreshTemplates = useCallback(() => {
    setTemplates(loadTemplates());
  }, []);

  useEffect(() => {
    refreshTemplates();
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== null && event.key !== STORAGE_KEYS.graphStudio.styleTemplates) return;
      refreshTemplates();
    };
    window.addEventListener(GRAPH_STYLE_TEMPLATES_CHANGED_EVENT, refreshTemplates);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(GRAPH_STYLE_TEMPLATES_CHANGED_EVENT, refreshTemplates);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshTemplates]);

  useEffect(() => {
    if (editingTemplateId === null) return;
    if (templates.some((template) => template.id === editingTemplateId)) return;
    setEditingTemplateId(null);
    setEditingTemplateName('');
    setEditingTemplateCategory('institution');
  }, [editingTemplateId, templates]);

  useEffect(() => {
    if (templates.length > 0) return;
    setShowTemplateLibrary(false);
  }, [templates.length]);

  const handleSaveTemplate = useCallback(() => {
    if (!chartSpec || !templateName.trim()) return;
    const savedName = templateName.trim();
    const now = new Date().toISOString();
    const nextTemplate: StyleTemplate = {
      id: `tmpl-${Date.now()}`,
      name: savedName,
      category: templateCategory,
      style: { ...chartSpec.style },
      exportConfig: {
        dpi: chartSpec.exportConfig.dpi,
        ...(chartSpec.exportConfig.physicalWidth !== undefined && { physicalWidth: chartSpec.exportConfig.physicalWidth }),
        ...(chartSpec.exportConfig.physicalHeight !== undefined && { physicalHeight: chartSpec.exportConfig.physicalHeight }),
      },
      createdAt: now,
      updatedAt: now,
    };
    try {
      saveTemplate(nextTemplate);
      refreshTemplates();
      toast.success(TOAST.graphStudio.templateSaved(savedName));
    } catch {
      toast.error(TOAST.graphStudio.templateSaveError);
      return;
    }
    setTemplateName('');
    setTemplateCategory('institution');
    setShowTemplateInput(false);
  }, [chartSpec, refreshTemplates, templateCategory, templateName]);

  const handleApplyTemplate = useCallback((template: StyleTemplate) => {
    if (!chartSpec) return;
    setEditingTemplateId(null);
    updateChartSpec({
      ...chartSpec,
      style: { ...template.style },
    });
    setExportConfig({
      format: chartSpec.exportConfig.format,
      dpi: template.exportConfig.dpi,
      ...(chartSpec.exportConfig.transparentBackground !== undefined && {
        transparentBackground: chartSpec.exportConfig.transparentBackground,
      }),
      ...(template.exportConfig.physicalWidth !== undefined && {
        physicalWidth: template.exportConfig.physicalWidth,
      }),
      ...(template.exportConfig.physicalHeight !== undefined && {
        physicalHeight: template.exportConfig.physicalHeight,
      }),
    });
  }, [chartSpec, setExportConfig, updateChartSpec]);

  const handleStartTemplateEdit = useCallback((template: StyleTemplate) => {
    setEditingTemplateId(template.id);
    setEditingTemplateName(template.name);
    setEditingTemplateCategory(template.category);
  }, []);

  const handleCommitTemplateEdit = useCallback((template: StyleTemplate) => {
    const savedName = editingTemplateName.trim();
    if (!savedName) return;

    try {
      saveTemplate({
        ...template,
        name: savedName,
        category: editingTemplateCategory,
        updatedAt: new Date().toISOString(),
      });
      refreshTemplates();
      setEditingTemplateId(null);
      setEditingTemplateName('');
      setEditingTemplateCategory('institution');
      toast.success(TOAST.graphStudio.templateSaved(savedName));
    } catch {
      toast.error(TOAST.graphStudio.templateSaveError);
    }
  }, [editingTemplateCategory, editingTemplateName, refreshTemplates]);

  const handleCancelTemplateEdit = useCallback(() => {
    setEditingTemplateId(null);
    setEditingTemplateName('');
    setEditingTemplateCategory('institution');
  }, []);

  const handleDeleteTemplate = useCallback((id: string) => {
    const targetTemplate = templates.find((template) => template.id === id);
    if (!window.confirm(`"${targetTemplate?.name ?? '템플릿'}" 을(를) 삭제하시겠습니까?`)) {
      return;
    }
    deleteTemplate(id);
    refreshTemplates();
    if (editingTemplateId === id) {
      setEditingTemplateId(null);
      setEditingTemplateName('');
      setEditingTemplateCategory('institution');
    }
  }, [editingTemplateId, refreshTemplates, templates]);

  const activeTemplate = chartSpec
    ? templates.find((template) => templateMatchesChartSpec(template, chartSpec)) ?? null
    : null;

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
            <SelectTrigger
              className="h-8 text-sm"
              data-testid="graph-studio-legend-orient-trigger"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="top" className="text-sm" data-testid="graph-studio-legend-orient-top">위</SelectItem>
              <SelectItem value="right" className="text-sm" data-testid="graph-studio-legend-orient-right">오른쪽</SelectItem>
              <SelectItem value="bottom" className="text-sm" data-testid="graph-studio-legend-orient-bottom">아래</SelectItem>
              <SelectItem value="left" className="text-sm" data-testid="graph-studio-legend-orient-left">왼쪽</SelectItem>
              <SelectItem value="none" className="text-sm" data-testid="graph-studio-legend-orient-none">숨김</SelectItem>
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
              data-testid="graph-studio-title-size-input"
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

      {/* 템플릿 */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <Label className="text-xs">템플릿</Label>
            <p className="text-[11px] text-muted-foreground">
              현재 스타일을 저장하거나, 필요할 때 저장된 템플릿을 열어 적용하세요.
            </p>
          </div>
          {templates.length > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setShowTemplateLibrary(prev => !prev)}
              data-testid="style-tab-template-library-toggle"
            >
              {showTemplateLibrary ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showTemplateLibrary ? '관리 닫기' : `관리 보기 (${templates.length})`}
            </Button>
          )}
        </div>

        <div
          className="rounded-2xl bg-surface-container-low px-3 py-2"
          data-testid="style-tab-active-template"
        >
          {activeTemplate ? (
            <div className="space-y-0.5">
              <p className="text-xs font-medium">{activeTemplate.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {STYLE_TEMPLATE_CATEGORY_LABELS[activeTemplate.category]} | {activeTemplate.style.preset} | {activeTemplate.exportConfig.dpi} DPI
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs font-medium">직접 편집 중</p>
              <p className="text-[11px] text-muted-foreground">
                저장된 템플릿과 정확히 일치하지 않는 현재 스타일입니다.
              </p>
            </div>
          )}
        </div>

        {showTemplateInput ? (
          <div className="space-y-1.5">
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplate(); }}
              placeholder="템플릿 이름 (예: Nature 투고용)"
              className="h-7 text-xs flex-1"
              autoFocus
              data-testid="style-tab-template-name-input"
            />
            <Label className="text-xs text-muted-foreground">템플릿 분류</Label>
            <Select
              value={templateCategory}
              onValueChange={(value) => setTemplateCategory(value as StyleTemplateCategory)}
            >
              <SelectTrigger
                className="h-7 text-xs"
                data-testid="style-tab-template-category-trigger"
                aria-label="템플릿 분류"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STYLE_TEMPLATE_CATEGORIES.map((value) => (
                  <SelectItem key={value} value={value} className="text-sm">
                    {STYLE_TEMPLATE_CATEGORY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-1.5">
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
                onClick={() => { setShowTemplateInput(false); setTemplateName(''); setTemplateCategory('institution'); }}
              >
                취소
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              템플릿에는 스타일, DPI, 출력 크기만 저장됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-1"
              onClick={() => setShowTemplateInput(true)}
              data-testid="style-tab-save-template-btn"
            >
              <Save className="h-3 w-3" />
              현재 스타일 저장
            </Button>
            <p className="text-[11px] text-muted-foreground">
              템플릿에는 스타일, DPI, 출력 크기만 저장됩니다.
            </p>
          </div>
        )}

        {templates.length > 0 && showTemplateLibrary && (
          <div className="space-y-1.5 pt-1">
            {templates.map((template) => {
              const categoryLabel = STYLE_TEMPLATE_CATEGORY_LABELS[template.category];
              const isActive = templateMatchesChartSpec(template, chartSpec);
              const sizeLabel =
                template.exportConfig.physicalWidth && template.exportConfig.physicalHeight
                  ? `${template.exportConfig.physicalWidth} x ${template.exportConfig.physicalHeight} mm`
                  : null;
              const isEditing = editingTemplateId === template.id;

              return (
                <div
                  key={template.id}
                  className={[
                    'flex items-start gap-2 rounded-md px-2 py-2',
                    isActive ? 'bg-surface-container-highest' : 'bg-surface-container-low',
                  ].join(' ')}
                  data-testid={`style-tab-template-${template.id}`}
                >
                  {isEditing ? (
                    <>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <Input
                          value={editingTemplateName}
                          onChange={(e) => setEditingTemplateName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCommitTemplateEdit(template);
                            }
                          }}
                          className="h-7 text-xs"
                          data-testid={`style-tab-template-edit-name-${template.id}`}
                        />
                        <Label className="text-xs text-muted-foreground">템플릿 분류</Label>
                        <Select
                          value={editingTemplateCategory}
                          onValueChange={(value) => setEditingTemplateCategory(value as StyleTemplateCategory)}
                        >
                          <SelectTrigger
                            className="h-7 text-xs"
                            data-testid={`style-tab-template-edit-category-trigger-${template.id}`}
                            aria-label={`${template.name} 템플릿 분류`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STYLE_TEMPLATE_CATEGORIES.map((value) => (
                              <SelectItem key={value} value={value} className="text-sm">
                                {STYLE_TEMPLATE_CATEGORY_LABELS[value]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 w-7 px-0"
                          onClick={() => handleCommitTemplateEdit(template)}
                          disabled={!editingTemplateName.trim()}
                          aria-label={`${template.name} 이름 저장`}
                          data-testid={`style-tab-template-edit-save-${template.id}`}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 px-0"
                          onClick={handleCancelTemplateEdit}
                          aria-label={`${template.name} 이름 변경 취소`}
                          data-testid={`style-tab-template-edit-cancel-${template.id}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => handleApplyTemplate(template)}
                        data-testid={`style-tab-template-apply-${template.id}`}
                      >
                        <div className="flex items-center gap-2">
                          <div className="truncate text-xs font-medium">{template.name}</div>
                          <span className="shrink-0 rounded-full bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {categoryLabel}
                          </span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {template.style.preset} | {template.exportConfig.dpi} DPI
                          {sizeLabel ? ` | ${sizeLabel}` : ''}
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 px-0"
                          onClick={() => handleStartTemplateEdit(template)}
                          aria-label={`${template.name} 이름 변경`}
                          data-testid={`style-tab-template-edit-${template.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 px-0"
                          onClick={() => handleDeleteTemplate(template.id)}
                          aria-label={`${template.name} 삭제`}
                          data-testid={`style-tab-template-delete-${template.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
