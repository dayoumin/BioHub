'use client';

/**
 * 캔버스 미니 툴바 (G5.5)
 *
 * ChartPreview 위 플로팅 오버레이.
 * 줌인/아웃/리셋 + 복사 + 빠른 내보내기 버튼.
 *
 * hover 시에만 표시 (opacity transition).
 */

import { useCallback } from 'react';
import type { RefObject } from 'react';
import type EChartsReactCore from 'echarts-for-react/lib/core';
import { ZoomIn, ZoomOut, Maximize, Copy, Download } from 'lucide-react';
import { toast } from 'sonner';
import { TOAST } from '@/lib/constants/toast-messages';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CanvasToolbarProps {
  echartsRef: RefObject<EChartsReactCore | null>;
  onExport?: () => void;
  /** false면 줌 버튼 비활성화 (heatmap/facet 등 dataZoom 미지원 차트) */
  zoomEnabled?: boolean;
}

export function CanvasToolbar({ echartsRef, onExport, zoomEnabled = true }: CanvasToolbarProps): React.ReactElement {
  const dispatchZoom = useCallback((start: number, end: number) => {
    const instance = echartsRef.current?.getEchartsInstance();
    if (!instance) return;
    instance.dispatchAction({
      type: 'dataZoom',
      dataZoomIndex: 0,
      start,
      end,
    });
  }, [echartsRef]);

  const handleZoomIn = useCallback(() => {
    const instance = echartsRef.current?.getEchartsInstance();
    if (!instance) return;
    // 현재 줌 범위에서 25% 축소 (중심 기준)
    const opt = instance.getOption() as Record<string, unknown>;
    const dz = Array.isArray(opt.dataZoom) ? opt.dataZoom[0] as Record<string, unknown> : null;
    const curStart = (dz?.start as number) ?? 0;
    const curEnd = (dz?.end as number) ?? 100;
    const range = curEnd - curStart;
    const shrink = range * 0.25;
    dispatchZoom(
      Math.min(curStart + shrink, 45),
      Math.max(curEnd - shrink, 55),
    );
  }, [echartsRef, dispatchZoom]);

  const handleZoomOut = useCallback(() => {
    const instance = echartsRef.current?.getEchartsInstance();
    if (!instance) return;
    const opt = instance.getOption() as Record<string, unknown>;
    const dz = Array.isArray(opt.dataZoom) ? opt.dataZoom[0] as Record<string, unknown> : null;
    const curStart = (dz?.start as number) ?? 0;
    const curEnd = (dz?.end as number) ?? 100;
    const range = curEnd - curStart;
    const expand = range * 0.25;
    dispatchZoom(
      Math.max(curStart - expand, 0),
      Math.min(curEnd + expand, 100),
    );
  }, [echartsRef, dispatchZoom]);

  const handleReset = useCallback(() => {
    dispatchZoom(0, 100);
    // Y축 dataZoom도 리셋 (scatter의 경우)
    const instance = echartsRef.current?.getEchartsInstance();
    if (!instance) return;
    const opt = instance.getOption() as Record<string, unknown>;
    if (Array.isArray(opt.dataZoom) && opt.dataZoom.length > 1) {
      instance.dispatchAction({
        type: 'dataZoom',
        dataZoomIndex: 1,
        start: 0,
        end: 100,
      });
    }
  }, [echartsRef, dispatchZoom]);

  const handleCopyChart = useCallback(async () => {
    const instance = echartsRef.current?.getEchartsInstance();
    if (!instance) return;
    try {
      const dataURL = instance.getDataURL({ type: 'png', pixelRatio: 2 });
      if (typeof ClipboardItem !== 'undefined') {
        const res = await fetch(dataURL);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
      } else {
        await navigator.clipboard.writeText(dataURL);
      }
      toast.success(TOAST.clipboard.chartCopySuccess);
    } catch {
      toast.error(TOAST.clipboard.chartCopyError);
    }
  }, [echartsRef]);

  const actions = [
    { icon: ZoomIn, label: '줌인', onClick: handleZoomIn, disabled: !zoomEnabled, testId: undefined },
    { icon: ZoomOut, label: '줌아웃', onClick: handleZoomOut, disabled: !zoomEnabled, testId: undefined },
    { icon: Maximize, label: '줌 리셋', onClick: handleReset, disabled: !zoomEnabled, testId: undefined },
    { icon: Copy, label: '클립보드 복사', onClick: handleCopyChart, disabled: false, testId: 'canvas-copy-btn' },
    ...(onExport ? [{ icon: Download, label: '내보내기', onClick: onExport, disabled: false, testId: undefined }] : []),
  ];

  return (
    <div
      className="absolute top-2 right-2 flex gap-0.5 rounded-md border border-border/50 bg-background/80 backdrop-blur-sm p-0.5 opacity-0 group-hover/canvas:opacity-100 transition-opacity duration-200 z-10"
      data-testid="canvas-toolbar"
    >
      {actions.map(({ icon: Icon, label, onClick, disabled, testId }) => (
        <Tooltip key={label}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={onClick}
              disabled={disabled}
              className={[
                'h-7 w-7 flex items-center justify-center rounded transition-colors',
                disabled
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
              aria-label={label}
              data-testid={testId}
            >
              <Icon className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
