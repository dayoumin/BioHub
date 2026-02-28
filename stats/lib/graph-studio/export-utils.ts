/**
 * Graph Studio — ECharts 내보내기 유틸리티
 *
 * ECharts instance.getDataURL() → 브라우저 다운로드
 * PNG: Canvas renderer + pixelRatio(DPI 환산)
 * SVG: SVG renderer + getSvgDataURL()
 */

import type { EChartsType } from 'echarts';
import type { ExportConfig } from '@/types/graph-studio';

/** DPI → pixelRatio 변환 (기준 96 DPI) */
function dpiToPixelRatio(dpi: number): number {
  return Math.max(1, Math.round(dpi / 96));
}

/**
 * ECharts 인스턴스에서 Data URL을 추출해 파일로 다운로드.
 *
 * SVG 렌더러와 Canvas 렌더러에서 각각 올바른 메서드를 사용.
 */
export function downloadChart(
  echartsInstance: EChartsType | null | undefined,
  config: ExportConfig,
  filename: string | undefined,
): void {
  if (!echartsInstance) return;

  let dataUrl: string;

  if (config.format === 'svg') {
    // SVG 렌더러 전용 — ReactECharts opts.renderer='svg' 설정 필요
    dataUrl = echartsInstance.getSvgDataURL();
  } else {
    // Canvas 렌더러 (기본) — PNG export
    const pixelRatio = dpiToPixelRatio(config.dpi);
    dataUrl = echartsInstance.getDataURL({
      type: 'png',
      pixelRatio,
      backgroundColor: '#ffffff',
    });
  }

  const ext = config.format === 'svg' ? 'svg' : 'png';
  const safeFilename = (filename ?? 'chart').replace(/[^\w\-]/g, '_') || 'chart';

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${safeFilename}.${ext}`;
  link.click();
}
