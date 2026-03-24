'use client';

/**
 * Export 다이얼로그 — SVG/PNG 내보내기 설정
 *
 * ExportTab에서 Dialog로 전환. 헤더 버튼 클릭 → 모달 열림.
 * physicalWidth/Height (mm) 지정 시:
 *   ECharts resize({ width, height }) → getDataURL/getSvgDataURL → resize() 원복
 * 저널 프리셋: Nature/Cell/PNAS/ACS 표준 칼럼 너비를 한 번에 입력
 */

import { useCallback, useState, useEffect } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, AlertTriangle, Loader2, FileText } from 'lucide-react';
import { JOURNAL_SIZE_PRESETS, mmToPx } from '@/lib/graph-studio';
import type { ExportFormat, ErrorBarSpec } from '@/types/graph-studio';
import type { MatplotlibExportFormat, MatplotlibStylePreset } from '@/types/matplotlib-export';
import { DEFAULT_MATPLOTLIB_EXPORT_CONFIG } from '@/types/matplotlib-export';
import { useMatplotlibExport } from '@/lib/graph-studio/use-matplotlib-export';

const DPI_OPTIONS = [72, 150, 300, 600] as const;

const MPL_FORMAT_OPTIONS: { value: MatplotlibExportFormat; label: string }[] = [
  { value: 'pdf', label: 'PDF (벡터)' },
  { value: 'png', label: 'PNG (래스터)' },
  { value: 'svg', label: 'SVG (벡터)' },
  { value: 'tiff', label: 'TIFF (래스터)' },
  { value: 'eps', label: 'EPS (벡터)' },
];

const MPL_STYLE_OPTIONS: { value: MatplotlibStylePreset; label: string }[] = [
  { value: 'science', label: 'Science (Nature 스타일)' },
  { value: 'ieee', label: 'IEEE (흑백)' },
  { value: 'default', label: 'Default' },
];

// ECharts getDataURL가 지원하는 포맷만 노출 (TIFF/PDF 제외)
const SUPPORTED_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'svg', label: 'SVG (벡터)' },
  { value: 'png', label: 'PNG (래스터)' },
];

import { MPL_SUPPORTED_CHART_TYPES } from '@/lib/graph-studio/matplotlib-compat';

// 다른 OS에서도 렌더링이 보장되는 웹 안전 폰트 (A4 경고 기준)
const WEB_SAFE_FONTS = new Set([
  'Arial, Helvetica, sans-serif',
  'Times New Roman, serif',
  'Georgia, serif',
  'Courier New, monospace',
]);

/** 에러바 정의 텍스트 생성 (A3) */
function getErrorBarCaption(errorBar: ErrorBarSpec): string {
  const descriptions: Record<string, string> = {
    stderr: 'Error bars represent mean ± SEM',
    stdev:  'Error bars represent mean ± SD',
    ci:     `Error bars represent ${errorBar.value ?? 95}% confidence intervals`,
    iqr:    'Error bars represent IQR',
  };
  return descriptions[errorBar.type] ?? '';
}

interface ExportDialogProps {
  /** Export 실행 핸들러 (GraphStudioPage에서 주입) */
  onExport?: () => void;
}

/** mm 값을 문자열 input 값으로 변환 */
const toInput = (mm: number | undefined): string => (mm !== undefined ? String(mm) : '');

