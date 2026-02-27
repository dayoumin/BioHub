'use client';

/**
 * Export 탭 — SVG/PNG/PDF 내보내기 설정
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
import { Download, Loader2 } from 'lucide-react';
import type { ExportFormat } from '@/types/graph-studio';

const DPI_OPTIONS = [72, 150, 300, 600] as const;

export function ExportTab(): React.ReactElement {
  const {
    chartSpec,
    isExporting,
    updateChartSpec,
    setExporting,
  } = useGraphStudioStore();

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

  const handleExport = useCallback(async () => {
    if (!chartSpec) return;

    setExporting(true);
    try {
      // TODO: Stage 3에서 구현
      // SVG → Vega-Lite 직접 export
      // PNG → Vega-Lite canvas export
      // PDF → Matplotlib Worker 5 사용
      await new Promise(resolve => setTimeout(resolve, 500));
      // eslint-disable-next-line no-console
      console.log('Export 기능은 Stage 3에서 구현 예정입니다.');
    } finally {
      setExporting(false);
    }
  }, [chartSpec, setExporting]);

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
            <SelectItem value="svg" className="text-sm">SVG (벡터)</SelectItem>
            <SelectItem value="png" className="text-sm">PNG (래스터)</SelectItem>
            <SelectItem value="pdf" className="text-sm">PDF (학술용)</SelectItem>
            <SelectItem value="tiff" className="text-sm">TIFF (고해상도)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DPI (PNG/TIFF만) */}
      {(exportConfig.format === 'png' || exportConfig.format === 'tiff') && (
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

      {/* Export 버튼 */}
      <Button
        className="w-full"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : (
          <Download className="h-4 w-4 mr-2" />
        )}
        {exportConfig.format.toUpperCase()} 내보내기
      </Button>

      {/* 안내 */}
      <p className="text-xs text-muted-foreground">
        SVG/PNG: Vega-Lite 직접 export | PDF/TIFF: Matplotlib (Stage 3)
      </p>
    </div>
  );
}
