'use client';

/**
 * Export 탭 — SVG/PNG 내보내기 설정
 *
 * Stage 3: ECharts getDataURL(format, pixelRatio) 연결 완료
 * onExport: GraphStudioPage → SidePanel → ExportTab으로 주입
 *
 * 주의: ECharts getDataURL은 현재 DOM 크기 기준으로 출력됨.
 *       출력 크기는 DPI(pixelRatio)로만 조정 가능.
 */

import { useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download } from 'lucide-react';
import type { ExportFormat } from '@/types/graph-studio';

const DPI_OPTIONS = [72, 150, 300, 600] as const;

// ECharts getDataURL가 지원하는 포맷만 노출 (TIFF/PDF 제외)
const SUPPORTED_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'svg', label: 'SVG (벡터)' },
  { value: 'png', label: 'PNG (래스터)' },
];

interface ExportTabProps {
  /** Stage 3: Export 실행 핸들러 (GraphStudioPage에서 주입) */
  onExport?: () => void;
}

export function ExportTab({ onExport }: ExportTabProps): React.ReactElement {
  const { chartSpec, setExportConfig } = useGraphStudioStore();

  const handleFormatChange = useCallback((value: string) => {
    if (!chartSpec) return;
    setExportConfig({ ...chartSpec.exportConfig, format: value as ExportFormat });
  }, [chartSpec, setExportConfig]);

  const handleDpiChange = useCallback((value: string) => {
    if (!chartSpec) return;
    setExportConfig({ ...chartSpec.exportConfig, dpi: Number(value) });
  }, [chartSpec, setExportConfig]);

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  const { exportConfig } = chartSpec;

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

      {/* 크기 안내 — ECharts getDataURL은 width/height 파라미터 미지원 */}
      <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        출력 크기는 현재 차트 패널 크기를 따릅니다.<br />
        고해상도 PNG는 DPI를 높여 픽셀 비율을 조정하세요.
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
