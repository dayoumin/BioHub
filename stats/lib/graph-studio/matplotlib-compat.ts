/**
 * matplotlib export 호환성 상수
 *
 * worker6-matplotlib.py의 RENDERER_MAP과 동기화.
 * ExportDialog에서 import하여 지원 여부 판단에 사용.
 */

/** matplotlib가 지원하는 차트 타입 (worker6-matplotlib.py RENDERER_MAP 기준) */
export const MPL_SUPPORTED_CHART_TYPES: ReadonlySet<string> = new Set([
  'bar',
  'grouped-bar',
  'stacked-bar',
  'line',
  'scatter',
]);
