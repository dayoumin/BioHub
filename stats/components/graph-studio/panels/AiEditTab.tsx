'use client';

/**
 * AI 편집 탭 — 자연어로 차트 수정
 *
 * AI는 chartSpec patch만 생성. 데이터 값은 전송하지 않음 (Zero-Data Retention).
 *
 * Stage 2 구현 예정:
 *   1. graphStudioAiService.editChart({ chartSpec, userMessage, columnNames, dataTypes })
 *   2. applyAndValidatePatches(chartSpec, response.patches)
 *   3. 성공 시 updateChartSpec(result.spec) + setLastAiResponse(response)
 */

import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send } from 'lucide-react';

export function AiEditTab(): React.ReactElement {
  const { chartSpec } = useGraphStudioStore();

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Stage 2 안내 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">AI 편집 — Stage 2 준비 중</p>
          <p className="text-xs">
            구현 후 아래와 같은 자연어 명령을 사용할 수 있습니다:
          </p>
          <ul className="text-xs space-y-0.5 list-disc list-inside">
            <li>X축 라벨 45도 회전해줘</li>
            <li>에러바 추가해줘</li>
            <li>IEEE 흑백 스타일로 바꿔줘</li>
            <li>범례를 오른쪽 위로 옮겨줘</li>
            <li>Y축 제목을 &quot;Weight (kg)&quot;으로</li>
          </ul>
        </div>
      </div>

      {/* 입력 — Stage 2 전까지 비활성화 */}
      <div className="flex gap-2">
        <Textarea
          placeholder="차트를 어떻게 수정할까요?"
          className="min-h-[60px] max-h-[120px] text-sm resize-none"
          disabled
        />
        <Button size="icon" className="self-end" disabled>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
