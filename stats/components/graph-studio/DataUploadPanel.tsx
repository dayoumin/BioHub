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
  BoxSelect,
  BarChart,
  Grid2x2,
  Upload,
  Sparkles,
  BookOpen,
  Download,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { inferColumnMeta, selectXYFields } from '@/lib/graph-studio/chart-spec-utils';
import { createDefaultChartSpec, CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import type { ChartType, DataPackage } from '@/types/graph-studio';

// ─── 샘플 데이터 (어류 성장, 3종 × 10행) ──────────────────

const SAMPLE_ROWS: Record<string, unknown>[] = [
  { species: 'Bass',    length_cm: 12.3, weight_g:  28.5, age: 1 },
  { species: 'Bass',    length_cm: 18.7, weight_g:  82.1, age: 2 },
  { species: 'Bass',    length_cm: 24.1, weight_g: 178.4, age: 3 },
  { species: 'Bass',    length_cm: 29.5, weight_g: 321.7, age: 4 },
  { species: 'Bass',    length_cm: 33.8, weight_g: 487.2, age: 5 },
  { species: 'Bass',    length_cm: 37.2, weight_g: 641.0, age: 6 },
  { species: 'Bass',    length_cm: 40.1, weight_g: 782.3, age: 7 },
  { species: 'Bass',    length_cm: 42.6, weight_g: 901.5, age: 8 },
  { species: 'Bass',    length_cm: 44.3, weight_g: 987.4, age: 9 },
  { species: 'Bass',    length_cm: 45.7, weight_g: 1052.8, age: 10 },
  { species: 'Bream',   length_cm: 10.1, weight_g:  18.2, age: 1 },
  { species: 'Bream',   length_cm: 15.4, weight_g:  55.3, age: 2 },
  { species: 'Bream',   length_cm: 20.2, weight_g: 124.6, age: 3 },
  { species: 'Bream',   length_cm: 24.9, weight_g: 232.1, age: 4 },
  { species: 'Bream',   length_cm: 28.7, weight_g: 358.4, age: 5 },
  { species: 'Bream',   length_cm: 31.8, weight_g: 487.9, age: 6 },
  { species: 'Bream',   length_cm: 34.2, weight_g: 601.3, age: 7 },
  { species: 'Bream',   length_cm: 36.1, weight_g: 698.7, age: 8 },
  { species: 'Bream',   length_cm: 37.5, weight_g: 774.2, age: 9 },
  { species: 'Bream',   length_cm: 38.6, weight_g: 831.5, age: 10 },
  { species: 'Carp',    length_cm: 14.8, weight_g:  42.1, age: 1 },
  { species: 'Carp',    length_cm: 22.3, weight_g: 142.8, age: 2 },
  { species: 'Carp',    length_cm: 29.7, weight_g: 338.5, age: 3 },
  { species: 'Carp',    length_cm: 36.2, weight_g: 612.4, age: 4 },
  { species: 'Carp',    length_cm: 41.8, weight_g: 924.7, age: 5 },
  { species: 'Carp',    length_cm: 46.5, weight_g: 1287.3, age: 6 },
  { species: 'Carp',    length_cm: 50.3, weight_g: 1624.8, age: 7 },
  { species: 'Carp',    length_cm: 53.4, weight_g: 1934.2, age: 8 },
  { species: 'Carp',    length_cm: 55.9, weight_g: 2198.6, age: 9 },
  { species: 'Carp',    length_cm: 57.8, weight_g: 2421.3, age: 10 },
];

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
    label: '꺾은선',
    desc: '시계열/추세',
    Icon: LineChart,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-100 hover:border-emerald-300',
  },
  {
    type: 'boxplot',
    label: '박스 플롯',
    desc: '분포 비교',
    Icon: BoxSelect,
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
    Icon: Grid2x2,
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
  const { loadDataPackage, setChartSpec } = useGraphStudioStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── 샘플 DataPackage 빌더 (deps 없음 → 안정 참조) ───────
  const buildSamplePackage = useCallback((sourceId: string): DataPackage => {
    const columns = inferColumnMeta(SAMPLE_ROWS);
    const dataRecord: Record<string, unknown[]> = {};
    for (const col of columns) {
      dataRecord[col.name] = SAMPLE_ROWS.map(row => row[col.name]);
    }
    return {
      id: sourceId,
      source: 'upload',
      label: '어류 성장 샘플 (Bass · Bream · Carp)',
      columns,
      data: dataRecord,
      createdAt: new Date().toISOString(),
    };
  // SAMPLE_ROWS는 모듈 상수 → 의존성 불필요
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 차트 유형 선택 → 샘플 로드 ──────────────────────────
  const handleChartTypeSelect = useCallback(
    (chartType: ChartType) => {
      const sourceId = `sample-${Date.now()}`;
      const pkg = buildSamplePackage(sourceId);

      // 1) DataPackage 등록 → isDataLoaded=true → 에디터 모드 전환
      loadDataPackage(pkg);

      // 2) 선택한 차트 타입에 맞는 X/Y 필드 매핑으로 ChartSpec 교체
      //    (Zustand 동기 업데이트 → loadDataPackage 직후 바로 유효)
      const { xField, yField } = selectXYFields(pkg.columns, CHART_TYPE_HINTS[chartType]);
      const spec = createDefaultChartSpec(sourceId, chartType, xField, yField, pkg.columns);
      setChartSpec(spec);
    },
    [buildSamplePackage, loadDataPackage, setChartSpec],
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
        w-full max-w-2xl transition-all duration-200
        ${isDragActive ? 'ring-2 ring-primary ring-offset-4 rounded-2xl' : ''}
      `}
    >
      <input {...getInputProps()} />

      {/* ── 헤더 ──────────────────────────────────────── */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold tracking-tight mb-2">Graph Studio</h2>
        <p className="text-muted-foreground">
          학술 논문용 고품질 차트 생성 · ECharts 기반
        </p>

        {/* 단계 표시 */}
        <div className="flex items-center justify-center gap-1 mt-4 text-xs text-muted-foreground">
          {['① 데이터 선택', '② 편집', '③ 내보내기'].map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={i === 0 ? 'text-primary font-medium' : ''}>{step}</span>
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
                <p className="text-[10px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground text-center mt-2">
          클릭하면 샘플 데이터(어류 성장)로 즉시 시작됩니다
        </p>
      </div>

      {/* ── Dual CTA ──────────────────────────────────── */}
      <div className="flex gap-3 mb-4">
        {/* 샘플로 시작하기 (Primary) */}
        <Button
          className="flex-1 gap-2"
          onClick={() => handleChartTypeSelect('bar')}
          data-testid="sample-start-btn"
        >
          <CheckCircle2 className="h-4 w-4" />
          샘플로 시작하기
        </Button>

        {/* 파일 업로드 (Secondary) — useRef로 input 직접 제어 */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            className="sr-only"
            onChange={(e) => { if (e.target.files?.[0]) void handleFile(e.target.files[0]); }}
            disabled={isLoading}
          />
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            data-testid="file-upload-btn"
          >
            {isLoading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {isLoading ? '처리 중...' : '파일 업로드'}
          </Button>
        </div>
      </div>

      {/* 드래그 힌트 */}
      <p className="text-[11px] text-muted-foreground text-center mb-6">
        {isDragActive
          ? '파일을 놓으세요'
          : 'CSV, TSV, Excel 파일을 이 영역에 드래그해도 됩니다'}
      </p>

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
