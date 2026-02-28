'use client';

/**
 * AiPanel — 도킹 가능한 AI 어시스턴트 패널
 *
 * - bottom (기본): 하단 고정 (h-[220px])
 * - left: 좌측 패널 (w-80)
 * - right: 우측 패널 (w-80)
 *
 * L1 카드 → L2 카드 드릴다운
 * - prompt 있는 L2: AI 입력창에 자동완성
 * - directApply 있는 L2: store 즉시 업데이트
 */

import { useState, useCallback } from 'react';
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store';
import { useAiChat } from '@/lib/graph-studio/use-ai-chat';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Bot,
  User,
  X,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Ruler,
  Palette,
  BarChart2,
  Type,
  TrendingUp,
  Maximize2,
} from 'lucide-react';
import type { ChatMessage, ChatRole } from '@/lib/graph-studio/use-ai-chat';
import type { AiPanelDock } from '@/types/graph-studio';

// ─── 카드 데이터 ────────────────────────────────────────────

interface L2Card {
  id: string;
  label: string;
  prompt?: string;
  directApply?: { physicalWidth?: number; physicalHeight?: number };
}

interface L1Card {
  id: string;
  label: string;
  icon: React.ElementType;
  children: L2Card[];
}

const AI_CARD_TREE: L1Card[] = [
  {
    id: 'axis', label: '축 설정', icon: Ruler,
    children: [
      { id: 'x-title',   label: 'X축 제목',    prompt: 'X축 제목을 "___"으로 바꿔줘' },
      { id: 'y-title',   label: 'Y축 제목',    prompt: 'Y축 제목을 "___"으로 바꿔줘' },
      { id: 'log-scale', label: '로그 스케일', prompt: 'Y축을 로그 스케일로 변경해줘' },
      { id: 'y-range',   label: 'Y축 범위',    prompt: 'Y축 범위를 _~_으로 설정해줘' },
      { id: 'x-rotate',  label: 'X라벨 회전',  prompt: 'X축 라벨 45도 회전해줘' },
    ],
  },
  {
    id: 'style', label: '색상·스타일', icon: Palette,
    children: [
      { id: 'science',   label: 'Science 스타일', prompt: 'Nature/Science 스타일로 바꿔줘' },
      { id: 'ieee',      label: 'IEEE 스타일',    prompt: 'IEEE 흑백 스타일로 바꿔줘' },
      { id: 'grayscale', label: '흑백 변환',      prompt: '흑백 차트로 변환해줘' },
    ],
  },
  {
    id: 'chart-type', label: '차트 유형', icon: BarChart2,
    children: [
      { id: 'to-bar',     label: '막대',  prompt: '막대 차트로 변환해줘' },
      { id: 'to-line',    label: '선',    prompt: '선 차트로 변환해줘' },
      { id: 'to-scatter', label: '산점도', prompt: '산점도로 변환해줘' },
    ],
  },
  {
    id: 'label', label: '제목·레이블', icon: Type,
    children: [
      { id: 'chart-title',  label: '차트 제목',  prompt: '차트 제목을 "___"으로 바꿔줘' },
      { id: 'legend-pos',   label: '범례 위치',  prompt: '범례를 오른쪽으로 이동해줘' },
      { id: 'hide-legend',  label: '범례 숨기기', prompt: '범례를 숨겨줘' },
    ],
  },
  {
    id: 'errorbar', label: '에러바·통계', icon: TrendingUp,
    children: [
      { id: 'add-sem', label: 'SEM 에러바', prompt: '에러바 추가해줘 (표준오차)' },
      { id: 'add-sd',  label: 'SD 에러바',  prompt: '에러바 추가해줘 (표준편차)' },
      { id: 'add-ci',  label: '95% CI',     prompt: '95% 신뢰구간 에러바 추가해줘' },
    ],
  },
  {
    id: 'export', label: '출력 크기', icon: Maximize2,
    children: [
      { id: 'nature-s', label: 'Nature 단칼 86mm',  directApply: { physicalWidth: 86 } },
      { id: 'nature-d', label: 'Nature 전체 178mm', directApply: { physicalWidth: 178 } },
      { id: 'cell-s',   label: 'Cell 단칼 88mm',    directApply: { physicalWidth: 88 } },
    ],
  },
];

// ─── MessageBubble ──────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }): React.ReactElement {
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

// ─── AiPanel ───────────────────────────────────────────────

