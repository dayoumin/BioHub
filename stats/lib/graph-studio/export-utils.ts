/**
 * Graph Studio — ECharts 내보내기 유틸리티
 *
 * ECharts instance.getDataURL() → 브라우저 다운로드
 * PNG: Canvas renderer + pixelRatio(DPI 환산) + pHYs DPI 메타데이터 주입
 * SVG: SVG renderer + getSvgDataURL()
 *
 * NOTE: ECharts만으로도 논문 수준 export 가능 (300 DPI, PDF, TIFF 등).
 * matplotlib export는 별도 서비스(matplotlib-export.service.ts)로 제공되며,
 * "불가능해서"가 아니라 SciencePlots 프리셋 등 "편의성" 때문에 추가된 것.
 * 일반 저널 요구사항(300 DPI, TIFF/PDF, Arial)은 이 ECharts 유틸로 충분.
 */

import type { EChartsType } from 'echarts';
import type { ExportConfig } from '@/types/graph-studio';

/**
 * DPI → pixelRatio 변환 (기준 96 DPI).
 * float 그대로 반환 — ECharts는 소수 pixelRatio 허용.
 * 예) 300 DPI → 3.125 (Math.round 사용 시 3 → 실제 288 DPI)
 */
function dpiToPixelRatio(dpi: number): number {
  return Math.max(1, dpi / 96);
}

/**
 * mm → px 변환 (인치 = 25.4mm 기준)
 * 예) 86mm × 300 DPI = 1016 px
 */
export function mmToPx(mm: number, dpi: number): number {
  return Math.round(mm * dpi / 25.4);
}

// ─── PNG pHYs DPI 메타데이터 주입 ──────────────────────────────

/** CRC-32 lookup table (PNG 표준 요구, 256 entry) */
const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint32BE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset]     = (value >>> 24) & 0xff;
  buf[offset + 1] = (value >>> 16) & 0xff;
  buf[offset + 2] = (value >>>  8) & 0xff;
  buf[offset + 3] =  value         & 0xff;
}

function resolveRenderedBackgroundColor(
  echartsInstance: EChartsType,
  config: ExportConfig,
): string {
  if (config.transparentBackground) {
    return 'transparent';
  }

  if (typeof echartsInstance.getOption === 'function') {
    const option = echartsInstance.getOption();
    if (
      option !== null &&
      typeof option === 'object' &&
      'backgroundColor' in option &&
      typeof option.backgroundColor === 'string' &&
      option.backgroundColor.trim() !== ''
    ) {
      return option.backgroundColor;
    }
  }

  return '#ffffff';
}

/**
 * PNG Data URL에 pHYs chunk를 삽입해 DPI 메타데이터를 기록.
 *
 * pHYs 형식 (13 바이트 데이터):
 *   X ppm (4 byte BE) + Y ppm (4 byte BE) + unit (1 byte, 1=metre)
 *
 * 삽입 위치: 8바이트 PNG 서명 + 25바이트 IHDR chunk 직후 (byte 33).
 *
 * 이 메타데이터가 없으면 InDesign/Word 등은 PNG를 96 DPI로 처리함.
 */
