'use client';

/**
 * 우측 속성 패널 (G5.2)
 *
 * Tabs → Accordion 전환. 데이터·스타일 섹션을 동시에 열 수 있음.
 *
 * alias testid 유지:
 * - graph-studio-side-panel → 루트 div
 * - graph-studio-right-panel → 내부 div
 * - graph-studio-tab-data / graph-studio-tab-style → AccordionTrigger
 */

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { DataTab } from './panels/DataTab';
import { StyleTab } from './panels/StyleTab';
import { AnnotationTab } from './panels/AnnotationTab';

export function RightPropertyPanel(): React.ReactElement {
  return (
    <div
      className="flex flex-col h-full"
      data-testid="graph-studio-side-panel"
    >
      <div className="flex flex-col h-full overflow-y-auto" data-testid="graph-studio-right-panel">
        <Accordion
          type="multiple"
          defaultValue={['data', 'style']}
          className="w-full"
        >
          <AccordionItem value="data">
            <AccordionTrigger
              className="px-3 py-2 text-xs"
              data-testid="graph-studio-tab-data"
            >
              차트 설정
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <DataTab />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="style">
            <AccordionTrigger
              className="px-3 py-2 text-xs"
              data-testid="graph-studio-tab-style"
            >
              스타일
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <StyleTab />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="annotation">
            <AccordionTrigger
              className="px-3 py-2 text-xs"
              data-testid="graph-studio-tab-annotation"
            >
              주석
            </AccordionTrigger>
            <AccordionContent className="px-3">
              <AnnotationTab />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
