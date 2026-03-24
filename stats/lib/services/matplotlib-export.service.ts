/**
 * matplotlib 논문용 Export 서비스
 *
 * Pyodide Worker 6 (worker6-matplotlib.py)를 통해
 * ChartSpec + DataPackage → matplotlib → base64 이미지/문서 → 브라우저 다운로드.
 *
 * Lazy loading: matplotlib는 첫 export 시에만 로드 (~5초).
 *
 * NOTE: 이 서비스는 ECharts export의 "대체"가 아니라 "보완".
 * ECharts(export-utils.ts)만으로도 논문 그래프 export 가능.
 * matplotlib은 SciencePlots 저널 프리셋(nature, ieee 등) 편의성 때문에 추가.
 * 대부분의 연구자는 ECharts export로 충분 — 이 서비스는 고급 옵션.
 */

import type { ChartSpec, DataPackage } from '@/types/graph-studio';
import type { MatplotlibExportConfig, MatplotlibExportResult } from '@/types/matplotlib-export';
import { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service';
import type { WorkerMethodParam } from '@/lib/services/pyodide/core/pyodide-core.service';
import { downloadBase64File } from '@/lib/graph-studio/export-utils';

/** Worker 6 번호 상수 */
const MATPLOTLIB_WORKER = 6 as const;

/** Progress 콜백 타입 */
type ProgressCallback = (stage: string) => void;

/**
 * matplotlib export 서비스 — singleton.
 *
 * 사용법:
 * ```typescript
 * const service = MatplotlibExportService.getInstance();
 * await service.exportChart(chartSpec, dataPackage, config, onProgress);
 * ```
 */
export class MatplotlibExportService {
  private static instance: MatplotlibExportService | null = null;
  private matplotlibReady = false;
  private loadPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): MatplotlibExportService {
    if (!MatplotlibExportService.instance) {
      MatplotlibExportService.instance = new MatplotlibExportService();
    }
    return MatplotlibExportService.instance;
  }

  /**
   * matplotlib Worker 로드 (첫 호출 시에만).
   * matplotlib + micropip + SciencePlots 모두 이 단계에서 설치됨.
   * 동시 호출 시 동일 promise를 공유하여 중복 로드 방지.
   */
  async ensureReady(onProgress?: ProgressCallback): Promise<void> {
    if (this.matplotlibReady) return;
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = (async () => {
      onProgress?.('matplotlib 로딩 중...');
      const core = PyodideCoreService.getInstance();
      await core.ensureWorkerLoaded(MATPLOTLIB_WORKER);
      this.matplotlibReady = true;
      onProgress?.('matplotlib 준비 완료');
    })();

    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * ChartSpec + DataPackage → matplotlib 렌더링 → 파일 다운로드.
   *
   * @param chartSpec - Graph Studio ChartSpec
   * @param dataPackage - 데이터 (column-oriented)
   * @param config - matplotlib export 설정 (포맷, DPI, 크기, 스타일)
   * @param onProgress - 진행 상태 콜백
   */
  async exportChart(
    chartSpec: ChartSpec,
    dataPackage: DataPackage,
    config: MatplotlibExportConfig,
    onProgress?: ProgressCallback,
  ): Promise<{ warnings?: string[] }> {
    // 1. Worker 준비
    await this.ensureReady(onProgress);

    // 2. Python에 전달할 데이터 준비
    onProgress?.('차트 렌더링 중...');

    const renderParams = {
      chartSpec: this.chartSpecToDict(chartSpec),
      data: dataPackage.data,
      exportConfig: {
        format: config.format,
        dpi: config.dpi,
        physicalWidthMm: config.physicalWidthMm,
        physicalHeightMm: config.physicalHeightMm,
        style: config.style,
        transparentBackground: config.transparentBackground ?? false,
      },
    };

    // 3. Python render_chart() 호출
    const core = PyodideCoreService.getInstance();
    // renderParams는 중첩 객체 (ChartSpec + DataPackage)로 WorkerMethodParam 타입보다 넓음.
    // skipValidation: true로 검증 생략하므로 런타임에는 JSON 직렬화로 정상 전달됨.
    const result = await core.callWorkerMethod<MatplotlibExportResult & { error?: string; warnings?: string[] }>(
      MATPLOTLIB_WORKER,
      'render_chart',
      renderParams as Record<string, WorkerMethodParam>,
      { skipValidation: true },
    );

    // 4. 에러 체크
    if (result.error) {
      throw new Error(`matplotlib 렌더링 실패: ${result.error}`);
    }

    // 4.5. 미지원 옵션 경고 로그
    if (result.warnings?.length) {
      console.warn('[matplotlib export] 미지원 옵션:', result.warnings.join('; '));
      onProgress?.(`경고: ${result.warnings[0]}`);
    }

    // 5. 다운로드
    onProgress?.('파일 다운로드 중...');
    const filename = chartSpec.title ?? 'chart';
    await downloadBase64File(result.base64Data, result.mimeType, filename, result.extension);

    onProgress?.('완료');

    return { warnings: result.warnings };
  }

  /**
   * ChartSpec → Python dict로 변환 (직렬화 가능한 부분만).
   * ECharts 전용 필드 제외, matplotlib에 필요한 필드만 전달.
   */
  private chartSpecToDict(spec: ChartSpec): Record<string, unknown> {
    return {
      chartType: spec.chartType,
      title: spec.title,
      encoding: spec.encoding,
      style: spec.style,
      errorBar: spec.errorBar,
      trendline: spec.trendline,
      aggregate: spec.aggregate,
      annotations: spec.annotations,
      orientation: spec.orientation,
    };
  }
}
