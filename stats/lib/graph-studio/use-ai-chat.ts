'use client';

/**
 * useAiChat — AI 채팅 로직 커스텀 훅
 *
 * AiPanel에서 사용. 원래 AiEditTab에서 추출.
 *
 * ### chartSpecRef 패턴 (stale closure 방지)
 * handleSend는 async 함수이며 useCallback으로 메모이제이션.
 * dependency 배열에 chartSpec을 포함하면 spec이 바뀔 때마다 콜백이 재생성되는데,
 * 비동기 실행 중 spec이 변경되면 요청 시점(start) spec과 완료 시점(end) spec이 다를 수 있음.
 * → useRef로 ref를 만들고 useEffect로 매 렌더마다 동기화,
 *   비동기 핸들러 내부에서는 항상 ref.current로 최신값에 접근.
 *
 * - zero-patch 감지, MAX_MESSAGES=30, localStorage 영속
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import type { KeyboardEvent, RefObject } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { applyAndValidatePatches } from '@/lib/graph-studio/chart-spec-utils';
import { editChart, buildAiEditRequest, AiServiceError } from '@/lib/graph-studio/ai-service';
import { logger } from '@/lib/utils/logger';

// ─── 타입 ──────────────────────────────────────────────────

const MAX_MESSAGES = 30;
const CHAT_STORAGE_KEY = 'graph_studio_ai_chat';

export type ChatRole = 'user' | 'assistant' | 'error';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  confidence?: number;
  patchCount?: number;
}

export interface AiChatHook {
  messages: ChatMessage[];
  inputValue: string;
  setInputValue: (value: string) => void;
  isLoading: boolean;
  handleSend: () => Promise<void>;
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

// ─── 훅 ────────────────────────────────────────────────────

export function useAiChat(): AiChatHook {
  const { chartSpec, updateChartSpec } = useGraphStudioStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 비동기 handleSend에서 최신 spec 접근 — 상단 JSDoc의 chartSpecRef 패턴 참조
  const chartSpecRef = useRef(chartSpec);
  useEffect(() => { chartSpecRef.current = chartSpec; }, [chartSpec]);

  // localStorage 로드 (마운트 1회)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch (err) {
      logger.warn('[use-ai-chat] 채팅 히스토리 파싱 실패, 저장된 히스토리를 삭제합니다.', err);
      localStorage.removeItem(CHAT_STORAGE_KEY);
      setMessages([]);
    }
  }, []);

  // 메시지 변경 시 localStorage 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch { /* 용량 초과 등 무시 */ }
  }, [messages]);

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const appendMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setMessages(prev => {
      const next = [...prev, { ...msg, id: `${Date.now()}-${Math.random()}` }];
      return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    const spec = chartSpecRef.current;
    if (!text || !spec || isLoading) return;

    setInputValue('');
    appendMessage({ role: 'user', content: text });
    setIsLoading(true);

    try {
      const request = buildAiEditRequest(spec, text);
      const response = await editChart(request);

      const freshSpec = chartSpecRef.current;
      if (!freshSpec) {
        appendMessage({ role: 'error', content: '차트가 초기화되었습니다. 다시 시도해주세요.' });
        return;
      }

      const patchResult = applyAndValidatePatches(freshSpec, response.patches);
      if (!patchResult.success) {
        appendMessage({ role: 'error', content: `패치 검증 실패: ${patchResult.error}` });
        return;
      }

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
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void handleSend();
      }
    },
    [handleSend],
  );

  return {
    messages,
    inputValue,
    setInputValue,
    isLoading,
    handleSend,
    handleKeyDown,
    textareaRef,
    messagesEndRef,
  };
}
