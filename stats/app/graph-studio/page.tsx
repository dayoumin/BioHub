'use client';

/**
 * Graph Studio 메인 페이지
 *
 * 3-패널 레이아웃:
 * [좌: 데이터/설정] [중앙: 미리보기] [우: AI 편집/속성]
 *
 * Stage 3: echartsRef를 ChartPreview에 주입하고, handleExport를
 *          Header/SidePanel로 전달하여 Export 버튼 활성화.
 */

import { useCallback, useRef, useState } from 'react';
import type EChartsReactCore from 'echarts-for-react/lib/core';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { GraphStudioHeader } from '@/components/graph-studio/GraphStudioHeader';
import { DataUploadPanel } from '@/components/graph-studio/DataUploadPanel';
import { ChartPreview } from '@/components/graph-studio/ChartPreview';
import { SidePanel } from '@/components/graph-studio/SidePanel';
import { downloadChart } from '@/lib/graph-studio/export-utils';

type LayoutMode = 'upload' | 'editor';

export default function GraphStudioPage(): React.ReactElement {
  const { isDataLoaded, chartSpec } = useGraphStudioStore();

  const layoutMode: LayoutMode = isDataLoaded && chartSpec ? 'editor' : 'upload';

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  /** ECharts 인스턴스 접근용 ref — ChartPreview에 주입 */
  const echartsRef = useRef<EChartsReactCore | null>(null);

  const handleToggleSidePanel = useCallback(() => {
    setIsSidePanelOpen(prev => !prev);
  }, []);

  const handleExport = useCallback(() => {
    if (!chartSpec) return;
    const instance = echartsRef.current?.getEchartsInstance();
    if (!instance) return;
    // downloadChart는 동기 함수 — setExporting 불필요
    downloadChart(instance, chartSpec.exportConfig, chartSpec.title);
  }, [chartSpec]);

  if (layoutMode === 'upload') {
    return (
      <div className="flex flex-col h-full">
        <GraphStudioHeader />
        <div className="flex-1 flex items-center justify-center p-8">
          <DataUploadPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <GraphStudioHeader
        onToggleSidePanel={handleToggleSidePanel}
        onExport={handleExport}
      />
      <div className="flex-1 flex min-h-0">
        {/* 중앙: 차트 미리보기 */}
        <div className="flex-1 min-w-0">
          <ChartPreview echartsRef={echartsRef} />
        </div>

        {/* 우측: 사이드 패널 (속성/AI/프리셋/export) */}
        {isSidePanelOpen && (
          <div className="w-80 border-l border-border flex-shrink-0">
            <SidePanel onExport={handleExport} />
          </div>
        )}
      </div>
    </div>
  );
}
