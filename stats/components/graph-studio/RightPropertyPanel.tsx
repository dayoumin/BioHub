'use client';

/**
 * 우측 속성 패널 (G5.0)
 *
 * G5.0에서는 기존 DataTab/StyleTab을 그대로 import하는 래퍼.
 * 내부 아코디언 재구성은 G5.2 범위.
 *
 * alias testid 유지:
 * - graph-studio-side-panel → 루트 div
 * - graph-studio-tab-data / graph-studio-tab-style → TabsTrigger
 */

import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTab } from './panels/DataTab';
import { StyleTab } from './panels/StyleTab';

type PanelTab = 'data' | 'style';

export function RightPropertyPanel(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<PanelTab>('data');

  const handleTabChange = useCallback((value: string) => {
    if (value === 'data' || value === 'style') setActiveTab(value);
  }, []);

  return (
    <div
      className="flex flex-col h-full"
      data-testid="graph-studio-side-panel"
    >
      <div className="flex flex-col h-full" data-testid="graph-studio-right-panel">
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          className="flex flex-col h-full"
        >
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="data" className="text-xs" data-testid="graph-studio-tab-data">데이터</TabsTrigger>
            <TabsTrigger value="style" className="text-xs" data-testid="graph-studio-tab-style">스타일</TabsTrigger>
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
    </div>
  );
}
