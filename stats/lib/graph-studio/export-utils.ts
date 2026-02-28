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
 * mm → px 변환 (인치 = 25.4mm 기준)
 * 예) 86mm × 300 DPI = 1016 px
 */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round(mm * dpi / 25.4);
}

/**
 * ECharts 인스턴스에서 Data URL을 추출해 파일로 다운로드.
 *
 * physicalWidth/Height 지정 시: ECharts를 해당 px 크기로 일시 resize → export → DOM 크기로 원복.
 * SVG 렌더러와 Canvas 렌더러에서 각각 올바른 메서드를 사용.
 */
export function downloadChart(
  echartsInstance: EChartsType | null | undefined,
  config: ExportConfig,
  filename: string | undefined,
): void {
  if (!echartsInstance) return;

  // 물리적 크기 지정 시 일시 resize
  const targetW = config.physicalWidth ? mmToPx(config.physicalWidth, config.dpi) : undefined;
  const targetH = config.physicalHeight ? mmToPx(config.physicalHeight, config.dpi) : undefined;
  const needsResize = targetW !== undefined || targetH !== undefined;

  if (needsResize) {
    echartsInstance.resize({ width: targetW, height: targetH });
  }

  let dataUrl: string;

  if (config.format === 'svg') {
    // SVG 렌더러 전용 — ReactECharts opts.renderer='svg' 설정 필요
    dataUrl = echartsInstance.getSvgDataURL();
  } else {
    // Canvas 렌더러 (기본) — PNG export
    // physicalSize 지정 시: resize()로 이미 목표 px에 맞췄으므로 pixelRatio=1
    // physicalSize 미지정 시: DOM 크기 × pixelRatio = 고해상도 PNG
    const pixelRatio = needsResize ? 1 : dpiToPixelRatio(config.dpi);
    dataUrl = echartsInstance.getDataURL({
      type: 'png',
      pixelRatio,
      backgroundColor: '#ffffff',
    });
  }

  // DOM 크기로 원복
  if (needsResize) {
    echartsInstance.resize();
  }

  const ext = config.format === 'svg' ? 'svg' : 'png';
  const safeFilename = (filename ?? 'chart').replace(/[^\w\-]/g, '_') || 'chart';

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${safeFilename}.${ext}`;
  // Firefox 호환: body append 없이 click()이 무시될 수 있음
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
