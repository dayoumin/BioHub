/**
 * matplotlib 논문 Export 타입 정의
 *
 * Graph Studio에서 ECharts 외 matplotlib(Pyodide) 기반 논문용 고품질 export를 위한 타입.
 * ECharts ExportConfig와 별도로 관리 — ECharts는 'svg'|'png' 한정, matplotlib는 PDF/TIFF/EPS 포함.
 */

/** matplotlib savefig가 지원하는 export 포맷 */
export type MatplotlibExportFormat = 'png' | 'pdf' | 'svg' | 'tiff' | 'eps';

/** SciencePlots 스타일 프리셋 (no-latex 모드) */
export type MatplotlibStylePreset = 'science' | 'ieee' | 'default';

/** matplotlib export 설정 */
export interface MatplotlibExportConfig {
  /** 출력 포맷 */
  format: MatplotlibExportFormat;
  /** DPI (래스터: png/tiff. 벡터는 무시하지만 figure sizing에 사용) */
  dpi: number;
  /** 출력 너비 (mm). 기본 86mm (Nature single column) */
  physicalWidthMm: number;
  /** 출력 높이 (mm). 기본 60mm */
  physicalHeightMm: number;
  /** SciencePlots 스타일 프리셋 */
  style: MatplotlibStylePreset;
  /** PNG 투명 배경 */
  transparentBackground?: boolean;
}

/** Python render_chart() 반환값 */
export interface MatplotlibExportResult {
  /** base64 인코딩된 이미지/문서 데이터 */
  base64Data: string;
  /** MIME 타입 (예: 'application/pdf') */
  mimeType: string;
  /** 파일 확장자 (예: 'pdf') */
  extension: string;
}

/** Python render_chart()에 전달하는 요청 객체 (camelCase — Python I/O 규칙) */
export interface MatplotlibRenderRequest {
  /** ChartSpec JSON (chartType, encoding, style 등) */
  chartSpec: Record<string, unknown>;
  /** 데이터 (column-oriented: { colName: values[] }) */
  data: Record<string, unknown[]>;
  /** export 설정 */
  exportConfig: {
    format: MatplotlibExportFormat;
    dpi: number;
    physicalWidthMm: number;
    physicalHeightMm: number;
    style: MatplotlibStylePreset;
    transparentBackground?: boolean;
  };
}

/** matplotlib 스타일 → SciencePlots 스타일시트 매핑 */
export const MATPLOTLIB_STYLE_MAP: Record<MatplotlibStylePreset, string[]> = {
  default: [],
  science: ['science', 'no-latex'],
  ieee: ['science', 'ieee', 'no-latex'],
} as const;

/** matplotlib export 포맷 → MIME 타입 매핑 */
export const MATPLOTLIB_MIME_MAP: Record<MatplotlibExportFormat, string> = {
  png: 'image/png',
  pdf: 'application/pdf',
  svg: 'image/svg+xml',
  tiff: 'image/tiff',
  eps: 'application/postscript',
} as const;

/** matplotlib export 기본 설정 */
export const DEFAULT_MATPLOTLIB_EXPORT_CONFIG: MatplotlibExportConfig = {
  format: 'pdf',
  dpi: 300,
  physicalWidthMm: 86,
  physicalHeightMm: 60,
  style: 'science',
  transparentBackground: false,
};
