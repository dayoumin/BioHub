'use client';

/**
 * Graph Studio 헤더
 *
 * 차트 유형 선택, undo/redo, export, 사이드 패널 토글
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { CHART_TYPE_HINTS } from '@/lib/graph-studio/chart-spec-defaults';
import { Button } from '@/components/ui/button';
import StartWritingButton from '@/components/papers/StartWritingButton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { DocumentSourceUsage } from '@/lib/research/document-source-usage';
import { loadDocumentSourceUsages } from '@/lib/research/document-source-usage';
import { buildDocumentEditorUrl } from '@/lib/research/source-navigation';
import { createDocumentWritingSession } from '@/lib/research/document-writing-session';
import {
  listProjectEntityRefs,
  RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT,
  type ResearchProjectEntityRefsChangedDetail,
} from '@/lib/research/project-storage';
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
import { Undo2, Redo2, PanelLeft, PanelRight, Sparkles, Plus, Settings2, BarChart3, Save, AlertTriangle, X, FileText } from 'lucide-react';
import { ExportDialog } from './panels/ExportDialog';

const WRITING_ACTION_LABEL = '문서 초안 만들기';
const WRITING_PENDING_LABEL = '문서 준비 중...';
const LINKED_DOCUMENTS_LABEL = '연결된 문서';
const WRITING_REQUIRES_SAVED_GRAPH = '저장된 그래프에서만 문서를 시작할 수 있습니다.';
const WRITING_REQUIRES_PROJECT = '프로젝트를 먼저 연결해야 문서를 만들 수 있습니다.';
const WRITING_REQUIRES_LINKED_FIGURE = '현재 그래프가 연결된 연구 프로젝트 자료로 등록되어 있지 않습니다.';

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
  const {
    chartSpec,
    currentProject,
    historyIndex,
    specHistory,
    undo,
    redo,
    aiPanelOpen,
    relinkWarning,
    linkedResearchProjectId,
    toggleAiPanel,
    clearData,
    goToSetup,
  } = useGraphStudioStore();
  const [showNewChartDialog, setShowNewChartDialog] = useState(false);
  const [showRelinkSaveDialog, setShowRelinkSaveDialog] = useState(false);
  const [isCreatingDocument, setIsCreatingDocument] = useState(false);
  const [dismissedRelinkWarningKey, setDismissedRelinkWarningKey] = useState<string | null>(null);
  const [documentUsages, setDocumentUsages] = useState<DocumentSourceUsage[]>([]);
  const [, setProjectRefsVersion] = useState(0);
  const documentUsageRequestSeqRef = useRef(0);
  const resolvedResearchProjectId = currentProject?.projectId ?? linkedResearchProjectId ?? null;

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < specHistory.length - 1;
  const currentProjectId = currentProject?.id ?? null;
  const isFigureLinkedToResolvedResearchProject = currentProjectId !== null
    && resolvedResearchProjectId !== null
    && listProjectEntityRefs(resolvedResearchProjectId).some((entityRef) => (
      entityRef.entityKind === 'figure' && entityRef.entityId === currentProjectId
    ));
  const writingUnavailableReason = !chartSpec
    ? null
    : !currentProjectId
      ? WRITING_REQUIRES_SAVED_GRAPH
      : !resolvedResearchProjectId
        ? WRITING_REQUIRES_PROJECT
        : !isFigureLinkedToResolvedResearchProject
          ? WRITING_REQUIRES_LINKED_FIGURE
          : null;
  const canCreateWritingDocument = chartSpec !== null && writingUnavailableReason === null;
  const visibleUsages = documentUsages.slice(0, 2);
  const relinkWarningKey = relinkWarning
    ? JSON.stringify({
      projectId: relinkWarning.projectId,
      missingFields: relinkWarning.missingFields,
      extraFields: relinkWarning.extraFields,
      typeMismatches: relinkWarning.typeMismatches,
      semanticMismatchFields: relinkWarning.semanticMismatchFields,
      previousSchemaFingerprint: relinkWarning.previousSchemaFingerprint,
      nextSchemaFingerprint: relinkWarning.nextSchemaFingerprint,
      previousSourceFingerprint: relinkWarning.previousSourceFingerprint,
      nextSourceFingerprint: relinkWarning.nextSourceFingerprint,
    })
    : null;
  const showRelinkWarningBanner = relinkWarning !== null && relinkWarningKey !== dismissedRelinkWarningKey;

  useEffect(() => {
    if (relinkWarningKey === null) {
      setDismissedRelinkWarningKey(null);
      return;
    }

    if (dismissedRelinkWarningKey && dismissedRelinkWarningKey !== relinkWarningKey) {
      setDismissedRelinkWarningKey(null);
    }
  }, [dismissedRelinkWarningKey, relinkWarningKey]);

  const reloadDocumentUsages = useCallback(() => {
    const requestSeq = documentUsageRequestSeqRef.current + 1;
    documentUsageRequestSeqRef.current = requestSeq;

    if (currentProjectId === null) {
      setDocumentUsages([]);
      return;
    }

    void loadDocumentSourceUsages(
      currentProjectId,
      resolvedResearchProjectId
        ? { projectId: resolvedResearchProjectId, sourceKind: 'figure' }
        : { sourceKind: 'figure' },
    )
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
  }, [currentProjectId, resolvedResearchProjectId]);

  useEffect(() => {
    reloadDocumentUsages();
  }, [reloadDocumentUsages]);

  useEffect((): (() => void) => {
    const handleDocumentsChanged = (event: Event): void => {
      if (!(event instanceof CustomEvent)) {
        void reloadDocumentUsages();
        return;
      }
      const detail = event.detail as { projectId?: string } | undefined;
      if (
        resolvedResearchProjectId
        && detail?.projectId
        && detail.projectId !== resolvedResearchProjectId
      ) {
        return;
      }
      void reloadDocumentUsages();
    };

    window.addEventListener(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, handleDocumentsChanged);
    return () => {
      window.removeEventListener(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, handleDocumentsChanged);
    };
  }, [resolvedResearchProjectId, reloadDocumentUsages]);

  useEffect((): (() => void) => {
    const handleProjectRefsChanged = (event: Event): void => {
      if (!(event instanceof CustomEvent)) {
        setProjectRefsVersion((value) => value + 1);
        void reloadDocumentUsages();
        return;
      }

      const detail = event.detail as ResearchProjectEntityRefsChangedDetail | undefined;
      if (
        !detail
        || (resolvedResearchProjectId !== null && detail.projectIds.includes(resolvedResearchProjectId))
        || (currentProjectId !== null && detail.entityIds.includes(currentProjectId))
      ) {
        setProjectRefsVersion((value) => value + 1);
        void reloadDocumentUsages();
      }
    };

    window.addEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleProjectRefsChanged);
    return () => {
      window.removeEventListener(RESEARCH_PROJECT_ENTITY_REFS_CHANGED_EVENT, handleProjectRefsChanged);
    };
  }, [currentProjectId, reloadDocumentUsages, resolvedResearchProjectId]);

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

  const handleSaveRequest = useCallback(() => {
    if (!onSave) {
      return;
    }

    if (relinkWarning) {
      setShowRelinkSaveDialog(true);
      return;
    }

    onSave();
  }, [onSave, relinkWarning]);

  const handleConfirmRelinkSave = useCallback(() => {
    setShowRelinkSaveDialog(false);
    setDismissedRelinkWarningKey(null);
    onSave?.();
  }, [onSave]);

  const handleDismissRelinkWarning = useCallback(() => {
    if (relinkWarningKey) {
      setDismissedRelinkWarningKey(relinkWarningKey);
    }
  }, [relinkWarningKey]);

  const handleResetChart = useCallback(() => {
    goToSetup();
  }, [goToSetup]);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handleCreateWritingDocument = useCallback(async () => {
    if (isCreatingDocument) {
      return;
    }

    const researchProjectId = resolvedResearchProjectId;
    if (!researchProjectId) {
      toast.error(WRITING_REQUIRES_PROJECT);
      return;
    }
    if (!currentProjectId) {
      toast.error(WRITING_REQUIRES_SAVED_GRAPH);
      return;
    }
    if (!isFigureLinkedToResolvedResearchProject) {
      toast.error(WRITING_REQUIRES_LINKED_FIGURE);
      return;
    }

    setIsCreatingDocument(true);
    try {
      const document = await createDocumentWritingSession({
        projectId: researchProjectId,
        title: `${currentProject?.name ?? '그래프'} 문서 초안`,
        sourceEntityIds: {
          figureIds: [currentProjectId],
        },
      });
      router.push(buildDocumentEditorUrl(document.id));
    } catch (error) {
      console.error('[GraphStudioHeader] failed to create writing document:', error);
      toast.error('문서 생성에 실패했습니다.');
    } finally {
      setIsCreatingDocument(false);
    }
  }, [
    currentProject?.name,
    currentProjectId,
    isCreatingDocument,
    isFigureLinkedToResolvedResearchProject,
    resolvedResearchProjectId,
    router,
  ]);

  return (
    <>
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
        {chartSpec && (
          <StartWritingButton
            label={WRITING_ACTION_LABEL}
            pendingLabel={WRITING_PENDING_LABEL}
            onClick={() => {
              void handleCreateWritingDocument();
            }}
            disabled={!canCreateWritingDocument}
            pending={isCreatingDocument}
            testId="graph-studio-write-doc"
            icon={FileText}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground"
            title={writingUnavailableReason ?? undefined}
          />
        )}
        {documentUsages.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {LINKED_DOCUMENTS_LABEL}
          </span>
        )}
        {visibleUsages.map((usage) => (
          <Button
            key={`${usage.documentId}:${usage.sectionId}:${usage.kind}:${usage.artifactId ?? usage.sourceKind ?? usage.label}`}
            variant="ghost"
            size="sm"
            onClick={() => router.push(buildDocumentEditorUrl(usage.documentId, {
              sectionId: usage.sectionId,
              tableId: usage.kind === 'table' ? usage.artifactId : undefined,
              figureId: usage.kind === 'figure' ? usage.artifactId : undefined,
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
            onClick={handleSaveRequest}
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

      </header>

      {showRelinkWarningBanner && relinkWarning && (
        <div className="px-6 pt-3">
          <Alert variant="warning" className="border-none">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{relinkWarning.projectName} 연결이 해제되었습니다</AlertTitle>
            <AlertDescription>
              <p>저장된 그래프와 현재 데이터 구조가 달라 새 세션으로 전환했습니다.</p>
              {relinkWarning.missingFields.length > 0 && (
                <p>누락 필드: {relinkWarning.missingFields.join(', ')}</p>
              )}
              {relinkWarning.typeMismatches.length > 0 && (
                <p>
                  타입 불일치: {relinkWarning.typeMismatches
                    .map((mismatch) => `${mismatch.field} (${mismatch.expected} → ${mismatch.actual})`)
                    .join(', ')}
                </p>
              )}
              {relinkWarning.semanticMismatchFields.length > 0 && (
                <p>범주 샘플 불일치: {relinkWarning.semanticMismatchFields.join(', ')}</p>
              )}
              {relinkWarning.previousSchemaFingerprint && relinkWarning.nextSchemaFingerprint && (
                <p>
                  schema fp: {relinkWarning.previousSchemaFingerprint} → {relinkWarning.nextSchemaFingerprint}
                </p>
              )}
              {relinkWarning.previousSourceFingerprint && relinkWarning.nextSourceFingerprint && (
                <p>
                  source fp: {relinkWarning.previousSourceFingerprint} → {relinkWarning.nextSourceFingerprint}
                </p>
              )}
            </AlertDescription>
            <button
              type="button"
              onClick={handleDismissRelinkWarning}
              className="absolute right-3 top-3 rounded-md p-1 text-current/70 hover:bg-black/5 hover:text-current dark:hover:bg-white/10"
              aria-label="relink warning 닫기"
            >
              <X className="h-4 w-4" />
            </button>
          </Alert>
        </div>
      )}

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

      <AlertDialog open={showRelinkSaveDialog} onOpenChange={setShowRelinkSaveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>현재 provenance로 다시 저장할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              저장된 그래프와 현재 데이터 구조가 달라 연결이 해제된 상태입니다. 계속 저장하면
              현재 데이터 기준의 source snapshot과 lineage 정보로 덮어씁니다.
            </AlertDialogDescription>
            {relinkWarning && (
              <div className="space-y-1 text-sm text-muted-foreground">
                {relinkWarning.missingFields.length > 0 && (
                  <p>누락 필드: {relinkWarning.missingFields.join(', ')}</p>
                )}
                {relinkWarning.semanticMismatchFields.length > 0 && (
                  <p>범주 샘플 불일치: {relinkWarning.semanticMismatchFields.join(', ')}</p>
                )}
                {relinkWarning.previousSchemaFingerprint && relinkWarning.nextSchemaFingerprint && (
                  <p>
                    schema fp: {relinkWarning.previousSchemaFingerprint} → {relinkWarning.nextSchemaFingerprint}
                  </p>
                )}
                {relinkWarning.previousSourceFingerprint && relinkWarning.nextSourceFingerprint && (
                  <p>
                    source fp: {relinkWarning.previousSourceFingerprint} → {relinkWarning.nextSourceFingerprint}
                  </p>
                )}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRelinkSave}>현재 데이터로 저장</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
