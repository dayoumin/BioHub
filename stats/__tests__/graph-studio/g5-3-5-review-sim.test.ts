/**
 * G5.3~G5.5 리뷰 시뮬레이션 테스트
 *
 * 목적: G5.3(아이콘 그리드), G5.4(dataZoom), G5.5(캔버스 툴바)의
 *       핵심 로직을 순수 함수/스토어 수준에서 검증.
 *
 * 구성:
 *   SIM-1: chart-icons.ts — 12 ChartType 아이콘 완전 매핑 검증
 *   SIM-2: dataZoom 병합 로직 — heatmap/facet 제외, scatter Y축 추가
 *   SIM-3: CanvasToolbar 줌 계산 로직 — 경계 조건 검증
 *   SIM-4: zoomEnabled 조건 — heatmap/facet → disabled
 */

import { CHART_TYPE_ICONS } from '@/lib/graph-studio/chart-icons';
import { CHART_TYPE_HINTS, JOURNAL_SIZE_PRESETS } from '@/lib/graph-studio/chart-spec-defaults';
import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter';
import { resolvePreviewCanvasSize } from '@/components/graph-studio/ChartPreview';
import type { ChartSpec, ChartType } from '@/types/graph-studio';

// ─── 픽스처 ─────────────────────────────────────────────────

