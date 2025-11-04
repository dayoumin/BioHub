/**
 * RAG Assistant 컴포넌트
 *
 * 통계 페이지에 통합되는 사이드바 형태의 RAG 도우미
 * - 질문 입력 및 답변 표시
 * - 참조 문서 목록
 * - 현재 통계 메서드 컨텍스트 자동 전달
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import 'katex/dist/katex.min.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, XCircle, Send, Star, Plus, Menu, X as CloseIcon } from 'lucide-react'
import { queryRAG } from '@/lib/rag/rag-service'
import { MARKDOWN_CONFIG, RAG_UI_CONFIG } from '@/lib/rag/config'
import { handleRAGError } from '@/lib/rag/utils/error-handler'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import { ChatSourcesDisplay } from './chat-sources-display'
import type { ChatSession } from '@/lib/types/chat'
import type { RAGResponse } from '@/lib/rag/providers/base-provider'
import { cn } from '@/lib/utils'
import { ChatHeaderMenu } from './chat-header-menu'

interface RAGAssistantProps {
  /** 현재 통계 메서드 (예: 'tTest', 'anova') */
  method?: string
  /** 사이드바 클래스 (선택) */
  className?: string
  /** 새 메시지 받을 때 호출되는 콜백 (선택) */
  onNewMessage?: () => void
}

interface ChatMessage {
  query: string
  response: RAGResponse
  timestamp: number
}

