/**
 * RAG Assistant Compact 컴포넌트
 *
 * 우측 패널에 최적화된 간소화 버전
 * - 대화 기록 사이드바 제거
 * - 헤더 간소화
 * - 컴팩트한 UI
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import 'katex/dist/katex.min.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, XCircle, Send, Plus } from 'lucide-react'
import { queryRAG } from '@/lib/rag/rag-service'
import { MARKDOWN_CONFIG, RAG_UI_CONFIG } from '@/lib/rag/config'
import { handleRAGError } from '@/lib/rag/utils/error-handler'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import { ChatSourcesDisplay } from './chat-sources-display'
import { OllamaSetupDialog } from '@/components/chatbot/ollama-setup-dialog'
import { checkOllamaStatus, type OllamaStatus } from '@/lib/rag/utils/ollama-check'
import type { RAGResponse } from '@/lib/rag/providers/base-provider'
import type { ChatSession } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

interface RAGAssistantCompactProps {
  /** 현재 통계 메서드 (예: 'tTest', 'anova') */
  method?: string
  /** 클래스 (선택) */
  className?: string
  /** 즐겨찾기 필터 상태 (외부에서 제어) */
  showFavoritesOnly?: boolean
}

interface ChatMessage {
  query: string
  response: RAGResponse
  timestamp: number
}

