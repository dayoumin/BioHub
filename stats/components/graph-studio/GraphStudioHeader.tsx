'use client';

/**
 * Graph Studio 헤더
 *
 * 차트 유형 선택, undo/redo, export, 사이드 패널 토글
 */

import { useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { Button } from '@/components/ui/button';
import { Undo2, Redo2, PanelRightOpen, Sparkles } from 'lucide-react';
import { ExportDialog } from './panels/ExportDialog';

interface GraphStudioHeaderProps {
  onToggleSidePanel?: () => void;
  /** Stage 3: Export 버튼 클릭 핸들러 (GraphStudioPage에서 주입) */
  onExport?: () => void;
}

export function GraphStudioHeader({
  onToggleSidePanel,
  onExport,
}: GraphStudioHeaderProps): React.ReactElement {
  const { chartSpec, historyIndex, specHistory, undo, redo, aiPanelOpen, toggleAiPanel } = useGraphStudioStore();

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
            {CHART_TYPE_HINTS[chartSpec.chartType]?.label ?? chartSpec.chartType}
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
        {chartSpec && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAiPanel}
            aria-label={aiPanelOpen ? 'AI 패널 닫기' : 'AI 패널 열기'}
            className={aiPanelOpen ? 'text-primary bg-primary/10' : ''}
          >
            <Sparkles className="h-4 w-4 mr-1" />
            AI
          </Button>
        )}
        <ExportDialog onExport={onExport} />
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
