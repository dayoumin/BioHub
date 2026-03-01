/**
 * G2-3 이중 Y축 + 패싯 — 기능 검증 테스트
 *
 * 커버 범위:
 *   G2-3-A: 이중 Y축 (bar/line) — yAxis 배열, y2 series, tooltip cross
 *   G2-3-B: 패싯 — grid 배열, series 분할, 제목 graphic
 *   G2-3-C: facet-layout 유틸 — partitionRowsByFacet, computeFacetLayout
 *   G2-3-D: 스키마 검증 — facetSchema, y2 optional
 *   G2-3-E: 상호 배타 — CHART_TYPE_HINTS 플래그
 */

import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { partitionRowsByFacet, computeFacetLayout } from '@/lib/graph-studio/facet-layout';
import { chartSpecSchema } from '@/lib/graph-studio/chart-spec-schema';
import type { ChartSpec } from '@/types/graph-studio';

// ─── 테스트 픽스처 ─────────────────────────────────────────

const BAR_ROWS = [
  { group: 'A', value: 10, temp: 25 },
  { group: 'B', value: 20, temp: 30 },
  { group: 'C', value: 15, temp: 28 },
];

const LINE_ROWS = [
  { month: 'Jan', sales: 100, profit: 20 },
  { month: 'Feb', sales: 150, profit: 35 },
  { month: 'Mar', sales: 130, profit: 25 },
];

const FACET_ROWS = [
  { species: 'Bass', length: 20, weight: 200 },
  { species: 'Bass', length: 25, weight: 350 },
  { species: 'Bream', length: 30, weight: 500 },
  { species: 'Bream', length: 35, weight: 600 },
  { species: 'Carp', length: 28, weight: 400 },
  { species: 'Carp', length: 32, weight: 450 },
];

function makeBarSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    data: {
      sourceId: 'test',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B', 'C'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20', '15'], hasNull: false },
        { name: 'temp', type: 'quantitative', uniqueCount: 3, sampleValues: ['25', '30', '28'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
    ...overrides,
  };
}

function makeLineSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'line',
    data: {
      sourceId: 'test',
      columns: [
        { name: 'month', type: 'nominal', uniqueCount: 3, sampleValues: ['Jan', 'Feb', 'Mar'], hasNull: false },
        { name: 'sales', type: 'quantitative', uniqueCount: 3, sampleValues: ['100', '150', '130'], hasNull: false },
        { name: 'profit', type: 'quantitative', uniqueCount: 3, sampleValues: ['20', '35', '25'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'month', type: 'nominal' },
      y: { field: 'sales', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
    ...overrides,
  };
}

function makeFacetSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    data: {
      sourceId: 'test',
      columns: [
        { name: 'species', type: 'nominal', uniqueCount: 3, sampleValues: ['Bass', 'Bream', 'Carp'], hasNull: false },
        { name: 'length', type: 'quantitative', uniqueCount: 6, sampleValues: ['20', '25', '30', '35', '28'], hasNull: false },
        { name: 'weight', type: 'quantitative', uniqueCount: 6, sampleValues: ['200', '350', '500', '600', '400'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'length', type: 'quantitative' },
      y: { field: 'weight', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
    ...overrides,
  };
}

// ─── G2-3-A: 이중 Y축 ────────────────────────────────────

describe('G2-3-A: Dual Y-axis', () => {
  it('bar: Y2 없으면 yAxis가 단일 객체', () => {
    const option = chartSpecToECharts(makeBarSpec(), BAR_ROWS);
    expect(Array.isArray(option.yAxis)).toBe(false);
  });

  it('bar: Y2 있으면 yAxis 배열, 길이 2', () => {
    const spec = makeBarSpec({
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'temp', type: 'quantitative' },
      },
    });
    const option = chartSpecToECharts(spec, BAR_ROWS);
    expect(Array.isArray(option.yAxis)).toBe(true);
    expect((option.yAxis as unknown[]).length).toBe(2);
  });

  it('bar: Y2 series는 type=line, yAxisIndex=1', () => {
    const spec = makeBarSpec({
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'temp', type: 'quantitative' },
      },
    });
    const option = chartSpecToECharts(spec, BAR_ROWS);
    const series = option.series as Record<string, unknown>[];
    expect(series.length).toBe(2);
    expect(series[1].type).toBe('line');
    expect(series[1].yAxisIndex).toBe(1);
  });

  it('bar: Y2 tooltip은 cross axisPointer', () => {
    const spec = makeBarSpec({
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'temp', type: 'quantitative' },
      },
    });
    const option = chartSpecToECharts(spec, BAR_ROWS);
    const tooltip = option.tooltip as Record<string, unknown>;
    expect((tooltip.axisPointer as Record<string, unknown>).type).toBe('cross');
  });

  it('bar: Y2 오른쪽 축에 position=right', () => {
    const spec = makeBarSpec({
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'temp', type: 'quantitative' },
      },
    });
    const option = chartSpecToECharts(spec, BAR_ROWS);
    const yAxes = option.yAxis as Record<string, unknown>[];
    expect(yAxes[1].position).toBe('right');
  });

  it('line: Y2 있으면 yAxis 배열 + line series 추가', () => {
    const spec = makeLineSpec({
      encoding: {
        x: { field: 'month', type: 'nominal' },
        y: { field: 'sales', type: 'quantitative' },
        y2: { field: 'profit', type: 'quantitative' },
      },
    });
    const option = chartSpecToECharts(spec, LINE_ROWS);
    expect(Array.isArray(option.yAxis)).toBe(true);
    const series = option.series as Record<string, unknown>[];
    expect(series.length).toBe(2);
    expect(series[1].yAxisIndex).toBe(1);
  });

  it('scatter: Y2 지정해도 무시됨 (supportsY2=false)', () => {
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'scatter',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'x', type: 'quantitative', uniqueCount: 3, sampleValues: ['1', '2', '3'], hasNull: false },
          { name: 'y', type: 'quantitative', uniqueCount: 3, sampleValues: ['4', '5', '6'], hasNull: false },
          { name: 'z', type: 'quantitative', uniqueCount: 3, sampleValues: ['7', '8', '9'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'x', type: 'quantitative' },
        y: { field: 'y', type: 'quantitative' },
        y2: { field: 'z', type: 'quantitative' },
      },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };
    const rows = [{ x: 1, y: 4, z: 7 }, { x: 2, y: 5, z: 8 }];
    const option = chartSpecToECharts(spec, rows);
    // scatter는 supportsY2=false이므로 yAxis 배열이 아님
    expect(Array.isArray(option.yAxis)).toBe(false);
  });

  it('bar: Y2 series 색상은 colors[1]', () => {
    const spec = makeBarSpec({
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'temp', type: 'quantitative' },
      },
    });
    const option = chartSpecToECharts(spec, BAR_ROWS);
    const series = option.series as Record<string, unknown>[];
    const y2 = series[1];
    expect((y2.lineStyle as Record<string, unknown>).color).toBeDefined();
    expect((y2.itemStyle as Record<string, unknown>).color).toBeDefined();
  });
});

// ─── G2-3-B: 패싯 ────────────────────────────────────────

