'use client';

/**
 * 데이터 업로드 패널 — Graph Studio Step 1 (데이터 선택 전용)
 *
 * 4가지 편의 기능:
 * - F1: 최근 프로젝트 바로가기
 * - F2: 저장된 스타일 템플릿 미리 선택
 * - F3: 클립보드 붙여넣기 (엑셀 TSV)
 * - F4: 다양한 샘플 데이터 (4종)
 *
 * 차트 유형 선택은 Step 2 (ChartSetupPanel)에서 처리
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  FileSpreadsheet,
  Clock,
  Palette,
  Check,
  Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UploadDropZoneContent, uploadZoneClassName } from '@/components/common/UploadDropZone';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { inferColumnMeta } from '@/lib/graph-studio/chart-spec-utils';
import { toast } from 'sonner';
import { parseFile, parseText } from '@/lib/graph-studio/file-parser';
import { getDataSizeLevel, getRowCount } from '@/lib/graph-studio/chart-data-guard';
import { TOAST } from '@/lib/constants/toast-messages';
import { STORAGE_KEYS } from '@/lib/constants/storage-keys';
import { LargeDataBlockDialog } from './LargeDataBlockDialog';
import {
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects,
} from '@/lib/graph-studio/project-storage';
import { loadTemplates } from '@/lib/graph-studio/style-template-storage';
import { CHART_TYPE_ICONS } from '@/lib/graph-studio/chart-icons';
import { StepIndicator } from '@/components/graph-studio/StepIndicator';
import { staggerContainer, staggerItem } from '@/components/common/card-styles';
import type { DataPackage, ChartType, GraphProject } from '@/types/graph-studio';
import type { StyleTemplate } from '@/lib/graph-studio/style-template-storage';
import { formatTimeAgo } from '@/lib/utils/format-time';

// ─── 샘플 데이터 (어류 성장, 3종 × 10행) ──────────────────

const SAMPLE_ROWS: Record<string, unknown>[] = [
  { species: 'Bass',    length_cm: 12.3, weight_g:  28.5, year: '2015-01-01' },
  { species: 'Bass',    length_cm: 18.7, weight_g:  82.1, year: '2016-01-01' },
  { species: 'Bass',    length_cm: 24.1, weight_g: 178.4, year: '2017-01-01' },
  { species: 'Bass',    length_cm: 29.5, weight_g: 321.7, year: '2018-01-01' },
  { species: 'Bass',    length_cm: 33.8, weight_g: 487.2, year: '2019-01-01' },
  { species: 'Bass',    length_cm: 37.2, weight_g: 641.0, year: '2020-01-01' },
  { species: 'Bass',    length_cm: 40.1, weight_g: 782.3, year: '2021-01-01' },
  { species: 'Bass',    length_cm: 42.6, weight_g: 901.5, year: '2022-01-01' },
  { species: 'Bass',    length_cm: 44.3, weight_g: 987.4, year: '2023-01-01' },
  { species: 'Bass',    length_cm: 45.7, weight_g: 1052.8, year: '2024-01-01' },
  { species: 'Bream',   length_cm: 10.1, weight_g:  18.2, year: '2015-01-01' },
  { species: 'Bream',   length_cm: 15.4, weight_g:  55.3, year: '2016-01-01' },
  { species: 'Bream',   length_cm: 20.2, weight_g: 124.6, year: '2017-01-01' },
  { species: 'Bream',   length_cm: 24.9, weight_g: 232.1, year: '2018-01-01' },
  { species: 'Bream',   length_cm: 28.7, weight_g: 358.4, year: '2019-01-01' },
  { species: 'Bream',   length_cm: 31.8, weight_g: 487.9, year: '2020-01-01' },
  { species: 'Bream',   length_cm: 34.2, weight_g: 601.3, year: '2021-01-01' },
  { species: 'Bream',   length_cm: 36.1, weight_g: 698.7, year: '2022-01-01' },
  { species: 'Bream',   length_cm: 37.5, weight_g: 774.2, year: '2023-01-01' },
  { species: 'Bream',   length_cm: 38.6, weight_g: 831.5, year: '2024-01-01' },
  { species: 'Carp',    length_cm: 14.8, weight_g:   42.1, year: '2015-01-01' },
  { species: 'Carp',    length_cm: 22.3, weight_g:  142.8, year: '2016-01-01' },
  { species: 'Carp',    length_cm: 29.7, weight_g:  338.5, year: '2017-01-01' },
  { species: 'Carp',    length_cm: 36.2, weight_g:  612.4, year: '2018-01-01' },
  { species: 'Carp',    length_cm: 41.8, weight_g:  924.7, year: '2019-01-01' },
  { species: 'Carp',    length_cm: 46.5, weight_g: 1287.3, year: '2020-01-01' },
  { species: 'Carp',    length_cm: 50.3, weight_g: 1624.8, year: '2021-01-01' },
  { species: 'Carp',    length_cm: 53.4, weight_g: 1934.2, year: '2022-01-01' },
  { species: 'Carp',    length_cm: 55.9, weight_g: 2198.6, year: '2023-01-01' },
  { species: 'Carp',    length_cm: 57.8, weight_g: 2421.3, year: '2024-01-01' },
];

const _SAMPLE_COLUMNS = inferColumnMeta(SAMPLE_ROWS);
const _SAMPLE_DATA: Record<string, unknown[]> = Object.fromEntries(
  _SAMPLE_COLUMNS.map(col => [col.name, SAMPLE_ROWS.map(row => row[col.name])]),
);

function buildSamplePackage(sourceId: string): DataPackage {
  return {
    id: sourceId,
    source: 'upload',
    label: '어류 성장 샘플 (Bass · Bream · Carp)',
    columns: _SAMPLE_COLUMNS,
    data: _SAMPLE_DATA,
    createdAt: new Date().toISOString(),
  };
}

// ─── 샘플 데이터셋 정의 (F4) ──────────────────────────────

interface SampleDataset {
  id: string;
  label: string;
  chartHint: string;
  type: 'inline' | 'fetch';
  url?: string;
}

const SAMPLE_DATASETS: SampleDataset[] = [
  { id: 'fish-growth', label: '어류 성장', chartHint: 'Scatter', type: 'inline' },
  { id: 'correlation', label: '키 · 몸무게', chartHint: 'Scatter', type: 'fetch', url: '/example-data/correlation.csv' },
  { id: 'group-compare', label: '그룹 비교', chartHint: 'Bar', type: 'fetch', url: '/example-data/two-sample-t.csv' },
  { id: 'anova', label: '사료 비교', chartHint: 'Box', type: 'fetch', url: '/example-data/one-way-anova.csv' },
];

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export function DataUploadPanel(): React.ReactElement {
  const router = useRouter();
  const loadDataOnly = useGraphStudioStore(state => state.loadDataOnly);
  const setPendingTemplateId = useGraphStudioStore(state => state.setPendingTemplateId);
  const pendingTemplateId = useGraphStudioStore(state => state.pendingTemplateId);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const [blockedRowCount, setBlockedRowCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // SSR-safe localStorage 읽기
  const [projects, setProjects] = useState<GraphProject[]>([]);
  const [templates, setTemplates] = useState<StyleTemplate[]>([]);

  const refreshProjects = useCallback((): void => {
    setProjects(
      listProjects()
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    );
  }, []);

  useEffect(() => {
    refreshProjects();
    setTemplates(loadTemplates());
  }, [refreshProjects]);

  useEffect((): (() => void) => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEYS.graphStudio.projects) return;
      refreshProjects();
    };

    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, refreshProjects);
    window.addEventListener('storage', handleStorage);

    return (): void => {
      window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, refreshProjects);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshProjects]);

  // ── 인라인 샘플 데이터 로드 ─────────────────────────────
  const handleInlineSample = useCallback(() => {
    const pkg = buildSamplePackage(`sample-${Date.now()}`);
    loadDataOnly(pkg);
  }, [loadDataOnly]);

  // ── fetch 기반 샘플 데이터 로드 ─────────────────────────
  const handleFetchSample = useCallback(async (sample: SampleDataset) => {
    if (!sample.url) return;
    setError(null);
    setLoadingSampleId(sample.id);
    try {
      const response = await fetch(sample.url);
      if (!response.ok) throw new Error(`샘플 데이터 로드 실패: ${response.status}`);
      const text = await response.text();
      const { columns, data } = parseText(text);
      const pkg: DataPackage = {
        id: `sample-${sample.id}-${Date.now()}`,
        source: 'upload',
        label: `샘플: ${sample.label}`,
        columns,
        data,
        createdAt: new Date().toISOString(),
      };
      loadDataOnly(pkg);
    } catch (err) {
      setError(err instanceof Error ? err.message : '샘플 데이터 로드 실패');
    } finally {
      setLoadingSampleId(null);
    }
  }, [loadDataOnly]);

  // ── 샘플 클릭 핸들러 ───────────────────────────────────
  const handleSampleClick = useCallback((sample: SampleDataset) => {
    if (sample.type === 'inline') {
      handleInlineSample();
    } else {
      void handleFetchSample(sample);
    }
  }, [handleInlineSample, handleFetchSample]);

  // ── 대용량 데이터 체크 (행 수 기반) ──────────────────────
  const checkDataSize = useCallback((pkg: DataPackage): boolean => {
    const rowCount = getRowCount(pkg.data);
    const level = getDataSizeLevel(rowCount);
    if (level === 'block') {
      setBlockedRowCount(rowCount);
      return false;
    }
    if (level === 'warn') {
      toast.warning(TOAST.graphStudio.largeDataWarning(rowCount));
    }
    return true;
  }, []);

  // ── 파일 처리 ──────────────────────────────────────────
  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);
      try {
        const { columns, data } = await parseFile(file);
        const pkg: DataPackage = {
          id: `${file.name}-${Date.now()}`,
          source: 'upload',
          label: file.name,
          columns,
          data,
          createdAt: new Date().toISOString(),
        };
        if (!checkDataSize(pkg)) return;
        loadDataOnly(pkg);
      } catch (err) {
        setError(err instanceof Error ? err.message : '파일 파싱 실패');
      } finally {
        setIsLoading(false);
      }
    },
    [loadDataOnly, checkDataSize],
  );

  // ── 클립보드 붙여넣기 (F3) ─────────────────────────────
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text/plain');
    if (!text.trim()) return;
    e.preventDefault();

    setError(null);
    setIsLoading(true);
    try {
      const { columns, data } = parseText(text);
      const pkg: DataPackage = {
        id: `clipboard-${Date.now()}`,
        source: 'upload',
        label: '클립보드 데이터',
        columns,
        data,
        createdAt: new Date().toISOString(),
      };
      if (!checkDataSize(pkg)) return;
      loadDataOnly(pkg);
    } catch (err) {
      setError(err instanceof Error ? err.message : '클립보드 데이터 파싱 실패');
    } finally {
      setIsLoading(false);
    }
  }, [loadDataOnly, checkDataSize]);

  // ── 최근 프로젝트 클릭 (F1) ────────────────────────────
  const handleProjectClick = useCallback((projectId: string) => {
    router.push(`/graph-studio?project=${projectId}`);
  }, [router]);

  // ── 스타일 템플릿 선택 토글 (F2) ───────────────────────
  const handleTemplateToggle = useCallback((templateId: string) => {
    setPendingTemplateId(pendingTemplateId === templateId ? null : templateId);
  }, [setPendingTemplateId, pendingTemplateId]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) void handleFile(files[0]); },
    accept: {
      'text/csv': ['.csv', '.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    noClick: true,
  });

  const hasProjects = projects.length > 0;
  const hasTemplates = templates.length > 0;

  return (
    <div
      {...getRootProps()}
      data-testid="graph-studio-dropzone"
      onPaste={handlePaste}
      tabIndex={0}
      className={cn(
        'w-full max-w-3xl transition-all duration-200 outline-none',
        isDragActive && 'ring-2 ring-primary ring-offset-4 rounded-2xl',
      )}
    >
      <input {...getInputProps()} />
      <motion.div
        className="space-y-6"
        {...(prefersReducedMotion ? {} : { variants: staggerContainer, initial: 'hidden' as const, animate: 'visible' as const })}
      >

      {/* ── Hero 헤더 ─────────────────────────────────── */}
      <motion.div
        className="text-center py-8"
        {...(prefersReducedMotion ? {} : { variants: staggerItem })}
      >
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight leading-tight mb-1">
          분포·상관·추세를 논문 수준으로
        </h2>
        <div className="mt-3">
          <StepIndicator currentStep={0} />
        </div>
      </motion.div>

      {/* ── F4: 샘플 데이터 (4종) ─────────────────────── */}
      <motion.div
        className="flex flex-wrap justify-center gap-2"
        {...(prefersReducedMotion ? {} : { variants: staggerItem })}
      >
        {SAMPLE_DATASETS.map((sample) => (
          <Button
            key={sample.id}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => handleSampleClick(sample)}
            disabled={isLoading || loadingSampleId !== null}
            data-testid={`graph-studio-sample-${sample.id}`}
          >
            {loadingSampleId === sample.id ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            {sample.label}
            <span className="text-muted-foreground/60">{sample.chartHint}</span>
          </Button>
        ))}
      </motion.div>

      {/* ── F3: 파일 업로드 + 드래그 + 붙여넣기 존 ──── */}
      <motion.div
        data-testid="graph-studio-upload-zone"
        className={cn(uploadZoneClassName(isDragActive, { compact: true }), 'group')}
        {...(prefersReducedMotion ? {} : { variants: staggerItem })}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          className="sr-only"
          data-testid="graph-studio-file-input"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              void handleFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
          disabled={isLoading}
        />
        <UploadDropZoneContent
          isDragActive={isDragActive}
          isLoading={isLoading}
          label="파일을 드래그하여 업로드"
          subtitle="CSV, Excel · 엑셀 데이터 Ctrl+V 붙여넣기"
          buttonLabel="파일 선택"
          loadingLabel="처리 중..."
          onButtonClick={() => fileInputRef.current?.click()}
          buttonTestId="graph-studio-file-upload-btn"
          showIcon={false}
        />
      </motion.div>

      {/* 에러 */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── F1: 최근 프로젝트 ─────────────────────────── */}
      {hasProjects && (
        <motion.div
          className="space-y-2"
          {...(prefersReducedMotion ? {} : { variants: staggerItem })}
        >
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            최근 프로젝트
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {projects.map((project) => {
              const chartType = project.chartSpec?.chartType as ChartType | undefined;
              const IconComp = chartType ? CHART_TYPE_ICONS[chartType] : null;
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => handleProjectClick(project.id)}
                  className={cn(
                    'flex flex-col items-start gap-1 p-3 rounded-2xl text-left',
                    'border border-border bg-card',
                    'hover:border-primary/50 hover:shadow-sm transition-all duration-200',
                    'text-xs',
                  )}
                  data-testid={`graph-studio-recent-${project.id}`}
                >
                  <span className="font-medium text-foreground truncate w-full">
                    {project.name}
                  </span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    {IconComp && <IconComp className="w-3 h-3" />}
                    {formatTimeAgo(new Date(project.updatedAt))}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── F2: 저장된 스타일 템플릿 ──────────────────── */}
      {hasTemplates ? (
        <motion.div
          className="space-y-2"
          {...(prefersReducedMotion ? {} : { variants: staggerItem })}
        >
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            저장된 스타일
          </h3>
          <div className="flex flex-wrap gap-2">
            {templates.map((tmpl) => {
              const isSelected = pendingTemplateId === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleTemplateToggle(tmpl.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs',
                    'border transition-all duration-200',
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'border-border bg-card text-foreground hover:border-primary/50',
                  )}
                  data-testid={`graph-studio-template-${tmpl.id}`}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {tmpl.name}
                  <span className="text-muted-foreground/60">{tmpl.style.preset}</span>
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : hasProjects ? (
        /* 프로젝트는 있는데 템플릿이 없을 때 → 안내 */
        <motion.div
          className="text-xs text-muted-foreground/70 text-center"
          {...(prefersReducedMotion ? {} : { variants: staggerItem })}
        >
          차트 편집 후 스타일 탭에서 템플릿으로 저장하면 다음에 바로 적용할 수 있습니다
        </motion.div>
      ) : null}

      {/* ── 빈 상태 안내 (프로젝트·템플릿 모두 없을 때) ── */}
      {!hasProjects && !hasTemplates && (
        <motion.div
          className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 py-2"
          {...(prefersReducedMotion ? {} : { variants: staggerItem })}
        >
          <Lightbulb className="w-3.5 h-3.5 shrink-0" />
          <span>차트 완성 후 스타일을 템플릿으로 저장하면 다음에 바로 적용할 수 있습니다</span>
        </motion.div>
      )}

      </motion.div>

      <LargeDataBlockDialog
        open={blockedRowCount !== null}
        onOpenChange={() => setBlockedRowCount(null)}
        rowCount={blockedRowCount ?? 0}
      />
    </div>
  );
}
