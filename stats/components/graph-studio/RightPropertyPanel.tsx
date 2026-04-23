'use client';

import { MessageSquareQuote, Palette, Settings2 } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { DataTab } from './panels/DataTab';
import { StyleTab } from './panels/StyleTab';
import { AnnotationTab } from './panels/AnnotationTab';

export function RightPropertyPanel(): React.ReactElement {
  return (
    <div
      className="flex h-full flex-col"
      data-testid="graph-studio-side-panel"
    >
      <Tabs
        defaultValue="data"
        className="flex h-full min-h-0 flex-col gap-0"
      >
        <div className="sticky top-0 z-10 px-3 py-3 bg-surface-container-low/95 backdrop-blur supports-[backdrop-filter]:bg-surface-container-low/85">
          <TabsList className="grid h-auto w-full grid-cols-3 rounded-2xl bg-surface-container p-1">
            <TabsTrigger
              value="data"
              className="h-9 rounded-xl text-xs"
              data-testid="graph-studio-tab-data"
            >
              <Settings2 className="h-3.5 w-3.5" />
              설정
            </TabsTrigger>
            <TabsTrigger
              value="style"
              className="h-9 rounded-xl text-xs"
              data-testid="graph-studio-tab-style"
            >
              <Palette className="h-3.5 w-3.5" />
              스타일
            </TabsTrigger>
            <TabsTrigger
              value="annotation"
              className="h-9 rounded-xl text-xs"
              data-testid="graph-studio-tab-annotation"
            >
              <MessageSquareQuote className="h-3.5 w-3.5" />
              주석
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 px-3 pb-3" data-testid="graph-studio-right-panel">
          <TabsContent
            value="data"
            forceMount
            className="mt-0 h-full overflow-y-auto rounded-2xl bg-surface px-3 py-3 data-[state=inactive]:hidden"
          >
            <DataTab />
          </TabsContent>

          <TabsContent
            value="style"
            forceMount
            className="mt-0 h-full overflow-y-auto rounded-2xl bg-surface px-3 py-3 data-[state=inactive]:hidden"
          >
            <StyleTab />
          </TabsContent>

          <TabsContent
            value="annotation"
            forceMount
            className="mt-0 h-full overflow-y-auto rounded-2xl bg-surface px-3 py-3 data-[state=inactive]:hidden"
          >
            <AnnotationTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
