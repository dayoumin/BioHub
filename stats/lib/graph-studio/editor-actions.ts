import type { ChartSpec, DataType } from '@/types/graph-studio';
import type { ChartType } from '@/types/graph-studio';
import { CHART_TYPE_HINTS } from './chart-spec-defaults';
import { getChartCapabilities } from './chart-capabilities';
import { resolveXYFields } from './chart-spec-utils';

export type FieldRoleAssignment = 'x' | 'y' | 'color' | 'facet' | 'y2';

export interface RoleAssignmentVisibility {
  canAssignColor: boolean;
  canAssignFacet: boolean;
  canAssignY2: boolean;
  showColorField: boolean;
  showFacetField: boolean;
  showY2Field: boolean;
}

export interface SetupFieldSelection {
  xField: string;
  yField: string;
  colorField: string;
}

const QUANTITATIVE_X_CHART_TYPES = new Set<ChartType>([
  'scatter',
  'histogram',
  'km-curve',
  'roc-curve',
]);

export function isAxisColumnTypeAllowed(
  chartType: ChartType,
  role: 'x' | 'y',
  columnType: DataType,
): boolean {
  if (role === 'y') {
    return columnType === 'quantitative';
  }

  if (QUANTITATIVE_X_CHART_TYPES.has(chartType)) {
    return columnType === 'quantitative';
  }

  return true;
}

export function getFieldRoleMap(spec: ChartSpec): Map<string, string> {
  const map = new Map<string, string>();
  if (spec.encoding.x?.field) map.set(spec.encoding.x.field, 'X');
  if (spec.encoding.y?.field) map.set(spec.encoding.y.field, 'Y');
  if (spec.encoding.y2?.field) map.set(spec.encoding.y2.field, 'Y2');
  if (spec.encoding.color?.field) map.set(spec.encoding.color.field, 'Color');
  if (spec.facet?.field) map.set(spec.facet.field, 'Facet');
  return map;
}

export function getRoleAssignmentVisibility(spec: ChartSpec): RoleAssignmentVisibility {
  const hints = CHART_TYPE_HINTS[spec.chartType];
  const hasY2 = !!spec.encoding.y2;
  const hasFacet = !!spec.facet;
  const canAssignColor = !!hints?.supportsColor && !hasY2 && !hasFacet;
  const canAssignFacet = !!hints?.supportsFacet && !hasY2;
  const canAssignY2 = !!hints?.supportsY2 && !hasFacet && spec.orientation !== 'horizontal';

  return {
    canAssignColor,
    canAssignFacet,
    canAssignY2,
    showColorField: canAssignColor,
    showFacetField: canAssignFacet,
    showY2Field: canAssignY2,
  };
}

export function assignFieldRole(
  spec: ChartSpec,
  field: string,
  role: FieldRoleAssignment,
  columnType: DataType,
): ChartSpec | null {
  const xField = spec.encoding.x.field;
  const yField = spec.encoding.y.field;

  switch (role) {
    case 'x':
      if (field === yField || field === xField) return null;
      if (!isAxisColumnTypeAllowed(spec.chartType, 'x', columnType)) return null;
      return {
        ...spec,
        encoding: {
          ...spec.encoding,
          x: { ...spec.encoding.x, field, type: columnType },
        },
      };
    case 'y':
      if (field === xField || field === yField) return null;
      if (!isAxisColumnTypeAllowed(spec.chartType, 'y', columnType)) return null;
      return {
        ...spec,
        encoding: {
          ...spec.encoding,
          y: { ...spec.encoding.y, field, type: columnType },
        },
      };
    case 'color':
      if (field === xField || field === yField) return null;
      if (spec.encoding.color?.field === field) return null;
      return {
        ...spec,
        encoding: {
          ...spec.encoding,
          color: { field, type: columnType },
        },
      };
    case 'facet':
      if (spec.facet?.field === field) return null;
      return { ...spec, facet: { field } };
    case 'y2':
      if (field === xField || field === yField) return null;
      if (spec.encoding.y2?.field === field) return null;
      return {
        ...spec,
        encoding: {
          ...spec.encoding,
          y2: { field, type: 'quantitative' },
        },
      };
  }
}

export function unassignFieldRole(spec: ChartSpec, field: string): ChartSpec | null {
  const role = getFieldRoleMap(spec).get(field);
  if (!role || role === 'X' || role === 'Y') return null;

  if (role === 'Color') {
    const { color: _color, ...restEncoding } = spec.encoding;
    return { ...spec, encoding: restEncoding };
  }

  if (role === 'Facet') {
    const { facet: _facet, ...restSpec } = spec;
    return restSpec;
  }

  if (role === 'Y2') {
    const { y2: _y2, ...restEncoding } = spec.encoding;
    return { ...spec, encoding: restEncoding };
  }

  return null;
}

