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
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, XCircle, Send, ChevronDown, ChevronUp, Star, Trash2, Plus, Menu, X as CloseIcon, MoreVertical, Pin } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { queryRAG } from '@/lib/rag/rag-service'
import type { RAGResponse } from '@/lib/rag/providers/base-provider'
import { ChatStorage } from '@/lib/services/chat-storage'
import type { ChatSession } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

interface RAGAssistantProps {
  /** 현재 통계 메서드 (예: 'tTest', 'anova') */
  method?: string
  /** 사이드바 클래스 (선택) */
  className?: string
}

interface ChatMessage {
  query: string
  response: RAGResponse
  timestamp: number
}

export function RAGAssistant({ method, className = '' }: RAGAssistantProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [expandedSources, setExpandedSources] = useState<number | null>(null)
  const [showSidebar, setShowSidebar] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // 세션 로드
  useEffect(() => {
    const loadedSessions = ChatStorage.loadSessions()
    setSessions(loadedSessions)

    // 현재 세션이 없으면 새로 생성
    if (!currentSessionId && loadedSessions.length === 0) {
      const newSession = ChatStorage.createNewSession()
      setCurrentSessionId(newSession.id)
      setSessions([newSession])
    } else if (!currentSessionId && loadedSessions.length > 0) {
      setCurrentSessionId(loadedSessions[0].id)
    }
  }, [currentSessionId])

  // 세션 관리 함수들
  const handleNewSession = useCallback(() => {
    const newSession = ChatStorage.createNewSession()
    setCurrentSessionId(newSession.id)
    setSessions((prev) => [newSession, ...prev])
    setMessages([])
  }, [])

  const handleSelectSession = useCallback((sessionId: string) => {
    const session = ChatStorage.loadSession(sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
      // ChatMessage 형식으로 변환
      const convertedMessages: ChatMessage[] = []
      for (let i = 0; i < session.messages.length; i += 2) {
        const userMsg = session.messages[i]
        const assistantMsg = session.messages[i + 1]
        if (userMsg && assistantMsg && userMsg.role === 'user') {
          // ✅ assistantMsg에서 sources와 model 메타데이터 복원
          convertedMessages.push({
            query: userMsg.content,
            response: {
              answer: assistantMsg.content,
              sources: assistantMsg.sources || [],
              model: assistantMsg.model || { provider: 'unknown' },
            },
            timestamp: userMsg.timestamp
          })
        }
      }
      setMessages(convertedMessages)
      setShowSidebar(false)
    }
  }, [])

  const handleDeleteSession = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    ChatStorage.deleteSession(sessionId)
    setSessions((prev) => prev.filter((s) => s.id !== sessionId))
    if (currentSessionId === sessionId) {
      handleNewSession()
    }
  }, [currentSessionId, handleNewSession])

  const handleToggleFavorite = useCallback((sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    ChatStorage.toggleFavorite(sessionId)
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, isFavorite: !s.isFavorite } : s
      )
    )
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

      // ChatStorage에 저장
      ChatStorage.addMessage(currentSessionId, {
        id: `${Date.now()}-user`,
        role: 'user',
        content: query.trim(),
        timestamp: Date.now()
      })

      ChatStorage.addMessage(currentSessionId, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: response.answer,
        timestamp: Date.now()
      })

      // 세션 목록 업데이트
      setSessions(ChatStorage.loadSessions())

      setQuery('') // 입력 초기화
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsLoading(false)
    }
  }, [query, method, currentSessionId])

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
              onClick={handleNewSession}
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
                  onClick={() => handleSelectSession(session.id)}
                  className={cn(
                    'group relative p-2 rounded cursor-pointer hover:bg-muted transition-colors',
                    currentSessionId === session.id && 'bg-muted'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate max-w-[160px]">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="옵션"
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(session.id, e as unknown as React.MouseEvent)
                          }}
                        >
                          <Pin className="h-4 w-4 mr-2" />
                          {session.isFavorite ? '고정 해제' : '고정'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSession(session.id, e as unknown as React.MouseEvent)
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
              💬 RAG 도우미
              {method && (
                <Badge variant="outline" className="text-xs">
                  {method}
                </Badge>
              )}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              통계 분석에 대해 궁금한 점을 물어보세요
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
                        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.response.answer}
                      </ReactMarkdown>
                    </div>

                    {/* 참조 문서 */}
                    {msg.response.sources && msg.response.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <button
                          onClick={() =>
                            setExpandedSources(expandedSources === idx ? null : idx)
                          }
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <span>참조 문서 ({msg.response.sources.length}개)</span>
                          {expandedSources === idx ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        {expandedSources === idx && (
                          <div className="mt-2 space-y-1">
                            {msg.response.sources.map((source, sourceIdx) => (
                              <div
                                key={sourceIdx}
                                className="text-xs bg-muted/50 rounded p-2"
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
              placeholder="질문을 입력하세요... (Shift+Enter: 줄바꿈)"
              rows={3}
              disabled={isLoading}
              className="resize-none"
            />
            <Button
              onClick={handleSubmit}
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
