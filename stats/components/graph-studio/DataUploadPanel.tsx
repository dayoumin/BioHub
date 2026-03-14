'use client';

/**
 * 데이터 업로드 패널 — Graph Studio Step 1 (데이터 선택 전용)
 *
 * - 파일 업로드 (CSV/TSV/XLSX) — 드래그 & 드롭 + 클릭
 * - "샘플 데이터로 시작" 버튼
 * - Feature highlights (AI 편집 / 프리셋 / 내보내기)
 *
 * 차트 유형 선택은 Step 2 (ChartSetupPanel)에서 처리
 */

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import {
  Upload,
  Sparkles,
  BookOpen,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { useReducedMotion } from '@/lib/hooks/useReducedMotion';
import { inferColumnMeta } from '@/lib/graph-studio/chart-spec-utils';
import { parseFile } from '@/lib/graph-studio/file-parser';
import { StepIndicator } from '@/components/graph-studio/StepIndicator';
import { iconContainerMuted, staggerContainer, staggerItem } from '@/components/common/card-styles';
import type { DataPackage } from '@/types/graph-studio';

// ─── 샘플 데이터 (어류 성장, 3종 × 10행) ──────────────────
//
// year: 날짜 문자열 (YYYY-MM-DD) → inferDataType이 'temporal'로 추론
//   → line 차트 선택 시 X=year(temporal), Y=length_cm 으로 올바르게 매핑됨
// species: nominal  → bar/boxplot/heatmap X축
// length_cm, weight_g: quantitative → scatter X/Y, line Y

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

// ─── 샘플 컬럼 메타 (모듈 레벨 1회 계산) ──────────────────
// SAMPLE_ROWS가 상수이므로 inferColumnMeta 결과도 항상 동일 → 재계산 불필요
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

// ─── Feature highlights ────────────────────────────────────

const FEATURES = [
  { Icon: Sparkles, title: 'AI 자연어 편집', desc: '텍스트로 차트 수정' },
  { Icon: BookOpen, title: '논문 스타일 프리셋', desc: 'IEEE · Science · 흑백' },
  { Icon: Download, title: '고품질 내보내기', desc: 'SVG · PNG · DPI 300' },
] as const;

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export function DataUploadPanel(): React.ReactElement {
  const loadDataOnly = useGraphStudioStore(state => state.loadDataOnly);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefersReducedMotion = useReducedMotion();

  // ── 샘플 데이터 로드 (차트 미생성 → Step 2로 이동) ───────
  const handleSampleData = useCallback(() => {
    const sourceId = `sample-${Date.now()}`;
    const pkg = buildSamplePackage(sourceId);
    loadDataOnly(pkg);
  }, [loadDataOnly]);

  // ── 파일 처리 (데이터만 로드 → Step 2로 이동) ────────────
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
        loadDataOnly(pkg);
      } catch (err) {
        setError(err instanceof Error ? err.message : '파일 파싱 실패');
      } finally {
        setIsLoading(false);
      }
    },
    [loadDataOnly],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => { if (files[0]) void handleFile(files[0]); },
    accept: {
      'text/csv': ['.csv', '.tsv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
    noClick: true,  // 클릭은 별도 버튼으로 처리
  });

  return (
    <div
      {...getRootProps()}
      data-testid="graph-studio-dropzone"
      className={cn(
        'w-full max-w-3xl transition-all duration-200',
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

      {/* ── 샘플 데이터로 시작 ─────────────────────────── */}
      <motion.div
        className="text-center"
        {...(prefersReducedMotion ? {} : { variants: staggerItem })}
      >
        <Button
          variant="outline"
          size="lg"
          className="gap-2"
          onClick={handleSampleData}
          data-testid="graph-studio-sample-btn"
        >
          <FileSpreadsheet className="h-4 w-4" />
          샘플 데이터로 시작 (어류 성장)
        </Button>
      </motion.div>

      {/* ── 파일 업로드 + 드래그 존 ───────────────────── */}
      <motion.div
        data-testid="graph-studio-upload-zone"
        className={cn(
          'border-2 border-dashed rounded-xl px-6 py-5 text-center transition-colors duration-200',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-muted-foreground/40',
        )}
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
        <Button
          variant="outline"
          className="gap-2 mb-3"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          data-testid="graph-studio-file-upload-btn"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isLoading ? '처리 중...' : '내 파일 업로드'}
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {isDragActive
            ? '파일을 여기에 놓으세요'
            : 'CSV · TSV · Excel 파일을 드래그해도 됩니다'}
        </p>
      </motion.div>

      {/* 에러 */}
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── Feature highlights ───────────────────────── */}
      <motion.div
        className="border-t border-border pt-6 grid grid-cols-3 gap-4"
        {...(prefersReducedMotion ? {} : { variants: staggerItem })}
      >
        {FEATURES.map(({ Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center text-center gap-2">
            <div className={iconContainerMuted}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        ))}
      </motion.div>
      </motion.div>
    </div>
  );
}
