'use client';

/**
 * 사이드 패널
 *
 * 탭 구조: 데이터 | 스타일
 * (AI 편집은 Phase 4에서 도킹 패널로 분리)
 */

import { useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTab } from './panels/DataTab';
import { StyleTab } from './panels/StyleTab';
import type { GraphStudioState } from '@/types/graph-studio';

const TAB_MAP: Record<string, GraphStudioState['sidePanel']> = {
  data: 'data',
  style: 'style',
};

export function SidePanel(): React.ReactElement {
  const { sidePanel, setSidePanel } = useGraphStudioStore();

  const handleTabChange = useCallback((value: string) => {
    const panel = TAB_MAP[value];
    if (panel) setSidePanel(panel);
  }, [setSidePanel]);

  return (
    <div className="flex flex-col h-full">
      <Tabs
        value={sidePanel}
        onValueChange={handleTabChange}
        className="flex flex-col h-full"
      >
        <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
          <TabsTrigger value="data" className="text-xs">데이터</TabsTrigger>
          <TabsTrigger value="style" className="text-xs">스타일</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-3">
          <TabsContent value="data" className="mt-0">
            <DataTab />
          </TabsContent>
          <TabsContent value="style" className="mt-0">
            <StyleTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
