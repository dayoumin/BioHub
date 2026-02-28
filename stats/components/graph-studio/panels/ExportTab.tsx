'use client';

/**
 * Export 탭 — SVG/PNG 내보내기 설정
 *
 * Stage 3 구현 예정: ECharts getDataURL(format, pixelRatio) 연결
 */

import { useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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

export function ExportTab(): React.ReactElement {
  const { chartSpec, updateChartSpec } = useGraphStudioStore();

  const handleFormatChange = useCallback((value: string) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      exportConfig: {
        ...chartSpec.exportConfig,
        format: value as ExportFormat,
      },
    });
  }, [chartSpec, updateChartSpec]);

  const handleDpiChange = useCallback((value: string) => {
    if (!chartSpec) return;
    updateChartSpec({
      ...chartSpec,
      exportConfig: {
        ...chartSpec.exportConfig,
        dpi: Number(value),
      },
    });
  }, [chartSpec, updateChartSpec]);

  const handleWidthChange = useCallback((value: string) => {
    if (!chartSpec) return;
    const width = Number(value);
    if (width > 0) {
      updateChartSpec({
        ...chartSpec,
        exportConfig: {
          ...chartSpec.exportConfig,
          width,
        },
      });
    }
  }, [chartSpec, updateChartSpec]);

  const handleHeightChange = useCallback((value: string) => {
    if (!chartSpec) return;
    const height = Number(value);
    if (height > 0) {
      updateChartSpec({
        ...chartSpec,
        exportConfig: {
          ...chartSpec.exportConfig,
          height,
        },
      });
    }
  }, [chartSpec, updateChartSpec]);

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

      {/* 크기 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">너비 (px)</Label>
          <Input
            type="number"
            value={exportConfig.width}
            onChange={(e) => handleWidthChange(e.target.value)}
            className="h-8 text-sm"
            min={100}
            max={4000}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">높이 (px)</Label>
          <Input
            type="number"
            value={exportConfig.height}
            onChange={(e) => handleHeightChange(e.target.value)}
            className="h-8 text-sm"
            min={100}
            max={4000}
          />
        </div>
      </div>

      {/* Export 버튼 — Stage 3에서 활성화 */}
      <Button className="w-full" disabled>
        <Download className="h-4 w-4 mr-2" />
        {exportConfig.format.toUpperCase()} 내보내기
      </Button>

      <p className="text-xs text-muted-foreground">
        내보내기는 Stage 3에서 구현 예정입니다
        (ECharts getDataURL 연결 필요)
      </p>
    </div>
  );
}