function injectPngDpiMetadata(dataUrl: string, dpi: number): string {
  // base64 → Uint8Array
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  const binaryStr = atob(base64);
  const original = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    original[i] = binaryStr.charCodeAt(i);
  }

  // pHYs chunk 구성 (4+4+13+4 = 25 bytes)
  const ppm = Math.round(dpi * 39.3701);  // pixels per metre
  const chunkType = new Uint8Array([0x70, 0x48, 0x59, 0x73]); // "pHYs"
  const chunkData = new Uint8Array(9);
  writeUint32BE(chunkData, 0, ppm);  // X ppm
  writeUint32BE(chunkData, 4, ppm);  // Y ppm
  chunkData[8] = 1;                  // unit = metre

  // CRC covers type + data (13 bytes)
  const crcInput = new Uint8Array(4 + 9);
  crcInput.set(chunkType, 0);
  crcInput.set(chunkData, 4);
  const crcValue = crc32(crcInput);

  // 전체 pHYs chunk: length(4) + type(4) + data(9) + CRC(4) = 21 bytes
  const phys = new Uint8Array(21);
  writeUint32BE(phys, 0, 9);          // data length = 9
  phys.set(chunkType, 4);             // chunk type
  phys.set(chunkData, 8);             // chunk data
  writeUint32BE(phys, 17, crcValue);  // CRC

  // IHDR chunk end = byte 33 (8 sig + 4 length + 4 type + 13 data + 4 CRC)
  const insertAt = 33;
  const result = new Uint8Array(original.length + phys.length);
  result.set(original.subarray(0, insertAt), 0);
  result.set(phys, insertAt);
  result.set(original.subarray(insertAt), insertAt + phys.length);

  // Uint8Array → base64
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < result.length; i += chunkSize) {
    binary += String.fromCharCode(...result.subarray(i, i + chunkSize));
  }
  return `data:image/png;base64,${btoa(binary)}`;
}

/**
 * ECharts 인스턴스에서 Data URL을 추출해 파일로 다운로드.
 *
 * physicalWidth/Height 지정 시: ECharts를 해당 px 크기로 일시 resize → export → DOM 크기로 원복.
 * SVG 렌더러와 Canvas 렌더러에서 각각 올바른 메서드를 사용.
 * PNG 포맷 시 pHYs DPI 메타데이터를 자동 주입.
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
    if (typeof echartsInstance.getSvgDataURL !== 'function') {
      throw new Error('SVG export requires SVG renderer. Set opts.renderer="svg" on the chart instance.');
    }
    dataUrl = echartsInstance.getSvgDataURL();
  } else {
    // Canvas 렌더러 (기본) — PNG export
    // physicalSize 지정 시: resize()로 이미 목표 px에 맞췄으므로 pixelRatio=1
    // physicalSize 미지정 시: DOM 크기 × pixelRatio = 고해상도 PNG
    const pixelRatio = needsResize ? 1 : dpiToPixelRatio(config.dpi);
    const backgroundColor = resolveRenderedBackgroundColor(echartsInstance, config);
    dataUrl = echartsInstance.getDataURL({
      type: 'png',
      pixelRatio,
      backgroundColor,
    });
    // pHYs DPI 메타데이터 주입 (없으면 InDesign 등에서 96 DPI로 처리)
    dataUrl = injectPngDpiMetadata(dataUrl, config.dpi);
  }

  // DOM 크기로 원복
  if (needsResize) {
    echartsInstance.resize();
  }

  const ext = config.format === 'svg' ? 'svg' : 'png';
  const safeFilename = sanitizeFilename(filename);

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${safeFilename}.${ext}`;
  // Firefox 호환: body append 없이 click()이 무시될 수 있음
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ── 공통 유틸 ───────────────────────────────────────────────

/** 파일명에서 안전하지 않은 문자를 underscore로 치환. */
export function sanitizeFilename(name: string | undefined, fallback = 'chart'): string {
  return (name ?? fallback).replace(/[^\w\-]/g, '_') || fallback;
}

// ── matplotlib base64 export 다운로드 ────────────────────────

/**
 * base64 인코딩된 바이너리 데이터를 파일로 다운로드.
 * matplotlib export 결과 (PDF/TIFF/EPS 등) 다운로드에 사용.
 * fetch(data:...) 방식으로 중간 복사 최소화 (대용량 TIFF 대응).
 */
import { MATPLOTLIB_MIME_MAP } from '@/types/matplotlib-export';

/** 허용된 MIME 타입 (MATPLOTLIB_MIME_MAP에서 파생) */
const ALLOWED_MIME_TYPES = new Set(Object.values(MATPLOTLIB_MIME_MAP));

export async function downloadBase64File(
  base64Data: string,
  mimeType: string,
  filename: string,
  extension: string,
): Promise<void> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Unsupported MIME type: ${mimeType}`);
  }
  const res = await fetch(`data:${mimeType};base64,${base64Data}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);

  const safeFilename = sanitizeFilename(filename);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeFilename}.${extension}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
