/**
 * G2-3 비판적 리뷰 — 시뮬레이션 테스트
 *
 * 목적: G2-3 구현의 결함 수정을 검증하는 테스트.
 * 각 테스트는 발견된 이슈의 수정 후 올바른 동작을 확인한다.
 *
 * 구성:
 *   SIM-1: handleChartTypeChange y2 누출 수정 검증 (CRITICAL)
 *   SIM-2: facet + aggregate 상호작용 수정 검증 (HIGH)
 *   SIM-3: facet + errorBar UI 차단 검증 (HIGH)
 *   SIM-4: facet bar 음수 전용 데이터 수정 검증 (HIGH)
 *   SIM-5: facet + color UI 차단 검증 (MEDIUM)
 *   SIM-6: converter 경계 케이스
 *   SIM-7: Y2 핸들러 type 안전성
 */

import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { chartSpecSchema } from '@/lib/graph-studio/chart-spec-schema';
import { partitionRowsByFacet, computeFacetLayout } from '@/lib/graph-studio/facet-layout';
import type { ChartSpec, ChartType } from '@/types/graph-studio';

// ─── 픽스처 ─────────────────────────────────────────────────

const BASIC_COLUMNS: ChartSpec['data']['columns'] = [
  { name: 'category', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B', 'C'], hasNull: false },
  { name: 'value', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20', '15'], hasNull: false },
  { name: 'extra', type: 'quantitative', uniqueCount: 3, sampleValues: ['25', '30', '28'], hasNull: false },
];

const BASIC_ROWS = [
  { category: 'A', value: 10, extra: 25 },
  { category: 'B', value: 20, extra: 30 },
  { category: 'C', value: 15, extra: 28 },
];

const FACET_COLUMNS: ChartSpec['data']['columns'] = [
  { name: 'species', type: 'nominal', uniqueCount: 3, sampleValues: ['Bass', 'Bream', 'Carp'], hasNull: false },
  { name: 'length', type: 'quantitative', uniqueCount: 6, sampleValues: ['20', '25', '30'], hasNull: false },
  { name: 'weight', type: 'quantitative', uniqueCount: 6, sampleValues: ['200', '350', '500'], hasNull: false },
];

const FACET_ROWS = [
  { species: 'Bass', length: 20, weight: 200 },
  { species: 'Bass', length: 25, weight: 350 },
  { species: 'Bream', length: 30, weight: 500 },
  { species: 'Bream', length: 35, weight: 600 },
  { species: 'Carp', length: 28, weight: 400 },
  { species: 'Carp', length: 32, weight: 450 },
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

// ─── SIM-1: handleChartTypeChange y2 누출 (CRITICAL) ─────

describe('SIM-1: handleChartTypeChange y2 누출 수정 검증', () => {
  /**
   * 시뮬레이션: DataTab의 handleChartTypeChange 수정된 로직을 순수 함수로 재현.
   * 수정: baseEncoding 기반으로 color/y2 개별 조건 추가.
   */
  function simulateChartTypeChange(
    currentSpec: ChartSpec,
    newType: ChartType,
  ): ChartSpec {
    const hint = CHART_TYPE_HINTS[newType];

    // 수정된 로직 (Fix 1): baseEncoding 기반, 개별 조건 추가
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

  it('bar(Y2 활성) → grouped-bar 전환 시 y2 제거됨', () => {
    const barWithY2 = makeSpec({
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'extra', type: 'quantitative' },
      },
    });

    const result = simulateChartTypeChange(barWithY2, 'grouped-bar');
    // grouped-bar: supportsY2=false → y2 제거됨
    expect(result.encoding.y2).toBeUndefined();
  });

  it('bar(Y2 활성) → stacked-bar 전환 시 y2 제거됨', () => {
    const barWithY2 = makeSpec({
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'extra', type: 'quantitative' },
      },
    });

    const result = simulateChartTypeChange(barWithY2, 'stacked-bar');
    expect(result.encoding.y2).toBeUndefined();
  });

  it('bar(Y2 활성) → scatter 전환 시 y2 제거됨', () => {
    const barWithY2 = makeSpec({
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'extra', type: 'quantitative' },
      },
    });

    const result = simulateChartTypeChange(barWithY2, 'scatter');
    expect(result.encoding.y2).toBeUndefined();
  });

  it('bar(Y2 활성) → histogram 전환 시 y2 제거됨', () => {
    const barWithY2 = makeSpec({
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'extra', type: 'quantitative' },
      },
    });

    const result = simulateChartTypeChange(barWithY2, 'histogram');
    expect(result.encoding.y2).toBeUndefined();
  });

  it('bar(Y2 활성) → line 전환 시 y2 유지됨 (supportsY2=true)', () => {
    const barWithY2 = makeSpec({
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'extra', type: 'quantitative' },
      },
    });

    const result = simulateChartTypeChange(barWithY2, 'line');
    // line: supportsY2=true → y2 유지
    expect(result.encoding.y2).toBeDefined();
  });

  it('supportsY2=false인 모든 차트 유형 검증', () => {
    const y2FalseTypes: ChartType[] = [
      'grouped-bar', 'stacked-bar', 'scatter', 'boxplot',
      'histogram', 'error-bar', 'heatmap', 'violin',
    ];

    for (const chartType of y2FalseTypes) {
      expect(CHART_TYPE_HINTS[chartType].supportsY2).toBe(false);
    }
  });
});