describe('G2-3-B: Facet rendering', () => {
  it('facet 없으면 기존 단일 grid', () => {
    const spec = makeFacetSpec({ chartType: 'bar' });
    const option = chartSpecToECharts(spec, FACET_ROWS);
    expect(Array.isArray(option.grid)).toBeFalsy();
  });

  it('facet field → grid 배열, 길이 = 그룹 수', () => {
    const spec = makeFacetSpec({
      chartType: 'bar',
      encoding: {
        x: { field: 'length', type: 'quantitative' },
        y: { field: 'weight', type: 'quantitative' },
      },
      facet: { field: 'species' },
    });
    const option = chartSpecToECharts(spec, FACET_ROWS);
    expect(Array.isArray(option.grid)).toBe(true);
    expect((option.grid as unknown[]).length).toBe(3); // Bass, Bream, Carp
  });

  it('facet → series 수 = 그룹 수', () => {
    const spec = makeFacetSpec({
      chartType: 'bar',
      facet: { field: 'species' },
    });
    const option = chartSpecToECharts(spec, FACET_ROWS);
    expect((option.series as unknown[]).length).toBe(3);
  });

  it('facet → xAxis 배열, 각 gridIndex 매핑', () => {
    const spec = makeFacetSpec({
      chartType: 'bar',
      facet: { field: 'species' },
    });
    const option = chartSpecToECharts(spec, FACET_ROWS);
    const xAxes = option.xAxis as Record<string, unknown>[];
    expect(xAxes.length).toBe(3);
    expect(xAxes[0].gridIndex).toBe(0);
    expect(xAxes[2].gridIndex).toBe(2);
  });

  it('showTitle=false → graphic에 패싯 제목 없음', () => {
    const spec = makeFacetSpec({
      chartType: 'bar',
      facet: { field: 'species', showTitle: false },
    });
    const option = chartSpecToECharts(spec, FACET_ROWS);
    const graphics = option.graphic as Record<string, unknown>[];
    // showTitle=false이면 패싯 제목 graphic이 없어야 함
    const textGraphics = graphics.filter(g => g.type === 'text');
    expect(textGraphics.length).toBe(0);
  });

  it('showTitle=true → graphic에 패싯 제목 포함', () => {
    const spec = makeFacetSpec({
      chartType: 'bar',
      facet: { field: 'species', showTitle: true },
    });
    const option = chartSpecToECharts(spec, FACET_ROWS);
    const graphics = option.graphic as Record<string, unknown>[];
    const textGraphics = graphics.filter(g => g.type === 'text');
    expect(textGraphics.length).toBe(3); // Bass, Bream, Carp
  });

  it('scatter + facet → scatter series로 렌더', () => {
    const spec = makeFacetSpec({
      chartType: 'scatter',
      facet: { field: 'species' },
    });
    const option = chartSpecToECharts(spec, FACET_ROWS);
    const series = option.series as Record<string, unknown>[];
    expect(series.every(s => s.type === 'scatter')).toBe(true);
  });

  it('facet → legend 숨김', () => {
    const spec = makeFacetSpec({
      chartType: 'bar',
      facet: { field: 'species' },
    });
    const option = chartSpecToECharts(spec, FACET_ROWS);
    expect((option.legend as Record<string, unknown>).show).toBe(false);
  });
});

// ─── G2-3-C: facet-layout 유틸 ────────────────────────────

