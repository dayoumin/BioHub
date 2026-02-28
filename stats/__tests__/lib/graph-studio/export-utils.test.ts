/**
 * export-utils 테스트
 *
 * DOM API / ECharts 인스턴스 모킹으로 downloadChart 동작 시뮬레이션
 *
 * 검증 범위:
 * - null/undefined 인스턴스 조기 반환
 * - PNG: getDataURL 호출 + DPI→pixelRatio 변환
 * - SVG: getSvgDataURL 호출 (getDataURL 미호출)
 * - 파일명 정규화 (특수문자, undefined, 빈 문자열)
 * - Firefox 호환: body.appendChild → click → body.removeChild 순서 보장
 * - link.href / link.download 올바르게 설정
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadChart } from '@/lib/graph-studio/export-utils';
import type { ExportConfig } from '@/types/graph-studio';
import type { EChartsType } from 'echarts';

// ─── 픽스처 ────────────────────────────────────────────────

const MOCK_PNG_URL = 'data:image/png;base64,iVBORabc';
const MOCK_SVG_URL = 'data:image/svg+xml;base64,PHN2Zzx5eik=';

function makeMockECharts(overrides: Partial<{
  getDataURL: () => string;
  getSvgDataURL: () => string;
}> = {}): EChartsType {
  return {
    getDataURL: vi.fn().mockReturnValue(MOCK_PNG_URL),
    getSvgDataURL: vi.fn().mockReturnValue(MOCK_SVG_URL),
    ...overrides,
  } as unknown as EChartsType;
}

function makeConfig(overrides: Partial<ExportConfig> = {}): ExportConfig {
  return {
    format: 'png',
    dpi: 96,
    ...overrides,
  };
}

// ─── DOM 모킹 헬퍼 ─────────────────────────────────────────

interface MockLink {
  href: string;
  download: string;
  click: ReturnType<typeof vi.fn>;
}

function setupDomMocks(): MockLink {
  const link: MockLink = { href: '', download: '', click: vi.fn() };
  vi.spyOn(document, 'createElement').mockReturnValue(link as unknown as HTMLAnchorElement);
  vi.spyOn(document.body, 'appendChild').mockReturnValue(link as unknown as Node);
  vi.spyOn(document.body, 'removeChild').mockReturnValue(link as unknown as Node);
  return link;
}

// ─── 테스트 ────────────────────────────────────────────────

describe('downloadChart', () => {
  let mockLink: MockLink;

  beforeEach(() => {
    mockLink = setupDomMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── null/undefined 가드 ──────────────────────────────────

  it('echartsInstance가 null이면 DOM 접근 없이 조기 반환', () => {
    downloadChart(null, makeConfig(), 'chart');
    expect(document.createElement).not.toHaveBeenCalled();
    expect(document.body.appendChild).not.toHaveBeenCalled();
  });

  it('echartsInstance가 undefined이면 DOM 접근 없이 조기 반환', () => {
    downloadChart(undefined, makeConfig(), 'chart');
    expect(document.createElement).not.toHaveBeenCalled();
    expect(document.body.appendChild).not.toHaveBeenCalled();
  });

  // ── PNG export ───────────────────────────────────────────

  it('PNG: getDataURL 호출 + 올바른 파라미터 (96dpi → pixelRatio=1)', () => {
    const echarts = makeMockECharts();
    downloadChart(echarts, makeConfig({ format: 'png', dpi: 96 }), 'result');

    expect(echarts.getDataURL).toHaveBeenCalledWith({
      type: 'png',
      pixelRatio: 1,
      backgroundColor: '#ffffff',
    });
    expect(mockLink.download).toBe('result.png');
  });

  it('PNG: 192dpi → pixelRatio=2 (HiDPI)', () => {
    const echarts = makeMockECharts();
    downloadChart(echarts, makeConfig({ format: 'png', dpi: 192 }), 'chart');

    expect(echarts.getDataURL).toHaveBeenCalledWith(
      expect.objectContaining({ pixelRatio: 2 }),
    );
  });

  it('PNG: 288dpi → pixelRatio=3 (인쇄 품질)', () => {
    const echarts = makeMockECharts();
    downloadChart(echarts, makeConfig({ format: 'png', dpi: 288 }), 'chart');

    expect(echarts.getDataURL).toHaveBeenCalledWith(
      expect.objectContaining({ pixelRatio: 3 }),
    );
  });

  it('PNG: link.href에 getDataURL 반환값 할당', () => {
    const echarts = makeMockECharts();
    downloadChart(echarts, makeConfig({ format: 'png' }), 'chart');
    expect(mockLink.href).toBe(MOCK_PNG_URL);
  });

  // ── SVG export ───────────────────────────────────────────

  it('SVG: getSvgDataURL 호출 + getDataURL 미호출', () => {
    const echarts = makeMockECharts();
    downloadChart(echarts, makeConfig({ format: 'svg' }), 'figure');

    expect(echarts.getSvgDataURL).toHaveBeenCalled();
    expect(echarts.getDataURL).not.toHaveBeenCalled();
    expect(mockLink.download).toBe('figure.svg');
  });

  it('SVG: link.href에 getSvgDataURL 반환값 할당', () => {
    const echarts = makeMockECharts();
    downloadChart(echarts, makeConfig({ format: 'svg' }), 'figure');
    expect(mockLink.href).toBe(MOCK_SVG_URL);
  });

  // ── 파일명 정규화 ─────────────────────────────────────────

  it('파일명 undefined → "chart" 폴백', () => {
    downloadChart(makeMockECharts(), makeConfig(), undefined);
    expect(mockLink.download).toBe('chart.png');
  });

  it('파일명 빈 문자열 → "chart" 폴백 (|| fallback)', () => {
    downloadChart(makeMockECharts(), makeConfig(), '');
    expect(mockLink.download).toBe('chart.png');
  });

  it('파일명의 공백과 특수문자는 언더스코어로 치환', () => {
    downloadChart(makeMockECharts(), makeConfig(), 'my chart (2024)');
    // "my chart (2024)" → "my_chart__2024_"
    expect(mockLink.download).toBe('my_chart__2024_.png');
  });

  it('파일명 영숫자와 하이픈은 그대로 유지', () => {
    downloadChart(makeMockECharts(), makeConfig(), 'bar-chart-2024');
    expect(mockLink.download).toBe('bar-chart-2024.png');
  });

  // ── Firefox 호환: DOM 조작 순서 ──────────────────────────

  it('body.appendChild → click → body.removeChild 순서 보장', () => {
    const order: string[] = [];

    vi.spyOn(document.body, 'appendChild').mockImplementation(() => {
      order.push('append');
      return mockLink as unknown as Node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => {
      order.push('remove');
      return mockLink as unknown as Node;
    });
    mockLink.click = vi.fn().mockImplementation(() => { order.push('click'); });

    downloadChart(makeMockECharts(), makeConfig(), 'chart');

    expect(order).toEqual(['append', 'click', 'remove']);
  });

  it('document.createElement("a")로 링크 생성', () => {
    downloadChart(makeMockECharts(), makeConfig(), 'chart');
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  // ── 통합: 완전한 PNG 다운로드 흐름 ──────────────────────

  it('PNG 전체 흐름: ECharts 호출 → href/download 설정 → DOM 클릭', () => {
    const echarts = makeMockECharts();
    downloadChart(echarts, makeConfig({ format: 'png', dpi: 96 }), 'species-weight');

    // ECharts
    expect(echarts.getDataURL).toHaveBeenCalledOnce();

    // Link 설정
    expect(mockLink.href).toBe(MOCK_PNG_URL);
    expect(mockLink.download).toBe('species-weight.png');

    // DOM
    expect(document.body.appendChild).toHaveBeenCalledWith(mockLink);
    expect(mockLink.click).toHaveBeenCalledOnce();
    expect(document.body.removeChild).toHaveBeenCalledWith(mockLink);
  });

  it('SVG 전체 흐름: getSvgDataURL → href/download 설정 → DOM 클릭', () => {
    const echarts = makeMockECharts();
    downloadChart(echarts, makeConfig({ format: 'svg' }), 'fig-1');

    expect(echarts.getSvgDataURL).toHaveBeenCalledOnce();
    expect(mockLink.href).toBe(MOCK_SVG_URL);
    expect(mockLink.download).toBe('fig-1.svg');
    expect(mockLink.click).toHaveBeenCalledOnce();
  });
});
