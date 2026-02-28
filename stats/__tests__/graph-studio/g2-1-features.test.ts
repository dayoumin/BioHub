/**
 * G2-1 Quick Wins — 기능 검증 테스트
 *
 * 커버 범위:
 *   G2-1-A: ColorBrewer 팔레트 — scheme → 올바른 색상 배열
 *   G2-1-B: 막대 데이터 레이블 — showDataLabels → label.show, position
 *   G2-1-C: 수평 막대 — orientation: 'horizontal' → 축 swap + encode swap
 *   G2-1-D: 에러바 + orientation — errorBar 경로는 orientation 무시
 */

import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter';
import { COLORBREWER_PALETTES } from '@/lib/graph-studio/chart-spec-defaults';
import type { ChartSpec } from '@/types/graph-studio';

// ─── 테스트 픽스처 ─────────────────────────────────────────

const SAMPLE_ROWS = [
  { group: 'A', value: 10 },
  { group: 'B', value: 20 },
  { group: 'C', value: 15 },
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
      ],
    },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: {
      preset: 'default',
    },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
    ...overrides,
  };
}

// ─── G2-1-A: ColorBrewer 팔레트 ────────────────────────────

describe('G2-1-A: ColorBrewer 팔레트', () => {
  test('COLORBREWER_PALETTES에 10개 팔레트가 정의됨', () => {
    const keys = Object.keys(COLORBREWER_PALETTES);
    expect(keys.length).toBe(10);
    expect(keys).toContain('Set2');
    expect(keys).toContain('viridis');
    expect(keys).toContain('RdBu');
  });

  test('각 팔레트는 #으로 시작하는 hex 색상값만 가짐', () => {
    for (const [name, palette] of Object.entries(COLORBREWER_PALETTES)) {
      expect(palette.length).toBeGreaterThanOrEqual(4);
      for (const color of palette) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  });

  test('style.scheme="Set2" → ECharts color에 Set2 팔레트 사용', () => {
    const spec = makeBarSpec({ style: { preset: 'default', scheme: 'Set2' } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const colors = (option as Record<string, unknown>).color as string[];
    expect(colors).toEqual(COLORBREWER_PALETTES.Set2);
  });

  test('style.scheme="viridis" → viridis 팔레트 사용', () => {
    const spec = makeBarSpec({ style: { preset: 'default', scheme: 'viridis' } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const colors = (option as Record<string, unknown>).color as string[];
    expect(colors).toEqual(COLORBREWER_PALETTES.viridis);
  });

  test('style.scheme 없고 style.colors 있으면 → colors 우선', () => {
    const customColors = ['#ff0000', '#00ff00', '#0000ff'];
    const spec = makeBarSpec({ style: { preset: 'default', colors: customColors } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const colors = (option as Record<string, unknown>).color as string[];
    expect(colors).toEqual(customColors);
  });

  test('style.colors가 style.scheme보다 우선순위 높음', () => {
    const customColors = ['#111111', '#222222'];
    const spec = makeBarSpec({
      style: { preset: 'default', scheme: 'Set2', colors: customColors },
    });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const colors = (option as Record<string, unknown>).color as string[];
    // colors가 있으면 scheme 무시 → customColors 반환
    expect(colors).toEqual(customColors);
  });

  test('존재하지 않는 scheme → preset 기본 색상으로 fallback', () => {
    const spec = makeBarSpec({ style: { preset: 'default', scheme: 'NonExistent' } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const colors = (option as Record<string, unknown>).color as string[];
    // COLORBREWER_PALETTES['NonExistent'] = undefined → preset default 색상
    expect(colors[0]).toBe('#5470c6');  // default preset 첫 번째 색상
  });
});

// ─── G2-1-B: 막대 데이터 레이블 ────────────────────────────

describe('G2-1-B: 막대 데이터 레이블 (showDataLabels)', () => {
  test('showDataLabels 없음(default) → series에 label 없음', () => {
    const spec = makeBarSpec();
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const series = (option as Record<string, unknown>).series as Record<string, unknown>[];
    // label이 없거나 label.show가 false여야 함
    const label = series[0]?.label as Record<string, unknown> | undefined;
    expect(label).toBeUndefined();
  });

  test('showDataLabels: true → series[0].label.show = true', () => {
    const spec = makeBarSpec({ style: { preset: 'default', showDataLabels: true } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const series = (option as Record<string, unknown>).series as Record<string, unknown>[];
    const label = series[0]?.label as Record<string, unknown>;
    expect(label).toBeDefined();
    expect(label.show).toBe(true);
  });

  test('수직 막대 + showDataLabels → position = "top"', () => {
    const spec = makeBarSpec({ style: { preset: 'default', showDataLabels: true } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const series = (option as Record<string, unknown>).series as Record<string, unknown>[];
    const label = series[0]?.label as Record<string, unknown>;
    expect(label.position).toBe('top');
  });

  test('수평 막대 + showDataLabels → position = "right"', () => {
    const spec = makeBarSpec({
      orientation: 'horizontal',
      style: { preset: 'default', showDataLabels: true },
    });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const series = (option as Record<string, unknown>).series as Record<string, unknown>[];
    const label = series[0]?.label as Record<string, unknown>;
    expect(label.position).toBe('right');
  });

  test('showDataLabels: true → label에 fontFamily 포함', () => {
    const spec = makeBarSpec({ style: { preset: 'default', showDataLabels: true } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const series = (option as Record<string, unknown>).series as Record<string, unknown>[];
    const label = series[0]?.label as Record<string, unknown>;
    expect(label.fontFamily).toBeDefined();
    expect(typeof label.fontFamily).toBe('string');
  });

  test('grouped-bar + showDataLabels → 모든 series에 label 적용', () => {
    const spec: ChartSpec = {
      ...makeBarSpec(),
      chartType: 'grouped-bar',
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        color: { field: 'group', type: 'nominal' },
      },
      style: { preset: 'default', showDataLabels: true },
    };
    const rows = [
      { group: 'A', value: 10 },
      { group: 'B', value: 20 },
    ];
    const option = chartSpecToECharts(spec, rows);
    const series = (option as Record<string, unknown>).series as Record<string, unknown>[];
    for (const s of series) {
      const label = s.label as Record<string, unknown>;
      expect(label?.show).toBe(true);
    }
  });
});

// ─── G2-1-C: 수평 막대 orientation ─────────────────────────

describe('G2-1-C: 수평 막대 orientation', () => {
  test('orientation 없음(default) → xAxis가 category, yAxis가 value', () => {
    const spec = makeBarSpec();
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const xAxis = option.xAxis as Record<string, unknown>;
    const yAxis = option.yAxis as Record<string, unknown>;
    expect(xAxis.type).toBe('category');
    expect(yAxis.type).toBe('value');
  });

  test('orientation: "horizontal" → xAxis가 value, yAxis가 category', () => {
    const spec = makeBarSpec({ orientation: 'horizontal' });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const xAxis = option.xAxis as Record<string, unknown>;
    const yAxis = option.yAxis as Record<string, unknown>;
    expect(xAxis.type).toBe('value');
    expect(yAxis.type).toBe('category');
  });

  test('수평 막대 → series encode.x = yField, encode.y = xField', () => {
    const spec = makeBarSpec({ orientation: 'horizontal' });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const series = (option.series as Record<string, unknown>[])[0];
    const encode = series.encode as Record<string, string>;
    expect(encode.x).toBe('value');  // yField
    expect(encode.y).toBe('group');  // xField
  });

  test('수직 막대 → series encode.x = xField, encode.y = yField', () => {
    const spec = makeBarSpec();
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const series = (option.series as Record<string, unknown>[])[0];
    const encode = series.encode as Record<string, string>;
    expect(encode.x).toBe('group');  // xField
    expect(encode.y).toBe('value');  // yField
  });

  test('grouped-bar + horizontal → xAxis value, yAxis category', () => {
    const rows = [
      { category: 'A', subgroup: 'X', val: 10 },
      { category: 'A', subgroup: 'Y', val: 15 },
      { category: 'B', subgroup: 'X', val: 20 },
      { category: 'B', subgroup: 'Y', val: 25 },
    ];
    const spec: ChartSpec = {
      version: '1.0',
      chartType: 'grouped-bar',
      orientation: 'horizontal',
      data: {
        sourceId: 'test',
        columns: [
          { name: 'category', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
          { name: 'subgroup', type: 'nominal', uniqueCount: 2, sampleValues: ['X', 'Y'], hasNull: false },
          { name: 'val', type: 'quantitative', uniqueCount: 4, sampleValues: ['10', '15', '20', '25'], hasNull: false },
        ],
      },
      encoding: {
        x: { field: 'category', type: 'nominal' },
        y: { field: 'val', type: 'quantitative' },
        color: { field: 'subgroup', type: 'nominal' },
      },
      style: { preset: 'default' },
      annotations: [],
      exportConfig: { format: 'png', dpi: 300 },
    };
    const option = chartSpecToECharts(spec, rows) as Record<string, unknown>;
    const xAxis = option.xAxis as Record<string, unknown>;
    const yAxis = option.yAxis as Record<string, unknown>;
    expect(xAxis.type).toBe('value');
    expect(yAxis.type).toBe('category');
  });

  test('stacked-bar + horizontal → 축 swap 적용', () => {
    const spec: ChartSpec = {
      ...makeBarSpec({ orientation: 'horizontal' }),
      chartType: 'stacked-bar',
    };
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const xAxis = option.xAxis as Record<string, unknown>;
    const yAxis = option.yAxis as Record<string, unknown>;
    expect(xAxis.type).toBe('value');
    expect(yAxis.type).toBe('category');
  });
});

// ─── G2-1-D: 에러바 + orientation 충돌 방지 ─────────────────

describe('G2-1-D: errorBar + orientation 충돌 방지', () => {
  test('errorBar 있고 orientation: "horizontal"이어도 xAxis = category (에러바 경로 사용)', () => {
    // 에러바 경로는 buildBarAxes() 대신 xAxisBase+yAxisBase 직접 사용 → orientation 무시
    const spec = makeBarSpec({
      orientation: 'horizontal',  // UI에서 disable되지만 spec에 남아있을 수 있음
      errorBar: { type: 'stderr' },
    });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const xAxis = option.xAxis as Record<string, unknown>;
    const yAxis = option.yAxis as Record<string, unknown>;
    // 에러바 경로: xAxis = xAxisBase('category'), yAxis = yAxisBase() = 'value'
    expect(xAxis.type).toBe('category');
    expect(yAxis.type).toBe('value');
  });

  test('errorBar 있으면 xAxis.data = 카테고리 배열 (explicitly set)', () => {
    const spec = makeBarSpec({ errorBar: { type: 'stdev' } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const xAxis = option.xAxis as Record<string, unknown>;
    // buildErrorBarData가 만든 categories가 xAxis.data로 설정됨
    expect(Array.isArray(xAxis.data)).toBe(true);
    expect((xAxis.data as string[]).length).toBe(3);
  });

  test('에러바 없고 orientation: "horizontal" → 정상 swap', () => {
    const spec = makeBarSpec({ orientation: 'horizontal' });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    expect((option.xAxis as Record<string, unknown>).type).toBe('value');
    expect((option.yAxis as Record<string, unknown>).type).toBe('category');
  });

  test('에러바 있고 orientation 없음 → 정상 수직 바', () => {
    const spec = makeBarSpec({ errorBar: { type: 'ci', value: 95 } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    expect((option.xAxis as Record<string, unknown>).type).toBe('category');
    expect((option.yAxis as Record<string, unknown>).type).toBe('value');
  });

  test('에러바 series: bar + custom 2개 반환', () => {
    const spec = makeBarSpec({ errorBar: { type: 'stderr' } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const series = option.series as Record<string, unknown>[];
    expect(series.length).toBe(2);
    expect(series[0].type).toBe('bar');
    expect(series[1].type).toBe('custom');  // error bar overlay
  });
});

// ─── G2-1-E: scheme fallback 체인 검증 ─────────────────────

describe('G2-1-E: 색상 우선순위 체인 (colors > scheme > preset)', () => {
  const PRIORITY_CASES: Array<{
    label: string;
    style: ChartSpec['style'];
    expectedFirst: string;
  }> = [
    {
      label: 'colors 있음 → colors[0]',
      style: { preset: 'default', colors: ['#aabbcc'], scheme: 'Set2' },
      expectedFirst: '#aabbcc',
    },
    {
      label: 'colors 없고 scheme="Set2" → Set2[0]',
      style: { preset: 'default', scheme: 'Set2' },
      expectedFirst: COLORBREWER_PALETTES.Set2[0],
    },
    {
      label: 'colors/scheme 없고 preset="ieee" → ieee 색상[0]',
      style: { preset: 'ieee' },
      expectedFirst: '#000000',  // ieee preset 첫 번째 색상
    },
    {
      label: 'colors/scheme 없고 preset="default" → default 색상[0]',
      style: { preset: 'default' },
      expectedFirst: '#5470c6',
    },
  ];

  test.each(PRIORITY_CASES)('$label', ({ style, expectedFirst }) => {
    const spec = makeBarSpec({ style });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS);
    const colors = (option as Record<string, unknown>).color as string[];
    expect(colors[0]).toBe(expectedFirst);
  });
});
