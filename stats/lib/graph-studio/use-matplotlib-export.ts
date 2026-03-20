/**
 * matplotlib 논문용 Export React hook
 *
 * ExportDialog에서 사용. MatplotlibExportService를 래핑하여
 * loading/progress/error 상태를 관리.
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
}

export function useMatplotlibExport(): UseMatplotlibExportReturn {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const exportWithMatplotlib = useCallback(async (config: MatplotlibExportConfig): Promise<void> => {
    const { chartSpec, dataPackage } = useGraphStudioStore.getState();

    if (!chartSpec || !dataPackage) {
      setError('차트 또는 데이터가 없습니다.');
      return;
    }

    setIsExporting(true);
    setError(null);
    setProgress('준비 중...');

    try {
      const service = MatplotlibExportService.getInstance();
      await service.exportChart(chartSpec, dataPackage, config, (stage) => {
        setProgress(stage);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsExporting(false);
      setProgress('');
    }
  }, []);

  return { exportWithMatplotlib, isExporting, progress, error };
}
