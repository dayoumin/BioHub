'use client';

/**
 * AI 편집 탭 — 자연어로 차트 수정
 *
 * Zero-Data Retention: 실제 데이터 행은 AI에 전송하지 않음.
 * ChartSpec(열 메타데이터) + 사용자 명령 → JSON Patch → applyAndValidatePatches
 *
 * 개선 사항:
 * - chartSpecRef: handleSend 클로저에서 항상 최신 spec 참조 (stale 방어)
 * - zero-patch 경고: AI 응답이 실제 변경 없이 통과될 때 사용자에게 알림
 * - MAX_MESSAGES=30: 오래된 메시지 자동 정리
 * - localStorage: 브라우저 재시작 후에도 대화 기록 유지
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { applyAndValidatePatches } from '@/lib/graph-studio/chart-spec-utils';
import { editChart, buildAiEditRequest, AiServiceError } from '@/lib/graph-studio/ai-service';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, AlertCircle, CheckCircle2, Bot, User } from 'lucide-react';

// ─── 상수 ──────────────────────────────────────────────────

const MAX_MESSAGES = 30;
const CHAT_STORAGE_KEY = 'graph_studio_ai_chat';

// ─── 로컬 채팅 메시지 타입 ────────────────────────────────

type ChatRole = 'user' | 'assistant' | 'error';

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  confidence?: number;
  patchCount?: number;
}

// ─── 서브 컴포넌트 ─────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps): React.ReactElement {
  if (message.role === 'user') {
    return (
      <div className="flex gap-2 justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg rounded-tr-sm px-3 py-2 text-sm max-w-[85%]">
          {message.content}
        </div>
        <div className="shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center mt-0.5">
          <User className="h-3 w-3" />
        </div>
      </div>
    );
  }

  if (message.role === 'error') {
    return (
      <div className="flex gap-2">
        <div className="shrink-0 h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center mt-0.5">
          <AlertCircle className="h-3 w-3 text-destructive" />
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg rounded-tl-sm px-3 py-2 text-sm text-destructive max-w-[85%]">
          {message.content}
        </div>
      </div>
    );
  }

  // assistant
  return (
    <div className="flex gap-2">
      <div className="shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
        <Bot className="h-3 w-3 text-primary" />
      </div>
      <div className="bg-muted rounded-lg rounded-tl-sm px-3 py-2 text-sm max-w-[85%] space-y-1.5">
        <p>{message.content}</p>
        {(message.confidence !== undefined || message.patchCount !== undefined) && (
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            {message.patchCount !== undefined && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {message.patchCount}개 수정 적용됨
              </span>
            )}
            {message.confidence !== undefined && (
              <span className="text-xs text-muted-foreground ml-auto">
                신뢰도 {Math.round(message.confidence * 100)}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────

export function AiEditTab(): React.ReactElement {
  const { chartSpec, updateChartSpec } = useGraphStudioStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /**
   * chartSpecRef: handleSend 비동기 실행 중 chartSpec이 변경돼도 항상 최신 값 참조.
   * await 완료 후 패치 적용 시점에 stale closure를 방지.
   */
  const chartSpecRef = useRef(chartSpec);
  useEffect(() => {
    chartSpecRef.current = chartSpec;
  }, [chartSpec]);

  // localStorage에서 대화 기록 로드 (마운트 시 1회)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // 파싱 실패 시 무시 (빈 상태로 시작)
    }
  }, []);

  // 메시지 변경 시 localStorage 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // 용량 초과 등 무시
    }
  }, [messages]);

  // 새 메시지 추가 시 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * MAX_MESSAGES 초과 시 오래된 메시지부터 제거.
   * id는 Date.now() + 랜덤으로 고유성 보장.
   */
  const appendMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => {
      const next = [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }];
      return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    const spec = chartSpecRef.current; // 최신 spec (closure 아님)
    if (!text || !spec || isLoading) return;

    setInputValue('');
    appendMessage({ role: 'user', content: text });
    setIsLoading(true);

    try {
      const request = buildAiEditRequest(spec, text);
      const response = await editChart(request);

      // await 완료 후 최신 spec 재획득 (PropertiesTab 동시 편집 방어)
      const freshSpec = chartSpecRef.current;
      if (!freshSpec) {
        appendMessage({ role: 'error', content: '차트가 초기화되었습니다. 다시 시도해주세요.' });
        return;
      }

      // patch 적용 + Zod 검증
      const patchResult = applyAndValidatePatches(freshSpec, response.patches);

      if (!patchResult.success) {
        appendMessage({
          role: 'error',
          content: `패치 검증 실패: ${patchResult.error}`,
        });
        return;
      }

      // zero-patch 감지: 경로를 찾지 못해 실제 변경 없이 통과된 경우
      const hasChanges = JSON.stringify(patchResult.spec) !== JSON.stringify(freshSpec);
      if (!hasChanges) {
        appendMessage({
          role: 'error',
          content: '경로를 찾지 못해 수정이 적용되지 않았습니다. 요청을 더 구체적으로 다시 입력해 주세요.',
        });
        return;
      }

      updateChartSpec(patchResult.spec);

      appendMessage({
        role: 'assistant',
        content: response.explanation,
        confidence: response.confidence,
        patchCount: response.patches.length,
      });
    } catch (err) {
      let userMessage = '알 수 없는 오류가 발생했습니다.';
      if (err instanceof AiServiceError) {
        switch (err.code) {
          case 'NO_RESPONSE':
            userMessage = 'AI 응답이 없습니다. 잠시 후 다시 시도해 주세요.';
            break;
          case 'PARSE_FAILED':
          case 'VALIDATION_FAILED':
            userMessage = 'AI가 올바른 형식으로 응답하지 못했습니다. 잠시 후 다시 시도해 주세요.';
            break;
          case 'READONLY_PATH':
            userMessage = '읽기 전용 경로는 수정할 수 없습니다. 데이터/버전 외 필드를 요청해 주세요.';
            break;
        }
      } else if (err instanceof Error) {
        userMessage = err.message;
      }
      appendMessage({ role: 'error', content: userMessage });
    } finally {
      setIsLoading(false);
      textareaRef.current?.focus();
    }
  }, [inputValue, isLoading, appendMessage, updateChartSpec]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  if (!chartSpec) {
    return (
      <p className="text-sm text-muted-foreground">데이터를 먼저 업로드하세요</p>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 채팅 메시지 영역 */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">예시 명령어</p>
            {[
              'X축 라벨 45도 회전해줘',
              '에러바 추가해줘 (표준오차)',
              'IEEE 흑백 스타일로 바꿔줘',
              '범례를 오른쪽 위로 옮겨줘',
              'Y축 제목을 "Weight (kg)"으로',
            ].map(example => (
              <button
                key={example}
                type="button"
                className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded px-2 py-1 transition-colors"
                onClick={() => setInputValue(example)}
              >
                {example}
              </button>
            ))}
          </div>
        ) : (
          messages.map(msg => <MessageBubble key={msg.id} message={msg} />)
        )}

        {isLoading && (
          <div className="flex gap-2">
            <div className="shrink-0 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
            </div>
            <div className="bg-muted rounded-lg rounded-tl-sm px-3 py-2 text-sm text-muted-foreground">
              차트 수정 중…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="차트를 어떻게 수정할까요? (Enter 전송, Shift+Enter 줄바꿈)"
          className="min-h-[60px] max-h-[120px] text-sm resize-none"
          disabled={isLoading}
          data-testid="ai-edit-input"
        />
        <Button
          size="icon"
          className="self-end shrink-0"
          onClick={() => void handleSend()}
          disabled={isLoading || !inputValue.trim()}
          aria-label="전송"
          data-testid="ai-edit-send"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
