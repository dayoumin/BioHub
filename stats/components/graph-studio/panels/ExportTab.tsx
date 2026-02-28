'use client';

/**
 * Export 탭 — SVG/PNG 내보내기 설정
 *
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
import { Download } from 'lucide-react';
import { JOURNAL_SIZE_PRESETS, mmToPx } from '@/lib/graph-studio';
import type { ExportFormat } from '@/types/graph-studio';

const DPI_OPTIONS = [72, 150, 300, 600] as const;

// ECharts getDataURL가 지원하는 포맷만 노출 (TIFF/PDF 제외)
const SUPPORTED_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'svg', label: 'SVG (벡터)' },
  { value: 'png', label: 'PNG (래스터)' },
];

interface ExportTabProps {
  /** Export 실행 핸들러 (GraphStudioPage에서 주입) */
  onExport?: () => void;
}

export function ExportTab({ onExport }: ExportTabProps): React.ReactElement {
  const { chartSpec, setExportConfig } = useGraphStudioStore();

  // 물리적 크기 로컬 state — onBlur 시 setExportConfig (undo 히스토리 제외 의도)
  const [widthInput, setWidthInput] = useState(
    chartSpec?.exportConfig.physicalWidth !== undefined
      ? String(chartSpec.exportConfig.physicalWidth)
      : '',
  );
  const [heightInput, setHeightInput] = useState(
    chartSpec?.exportConfig.physicalHeight !== undefined
      ? String(chartSpec.exportConfig.physicalHeight)
      : '',
  );

  // AI 편집 등 외부 변경 동기화
  useEffect(() => {
    setWidthInput(
      chartSpec?.exportConfig.physicalWidth !== undefined
        ? String(chartSpec.exportConfig.physicalWidth)
        : '',
    );
    setHeightInput(
      chartSpec?.exportConfig.physicalHeight !== undefined
        ? String(chartSpec.exportConfig.physicalHeight)
        : '',
    );
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
    // heightInput에 이미 타이핑된 값이 있으면 함께 반영 (blur 전에도 존중)
    const h = parseFloat(heightInput);
    setExportConfig({
      ...chartSpec.exportConfig,
      physicalWidth: width,
      physicalHeight: !isNaN(h) && h > 0 ? h : chartSpec.exportConfig.physicalHeight,
    });
  }, [chartSpec, heightInput, setExportConfig]);

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  const { exportConfig } = chartSpec;
  const parsedW = parseFloat(widthInput);
  const parsedH = parseFloat(heightInput);
  const showPixelPreview = !isNaN(parsedW) && parsedW > 0 && !isNaN(parsedH) && parsedH > 0;

  return (
    <div className="space-y-4">
      {/* 포맷 */}
      <div className="space-y-1.5">
        <Label className="text-xs">포맷</Label>
        <Select value={exportConfig.format} onValueChange={handleFormatChange}>
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
      {exportConfig.format === 'png' && (
        <div className="space-y-1.5">
          <Label className="text-xs">DPI</Label>
          <Select value={String(exportConfig.dpi)} onValueChange={handleDpiChange}>
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
          {JOURNAL_SIZE_PRESETS.map(({ key, label, width }) => (
            <button
              key={key}
              type="button"
              onClick={() => handleJournalPreset(width)}
              className="text-xs border border-border rounded px-1.5 py-0.5 hover:bg-muted transition-colors"
              title={`너비 ${width}mm`}
            >
              {label}
            </button>
          ))}
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

        {/* 픽셀 미리보기 */}
        {showPixelPreview ? (
          <p className="text-xs text-muted-foreground">
            {mmToPx(parsedW, exportConfig.dpi)} × {mmToPx(parsedH, exportConfig.dpi)} px
            ({exportConfig.dpi} DPI 기준)
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            빈칸이면 현재 차트 패널 크기로 출력됩니다.
          </p>
        )}
      </div>

      {/* Export 버튼 */}
      <Button
        className="w-full"
        onClick={onExport}
        disabled={!onExport}
        aria-label={`Export chart as ${exportConfig.format.toUpperCase()}`}
      >
        <Download className="h-4 w-4 mr-2" />
        {exportConfig.format.toUpperCase()} 내보내기
      </Button>
    </div>
  );
}