export function RAGAssistantCompact({ method, className = '', showFavoritesOnly = false }: RAGAssistantCompactProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])

  // 세션 초기화 및 로드
  useEffect(() => {
    const initSession = async () => {
      try {
        const loadedSessions = await ChatStorageIndexedDB.loadSessions()
        setSessions(loadedSessions)

        if (loadedSessions.length === 0) {
          const newSession = await ChatStorageIndexedDB.createNewSession()
          setCurrentSessionId(newSession.id)
          setSessions([newSession])
        } else {
          setCurrentSessionId(loadedSessions[0].id)
          // 최근 세션의 메시지 로드
          const session = loadedSessions[0]
          const convertedMessages = session.messages.reduce<ChatMessage[]>((acc, msg, idx, arr) => {
            if (msg.role === 'user' && idx + 1 < arr.length && arr[idx + 1].role === 'assistant') {
              const assistantMsg = arr[idx + 1]
              acc.push({
                query: msg.content,
                response: {
                  answer: assistantMsg.content,
                  sources: assistantMsg.sources || [],
                  model: assistantMsg.model || { provider: 'unknown' },
                },
                timestamp: msg.timestamp,
              })
            }
            return acc
          }, [])
          setMessages(convertedMessages)
        }
      } catch (err) {
        console.error('Failed to load sessions:', err)
      }
    }

    void initSession()
  }, [])

  // 질문 전송
  const handleSubmit = useCallback(async () => {
    if (!query.trim() || !currentSessionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await queryRAG({
        query: query.trim(),
        method
      })

      const newMessage: ChatMessage = {
        query: query.trim(),
        response,
        timestamp: Date.now()
      }

      setMessages((prev) => [...prev, newMessage])

      // ChatStorageIndexedDB에 저장
      await ChatStorageIndexedDB.addMessage(currentSessionId, {
        id: `${Date.now()}-user`,
        role: 'user',
        content: query.trim(),
        timestamp: Date.now()
      })

      await ChatStorageIndexedDB.addMessage(currentSessionId, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: response.answer,
        timestamp: Date.now(),
        sources: response.sources,
        model: response.model
      })

      // 세션 목록 업데이트
      const updatedSessions = await ChatStorageIndexedDB.loadSessions()
      setSessions(updatedSessions)

      setQuery('') // 입력 초기화
    } catch (err) {
      const errorResult = handleRAGError(err, 'RAGAssistantCompact.handleSubmit')
      setError(errorResult.message)
    } finally {
      setIsLoading(false)
    }
  }, [query, method, currentSessionId])

  // 새 대화 시작
  const handleNewSession = useCallback(async () => {
    try {
      const newSession = await ChatStorageIndexedDB.createNewSession()
      setCurrentSessionId(newSession.id)
      setSessions((prev) => [newSession, ...prev])
      setMessages([])
    } catch (err) {
      console.error('Failed to create new session:', err)
    }
  }, [])

  // 세션 선택
  const handleSelectSession = useCallback(async (sessionId: string) => {
    try {
      const session = await ChatStorageIndexedDB.loadSession(sessionId)
      if (session) {
        setCurrentSessionId(sessionId)
        const convertedMessages = session.messages.reduce<ChatMessage[]>((acc, msg, idx, arr) => {
          if (msg.role === 'user' && idx + 1 < arr.length && arr[idx + 1].role === 'assistant') {
            const assistantMsg = arr[idx + 1]
            acc.push({
              query: msg.content,
              response: {
                answer: assistantMsg.content,
                sources: assistantMsg.sources || [],
                model: assistantMsg.model || { provider: 'unknown' },
              },
              timestamp: msg.timestamp,
            })
          }
          return acc
        }, [])
        setMessages(convertedMessages)
      }
    } catch (err) {
      console.error('Failed to load session:', err)
    }
  }, [])

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

  const filteredSessions = showFavoritesOnly
    ? sessions.filter((s) => s.isFavorite)
    : sessions

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* 상단 세션 헤더 (최신 UI 패턴) */}
      <div className="h-12 flex-shrink-0 border-b bg-muted/30">
        <div className="h-full flex items-center gap-2 px-3 justify-between">
          {/* 새 대화 버튼 */}
          <Button
            size="icon"
            variant="outline"
            onClick={() => void handleNewSession()}
            className="flex-shrink-0 bg-background hover:bg-muted h-8 w-8"
            title="새 대화"
          >
            <Plus className="h-4 w-4" />
          </Button>

          {/* 현재 세션 제목 */}
          {currentSession && (
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm text-muted-foreground truncate" title={currentSession.title}>
                {currentSession.title}
              </span>
            </div>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        /* 대화 없을 때: 중앙 배치 */
        <div className="flex-1 flex flex-col items-center justify-center p-4 gap-6">
          <div className="text-center text-muted-foreground text-sm max-w-md">
            <p>질문을 입력해주세요.</p>
            <p className="text-xs mt-2">
              예: "t-test의 가정은 무엇인가요?"
            </p>
          </div>

          {/* 입력 영역 - 중앙 */}
          <div className="w-full max-w-2xl">
            <div className="relative">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={RAG_UI_CONFIG.placeholders.query}
                rows={3}
                disabled={isLoading}
                className="resize-none w-full text-sm pr-12"
              />
              <Button
                onClick={() => void handleSubmit()}
                disabled={isLoading || !query.trim()}
                size="icon"
                className="absolute bottom-2 right-2 h-8 w-8"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* 대화 있을 때: 기존 레이아웃 */
        <>
          {/* 대화 내역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-2">
                {/* 사용자 질문 */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">질문:</p>
                  <p className="text-sm">{msg.query}</p>
                </div>

                {/* AI 답변 */}
                <div className="bg-primary/5 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">답변:</p>
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      remarkPlugins={[...MARKDOWN_CONFIG.remarkPlugins]}
                      rehypePlugins={[...MARKDOWN_CONFIG.rehypePlugins] as any}
                    >
                      {msg.response.answer.replace(/<think>[\s\S]*?<\/think>/g, '')}
                    </ReactMarkdown>
                  </div>

                  {/* 참조 문서 (Fallback 제외: score > 0.5) */}
                  {msg.response.sources && msg.response.sources.filter(s => (s as any).score > 0.5).length > 0 && (
                    <ChatSourcesDisplay
                      sources={msg.response.sources.filter(s => (s as any).score > 0.5)}
                      defaultExpanded={false}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* 로딩 중 */}
            {isLoading && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>생각 중...</span>
              </div>
            )}

            {/* 에러 메시지 */}
            {error && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}
          </div>

          {/* 입력 영역 - 하단 */}
          <div className="p-4 border-t bg-muted/30">
            <div className="relative">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={RAG_UI_CONFIG.placeholders.query}
                rows={3}
                disabled={isLoading}
                className="resize-none w-full text-sm pr-12"
              />
              <Button
                onClick={() => void handleSubmit()}
                disabled={isLoading || !query.trim()}
                size="icon"
                className="absolute bottom-2 right-2 h-8 w-8"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
