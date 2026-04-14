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
export {
  CHART_CAPABILITIES,
  REGISTERED_CHART_TYPES,
  getChartCapabilities,
  isRegisteredChartType,
} from './chart-capabilities';

// 유틸리티
export {
  applyPatches,
  applyAndValidatePatches,
  inferColumnMeta,
  suggestChartType,
  analysisVizTypeToChartType,
  selectXYFields,
  selectAutoColorField,
  createAutoConfiguredChartSpec,
  applyAnalysisContext,
  autoCreateChartSpec,
  columnsToRows,
  createChartSpecFromDataPackage,
} from './chart-spec-utils';
export {
  ID_LIKE_TOKENS,
  CATEGORY_FRIENDLY_TOKENS,
  TIME_LIKE_TOKENS,
  RESPONSE_LIKE_TOKENS,
  PREDICTOR_LIKE_TOKENS,
  normalizeFieldName,
  hasToken,
  hasIdLikeName,
} from './chart-spec-heuristics';

// 패싯 레이아웃
export { partitionRowsByFacet, computeFacetLayout } from './facet-layout';
export type { FacetGridItem, FacetLayout } from './facet-layout';

// ECharts 변환
export { chartSpecToECharts } from './echarts-converter';

// Export 유틸리티
export { downloadChart, downloadBase64File, sanitizeFilename, mmToPx } from './export-utils';

// 프로젝트 저장소
export {
  MAX_GRAPH_PROJECTS,
  GRAPH_PROJECTS_CHANGED_EVENT,
  listProjects,
  loadProject,
  saveProject,
  deleteProjectCascade,
  generateProjectId,
} from './project-storage';

// 대용량 데이터 보호
export { CHART_DATA_LIMITS, getRowCount, getDataSizeLevel } from './chart-data-guard';
export type { DataSizeLevel } from './chart-data-guard';

// AI 서비스
export { editChart, buildAiEditRequest } from './ai-service';

// 분석 결과 어댑터
export {
  toAnalysisContext,
  buildAnalysisVisualizationColumns,
  buildKmCurveColumns,
  buildRocCurveColumns,
} from './analysis-adapter';
