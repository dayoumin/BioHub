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
import type { PluggableList } from 'unified'
import 'katex/dist/katex.min.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2,
  XCircle,
  Send,
  Copy,
  Check,
  Trash2,
  Sparkles,
  Edit2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { queryRAG } from '@/lib/rag/rag-service'
import { MARKDOWN_CONFIG, RAG_UI_CONFIG } from '@/lib/rag/config'
import { handleRAGError } from '@/lib/rag/utils/error-handler'
import { ChatSourcesDisplay } from './chat-sources-display'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import type { ChatSession, ChatMessage } from '@/lib/types/chat'
import type { RAGResponse } from '@/lib/rag/providers/base-provider'
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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Ollama 연결 상태 체크
  const [ollamaStatus, setOllamaStatus] = useState<'checking' | 'available' | 'unavailable'>('checking')

  // Ollama 연결 상태 체크
  useEffect(() => {
    const checkOllama = async () => {
      const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000) // 2초 타임아웃

        const response = await fetch(`${ollamaEndpoint}/api/tags`, {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (response.ok) {
          setOllamaStatus('available')
        } else {
          setOllamaStatus('unavailable')
        }
      } catch {
        setOllamaStatus('unavailable')
      }
    }

    checkOllama()
  }, [])

  // 세션 로드
  useEffect(() => {
    const loadSession = async () => {
      setIsLoadingSession(true)
      try {
        const session = await ChatStorageIndexedDB.loadSession(sessionId)
        if (session) {
          setMessages(session.messages as ChatMessage[])
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

    const userMessage: ChatMessage = {
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
      // Production 환경에서 Ollama 연결 실패 가능성 체크
      let initialResponse
      try {
        initialResponse = await queryRAG({
          query: query.trim(),
        })
      } catch (ragError: unknown) {
        // Ollama 연결 실패 시 graceful 처리
        const errorMessage = ragError instanceof Error ? ragError.message : '알 수 없는 오류'
        if (errorMessage.includes('fetch') || errorMessage.includes('CORS') || errorMessage.includes('NetworkError')) {
          throw new Error('RAG 시스템을 사용할 수 없습니다. 로컬 Ollama 서버를 실행하거나 환경을 확인해주세요.')
        }
        throw ragError
      }

      // AI 응답 메시지 준비 (빈 내용으로 시작)
      const assistantMessageId = `${Date.now()}-assistant`
      let finalContent = '' // ✅ finalContent로 정답 추적

      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        sources: initialResponse.sources,
        model: initialResponse.model,
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

          // 에러 타입별 처리
          if (streamError instanceof TypeError) {
            console.error('[handleSubmit] 네트워크 에러 또는 타입 에러:', streamError.message)
          } else if (streamError instanceof SyntaxError) {
            console.error('[handleSubmit] JSON 파싱 에러:', streamError.message)
          } else if (streamError instanceof Error) {
            console.error('[handleSubmit] 일반 에러:', streamError.message)
          }

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
      const errorResult = handleRAGError(err, 'RAGChatInterface.handleSubmit')
      setError(errorResult.message)

      // 에러 메시지도 저장 (userMessage는 이미 저장됨)
      const errorChatMessage: ChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: `오류가 발생했습니다: ${errorResult.message}`,
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
        setMessages(updatedSession.messages as ChatMessage[])
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
                      remarkPlugins={[...MARKDOWN_CONFIG.remarkPlugins] as PluggableList}
                      rehypePlugins={[...MARKDOWN_CONFIG.rehypePlugins] as PluggableList}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                )}

                {/* 메시지 액션 버튼 그룹 */}
                <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* 복사 버튼 */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleCopyMessage(msg.id, msg.content)}
                    title="복사"
                  >
                    {copiedMessageId === msg.id ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>

                  {/* 편집 버튼 (user 메시지만) */}
                  {msg.role === 'user' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => handleEditMessage(msg.id, msg.content)}
                      title="편집"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}

                  {/* 삭제 버튼 */}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteMessage(msg.id)}
                    title="삭제"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                {/* 참조 문서 (Assistant 메시지만) - ChatSourcesDisplay 컴포넌트 사용 */}
                {msg.role === 'assistant' && (msg.sources || msg.response?.sources) && (
                  <ChatSourcesDisplay
                    sources={(msg.sources || msg.response?.sources) || []}
                    defaultExpanded={false}
                  />
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

          {/* 빈 상태: Ollama 설치 안내 또는 웰컴 문구 + 퀵 프롬프트 */}
          {messages.length === 0 && quickPrompts && quickPrompts.length > 0 && (
            <div className="flex flex-col items-center justify-center py-8">
              {/* Ollama 미설치 시 안내 */}
              {ollamaStatus === 'unavailable' && (
                <Card className="max-w-2xl w-full mb-8 p-6 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">⚠️</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-2 text-amber-900 dark:text-amber-100">
                        RAG 챗봇을 사용하려면 Ollama 설치가 필요합니다
                      </h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
                        이 기능은 로컬 AI 모델(Ollama)을 사용합니다. 아래 단계를 따라 설정해주세요:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-sm text-amber-900 dark:text-amber-100 mb-4">
                        <li>
                          <a
                            href="https://ollama.com/download"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-primary"
                          >
                            Ollama 다운로드 및 설치
                          </a>
                        </li>
                        <li>터미널에서 모델 다운로드:
                          <code className="ml-2 px-2 py-1 bg-amber-100 dark:bg-amber-900 rounded text-xs">
                            ollama pull mxbai-embed-large && ollama pull qwen2.5
                          </code>
                        </li>
                        <li>페이지 새로고침</li>
                      </ol>
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        💡 폐쇄망 환경이나 오프라인 사용을 위한 기능입니다. 인터넷 연결이 필요 없습니다.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* 로딩 중 */}
              {ollamaStatus === 'checking' && (
                <div className="flex items-center gap-2 text-muted-foreground mb-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Ollama 연결 확인 중...</span>
                </div>
              )}

              {/* Ollama 사용 가능 시 웰컴 문구 */}
              {ollamaStatus === 'available' && (
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">
                    {RAG_UI_CONFIG.titles.chatInterface}
                  </h2>
                  <p className="text-muted-foreground">
                    {RAG_UI_CONFIG.messages.welcomeSubtext}
                  </p>
                </div>
              )}

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
              placeholder={
                ollamaStatus === 'unavailable'
                  ? 'Ollama를 설치하고 모델을 다운로드하면 사용할 수 있습니다'
                  : ollamaStatus === 'checking'
                  ? '연결 확인 중...'
                  : RAG_UI_CONFIG.placeholders.query
              }
              rows={3}
              disabled={isLoading || ollamaStatus !== 'available'}
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
                  {RAG_UI_CONFIG.messages.thinking}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {RAG_UI_CONFIG.buttons.send}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
