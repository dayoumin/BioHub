'use client';

/**
 * 사이드 패널
 *
 * 탭 구조: 속성 | AI 편집 | 프리셋 | Export
 */

import { useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PropertiesTab } from './panels/PropertiesTab';
import { AiEditTab } from './panels/AiEditTab';
import { PresetsTab } from './panels/PresetsTab';
import { ExportTab } from './panels/ExportTab';
import type { GraphStudioState } from '@/types/graph-studio';

const TAB_MAP: Record<string, GraphStudioState['sidePanel']> = {
  properties: 'properties',
  'ai-chat': 'ai-chat',
  presets: 'presets',
  export: 'export',
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
        <TabsList className="w-full grid grid-cols-4 rounded-none border-b">
          <TabsTrigger value="properties" className="text-xs">속성</TabsTrigger>
          <TabsTrigger value="ai-chat" className="text-xs">AI 편집</TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">프리셋</TabsTrigger>
          <TabsTrigger value="export" className="text-xs">Export</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto p-3">
          <TabsContent value="properties" className="mt-0">
            <PropertiesTab />
          </TabsContent>
          <TabsContent value="ai-chat" className="mt-0">
            <AiEditTab />
          </TabsContent>
          <TabsContent value="presets" className="mt-0">
            <PresetsTab />
          </TabsContent>
          <TabsContent value="export" className="mt-0">
            <ExportTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
