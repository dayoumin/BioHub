/**
 * RAG 채팅 인터페이스 (세션 저장 기능 포함)
 *
 * RAGAssistant와 유사하지만 세션 관리 기능이 통합됨
 * - ChatStorageIndexedDB를 통한 메시지 자동 저장
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
  Trash2,
  Sparkles,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { queryRAG } from '@/lib/rag/rag-service'
import type { RAGResponse } from '@/lib/rag/providers/base-provider'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import type { ChatSession, ChatMessage } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

interface QuickPrompt {
  icon: string
  title: string
  prompt: string
}

interface RAGChatInterfaceProps {
  sessionId: string
  onSessionUpdate?: (session: ChatSession) => void
  className?: string
  quickPrompts?: QuickPrompt[]
  onQuickPrompt?: (prompt: string) => void
}

interface ExtendedChatMessage extends ChatMessage {
  response?: RAGResponse
}

export function RAGChatInterface({
  sessionId,
  onSessionUpdate,
  className = '',
  quickPrompts,
  onQuickPrompt,
}: RAGChatInterfaceProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([])
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [expandedSources, setExpandedSources] = useState<number | null>(null)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // 세션 로드
  useEffect(() => {
    const loadSession = async () => {
      setIsLoadingSession(true)
      try {
        const session = await ChatStorageIndexedDB.loadSession(sessionId)
        if (session) {
          setMessages(session.messages as ExtendedChatMessage[])
        }
      } catch (err) {
        console.error('Failed to load session:', err)
        setError('세션 로드 실패')
      } finally {
        setIsLoadingSession(false)
      }
    }
    loadSession()
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
    try {
      await ChatStorageIndexedDB.addMessage(sessionId, userMessage)
    } catch (err) {
      console.error('Failed to save user message:', err)
      setError('메시지 저장 실패')
    }

    try {
      // RAG 쿼리 (초기 응답으로 메타데이터 가져오기)
      const initialResponse = await queryRAG({
        query: query.trim(),
      })

      // AI 응답 메시지 준비 (빈 내용으로 시작)
      const assistantMessageId = `${Date.now()}-assistant`
      let finalContent = '' // ✅ finalContent로 정답 추적

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
      // ✅ 환경변수로 조건부 제어 (정적 배포 시 불필요한 404 방지)
      const streamingEnabled = process.env.NEXT_PUBLIC_ENABLE_STREAMING !== 'false'
      const userPreference = localStorage.getItem('enableStreaming')
      const useStreaming = userPreference !== null
        ? userPreference !== 'false'
        : streamingEnabled

      if (useStreaming && streamingEnabled) {
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

          // ✅ 최종 content 저장 (setState 스냅샷 대신 실제 값 사용)
          finalContent = fullContent

          reader.releaseLock()
        } catch (streamError) {
          // 스트리밍 실패 시 폴백: 이미 받은 initialResponse 사용
          console.warn('[handleSubmit] 스트리밍 실패, 기존 응답 사용:', streamError)
          finalContent = initialResponse.answer
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantMessageId
                ? { ...msg, content: finalContent }
                : msg
            )
          )
        }
      } else {
        // 스트리밍 미사용: 기존 방식 (initialResponse 사용)
        finalContent = initialResponse.answer
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: finalContent }
              : msg
          )
        )
      }

      // ✅ 응답 메시지 저장 (finalContent 직접 사용, messages 스냅샷 사용 안 함)
      try {
        await ChatStorageIndexedDB.addMessage(sessionId, {
          id: assistantMessageId,
          role: 'assistant',
          content: finalContent,
          timestamp: Date.now(),
          // ✅ Citation 정보 및 모델 메타데이터 저장
          sources: initialResponse.sources,
          model: initialResponse.model,
        })
      } catch (saveErr) {
        console.error('Failed to save assistant message:', saveErr)
      }

      // 세션 업데이트 콜백
      try {
        const updatedSession = await ChatStorageIndexedDB.loadSession(sessionId)
        if (updatedSession && onSessionUpdate) {
          onSessionUpdate(updatedSession)
        }
      } catch (err) {
        console.error('Failed to load updated session:', err)
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

      try {
        await ChatStorageIndexedDB.addMessage(sessionId, errorChatMessage)
      } catch (saveErr) {
        console.error('Failed to save error message:', saveErr)
      }

      // 세션 업데이트 콜백
      try {
        const updatedSession = await ChatStorageIndexedDB.loadSession(sessionId)
        if (updatedSession && onSessionUpdate) {
          onSessionUpdate(updatedSession)
        }
      } catch (err) {
        console.error('Failed to load updated session:', err)
      }
    } finally {
      setIsLoading(false)
    }
  }, [query, isLoading, sessionId, onSessionUpdate])

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

  // 메시지 수정 시작
  const handleEditMessage = useCallback((messageId: string, content: string) => {
    setEditingMessageId(messageId)
    setEditingContent(content)
    setQuery(content)
  }, [])

  // 메시지 삭제
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))

    try {
      await ChatStorageIndexedDB.deleteMessage(sessionId, messageId)

      const updatedSession = await ChatStorageIndexedDB.loadSession(sessionId)
      if (updatedSession) {
        setMessages(updatedSession.messages as ExtendedChatMessage[])
      }
    } catch (err) {
      console.error('Failed to delete message:', err)
      setError('메시지 삭제 실패')
    }
  }, [sessionId])

  // 수정 취소
  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null)
    setEditingContent('')
  }, [])

  // 로딩 중 UI
  if (isLoadingSession) {
    return (
      <div className={cn('flex flex-col h-full bg-muted/5 items-center justify-center', className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
        <span className="text-muted-foreground">메시지를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col h-full bg-muted/5', className)}>
      {/* 메시지 영역 */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 overflow-hidden p-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((msg, idx) => (
            <div
              key={msg.id}
              className={cn(
                'group relative flex',
                msg.role === 'user' ? 'justify-start' : 'justify-end'
              )}
            >
              <div
                className={cn(
                  'rounded-lg p-4',
                  msg.role === 'user'
                    ? 'bg-gray-200 text-black w-auto max-w-xs'
                    : 'bg-background w-auto'
                )}
              >
                {/* 메시지 내용 */}
                {msg.role === 'user' ? (
                  <p className="text-sm whitespace-pre-wrap text-right break-words">{msg.content}</p>
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

                {/* 참조 문서 (Assistant 메시지만) - 확장 기본값 true */}
                {msg.role === 'assistant' && (() => {
                  const sources = msg.response?.sources || msg.sources
                  return sources && sources.length > 0 ? (
                    <div className="mt-4 pt-3 border-t border-border/50">
                      <button
                        onClick={() =>
                          setExpandedSources(expandedSources === idx ? null : idx)
                        }
                        className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 text-primary rounded-full">
                          📚 참조 문서
                          <span className="font-bold">({(msg.response?.sources || msg.sources)?.length || 0})</span>
                        </span>
                        {expandedSources === idx ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>

                      {/* 기본값: expandedSources가 설정되지 않으면 true (첫 로드 시 열림) */}
                      {(expandedSources === idx || (expandedSources === null && idx === 0)) && (
                        <div className="mt-3 space-y-2">
                          {(msg.response?.sources || msg.sources)?.map((source, sourceIdx) => (
                            <div
                              key={sourceIdx}
                              className="text-xs bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-semibold text-foreground">{source.title}</div>
                                  <div className="text-muted-foreground mt-1.5 leading-relaxed">
                                    {source.content}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/10">
                                <span className="text-muted-foreground">관련도:</span>
                                <div className="flex-1 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary transition-all"
                                    style={{ width: `${source.score * 100}%` }}
                                  />
                                </div>
                                <span className="font-semibold text-primary">
                                  {(source.score * 100).toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null
                })()}
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

          {/* 빈 상태: 웰컴 문구 + 퀵 프롬프트 */}
          {messages.length === 0 && quickPrompts && quickPrompts.length > 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">
                  무엇을 도와드릴까요?
                </h2>
                <p className="text-muted-foreground">
                  통계 분석에 대해 궁금한 점을 물어보세요
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-2xl w-full">
                {quickPrompts.map((prompt, idx) => (
                  <Card
                    key={idx}
                    className="p-4 cursor-pointer border-muted hover:bg-muted/10 transition-colors"
                    onClick={() => {
                      setQuery(prompt.prompt)
                      onQuickPrompt?.(prompt.prompt)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{prompt.icon}</div>
                      <div>
                        <div className="font-medium mb-1">{prompt.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {prompt.prompt}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 입력 영역 - 항상 하단 표시 */}
      <div className="p-4 bg-muted/5 shrink-0">
        <div className="max-w-3xl mx-auto space-y-2">
          <div className="relative bg-background border border-border rounded-lg overflow-hidden">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요"
              rows={3}
              disabled={isLoading}
              className="resize-none border-0 bg-background w-full"
            />
            {/* 입력 영역 위 우측 버튼 그룹 */}
            {query.trim() && !isLoading && (
              <div className="absolute -top-10 right-0 flex gap-1">
                {editingMessageId ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void handleSubmit()
                        handleCancelEdit()
                      }}
                      className="h-7 px-2"
                    >
                      <Check className="h-3 w-3" />
                      저장
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-7 px-2"
                    >
                      취소
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyMessage('input', query)}
                      className="h-7 px-2"
                      title="입력 텍스트 복사"
                    >
                      {copiedMessageId === 'input' ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuery('')}
                      className="h-7 px-2"
                      title="입력 텍스트 삭제"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
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
