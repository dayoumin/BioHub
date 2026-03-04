'use client';

/**
 * Graph Studio 메인 페이지
 *
 * 3-패널 레이아웃:
 * [좌: 데이터/설정] [중앙: 미리보기] [우: AI 편집/속성]
 */

import { useCallback, useState } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { GraphStudioHeader } from '@/components/graph-studio/GraphStudioHeader';
import { DataUploadPanel } from '@/components/graph-studio/DataUploadPanel';
import { ChartPreview } from '@/components/graph-studio/ChartPreview';
import { SidePanel } from '@/components/graph-studio/SidePanel';

type LayoutMode = 'upload' | 'editor';

export default function GraphStudioPage(): React.ReactElement {
  const { isDataLoaded, chartSpec } = useGraphStudioStore();

  const layoutMode: LayoutMode = isDataLoaded && chartSpec ? 'editor' : 'upload';

  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);

  const handleToggleSidePanel = useCallback(() => {
    setIsSidePanelOpen(prev => !prev);
  }, []);

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
      <GraphStudioHeader onToggleSidePanel={handleToggleSidePanel} />
      <div className="flex-1 flex min-h-0">
        {/* 중앙: 차트 미리보기 */}
        <div className="flex-1 min-w-0">
          <ChartPreview />
        </div>

        {/* 우측: 사이드 패널 (속성/AI/프리셋/export) */}
        {isSidePanelOpen && (
          <div className="w-80 border-l border-border flex-shrink-0">
            <SidePanel />
          </div>
        )}
      </div>
    </div>
  );
}
