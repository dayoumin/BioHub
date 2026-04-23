import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter';
import type { ChartSpec } from '@/types/graph-studio';

const BASIC_COLUMNS: ChartSpec['data']['columns'] = [
  { name: 'category', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B', 'C'], hasNull: false },
  { name: 'value', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20', '15'], hasNull: false },
  { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['G1', 'G2'], hasNull: false },
];

const BASIC_ROWS: Record<string, unknown>[] = [
  { category: 'A', value: 10, group: 'G1' },
  { category: 'B', value: 20, group: 'G1' },
  { category: 'C', value: 15, group: 'G2' },
];

const DISTRIBUTION_ROWS: Record<string, unknown>[] = [
  { category: 'A', value: 8 },
  { category: 'A', value: 9 },
  { category: 'A', value: 10 },
  { category: 'A', value: 11 },
  { category: 'A', value: 12 },
  { category: 'B', value: 15 },
  { category: 'B', value: 16 },
  { category: 'B', value: 17 },
  { category: 'B', value: 18 },
  { category: 'B', value: 19 },
];

const HEATMAP_ROWS: Record<string, unknown>[] = [
  { category: 'A', group: 'G1', value: 10 },
  { category: 'A', group: 'G2', value: 12 },
  { category: 'B', group: 'G1', value: 15 },
  { category: 'B', group: 'G2', value: 18 },
];

const KM_ROWS: Record<string, unknown>[] = [
  { time: 0, survival: 1, group: 'A', ciLo: 1, ciHi: 1, isCensored: 0, __logRankP: 0.04 },
  { time: 5, survival: 0.82, group: 'A', ciLo: 0.72, ciHi: 0.92, isCensored: 1, __logRankP: 0.04 },
  { time: 10, survival: 0.68, group: 'A', ciLo: 0.55, ciHi: 0.81, isCensored: 0, __logRankP: 0.04 },
  { time: 0, survival: 1, group: 'B', ciLo: 1, ciHi: 1, isCensored: 0, __logRankP: 0.04 },
  { time: 5, survival: 0.91, group: 'B', ciLo: 0.84, ciHi: 0.98, isCensored: 0, __logRankP: 0.04 },
  { time: 10, survival: 0.75, group: 'B', ciLo: 0.63, ciHi: 0.87, isCensored: 1, __logRankP: 0.04 },
];

const ROC_ROWS: Record<string, unknown>[] = [
  { fpr: 0, tpr: 0, __auc: 0.88, __aucLo: 0.8, __aucHi: 0.96 },
  { fpr: 0.1, tpr: 0.55, __auc: 0.88, __aucLo: 0.8, __aucHi: 0.96 },
  { fpr: 0.35, tpr: 0.82, __auc: 0.88, __aucLo: 0.8, __aucHi: 0.96 },
  { fpr: 1, tpr: 1, __auc: 0.88, __aucLo: 0.8, __aucHi: 0.96 },
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

function makeChartTypeSpec(chartType: ChartSpec['chartType']): { spec: ChartSpec; rows: Record<string, unknown>[] } {
  if (chartType === 'scatter') {
    return {
      spec: makeSpec({
        chartType,
        encoding: {
          x: { field: 'value', type: 'quantitative' },
          y: { field: 'category', type: 'quantitative' },
        },
      }),
      rows: BASIC_ROWS.map((row, index) => ({ ...row, category: index + 1 })),
    };
  }

  if (chartType === 'line') {
    return {
      spec: makeSpec({
        chartType,
        encoding: {
          x: { field: 'category', type: 'nominal' },
          y: { field: 'value', type: 'quantitative' },
          color: { field: 'group', type: 'nominal' },
        },
      }),
      rows: BASIC_ROWS,
    };
  }

  if (chartType === 'boxplot' || chartType === 'violin') {
    return { spec: makeSpec({ chartType }), rows: DISTRIBUTION_ROWS };
  }

  if (chartType === 'histogram') {
    return {
      spec: makeSpec({
        chartType,
        encoding: {
          x: { field: 'value', type: 'quantitative' },
          y: { field: 'value', type: 'quantitative' },
        },
      }),
      rows: DISTRIBUTION_ROWS,
    };
  }

  if (chartType === 'heatmap') {
    return {
      spec: makeSpec({
        chartType,
        encoding: {
          x: { field: 'category', type: 'nominal' },
          y: { field: 'group', type: 'nominal' },
          color: { field: 'value', type: 'quantitative' },
        },
      }),
      rows: HEATMAP_ROWS,
    };
  }

  if (chartType === 'km-curve') {
    return {
      spec: makeSpec({
        chartType,
        data: {
          sourceId: 'test',
          columns: [
            { name: 'time', type: 'quantitative', uniqueCount: 3, sampleValues: ['0', '5', '10'], hasNull: false },
            { name: 'survival', type: 'quantitative', uniqueCount: 4, sampleValues: ['1', '0.82'], hasNull: false },
            { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          ],
        },
        encoding: {
          x: { field: 'time', type: 'quantitative' },
          y: { field: 'survival', type: 'quantitative' },
          color: { field: 'group', type: 'nominal' },
        },
      }),
      rows: KM_ROWS,
    };
  }

  if (chartType === 'roc-curve') {
    return {
      spec: makeSpec({
        chartType,
        data: {
          sourceId: 'test',
          columns: [
            { name: 'fpr', type: 'quantitative', uniqueCount: 4, sampleValues: ['0', '0.1'], hasNull: false },
            { name: 'tpr', type: 'quantitative', uniqueCount: 4, sampleValues: ['0', '0.55'], hasNull: false },
          ],
        },
        encoding: {
          x: { field: 'fpr', type: 'quantitative' },
          y: { field: 'tpr', type: 'quantitative' },
        },
      }),
      rows: ROC_ROWS,
    };
  }

  return { spec: makeSpec({ chartType }), rows: BASIC_ROWS };
}

function getSeriesArray(option: Record<string, unknown>): Record<string, unknown>[] {
  return Array.isArray(option.series)
    ? option.series as Record<string, unknown>[]
    : [];
}

describe('Graph Studio bar layout defaults', () => {
  it('keeps every registered chart type convertible with the wider default grid', () => {
    const chartTypes = Object.keys(CHART_TYPE_HINTS) as ChartSpec['chartType'][];

    expect(chartTypes).toHaveLength(12);
    for (const chartType of chartTypes) {
      const { spec, rows } = makeChartTypeSpec(chartType);
      const option = chartSpecToECharts(spec, rows) as Record<string, unknown>;
      const grid = option.grid as Record<string, unknown> | Record<string, unknown>[] | undefined;
      const series = getSeriesArray(option);

      expect(grid).toBeDefined();
      expect(series.length).toBeGreaterThan(0);

      if (Array.isArray(grid)) {
        expect(grid.length).toBeGreaterThan(0);
      } else {
        expect(grid?.left).toBe('10%');
        expect(grid?.right).toBe('7%');
        expect(['8%', '12%']).toContain(grid?.top);
      }
    }
  });

  it('keeps facet charts on their own multi-grid layout', () => {
    const option = chartSpecToECharts(
      makeSpec({
        facet: { field: 'group', ncol: 2 },
      }),
      BASIC_ROWS,
    ) as Record<string, unknown>;
    const grid = option.grid as Record<string, unknown>[];

    expect(Array.isArray(grid)).toBe(true);
    expect(grid).toHaveLength(2);
    expect(grid[0].left).not.toBe('10%');
  });

  it('caps single bar width and reserves canvas margins', () => {
    const option = chartSpecToECharts(makeSpec(), BASIC_ROWS) as Record<string, unknown>;
    const series = getSeriesArray(option);
    const grid = option.grid as Record<string, unknown>;

    expect(series[0].barMaxWidth).toBe(88);
    expect(series[0].barCategoryGap).toBe('48%');
    expect(grid.left).toBe('10%');
    expect(grid.right).toBe('7%');
    expect(grid.bottom).toBe('12%');
  });

  it('uses a tighter cap for grouped bars', () => {
    const option = chartSpecToECharts(
      makeSpec({
        chartType: 'grouped-bar',
        encoding: {
          x: { field: 'category', type: 'nominal' },
          y: { field: 'value', type: 'quantitative' },
          color: { field: 'group', type: 'nominal' },
        },
      }),
      BASIC_ROWS,
    ) as Record<string, unknown>;
    const series = getSeriesArray(option);

    expect(series.length).toBeGreaterThan(1);
    for (const barSeries of series) {
      expect(barSeries.barMaxWidth).toBe(44);
      expect(barSeries.barCategoryGap).toBe('36%');
    }
  });

  it('caps horizontal bar thickness separately', () => {
    const option = chartSpecToECharts(
      makeSpec({ orientation: 'horizontal' }),
      BASIC_ROWS,
    ) as Record<string, unknown>;
    const series = getSeriesArray(option);

    expect(series[0].barMaxWidth).toBe(32);
  });

  it('keeps error-bar width vertical even when stale orientation is horizontal', () => {
    const option = chartSpecToECharts(
      makeSpec({ chartType: 'error-bar', orientation: 'horizontal' }),
      BASIC_ROWS,
    ) as Record<string, unknown>;
    const series = getSeriesArray(option);

    expect((option.xAxis as Record<string, unknown>).type).toBe('category');
    expect(series[0].barMaxWidth).toBe(88);
  });
});
