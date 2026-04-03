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
import type EChartsReactCore from 'echarts-for-react/lib/core';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { loadProject } from '@/lib/graph-studio/project-storage';
import { GraphStudioHeader } from '@/components/graph-studio/GraphStudioHeader';
import { DataUploadPanel } from '@/components/graph-studio/DataUploadPanel';
import { ChartSetupPanel } from '@/components/graph-studio/ChartSetupPanel';
import { ChartPreview } from '@/components/graph-studio/ChartPreview';
import { LeftDataPanel } from '@/components/graph-studio/LeftDataPanel';
import { RightPropertyPanel } from '@/components/graph-studio/RightPropertyPanel';
import { AiPanel } from '@/components/graph-studio/AiPanel';
import { downloadChart } from '@/lib/graph-studio/export-utils';
import { saveSnapshot, dataUrlToUint8Array } from '@/lib/graph-studio/chart-snapshot-storage';
import type { ChartSnapshot } from '@/lib/graph-studio/chart-snapshot-storage';

type LayoutMode = 'upload' | 'setup' | 'editor';

const GRAPH_BG_TINT = {
  backgroundColor: 'color-mix(in oklch, var(--section-accent-graph) 4%, var(--background))',
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
  const setProject = useGraphStudioStore(state => state.setProject);
  const aiPanelOpen = useGraphStudioStore(state => state.aiPanelOpen);

  const layoutMode: LayoutMode =
    !isDataLoaded ? 'upload' :
    !chartSpec ? 'setup' :
    'editor';

  // ?project=<id> 쿼리 파라미터로 프로젝트 복원.
  // restoredProjectRef: 이미 복원 시도한 프로젝트 ID를 기억.
  // 비호환 데이터 업로드 → currentProject: null → useEffect 재실행 방지.
  const restoredProjectRef = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('project');
    if (!projectId) return;
    // 이미 같은 프로젝트가 로드되어 있으면 스킵
    if (currentProjectId === projectId) return;
    // 이미 이 프로젝트를 복원 시도했으면 재시도 안 함 (비호환 업로드 후 루프 방지)
    if (restoredProjectRef.current === projectId) return;
    restoredProjectRef.current = projectId;
    const project = loadProject(projectId);
    if (project) {
      setProject(project);
    }
  }, [currentProjectId, setProject]);

  // E2E 테스트용 hydration 완료 신호.
  // useEffect는 SSR에서 실행되지 않으며, React가 DOM에 이벤트 핸들러를 완전히
  // 부착한 후에만 실행됨 → 이 속성이 나타나면 클릭이 안전하게 동작함.
  useEffect(() => {
    document.documentElement.setAttribute('data-graph-studio-ready', 'true');
  }, []);

  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);

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
  const handleSave = useCallback(() => {
    if (savingRef.current) return;
    savingRef.current = true;

    const store = useGraphStudioStore.getState();
    const name = store.currentProject?.name ?? 'Untitled Chart';

    // 1. 프로젝트 저장 (동기, localStorage)
    const projectId = store.saveCurrentProject(name);
    if (!projectId) {
      savingRef.current = false;
      return;
    }

    // 2. 스냅샷 캡처 — 완료까지 락 유지 (race 방지)
    const instance = echartsRef.current?.getEchartsInstance();
    if (instance) {
      try {
        const dataUrl = instance.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
        const snapshot: ChartSnapshot = {
          id: projectId,
          data: dataUrlToUint8Array(dataUrl),
          cssWidth: instance.getWidth(),
          cssHeight: instance.getHeight(),
          pixelRatio: 2,
          updatedAt: new Date().toISOString(),
        };
        saveSnapshot(snapshot)
          .catch((err: unknown) => console.warn('[GraphStudio] Snapshot save failed:', err))
          .finally(() => { savingRef.current = false; });
      } catch (err) {
        console.warn('[GraphStudio] Snapshot capture failed:', err);
        savingRef.current = false;
      }
    } else {
      savingRef.current = false;
    }
  }, []);

  if (layoutMode === 'upload') {
    return (
      <div className="flex flex-col h-full" data-testid="graph-studio-page" style={GRAPH_BG_TINT}>
        <GraphStudioHeader onSave={handleSave} />
        <div className="flex-1 flex items-center justify-center p-8">
          <DataUploadPanel />
        </div>
      </div>
    );
  }

  if (layoutMode === 'setup') {
    return (
      <div className="flex flex-col h-full" data-testid="graph-studio-page" style={GRAPH_BG_TINT}>
        <GraphStudioHeader onSave={handleSave} />
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
      />

      {/* 3패널 + 하단 AI 레이아웃 */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex flex-1 min-h-0">
          {/* 좌측 데이터 패널 (w-64, 256px) — hidden으로 마운트 유지 */}
          <div className={`w-64 border-r border-border flex-shrink-0 ${isLeftPanelOpen ? '' : 'hidden'}`}>
            <LeftDataPanel />
          </div>

          {/* 중앙 차트 캔버스 — S5: 에디터 모드 배경 차별화 */}
          <div className="flex-1 min-w-0 bg-muted/20">
            <ChartPreview echartsRef={echartsRef} onExport={handleExport} />
          </div>

          {/* 우측 속성 패널 (w-80, 320px) — hidden으로 마운트 유지 (탭 상태 보존) */}
          <div className={`w-80 border-l border-border flex-shrink-0 ${isRightPanelOpen ? '' : 'hidden'}`}>
            <RightPropertyPanel />
          </div>
        </div>

        {/* AI 패널 (하단 전용) */}
        {aiPanelOpen && <AiPanel />}
      </div>
    </div>
  );
}
