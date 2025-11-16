/**
 * RAG Assistant Compact 컴포넌트
 *
 * 우측 패널에 최적화된 간소화 버전
 * - 대화 기록 사이드바 제거
 * - 헤더 간소화
 * - 컴팩트한 UI
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import 'katex/dist/katex.min.css'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, XCircle, Send, Plus, Star } from 'lucide-react'
import { queryRAGStream } from '@/lib/rag/rag-service'
import { MARKDOWN_CONFIG, RAG_UI_CONFIG } from '@/lib/rag/config'
import { handleRAGError } from '@/lib/rag/utils/error-handler'
import { ChatStorageIndexedDB } from '@/lib/services/storage/chat-storage-indexed-db'
import { ChatSourcesDisplay } from './chat-sources-display'
import { SessionHistoryDropdown } from './session-history-dropdown'
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
}

interface ChatMessage {
  query: string
  response: RAGResponse
  timestamp: number
}

export function RAGAssistantCompact({ method, className = '' }: RAGAssistantCompactProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const [showSetupDialog, setShowSetupDialog] = useState(false)

  // 스트리밍 상태
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [streamingSources, setStreamingSources] = useState<Array<{ title: string; content: string; score: number }> | null>(null)
  const [loadingPhase, setLoadingPhase] = useState<'searching' | 'thinking' | 'writing' | null>(null)
  const streamingMessageRef = useRef<string>('') // 최신 스트리밍 메시지 추적
  const streamingSourcesRef = useRef<Array<{ title: string; content: string; score: number }> | null>(null) // 최신 참조 문서 추적
  const currentQueryRef = useRef<string>('') // 현재 질문 추적
  const messagesContainerRef = useRef<HTMLDivElement>(null) // 대화 컨테이너 ref
  const userScrolledRef = useRef(false) // 사용자가 수동 스크롤했는지 추적

  // 자동 스크롤 (대화 영역 내부만, 사용자가 바닥 근처일 때만)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    // 사용자가 바닥에서 100px 이내인지 확인
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100

    // 새 메시지 추가 시 또는 바닥 근처에서 스트리밍 중일 때만 자동 스크롤
    if (isNearBottom || !userScrolledRef.current) {
      container.scrollTop = container.scrollHeight
      userScrolledRef.current = false
    }
  }, [messages, streamingMessage])

  // 사용자 수동 스크롤 감지
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 10
    userScrolledRef.current = !isAtBottom
  }, [])

  // Ollama 상태 체크
  useEffect(() => {
    const checkOllama = async () => {
      const status = await checkOllamaStatus()
      setOllamaStatus(status)

      // Ollama가 사용 불가능하거나 모델이 없으면 설치 안내 표시
      if (!status.isAvailable || !status.hasEmbeddingModel || !status.hasInferenceModel) {
        setShowSetupDialog(true)
      }
    }

    void checkOllama()
  }, [])

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

  // 질문 전송 (스트리밍 방식)
  const handleSubmit = useCallback(async () => {
    if (!query.trim() || !currentSessionId) return

    const userQuery = query.trim()
    currentQueryRef.current = userQuery // 질문 저장
    setQuery('') // 입력 즉시 초기화
    setIsLoading(true)
    setError(null)
    setStreamingMessage('')
    setStreamingSources(null)
    setLoadingPhase('searching') // Phase 1: 문서 검색 중
    streamingMessageRef.current = '' // ref 초기화
    streamingSourcesRef.current = null

    try {
      // 스트리밍 응답 생성
      const metadata = await queryRAGStream(
        {
          query: userQuery,
          method
        },
        // onChunk: 텍스트 조각 수신
        (chunk: string) => {
          // 첫 번째 청크 수신 시 Phase 3로 전환
          if (streamingMessageRef.current === '') {
            setLoadingPhase('writing')
          }
          streamingMessageRef.current += chunk
          setStreamingMessage(streamingMessageRef.current)
        },
        // onSources: 참조 문서 수신 (검색 완료 시 1회)
        (sources) => {
          setLoadingPhase('thinking') // Phase 2: 답변 생성 중
          streamingSourcesRef.current = sources
          setStreamingSources(sources)
        }
      )

      // 스트리밍 완료 - ref에서 최신 값 가져오기
      const fullAnswer = streamingMessageRef.current
      const finalSources = streamingSourcesRef.current || []

      // <cited_docs> 태그 제거 (저장용)
      const cleanAnswer = fullAnswer.replace(/<cited_docs>[\s\S]*?<\/cited_docs>/gi, '')

      const newMessage: ChatMessage = {
        query: userQuery,
        response: {
          answer: cleanAnswer,
          sources: finalSources,
          citedDocIds: metadata.citedDocIds,
          model: metadata.model,
          metadata: metadata.metadata
        },
        timestamp: Date.now()
      }

      setMessages((prev) => [...prev, newMessage])

      // ChatStorageIndexedDB에 저장
      await ChatStorageIndexedDB.addMessage(currentSessionId, {
        id: `${Date.now()}-user`,
        role: 'user',
        content: userQuery,
        timestamp: Date.now()
      })

      await ChatStorageIndexedDB.addMessage(currentSessionId, {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: cleanAnswer,
        timestamp: Date.now(),
        sources: finalSources.length > 0 ? finalSources : undefined,
        model: metadata.model
      })

      // 세션 목록 업데이트
      const updatedSessions = await ChatStorageIndexedDB.loadSessions()
      setSessions(updatedSessions)

      // 스트리밍 상태 초기화
      setStreamingMessage('')
      setStreamingSources(null)
      setLoadingPhase(null)
      streamingMessageRef.current = ''
      streamingSourcesRef.current = null
      currentQueryRef.current = ''
    } catch (err) {
      const errorResult = handleRAGError(err, 'RAGAssistantCompact.handleSubmit')
      setError(errorResult.message)
      // 스트리밍 상태 초기화
      setStreamingMessage('')
      setStreamingSources(null)
      setLoadingPhase(null)
      streamingMessageRef.current = ''
      streamingSourcesRef.current = null
      currentQueryRef.current = ''
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

  // 즐겨찾기 토글
  const handleToggleFavorite = useCallback(async () => {
    if (!currentSessionId) return

    try {
      await ChatStorageIndexedDB.toggleFavorite(currentSessionId)
      // 세션 목록 업데이트
      const updatedSessions = await ChatStorageIndexedDB.loadSessions()
      setSessions(updatedSessions)
    } catch (err) {
      console.error('Failed to toggle favorite:', err)
    }
  }, [currentSessionId])

  // Ollama 재시도 핸들러
  const handleRetryOllama = useCallback(async () => {
    const status = await checkOllamaStatus()
    setOllamaStatus(status)

    if (status.isAvailable && status.hasEmbeddingModel && status.hasInferenceModel) {
      setShowSetupDialog(false)
    } else {
      setError('Ollama 연결 실패: ' + (status.error || '모델이 설치되지 않았습니다'))
    }
  }, [])

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Ollama 설치 안내 다이얼로그 */}
      <OllamaSetupDialog open={showSetupDialog} onOpenChange={setShowSetupDialog} onRetry={handleRetryOllama} />

      {/* 상단 세션 헤더 (최신 UI 패턴) */}
      <div className="h-12 flex-shrink-0 border-b bg-muted/30">
        <div className="h-full flex items-center gap-2 px-3">
          {/* 좌측 버튼 그룹 */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* 새 대화 버튼 */}
            <Button
              size="icon"
              variant="outline"
              onClick={() => void handleNewSession()}
              className="bg-background hover:bg-muted h-8 w-8"
              title="새 대화"
            >
              <Plus className="h-4 w-4" />
            </Button>

            {/* 채팅 히스토리 버튼 */}
            <SessionHistoryDropdown
              sessions={sessions}
              currentSessionId={currentSessionId}
              onSelectSession={handleSelectSession}
            />
          </div>

          {/* 중앙: 최근 3개 세션 탭 */}
          <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
            {sessions.slice(0, 3).map((session) => (
              <button
                key={session.id}
                onClick={() => void handleSelectSession(session.id)}
                className={cn(
                  "px-3 py-1 text-xs rounded-md transition-colors whitespace-nowrap truncate max-w-[120px]",
                  session.id === currentSessionId
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
                title={session.title}
              >
                {session.title}
              </button>
            ))}
          </div>

          {/* 우측: 현재 세션 즐겨찾기 토글 */}
          {currentSession && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => void handleToggleFavorite()}
              className="h-8 w-8 flex-shrink-0"
              title={currentSession.isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
            >
              <Star
                className={cn(
                  "h-4 w-4 transition-colors",
                  currentSession.isFavorite
                    ? "fill-yellow-500 text-yellow-500"
                    : "text-muted-foreground hover:text-foreground"
                )}
              />
            </Button>
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
          <div
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 space-y-4"
          >
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-3">
                {/* 사용자 질문 - 우측 정렬 (ChatGPT 스타일) */}
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm">
                    <p className="text-sm leading-relaxed">{msg.query}</p>
                  </div>
                </div>

                {/* AI 답변 - 좌측 정렬 */}
                <div className="flex justify-start">
                  <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] shadow-sm">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[...MARKDOWN_CONFIG.remarkPlugins]}
                        rehypePlugins={[...MARKDOWN_CONFIG.rehypePlugins] as any}
                      >
                        {msg.response.answer.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<cited_docs>[\s\S]*?<\/cited_docs>/gi, '')}
                      </ReactMarkdown>
                    </div>

                    {/* 참조 문서 (Perplexity 스타일: LLM 사용 문서만 표시) */}
                    {msg.response.sources && (() => {
                      // citedDocIds가 있으면 해당 인덱스의 문서만, 없으면 score > 0.5 필터링
                      const citedDocIds = msg.response.citedDocIds
                      const filteredSources = citedDocIds && citedDocIds.length > 0
                        ? msg.response.sources.filter((_, idx) => citedDocIds.includes(idx))
                        : msg.response.sources.filter(s => (s as any).score > 0.5)

                      return filteredSources.length > 0 ? (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          <ChatSourcesDisplay
                            sources={filteredSources}
                            defaultExpanded={false}
                          />
                        </div>
                      ) : null
                    })()}
                  </div>
                </div>
              </div>
            ))}

            {/* 스트리밍 중인 메시지 */}
            {isLoading && streamingMessage && (
              <div className="space-y-3">
                {/* 사용자 질문 표시 (ref에서 가져옴) */}
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm">
                    <p className="text-sm leading-relaxed">{currentQueryRef.current}</p>
                  </div>
                </div>

                {/* AI 스트리밍 답변 */}
                <div className="flex justify-start">
                  <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] shadow-sm">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[...MARKDOWN_CONFIG.remarkPlugins]}
                        rehypePlugins={[...MARKDOWN_CONFIG.rehypePlugins] as any}
                      >
                        {streamingMessage.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/<cited_docs>[\s\S]*?<\/cited_docs>/gi, '')}
                      </ReactMarkdown>
                      {/* 타이핑 커서 */}
                      <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1" />
                    </div>

                    {/* 참조 문서 (검색 완료 시 표시) */}
                    {streamingSources && streamingSources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <ChatSourcesDisplay
                          sources={streamingSources.filter(s => s.score > 0.5)}
                          defaultExpanded={false}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 로딩 중 (스트리밍 시작 전) - Phase별 애니메이션 */}
            {isLoading && !streamingMessage && (
              <div className="space-y-3">
                {/* 사용자 질문 표시 */}
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] shadow-sm">
                    <p className="text-sm leading-relaxed">{currentQueryRef.current}</p>
                  </div>
                </div>

                {/* AI 답변 말풍선 (로딩 애니메이션 포함) */}
                <div className="flex justify-start">
                  <div className="bg-muted/70 rounded-2xl rounded-tl-sm px-4 py-3 max-w-[90%] shadow-sm">
                    {/* Phase별 로딩 메시지 */}
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div className="flex flex-col gap-1">
                        {loadingPhase === 'searching' && (
                          <span className="text-sm text-muted-foreground animate-pulse">
                            📚 관련 문서를 검색하고 있습니다...
                          </span>
                        )}
                        {loadingPhase === 'thinking' && (
                          <span className="text-sm text-muted-foreground animate-pulse">
                            🤔 답변을 생성하고 있습니다...
                          </span>
                        )}
                        {loadingPhase === null && (
                          <span className="text-sm text-muted-foreground animate-pulse">
                            ⏳ 준비 중...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
