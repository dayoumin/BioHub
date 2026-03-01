/**
 * G2 버그픽스 회귀 테스트
 *
 * 커버 범위:
 *   R-1: annotations + significance graphic 병합 (덮어쓰기 방지)
 *   R-2: 수평 막대 significance 브래킷 좌표축 스왑
 *   R-3: 폰트 변경 시 preset font size 유지
 */

import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter';
import { STYLE_PRESETS } from '@/lib/graph-studio/chart-spec-defaults';
import type { ChartSpec, StylePreset } from '@/types/graph-studio';

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

// ─── R-1: annotations + significance graphic 병합 ─────────

describe('R-1: annotations가 significance와 함께 유지됨', () => {
  test('annotations만 있고 significance 없음 → graphic에 annotation만 존재', () => {
    const spec = makeBarSpec({
      annotations: [
        { type: 'text', text: 'Note A', x: 50, y: 50 },
        { type: 'line', x: 0, y: 100, x2: 200, y2: 100 },
      ],
    });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const graphic = option.graphic as Record<string, unknown>[];
    expect(graphic).toBeDefined();
    expect(graphic.length).toBe(2);
    expect(graphic[0].type).toBe('text');
    expect(graphic[1].type).toBe('line');
  });

  test('annotations + significance 동시 존재 → converter는 annotation을 graphic에 유지', () => {
    // converter 수준에서는 annotations만 graphic에 포함.
    // significance 브래킷은 ChartPreview의 finished 이벤트에서 추가.
    // 이 테스트는 converter가 annotations를 정상 반환하는지 확인.
    const spec = makeBarSpec({
      annotations: [{ type: 'text', text: 'Marker', x: 100, y: 30 }],
      significance: [{ groupA: 'A', groupB: 'B', pValue: 0.03 }],
    });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const graphic = option.graphic as Record<string, unknown>[];
    // annotation은 converter에서 유지되어야 함
    expect(graphic).toBeDefined();
    expect(graphic.length).toBe(1);
    expect(graphic[0].type).toBe('text');
    expect((graphic[0].style as Record<string, unknown>).text).toBe('Marker');
  });

  test('significance만 있고 annotations 비어있으면 → graphic undefined', () => {
    const spec = makeBarSpec({
      annotations: [],
      significance: [{ groupA: 'A', groupB: 'C', pValue: 0.001 }],
    });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    // annotations가 비어있으면 converter는 graphic을 세팅하지 않음
    expect(option.graphic).toBeUndefined();
  });
});

// ─── R-2: 수평 막대에서 significance 관련 축 검증 ──────────

describe('R-2: 수평 막대 orientation 축 swap 검증', () => {
  test('수평 막대에서 xAxis=value, yAxis=category (수직과 반대)', () => {
    const spec = makeBarSpec({ orientation: 'horizontal' });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    expect((option.xAxis as Record<string, unknown>).type).toBe('value');
    expect((option.yAxis as Record<string, unknown>).type).toBe('category');
  });

  test('수평 grouped-bar에서도 축 swap 유지', () => {
    const spec: ChartSpec = {
      ...makeBarSpec({ orientation: 'horizontal' }),
      chartType: 'grouped-bar',
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        color: { field: 'group', type: 'nominal' },
      },
    };
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    expect((option.xAxis as Record<string, unknown>).type).toBe('value');
    expect((option.yAxis as Record<string, unknown>).type).toBe('category');
  });

  test('수평 bar + significance → converter에서 crash 없음', () => {
    const spec = makeBarSpec({
      orientation: 'horizontal',
      significance: [{ groupA: 'A', groupB: 'B', pValue: 0.05 }],
    });
    expect(() => chartSpecToECharts(spec, SAMPLE_ROWS)).not.toThrow();
  });

  test('수평 error-bar 차트도 crash 없음', () => {
    const spec: ChartSpec = {
      ...makeBarSpec(),
      chartType: 'error-bar',
      significance: [{ groupA: 'A', groupB: 'C', pValue: 0.01 }],
    };
    expect(() => chartSpecToECharts(spec, SAMPLE_ROWS)).not.toThrow();
  });

  test('error-bar + orientation=horizontal → converter는 항상 xAxis=category (수직 레이아웃)', () => {
    // error-bar는 converter에서 orientation을 무시하고 항상 수직으로 렌더링
    // buildSignificanceGraphics도 error-bar일 때 isH=false로 처리해야 함
    const spec: ChartSpec = {
      ...makeBarSpec({ orientation: 'horizontal' }),
      chartType: 'error-bar',
    };
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    // error-bar는 항상 xAxis=category, yAxis=value
    expect((option.xAxis as Record<string, unknown>).type).toBe('category');
  });
});