export function AiPanel(): React.ReactElement {
  const { aiPanelDock, setAiPanelDock, toggleAiPanel, chartSpec, setExportConfig } = useGraphStudioStore();
  const { messages, inputValue, setInputValue, isLoading, handleSend, handleKeyDown, textareaRef, messagesEndRef } = useAiChat();

  const [selectedL1, setSelectedL1] = useState<string | null>(null);

  const isBottom = aiPanelDock === 'bottom';
  const isSide = aiPanelDock === 'left' || aiPanelDock === 'right';

  // L2 카드 클릭: prompt → 입력창 자동완성 / directApply → 즉시 적용
  const handleL2Click = useCallback((card: L2Card) => {
    if (card.prompt) {
      setInputValue(card.prompt);
      textareaRef.current?.focus();
    } else if (card.directApply && chartSpec) {
      setExportConfig({ ...chartSpec.exportConfig, ...card.directApply });
    }
    setSelectedL1(null);
  }, [chartSpec, setExportConfig, setInputValue, textareaRef]);

  const selectedL1Data = AI_CARD_TREE.find(c => c.id === selectedL1);

  // ─── 패널 컨테이너 클래스 ──────────────────────────────────

  const containerClass = isBottom
    ? 'border-t border-border bg-background flex flex-col'
    : 'border-l border-border bg-background flex flex-col w-80 flex-shrink-0';

  const containerStyle = isBottom ? { height: 220 } : undefined;

  return (
    <div className={containerClass} style={containerStyle}>
      {/* 헤더 바 */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
        <span className="text-xs font-medium text-muted-foreground">AI 어시스턴트</span>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost" size="icon"
            className={`h-6 w-6 ${aiPanelDock === 'left' ? 'text-primary' : ''}`}
            onClick={() => { setAiPanelDock('left'); setSelectedL1(null); }}
            title="왼쪽에 도킹"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={`h-6 w-6 ${aiPanelDock === 'bottom' ? 'text-primary' : ''}`}
            onClick={() => { setAiPanelDock('bottom'); setSelectedL1(null); }}
            title="하단에 도킹"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className={`h-6 w-6 ${aiPanelDock === 'right' ? 'text-primary' : ''}`}
            onClick={() => { setAiPanelDock('right'); setSelectedL1(null); }}
            title="오른쪽에 도킹"
          >
            <ArrowRight className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost" size="icon"
            className="h-6 w-6"
            onClick={toggleAiPanel}
            title="패널 닫기"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* 콘텐츠 영역 */}
      <div className={`flex flex-1 min-h-0 ${isBottom ? 'flex-row' : 'flex-col'} gap-2 p-2`}>

        {/* L1/L2 카드 영역 */}
        <div className={isBottom ? 'flex flex-col gap-1 shrink-0 w-[260px]' : 'shrink-0'}>
          {/* L1 카드 */}
          <div className={`flex gap-1 ${isBottom ? 'flex-wrap' : 'flex-wrap'}`}>
            {AI_CARD_TREE.map(card => {
              const Icon = card.icon;
              const isActive = selectedL1 === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setSelectedL1(isActive ? null : card.id)}
                  className={[
                    'flex items-center gap-1 text-xs border rounded px-2 py-1 transition-colors',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary font-medium'
                      : 'border-border hover:bg-muted',
                  ].join(' ')}
                >
                  <Icon className="h-3 w-3" />
                  {card.label}
                </button>
              );
            })}
          </div>

          {/* L2 카드 (L1 선택 시) */}
          {selectedL1Data && (
            <div className="flex gap-1 flex-wrap mt-1">
              {selectedL1Data.children.map(child => (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => handleL2Click(child)}
                  className="text-xs border border-border rounded px-2 py-1 hover:bg-primary/10 hover:border-primary hover:text-primary transition-colors"
                >
                  {child.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 채팅 영역 */}
        <div className="flex flex-col flex-1 min-h-0 min-w-0">
          {/* 메시지 스크롤 */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-1 pr-1 min-h-0">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground">카드를 선택하거나 직접 입력하세요</p>
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

          {/* 입력 */}
          <div className="flex gap-1.5 shrink-0">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="차트를 어떻게 수정할까요? (Enter 전송)"
              className="min-h-[40px] max-h-[80px] text-xs resize-none"
              disabled={isLoading || !chartSpec}
              data-testid="ai-panel-input"
            />
            <Button
              size="icon"
              className="self-end shrink-0 h-8 w-8"
              onClick={() => void handleSend()}
              disabled={isLoading || !inputValue.trim() || !chartSpec}
              aria-label="전송"
              data-testid="ai-panel-send"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
