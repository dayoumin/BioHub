/**
 * RAG Assistant 컴포넌트
 *
 * 통계 페이지에 통합되는 사이드바 형태의 RAG 도우미
 * - 질문 입력 및 답변 표시
 * - 참조 문서 목록
 * - 현재 통계 메서드 컨텍스트 자동 전달
 */

'use client'

import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Loader2, XCircle, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { queryRAG } from '@/lib/rag/rag-service'
import type { RAGResponse } from '@/lib/rag/providers/base-provider'

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

  // 질문 전송
  const handleSubmit = useCallback(async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await queryRAG({
        query: query.trim(),
        method
      })

      setMessages((prev) => [
        ...prev,
        {
          query: query.trim(),
          response,
          timestamp: Date.now()
        }
      ])

      setQuery('') // 입력 초기화
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsLoading(false)
    }
  }, [query, method])

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

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
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
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
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
              <div className="flex items-center gap-2 text-destructive text-sm">
                <XCircle className="h-4 w-4" />
                <span>{error}</span>
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
  )
}
