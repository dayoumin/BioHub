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
  autoCreateChartSpec,
} from './chart-spec-utils';

// Vega-Lite 변환
export { chartSpecToVegaLite } from './vega-lite-converter';
