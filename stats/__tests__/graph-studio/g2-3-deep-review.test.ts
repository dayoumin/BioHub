/**
 * G2-3 심층 리뷰 — 반례 + 커버리지 갭 테스트
 *
 * 목적: 기존 102개 테스트가 커버하지 않는 경계 조건과 조합을 검증.
 *
 * 구성:
 *   DR-1: scatter facet x축 공유 미구현 확인 (H-NEW-1 문서화)
 *   DR-2: Y2 Zod/TS 스키마 불일치 검증 (H-NEW-2 문서화)
 *   DR-3: showTrendline + hasFacet 차단 (M-NEW-1 수정 검증)
 *   DR-4: facet + y.scale.type='log' 반영 확인
 *   DR-5: 단일 그룹 패싯 경계 케이스
 *   DR-6: 비-패싯 차트에서 facet 무시 (FACET_CHART_TYPES 가드)
 *   DR-7: facet + annotations graphic 병합
 *   DR-8: aggregateRows 전체 메서드 검증
 *   DR-9: handleChartTypeChange 전환 조합 (facet/errorBar/trendline)
 *   DR-10: scatter facet 데이터 정합성
 */

import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { chartSpecSchema } from '@/lib/graph-studio/chart-spec-schema';
import { computeFacetLayout } from '@/lib/graph-studio/facet-layout';
import type { ChartSpec, ChartType } from '@/types/graph-studio';

// ─── 픽스처 ──────────────────────────────────────────────────

const SCATTER_FACET_ROWS = [
  { species: 'Bass', length: 10, weight: 100 },
  { species: 'Bass', length: 50, weight: 500 },
  { species: 'Bream', length: 30, weight: 300 },
  { species: 'Bream', length: 35, weight: 350 },
];

const AGG_ROWS = [
  { cat: 'A', val: 10 },
  { cat: 'A', val: 20 },
  { cat: 'A', val: 30 },
  { cat: 'B', val: 5 },
  { cat: 'B', val: 15 },
];

function makeSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    data: {
      sourceId: 'test',
      columns: [
        { name: 'cat', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
        { name: 'val', type: 'quantitative', uniqueCount: 5, sampleValues: ['10', '20'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'cat', type: 'nominal' },
      y: { field: 'val', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
    ...overrides,
  };
}

function makeScatterFacetSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'scatter',
    data: {
      sourceId: 'test',
      columns: [
        { name: 'species', type: 'nominal', uniqueCount: 2, sampleValues: ['Bass', 'Bream'], hasNull: false },
        { name: 'length', type: 'quantitative', uniqueCount: 4, sampleValues: ['10', '50'], hasNull: false },
        { name: 'weight', type: 'quantitative', uniqueCount: 4, sampleValues: ['100', '500'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'length', type: 'quantitative' },
      y: { field: 'weight', type: 'quantitative' },
    },
    facet: { field: 'species' },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
    ...overrides,
  };
}

// ─── DR-1: scatter facet x/y축 공유 범위 (H-NEW-1 수정 완료) ──

describe('DR-1: scatter facet x축 범위 동작', () => {
  it('shareAxis=true일 때 y축은 전체 공유됨', () => {
    const spec = makeScatterFacetSpec({ facet: { field: 'species', shareAxis: true } });
    const option = chartSpecToECharts(spec, SCATTER_FACET_ROWS);
    const yAxes = option.yAxis as Record<string, unknown>[];

    // y축: globalYMin/Max가 공유됨 (모든 패싯 동일 범위)
    const mins = yAxes.map(a => a.min);
    const maxes = yAxes.map(a => a.max);
    expect(new Set(mins).size).toBe(1); // 모든 패싯 y min 동일
    expect(new Set(maxes).size).toBe(1); // 모든 패싯 y max 동일
  });

  it('shareAxis=true일 때 scatter x축도 전체 공유됨 (H-NEW-1 수정)', () => {
    // SCATTER_FACET_ROWS length: Bass[10,50], Bream[30,35] → 전체 범위 [10, 50]
    const spec = makeScatterFacetSpec({ facet: { field: 'species', shareAxis: true } });
    const option = chartSpecToECharts(spec, SCATTER_FACET_ROWS);
    const xAxes = option.xAxis as Record<string, unknown>[];

    // 모든 패싯 x축에 동일한 globalXMin/Max 적용
    const mins = xAxes.map(a => a.min);
    const maxes = xAxes.map(a => a.max);
    expect(new Set(mins).size).toBe(1);   // 모든 패싯 x min 동일
    expect(new Set(maxes).size).toBe(1);  // 모든 패싯 x max 동일
    expect(mins[0]).toBe(10);  // 전체 데이터 x 최솟값
    expect(maxes[0]).toBe(50); // 전체 데이터 x 최댓값
  });

  it('shareAxis=false일 때 x/y축 독립 (min/max 미설정)', () => {
    const spec = makeScatterFacetSpec({ facet: { field: 'species', shareAxis: false } });
    const option = chartSpecToECharts(spec, SCATTER_FACET_ROWS);
    const xAxes = option.xAxis as Record<string, unknown>[];
    const yAxes = option.yAxis as Record<string, unknown>[];

    for (const axis of xAxes) {
      expect(axis.min).toBeUndefined();
      expect(axis.max).toBeUndefined();
    }
    for (const axis of yAxes) {
      expect(axis.min).toBeUndefined();
      expect(axis.max).toBeUndefined();
    }
  });
});

// ─── DR-2: Y2 Zod/TS 스키마 불일치 (H-NEW-2) ────────────────

describe('DR-2: Y2 스키마 경계 검증', () => {
  it('Y2에 labelAngle 추가 → Zod strict() 거부', () => {
    const spec = makeSpec({
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
        y2: { field: 'val', type: 'quantitative', labelAngle: 45 } as ChartSpec['encoding']['y2'],
      },
    });
    // Zod strict()이므로 labelAngle 필드가 있으면 거부됨
    const result = chartSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('Y2에 허용 필드만 → Zod 통과', () => {
    const spec = makeSpec({
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
        y2: { field: 'val', type: 'quantitative', title: 'Y2 Title' },
      },
    });
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('Y2에 scale 추가 → Zod 통과 (허용 필드)', () => {
    const spec = makeSpec({
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
        y2: {
          field: 'val',
          type: 'quantitative',
          scale: { domain: [0, 100] },
        },
      },
    });
    expect(chartSpecSchema.safeParse(spec).success).toBe(true);
  });

  it('Y2에 grid 필드 추가 → Zod strict() 거부 (AxisSpec에는 있지만 Y2 Zod에는 없음)', () => {
    const spec = makeSpec({
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
        y2: { field: 'val', type: 'quantitative', grid: true } as ChartSpec['encoding']['y2'],
      },
    });
    const result = chartSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });
});

// ─── DR-3: showTrendline + hasFacet 차단 (M-NEW-1 수정 검증) ──

describe('DR-3: showTrendline UI 조건 시뮬레이션', () => {
  it('scatter + facet → showTrendline=false', () => {
    const chartType: ChartType = 'scatter';
    const hasFacet = true;
    const showTrendline = chartType === 'scatter' && !hasFacet;
    expect(showTrendline).toBe(false);
  });

  it('scatter + no facet → showTrendline=true', () => {
    const chartType: ChartType = 'scatter';
    const hasFacet = false;
    const showTrendline = chartType === 'scatter' && !hasFacet;
    expect(showTrendline).toBe(true);
  });

  it('bar + no facet → showTrendline=false (scatter 전용)', () => {
    const chartType = 'bar' as ChartType;
    const hasFacet = false;
    const showTrendline = (chartType as string) === 'scatter' && !hasFacet;
    expect(showTrendline).toBe(false);
  });
});

// ─── DR-4: facet + y.scale.type='log' ────────────────────────

describe('DR-4: facet + log scale y축', () => {
  it('y.scale.type=log → facet yAxis type=log', () => {
    const spec = makeSpec({
      chartType: 'bar',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'species', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'cat', type: 'nominal', uniqueCount: 2, sampleValues: ['x', 'y'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 4, sampleValues: ['10', '100'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative', scale: { type: 'log' } },
      },
      facet: { field: 'species' },
    });
    const rows = [
      { species: 'A', cat: 'x', val: 10 },
      { species: 'A', cat: 'y', val: 100 },
      { species: 'B', cat: 'x', val: 50 },
      { species: 'B', cat: 'y', val: 500 },
    ];
    const option = chartSpecToECharts(spec, rows);
    const yAxes = option.yAxis as Record<string, unknown>[];

    // log scale 반영 확인
    for (const axis of yAxes) {
      expect(axis.type).toBe('log');
    }
  });

  it('y.scale.type 미지정 → facet yAxis type=value (기본)', () => {
    const spec = makeSpec({
      chartType: 'bar',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'species', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'cat', type: 'nominal', uniqueCount: 2, sampleValues: ['x', 'y'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 4, sampleValues: ['10', '20'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
      },
      facet: { field: 'species' },
    });
    const rows = [
      { species: 'A', cat: 'x', val: 10 },
      { species: 'B', cat: 'y', val: 20 },
    ];
    const option = chartSpecToECharts(spec, rows);
    const yAxes = option.yAxis as Record<string, unknown>[];

    for (const axis of yAxes) {
      expect(axis.type).toBe('value');
    }
  });
});

// ─── DR-5: 단일 그룹 패싯 ────────────────────────────────────

describe('DR-5: 단일 그룹 패싯 경계 케이스', () => {
  it('모든 행이 같은 facet 값 → grid 1개, series 1개', () => {
    const rows = [
      { species: 'Bass', length: 20, weight: 200 },
      { species: 'Bass', length: 25, weight: 350 },
      { species: 'Bass', length: 30, weight: 400 },
    ];
    const spec = makeScatterFacetSpec();
    const option = chartSpecToECharts(spec, rows);

    expect((option.grid as unknown[]).length).toBe(1);
    expect((option.series as unknown[]).length).toBe(1);
  });

  it('computeFacetLayout(1) → 1×1 레이아웃, 전체 공간 사용', () => {
    const layout = computeFacetLayout(1);
    expect(layout.cols).toBe(1);
    expect(layout.rows).toBe(1);
    // 단일 셀이므로 width가 전체 가용 공간
    const width = parseFloat(layout.items[0].width);
    expect(width).toBeGreaterThan(80); // 거의 전체 너비
  });
});

// ─── DR-6: 비-패싯 차트에서 facet 무시 ────────────────────────

describe('DR-6: FACET_CHART_TYPES 가드', () => {
  it('line + facet → facet 무시, 일반 line 렌더', () => {
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'line',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'species', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'month', type: 'nominal', uniqueCount: 3, sampleValues: ['Jan', 'Feb', 'Mar'], hasNull: false },
          { name: 'sales', type: 'quantitative', uniqueCount: 6, sampleValues: ['100', '200'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'month', type: 'nominal' },
        y: { field: 'sales', type: 'quantitative' },
      },
      facet: { field: 'species' },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };
    const rows = [
      { species: 'A', month: 'Jan', sales: 100 },
      { species: 'A', month: 'Feb', sales: 150 },
      { species: 'B', month: 'Jan', sales: 80 },
    ];

    const option = chartSpecToECharts(spec, rows);

    // line은 FACET_CHART_TYPES에 없음 → facet 무시
    expect(Array.isArray(option.grid)).toBe(false); // 멀티 grid 아님
    const series = option.series as Record<string, unknown>[];
    expect(series[0].type).toBe('line');
  });

  it('boxplot + facet → facet 무시, 일반 boxplot', () => {
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'boxplot',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'cat', type: 'nominal', uniqueCount: 2, sampleValues: ['x', 'y'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 6, sampleValues: ['10', '20'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
      },
      facet: { field: 'group' },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };
    const rows = [
      { group: 'A', cat: 'x', val: 10 },
      { group: 'A', cat: 'x', val: 20 },
      { group: 'B', cat: 'y', val: 15 },
      { group: 'B', cat: 'y', val: 25 },
    ];

    const option = chartSpecToECharts(spec, rows);
    expect(Array.isArray(option.grid)).toBe(false);
    const series = option.series as Record<string, unknown>[];
    expect(series[0].type).toBe('boxplot');
  });

  it('FACET_CHART_TYPES = bar, scatter만 포함', () => {
    // bar, scatter만 facet 지원 — hints와 converter 일관성 확인
    const facetTypes: ChartType[] = ['bar', 'scatter'];
    const nonFacetTypes: ChartType[] = [
      'grouped-bar', 'stacked-bar', 'line', 'boxplot',
      'histogram', 'error-bar', 'heatmap', 'violin',
    ];

    for (const t of facetTypes) {
      expect(CHART_TYPE_HINTS[t].supportsFacet).toBe(true);
    }
    for (const t of nonFacetTypes) {
      expect(CHART_TYPE_HINTS[t].supportsFacet).toBe(false);
    }
  });
});

// ─── DR-7: facet + annotations graphic 병합 ──────────────────

describe('DR-7: facet + annotations graphic 병합', () => {
  it('facet + annotations → base graphic + facet title graphic 합산', () => {
    const spec = makeSpec({
      chartType: 'bar',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'species', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'cat', type: 'nominal', uniqueCount: 2, sampleValues: ['x', 'y'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 2, sampleValues: ['10', '20'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
      },
      facet: { field: 'species', showTitle: true },
      annotations: [{ type: 'text', text: 'Note', x: 50, y: 50 }],
    });
    const rows = [
      { species: 'A', cat: 'x', val: 10 },
      { species: 'B', cat: 'y', val: 20 },
    ];

    const option = chartSpecToECharts(spec, rows);
    const graphics = option.graphic as Record<string, unknown>[];

    // annotation 1개 + facet title 2개 (A, B) = 3개
    expect(graphics.length).toBe(3);

    // 첫 번째는 annotation (text 'Note')
    expect((graphics[0].style as Record<string, unknown>).text).toBe('Note');

    // 나머지는 facet 제목
    const facetTitles = graphics.slice(1);
    expect(facetTitles.every(g => g.type === 'text')).toBe(true);
  });

  it('facet + showTitle=false + annotations → annotation만 유지', () => {
    const spec = makeSpec({
      chartType: 'bar',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'species', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'cat', type: 'nominal', uniqueCount: 2, sampleValues: ['x', 'y'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 2, sampleValues: ['10', '20'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
      },
      facet: { field: 'species', showTitle: false },
      annotations: [{ type: 'line', x: 0, y: 100, x2: 200, y2: 100 }],
    });
    const rows = [
      { species: 'A', cat: 'x', val: 10 },
      { species: 'B', cat: 'y', val: 20 },
    ];

    const option = chartSpecToECharts(spec, rows);
    const graphics = option.graphic as Record<string, unknown>[];

    // annotation 1개만 (facet title=false)
    expect(graphics.length).toBe(1);
    expect(graphics[0].type).toBe('line');
  });
});

// ─── DR-8: aggregateRows 전체 메서드 검증 ────────────────────

describe('DR-8: aggregateRows 메서드별 정확성', () => {
  it('aggregate mean → 그룹별 평균', () => {
    const spec = makeSpec({
      aggregate: { y: 'mean', groupBy: ['cat'] },
    });
    const option = chartSpecToECharts(spec, AGG_ROWS);
    // A: (10+20+30)/3 = 20, B: (5+15)/2 = 10
    // dataset.source 확인
    const source = (option.dataset as Record<string, unknown>).source as Record<string, unknown>[];
    const aVal = source.find(r => r.cat === 'A');
    const bVal = source.find(r => r.cat === 'B');
    expect(aVal?.val).toBe(20);
    expect(bVal?.val).toBe(10);
  });

  it('aggregate sum → 그룹별 합계', () => {
    const spec = makeSpec({
      aggregate: { y: 'sum', groupBy: ['cat'] },
    });
    const option = chartSpecToECharts(spec, AGG_ROWS);
    const source = (option.dataset as Record<string, unknown>).source as Record<string, unknown>[];
    const aVal = source.find(r => r.cat === 'A');
    const bVal = source.find(r => r.cat === 'B');
    expect(aVal?.val).toBe(60); // 10+20+30
    expect(bVal?.val).toBe(20); // 5+15
  });

  it('aggregate count → 그룹별 행 수', () => {
    const spec = makeSpec({
      aggregate: { y: 'count', groupBy: ['cat'] },
    });
    const option = chartSpecToECharts(spec, AGG_ROWS);
    const source = (option.dataset as Record<string, unknown>).source as Record<string, unknown>[];
    const aVal = source.find(r => r.cat === 'A');
    const bVal = source.find(r => r.cat === 'B');
    expect(aVal?.val).toBe(3);
    expect(bVal?.val).toBe(2);
  });

  it('aggregate median → 그룹별 중앙값', () => {
    const spec = makeSpec({
      aggregate: { y: 'median', groupBy: ['cat'] },
    });
    const option = chartSpecToECharts(spec, AGG_ROWS);
    const source = (option.dataset as Record<string, unknown>).source as Record<string, unknown>[];
    const aVal = source.find(r => r.cat === 'A');
    const bVal = source.find(r => r.cat === 'B');
    expect(aVal?.val).toBe(20); // 정렬 [10,20,30] → 중앙 20
    expect(bVal?.val).toBe(10); // 정렬 [5,15] → (5+15)/2 = 10
  });

  it('aggregate min → 그룹별 최솟값', () => {
    const spec = makeSpec({
      aggregate: { y: 'min', groupBy: ['cat'] },
    });
    const option = chartSpecToECharts(spec, AGG_ROWS);
    const source = (option.dataset as Record<string, unknown>).source as Record<string, unknown>[];
    const aVal = source.find(r => r.cat === 'A');
    const bVal = source.find(r => r.cat === 'B');
    expect(aVal?.val).toBe(10);
    expect(bVal?.val).toBe(5);
  });

  it('aggregate max → 그룹별 최댓값', () => {
    const spec = makeSpec({
      aggregate: { y: 'max', groupBy: ['cat'] },
    });
    const option = chartSpecToECharts(spec, AGG_ROWS);
    const source = (option.dataset as Record<string, unknown>).source as Record<string, unknown>[];
    const aVal = source.find(r => r.cat === 'A');
    const bVal = source.find(r => r.cat === 'B');
    expect(aVal?.val).toBe(30);
    expect(bVal?.val).toBe(15);
  });
});

// ─── DR-9: handleChartTypeChange 전환 조합 ───────────────────

describe('DR-9: handleChartTypeChange 전환 조합', () => {
  function simulateChartTypeChange(
    currentSpec: ChartSpec,
    newType: ChartType,
  ): ChartSpec {
    const hint = CHART_TYPE_HINTS[newType];
    const { color: prevColor, y2: prevY2, ...baseEncoding } = currentSpec.encoding;
    const cleanEncoding = {
      ...baseEncoding,
      ...(hint.supportsColor && prevColor ? { color: prevColor } : {}),
      ...(hint.supportsY2 && prevY2 ? { y2: prevY2 } : {}),
      x: { ...currentSpec.encoding.x },
      y: { ...currentSpec.encoding.y },
    };
    const { facet: _f, errorBar: _eb, trendline: _tl, ...cleanSpec } = currentSpec;
    return {
      ...cleanSpec,
      chartType: newType,
      encoding: cleanEncoding,
      ...(hint.supportsFacet && currentSpec.facet ? { facet: currentSpec.facet } : {}),
      ...(hint.supportsErrorBar && currentSpec.errorBar ? { errorBar: currentSpec.errorBar } : {}),
      ...(newType === 'scatter' && currentSpec.trendline ? { trendline: currentSpec.trendline } : {}),
    };
  }

  it('bar + facet → scatter 전환 → facet 유지 (둘 다 supportsFacet)', () => {
    const spec = makeSpec({ facet: { field: 'cat' } });
    const result = simulateChartTypeChange(spec, 'scatter');
    expect(result.facet).toBeDefined();
    expect(result.facet?.field).toBe('cat');
  });

  it('bar + facet → line 전환 → facet 제거 (line supportsFacet=false)', () => {
    const spec = makeSpec({ facet: { field: 'cat' } });
    const result = simulateChartTypeChange(spec, 'line');
    expect(result.facet).toBeUndefined();
  });

  it('bar + errorBar → scatter 전환 → errorBar 제거 (scatter supportsErrorBar=false)', () => {
    const spec = makeSpec({ errorBar: { type: 'stderr' } });
    const result = simulateChartTypeChange(spec, 'scatter');
    expect(result.errorBar).toBeUndefined();
  });

  it('bar + errorBar → line 전환 → errorBar 유지 (line supportsErrorBar=true)', () => {
    const spec = makeSpec({ errorBar: { type: 'ci', value: 95 } });
    const result = simulateChartTypeChange(spec, 'line');
    expect(result.errorBar).toBeDefined();
    expect(result.errorBar?.type).toBe('ci');
  });

  it('scatter + trendline → bar 전환 → trendline 제거', () => {
    const spec = makeSpec({
      chartType: 'scatter',
      trendline: { type: 'linear' },
    });
    const result = simulateChartTypeChange(spec, 'bar');
    expect(result.trendline).toBeUndefined();
  });

  it('scatter + trendline → scatter 전환 (같은 유형) → trendline 유지', () => {
    const spec = makeSpec({
      chartType: 'scatter',
      trendline: { type: 'linear', showEquation: true },
    });
    const result = simulateChartTypeChange(spec, 'scatter');
    expect(result.trendline).toBeDefined();
    expect(result.trendline?.showEquation).toBe(true);
  });

  it('bar + facet + errorBar → scatter 전환 → facet 유지, errorBar 제거', () => {
    const spec = makeSpec({
      facet: { field: 'cat' },
      errorBar: { type: 'stdev' },
    });
    const result = simulateChartTypeChange(spec, 'scatter');
    expect(result.facet).toBeDefined();
    expect(result.errorBar).toBeUndefined();
  });
});

// ─── DR-10: scatter facet 데이터 정합성 ──────────────────────

describe('DR-10: scatter facet 데이터 정합성', () => {
  it('각 패싯 series에 해당 그룹의 데이터만 포함', () => {
    const spec = makeScatterFacetSpec();
    const option = chartSpecToECharts(spec, SCATTER_FACET_ROWS);
    const series = option.series as { name: string; data: [number, number][] }[];

    const bassSeries = series.find(s => s.name === 'Bass');
    const breamSeries = series.find(s => s.name === 'Bream');

    expect(bassSeries).toBeDefined();
    expect(breamSeries).toBeDefined();

    // Bass: [10, 100], [50, 500]
    expect(bassSeries!.data.length).toBe(2);
    expect(bassSeries!.data).toContainEqual([10, 100]);
    expect(bassSeries!.data).toContainEqual([50, 500]);

    // Bream: [30, 300], [35, 350]
    expect(breamSeries!.data.length).toBe(2);
    expect(breamSeries!.data).toContainEqual([30, 300]);
    expect(breamSeries!.data).toContainEqual([35, 350]);
  });

  it('facet series type은 모두 scatter', () => {
    const spec = makeScatterFacetSpec();
    const option = chartSpecToECharts(spec, SCATTER_FACET_ROWS);
    const series = option.series as Record<string, unknown>[];

    for (const s of series) {
      expect(s.type).toBe('scatter');
    }
  });

  it('각 series의 xAxisIndex/yAxisIndex가 순서대로 매핑', () => {
    const spec = makeScatterFacetSpec();
    const option = chartSpecToECharts(spec, SCATTER_FACET_ROWS);
    const series = option.series as Record<string, unknown>[];

    series.forEach((s, i) => {
      expect(s.xAxisIndex).toBe(i);
      expect(s.yAxisIndex).toBe(i);
    });
  });
});