export function changeChartType(spec: ChartSpec, nextChartType: ChartType): ChartSpec {
  const hint = CHART_TYPE_HINTS[nextChartType];
  const columns = spec.data.columns;
  const { xField, yField } = resolveXYFields(columns, hint);
  const xColumn = columns.find((column) => column.name === xField);
  const yColumn = columns.find((column) => column.name === yField);
  const { color: previousColor, y2: previousY2, ...baseEncoding } = spec.encoding;
  const { facet: _facet, errorBar: _errorBar, trendline: _trendline, ...cleanSpec } = spec;

  return {
    ...cleanSpec,
    chartType: nextChartType,
    encoding: {
      ...baseEncoding,
      ...(hint.supportsColor && previousColor ? { color: previousColor } : {}),
      ...(hint.supportsY2 && previousY2 ? { y2: previousY2 } : {}),
      x: {
        ...spec.encoding.x,
        field: xField,
        type: xColumn?.type ?? hint.suggestedXType,
      },
      y: {
        ...spec.encoding.y,
        field: yField,
        type: yColumn?.type ?? 'quantitative',
      },
    },
    ...(hint.supportsFacet && spec.facet ? { facet: spec.facet } : {}),
    ...(hint.supportsErrorBar && spec.errorBar ? { errorBar: spec.errorBar } : {}),
    ...(nextChartType === 'scatter' && spec.trendline ? { trendline: spec.trendline } : {}),
  };
}

export function normalizeChartSpecForEditorRules(spec: ChartSpec): ChartSpec {
  const capabilities = getChartCapabilities(spec.chartType);
  if (!capabilities) return spec;

  const xColumn = spec.data.columns.find((column) => column.name === spec.encoding.x.field);
  const yColumn = spec.data.columns.find((column) => column.name === spec.encoding.y.field);
  const canValidateAxisColumns = spec.data.columns.length > 0;
  const hasInvalidAxisTypes =
    canValidateAxisColumns &&
    (
      !xColumn ||
      !yColumn ||
      !isAxisColumnTypeAllowed(spec.chartType, 'x', xColumn.type) ||
      !isAxisColumnTypeAllowed(spec.chartType, 'y', yColumn.type) ||
      spec.encoding.x.type !== xColumn.type ||
      spec.encoding.y.type !== yColumn.type
    );

  const baseSpec = hasInvalidAxisTypes
    ? changeChartType(spec, spec.chartType)
    : spec;

  const normalized: ChartSpec = {
    ...baseSpec,
    encoding: { ...baseSpec.encoding },
    style: { ...baseSpec.style },
  };

  if (!capabilities.supportsOrientation || normalized.errorBar) {
    delete normalized.orientation;
  }

  if (!capabilities.supportsDataLabels) {
    normalized.style.showDataLabels = undefined;
  }

  if (!capabilities.supportsSampleCounts) {
    normalized.style.showSampleCounts = undefined;
  }

  if (!CHART_TYPE_HINTS[normalized.chartType].supportsY2 || normalized.orientation === 'horizontal') {
    delete normalized.encoding.y2;
  }

  if (normalized.encoding.y2) {
    delete normalized.facet;
  } else if (!CHART_TYPE_HINTS[normalized.chartType].supportsFacet) {
    delete normalized.facet;
  }

  if (!CHART_TYPE_HINTS[normalized.chartType].supportsColor || normalized.encoding.y2 || normalized.facet) {
    delete normalized.encoding.color;
  }

  const lineHasUnsupportedErrorBar =
    normalized.chartType === 'line' &&
    (!!normalized.encoding.color?.field || normalized.encoding.x.type === 'temporal');

  if (!capabilities.supportsErrorBar || normalized.encoding.y2 || normalized.facet || lineHasUnsupportedErrorBar) {
    delete normalized.errorBar;
  }

  if (!capabilities.supportsTrendline || normalized.facet) {
    delete normalized.trendline;
  }

  if (!capabilities.supportsSignificance || normalized.facet) {
    delete normalized.significance;
  }

  return normalized;
}

export function getDefaultSetupFieldSelection(
  columns: ChartSpec['data']['columns'],
  chartType: ChartType,
  preferredXY?: { x: string; y: string },
): SetupFieldSelection {
  const fields = resolveXYFields(columns, CHART_TYPE_HINTS[chartType], preferredXY);
  return {
    xField: fields.xField,
    yField: fields.yField,
    colorField: 'none',
  };
}

export function assignSetupFieldSelection(
  selection: SetupFieldSelection,
  role: 'x' | 'y' | 'color',
  value: string,
  chartType?: ChartType,
  columns?: readonly { name: string; type: DataType }[],
): SetupFieldSelection {
  const columnType = columns?.find((column) => column.name === value)?.type;

  switch (role) {
    case 'x':
      if (!value || value === selection.yField || value === selection.xField) return selection;
      if (
        chartType !== undefined &&
        columnType !== undefined &&
        !isAxisColumnTypeAllowed(chartType, 'x', columnType)
      ) {
        return selection;
      }
      return {
        xField: value,
        yField: selection.yField,
        colorField: selection.colorField === value ? 'none' : selection.colorField,
      };
    case 'y':
      if (!value || value === selection.xField || value === selection.yField) return selection;
      if (
        chartType !== undefined &&
        columnType !== undefined &&
        !isAxisColumnTypeAllowed(chartType, 'y', columnType)
      ) {
        return selection;
      }
      return {
        xField: selection.xField,
        yField: value,
        colorField: selection.colorField === value ? 'none' : selection.colorField,
      };
    case 'color':
      if (value === 'none') {
        return { ...selection, colorField: 'none' };
      }
      if (!value || value === selection.xField || value === selection.yField) return selection;
      return { ...selection, colorField: value };
  }
}
