import { chartSpecToECharts } from '@/lib/graph-studio/echarts-converter';
import type { ChartSpec } from '@/types/graph-studio';

const ROWS = [
  { x: 1, y: 2 },
  { x: 2, y: 4 },
  { x: 3, y: 5 },
  { x: 4, y: 7 },
  { x: 5, y: 9 },
];

function makeScatterSpec(trendline: ChartSpec['trendline']): ChartSpec {
  return {
    version: '1.0',
    chartType: 'scatter',
    data: {
      sourceId: 'test',
      columns: [
        { name: 'x', type: 'quantitative', uniqueCount: 5, sampleValues: ['1', '2'], hasNull: false },
        { name: 'y', type: 'quantitative', uniqueCount: 5, sampleValues: ['2', '4'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'x', type: 'quantitative' },
      y: { field: 'y', type: 'quantitative' },
    },
    trendline,
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 300 },
  };
}

function getLineSeries(option: Record<string, unknown>): Record<string, unknown> | undefined {
  const series = option.series;
  if (!Array.isArray(series)) return undefined;
  return (series as Record<string, unknown>[]).find(item => item.type === 'line');
}

describe('trendline fittedPoints', () => {
  it('falls back to raw data when persisted fittedPoints has fewer than two points', () => {
    const option = chartSpecToECharts(
      makeScatterSpec({ type: 'linear', fittedPoints: [[1, 2]] }),
      ROWS,
    ) as Record<string, unknown>;
    const line = getLineSeries(option);
    const data = line?.data as unknown[] | undefined;

    expect(data).toHaveLength(50);
  });

  it('uses persisted fittedPoints when at least two points are available', () => {
    const fittedPoints: Array<[number, number]> = [[1, 2], [5, 10]];
    const option = chartSpecToECharts(
      makeScatterSpec({ type: 'linear', fittedPoints }),
      ROWS,
    ) as Record<string, unknown>;
    const line = getLineSeries(option);

    expect(line?.data).toEqual(fittedPoints);
  });
});
