/**
 * RAG 채팅 인터페이스 (세션 저장 기능 포함)
 *
 * RAGAssistant와 유사하지만 세션 관리 기능이 통합됨
 * - ChatStorage를 통한 메시지 자동 저장
 * - 세션 업데이트 콜백
 * - 메시지 복사 기능
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  XCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
} from 'lucide-react'
import { queryRAG } from '@/lib/rag/rag-service'
import type { RAGResponse } from '@/lib/rag/providers/base-provider'
import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatSession, ChatMessage } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

interface RAGChatInterfaceProps {
  sessionId: string
  onSessionUpdate?: (session: ChatSession) => void
  className?: string
}

interface ExtendedChatMessage extends ChatMessage {
  response?: RAGResponse
}

export function RAGChatInterface({
  sessionId,
  onSessionUpdate,
  className = '',
}: RAGChatInterfaceProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([])
  const [expandedSources, setExpandedSources] = useState<number | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 세션 로드
  useEffect(() => {
    const session = ChatStorage.loadSession(sessionId)
    if (session) {
      setMessages(session.messages as ExtendedChatMessage[])
    }
  }, [sessionId])

  // 스크롤을 맨 아래로
  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      )
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [])

  // 메시지 추가 시 스크롤
  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 질문 전송 (스트리밍 지원)
  const handleSubmit = useCallback(async () => {
    if (!query.trim() || isLoading) return

    const userMessage: ExtendedChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content: query.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setQuery('')
    setIsLoading(true)
    setError(null)

    // ✅ 사용자 메시지 즉시 저장 (네트워크 오류 시 복구 가능)
    ChatStorage.addMessage(sessionId, userMessage)

    try {
      // RAG 쿼리 (초기 응답으로 메타데이터 가져오기)
      const initialResponse = await queryRAG({
        query: query.trim(),
      })

      // AI 응답 메시지 준비 (빈 내용으로 시작)
      const assistantMessageId = `${Date.now()}-assistant`
      const assistantMessage: ExtendedChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        response: initialResponse,
      }

      // UI에 즉시 추가 (스트리밍 시작 신호)
      setMessages((prev) => [...prev, assistantMessage])

      // 스트리밍 사용 가능 여부 확인
      const useStreaming = localStorage.getItem('enableStreaming') !== 'false'

      if (useStreaming) {
        // 스트리밍 방식: 점진적으로 응답 업데이트
        try {
          const response = await fetch('/api/rag/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: query.trim(),
              sessionId,
            }),
          })

          if (!response.ok) {
            throw new Error('스트리밍 요청 실패')
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('응답 스트림을 읽을 수 없습니다')
          }

          const decoder = new TextDecoder()
          let buffer = ''
          let fullContent = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (line.trim() === '') continue

              try {
                const json = JSON.parse(line) as { chunk?: string; done?: boolean }
                if (json.chunk) {
                  fullContent += json.chunk
                  // 메시지 점진적 업데이트
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  )
                }
              } catch {
                console.debug('[handleSubmit] JSON 파싱 실패:', line)
              }
            }
          }

          // 최종 버퍼 처리
          if (buffer.trim()) {
            try {
              const json = JSON.parse(buffer) as { chunk?: string }
              if (json.chunk) {
                fullContent += json.chunk
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: fullContent }
                      : msg
                  )
                )
              }
            } catch {
              console.debug('[handleSubmit] 최종 버퍼 JSON 파싱 실패')
            }
          }

          reader.releaseLock()
        } catch (streamError) {
          // 스트리밍 실패 시 폴백: 이미 받은 initialResponse 사용
          console.warn('[handleSubmit] 스트리밍 실패, 기존 응답 사용:', streamError)
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: initialResponse.answer }
                : msg
            )
          )
        }
      } else {
        // 스트리밍 미사용: 기존 방식 (initialResponse 사용)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: initialResponse.answer }
              : msg
          )
        )
      }

      // 최종 메시지 저장
      const finalMessage: ExtendedChatMessage = {
        ...assistantMessage,
        content: (messages.find((m) => m.id === assistantMessageId)?.content || ''),
      }

      // ✅ 응답 메시지 저장 (userMessage는 이미 저장됨)
      ChatStorage.addMessage(sessionId, {
        id: assistantMessageId,
        role: 'assistant',
        content: finalMessage.content,
        timestamp: Date.now(),
        // ✅ Citation 정보 및 모델 메타데이터 저장
        sources: initialResponse.sources,
        model: initialResponse.model,
      })

      // 세션 업데이트 콜백
      const updatedSession = ChatStorage.loadSession(sessionId)
      if (updatedSession && onSessionUpdate) {
        onSessionUpdate(updatedSession)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(errorMessage)

      // 에러 메시지도 저장 (userMessage는 이미 저장됨)
      const errorChatMessage: ExtendedChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: `오류가 발생했습니다: ${errorMessage}`,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, errorChatMessage])
      ChatStorage.addMessage(sessionId, errorChatMessage)

      // 세션 업데이트 콜백
      const updatedSession = ChatStorage.loadSession(sessionId)
      if (updatedSession && onSessionUpdate) {
        onSessionUpdate(updatedSession)
      }
    } finally {
      setIsLoading(false)
    }
  }, [query, isLoading, sessionId, onSessionUpdate, messages])

  // Enter 키로 전송
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSubmit()
      }
    },
    [handleSubmit]
  )

  // 메시지 복사
  const handleCopyMessage = useCallback(async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      setCopiedMessageId(messageId)
      setTimeout(() => setCopiedMessageId(null), 2000)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }, [])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 메시지 영역 */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={cn(
                'group relative',
                msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg p-4',
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50'
                )}
              >
                {/* 메시지 내용 */}
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* 복사 버튼 */}
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleCopyMessage(msg.id, msg.content)}
                >
                  {copiedMessageId === msg.id ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>

                {/* 참조 문서 (Assistant 메시지만) */}
                {msg.role === 'assistant' &&
                  (msg.response?.sources || msg.sources) &&
                  (msg.response?.sources || msg.sources)?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <button
                        onClick={() =>
                          setExpandedSources(expandedSources === idx ? null : idx)
                        }
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span>참조 문서 ({(msg.response?.sources || msg.sources)?.length || 0}개)</span>
                        {expandedSources === idx ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {expandedSources === idx && (
                        <div className="mt-2 space-y-1">
                          {(msg.response?.sources || msg.sources)?.map((source, sourceIdx) => (
                            <div
                              key={sourceIdx}
                              className="text-xs bg-background/50 rounded p-2"
                            >
                              <div className="font-medium">{source.title}</div>
                              <div className="text-muted-foreground mt-1 line-clamp-2">
                                {source.content}
                              </div>
                              <div className="text-muted-foreground mt-1">
                                관련도: {(source.score * 100).toFixed(0)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          ))}

          {/* 로딩 중 */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>생각 중...</span>
                </div>
              </div>
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="flex justify-start">
              <div className="bg-destructive/10 rounded-lg p-4 max-w-[80%]">
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <XCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 입력 영역 */}
      <div className="border-t p-4">
        <div className="max-w-3xl mx-auto space-y-2">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="질문을 입력하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
            rows={3}
            disabled={isLoading}
            className="resize-none"
          />
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted-foreground">
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Enter</kbd> 전송
              <span className="mx-2">·</span>
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">Shift+Enter</kbd> 줄바꿈
            </div>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !query.trim()}
              size="sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  생각 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  전송
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