// ─── R-3: 폰트 변경 시 preset font size 유지 ──────────────

describe('R-3: 폰트 family 변경 시 preset font size 유지', () => {
  const PRESET_FONT_SIZES: Record<StylePreset, { size: number; titleSize: number; labelSize: number }> = {
    default:   { size: 12, titleSize: 14, labelSize: 11 },
    science:   { size: 10, titleSize: 12, labelSize: 9 },
    ieee:      { size: 8,  titleSize: 10, labelSize: 8 },
    grayscale: { size: 11, titleSize: 13, labelSize: 10 },
  };

  for (const [presetKey, expected] of Object.entries(PRESET_FONT_SIZES)) {
    describe(`preset="${presetKey}" + font family 변경`, () => {
      test(`textStyle.fontSize = ${expected.size} 유지`, () => {
        const spec = makeBarSpec({
          style: {
            preset: presetKey as StylePreset,
            font: { family: 'Georgia, serif' },  // family만 변경, size 미지정
          },
        });
        const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
        const textStyle = option.textStyle as Record<string, unknown>;
        expect(textStyle.fontSize).toBe(expected.size);
        expect(textStyle.fontFamily).toBe('Georgia, serif');
      });

      test(`title.textStyle.fontSize = ${expected.titleSize} 유지`, () => {
        const spec = makeBarSpec({
          title: 'Test Title',
          style: {
            preset: presetKey as StylePreset,
            font: { family: 'Courier New, monospace' },
          },
        });
        const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
        const title = option.title as Record<string, unknown>;
        const titleTextStyle = title.textStyle as Record<string, unknown>;
        expect(titleTextStyle.fontSize).toBe(expected.titleSize);
        expect(titleTextStyle.fontFamily).toBe('Courier New, monospace');
      });

      test(`xAxis labelSize = ${expected.labelSize} 유지`, () => {
        const spec = makeBarSpec({
          style: {
            preset: presetKey as StylePreset,
            font: { family: 'Noto Sans KR, sans-serif' },
          },
        });
        const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
        const xAxis = option.xAxis as Record<string, unknown>;
        const axisLabel = xAxis.axisLabel as Record<string, unknown>;
        expect(axisLabel.fontSize).toBe(expected.labelSize);
      });
    });
  }

  test('font에 size를 명시적으로 지정하면 → 지정값 사용 (preset 무시)', () => {
    const spec = makeBarSpec({
      style: {
        preset: 'science',  // science: size=10
        font: { family: 'Georgia, serif', size: 16 },
      },
    });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const textStyle = option.textStyle as Record<string, unknown>;
    expect(textStyle.fontSize).toBe(16);  // 명시적 지정값 우선
  });

  test('font 없고 preset만 있으면 → preset font 그대로 사용', () => {
    const spec = makeBarSpec({ style: { preset: 'ieee' } });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const textStyle = option.textStyle as Record<string, unknown>;
    expect(textStyle.fontSize).toBe(STYLE_PRESETS.ieee.font?.size);
    expect(textStyle.fontFamily).toBe(STYLE_PRESETS.ieee.font?.family);
  });

  test('annotation text에도 preset labelSize가 반영됨', () => {
    const spec = makeBarSpec({
      annotations: [{ type: 'text', text: 'Note', x: 10, y: 10 }],
      style: {
        preset: 'science',
        font: { family: 'Georgia, serif' },  // family만 변경
      },
    });
    const option = chartSpecToECharts(spec, SAMPLE_ROWS) as Record<string, unknown>;
    const graphic = option.graphic as Record<string, unknown>[];
    const annStyle = graphic[0].style as Record<string, unknown>;
    // science preset fontSize = 10 (annotation은 style.fontSize 사용)
    expect(annStyle.fontSize).toBe(10);
    expect(annStyle.fontFamily).toBe('Georgia, serif');
  });
});
