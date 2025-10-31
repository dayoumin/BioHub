'use client'

/**
 * RAG 시스템 테스트 페이지
 *
 * 목적:
 * 1. Claude vs 로컬 RAG 성능 비교
 * 2. 검색 정확도 테스트
 * 3. 응답 품질 평가
 *
 * 이 페이지는 개발/테스트 전용이며, 프로덕션 빌드에서는 제외됩니다.
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { queryRAG, RAGService } from '@/lib/rag/rag-service'
import type { RAGProviderType } from '@/lib/rag/rag-service'
import type { RAGResponse } from '@/lib/rag/providers/base-provider'

interface TestResult {
  query: string
  provider: RAGProviderType
  response: RAGResponse
  timestamp: number
}

export default function RAGTestPage() {
  const [query, setQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<RAGProviderType>('claude')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<TestResult[]>([])

  // RAG 쿼리 실행
  const handleQuery = useCallback(async () => {
    if (!query.trim()) {
      setError('질문을 입력하세요')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Provider 전환 (필요 시)
      const ragService = RAGService.getInstance()
      const currentProvider = ragService.getProviderType()

      if (currentProvider !== selectedProvider) {
        await ragService.switchProvider(selectedProvider)
      }

      // 쿼리 실행
      const response = await queryRAG({
        query: query.trim(),
        method: selectedMethod || undefined
      })

      // 결과 저장
      setResults((prev) => [
        {
          query: query.trim(),
          provider: selectedProvider,
          response,
          timestamp: Date.now()
        },
        ...prev
      ])

      setQuery('') // 입력 초기화
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsLoading(false)
    }
  }, [query, selectedMethod, selectedProvider])

  // A/B 테스트 (두 Provider 동시 실행)
  const handleABTest = useCallback(async () => {
    if (!query.trim()) {
      setError('질문을 입력하세요')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const ragService = RAGService.getInstance()

      // Claude 테스트
      await ragService.switchProvider('claude')
      const claudeResponse = await queryRAG({
        query: query.trim(),
        method: selectedMethod || undefined
      })

      // 로컬 RAG 테스트
      await ragService.switchProvider('local')
      const localResponse = await queryRAG({
        query: query.trim(),
        method: selectedMethod || undefined
      })

      // 결과 저장 (최신이 위)
      setResults((prev) => [
        {
          query: query.trim(),
          provider: 'local',
          response: localResponse,
          timestamp: Date.now()
        },
        {
          query: query.trim(),
          provider: 'claude',
          response: claudeResponse,
          timestamp: Date.now() - 1 // Claude를 먼저 표시
        },
        ...prev
      ])

      setQuery('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsLoading(false)
    }
  }, [query, selectedMethod])

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">RAG 시스템 테스트</h1>
        <p className="text-muted-foreground">
          Claude API와 로컬 RAG 시스템의 성능을 비교하고 테스트합니다.
        </p>
        <Badge variant="outline" className="mt-2">
          개발/테스트 전용 페이지
        </Badge>
      </div>

      {/* 테스트 입력 */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>테스트 쿼리</CardTitle>
          <CardDescription>통계 분석 질문을 입력하세요</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 질문 입력 */}
          <div className="space-y-2">
            <Label htmlFor="query">질문</Label>
            <Textarea
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: t-test와 ANOVA의 차이점은 무엇인가요?"
              rows={3}
              disabled={isLoading}
            />
          </div>

          {/* 메서드 선택 (선택사항) */}
          <div className="space-y-2">
            <Label htmlFor="method">통계 메서드 (선택)</Label>
            <input
              id="method"
              type="text"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              placeholder="예: tTest, linearRegression"
              className="w-full px-3 py-2 border rounded-md"
              disabled={isLoading}
            />
          </div>

          {/* Provider 선택 */}
          <div className="space-y-2">
            <Label>Provider 선택</Label>
            <RadioGroup
              value={selectedProvider}
              onValueChange={(value) => setSelectedProvider(value as RAGProviderType)}
              disabled={isLoading}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="claude" id="provider-claude" />
                <Label htmlFor="provider-claude">Claude API (현재)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="local" id="provider-local" />
                <Label htmlFor="provider-local">로컬 RAG (Week 2 이후)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex gap-2">
            <Button onClick={handleQuery} disabled={isLoading || !query.trim()}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '쿼리 실행'
              )}
            </Button>

            <Button
              onClick={handleABTest}
              disabled={isLoading || !query.trim()}
              variant="outline"
            >
              A/B 테스트 (두 Provider 동시)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 테스트 결과 */}
      <Card>
        <CardHeader>
          <CardTitle>테스트 결과 ({results.length}개)</CardTitle>
          <CardDescription>최신 결과가 위에 표시됩니다</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              아직 테스트 결과가 없습니다. 위에서 질문을 입력하고 "쿼리 실행"을 눌러주세요.
            </p>
          ) : (
            <div className="space-y-4">
              {results.map((result, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  {/* 쿼리 정보 */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{result.query}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant={result.provider === 'claude' ? 'default' : 'secondary'}>
                          {result.provider === 'claude' ? 'Claude API' : '로컬 RAG'}
                        </Badge>
                        <span>•</span>
                        <span>{new Date(result.timestamp).toLocaleString('ko-KR')}</span>
                      </div>
                    </div>
                  </div>

                  {/* 응답 */}
                  <Tabs defaultValue="answer" className="w-full">
                    <TabsList>
                      <TabsTrigger value="answer">응답</TabsTrigger>
                      <TabsTrigger value="sources">참조 문서</TabsTrigger>
                      <TabsTrigger value="metadata">메타데이터</TabsTrigger>
                    </TabsList>

                    <TabsContent value="answer" className="space-y-2">
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap">{result.response.answer}</p>
                      </div>
                    </TabsContent>

                    <TabsContent value="sources" className="space-y-2">
                      {result.response.sources && result.response.sources.length > 0 ? (
                        <div className="space-y-2">
                          {result.response.sources.map((source, idx) => (
                            <div key={idx} className="border rounded p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm">{source.title}</p>
                                <Badge variant="outline">Score: {source.score.toFixed(3)}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-3">
                                {source.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">참조 문서 없음</p>
                      )}
                    </TabsContent>

                    <TabsContent value="metadata" className="space-y-2">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Provider</p>
                          <p className="font-medium">{result.response.model.provider}</p>
                        </div>
                        {result.response.model.embedding && (
                          <div>
                            <p className="text-muted-foreground">Embedding Model</p>
                            <p className="font-medium">{result.response.model.embedding}</p>
                          </div>
                        )}
                        {result.response.model.inference && (
                          <div>
                            <p className="text-muted-foreground">Inference Model</p>
                            <p className="font-medium">{result.response.model.inference}</p>
                          </div>
                        )}
                        {result.response.metadata?.tokensUsed && (
                          <div>
                            <p className="text-muted-foreground">Tokens Used</p>
                            <p className="font-medium">{result.response.metadata.tokensUsed}</p>
                          </div>
                        )}
                        {result.response.metadata?.responseTime && (
                          <div>
                            <p className="text-muted-foreground">Response Time</p>
                            <p className="font-medium">
                              {result.response.metadata.responseTime}ms
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