export function RAGAssistant({ method, className = '', onNewMessage }: RAGAssistantProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [expandedSources, setExpandedSources] = useState<number | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // 세션 로드 (초기화 시에만 실행)
  useEffect(() => {
    const loadSessions = async () => {
      try {
        const loadedSessions = await ChatStorageIndexedDB.loadSessions()
        setSessions(loadedSessions)

        // 현재 세션이 없으면 새로 생성
        if (!currentSessionId && loadedSessions.length === 0) {
          const newSession = await ChatStorageIndexedDB.createNewSession()
          setCurrentSessionId(newSession.id)
          setSessions([newSession])
        } else if (!currentSessionId && loadedSessions.length > 0) {
          setCurrentSessionId(loadedSessions[0].id)
        }
      } catch (err) {
        console.error('Failed to load sessions:', err)
      }
    }

    void loadSessions()
  }, [])

  // 세션 관리 함수들
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

  const handleSelectSession = useCallback(async (sessionId: string) => {
    try {
      const session = await ChatStorageIndexedDB.loadSession(sessionId)
      if (session) {
        setCurrentSessionId(sessionId)
        // ✅ reduce 패턴으로 메시지 변환 (홀수 메시지 안전 처리)
        const convertedMessages = session.messages.reduce<ChatMessage[]>((acc, msg, idx, arr) => {
          // user-assistant 쌍만 변환
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
        setShowSidebar(false)
      }
    } catch (err) {
      console.error('Failed to load session:', err)
    }
  }, [])

  const handleDeleteSession = useCallback(async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await ChatStorageIndexedDB.deleteSession(sessionId)
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        await handleNewSession()
      }
    } catch (err) {
      console.error('Failed to delete session:', err)
    }
  }, [currentSessionId, handleNewSession])

  const handleToggleFavorite = useCallback(async (sessionId: string) => {
    try {
      await ChatStorageIndexedDB.toggleFavorite(sessionId)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId ? { ...s, isFavorite: !s.isFavorite } : s
        )
      )
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
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

      // 새 메시지 콜백 호출 (FloatingChatbot 알림용)
      if (onNewMessage) {
        onNewMessage()
      }

      setQuery('') // 입력 초기화
    } catch (err) {
      const errorResult = handleRAGError(err, 'RAGAssistant.handleSubmit')
      setError(errorResult.message)
    } finally {
      setIsLoading(false)
    }
  }, [query, method, currentSessionId, onNewMessage])

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

  return (
    <div className={cn('flex h-full', className)}>
      {/* 사이드바 */}
      {showSidebar && (
        <div className="w-64 border-r flex flex-col bg-muted/30">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">대화 기록</h3>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => setShowSidebar(false)}
              >
                <CloseIcon className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="default"
              className="w-full"
              onClick={() => void handleNewSession()}
            >
              <Plus className="h-4 w-4 mr-2" />
              새 대화
            </Button>
            <Button
              size="sm"
              variant={showFavoritesOnly ? 'default' : 'outline'}
              className="w-full"
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star className={cn('h-4 w-4 mr-2', showFavoritesOnly && 'fill-current')} />
              즐겨찾기
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {filteredSessions.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">
                {showFavoritesOnly ? '즐겨찾기한 대화가 없습니다' : '대화 기록이 없습니다'}
              </div>
            ) : (
              filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => void handleSelectSession(session.id)}
                  className={cn(
                    'group relative p-2 rounded cursor-pointer hover:bg-muted transition-colors',
                    currentSessionId === session.id && 'bg-muted'
                  )}
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {session.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(session.updatedAt).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <ChatHeaderMenu
                      isFavorite={session.isFavorite}
                      onToggleFavorite={() => {
                        void handleToggleFavorite(session.id)
                      }}
                      onRename={() => {
                        // TODO: 사이드바에서 이름 변경 기능 추가
                        console.log('Rename not implemented in sidebar')
                      }}
                      onMove={() => {
                        // TODO: 사이드바에서 프로젝트 이동 기능 추가
                        console.log('Move not implemented in sidebar')
                      }}
                      onDelete={() => {
                        const event = new MouseEvent('click', { bubbles: true, cancelable: true })
                        void handleDeleteSession(session.id, event as unknown as React.MouseEvent)
                      }}
                      className={cn(
                        'opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto'
                      )}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex flex-col h-full border-0 rounded-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setShowSidebar(!showSidebar)}
              >
                <Menu className="h-4 w-4" />
              </Button>
              {RAG_UI_CONFIG.titles.assistant}
              {method && (
                <Badge variant="outline" className="text-xs">
                  {method}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {RAG_UI_CONFIG.messages.welcomeSubtext}
            </p>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* 대화 내역 */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <p>질문을 입력해주세요.</p>
                  <p className="text-xs mt-2">
                    예: "t-test의 가정은 무엇인가요?"
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className="space-y-2">
                    {/* 사용자 질문 */}
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium">질문:</p>
                      <p className="text-sm mt-1">{msg.query}</p>
                    </div>

                    {/* AI 답변 */}
                    <div className="bg-primary/5 rounded-lg p-3">
                      <p className="text-sm font-medium mb-2">답변:</p>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                          remarkPlugins={[...MARKDOWN_CONFIG.remarkPlugins]}
                          rehypePlugins={[...MARKDOWN_CONFIG.rehypePlugins] as any}
                        >
                          {msg.response.answer}
                        </ReactMarkdown>
                      </div>

                      {/* 참조 문서 - ChatSourcesDisplay 컴포넌트로 통합 */}
                      {msg.response.sources && msg.response.sources.length > 0 && (
                        <ChatSourcesDisplay
                          sources={msg.response.sources}
                          defaultExpanded={false}
                          onExpandChange={(expanded) =>
                            setExpandedSources(expanded ? idx : null)
                          }
                        />
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* 로딩 중 */}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>생각 중...</span>
                </div>
              )}

              {/* 에러 메시지 */}
              {error && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-start gap-2 text-destructive text-sm">
                    <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">{error}</span>
                  </div>
                  {/* 모델 부재 시 설정 링크 표시 */}
                  {error.includes('not found') && (
                    <div className="flex gap-2 ml-6">
                      <a
                        href="/chatbot?tab=settings"
                        className="text-primary hover:underline text-xs font-medium"
                      >
                        → 설정에서 모델 선택
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 입력 영역 */}
            <div className="space-y-2">
              <Textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={RAG_UI_CONFIG.placeholders.query}
                rows={3}
                disabled={isLoading}
                className="resize-none w-full"
              />
              <Button
                onClick={() => void handleSubmit()}
                disabled={isLoading || !query.trim()}
                className="w-full"
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
