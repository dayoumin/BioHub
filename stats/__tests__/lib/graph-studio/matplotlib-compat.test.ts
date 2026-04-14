import { describe, expect, it } from 'vitest';
import {
  getMatplotlibCompatibilityReport,
  MPL_SUPPORTED_CHART_TYPES,
} from '@/lib/graph-studio/matplotlib-compat';
import {
  getRegisteredChartTypesByCapability,
  supportsMatplotlibExport,
} from '@/lib/graph-studio/chart-capabilities';
import type { ChartSpec } from '@/types/graph-studio';

function makeSpec(
  chartType: ChartSpec['chartType'],
  overrides?: Partial<ChartSpec>,
): ChartSpec {
  return {
    version: '1.0',
    chartType,
    title: 'Matplotlib Check',
    data: {
      sourceId: 'pkg-1',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 2, sampleValues: ['A', 'B'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 4, sampleValues: ['1', '2'], hasNull: false },
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

describe('matplotlib capability registry', () => {
  it('derives supported chart types from the shared capability registry', () => {
    expect([...MPL_SUPPORTED_CHART_TYPES]).toEqual(
      getRegisteredChartTypesByCapability('supportsMatplotlibExport'),
    );
    expect(supportsMatplotlibExport('bar')).toBe(true);
    expect(supportsMatplotlibExport('boxplot')).toBe(false);
  });

  it('blocks unsupported chart specs before matplotlib export starts', () => {
    const report = getMatplotlibCompatibilityReport(makeSpec('boxplot'));

    expect(report.isChartTypeSupported).toBe(false);
    expect(report.isExportable).toBe(false);
    expect(report.blockingIssues.map((issue) => issue.code)).toContain('unsupported-chart-type');
  });

  it('does not block explicit linear scales because they match the default renderer behavior', () => {
    const report = getMatplotlibCompatibilityReport(makeSpec('bar', {
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative', scale: { type: 'linear' } },
      },
    }));

    expect(report.isChartTypeSupported).toBe(true);
    expect(report.blockingIssues.map((issue) => issue.code)).not.toContain('axis-scale');
  });

  it('ignores stored custom legend labels when the legend is hidden', () => {
    const report = getMatplotlibCompatibilityReport(makeSpec('bar', {
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        color: {
          field: 'group',
          type: 'nominal',
          legend: {
            orient: 'none',
            customLabels: { A: 'Control', B: 'Treatment' },
          },
        },
      },
    }));

    expect(report.blockingIssues.map((issue) => issue.code)).not.toContain('legend-custom-labels');
  });
});
