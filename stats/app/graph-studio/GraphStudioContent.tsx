'use client';

/**
 * Graph Studio 메인 콘텐츠
 *
 * 레이아웃 (G5.0 — 3패널):
 * - upload 모드: 데이터 업로드 화면
 * - editor 모드: [좌측 데이터] + [중앙 차트] + [우측 속성] + [하단 AI]
 *
 * AI 패널: bottom 전용 (좌/우 도킹 제거)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type EChartsReactCore from 'echarts-for-react/lib/core';
import { toast } from 'sonner';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import {
  GRAPH_PROJECTS_CHANGED_EVENT,
  loadProject,
} from '@/lib/graph-studio/project-storage';
import { GraphStudioHeader } from '@/components/graph-studio/GraphStudioHeader';
import { DataUploadPanel } from '@/components/graph-studio/DataUploadPanel';
import { ChartSetupPanel } from '@/components/graph-studio/ChartSetupPanel';
import { ChartPreview } from '@/components/graph-studio/ChartPreview';
import { LeftDataPanel } from '@/components/graph-studio/LeftDataPanel';
import { RightPropertyPanel } from '@/components/graph-studio/RightPropertyPanel';
import { AiPanel } from '@/components/graph-studio/AiPanel';
import { downloadChart } from '@/lib/graph-studio/export-utils';
import { saveSnapshot } from '@/lib/graph-studio/chart-snapshot-storage';
import {
  GRAPH_STUDIO_PROJECT_ROUTE_KEY,
  persistGraphStudioSession,
  resolveDetachedProjectId,
  resolveGraphStudioProjectRouteSyncHref,
  resolveGraphStudioSaveToastPayload,
  shouldRestoreProjectFromRoute,
} from '@/lib/graph-studio/session-coordinator';
import { STORAGE_KEYS } from '@/lib/constants/storage-keys';

type LayoutMode = 'upload' | 'setup' | 'editor';

const GRAPH_BG_TINT = {
  backgroundColor: 'color-mix(in srgb, var(--section-accent-graph) 4%, var(--background))',
} as const;

export default function GraphStudioContent(): React.ReactElement {
  // React Compiler(babel-plugin-react-compiler@1.0.0)가 Zustand useSyncExternalStore
  // 구독을 잘못 메모이즈하는 문제를 방지.
  // 스토어 업데이트(loadDataPackageWithSpec 등) 시 이 컴포넌트가 반드시 리렌더됩니다.

  // 개별 셀렉터로 구독 — React Compiler가 selector 출력값을 기반으로 스냅샷 비교.
  // 셀렉터 반환값이 primitive(boolean, null) 이므로 값 비교로 정확히 re-render 트리거됨.
  const isDataLoaded = useGraphStudioStore(state => state.isDataLoaded);
  const chartSpec = useGraphStudioStore(state => state.chartSpec);
  // primitive 셀렉터: React Compiler 스냅샷 비교에 안전
  const currentProjectId = useGraphStudioStore(state => state.currentProject?.id ?? null);
  const detachMissingProject = useGraphStudioStore(state => state.detachMissingProject);
  const setProject = useGraphStudioStore(state => state.setProject);
  const aiPanelOpen = useGraphStudioStore(state => state.aiPanelOpen);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeProjectId = searchParams.get(GRAPH_STUDIO_PROJECT_ROUTE_KEY);

  const layoutMode: LayoutMode =
    !isDataLoaded ? 'upload' :
    !chartSpec ? 'setup' :
    'editor';

  const detachedProjectIdRef = useRef<string | null>(null);
  const previousProjectIdRef = useRef<string | null>(null);

  useEffect(() => {
    const previousProjectId = previousProjectIdRef.current;
    detachedProjectIdRef.current = resolveDetachedProjectId(
      previousProjectId,
      currentProjectId,
      detachedProjectIdRef.current,
    );
    previousProjectIdRef.current = currentProjectId;
  }, [currentProjectId]);

  // ?project=<id> 쿼리 파라미터로 프로젝트 복원.
  useEffect(() => {
    if (!shouldRestoreProjectFromRoute({
      routeProjectId,
      currentProjectId,
      detachedProjectId: detachedProjectIdRef.current,
    })) {
      return;
    }
    if (routeProjectId === null) return;
    const project = loadProject(routeProjectId);
    if (project) {
      setProject(project);
    }
  }, [currentProjectId, routeProjectId, setProject]);

  useEffect(() => {
    const routeProjectExists = routeProjectId !== null && loadProject(routeProjectId) !== null;
    const shouldRestoreFromRoute =
      routeProjectId !== null &&
      routeProjectId !== currentProjectId &&
      detachedProjectIdRef.current !== routeProjectId &&
      routeProjectExists;

    if (shouldRestoreFromRoute) {
      return;
    }

    if (currentProjectId !== null && loadProject(currentProjectId) === null) {
      detachedProjectIdRef.current = currentProjectId;
      detachMissingProject();
      return;
    }

    const nextHref = resolveGraphStudioProjectRouteSyncHref({
      pathname,
      searchParams: new URLSearchParams(searchParams.toString()),
      routeProjectId,
      currentProjectId,
      detachedProjectId: detachedProjectIdRef.current,
      routeProjectExists,
    });
    if (nextHref === null) return;
    router.replace(nextHref, { scroll: false });
    detachedProjectIdRef.current = null;
  }, [currentProjectId, detachMissingProject, pathname, routeProjectId, router, searchParams]);

  const syncStaleProjectRoute = useCallback(() => {
    const liveCurrentProjectId = useGraphStudioStore.getState().currentProject?.id ?? null;
    let nextCurrentProjectId = liveCurrentProjectId;

    if (liveCurrentProjectId !== null && loadProject(liveCurrentProjectId) === null) {
      detachedProjectIdRef.current = liveCurrentProjectId;
      detachMissingProject();
      nextCurrentProjectId = null;
    }

    const routeProjectExists = routeProjectId !== null && loadProject(routeProjectId) !== null;
    const nextHref = resolveGraphStudioProjectRouteSyncHref({
      pathname,
      searchParams: new URLSearchParams(searchParams.toString()),
      routeProjectId,
      currentProjectId: nextCurrentProjectId,
      detachedProjectId: detachedProjectIdRef.current,
      routeProjectExists,
    });
    if (nextHref === null) return;
    router.replace(nextHref, { scroll: false });
    detachedProjectIdRef.current = null;
  }, [detachMissingProject, pathname, routeProjectId, router, searchParams]);

  useEffect(() => {
    const handleProjectsChanged = (): void => {
      syncStaleProjectRoute();
    };
    const handleStorage = (event: StorageEvent): void => {
      if (
        event.key !== null &&
        event.key !== STORAGE_KEYS.graphStudio.projects
      ) {
        return;
      }
      syncStaleProjectRoute();
    };

    window.addEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleProjectsChanged);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(GRAPH_PROJECTS_CHANGED_EVENT, handleProjectsChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [syncStaleProjectRoute]);

  // E2E 테스트용 hydration 완료 신호.
  // useEffect는 SSR에서 실행되지 않으며, React가 DOM에 이벤트 핸들러를 완전히
  // 부착한 후에만 실행됨 → 이 속성이 나타나면 클릭이 안전하게 동작함.
  useEffect(() => {
    document.documentElement.setAttribute('data-graph-studio-ready', 'true');
  }, []);

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  /** ECharts 인스턴스 접근용 ref */
  const echartsRef = useRef<EChartsReactCore | null>(null);

  const handleToggleLeftPanel = useCallback(() => {
    setIsLeftPanelOpen(prev => !prev);
  }, []);

  const handleToggleRightPanel = useCallback(() => {
    setIsRightPanelOpen(prev => !prev);
  }, []);

  const handleExport = useCallback(() => {
    if (!chartSpec) return;
    const instance = echartsRef.current?.getEchartsInstance();
    if (!instance) return;
    downloadChart(instance, chartSpec.exportConfig, chartSpec.title);
    // Note: chartSpec은 Zustand store 참조로 spec 변경 시에만 갱신 → deps 안정적
  }, [chartSpec?.exportConfig, chartSpec?.title]);

  const savingRef = useRef(false);
  const handleSave = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setIsSaving(true);

    const store = useGraphStudioStore.getState();
    const saveOutcome = await persistGraphStudioSession({
      currentProjectName: store.currentProject?.name,
      chartTitle: store.chartSpec?.title,
      dataLabel: store.dataPackage?.label,
      saveCurrentProject: store.saveCurrentProject,
      chartInstance: echartsRef.current?.getEchartsInstance() ?? null,
      saveSnapshot,
    });

    if (saveOutcome.status === 'save-error') {
      const toastPayload = resolveGraphStudioSaveToastPayload(saveOutcome);
      toast.error(toastPayload.message);
      savingRef.current = false;
      setIsSaving(false);
      return;
    }

    if (saveOutcome.status === 'saved-without-snapshot' && saveOutcome.reason === 'snapshot-failed') {
      console.warn('[GraphStudio] Snapshot capture failed:', saveOutcome.error);
    }

    const toastPayload = resolveGraphStudioSaveToastPayload(saveOutcome);
    if (toastPayload.level === 'success') {
      toast.success(toastPayload.message);
    } else {
      toast.warning(toastPayload.message);
    }

    savingRef.current = false;
    setIsSaving(false);
  }, []);

  if (layoutMode === 'upload') {
    return (
      <div className="flex flex-col h-full" data-testid="graph-studio-page" style={GRAPH_BG_TINT}>
        <GraphStudioHeader onSave={handleSave} isSaving={isSaving} />
        <div className="flex-1 flex items-center justify-center p-8">
          <DataUploadPanel />
        </div>
      </div>
    );
  }

  if (layoutMode === 'setup') {
    return (
      <div className="flex flex-col h-full" data-testid="graph-studio-page" style={GRAPH_BG_TINT}>
        <GraphStudioHeader onSave={handleSave} isSaving={isSaving} />
        <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
          <ChartSetupPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="graph-studio-page">
      <GraphStudioHeader
        onToggleLeftPanel={handleToggleLeftPanel}
        onToggleRightPanel={handleToggleRightPanel}
        onExport={handleExport}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {/* 3패널 + 하단 AI 레이아웃 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-1 min-h-0 bg-surface-container">
          {/* 좌측 데이터 패널 (w-64, 256px) — hidden으로 마운트 유지 */}
          <div className={`w-64 bg-surface-container-low flex-shrink-0 ${isLeftPanelOpen ? '' : 'hidden'}`}>
            <LeftDataPanel />
          </div>

          {/* 중앙 차트 캔버스 — S5: 에디터 모드 배경 차별화 */}
          <div className="flex-1 min-w-0 bg-surface">
            <ChartPreview echartsRef={echartsRef} onExport={handleExport} />
          </div>

          {/* 우측 속성 패널 (w-80, 320px) — hidden으로 마운트 유지 (탭 상태 보존) */}
          <div className={`w-80 bg-surface-container-low flex-shrink-0 ${isRightPanelOpen ? '' : 'hidden'}`}>
            <RightPropertyPanel />
          </div>
        </div>

        {/* AI 패널 (하단 전용) */}
        {aiPanelOpen && <AiPanel />}
      </div>
    </div>
  );
}
