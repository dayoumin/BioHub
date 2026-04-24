import { describe, expect, it } from 'vitest';
import type { ChartSpec } from '@/types/graph-studio';
import {
  assignSetupFieldSelection,
  changeChartType,
  getDefaultSetupFieldSelection,
  getRoleAssignmentVisibility,
  isAxisColumnTypeAllowed,
  normalizeChartSpecForEditorRules,
  assignFieldRole,
} from '@/lib/graph-studio/editor-actions';

function makeSpec(overrides: Partial<ChartSpec> = {}): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title: 'Test',
    data: {
      sourceId: 'test',
      columns: [
        { name: 'group', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B'], hasNull: false },
        { name: 'series', type: 'nominal', uniqueCount: 2, sampleValues: ['Control', 'Treatment'], hasNull: false },
        { name: 'value', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20', '30'], hasNull: false },
        { name: 'secondary', type: 'quantitative', uniqueCount: 3, sampleValues: ['1', '2', '3'], hasNull: false },
      ],
    },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
      color: { field: 'series', type: 'nominal' },
      y2: { field: 'secondary', type: 'quantitative' },
    },
    facet: { field: 'series' },
    errorBar: { type: 'stderr' },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
    ...overrides,
  };
}

describe('editor actions', () => {
  it('changeChartType preserves only capabilities supported by the next type', () => {
    const next = changeChartType(makeSpec(), 'line');

    expect(next.chartType).toBe('line');
    expect(next.encoding.color).toEqual({ field: 'series', type: 'nominal' });
    expect(next.encoding.y2).toEqual({ field: 'secondary', type: 'quantitative' });
    expect(next.errorBar).toEqual({ type: 'stderr' });
    expect(next.facet).toBeUndefined();
    expect(next.trendline).toBeUndefined();
  });

  it('changeChartType keeps trendline only for scatter', () => {
    const spec = makeSpec({
      chartType: 'scatter',
      facet: undefined,
      errorBar: undefined,
      encoding: {
        x: { field: 'value', type: 'quantitative' },
        y: { field: 'secondary', type: 'quantitative' },
        color: { field: 'series', type: 'nominal' },
      },
      trendline: { type: 'linear', showEquation: true },
    });

    expect(changeChartType(spec, 'scatter').trendline).toEqual({ type: 'linear', showEquation: true });
    expect(changeChartType(spec, 'bar').trendline).toBeUndefined();
  });

  it('role visibility matches mutual exclusion rules', () => {
    const base = getRoleAssignmentVisibility(makeSpec({ encoding: { x: { field: 'group', type: 'nominal' }, y: { field: 'value', type: 'quantitative' } }, facet: undefined, errorBar: undefined }));
    expect(base.showColorField).toBe(true);
    expect(base.showFacetField).toBe(true);
    expect(base.showY2Field).toBe(true);

    const withFacet = getRoleAssignmentVisibility(makeSpec({
      encoding: { x: { field: 'group', type: 'nominal' }, y: { field: 'value', type: 'quantitative' } },
      facet: { field: 'series' },
      errorBar: undefined,
    }));
    expect(withFacet.showColorField).toBe(false);
    expect(withFacet.showY2Field).toBe(false);
  });

  it('setup field selection prevents X/Y conflicts and clears conflicting color', () => {
    const defaults = getDefaultSetupFieldSelection(makeSpec().data.columns, 'bar');
    expect(defaults).toEqual({
      xField: 'group',
      yField: 'value',
      colorField: 'none',
    });

    const withColor = assignSetupFieldSelection(
      { ...defaults, colorField: 'series' },
      'x',
      'series',
    );

    expect(withColor).toEqual({
      xField: 'series',
      yField: 'value',
      colorField: 'none',
    });

    const invalidColor = assignSetupFieldSelection(withColor, 'color', 'series');
    expect(invalidColor.colorField).toBe('none');
  });

  it('setup field selection honors preferredXY only when it matches the chart type contract', () => {
    const scatterDefaults = getDefaultSetupFieldSelection(
      [
        { name: 'species', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B'], hasNull: false },
        { name: 'length_cm', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20'], hasNull: false },
        { name: 'weight_g', type: 'quantitative', uniqueCount: 3, sampleValues: ['100', '200'], hasNull: false },
        { name: 'year', type: 'temporal', uniqueCount: 3, sampleValues: ['2022', '2023'], hasNull: false },
      ],
      'scatter',
      { x: 'length_cm', y: 'weight_g' },
    );
    expect(scatterDefaults).toEqual({
      xField: 'length_cm',
      yField: 'weight_g',
      colorField: 'none',
    });

    const barDefaults = getDefaultSetupFieldSelection(
      [
        { name: 'species', type: 'nominal', uniqueCount: 3, sampleValues: ['A', 'B'], hasNull: false },
        { name: 'length_cm', type: 'quantitative', uniqueCount: 3, sampleValues: ['10', '20'], hasNull: false },
        { name: 'weight_g', type: 'quantitative', uniqueCount: 3, sampleValues: ['100', '200'], hasNull: false },
      ],
      'bar',
      { x: 'length_cm', y: 'weight_g' },
    );
    expect(barDefaults).toEqual({
      xField: 'species',
      yField: 'weight_g',
      colorField: 'none',
    });
  });

  it('rejects invalid axis assignments for quantitative-only charts', () => {
    expect(isAxisColumnTypeAllowed('scatter', 'x', 'nominal')).toBe(false);
    expect(isAxisColumnTypeAllowed('scatter', 'y', 'ordinal')).toBe(false);
    expect(isAxisColumnTypeAllowed('line', 'y', 'nominal')).toBe(false);

    expect(assignFieldRole(makeSpec({ chartType: 'scatter' }), 'group', 'x', 'nominal')).toBeNull();
    expect(assignFieldRole(makeSpec({ chartType: 'line' }), 'series', 'y', 'nominal')).toBeNull();

    const unchanged = assignSetupFieldSelection(
      { xField: 'group', yField: 'value', colorField: 'none' },
      'y',
      'series',
      'line',
      makeSpec().data.columns,
    );
    expect(unchanged.yField).toBe('value');
  });

  it('reselects compatible axes when normalization receives an invalid scatter spec', () => {
    const normalized = normalizeChartSpecForEditorRules(makeSpec({
      chartType: 'scatter',
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'series', type: 'nominal' },
      },
      facet: undefined,
      errorBar: undefined,
    }));

    expect(normalized.chartType).toBe('scatter');
    expect(normalized.encoding.x.type).toBe('quantitative');
    expect(normalized.encoding.y.type).toBe('quantitative');
    expect(normalized.encoding.x.field).not.toBe(normalized.encoding.y.field);
  });

  it('reselects compatible axes when field metadata disagrees with encoding types', () => {
    const normalized = normalizeChartSpecForEditorRules(makeSpec({
      chartType: 'scatter',
      encoding: {
        x: { field: 'group', type: 'quantitative' },
        y: { field: 'value', type: 'quantitative' },
      },
      facet: undefined,
      errorBar: undefined,
    }));

    expect(normalized.chartType).toBe('scatter');
    expect(normalized.encoding.x.type).toBe('quantitative');
    expect(normalized.encoding.y.type).toBe('quantitative');
    expect(['value', 'secondary']).toContain(normalized.encoding.x.field);
    expect(['value', 'secondary']).toContain(normalized.encoding.y.field);
    expect(normalized.encoding.x.field).not.toBe(normalized.encoding.y.field);
  });

  it('normalizes editor-invalid combinations to the shared rule set', () => {
    const normalized = normalizeChartSpecForEditorRules(makeSpec({
      chartType: 'bar',
      orientation: 'horizontal',
      encoding: {
        x: { field: 'group', type: 'nominal' },
        y: { field: 'value', type: 'quantitative' },
        color: { field: 'series', type: 'nominal' },
        y2: { field: 'secondary', type: 'quantitative' },
      },
      facet: { field: 'series' },
      errorBar: { type: 'stderr' },
      significance: [{ groupA: 'A', groupB: 'B', pValue: 0.03 }],
      style: { preset: 'default', showDataLabels: true, showSampleCounts: true },
    }));

    expect(normalized.orientation).toBeUndefined();
    expect(normalized.facet).toBeUndefined();
    expect(normalized.encoding.color).toBeUndefined();
    expect(normalized.encoding.y2).toEqual({ field: 'secondary', type: 'quantitative' });
    expect(normalized.errorBar).toBeUndefined();
    expect(normalized.significance).toEqual([{ groupA: 'A', groupB: 'B', pValue: 0.03 }]);
    expect(normalized.style.showDataLabels).toBe(true);
    expect(normalized.style.showSampleCounts).toBe(true);
  });
});
