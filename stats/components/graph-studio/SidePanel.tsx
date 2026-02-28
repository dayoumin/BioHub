'use client';

/**
 * 사이드 패널
 *
 * 탭 구조: 속성 | AI 편집
 */

import { useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropertiesTab } from './panels/PropertiesTab';
import { AiEditTab } from './panels/AiEditTab';
import type { GraphStudioState } from '@/types/graph-studio';

const TAB_MAP: Record<string, GraphStudioState['sidePanel']> = {
  properties: 'properties',
  'ai-chat': 'ai-chat',
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
          <TabsTrigger value="properties" className="text-xs">속성</TabsTrigger>
          <TabsTrigger value="ai-chat" className="text-xs">AI 편집</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-3">
          <TabsContent value="properties" className="mt-0">
            <PropertiesTab />
          </TabsContent>
          <TabsContent value="ai-chat" className="mt-0">
            <AiEditTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
