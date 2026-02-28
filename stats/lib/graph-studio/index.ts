/**
 * Graph Studio 라이브러리 진입점
 */

// 스키마 & 검증
export {
  chartSpecSchema,
  chartSpecPatchSchema,
  aiEditResponseSchema,
  dataPackageSchema,
} from './chart-spec-schema';

// 기본값 & 프리셋
export {
  STYLE_PRESETS,
  DEFAULT_EXPORT_CONFIG,
  CHART_TYPE_HINTS,
  createDefaultChartSpec,
} from './chart-spec-defaults';

// 유틸리티
export {
  applyPatches,
  applyAndValidatePatches,
  inferColumnMeta,
  suggestChartType,
  selectXYFields,
  autoCreateChartSpec,
  columnsToRows,
  createChartSpecFromDataPackage,
} from './chart-spec-utils';

// ECharts 변환
export { chartSpecToECharts } from './echarts-converter';

// 프로젝트 저장소
export {
  listProjects,
  loadProject,
  saveProject,
  deleteProject,
  generateProjectId,
} from './project-storage';
