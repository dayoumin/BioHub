/**
 * Graph Studio 타입 정의
 *
 * chartSpec = 모든 것의 기초
 * - ECharts 렌더링 (chartSpecToECharts)
 * - AI spec patch (ChartSpecPatch)
 * - 프로젝트 저장/복원 (GraphProject)
 */

// ─── Chart Types ───────────────────────────────────────────

export type ChartType =
  | 'bar'
  | 'grouped-bar'
  | 'stacked-bar'
  | 'line'
  | 'scatter'
  | 'boxplot'
  | 'histogram'
  | 'error-bar'
  | 'heatmap'
  | 'violin';

export type DataType = 'quantitative' | 'nominal' | 'ordinal' | 'temporal';

// ─── Column Metadata ───────────────────────────────────────

export interface ColumnMeta {
  name: string;
  type: DataType;
  uniqueCount: number;
  sampleValues: string[];
  hasNull: boolean;
}

// ─── Axis Spec ─────────────────────────────────────────────

export interface AxisSpec {
  field: string;
  type: DataType;
  title?: string;
  labelAngle?: number;
  labelFontSize?: number;
  titleFontSize?: number;
  format?: string;
  grid?: boolean;
  scale?: ScaleSpec;
  sort?: 'ascending' | 'descending' | null;
}

export interface ScaleSpec {
  domain?: [number, number] | string[];
  range?: [number, number] | string[];
  zero?: boolean;
  type?: 'linear' | 'log' | 'sqrt' | 'symlog';
}

// ─── Color / Shape ─────────────────────────────────────────

export interface ColorSpec {
  field: string;
  type: DataType;
  scale?: {
    scheme?: string;
    range?: string[];
  };
  legend?: LegendSpec;
}

export interface ShapeSpec {
  field: string;
  type: DataType;
}

export interface LegendSpec {
  title?: string;
  orient?: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'none';
  fontSize?: number;
  titleFontSize?: number;
}

// ─── Error Bar ─────────────────────────────────────────────

export interface ErrorBarSpec {
  type: 'ci' | 'stderr' | 'stdev' | 'iqr';
  value?: number;  // CI의 경우 95, 99 등
}

// ─── Annotations ───────────────────────────────────────────

export interface AnnotationSpec {
  type: 'text' | 'line' | 'rect';
  text?: string;
  x?: number | string;
  y?: number | string;
  x2?: number | string;
  y2?: number | string;
  color?: string;
  fontSize?: number;
  strokeDash?: number[];
}

// ─── Style Presets ─────────────────────────────────────────

export type StylePreset = 'default' | 'science' | 'ieee' | 'grayscale';

export interface StyleSpec {
  preset: StylePreset;
  font?: {
    family?: string;
    size?: number;
    titleSize?: number;
    labelSize?: number;
  };
  colors?: string[];
  background?: string;
  padding?: number;
  overrides?: Record<string, unknown>;
}

// ─── Export Config ──────────────────────────────────────────

// ECharts getDataURL가 지원하는 포맷만 정의 (pdf/tiff 제외)
export type ExportFormat = 'svg' | 'png';

export interface ExportConfig {
  format: ExportFormat;
  dpi: number;
  width: number;
  height: number;
  transparent?: boolean;
}

// ─── ChartSpec (핵심) ──────────────────────────────────────

export interface ChartSpec {
  /** 스키마 버전 */
  version: '1.0';

  /** 차트 유형 */
  chartType: ChartType;

  /** 차트 제목 */
  title?: string;

  /** 데이터 소스 */
  data: {
    sourceId: string;
    columns: ColumnMeta[];
  };

  /** 인코딩 (어떤 데이터를 어떤 시각 요소에 매핑) */
  encoding: {
    x: AxisSpec;
    y: AxisSpec;
    color?: ColorSpec;
    shape?: ShapeSpec;
    size?: { field: string; type: DataType };
  };

  /** 에러바 설정 */
  errorBar?: ErrorBarSpec;

  /** 집계 */
  aggregate?: {
    y: 'mean' | 'median' | 'sum' | 'count' | 'min' | 'max';
    groupBy: string[];
  };

  /** 스타일 */
  style: StyleSpec;

  /** 주석/마커 */
  annotations: AnnotationSpec[];

  /** export 기본 설정 */
  exportConfig: ExportConfig;
}

// ─── AI Patch ──────────────────────────────────────────────

export interface ChartSpecPatch {
  op: 'replace' | 'add' | 'remove';
  path: string;   // JSON Pointer (RFC 6901)
  value?: unknown;
}

export interface AiEditRequest {
  chartSpec: ChartSpec;
  userMessage: string;
  columnNames: string[];  // 데이터 값 없이 컬럼명만
  dataTypes: Record<string, DataType>;
}

export interface AiEditResponse {
  patches: ChartSpecPatch[];
  explanation: string;
  confidence: number;
}

// ─── DataPackage (모듈 간 데이터 전달) ─────────────────────

export interface DataPackage {
  id: string;
  source: 'smart-flow' | 'bio-tools' | 'upload' | 'species-checker';
  label: string;
  columns: ColumnMeta[];
  data: Record<string, unknown[]>;
  context?: {
    method?: string;
    summary?: Record<string, unknown>;
  };
  createdAt: string;
}

// ─── Graph Studio Project ──────────────────────────────────

export interface GraphProject {
  id: string;
  name: string;
  chartSpec: ChartSpec;
  dataPackageId: string;
  editHistory: AiEditResponse[];
  createdAt: string;
  updatedAt: string;
}

// ─── Graph Studio Store State ──────────────────────────────

export interface GraphStudioState {
  // 프로젝트
  currentProject: GraphProject | null;

  // 데이터
  dataPackage: DataPackage | null;
  isDataLoaded: boolean;

  // chartSpec
  chartSpec: ChartSpec | null;
  specHistory: ChartSpec[];
  historyIndex: number;

  // AI 편집
  lastAiResponse: AiEditResponse | null;

  // UI
  sidePanel: 'properties' | 'ai-chat' | 'presets' | 'export';
}
