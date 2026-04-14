import {
  CHART_CAPABILITIES,
  REGISTERED_CHART_TYPES,
  getChartCapabilities,
  isRegisteredChartType,
} from '@/lib/graph-studio/chart-capabilities';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { MPL_SUPPORTED_CHART_TYPES } from '@/lib/graph-studio/matplotlib-compat';

describe('chart capability registry', () => {
  test('guards unknown chart types and resolves registered types', () => {
    expect(isRegisteredChartType('bar')).toBe(true);
    expect(isRegisteredChartType('radar')).toBe(false);
    expect(getChartCapabilities('bar')).toEqual(CHART_CAPABILITIES.bar);
    expect(getChartCapabilities('radar')).toBeNull();
  });

  test('keeps chart hints aligned with the shared capability registry', () => {
    for (const chartType of REGISTERED_CHART_TYPES) {
      expect(CHART_TYPE_HINTS[chartType]).toMatchObject(CHART_CAPABILITIES[chartType]);
    }
  });

  test('derives matplotlib compatibility from the shared capability registry', () => {
    const expected = REGISTERED_CHART_TYPES.filter(
      (chartType) => CHART_CAPABILITIES[chartType].supportsMatplotlibExport,
    );

    expect([...MPL_SUPPORTED_CHART_TYPES]).toEqual(expected);
  });

  test('captures preview-only capability differences explicitly', () => {
    expect(CHART_CAPABILITIES.heatmap.supportsZoom).toBe(false);
    expect(CHART_CAPABILITIES.scatter.supportsTrendline).toBe(true);
    expect(CHART_CAPABILITIES['error-bar'].supportsSignificance).toBe(true);
    expect(CHART_CAPABILITIES['error-bar'].supportsMatplotlibExport).toBe(false);
  });
});
