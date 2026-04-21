'use client';

/**
 * Graph Studio 헤더
 *
 * 차트 유형 선택, undo/redo, export, 사이드 패널 토글
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { Button } from '@/components/ui/button';
import type { DocumentSourceUsage } from '@/lib/research/document-source-usage';
import { loadDocumentSourceUsages } from '@/lib/research/document-source-usage';
import { buildDocumentEditorUrl } from '@/lib/research/source-navigation';
import {
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
} from '@/lib/research/document-blueprint-storage';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Undo2, Redo2, PanelLeft, PanelRight, Sparkles, Plus, Settings2, BarChart3, Save } from 'lucide-react';
import { ExportDialog } from './panels/ExportDialog';

interface GraphStudioHeaderProps {
  onToggleLeftPanel?: () => void;
  onToggleRightPanel?: () => void;
  /** Stage 3: Export 버튼 클릭 핸들러 (GraphStudioPage에서 주입) */
  onExport?: () => void;
  /** Phase 6a Step 3: 프로젝트 저장 + 스냅샷 캡처 핸들러 */
  onSave?: () => void;
  isSaving?: boolean;
}

export function GraphStudioHeader({
  onToggleLeftPanel,
  onToggleRightPanel,
  onExport,
  onSave,
  isSaving = false,
}: GraphStudioHeaderProps): React.ReactElement {
  const router = useRouter();
  const { chartSpec, currentProject, historyIndex, specHistory, undo, redo, aiPanelOpen, toggleAiPanel, clearData, goToSetup } = useGraphStudioStore();
  const [showNewChartDialog, setShowNewChartDialog] = useState(false);
  const [documentUsages, setDocumentUsages] = useState<DocumentSourceUsage[]>([]);
  const documentUsageRequestSeqRef = useRef(0);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < specHistory.length - 1;
  const currentProjectId = currentProject?.id ?? null;
  const visibleUsages = documentUsages.slice(0, 2);

  const reloadDocumentUsages = useCallback(() => {
    const requestSeq = documentUsageRequestSeqRef.current + 1;
    documentUsageRequestSeqRef.current = requestSeq;

    if (currentProjectId === null) {
      setDocumentUsages([]);
      return;
    }

    void loadDocumentSourceUsages(currentProjectId)
      .then((usages) => {
        if (documentUsageRequestSeqRef.current === requestSeq) {
          setDocumentUsages(usages);
        }
      })
      .catch(() => {
        if (documentUsageRequestSeqRef.current === requestSeq) {
          setDocumentUsages([]);
        }
      });
  }, [currentProjectId]);

  useEffect(() => {
    reloadDocumentUsages();
  }, [reloadDocumentUsages]);

  useEffect((): (() => void) => {
    const handleDocumentsChanged = (event: Event): void => {
      if (!(event instanceof CustomEvent)) {
        void reloadDocumentUsages();
        return;
      }
      void reloadDocumentUsages();
    };

    window.addEventListener(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, handleDocumentsChanged);
    return () => {
      window.removeEventListener(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, handleDocumentsChanged);
    };
  }, [reloadDocumentUsages]);

  const handleNewChart = useCallback(() => {
    const hasUnsavedSession = chartSpec !== null && (currentProject === null || historyIndex > 0);
    if (hasUnsavedSession) {
      setShowNewChartDialog(true);
    } else {
      clearData();
    }
  }, [chartSpec, clearData, currentProject, historyIndex]);

  const handleConfirmNewChart = useCallback(() => {
    setShowNewChartDialog(false);
    clearData();
  }, [clearData]);

  const handleResetChart = useCallback(() => {
    goToSetup();
  }, [goToSetup]);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  return (
    <header
      className="sticky top-0 z-50 flex items-center justify-between border-b border-border px-6 h-10 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80"
      style={{ borderTop: '2px solid var(--section-accent-graph)' }}
    >
      {/* 좌: 제목 + 새 차트 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4" style={{ color: 'var(--section-accent-graph)' }} />
          <h1 className="text-lg font-semibold">Graph Studio</h1>
        </div>
        {chartSpec && (
          <>
            <span className="text-sm text-muted-foreground">
              {CHART_TYPE_HINTS[chartSpec.chartType]?.label ?? chartSpec.chartType}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetChart}
              className="text-xs text-muted-foreground hover:text-foreground"
              title="같은 데이터로 차트 유형·설정 변경"
              data-testid="graph-studio-reset-chart"
            >
              <Settings2 className="h-3 w-3 mr-1" />
              차트 재설정
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChart}
              className="text-xs text-muted-foreground hover:text-foreground"
              title="데이터부터 다시 시작"
              data-testid="graph-studio-new-chart"
            >
              <Plus className="h-3 w-3 mr-1" />
              새 차트
            </Button>
          </>
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
            data-testid="graph-studio-undo"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRedo}
            disabled={!canRedo}
            aria-label="Redo"
            data-testid="graph-studio-redo"
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
            data-testid="graph-studio-ai-toggle"
          >
            <Sparkles className="h-4 w-4 mr-1" />
            AI
          </Button>
        )}
        {visibleUsages.map((usage) => (
          <Button
            key={`${usage.documentId}:${usage.sectionId}`}
            variant="ghost"
            size="sm"
            onClick={() => router.push(buildDocumentEditorUrl(usage.documentId, {
              sectionId: usage.sectionId,
            }))}
            className="text-xs text-muted-foreground hover:text-foreground"
            title={`${usage.documentTitle} · ${usage.sectionTitle}`}
          >
            {usage.documentTitle}
          </Button>
        ))}
        {documentUsages.length > visibleUsages.length && (
          <span
            className="text-xs text-muted-foreground"
            title={documentUsages.map((usage) => `${usage.documentTitle} · ${usage.sectionTitle}`).join('\n')}
          >
            +{documentUsages.length - visibleUsages.length}
          </span>
        )}
        {chartSpec && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={!onSave || isSaving}
            className="gap-1"
            data-testid="graph-studio-save"
          >
            <Save className="w-4 h-4" />
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        )}
        <ExportDialog onExport={onExport} />
        {onToggleLeftPanel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleLeftPanel}
            aria-label="Toggle left panel"
            data-testid="graph-studio-left-toggle"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        )}
        {onToggleRightPanel && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleRightPanel}
            aria-label="Toggle side panel"
            data-testid="graph-studio-side-toggle"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* 새 차트 확인 대화상자 */}
      <AlertDialog open={showNewChartDialog} onOpenChange={setShowNewChartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>새 차트를 만드시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              현재 작업이 저장되지 않았습니다. 계속하면 모든 변경사항이 사라집니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmNewChart}>
              새 차트 만들기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
