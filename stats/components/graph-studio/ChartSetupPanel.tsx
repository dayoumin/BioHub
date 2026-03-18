'use client';

/**
 * 차트 설정 패널 — Step 2 (데이터 로드 후, 에디터 진입 전)
 *
 * - 데이터 요약 (파일명, 행/변수)
 * - 12개 차트 유형 카테고리별 그리드 + 데이터 기반 추천
 * - X/Y 필드 매핑 + 색상 그룹
 * - 학술 스타일 프리셋 선택
 * - "차트 만들기" CTA + "뒤로" 버튼
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Database, Sparkles, X } from 'lucide-react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import { createDefaultChartSpec, CHART_TYPE_HINTS, STYLE_PRESETS } from '@/lib/graph-studio/chart-spec-defaults';
import { CHART_TYPE_ICONS } from '@/lib/graph-studio/chart-icons';
import { loadTemplates, deleteTemplate } from '@/lib/graph-studio/style-template-storage';
import { StepIndicator } from '@/components/graph-studio/StepIndicator';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { ChartType, ColumnMeta, StylePreset } from '@/types/graph-studio';
import type { StyleTemplate } from '@/lib/graph-studio/style-template-storage';

// ─── 차트 유형 카테고리 ──────────────────────────────────

interface ChartCategory {
  label: string;
  types: ChartType[];
}

const CHART_CATEGORIES: ChartCategory[] = [
  { label: '비교', types: ['bar', 'grouped-bar', 'stacked-bar', 'error-bar'] },
  { label: '분포', types: ['histogram', 'boxplot', 'violin'] },
  { label: '관계', types: ['scatter', 'line', 'heatmap'] },
  { label: '특수', types: ['km-curve', 'roc-curve'] },
];

// ─── 스타일 프리셋 옵션 ──────────────────────────────────

const PRESET_OPTIONS: { key: StylePreset; label: string; desc: string }[] = [
  { key: 'default',   label: 'Default',   desc: '깔끔한 기본 (Arial, 컬러)' },
  { key: 'science',   label: 'Science',   desc: 'Nature/Science 유사' },
  { key: 'ieee',      label: 'IEEE',      desc: 'IEEE 학회 (흑백, 작은 폰트)' },
  { key: 'grayscale', label: 'Grayscale', desc: '흑백 인쇄 전용' },
];

// ─── 추천 차트 유형 판단 ─────────────────────────────────

function getRecommendedTypes(columns: ColumnMeta[]): Set<ChartType> {
  const hasNominal = columns.some(c => c.type === 'nominal' || c.type === 'ordinal');
  const hasTemporal = columns.some(c => c.type === 'temporal');
  const quantCount = columns.filter(c => c.type === 'quantitative').length;
  const nominalCount = columns.filter(c => c.type === 'nominal' || c.type === 'ordinal').length;

  const recommended = new Set<ChartType>();

  if (hasNominal && quantCount >= 1) {
    recommended.add('bar');
    recommended.add('boxplot');
    recommended.add('violin');
    recommended.add('error-bar');
  }
  if (hasNominal && quantCount >= 1 && nominalCount >= 2) {
    recommended.add('grouped-bar');
    recommended.add('stacked-bar');
    recommended.add('heatmap');
  }
  if (quantCount >= 2) {
    recommended.add('scatter');
  }
  if (quantCount >= 1) {
    recommended.add('histogram');
  }
  if (hasTemporal && quantCount >= 1) {
    recommended.add('line');
  }

  // 최소 bar는 항상 추천
  if (recommended.size === 0) recommended.add('bar');

  return recommended;
}

// ─── 메인 컴포넌트 ─────────────────────────────────────

export function ChartSetupPanel(): React.ReactElement {
  const dataPackage = useGraphStudioStore(state => state.dataPackage);
  const loadDataPackageWithSpec = useGraphStudioStore(state => state.loadDataPackageWithSpec);
  const clearData = useGraphStudioStore(state => state.clearData);
  const previousSpec = useGraphStudioStore(state => state.previousChartSpec);
  const storePendingTemplateId = useGraphStudioStore(state => state.pendingTemplateId);
  const setPendingTemplateId = useGraphStudioStore(state => state.setPendingTemplateId);

  const columns = dataPackage?.columns ?? [];
  const rowCount = dataPackage
    ? (Object.values(dataPackage.data)[0]?.length ?? 0)
    : 0;

  // ── 로컬 상태 ────────────────────────────────────────
  const recommended = useMemo(() => getRecommendedTypes(columns), [columns]);
  const defaultType: ChartType = recommended.has('bar') ? 'bar' : recommended.values().next().value ?? 'bar';

  const [selectedType, setSelectedType] = useState<ChartType>(previousSpec?.chartType ?? defaultType);
  const [selectedPreset, setSelectedPreset] = useState<StylePreset>(previousSpec?.style.preset ?? 'default');

  // 선택된 차트 유형에 맞는 기본 X/Y 필드
  const defaultFields = useMemo(() => {
    if (columns.length === 0) return { xField: '', yField: '' };
    return selectXYFields(columns, CHART_TYPE_HINTS[selectedType]);
  }, [columns, selectedType]);

  // previousSpec 필드 복원: 같은 데이터이므로 이전 인코딩 필드가 현재 컬럼에 있으면 사용
  const colNames = useMemo(() => new Set(columns.map(c => c.name)), [columns]);
  const prevXField = previousSpec?.encoding.x?.field;
  const prevYField = previousSpec?.encoding.y?.field;
  const prevColorField = previousSpec?.encoding.color?.field;

  const [xField, setXField] = useState<string>(
    prevXField && colNames.has(prevXField) ? prevXField : defaultFields.xField,
  );
  const [yField, setYField] = useState<string>(
    prevYField && colNames.has(prevYField) ? prevYField : defaultFields.yField,
  );
  const [colorField, setColorField] = useState<string>(
    prevColorField && colNames.has(prevColorField) ? prevColorField : 'none',
  );

  // ── 스타일 템플릿 ─────────────────────────────────────
  const [templates, setTemplates] = useState<StyleTemplate[]>(() => loadTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(storePendingTemplateId);

  // Step 1에서 미리 선택한 템플릿이 있으면 프리셋도 동기화 + 스토어에서 소비
  useEffect(() => {
    if (!storePendingTemplateId) return;
    const tmpl = templates.find(t => t.id === storePendingTemplateId);
    if (tmpl) {
      setSelectedTemplateId(tmpl.id);
      setSelectedPreset(tmpl.style.preset);
    }
    setPendingTemplateId(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- mount 시 1회만

  const handleSelectTemplate = useCallback((template: StyleTemplate) => {
    setSelectedTemplateId(template.id);
    setSelectedPreset(template.style.preset);
  }, []);

  const handleDeleteTemplate = useCallback((id: string) => {
    const tmpl = templates.find(t => t.id === id);
    if (!window.confirm(`"${tmpl?.name ?? '템플릿'}" 을(를) 삭제하시겠습니까?`)) return;
    deleteTemplate(id);
    setTemplates(loadTemplates());
    if (selectedTemplateId === id) {
      setSelectedTemplateId(null);
    }
  }, [selectedTemplateId, templates]);

  // 차트 유형 변경 시 필드 자동 업데이트
  const handleChartTypeSelect = useCallback((type: ChartType) => {
    setSelectedType(type);
    const fields = selectXYFields(columns, CHART_TYPE_HINTS[type]);
    setXField(fields.xField);
    setYField(fields.yField);
    setColorField('none');
  }, [columns]);

  // ── "차트 만들기" ────────────────────────────────────
  const handleCreate = useCallback(() => {
    if (!dataPackage) return;

    const spec = createDefaultChartSpec(
      dataPackage.id,
      selectedType,
      xField,
      yField,
      columns,
    );

    // 스타일 적용: 템플릿 > 프리셋
    const selectedTemplate = selectedTemplateId
      ? templates.find(t => t.id === selectedTemplateId)
      : null;

    if (selectedTemplate) {
      spec.style = { ...selectedTemplate.style };
      spec.exportConfig = { ...selectedTemplate.exportConfig };
    } else if (selectedPreset !== 'default') {
      spec.style = { ...STYLE_PRESETS[selectedPreset] };
    }

    // 색상 그룹 적용
    if (colorField !== 'none') {
      const col = columns.find(c => c.name === colorField);
      if (col) {
        spec.encoding.color = { field: colorField, type: col.type };
      }
    }

    // line/scatter: nominal 컬럼 자동 color
    if ((selectedType === 'line' || selectedType === 'scatter') && colorField === 'none') {
      const nominalCol = columns.find(
        c => c.type === 'nominal' && c.name !== xField && c.name !== yField,
      );
      if (nominalCol) {
        spec.encoding.color = { field: nominalCol.name, type: 'nominal' };
      }
    }

    loadDataPackageWithSpec(dataPackage, spec);
  }, [dataPackage, selectedType, xField, yField, colorField, selectedPreset, selectedTemplateId, templates, columns, loadDataPackageWithSpec]);

  // ── "뒤로" ───────────────────────────────────────────
  const handleBack = useCallback(() => {
    clearData();
  }, [clearData]);

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* 스텝 인디케이터 + 뒤로 + 제목 */}
      <div>
        <div className="mb-4">
          <StepIndicator currentStep={1} />
        </div>
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          데이터 다시 선택
        </button>
        <h2 className="text-2xl font-bold tracking-tight">차트 설정</h2>
      </div>

      {/* 데이터 요약 카드 */}
      {dataPackage && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
          <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Database className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{dataPackage.label}</p>
            <p className="text-xs text-muted-foreground">
              {columns.length}개 변수 · {rowCount}행
            </p>
          </div>
          <div className="flex gap-1 flex-wrap">
            {columns.map(col => (
              <span key={col.name} className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
                {col.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 차트 유형 선택 */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">차트 유형</Label>
        {CHART_CATEGORIES.map(cat => (
          <div key={cat.label} className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">{cat.label}</p>
            <div className="grid grid-cols-4 gap-2">
              {cat.types.map(type => {
                const hint = CHART_TYPE_HINTS[type];
                const Icon = CHART_TYPE_ICONS[type];
                const isSelected = selectedType === type;
                const isRecommended = recommended.has(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleChartTypeSelect(type)}
                    className={cn(
                      'relative flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all',
                      isSelected
                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                        : isRecommended
                          ? 'border-border bg-background hover:border-primary/50 hover:bg-primary/5 text-foreground'
                          : 'border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40',
                    )}
                    data-testid={`chart-setup-type-${type}`}
                  >
                    {isRecommended && !isSelected && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center">
                        <Sparkles className="h-3 w-3 text-amber-500" />
                      </span>
                    )}
                    <Icon className="h-5 w-5" />
                    <span className="font-medium leading-tight text-center">{hint.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">
          <Sparkles className="inline h-3 w-3 text-amber-500 mr-0.5" />
          데이터에 적합한 차트 유형
        </p>
      </div>

      {/* 필드 매핑 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">X축 필드</Label>
          <Select value={xField} onValueChange={setXField}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map(col => (
                <SelectItem key={col.name} value={col.name} className="text-sm" disabled={col.name === yField}>
                  {col.name} ({col.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Y축 필드</Label>
          <Select value={yField} onValueChange={setYField}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.map(col => (
                <SelectItem key={col.name} value={col.name} className="text-sm" disabled={col.name === xField}>
                  {col.name} ({col.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">색상 그룹</Label>
          <Select value={colorField} onValueChange={setColorField}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-sm">없음 (단일 색상)</SelectItem>
              {columns
                .filter(c => c.name !== xField && c.name !== yField)
                .map(col => (
                  <SelectItem key={col.name} value={col.name} className="text-sm">
                    {col.name} ({col.type})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 학술 스타일 프리셋 */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">학술 스타일</Label>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_OPTIONS.map(preset => {
            const isActive = selectedPreset === preset.key && !selectedTemplateId;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => { setSelectedPreset(preset.key); setSelectedTemplateId(null); }}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg border text-xs transition-all',
                  isActive
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                    : 'border-border hover:border-primary/50 hover:bg-primary/5',
                )}
                data-testid={`chart-setup-preset-${preset.key}`}
              >
                <span className="font-medium">{preset.label}</span>
                <span className={cn('text-[10px] leading-tight text-center', isActive ? 'text-primary/80' : 'text-muted-foreground')}>
                  {preset.desc}
                </span>
                {isActive && <Check className="h-3 w-3 mt-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 내 템플릿 (저장된 것이 있을 때만) */}
      {templates.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">내 템플릿</Label>
          <div className="grid grid-cols-2 gap-2">
            {templates.map(tmpl => {
              const isActive = selectedTemplateId === tmpl.id;
              const fontInfo = tmpl.style.font?.family ?? 'Arial';
              const dpiInfo = `${tmpl.exportConfig.dpi}dpi`;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  className={cn(
                    'relative flex flex-col items-start gap-0.5 p-3 rounded-lg border text-xs transition-all text-left',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'border-border hover:border-primary/50 hover:bg-primary/5',
                  )}
                  data-testid={`chart-setup-template-${tmpl.id}`}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tmpl.id); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); handleDeleteTemplate(tmpl.id); } }}
                    className="absolute top-1 right-1 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    aria-label={`${tmpl.name} 삭제`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                  <span className="font-medium pr-4 truncate w-full">{tmpl.name}</span>
                  <span className={cn('text-[10px] leading-tight', isActive ? 'text-primary/80' : 'text-muted-foreground')}>
                    {tmpl.style.preset} · {fontInfo} · {dpiInfo}
                  </span>
                  {isActive && <Check className="h-3 w-3 mt-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* CTA */}
      <Button
        size="lg"
        className="w-full gap-2"
        onClick={handleCreate}
        disabled={!xField || !yField}
        data-testid="chart-setup-create-btn"
      >
        차트 만들기
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