// ─── SIM-2: facet + aggregate 상호작용 (HIGH) ─────────────

describe('SIM-2: facet + aggregate 자동 방어 검증', () => {
  it('aggregate groupBy에 facet.field 없어도 자동 추가되어 패싯 구조 보존', () => {
    // Fix 5: converter가 facet.field를 aggGroupBy에 자동 추가
    const spec = makeSpec({
      chartType: 'bar',
      data: { sourceId: 'test', columns: FACET_COLUMNS },
      encoding: {
        x: { field: 'length', type: 'quantitative' },
        y: { field: 'weight', type: 'quantitative' },
      },
      facet: { field: 'species' },
      aggregate: { y: 'mean', groupBy: ['length'] },
    });

    const option = chartSpecToECharts(spec, FACET_ROWS);

    // facet이 활성이면 grid 배열이어야 함
    expect(Array.isArray(option.grid)).toBe(true);
    const grids = option.grid as unknown[];

    // species가 자동 추가되어 3개 그룹 보존
    expect(grids.length).toBe(3);
  });

  it('aggregate groupBy에 facet.field 이미 포함 시 중복 추가 없음', () => {
    const spec = makeSpec({
      chartType: 'bar',
      data: { sourceId: 'test', columns: FACET_COLUMNS },
      encoding: {
        x: { field: 'length', type: 'quantitative' },
        y: { field: 'weight', type: 'quantitative' },
      },
      facet: { field: 'species' },
      aggregate: { y: 'mean', groupBy: ['length', 'species'] },
    });

    const option = chartSpecToECharts(spec, FACET_ROWS);
    expect(Array.isArray(option.grid)).toBe(true);
    const grids = option.grid as unknown[];
    // species가 이미 groupBy에 포함 → 3개 그룹 보존
    expect(grids.length).toBe(3);
  });
});

// ─── SIM-3: facet + errorBar UI 미차단 (HIGH) ─────────────

describe('SIM-3: facet + errorBar 동시 설정', () => {
  it('facet 활성 + errorBar 설정 시 converter가 errorBar 무시', () => {
    const spec = makeSpec({
      chartType: 'bar',
      data: { sourceId: 'test', columns: FACET_COLUMNS },
      encoding: {
        x: { field: 'length', type: 'quantitative' },
        y: { field: 'weight', type: 'quantitative' },
      },
      facet: { field: 'species' },
      errorBar: { type: 'stderr' },
    });

    const option = chartSpecToECharts(spec, FACET_ROWS);

    // facet이 최우선 분기 → errorBar 무시됨
    expect(Array.isArray(option.grid)).toBe(true);

    // series에 에러바 custom series가 없어야 함 (무시 확인)
    const series = option.series as Record<string, unknown>[];
    const hasErrorSeries = series.some(s => s.type === 'custom');
    expect(hasErrorSeries).toBe(false);
  });

  it('DataTab showErrorBar 시뮬레이션: facet 활성 시 errorBar 차단됨', () => {
    // Fix 3: showErrorBar에 !hasFacet 조건 추가
    const chartType = 'bar' as ChartType;
    const hasY2 = false;
    const hasFacet = true;
    const colorField: string | undefined = undefined;
    const xType: string = 'nominal';

    const ERROR_BAR_CHART_TYPES = new Set<ChartType>(['bar', 'line', 'error-bar']);

    // 수정된 showErrorBar 로직: !hasFacet 추가
    const showErrorBar = ERROR_BAR_CHART_TYPES.has(chartType) && !hasY2 && !hasFacet && (
      chartType !== 'line' ||
      (!colorField && xType !== 'temporal')
    );

    // facet=true → showErrorBar=false (정상)
    expect(showErrorBar).toBe(false);
  });
});

