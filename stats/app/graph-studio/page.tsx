'use client';

/**
 * Graph Studio 메인 페이지
 *
 * 레이아웃:
 * - upload 모드: 데이터 업로드 화면
 * - editor 모드: [차트 미리보기] + [우측 데이터/스타일 패널] + [AI 패널 (도킹 가능)]
 *
 * AI 패널 도킹: bottom (기본) | left | right
 */

import { useCallback, useRef, useState } from 'react';
import type EChartsReactCore from 'echarts-for-react/lib/core';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { GraphStudioHeader } from '@/components/graph-studio/GraphStudioHeader';
import { DataUploadPanel } from '@/components/graph-studio/DataUploadPanel';
import { ChartPreview } from '@/components/graph-studio/ChartPreview';
import { SidePanel } from '@/components/graph-studio/SidePanel';
import { AiPanel } from '@/components/graph-studio/AiPanel';
import { downloadChart } from '@/lib/graph-studio/export-utils';

type LayoutMode = 'upload' | 'editor';

export default function GraphStudioPage(): React.ReactElement {
  // React Compiler(babel-plugin-react-compiler@1.0.0)가 Zustand useSyncExternalStore
  // 구독을 잘못 메모이즈하는 문제를 방지.
  // 스토어 업데이트(loadDataPackageWithSpec 등) 시 이 컴포넌트가 반드시 리렌더됩니다.
  'use no memo';

  // 개별 셀렉터로 구독 — React Compiler가 selector 출력값을 기반으로 스냅샷 비교.
  // 셀렉터 반환값이 primitive(boolean, null) 이므로 값 비교로 정확히 re-render 트리거됨.
  const isDataLoaded = useGraphStudioStore(state => state.isDataLoaded);
  const chartSpec = useGraphStudioStore(state => state.chartSpec);
  const aiPanelOpen = useGraphStudioStore(state => state.aiPanelOpen);
  const aiPanelDock = useGraphStudioStore(state => state.aiPanelDock);

  const layoutMode: LayoutMode = isDataLoaded && chartSpec ? 'editor' : 'upload';

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  /** ECharts 인스턴스 접근용 ref */
  const echartsRef = useRef<EChartsReactCore | null>(null);

  const handleToggleSidePanel = useCallback(() => {
    setIsSidePanelOpen(prev => !prev);
  }, []);

  const handleExport = useCallback(() => {
    if (!chartSpec) return;
    const instance = echartsRef.current?.getEchartsInstance();
    if (!instance) return;
    downloadChart(instance, chartSpec.exportConfig, chartSpec.title);
  }, [chartSpec]);

  if (layoutMode === 'upload') {
    return (
      <div className="flex flex-col h-full" data-testid="graph-studio-page">
        <GraphStudioHeader />
        <div className="flex-1 flex items-center justify-center p-8">
          <DataUploadPanel />
        </div>
      </div>
    );
  }

  // SidePanel 너비: right 도킹 시 compact (w-60) — isSidePanelOpen=false면 렌더 안 됨
  const sidePanelWidth = aiPanelOpen && aiPanelDock === 'right' ? 'w-60' : 'w-80';

  return (
    <div className="flex flex-col h-full" data-testid="graph-studio-page">
      <GraphStudioHeader
        onToggleSidePanel={handleToggleSidePanel}
        onExport={handleExport}
      />

      {aiPanelDock === 'bottom' ? (
        /* ── 하단 도킹 레이아웃 ──────────────────── */
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 min-w-0">
              <ChartPreview echartsRef={echartsRef} />
            </div>
            {isSidePanelOpen && (
              <div className={`${sidePanelWidth} border-l border-border flex-shrink-0`}>
                <SidePanel />
              </div>
            )}
          </div>
          {aiPanelOpen && <AiPanel />}
        </div>
      ) : aiPanelDock === 'left' ? (
        /* ── 좌측 도킹 레이아웃 ──────────────────── */
        <div className="flex-1 flex min-h-0">
          {aiPanelOpen && <AiPanel />}
          <div className="flex-1 min-w-0">
            <ChartPreview echartsRef={echartsRef} />
          </div>
          {isSidePanelOpen && (
            <div className={`${sidePanelWidth} border-l border-border flex-shrink-0`}>
              <SidePanel />
            </div>
          )}
        </div>
      ) : (
        /* ── 우측 도킹 레이아웃 ──────────────────── */
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 min-w-0">
            <ChartPreview echartsRef={echartsRef} />
          </div>
          {isSidePanelOpen && (
            <div className={`${sidePanelWidth} border-l border-border flex-shrink-0`}>
              <SidePanel />
            </div>
          )}
          {aiPanelOpen && <AiPanel />}
        </div>
      )}
    </div>
  );
}
