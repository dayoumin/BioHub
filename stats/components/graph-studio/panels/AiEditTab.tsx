'use client';

/**
 * AI 편집 탭 — 자연어로 차트 수정
 *
 * AI는 chartSpec patch만 생성. 데이터 값은 전송하지 않음 (Zero-Data Retention).
 */

import { useCallback, useState, useRef } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { applyAndValidatePatches } from '@/lib/graph-studio/chart-spec-utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2 } from 'lucide-react';

interface EditHistoryItem {
  userMessage: string;
  aiExplanation: string;
  success: boolean;
}

export function AiEditTab(): React.ReactElement {
  const {
    chartSpec,
    isAiEditing,
    setAiEditing,
    updateChartSpec,
    setLastAiResponse,
  } = useGraphStudioStore();

  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<EditHistoryItem[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(async () => {
    if (!message.trim() || !chartSpec || isAiEditing) return;

    setAiEditing(true);

    try {
      // TODO: 실제 AI 호출 구현 (기존 llm-recommender 확장)
      // 현재는 placeholder
      // const response = await graphStudioAiService.editChart({
      //   chartSpec,
      //   userMessage: message,
      //   columnNames: chartSpec.data.columns.map(c => c.name),
      //   dataTypes: Object.fromEntries(
      //     chartSpec.data.columns.map(c => [c.name, c.type])
      //   ),
      // });
      //
      // const result = applyAndValidatePatches(chartSpec, response.patches);
      // if (result.success) {
      //   updateChartSpec(result.spec);
      //   setLastAiResponse(response);
      //   setHistory(prev => [...prev, {
      //     userMessage: message,
      //     aiExplanation: response.explanation,
      //     success: true,
      //   }]);
      // }

      setHistory(prev => [...prev, {
        userMessage: message,
        aiExplanation: 'AI 편집 기능은 Stage 2에서 구현 예정입니다.',
        success: false,
      }]);
    } finally {
      setAiEditing(false);
      setMessage('');
    }
  }, [message, chartSpec, isAiEditing, setAiEditing]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  if (!chartSpec) {
    return <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* 편집 히스토리 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3">
        {history.length === 0 && (
          <div className="text-sm text-muted-foreground space-y-2">
            <p>자연어로 차트를 수정하세요.</p>
            <div className="space-y-1">
              <p className="text-xs font-medium">예시:</p>
              <ul className="text-xs space-y-0.5 list-disc list-inside">
                <li>X축 라벨 45도 회전해줘</li>
                <li>에러바 추가해줘</li>
                <li>IEEE 흑백 스타일로 바꿔줘</li>
                <li>범례를 오른쪽 위로 옮겨줘</li>
                <li>Y축 제목을 &quot;Weight (kg)&quot;으로</li>
              </ul>
            </div>
          </div>
        )}

        {history.map((item, i) => (
          <div key={i} className="space-y-1">
            <div className="bg-primary/10 rounded-md p-2 text-sm">
              {item.userMessage}
            </div>
            <div className={`rounded-md p-2 text-sm ${
              item.success ? 'bg-muted' : 'bg-destructive/10 text-destructive'
            }`}>
              {item.aiExplanation}
            </div>
          </div>
        ))}
      </div>

      {/* 입력 */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="차트를 어떻게 수정할까요?"
          className="min-h-[60px] max-h-[120px] text-sm resize-none"
          disabled={isAiEditing}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || isAiEditing}
          className="self-end"
        >
          {isAiEditing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
