'use client'

/**
 * RAG Test Page
 *
 * Vector Store 기반 RAG 시스템 테스트 페이지
 * 1. 쿼리 테스트 (질문 → AI 응답)
 * 2. Vector Store 관리 (정보 조회, 빌드 안내)
 *
 * 이 페이지는 개발/테스트 전용이며, 프로덕션 빌드에서는 제외됩니다.
 */

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Loader2,
  RefreshCw,
  Database,
  Copy,
  Info,
  AlertCircle,
  XCircle
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { queryRAG, RAGService, getAvailableVectorStores } from '@/lib/rag/rag-service'
import type { RAGResponse, SearchMode, VectorStore } from '@/lib/rag/providers/base-provider'
import { ModelSettings } from '@/components/rag/model-settings'
import type { OllamaModel } from '@/components/rag/model-settings'

interface TestResult {
  query: string
  response: RAGResponse
  timestamp: number
}

interface OllamaModelInfo {
  models: OllamaModel[]
}

export default function RAGTestPage() {
  // ===== 쿼리 테스트 상태 =====
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<TestResult[]>([])

  // ===== Vector Store 상태 =====
  const [availableVectorStores, setAvailableVectorStores] = useState<VectorStore[]>([])
  const [selectedVectorStoreId, setSelectedVectorStoreId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rag-vector-store-id')
    }
    return null
  })

  // ===== 모델 선택 상태 =====
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rag-embedding-model') || 'mxbai-embed-large'
    }
    return 'mxbai-embed-large'
  })
  const [selectedInferenceModel, setSelectedInferenceModel] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rag-inference-model') || 'qwen3:4b'
    }
    return 'qwen3:4b'
  })

  // ===== 검색 모드 상태 =====
  const [searchMode, setSearchMode] = useState<SearchMode>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('rag-search-mode') as SearchMode) || 'hybrid'
    }
    return 'hybrid'
  })

  // ===== Vector Store 관리 상태 =====
  const [vectorStoreTab, setVectorStoreTab] = useState<'info' | 'build'>('info')
  const [buildEmbeddingModel, setBuildEmbeddingModel] = useState('')

  // ===== 안전한 탭 전환 핸들러 =====
  const handleVectorStoreTabChange = useCallback((value: string) => {
    if (value === 'info' || value === 'build') {
      setVectorStoreTab(value)
    }
  }, [])

  // ===== Ollama 모델 목록 조회 =====
  const fetchAvailableModels = useCallback(async () => {
    setIsLoadingModels(true)

    try {
      const response = await fetch('http://localhost:11434/api/tags')

      if (!response.ok) {
        throw new Error('Ollama 서버에 연결할 수 없습니다')
      }

      const data: OllamaModelInfo = await response.json()
      setAvailableModels(data.models || [])
    } catch (err) {
      console.error('모델 목록 조회 실패:', err)
      // Event 객체, Error 객체, 문자열 등 모든 경우 처리
      let errorMessage = 'Ollama 서버에 연결할 수 없습니다'

      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err && typeof err === 'object') {
        // Event 객체나 다른 객체인 경우
        errorMessage = 'Ollama 서버 연결 실패 (http://localhost:11434)'
      }

      setError(errorMessage)
    } finally {
      setIsLoadingModels(false)
    }
  }, [])

  // ===== Vector Store 목록 로드 =====
  const loadVectorStores = useCallback(async () => {
    try {
      const stores = await getAvailableVectorStores()
      setAvailableVectorStores(stores)

      // 저장된 Vector Store가 없으면 첫 번째 선택
      if (!selectedVectorStoreId && stores.length > 0) {
        const firstStoreId = stores[0].id
        setSelectedVectorStoreId(firstStoreId)
        setSelectedEmbeddingModel(stores[0].embeddingModel)
      }
    } catch (err) {
      console.error('Vector Store 목록 조회 실패:', err)
      // Event 객체, Error 객체, 문자열 등 모든 경우 처리
      let errorMessage = 'Vector Store 목록을 불러올 수 없습니다'

      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err && typeof err === 'object') {
        // Event 객체나 다른 객체인 경우
        errorMessage = 'Vector Store 파일 로드 실패 (vector-stores.json 확인 필요)'
      }

      // 에러를 사용자에게 표시하지 않고 빈 배열로 처리 (선택적)
      setAvailableVectorStores([])
    }
  }, [selectedVectorStoreId])

  // ===== Vector Store 선택 핸들러 =====
  const handleVectorStoreSelect = useCallback((storeId: string) => {
    setSelectedVectorStoreId(storeId)

    // 선택된 store의 임베딩 모델로 자동 설정
    const selectedStore = availableVectorStores.find((s) => s.id === storeId)
    if (selectedStore) {
      setSelectedEmbeddingModel(selectedStore.embeddingModel)
    }

    // localStorage에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem('rag-vector-store-id', storeId)
    }
  }, [availableVectorStores])

  // ===== 컴포넌트 마운트 시 초기화 =====
  useEffect(() => {
    void fetchAvailableModels()
    void loadVectorStores()
  }, [fetchAvailableModels, loadVectorStores])

  // ===== 모델 선택 변경 시 로컬스토리지 저장 =====
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rag-embedding-model', selectedEmbeddingModel)
    }
  }, [selectedEmbeddingModel])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rag-inference-model', selectedInferenceModel)
    }
  }, [selectedInferenceModel])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rag-search-mode', searchMode)
    }
  }, [searchMode])

  // ===== 쿼리 실행 =====
  const handleQuery = useCallback(async () => {
    if (!query.trim()) {
      setError('질문을 입력하세요')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // RAG 서비스 초기화
      const ragService = RAGService.getInstance()
      await ragService.initialize({
        vectorStoreId: selectedVectorStoreId || undefined,
        embeddingModel: selectedEmbeddingModel,
        inferenceModel: selectedInferenceModel
      })

      // 쿼리 실행
      const response = await queryRAG({
        query: query.trim(),
        searchMode
      })

      // 결과 저장
      setResults((prev) => [
        {
          query: query.trim(),
          response,
          timestamp: Date.now()
        },
        ...prev
      ])

      setQuery('') // 입력 초기화
    } catch (err) {
      console.error('RAG 쿼리 실행 실패:', err)
      // Event 객체, Error 객체, 문자열 등 모든 경우 처리
      let errorMessage = '쿼리 실행 중 오류가 발생했습니다'

      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      } else if (err && typeof err === 'object') {
        // Event 객체나 다른 객체인 경우
        errorMessage = 'RAG 시스템 오류 (Vector Store 또는 Ollama 서버 확인 필요)'
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [query, selectedVectorStoreId, selectedEmbeddingModel, selectedInferenceModel, searchMode])

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">RAG 시스템 테스트</h1>
        <p className="text-muted-foreground mt-2">
          Vector Store 기반 검색 및 AI 응답 테스트
        </p>
      </div>

      <Tabs defaultValue="query" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="query">
            <Database className="mr-2 h-4 w-4" />
            테스트 쿼리
          </TabsTrigger>
          <TabsTrigger value="vector-store">
            <Info className="mr-2 h-4 w-4" />
            Vector Store 관리
          </TabsTrigger>
        </TabsList>

        {/* ==================== 테스트 쿼리 탭 ==================== */}
        <TabsContent value="query" className="space-y-4">
          {/* 모델 설정 */}
          <ModelSettings
            availableVectorStores={availableVectorStores}
            selectedVectorStoreId={selectedVectorStoreId}
            onVectorStoreSelect={handleVectorStoreSelect}
            availableModels={availableModels}
            isLoadingModels={isLoadingModels}
            onRefreshModels={fetchAvailableModels}
            selectedEmbeddingModel={selectedEmbeddingModel}
            onEmbeddingModelChange={setSelectedEmbeddingModel}
            selectedInferenceModel={selectedInferenceModel}
            onInferenceModelChange={setSelectedInferenceModel}
            searchMode={searchMode}
            onSearchModeChange={(mode) => setSearchMode(mode)}
            disabled={isLoading}
          />

          {/* 쿼리 입력 */}
          <Card>
            <CardHeader>
              <CardTitle>테스트 쿼리</CardTitle>
              <CardDescription>통계 분석 질문을 입력하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="query">질문</Label>
                <Textarea
                  id="query"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="예: t-test와 ANOVA의 차이점은 무엇인가요?"
                  rows={4}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  💡 선택한 검색 모드로 관련 문서를 찾아 AI가 답변합니다.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <Button onClick={handleQuery} disabled={isLoading || !query.trim()}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    쿼리 실행
                  </>
                )}
              </Button>
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
                      <div className="space-y-1">
                        <p className="font-medium">{result.query}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="default">Ollama (Local)</Badge>
                          <span>•</span>
                          <span>{new Date(result.timestamp).toLocaleString('ko-KR')}</span>
                        </div>
                      </div>

                      {/* 응답 */}
                      <div className="space-y-2">
                        <Label className="text-base font-semibold">응답</Label>
                        <div className="prose prose-sm max-w-none dark:prose-invert bg-muted/30 p-4 rounded-lg">
                          <div className="whitespace-pre-wrap">{result.response.answer}</div>
                        </div>
                      </div>

                      {/* 참조 문서 */}
                      {result.response.sources && result.response.sources.length > 0 && (
                        <div className="space-y-2">
                          <Label className="text-base font-semibold">
                            참조 문서 ({result.response.sources.length}개)
                          </Label>
                          <div className="space-y-2">
                            {result.response.sources.map((source, idx) => (
                              <div key={idx} className="border rounded p-3 space-y-1 text-sm">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium">{source.title}</p>
                                  {source.score && (
                                    <Badge variant="outline" className="text-xs">
                                      Score: {source.score.toFixed(3)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground line-clamp-2">{source.content}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 메타데이터 */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                        <span>Provider: {result.response.model.provider}</span>
                        {result.response.model.embedding && (
                          <span>Embedding: {result.response.model.embedding}</span>
                        )}
                        {result.response.model.inference && (
                          <span>LLM: {result.response.model.inference}</span>
                        )}
                        {result.response.metadata?.responseTime && (
                          <span>Time: {result.response.metadata.responseTime}ms</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Vector Store 관리 탭 ==================== */}
        <TabsContent value="vector-store">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Vector Store 관리
              </CardTitle>
              <CardDescription>
                사전 생성된 임베딩 벡터 DB (읽기 전용)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={vectorStoreTab} onValueChange={handleVectorStoreTabChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="info">
                    <Info className="mr-2 h-4 w-4" />
                    정보
                  </TabsTrigger>
                  <TabsTrigger value="build">
                    <Database className="mr-2 h-4 w-4" />
                    빌드
                  </TabsTrigger>
                </TabsList>

                {/* ========== 정보 탭 ========== */}
                <TabsContent value="info" className="space-y-4">
                  {selectedVectorStoreId && availableVectorStores.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertTitle>현재 Vector Store</AlertTitle>
                      <AlertDescription className="mt-2 space-y-1">
                        {(() => {
                          const selectedStore = availableVectorStores.find((s) => s.id === selectedVectorStoreId)
                          if (!selectedStore) return null
                          return (
                            <>
                              <div>• <strong>이름:</strong> {selectedStore.name}</div>
                              <div>
                                • <strong>임베딩 모델:</strong>{' '}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {selectedStore.embeddingModel}
                                </code>
                              </div>
                              <div>• <strong>문서 수:</strong> {selectedStore.docCount}개</div>
                              <div>• <strong>임베딩 차원:</strong> {selectedStore.dimensions}</div>
                              <div>• <strong>DB 크기:</strong> {selectedStore.fileSize}</div>
                              <div>
                                • <strong>경로:</strong>{' '}
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {selectedStore.dbPath}
                                </code>
                              </div>
                            </>
                          )
                        })()}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Alert variant="default" className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-200">
                      Vector Store란?
                    </AlertTitle>
                    <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2 space-y-2">
                      <p>특정 임베딩 모델로 사전 생성된 벡터 데이터베이스입니다.</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>111개 통계 함수 문서가 포함됨 (SciPy, NumPy, statsmodels, pingouin)</li>
                        <li>임베딩이 미리 생성되어 검색 속도가 22배 빠름 (~50ms)</li>
                        <li>읽기 전용: 문서 수정은 Python 스크립트로만 가능</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                </TabsContent>

                {/* ========== 빌드 탭 ========== */}
                <TabsContent value="build" className="space-y-4">
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertTitle>Vector Store 빌드</AlertTitle>
                    <AlertDescription>
                      새로운 임베딩 모델로 Vector Store를 생성합니다.
                      다양한 모델로 테스트하여 최적의 검색 성능을 찾을 수 있습니다.
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label htmlFor="build-embedding-model">임베딩 모델 선택 *</Label>
                    <Select value={buildEmbeddingModel} onValueChange={setBuildEmbeddingModel}>
                      <SelectTrigger id="build-embedding-model">
                        <SelectValue placeholder="임베딩 모델을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableModels
                          .filter((m) =>
                            m.name.toLowerCase().includes('embed') ||
                            m.name.toLowerCase().includes('embedding')
                          )
                          .map((m) => (
                            <SelectItem key={m.name} value={m.name}>
                              {m.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      💡 임베딩 전용 모델을 선택하세요 (예: mxbai-embed-large, qwen3-embedding)
                    </p>
                  </div>

                  <Alert variant="default" className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-800 dark:text-blue-200">
                      빌드 방법
                    </AlertTitle>
                    <AlertDescription className="text-blue-800 dark:text-blue-200 mt-2 space-y-2">
                      <p>터미널에서 다음 명령어를 실행하세요:</p>
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto mt-2">
{`cd statistical-platform/rag-system
python scripts/build_sqlite_db.py --model ${buildEmbeddingModel || '<embedding-model>'}`}
                      </pre>
                      <p className="mt-2 text-xs">
                        빌드가 완료되면 자동으로 <code>public/rag-data/</code>에 새 DB 파일이 생성됩니다.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (!buildEmbeddingModel) {
                          alert('임베딩 모델을 선택하세요')
                          return
                        }
                        const command = `cd statistical-platform/rag-system\npython scripts/build_sqlite_db.py --model ${buildEmbeddingModel}`
                        navigator.clipboard.writeText(command)
                        alert('명령어가 클립보드에 복사되었습니다!')
                      }}
                      disabled={!buildEmbeddingModel}
                      variant="outline"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      명령어 복사
                    </Button>

                    <Button
                      onClick={() => {
                        void loadVectorStores()
                        alert('Vector Store 목록을 새로고침했습니다')
                      }}
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      목록 새로고침
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