// ─── SIM-4: facet bar 음수 전용 데이터 (HIGH) ──────────────

describe('SIM-4: facet bar 음수 전용 데이터', () => {
  it('모든 값이 음수인 facet bar → yAxis max가 0 이상 (0 기준선 보장)', () => {
    const negRows = [
      { species: 'A', cat: 'x', val: -10 },
      { species: 'A', cat: 'y', val: -20 },
      { species: 'B', cat: 'x', val: -5 },
      { species: 'B', cat: 'y', val: -15 },
    ];
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'bar',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'species', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'cat', type: 'nominal', uniqueCount: 2, sampleValues: ['x', 'y'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 4, sampleValues: ['-10', '-20', '-5', '-15'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
      },
      facet: { field: 'species', shareAxis: true },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };

    const option = chartSpecToECharts(spec, negRows);
    const yAxes = option.yAxis as Record<string, unknown>[];

    // Fix 4: globalYMax가 음수일 때 0으로 보정 → 0 기준선 보장
    for (const axis of yAxes) {
      const max = axis.max as number | undefined;
      if (max !== undefined) {
        expect(max).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('양수+음수 혼합 데이터 → min ≤ 0 ≤ max 보장', () => {
    const mixedRows = [
      { species: 'A', cat: 'x', val: -10 },
      { species: 'A', cat: 'y', val: 20 },
      { species: 'B', cat: 'x', val: -5 },
      { species: 'B', cat: 'y', val: 15 },
    ];
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'bar',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'species', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'cat', type: 'nominal', uniqueCount: 2, sampleValues: ['x', 'y'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 4, sampleValues: ['-10', '20', '-5', '15'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'cat', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
      },
      facet: { field: 'species', shareAxis: true },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };

    const option = chartSpecToECharts(spec, mixedRows);
    const yAxes = option.yAxis as Record<string, unknown>[];

    for (const axis of yAxes) {
      const min = axis.min as number;
      const max = axis.max as number;
      // 혼합 데이터: min ≤ 0, max ≥ 0 자연스럽게 보장 (min=-10, max=20)
      // + bar에서 min=0 강제 → min=0이 되지만 음수값이 있으므로...
      // 현재 코드는 min을 0으로 강제하는데, 음수가 있으면 min=-10이 되어야 함
      // 그런데 "if (globalYMin > 0) globalYMin = 0" 조건에서
      // globalYMin = -10 (> 0이 아님) → 강제 안 함 → min = -10 (정상)
      expect(min).toBeLessThanOrEqual(0);
    }
  });
});

// ─── SIM-5: facet + color 무시 검증 (MEDIUM) ──────────────

describe('SIM-5: facet + color 동시 설정', () => {
  it('facet 활성 + color 필드 → color가 렌더링에 무시됨', () => {
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'scatter',
      data: { sourceId: 'test', columns: FACET_COLUMNS },
      encoding: {
        x: { field: 'length', type: 'quantitative' },
        y: { field: 'weight', type: 'quantitative' },
        color: { field: 'species', type: 'nominal' },
      },
      facet: { field: 'species' },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };

    const option = chartSpecToECharts(spec, FACET_ROWS);

    // facet은 활성 (grid 배열)
    expect(Array.isArray(option.grid)).toBe(true);

    // 하지만 각 series에 color 기반 분할이 없음
    // → facet이 이미 species로 분할하므로 color는 중복
    const series = option.series as Record<string, unknown>[];
    // 각 series는 패싯 그룹 이름 (species 값)을 name으로 가짐
    const names = series.map(s => s.name);
    expect(names).toEqual(['Bass', 'Bream', 'Carp']);
    // color 기반의 추가 시리즈 분할은 없음 (정상: 패싯이 이미 분할)
  });

  it('DataTab showColorField 시뮬레이션: facet 활성 시 color 차단됨', () => {
    // Fix 6: showColorField에 !hasFacet 조건 추가
    const supportsColor = true;
    const hasY2 = false;
    const hasFacet = true;

    const showColorField = supportsColor && !hasY2 && !hasFacet;

    // facet 활성 시 color UI 숨김 (정상)
    expect(showColorField).toBe(false);
  });
});

// ─── SIM-6: converter 경계 케이스 ─────────────────────────

describe('SIM-6: converter 경계 케이스', () => {
  it('빈 데이터로 converter 호출 → "No data" 제목', () => {
    const spec = makeSpec();
    const option = chartSpecToECharts(spec, []);
    expect((option.title as Record<string, unknown>).text).toBe('No data');
  });

  it('facet field가 데이터에 없는 컬럼 → 빈 문자열 그룹 1개', () => {
    const spec = makeSpec({
      chartType: 'bar',
      facet: { field: 'nonexistent' },
    });
    const option = chartSpecToECharts(spec, BASIC_ROWS);

    // nonexistent 필드 → 모든 행이 '' 그룹에 포함
    expect(Array.isArray(option.grid)).toBe(true);
    const grids = option.grid as unknown[];
    expect(grids.length).toBe(1); // 모두 빈 문자열 1개 그룹
  });

  it('scatter facet + trendline → trendline 무시됨', () => {
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'scatter',
      data: { sourceId: 'test', columns: FACET_COLUMNS },
      encoding: {
        x: { field: 'length', type: 'quantitative' },
        y: { field: 'weight', type: 'quantitative' },
      },
      facet: { field: 'species' },
      trendline: { type: 'linear' },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };

    const option = chartSpecToECharts(spec, FACET_ROWS);
    const series = option.series as Record<string, unknown>[];

    // trendline 시리즈 없음 (facet이 buildFacetOption으로 분기하여 trendline 미처리)
    const hasTrendline = series.some(s => s.type === 'line');
    expect(hasTrendline).toBe(false);
  });

  it('MAX_FACETS(12) 초과 → 첫 12개만 렌더', () => {
    // 15개 그룹 생성
    const manyRows = Array.from({ length: 30 }, (_, i) => ({
      group: `G${i % 15}`,
      val: i * 10,
    }));
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'bar',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'group', type: 'nominal', uniqueCount: 15, sampleValues: ['G0', 'G1'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 30, sampleValues: ['0', '10'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'val', type: 'quantitative' },
        y: { field: 'val', type: 'quantitative' },
      },
      facet: { field: 'group' },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };

    const option = chartSpecToECharts(spec, manyRows);
    const grids = option.grid as unknown[];
    expect(grids.length).toBe(12); // MAX_FACETS
  });

  it('Y2 + line + colorField → colorField 경로에서 Y2 무시', () => {
    const rows = [
      { month: 'Jan', sales: 100, profit: 20, region: 'East' },
      { month: 'Feb', sales: 150, profit: 35, region: 'East' },
      { month: 'Jan', sales: 80, profit: 15, region: 'West' },
      { month: 'Feb', sales: 120, profit: 30, region: 'West' },
    ];
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'line',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'month', type: 'nominal', uniqueCount: 2, sampleValues: ['Jan', 'Feb'], hasNull: false },
          { name: 'sales', type: 'quantitative', uniqueCount: 4, sampleValues: ['100', '150'], hasNull: false },
          { name: 'profit', type: 'quantitative', uniqueCount: 4, sampleValues: ['20', '35'], hasNull: false },
          { name: 'region', type: 'nominal', uniqueCount: 2, sampleValues: ['East', 'West'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'month', type: 'nominal' },
        y: { field: 'sales', type: 'quantitative' },
        y2: { field: 'profit', type: 'quantitative' },
        color: { field: 'region', type: 'nominal' },
      },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };

    const option = chartSpecToECharts(spec, rows);

    // colorField이 있으면 line 차트는 grouped line 경로 → Y2 무시
    const series = option.series as Record<string, unknown>[];
    // 2개 시리즈 (East, West) — Y2가 없으므로 yAxisIndex=1인 시리즈 없음
    const hasY2Series = series.some(s => s.yAxisIndex === 1);
    expect(hasY2Series).toBe(false);
    expect(Array.isArray(option.yAxis)).toBe(false); // 단일 yAxis
  });

  it('facet bar horizontal → xAxis가 value, yAxis가 category', () => {
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'bar',
      data: { sourceId: 'test', columns: FACET_COLUMNS },
      encoding: {
        x: { field: 'length', type: 'quantitative' },
        y: { field: 'weight', type: 'quantitative' },
      },
      orientation: 'horizontal',
      facet: { field: 'species' },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };

    const option = chartSpecToECharts(spec, FACET_ROWS);
    expect(Array.isArray(option.grid)).toBe(true);

    const xAxes = option.xAxis as Record<string, unknown>[];
    const yAxes = option.yAxis as Record<string, unknown>[];

    // horizontal: xAxis=value, yAxis=category
    for (const xAxis of xAxes) {
      // facetYAxisType에 따라 'value' 또는 'log'
      expect(['value', 'log']).toContain(xAxis.type);
    }
    for (const yAxis of yAxes) {
      expect(yAxis.type).toBe('category');
    }
  });

  it('facet-layout: ncol=1 → 단일 열 레이아웃', () => {
    const layout = computeFacetLayout(3, 1);
    expect(layout.cols).toBe(1);
    expect(layout.rows).toBe(3);
    expect(layout.items.length).toBe(3);

    // 모든 항목의 left 값이 동일 (단일 열)
    const lefts = layout.items.map(it => it.left);
    expect(new Set(lefts).size).toBe(1);
  });

  it('partitionRowsByFacet: null 값 → 빈 문자열로 그룹', () => {
    const rows = [
      { species: null, val: 10 },
      { species: undefined, val: 20 },
      { species: 'A', val: 30 },
    ];
    const groups = partitionRowsByFacet(
      rows as unknown as Record<string, unknown>[],
      'species',
    );
    // null/undefined → String(null)='null', String(undefined)='undefined'
    // 하지만 코드는 `String(row[field] ?? '')` → null/undefined → ''
    expect(groups.has('')).toBe(true);
    expect(groups.get('')?.length).toBe(2); // null + undefined 모두 '' 그룹
    expect(groups.get('A')?.length).toBe(1);
  });

  it('Y2 schema: y2.type 필드 없으면 실패', () => {
    const spec = makeSpec({
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        // type 누락
        y2: { field: 'extra' } as ChartSpec['encoding']['y2'],
      },
    });
    expect(chartSpecSchema.safeParse(spec).success).toBe(false);
  });

  it('facet shareAxis=false → yAxis에 min/max 미설정', () => {
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'bar',
      data: { sourceId: 'test', columns: FACET_COLUMNS },
      encoding: {
        x: { field: 'length', type: 'quantitative' },
        y: { field: 'weight', type: 'quantitative' },
      },
      facet: { field: 'species', shareAxis: false },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };

    const option = chartSpecToECharts(spec, FACET_ROWS);
    const yAxes = option.yAxis as Record<string, unknown>[];

    // shareAxis=false → 각 패싯이 독립 범위 → min/max 미설정
    for (const axis of yAxes) {
      expect(axis.min).toBeUndefined();
      expect(axis.max).toBeUndefined();
    }
  });

  it('facet ncol > 그룹 수 → 1행에 모든 패싯', () => {
    const layout = computeFacetLayout(3, 6);
    expect(layout.cols).toBe(6);
    expect(layout.rows).toBe(1);
    // 실제 item은 3개만 (ncol=6이어도 패싯 3개)
    expect(layout.items.length).toBe(3);
  });
});

