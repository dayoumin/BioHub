/**
 * matplotlib export 호환성 상수
 *
 * worker6-matplotlib.py의 RENDERER_MAP과 동기화.
 * ExportDialog에서 import하여 지원 여부 판단에 사용.
 */
import type { ChartSpec, ChartType } from '@/types/graph-studio';
import {
  getRegisteredChartTypesByCapability,
  REGISTERED_CHART_TYPES,
  supportsMatplotlibExport,
} from './chart-capabilities';
import { CHART_TYPE_HINTS } from './chart-spec-defaults';

/** matplotlib가 지원하는 차트 타입 (worker6-matplotlib.py RENDERER_MAP 기준) */
export const MPL_SUPPORTED_CHART_TYPES: ReadonlySet<ChartType> = new Set(
  getRegisteredChartTypesByCapability('supportsMatplotlibExport'),
);

export interface MatplotlibCompatibilityIssue {
  code: string;
  message: string;
}

export interface MatplotlibCompatibilityReport {
  isChartTypeSupported: boolean;
  isExportable: boolean;
  blockingIssues: MatplotlibCompatibilityIssue[];
  warningIssues: MatplotlibCompatibilityIssue[];
}

function hasAxisScaleCustomization(spec: ChartSpec): boolean {
  const xScale = spec.encoding.x.scale;
  const yScale = spec.encoding.y.scale;

  const hasCustomizedScale = (scale: typeof xScale | typeof yScale): boolean => {
    if (!scale) return false;
    return (
      (scale.type !== undefined && scale.type !== 'linear')
      || scale.zero !== undefined
      || scale.domain !== undefined
      || scale.range !== undefined
    );
  };

  return hasCustomizedScale(xScale) || hasCustomizedScale(yScale);
}

function hasCustomLegendLabels(spec: ChartSpec): boolean {
  const legend = spec.encoding.color?.legend;
  if (legend?.orient === 'none') {
    return false;
  }
  const customLabels = legend?.customLabels;
  return customLabels !== undefined && Object.keys(customLabels).length > 0;
}

export function getMatplotlibSupportedChartTypeLabels(): string[] {
  return REGISTERED_CHART_TYPES
    .filter((chartType) => supportsMatplotlibExport(chartType))
    .map((chartType) => CHART_TYPE_HINTS[chartType].label);
}

export function getMatplotlibCompatibilityReport(spec: ChartSpec): MatplotlibCompatibilityReport {
  const blockingIssues: MatplotlibCompatibilityIssue[] = [];
  const warningIssues: MatplotlibCompatibilityIssue[] = [];
  const isChartTypeSupported = MPL_SUPPORTED_CHART_TYPES.has(spec.chartType);

  if (!isChartTypeSupported) {
    blockingIssues.push({
      code: 'unsupported-chart-type',
      message: `${CHART_TYPE_HINTS[spec.chartType].label}은 matplotlib 논문용 내보내기 미지원입니다.`,
    });
  }

  if (spec.orientation === 'horizontal') {
    warningIssues.push({
      code: 'orientation',
      message: '수평 orientation은 matplotlib export에서 세로 막대로 근사 렌더링됩니다.',
    });
  }

  if (spec.facet) {
    blockingIssues.push({
      code: 'facet',
      message: '패싯(facet)은 matplotlib export에서 아직 지원되지 않습니다.',
    });
  }

  if (spec.encoding.y2) {
    blockingIssues.push({
      code: 'y2',
      message: '보조 Y축(y2)은 matplotlib export에서 아직 지원되지 않습니다.',
    });
  }

  if (spec.errorBar) {
    blockingIssues.push({
      code: 'error-bar',
      message: '에러바는 matplotlib export에서 아직 preview와 동일하게 렌더링되지 않습니다.',
    });
  }

  if (spec.significance?.length) {
    blockingIssues.push({
      code: 'significance',
      message: '유의성 브래킷(significance)은 matplotlib export에서 아직 지원되지 않습니다.',
    });
  }

  if (spec.annotations.length) {
    blockingIssues.push({
      code: 'annotations',
      message: '주석(annotation)은 matplotlib export에서 아직 지원되지 않습니다.',
    });
  }

  if (spec.aggregate?.y && spec.aggregate.y !== 'mean') {
    blockingIssues.push({
      code: 'aggregate',
      message: `aggregate.y=${spec.aggregate.y}는 matplotlib export에서 아직 preview와 동일하게 지원되지 않습니다.`,
    });
  }

  if (spec.style.showDataLabels) {
    blockingIssues.push({
      code: 'data-labels',
      message: '데이터 레이블은 matplotlib export에서 아직 지원되지 않습니다.',
    });
  }

  if (spec.style.showSampleCounts) {
    blockingIssues.push({
      code: 'sample-counts',
      message: '표본 수 표시는 matplotlib export에서 아직 지원되지 않습니다.',
    });
  }

  if (spec.encoding.x.sort) {
    blockingIssues.push({
      code: 'sort',
      message: 'X축 정렬 옵션은 matplotlib export에서 아직 preview와 동일하게 적용되지 않습니다.',
    });
  }

  if (hasAxisScaleCustomization(spec)) {
    blockingIssues.push({
      code: 'axis-scale',
      message: '축 scale/domain 커스터마이징은 matplotlib export에서 아직 지원되지 않습니다.',
    });
  }

  if (hasCustomLegendLabels(spec)) {
    blockingIssues.push({
      code: 'legend-custom-labels',
      message: '커스텀 legend 라벨은 matplotlib export에서 아직 지원되지 않습니다.',
    });
  }

  return {
    isChartTypeSupported,
    isExportable: blockingIssues.length === 0,
    blockingIssues,
    warningIssues,
  };
}