const BASIC_COLUMNS: ChartSpec['data']['columns'] = [
  { name: 'category', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B', 'C'], hasNull: false },
  { name: 'value', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20', '15'], hasNull: false },
];

const BASIC_ROWS = [
  { category: 'A', value: 10 },
  { category: 'B', value: 20 },
  { category: 'C', value: 15 },
];

const SCATTER_COLUMNS: ChartSpec['data']['columns'] = [
  { name: 'x', type: 'quantitative', uniqueCount: 3, sampleValues: ['1', '2', '3'], hasNull: false },
  { name: 'y', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20', '15'], hasNull: false },
];

const SCATTER_ROWS = [
  { x: 1, y: 10 },
  { x: 2, y: 20 },
  { x: 3, y: 15 },
];

function makeSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    data: { sourceId: 'test', columns: BASIC_COLUMNS },
    encoding: {
      x: { field: 'category', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
    ...overrides,
  };
}

// ─── G5.4 dataZoom 병합 로직 시뮬레이션 ──────────────────────

/**
 * ChartPreview의 dataZoom 병합 로직을 순수 함수로 추출.
 * 원본: ChartPreview.tsx L230-244
 */
function mergeDataZoom(
  baseOption: Record<string, unknown> | null,
  chartSpec: ChartSpec | null,
): Record<string, unknown> | null {
  if (!baseOption || !chartSpec) return baseOption;
  const noZoom = chartSpec.chartType === 'heatmap' || !!chartSpec.facet;
  if (noZoom) return baseOption;

  const isScatter = chartSpec.chartType === 'scatter';
  const dataZoom: Record<string, unknown>[] = [
    { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
  ];
  if (isScatter) {
    dataZoom.push({ type: 'inside', yAxisIndex: 0, filterMode: 'none' });
  }
  return { ...baseOption, dataZoom };
}

// ─── G5.5 줌 계산 로직 시뮬레이션 ───────────────────────────

/**
 * CanvasToolbar의 줌인 계산 로직.
 * 원본: CanvasToolbar.tsx L35-50
 */
function calcZoomIn(curStart: number, curEnd: number): { start: number; end: number } {
  const range = curEnd - curStart;
  const shrink = range * 0.25;
  return {
    start: Math.min(curStart + shrink, 45),
    end: Math.max(curEnd - shrink, 55),
  };
}

/**
 * CanvasToolbar의 줌아웃 계산 로직.
 * 원본: CanvasToolbar.tsx L51-66
 */
function calcZoomOut(curStart: number, curEnd: number): { start: number; end: number } {
  const range = curEnd - curStart;
  const expand = range * 0.25;
  return {
    start: Math.max(curStart - expand, 0),
    end: Math.min(curEnd + expand, 100),
  };
}

/**
 * zoomEnabled 조건 시뮬레이션.
 * 원본: ChartPreview.tsx L308
 */
function isZoomEnabled(spec: ChartSpec): boolean {
  return spec.chartType !== 'heatmap' && !spec.facet;
}

// ─── SIM-1: chart-icons.ts 완전성 검증 ──────────────────────

describe('SIM-1: CHART_TYPE_ICONS 완전 매핑', () => {
  const allChartTypes = Object.keys(CHART_TYPE_HINTS) as ChartType[];

  it('CHART_TYPE_HINTS의 모든 12 ChartType에 대응 아이콘이 존재', () => {
    expect(allChartTypes.length).toBe(12);
    for (const type of allChartTypes) {
      expect(CHART_TYPE_ICONS[type]).toBeDefined();
      // lucide-react 아이콘은 function 또는 React.memo(object) 가능
      expect(['function', 'object']).toContain(typeof CHART_TYPE_ICONS[type]);
    }
  });

  it('CHART_TYPE_ICONS에 없는 키가 없음 (역방향 검증)', () => {
    const iconKeys = Object.keys(CHART_TYPE_ICONS);
    const hintKeys = Object.keys(CHART_TYPE_HINTS);
    expect(iconKeys.sort()).toEqual(hintKeys.sort());
  });

  it('각 아이콘이 고유함 (중복 매핑 없음)', () => {
    const icons = Object.values(CHART_TYPE_ICONS);
    const uniqueIcons = new Set(icons);
    expect(uniqueIcons.size).toBe(icons.length);
  });
});

describe('SIM-1B: ChartPreview fixed canvas sizing', () => {
  it('uses a fixed default preview sheet instead of filling the editor viewport', () => {
    expect(resolvePreviewCanvasSize({ format: 'png', dpi: 300 })).toEqual({
      width: 960,
      height: 600,
    });
  });

  it('preserves explicit physical width/height ratio inside the fixed preview sheet', () => {
    expect(resolvePreviewCanvasSize({
      format: 'png',
      dpi: 300,
      physicalWidth: 120,
      physicalHeight: 60,
    })).toEqual({
      width: 960,
      height: 480,
    });
  });

  it('reflects width-only export sizing by deriving aspect from the preserved preview height', () => {
    expect(resolvePreviewCanvasSize({
      format: 'png',
      dpi: 300,
      physicalWidth: 86,
    })).toEqual({
      width: 960,
      height: 567,
    });
  });

  it('reflects height-only export sizing by deriving aspect from the preserved preview width', () => {
    expect(resolvePreviewCanvasSize({
      format: 'png',
      dpi: 300,
      physicalHeight: 60,
    })).toEqual({
      width: 812,
      height: 600,
    });
  });

  it('journal presets define physical size and DPI without enforcing preview style changes', () => {
    const nature = JOURNAL_SIZE_PRESETS.find((preset) => preset.key === 'nature-single');
    const ieee = JOURNAL_SIZE_PRESETS.find((preset) => preset.key === 'ieee-single');

    expect(nature).toMatchObject({
      width: 86,
      height: 60,
      dpi: 300,
    });
    expect(ieee).toMatchObject({
      width: 89,
      height: 58,
      dpi: 300,
    });
  });
});

// ─── SIM-2: dataZoom 병합 로직 검증 ────────────────────────

describe('SIM-2: dataZoom 병합 로직', () => {
  it('bar 차트에 X축 dataZoom 추가', () => {
    const spec = makeSpec({ chartType: 'bar' });
    const base = chartSpecToECharts(spec, BASIC_ROWS);
    const result = mergeDataZoom(base, spec);

    expect(result).not.toBeNull();
    const dz = (result as Record<string, unknown>).dataZoom as Record<string, unknown>[];
    expect(dz).toHaveLength(1);
    expect(dz[0]).toEqual({ type: 'inside', xAxisIndex: 0, filterMode: 'none' });
  });

  it('scatter 차트에 X축 + Y축 dataZoom 추가', () => {
    const spec = makeSpec({
      chartType: 'scatter',
      data: { sourceId: 'test', columns: SCATTER_COLUMNS },
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
      },
    });
    const base = chartSpecToECharts(spec, SCATTER_ROWS);
    const result = mergeDataZoom(base, spec);

    const dz = (result as Record<string, unknown>).dataZoom as Record<string, unknown>[];
    expect(dz).toHaveLength(2);
    expect(dz[0]).toEqual({ type: 'inside', xAxisIndex: 0, filterMode: 'none' });
    expect(dz[1]).toEqual({ type: 'inside', yAxisIndex: 0, filterMode: 'none' });
  });

  it('heatmap 차트는 dataZoom 추가 안 함', () => {
    const spec = makeSpec({ chartType: 'heatmap' });
    const base = chartSpecToECharts(spec, BASIC_ROWS);
    const result = mergeDataZoom(base, spec);

    // heatmap → baseOption 그대로 반환 (dataZoom 없음)
    expect((result as Record<string, unknown>).dataZoom).toBeUndefined();
  });

  it('facet 활성 차트는 dataZoom 추가 안 함', () => {
    const spec = makeSpec({
      chartType: 'bar',
      facet: { field: 'category', ncol: 2 },
    });
    const base = { series: [], xAxis: {}, yAxis: {} }; // simplified
    const result = mergeDataZoom(base, spec);

    expect((result as Record<string, unknown>).dataZoom).toBeUndefined();
  });

  it('null baseOption에 대해 null 반환', () => {
    const spec = makeSpec();
    expect(mergeDataZoom(null, spec)).toBeNull();
  });

  it('null chartSpec에 대해 baseOption 그대로 반환', () => {
    const base = { series: [] };
    expect(mergeDataZoom(base, null)).toEqual(base);
  });

  it('line 차트에 X축 dataZoom만 추가 (Y축 없음)', () => {
    const spec = makeSpec({ chartType: 'line' });
    const base = chartSpecToECharts(spec, BASIC_ROWS);
    const result = mergeDataZoom(base, spec);

    const dz = (result as Record<string, unknown>).dataZoom as Record<string, unknown>[];
    expect(dz).toHaveLength(1);
    expect(dz[0]).toMatchObject({ xAxisIndex: 0 });
  });
});

// ─── SIM-3: 줌 계산 로직 경계 조건 검증 ──────────────────────

describe('SIM-3: 줌 계산 로직', () => {
  describe('줌인', () => {
    it('기본 범위(0-100)에서 25% 축소 → 25-75', () => {
      const result = calcZoomIn(0, 100);
      expect(result.start).toBe(25);
      expect(result.end).toBe(75);
    });

    it('이미 좁은 범위(40-60)에서 최소 범위(45-55) 클램프', () => {
      const result = calcZoomIn(40, 60);
      // range=20, shrink=5 → start=45, end=55
      expect(result.start).toBe(45);
      expect(result.end).toBe(55);
    });

    it('최소 범위(45-55) 도달 후 추가 줌인 불가', () => {
      const result = calcZoomIn(45, 55);
      // range=10, shrink=2.5 → start=min(47.5, 45)=45, end=max(52.5, 55)=55
      expect(result.start).toBe(45);
      expect(result.end).toBe(55);
    });

    it('비대칭 범위(10-90)에서 중심 기준 축소', () => {
      const result = calcZoomIn(10, 90);
      // range=80, shrink=20 → start=30, end=70
      expect(result.start).toBe(30);
      expect(result.end).toBe(70);
    });
  });

  describe('줌아웃', () => {
    it('중간 범위(25-75)에서 25% 확장 → ~12.5-87.5', () => {
      const result = calcZoomOut(25, 75);
      // range=50, expand=12.5
      expect(result.start).toBeCloseTo(12.5);
      expect(result.end).toBeCloseTo(87.5);
    });

    it('전체 범위(0-100)에서 추가 줌아웃 → 0-100 유지', () => {
      const result = calcZoomOut(0, 100);
      expect(result.start).toBe(0);
      expect(result.end).toBe(100);
    });

    it('좌측 경계 근처(5-55)에서 0 클램프', () => {
      const result = calcZoomOut(5, 55);
      // range=50, expand=12.5 → start=max(-7.5, 0)=0, end=min(67.5, 100)=67.5
      expect(result.start).toBe(0);
      expect(result.end).toBeCloseTo(67.5);
    });

    it('우측 경계 근처(45-95)에서 100 클램프', () => {
      const result = calcZoomOut(45, 95);
      // range=50, expand=12.5 → start=32.5, end=min(107.5, 100)=100
      expect(result.start).toBeCloseTo(32.5);
      expect(result.end).toBe(100);
    });
  });
});

// ─── SIM-4: zoomEnabled 조건 검증 ───────────────────────────

describe('SIM-4: zoomEnabled 조건', () => {
  it('bar → 줌 활성', () => {
    expect(isZoomEnabled(makeSpec({ chartType: 'bar' }))).toBe(true);
  });

  it('scatter → 줌 활성', () => {
    expect(isZoomEnabled(makeSpec({ chartType: 'scatter' }))).toBe(true);
  });

  it('line → 줌 활성', () => {
    expect(isZoomEnabled(makeSpec({ chartType: 'line' }))).toBe(true);
  });

  it('heatmap → 줌 비활성', () => {
    expect(isZoomEnabled(makeSpec({ chartType: 'heatmap' }))).toBe(false);
  });

  it('facet 활성 bar → 줌 비활성', () => {
    expect(isZoomEnabled(makeSpec({
      chartType: 'bar',
      facet: { field: 'category', ncol: 2 },
    }))).toBe(false);
  });

  it('facet 활성 scatter → 줌 비활성', () => {
    expect(isZoomEnabled(makeSpec({
      chartType: 'scatter',
      facet: { field: 'category', ncol: 2 },
    }))).toBe(false);
  });

  it('facet 없는 비heatmap 차트 유형은 모두 줌 활성', () => {
    const nonHeatmapTypes: ChartType[] = [
      'bar', 'grouped-bar', 'stacked-bar', 'line', 'scatter',
      'boxplot', 'histogram', 'error-bar', 'violin', 'km-curve', 'roc-curve',
    ];
    for (const type of nonHeatmapTypes) {
      expect(isZoomEnabled(makeSpec({ chartType: type }))).toBe(true);
    }
  });
});
