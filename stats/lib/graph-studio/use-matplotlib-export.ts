/**
 * matplotlib 논문용 Export React hook
 *
 * ExportDialog에서 사용. MatplotlibExportService를 래핑하여
 * loading/progress/error/warnings 상태를 관리.
 */

import { useState, useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { MatplotlibExportService } from '@/lib/services/matplotlib-export.service';
import type { MatplotlibExportConfig } from '@/types/matplotlib-export';

interface UseMatplotlibExportReturn {
  /** matplotlib export 실행 */
  exportWithMatplotlib: (config: MatplotlibExportConfig) => Promise<void>;
  /** export 진행 중 여부 */
  isExporting: boolean;
  /** 현재 진행 단계 메시지 */
  progress: string;
  /** 에러 메시지 (없으면 null) */
  error: string | null;
  /** 미지원 옵션 경고 (export 완료 후에도 유지) */
  warnings: string[];
  /** warnings 초기화 */
  clearWarnings: () => void;
}

export function useMatplotlibExport(): UseMatplotlibExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const clearWarnings = useCallback(() => setWarnings([]), []);

  const exportWithMatplotlib = useCallback(async (config: MatplotlibExportConfig): Promise<void> => {
    const { chartSpec, dataPackage } = useGraphStudioStore.getState();

    if (!chartSpec || !dataPackage) {
      setError('차트 또는 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    setError(null);
    setWarnings([]);
    setProgress('준비 중...');

    try {
      const service = MatplotlibExportService.getInstance();
      const result = await service.exportChart(chartSpec, dataPackage, config, (stage) => {
        setProgress(stage);
      });

      // service가 warnings를 반환하면 상태에 저장
      if (result?.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsExporting(false);
      setProgress('');
    }
  }, []);

  return { exportWithMatplotlib, isExporting, progress, error, warnings, clearWarnings };
}
