'use client';

/**
 * Graph Studio 헤더
 *
 * 차트 유형 선택, undo/redo, export, 사이드 패널 토글
 */

import { useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Button } from '@/components/ui/button';
import {
  Undo2,
  Redo2,
  Download,
  PanelRightOpen,
} from 'lucide-react';

interface GraphStudioHeaderProps {
  onToggleSidePanel?: () => void;
  /** Stage 3: Export 버튼 클릭 핸들러 (GraphStudioPage에서 주입) */
  onExport?: () => void;
}

export function GraphStudioHeader({
  onToggleSidePanel,
  onExport,
}: GraphStudioHeaderProps): React.ReactElement {
  const { chartSpec, historyIndex, specHistory, undo, redo, isExporting } = useGraphStudioStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < specHistory.length - 1;

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  return (
    <header className="flex items-center justify-between border-b border-border px-4 py-2 bg-background">
      {/* 좌: 제목 */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">Graph Studio</h1>
        {chartSpec && (
          <span className="text-sm text-muted-foreground">
            {chartSpec.chartType}
          </span>
        )}
      </div>

      {/* 중앙: Undo/Redo */}
      {chartSpec && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleUndo}
            disabled={!canUndo}
            aria-label="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* 우: 액션 */}
      <div className="flex items-center gap-2">
        {chartSpec && onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={isExporting}
            aria-label="Export chart"
          >
            <Download className="h-4 w-4 mr-1" />
            {isExporting ? '내보내는 중...' : 'Export'}
          </Button>
        )}
        {onToggleSidePanel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidePanel}
            aria-label="Toggle side panel"
          >
            <PanelRightOpen className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
