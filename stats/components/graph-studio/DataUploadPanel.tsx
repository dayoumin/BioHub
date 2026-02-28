'use client';

/**
 * 데이터 업로드 패널 — Graph Studio 첫 화면
 *
 * 2026 UX 개선: Template-first + Dual CTA + Bento 썸네일
 * - 차트 유형 6개 썸네일 클릭 → 샘플 데이터로 즉시 에디터 진입
 * - "샘플로 시작하기" 버튼 (bar 기본)
 * - 파일 업로드 (CSV/TSV/XLSX) — 기존 동작 유지
 * - Feature highlights (AI 편집 / 프리셋 / 내보내기)
 */

import { useCallback, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';
import {
  BarChart2,
  ScatterChart,
  LineChart,
  SlidersHorizontal,
  BarChart,
  Grid3X3,
  Upload,
  Sparkles,
  BookOpen,
  Download,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { inferColumnMeta, selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import { createDefaultChartSpec, CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import type { ChartType, DataPackage } from '@/types/graph-studio';

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

// ─── 차트 썸네일 정의 ──────────────────────────────────────

interface ChartThumbnail {
  type: ChartType;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
}

const CHART_THUMBNAILS: ChartThumbnail[] = [
  {
    type: 'bar',
    label: '막대 차트',
    desc: '범주 비교',
    Icon: BarChart2,
    color: 'text-blue-500',
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-300',
  },
  {
    type: 'scatter',
    label: '산점도',
    desc: '변수 상관',
    Icon: ScatterChart,
    color: 'text-violet-500',
    bg: 'bg-violet-50 hover:bg-violet-100 border-violet-100 hover:border-violet-300',
  },
  {
    type: 'line',
    label: '꺾은선 그래프',
    desc: '시계열/추세',
    Icon: LineChart,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 hover:border-emerald-300',
  },
  {
    type: 'boxplot',
    label: '박스 플롯',
    desc: '분포 비교',
    Icon: SlidersHorizontal,
    color: 'text-orange-500',
    bg: 'bg-orange-50 hover:bg-orange-100 border-orange-100 hover:border-orange-300',
  },
  {
    type: 'histogram',
    label: '히스토그램',
    desc: '빈도 분포',
    Icon: BarChart,
    color: 'text-pink-500',
    bg: 'bg-pink-50 hover:bg-pink-100 border-pink-100 hover:border-pink-300',
  },
  {
    type: 'heatmap',
    label: '히트맵',
    desc: '교차 분석',
    Icon: Grid3X3,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50 hover:bg-cyan-100 border-cyan-100 hover:border-cyan-300',
  },
];

// ─── Feature highlights ────────────────────────────────────

const FEATURES = [
  {
    Icon: Sparkles,
    title: 'AI 자연어 편집',
    desc: '텍스트로 차트 수정',
    color: 'text-violet-500',
  },
  {
    Icon: BookOpen,
    title: '논문 스타일 프리셋',
    desc: 'IEEE · Science · 흑백',
    color: 'text-blue-500',
  },
  {
    Icon: Download,
    title: '고품질 내보내기',
    desc: 'SVG · PNG · DPI 300',
    color: 'text-emerald-500',
  },
] as const;

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export function DataUploadPanel(): React.ReactElement {
  const { loadDataPackage, loadDataPackageWithSpec } = useGraphStudioStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 차트 유형 선택 → 샘플 로드 ──────────────────────────
  const handleChartTypeSelect = useCallback(
    (chartType: ChartType) => {
      const sourceId = `sample-${Date.now()}`;
      const pkg = buildSamplePackage(sourceId);
      const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS[chartType]);
      const spec = createDefaultChartSpec(sourceId, chartType, xField, yField, pkg.columns);

      // line/scatter 차트: 샘플 데이터의 nominal 컬럼(species)을 color encoding으로 자동 설정
      // → 3종이 별도 시리즈로 구분되어 렌더링됨 (미설정 시 30점이 단일 선으로 연결되는 zigzag 발생)
      if (chartType === 'line' || chartType === 'scatter') {
        const nominalCol = pkg.columns.find(
          c => c.type === 'nominal' && c.name !== xField && c.name !== yField,
        );
        if (nominalCol) {
          spec.encoding.color = { field: nominalCol.name, type: 'nominal' };
        }
      }

      // DataPackage + ChartSpec을 단일 set()으로 원자적 등록 (중간 렌더 없음)
      loadDataPackageWithSpec(pkg, spec);
    },
    [loadDataPackageWithSpec],
  );

  // ── 파일 처리 (기존 로직 유지) ───────────────────────────
  const processData = useCallback(
    (fileName: string, data: Record<string, unknown>[]) => {
      const sourceId = `${fileName}-${Date.now()}`;
      const columns = inferColumnMeta(data);
      const dataRecord: Record<string, unknown[]> = {};
      for (const col of columns) {
        dataRecord[col.name] = data.map(row => row[col.name]);
      }
      const pkg: DataPackage = {
        id: sourceId,
        source: 'upload',
        label: fileName,
        columns,
        data: dataRecord,
        createdAt: new Date().toISOString(),
      };
      loadDataPackage(pkg);
    },
    [loadDataPackage],
  );

  const parseCsv = useCallback(
    async (file: File) => {
      const isTsv = file.name.toLowerCase().endsWith('.tsv');
      return new Promise<void>((resolve, reject) => {
        Papa.parse<Record<string, unknown>>(file, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          delimiter: isTsv ? '\t' : ',',
          complete: (results) => {
            if (results.errors.length > 0) {
              reject(new Error(`CSV 파싱 오류: ${results.errors[0].message}`));
              return;
            }
            if (results.data.length === 0) {
              reject(new Error('데이터가 비어 있습니다'));
              return;
            }
            processData(file.name, results.data);
            resolve();
          },
          error: (err) => reject(new Error(err.message)),
        });
      });
    },
    [processData],
  );

  const parseExcel = useCallback(
    async (file: File) => {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheet = workbook.SheetNames[0];
      const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        workbook.Sheets[firstSheet],
      );
      if (data.length === 0) throw new Error('데이터가 비어 있습니다');
      processData(file.name, data);
    },
    [processData],
  );

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsLoading(true);
      try {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'csv' || ext === 'tsv') {
          await parseCsv(file);
        } else if (ext === 'xlsx' || ext === 'xls') {
          await parseExcel(file);
        } else {
          setError('지원하는 형식: CSV, TSV, XLSX, XLS');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '파일 파싱 실패');
      } finally {
        setIsLoading(false);
      }
    },
    [parseCsv, parseExcel],
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
      className={`
        w-full max-w-3xl transition-all duration-200
        ${isDragActive ? 'ring-2 ring-primary ring-offset-4 rounded-2xl' : ''}
      `}
    >
      <input {...getInputProps()} />

      {/* ── 헤더 ──────────────────────────────────────── */}
      <div className="text-center mb-8">
        <p className="text-base font-semibold text-foreground">
          분포·상관·추세를 논문 수준으로
        </p>

        {/* 단계 표시 — 클릭 불가, 현재 단계를 pill로 강조 */}
        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
          {['① 데이터 선택', '② 편집', '③ 내보내기'].map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {i === 0 ? (
                <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  {step}
                </span>
              ) : (
                <span>{step}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* ── 차트 유형 썸네일 (Bento 스타일) ─────────────── */}
      <div className="mb-6">
        <p className="text-xs font-medium text-muted-foreground mb-3 text-center uppercase tracking-wide">
          차트 유형으로 바로 시작
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CHART_THUMBNAILS.map(({ type, label, desc, Icon, color, bg }) => (
            <button
              key={type}
              type="button"
              onClick={() => handleChartTypeSelect(type)}
              className={`
                group flex flex-col items-center gap-2 p-4 rounded-xl border-2
                cursor-pointer transition-all duration-150
                ${bg}
              `}
              data-testid={`chart-type-${type}`}
            >
              <Icon className={`h-7 w-7 ${color} transition-transform group-hover:scale-110`} />
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground leading-tight">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          클릭하면 샘플 데이터(어류 성장)로 즉시 시작됩니다
        </p>
      </div>

      {/* ── 파일 업로드 + 드래그 존 ───────────────────── */}
      {/* 점선 테두리로 드래그 가능 영역 명시 */}
      <div className={`
        border-2 border-dashed rounded-xl px-6 py-5 mb-4 text-center
        transition-colors duration-200
        ${isDragActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-muted-foreground/40'}
      `}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.xlsx,.xls"
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              void handleFile(e.target.files[0]);
              // 동일 파일 재선택 시 onChange 재발화를 위해 value 리셋
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
          data-testid="file-upload-btn"
        >
          {isLoading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {isLoading ? '처리 중...' : '내 파일 업로드'}
        </Button>
        <p aria-live="polite" className="text-[11px] text-muted-foreground">
          {isDragActive
            ? '파일을 여기에 놓으세요'
            : 'CSV · TSV · Excel 파일을 드래그해도 됩니다'}
        </p>
      </div>

      {/* 에러 */}
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* ── Feature highlights ───────────────────────── */}
      <div className="border-t pt-5 grid grid-cols-3 gap-4">
        {FEATURES.map(({ Icon, title, desc, color }) => (
          <div key={title} className="flex flex-col items-center text-center gap-1.5">
            <Icon className={`h-5 w-5 ${color}`} />
            <p className="text-xs font-semibold text-foreground leading-tight">{title}</p>
            <p className="text-[10px] text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