describe('G2-3-C: facet-layout utilities', () => {
  it('partitionRowsByFacet: 순서 보존, 올바른 그룹 분리', () => {
    const groups = partitionRowsByFacet(FACET_ROWS, 'species');
    expect(groups.size).toBe(3);
    expect([...groups.keys()]).toEqual(['Bass', 'Bream', 'Carp']);
    expect(groups.get('Bass')?.length).toBe(2);
    expect(groups.get('Bream')?.length).toBe(2);
    expect(groups.get('Carp')?.length).toBe(2);
  });

  it('partitionRowsByFacet: 빈 배열 → 빈 Map', () => {
    const groups = partitionRowsByFacet([], 'species');
    expect(groups.size).toBe(0);
  });

  it('computeFacetLayout: 4개 패싯 → 2×2 (기본 ncol=ceil(sqrt(4))=2)', () => {
    const layout = computeFacetLayout(4);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(2);
    expect(layout.items.length).toBe(4);
  });

  it('computeFacetLayout: 3개 패싯 ncol=2 → 2열 2행', () => {
    const layout = computeFacetLayout(3, 2);
    expect(layout.cols).toBe(2);
    expect(layout.rows).toBe(2);
    expect(layout.items.length).toBe(3);
  });

  it('computeFacetLayout: 1개 패싯 → 1×1', () => {
    const layout = computeFacetLayout(1);
    expect(layout.cols).toBe(1);
    expect(layout.rows).toBe(1);
    expect(layout.items.length).toBe(1);
  });

  it('computeFacetLayout: grid 위치가 백분율 문자열', () => {
    const layout = computeFacetLayout(4);
    for (const item of layout.items) {
      expect(item.left).toMatch(/%$/);
      expect(item.top).toMatch(/%$/);
      expect(item.width).toMatch(/%$/);
      expect(item.height).toMatch(/%$/);
    }
  });

  it('computeFacetLayout: ncol=3, 6개 → 3×2', () => {
    const layout = computeFacetLayout(6, 3);
    expect(layout.cols).toBe(3);
    expect(layout.rows).toBe(2);
    expect(layout.items.length).toBe(6);
  });
});

// ─── G2-3-D: 스키마 검증 ─────────────────────────────────

describe('G2-3-D: Schema validation', () => {
  it('y2 필드가 있는 spec 통과', () => {
    const spec = makeBarSpec({
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'temp', type: 'quantitative' },
      },
    });
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('y2 없는 spec도 통과 (optional)', () => {
    const spec = makeBarSpec();
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('facet 필드가 있는 spec 통과', () => {
    const spec = makeBarSpec({ facet: { field: 'group' } });
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('facet 없는 spec도 통과 (optional)', () => {
    const spec = makeBarSpec();
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('facet.field 빈 문자열 → 실패', () => {
    const spec = makeBarSpec({ facet: { field: '' } });
    expect(chartSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('facet.ncol = 0 → 실패 (min 1)', () => {
    const spec = makeBarSpec({ facet: { field: 'group', ncol: 0 } });
    expect(chartSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('facet.ncol = 7 → 실패 (max 6)', () => {
    const spec = makeBarSpec({ facet: { field: 'group', ncol: 7 } });
    expect(chartSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('facet.showTitle boolean → 통과', () => {
    const spec = makeBarSpec({ facet: { field: 'group', showTitle: false } });
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('facet.shareAxis boolean → 통과', () => {
    const spec = makeBarSpec({ facet: { field: 'group', shareAxis: false } });
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });
});

// ─── G2-3-E: CHART_TYPE_HINTS 상호 배타 ──────────────────

describe('G2-3-E: CHART_TYPE_HINTS flags', () => {
  it('bar: supportsY2=true, supportsFacet=true', () => {
    expect(CHART_TYPE_HINTS.bar.supportsY2).toBe(true);
    expect(CHART_TYPE_HINTS.bar.supportsFacet).toBe(true);
  });

  it('line: supportsY2=true, supportsFacet=false', () => {
    expect(CHART_TYPE_HINTS.line.supportsY2).toBe(true);
    expect(CHART_TYPE_HINTS.line.supportsFacet).toBe(false);
  });

  it('scatter: supportsY2=false, supportsFacet=true', () => {
    expect(CHART_TYPE_HINTS.scatter.supportsY2).toBe(false);
    expect(CHART_TYPE_HINTS.scatter.supportsFacet).toBe(true);
  });

  it('grouped-bar: 둘 다 false', () => {
    expect(CHART_TYPE_HINTS['grouped-bar'].supportsY2).toBe(false);
    expect(CHART_TYPE_HINTS['grouped-bar'].supportsFacet).toBe(false);
  });

  it('histogram: 둘 다 false', () => {
    expect(CHART_TYPE_HINTS.histogram.supportsY2).toBe(false);
    expect(CHART_TYPE_HINTS.histogram.supportsFacet).toBe(false);
  });
});