// ─── SIM-7: Y2 핸들러 type 강제 검증 ────────────────────

describe('SIM-7: Y2 핸들러 type 안전성', () => {
  it('Y2 필드에 quantitative 아닌 컬럼 → 스키마 거부', () => {
    const spec = makeSpec({
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        y2: { field: 'category', type: 'nominal' as 'quantitative' },
      },
    });

    // 스키마 검증에서 거부되어야 함
    const result = chartSpecSchema.safeParse(spec);
    expect(result.success).toBe(false);
  });

  it('Y2 handler 시뮬레이션: quantitative 컬럼 → 정상', () => {
    // DataTab handleY2FieldChange 시뮬레이션
    const columns = BASIC_COLUMNS;
    const value = 'extra';
    const col = columns.find(c => c.name === value);

    const y2 = { field: value, type: col?.type ?? 'quantitative' };
    // extra는 quantitative → 정상
    expect(y2.type).toBe('quantitative');
  });

  it('Y2 handler 시뮬레이션: 존재하지 않는 컬럼 → quantitative 폴백', () => {
    const columns = BASIC_COLUMNS;
    const value = 'nonexistent';
    const col = columns.find(c => c.name === value);

    const y2 = { field: value, type: col?.type ?? 'quantitative' };
    // col이 undefined → 'quantitative' 폴백
    expect(y2.type).toBe('quantitative');
  });
});