export function ExportDialog({ onExport }: ExportDialogProps): React.ReactElement {
  const { chartSpec, setExportConfig } = useGraphStudioStore();

  // shadcn Dialog: disabled trigger가 열릴 수 있는 엣지 케이스 방지
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── matplotlib 논문용 내보내기 상태 ──
  const { exportWithMatplotlib, isExporting: isMplExporting, progress: mplProgress, error: mplError, warnings: mplWarnings, clearWarnings: clearMplWarnings } = useMatplotlibExport();
  const [mplFormat, setMplFormat] = useState<MatplotlibExportFormat>(DEFAULT_MATPLOTLIB_EXPORT_CONFIG.format);
  const [mplStyle, setMplStyle] = useState<MatplotlibStylePreset>(DEFAULT_MATPLOTLIB_EXPORT_CONFIG.style);
  const [mplDpi, setMplDpi] = useState(DEFAULT_MATPLOTLIB_EXPORT_CONFIG.dpi);

  const isMplSupported = chartSpec ? MPL_SUPPORTED_CHART_TYPES.has(chartSpec.chartType) : false;

  // 물리적 크기 로컬 state — onBlur 시 setExportConfig (undo 히스토리 제외 의도)
  const [widthInput, setWidthInput] = useState(() =>
    toInput(chartSpec?.exportConfig.physicalWidth),
  );
  const [heightInput, setHeightInput] = useState(() =>
    toInput(chartSpec?.exportConfig.physicalHeight),
  );

  // AI 편집 등 외부 변경 동기화
  useEffect(() => {
    setWidthInput(toInput(chartSpec?.exportConfig.physicalWidth));
    setHeightInput(toInput(chartSpec?.exportConfig.physicalHeight));
  }, [chartSpec?.exportConfig.physicalWidth, chartSpec?.exportConfig.physicalHeight]);

  const handleFormatChange = useCallback((value: string) => {
    if (!chartSpec) return;
    if (value !== 'svg' && value !== 'png') return;
    setExportConfig({ ...chartSpec.exportConfig, format: value });
  }, [chartSpec, setExportConfig]);

  const handleDpiChange = useCallback((value: string) => {
    if (!chartSpec) return;
    setExportConfig({ ...chartSpec.exportConfig, dpi: Number(value) });
  }, [chartSpec, setExportConfig]);

  const handleTransparentBgChange = useCallback((checked: boolean) => {
    if (!chartSpec) return;
    setExportConfig({
      ...chartSpec.exportConfig,
      transparentBackground: checked || undefined,
    });
  }, [chartSpec, setExportConfig]);

  const handlePhysicalSizeBlur = useCallback(() => {
    if (!chartSpec) return;
    const w = parseFloat(widthInput);
    const h = parseFloat(heightInput);
    setExportConfig({
      ...chartSpec.exportConfig,
      physicalWidth: !isNaN(w) && w > 0 ? w : undefined,
      physicalHeight: !isNaN(h) && h > 0 ? h : undefined,
    });
  }, [chartSpec, widthInput, heightInput, setExportConfig]);

  const handleMatplotlibExport = useCallback(() => {
    if (!chartSpec) return;
    const w = parseFloat(widthInput);
    const h = parseFloat(heightInput);
    exportWithMatplotlib({
      format: mplFormat,
      dpi: mplDpi,
      physicalWidthMm: !isNaN(w) && w > 0 ? w : DEFAULT_MATPLOTLIB_EXPORT_CONFIG.physicalWidthMm,
      physicalHeightMm: !isNaN(h) && h > 0 ? h : DEFAULT_MATPLOTLIB_EXPORT_CONFIG.physicalHeightMm,
      style: mplStyle,
      transparentBackground: chartSpec.exportConfig.transparentBackground,
    });
  }, [chartSpec, widthInput, heightInput, mplFormat, mplDpi, mplStyle, exportWithMatplotlib]);

  const handleJournalPreset = useCallback((width: number) => {
    if (!chartSpec) return;
    setWidthInput(String(width));
    const h = parseFloat(heightInput);
    setExportConfig({
      ...chartSpec.exportConfig,
      physicalWidth: width,
      physicalHeight: !isNaN(h) && h > 0 ? h : chartSpec.exportConfig.physicalHeight,
    });
  }, [chartSpec, heightInput, setExportConfig]);

  // ─── 렌더 계산값 (IIFE 대신 호이스팅) ──────────────────────
  const currentFont = chartSpec?.style.font?.family ?? '';
  const showFontWarning =
    chartSpec?.exportConfig.format === 'svg' &&
    currentFont !== '' &&
    !WEB_SAFE_FONTS.has(currentFont);

  const parsedW = parseFloat(widthInput);
  const parsedH = parseFloat(heightInput);
  const hasW = !isNaN(parsedW) && parsedW > 0;
  const hasH = !isNaN(parsedH) && parsedH > 0;

  return (
    <Dialog
      open={dialogOpen}
      onOpenChange={(next) => { if (!next || chartSpec) setDialogOpen(next); }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!chartSpec}
          aria-label="내보내기 설정 열기"
        >
          <Download className="h-4 w-4 mr-1" />
          내보내기
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>차트 내보내기</DialogTitle>
        </DialogHeader>

        {!chartSpec ? (
          <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>
        ) : (
          <div className="space-y-4">
            {/* 포맷 */}
            <div className="space-y-1.5">
              <Label className="text-xs">포맷</Label>
              <Select value={chartSpec.exportConfig.format} onValueChange={handleFormatChange}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_FORMATS.map(({ value, label }) => (
                    <SelectItem key={value} value={value} className="text-sm">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* DPI (PNG만) */}
            {chartSpec.exportConfig.format === 'png' && (
              <div className="space-y-1.5">
                <Label className="text-xs">DPI</Label>
                <Select value={String(chartSpec.exportConfig.dpi)} onValueChange={handleDpiChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DPI_OPTIONS.map(dpi => (
                      <SelectItem key={dpi} value={String(dpi)} className="text-sm">
                        {dpi} DPI {dpi === 300 ? '(권장)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 투명 배경 (PNG만) — A2 */}
            {chartSpec.exportConfig.format === 'png' && (
              <div className="flex items-center justify-between">
                <Label htmlFor="transparent-bg" className="text-xs cursor-pointer">
                  투명 배경
                </Label>
                <Switch
                  id="transparent-bg"
                  checked={chartSpec.exportConfig.transparentBackground ?? false}
                  onCheckedChange={handleTransparentBgChange}
                />
              </div>
            )}

            {/* SVG 비웹 안전 폰트 경고 — A4 */}
            {showFontWarning && (
              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                SVG 내보내기 시 선택한 폰트가 다른 시스템에서 깨질 수 있습니다.
                웹 안전 폰트(Arial, Times New Roman)를 권장합니다.
              </p>
            )}

            {/* 출력 크기 (선택) */}
            <div className="space-y-2">
              <Label className="text-xs">출력 크기 (mm, 선택)</Label>

              {/* 저널 프리셋 버튼 */}
              <div className="flex flex-wrap gap-1">
                {JOURNAL_SIZE_PRESETS.map(({ key, label, width }) => {
                  const isActive = chartSpec.exportConfig.physicalWidth === width;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleJournalPreset(width)}
                      className={[
                        'text-xs border rounded px-1.5 py-0.5 transition-colors',
                        isActive
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border hover:bg-muted',
                      ].join(' ')}
                      title={`너비 ${width}mm`}
                      aria-pressed={isActive}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* 너비·높이 입력 */}
              <div className="flex gap-1.5 items-center">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">너비 (mm)</Label>
                  <Input
                    value={widthInput}
                    onChange={(e) => setWidthInput(e.target.value)}
                    onBlur={handlePhysicalSizeBlur}
                    placeholder="예: 86"
                    className="h-7 text-xs"
                    type="number"
                    min="1"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground">높이 (mm)</Label>
                  <Input
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    onBlur={handlePhysicalSizeBlur}
                    placeholder="예: 60"
                    className="h-7 text-xs"
                    type="number"
                    min="1"
                  />
                </div>
              </div>

              {/* 픽셀 미리보기 / 안내 */}
              {chartSpec.exportConfig.format === 'svg' && (hasW || hasH) ? (
                <p className="text-xs text-muted-foreground">
                  SVG 벡터 뷰포트:
                  {hasW ? ` 너비 ${parsedW}mm` : ''}
                  {hasW && hasH ? ' ×' : ''}
                  {hasH ? ` 높이 ${parsedH}mm` : ''}
                </p>
              ) : (hasW || hasH) ? (
                <p className="text-xs text-muted-foreground">
                  {hasW && hasH
                    ? `${mmToPx(parsedW, chartSpec.exportConfig.dpi)} × ${mmToPx(parsedH, chartSpec.exportConfig.dpi)} px`
                    : hasW
                      ? `너비: ${mmToPx(parsedW, chartSpec.exportConfig.dpi)} px`
                      : `높이: ${mmToPx(parsedH, chartSpec.exportConfig.dpi)} px`}
                  {' '}({chartSpec.exportConfig.dpi} DPI 기준)
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  빈칸이면 현재 차트 패널 크기로 출력됩니다.
                </p>
              )}
            </div>

            {/* 캡션 작성 참고 — A3 */}
            {(chartSpec.errorBar || chartSpec.chartType === 'boxplot') && (
              <div className="rounded-md bg-muted/50 p-2.5 text-xs space-y-1">
                <p className="font-medium">캡션 작성 참고</p>
                {chartSpec.errorBar && (
                  <p className="text-muted-foreground">{getErrorBarCaption(chartSpec.errorBar)}</p>
                )}
                {chartSpec.chartType === 'boxplot' && (
                  <p className="text-muted-foreground">Whiskers: Tukey 1.5×IQR</p>
                )}
              </div>
            )}

            {/* Export 버튼 */}
            <Button
              className="w-full"
              onClick={onExport}
              disabled={!onExport}
              aria-label={`Export chart as ${chartSpec.exportConfig.format.toUpperCase()}`}
            >
              <Download className="h-4 w-4 mr-2" />
              {chartSpec.exportConfig.format.toUpperCase()} 내보내기
            </Button>

            {/* ── 논문용 내보내기 (matplotlib) ── */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">논문용 내보내기</span>
              </div>

              <p className="text-xs text-muted-foreground">
                matplotlib + SciencePlots로 저널 투고 품질 출력 (PDF/TIFF/EPS)
              </p>

              {!isMplSupported && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  현재 차트 타입({chartSpec?.chartType})은 논문용 내보내기 미지원. Bar, Line, Scatter만 지원합니다.
                </p>
              )}

              {/* 포맷 + 스타일 */}
              <div className="flex gap-1.5">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">포맷</Label>
                  <Select value={mplFormat} onValueChange={(v) => setMplFormat(v as MatplotlibExportFormat)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MPL_FORMAT_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value} className="text-sm">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">스타일</Label>
                  <Select value={mplStyle} onValueChange={(v) => setMplStyle(v as MatplotlibStylePreset)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MPL_STYLE_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value} className="text-sm">
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* DPI */}
              <div className="space-y-1">
                <Label className="text-xs">DPI</Label>
                <Select value={String(mplDpi)} onValueChange={(v) => setMplDpi(Number(v))}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DPI_OPTIONS.map(dpi => (
                      <SelectItem key={dpi} value={String(dpi)} className="text-sm">
                        {dpi} DPI {dpi === 300 ? '(권장)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* TIFF + 고DPI 경고 */}
              {mplFormat === 'tiff' && mplDpi >= 600 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  TIFF 600 DPI는 파일 크기가 20-30MB 이상 될 수 있습니다.
                </p>
              )}

              {/* 에러 표시 */}
              {mplError && (
                <p className="text-xs text-destructive">{mplError}</p>
              )}

              {/* 미지원 옵션 경고 (export 완료 후에도 유지) */}
              {mplWarnings.length > 0 && (
                <div className="text-xs bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2 space-y-1">
                  <p className="font-medium text-amber-700 dark:text-amber-300">미지원 옵션 경고:</p>
                  {mplWarnings.map((w, i) => (
                    <p key={i} className="text-amber-600 dark:text-amber-400">• {w}</p>
                  ))}
                </div>
              )}

              {/* 진행 상태 */}
              {isMplExporting && mplProgress && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {mplProgress}
                </p>
              )}

              {/* 논문용 내보내기 버튼 */}
              <Button
                className="w-full"
                variant="secondary"
                disabled={isMplExporting || !isMplSupported}
                onClick={handleMatplotlibExport}
              >
                {isMplExporting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                {isMplExporting ? '렌더링 중...' : `${mplFormat.toUpperCase()} 논문용 내보내기`}
              </Button>

              <p className="text-xs text-muted-foreground/60">
                처음 사용 시 matplotlib 로딩에 약 5초 소요됩니다.
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
