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
  JOURNAL_SIZE_PRESETS,
} from './chart-spec-defaults';
export type { JournalPresetKey } from './chart-spec-defaults';

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

// Export 유틸리티
export { downloadChart, mmToPx } from './export-utils';

// 프로젝트 저장소
export {
  listProjects,
  loadProject,
  saveProject,
  deleteProject,
  generateProjectId,
} from './project-storage';

// AI 서비스
export { editChart, buildAiEditRequest } from './ai-service';
