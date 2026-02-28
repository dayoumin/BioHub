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
import { Download } from 'lucide-react';
import { JOURNAL_SIZE_PRESETS, mmToPx } from '@/lib/graph-studio';
import type { ExportFormat } from '@/types/graph-studio';

const DPI_OPTIONS = [72, 150, 300, 600] as const;

// ECharts getDataURL가 지원하는 포맷만 노출 (TIFF/PDF 제외)
const SUPPORTED_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'svg', label: 'SVG (벡터)' },
  { value: 'png', label: 'PNG (래스터)' },
];

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
    setExportConfig({ ...chartSpec.exportConfig, format: value as ExportFormat });
  }, [chartSpec, setExportConfig]);

  const handleDpiChange = useCallback((value: string) => {
    if (!chartSpec) return;
    setExportConfig({ ...chartSpec.exportConfig, dpi: Number(value) });
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
              {(() => {
                const parsedW = parseFloat(widthInput);
                const parsedH = parseFloat(heightInput);
                const hasW = !isNaN(parsedW) && parsedW > 0;
                const hasH = !isNaN(parsedH) && parsedH > 0;
                const { exportConfig } = chartSpec;

                if (exportConfig.format === 'svg' && (hasW || hasH)) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      SVG 벡터 뷰포트:
                      {hasW ? ` 너비 ${parsedW}mm` : ''}
                      {hasW && hasH ? ' ×' : ''}
                      {hasH ? ` 높이 ${parsedH}mm` : ''}
                    </p>
                  );
                }
                if (hasW || hasH) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      {hasW && hasH
                        ? `${mmToPx(parsedW, exportConfig.dpi)} × ${mmToPx(parsedH, exportConfig.dpi)} px`
                        : hasW
                          ? `너비: ${mmToPx(parsedW, exportConfig.dpi)} px`
                          : `높이: ${mmToPx(parsedH, exportConfig.dpi)} px`}
                      {' '}({exportConfig.dpi} DPI 기준)
                    </p>
                  );
                }
                return (
                  <p className="text-xs text-muted-foreground">
                    빈칸이면 현재 차트 패널 크기로 출력됩니다.
                  </p>
                );
              })()}
            </div>

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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
