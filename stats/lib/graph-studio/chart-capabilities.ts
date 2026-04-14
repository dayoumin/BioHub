import type { ChartType } from '@/types/graph-studio';

export interface ChartCapability {
  supportsColor: boolean;
  supportsErrorBar: boolean;
  supportsAggregate: boolean;
  supportsY2: boolean;
  supportsFacet: boolean;
  supportsOrientation: boolean;
  supportsSignificance: boolean;
  supportsDataLabels: boolean;
  supportsSampleCounts: boolean;
  supportsZoom: boolean;
  supportsTrendline: boolean;
  supportsMatplotlibExport: boolean;
}

export const CHART_CAPABILITIES: Record<ChartType, ChartCapability> = {
  bar: {
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
    supportsY2: true,
    supportsFacet: true,
    supportsOrientation: true,
    supportsSignificance: true,
    supportsDataLabels: true,
    supportsSampleCounts: true,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: true,
  },
  'grouped-bar': {
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: true,
    supportsSignificance: true,
    supportsDataLabels: true,
    supportsSampleCounts: true,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: true,
  },
  'stacked-bar': {
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: true,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: true,
    supportsSignificance: false,
    supportsDataLabels: true,
    supportsSampleCounts: true,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: true,
  },
  line: {
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
    supportsY2: true,
    supportsFacet: false,
    supportsOrientation: false,
    supportsSignificance: false,
    supportsDataLabels: false,
    supportsSampleCounts: false,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: true,
  },
  scatter: {
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: true,
    supportsOrientation: false,
    supportsSignificance: false,
    supportsDataLabels: false,
    supportsSampleCounts: false,
    supportsZoom: true,
    supportsTrendline: true,
    supportsMatplotlibExport: true,
  },
  boxplot: {
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: false,
    supportsSignificance: false,
    supportsDataLabels: false,
    supportsSampleCounts: false,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: false,
  },
  histogram: {
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: false,
    supportsSignificance: false,
    supportsDataLabels: false,
    supportsSampleCounts: false,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: false,
  },
  'error-bar': {
    supportsColor: true,
    supportsErrorBar: true,
    supportsAggregate: true,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: false,
    supportsSignificance: true,
    supportsDataLabels: false,
    supportsSampleCounts: true,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: false,
  },
  heatmap: {
    supportsColor: false,
    supportsErrorBar: false,
    supportsAggregate: true,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: false,
    supportsSignificance: false,
    supportsDataLabels: false,
    supportsSampleCounts: false,
    supportsZoom: false,
    supportsTrendline: false,
    supportsMatplotlibExport: false,
  },
  violin: {
    supportsColor: false,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: false,
    supportsSignificance: false,
    supportsDataLabels: false,
    supportsSampleCounts: false,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: false,
  },
  'km-curve': {
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: false,
    supportsSignificance: false,
    supportsDataLabels: false,
    supportsSampleCounts: false,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: false,
  },
  'roc-curve': {
    supportsColor: true,
    supportsErrorBar: false,
    supportsAggregate: false,
    supportsY2: false,
    supportsFacet: false,
    supportsOrientation: false,
    supportsSignificance: false,
    supportsDataLabels: false,
    supportsSampleCounts: false,
    supportsZoom: true,
    supportsTrendline: false,
    supportsMatplotlibExport: false,
  },
};

export const REGISTERED_CHART_TYPES = Object.keys(CHART_CAPABILITIES) as ChartType[];

export function isRegisteredChartType(chartType: string): chartType is ChartType {
  return Object.prototype.hasOwnProperty.call(CHART_CAPABILITIES, chartType);
}

export function getChartCapabilities(chartType: string): ChartCapability | null {
  return isRegisteredChartType(chartType) ? CHART_CAPABILITIES[chartType] : null;
}

export function getRegisteredChartTypesByCapability<K extends keyof ChartCapability>(
  capability: K,
): ChartType[] {
  return REGISTERED_CHART_TYPES.filter((chartType) => CHART_CAPABILITIES[chartType][capability]);
}

export function supportsMatplotlibExport(chartType: string): boolean {
  const capabilities = getChartCapabilities(chartType);
  return capabilities?.supportsMatplotlibExport ?? false;
}
