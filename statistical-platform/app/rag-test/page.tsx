'use client'

/**
 * RAG 시스템 테스트 페이지 (Ollama 전용)
 *
 * 목적:
 * 1. Ollama 로컬 RAG 검색 정확도 테스트
 * 2. 응답 품질 평가
 * 3. DB 관리 (추가/수정/삭제/재구축)
 * 4. 모델 선택 (임베딩/추론 모델)
 *
 * 이 페이지는 개발/테스트 전용이며, 프로덕션 빌드에서는 제외됩니다.
 */

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  XCircle,
  RefreshCw,
  Database,
  Settings,
  FileText,
  Edit,
  Trash2,
  Plus
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { queryRAG, rebuildRAGDatabase, RAGService } from '@/lib/rag/rag-service'
import type { RAGResponse, DocumentInput } from '@/lib/rag/providers/base-provider'

interface TestResult {
  query: string
  response: RAGResponse
  timestamp: number
}

interface OllamaModel {
  name: string
  size?: number
  modified_at?: string
}

interface OllamaModelInfo {
  models: OllamaModel[]
}

export default function RAGTestPage() {
  // 쿼리 테스트 상태
  const [query, setQuery] = useState('')
  const [selectedMethod, setSelectedMethod] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<TestResult[]>([])

  // 모델 선택 상태
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([])
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState('nomic-embed-text')
  const [selectedInferenceModel, setSelectedInferenceModel] = useState('qwen2.5:3b')
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // DB 관리 상태
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [dbTab, setDbTab] = useState<'add' | 'edit' | 'delete' | 'rebuild'>('add')

  // 문서 추가 상태
  const [newDocTitle, setNewDocTitle] = useState('')
  const [newDocContent, setNewDocContent] = useState('')
  const [newDocLibrary, setNewDocLibrary] = useState('')
  const [newDocCategory, setNewDocCategory] = useState('')
  const [newDocSummary, setNewDocSummary] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  // 문서 수정 상태
  const [editDocId, setEditDocId] = useState('')
  const [editDocTitle, setEditDocTitle] = useState('')
  const [editDocContent, setEditDocContent] = useState('')
  const [editDocCategory, setEditDocCategory] = useState('')
  const [editDocSummary, setEditDocSummary] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [isLoadingDoc, setIsLoadingDoc] = useState(false)

  // 문서 삭제 상태
  const [deleteDocId, setDeleteDocId] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  // Ollama에서 사용 가능한 모델 목록 가져오기
  const fetchAvailableModels = useCallback(async () => {
    setIsLoadingModels(true)
    try {
      const ollamaEndpoint =
        process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'
      const response = await fetch(`${ollamaEndpoint}/api/tags`)

      if (!response.ok) {
        throw new Error('Ollama 서버에 연결할 수 없습니다')
      }

      const data = (await response.json()) as OllamaModelInfo
      setAvailableModels(data.models || [])

      // qwen3:4b가 있으면 기본값으로 설정
      const hasQwen3 = data.models.some((m) => m.name.includes('qwen3'))
      if (hasQwen3) {
        const qwen3Model = data.models.find((m) => m.name.includes('qwen3'))
        if (qwen3Model) {
          setSelectedInferenceModel(qwen3Model.name)
        }
      }
    } catch (err) {
      console.error('모델 목록 조회 실패:', err)
      setError(err instanceof Error ? err.message : '모델 목록 조회 실패')
    } finally {
      setIsLoadingModels(false)
    }
  }, [])

  // 컴포넌트 마운트 시 모델 목록 조회
  useEffect(() => {
    void fetchAvailableModels()
  }, [fetchAvailableModels])

  // RAG 쿼리 실행
  const handleQuery = useCallback(async () => {
    if (!query.trim()) {
      setError('질문을 입력하세요')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // RAG 서비스 초기화 (선택된 모델 사용)
      const ragService = RAGService.getInstance()
      await ragService.initialize({
        embeddingModel: selectedEmbeddingModel,
        inferenceModel: selectedInferenceModel
      })

      // 쿼리 실행
      const response = await queryRAG({
        query: query.trim(),
        method: selectedMethod || undefined
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
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsLoading(false)
    }
  }, [query, selectedMethod, selectedEmbeddingModel, selectedInferenceModel])

  // 문서 추가
  const handleAddDocument = useCallback(async () => {
    if (!newDocTitle.trim() || !newDocContent.trim() || !newDocLibrary.trim()) {
      setError('제목, 내용, 라이브러리는 필수 입력 항목입니다')
      return
    }

    setIsAdding(true)
    setError(null)

    try {
      const ragService = RAGService.getInstance()
      await ragService.initialize()

      const provider = ragService['provider']
      if (!provider) {
        throw new Error('Provider가 초기화되지 않았습니다')
      }

      const docInput: DocumentInput = {
        title: newDocTitle.trim(),
        content: newDocContent.trim(),
        library: newDocLibrary.trim(),
        category: newDocCategory.trim() || undefined,
        summary: newDocSummary.trim() || undefined
      }

      const docId = await provider.addDocument(docInput)

      alert(`문서가 추가되었습니다!\nDocument ID: ${docId}`)

      // 입력 초기화
      setNewDocTitle('')
      setNewDocContent('')
      setNewDocLibrary('')
      setNewDocCategory('')
      setNewDocSummary('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 추가 실패')
    } finally {
      setIsAdding(false)
    }
  }, [newDocTitle, newDocContent, newDocLibrary, newDocCategory, newDocSummary])

  // 문서 조회 (수정용)
  const handleLoadDocument = useCallback(async () => {
    if (!editDocId.trim()) {
      setError('Document ID를 입력하세요')
      return
    }

    setIsLoadingDoc(true)
    setError(null)

    try {
      const ragService = RAGService.getInstance()
      await ragService.initialize()

      const provider = ragService['provider']
      if (!provider) {
        throw new Error('Provider가 초기화되지 않았습니다')
      }

      const doc = await provider.getDocument(editDocId.trim())

      if (!doc) {
        throw new Error('문서를 찾을 수 없습니다')
      }

      setEditDocTitle(doc.title)
      setEditDocContent(doc.content)
      setEditDocCategory(doc.category || '')
      setEditDocSummary(doc.summary || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 조회 실패')
    } finally {
      setIsLoadingDoc(false)
    }
  }, [editDocId])

  // 문서 수정
  const handleUpdateDocument = useCallback(async () => {
    if (!editDocId.trim()) {
      setError('Document ID를 입력하세요')
      return
    }

    setIsEditing(true)
    setError(null)

    try {
      const ragService = RAGService.getInstance()
      await ragService.initialize()

      const provider = ragService['provider']
      if (!provider) {
        throw new Error('Provider가 초기화되지 않았습니다')
      }

      const success = await provider.updateDocument(editDocId.trim(), {
        title: editDocTitle.trim() || undefined,
        content: editDocContent.trim() || undefined,
        category: editDocCategory.trim() || undefined,
        summary: editDocSummary.trim() || undefined
      })

      if (!success) {
        throw new Error('문서 수정 실패')
      }

      alert('문서가 수정되었습니다!')
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 수정 실패')
    } finally {
      setIsEditing(false)
    }
  }, [editDocId, editDocTitle, editDocContent, editDocCategory, editDocSummary])

  // 문서 삭제
  const handleDeleteDocument = useCallback(async () => {
    if (!deleteDocId.trim()) {
      setError('Document ID를 입력하세요')
      return
    }

    if (!confirm(`정말로 문서 "${deleteDocId}"를 삭제하시겠습니까?`)) {
      return
    }

    setIsDeleting(true)
    setError(null)

    try {
      const ragService = RAGService.getInstance()
      await ragService.initialize()

      const provider = ragService['provider']
      if (!provider) {
        throw new Error('Provider가 초기화되지 않았습니다')
      }

      const success = await provider.deleteDocument(deleteDocId.trim())

      if (!success) {
        throw new Error('문서 삭제 실패')
      }

      alert('문서가 삭제되었습니다!')
      setDeleteDocId('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 삭제 실패')
    } finally {
      setIsDeleting(false)
    }
  }, [deleteDocId])

  // DB 재구축
  const handleRebuildDatabase = useCallback(async () => {
    if (!confirm('전체 데이터베이스를 재구축하시겠습니까? (모든 데이터가 초기화됩니다)')) {
      return
    }

    setIsRebuilding(true)
    setError(null)

    try {
      await rebuildRAGDatabase()
      alert('데이터베이스 재구축 완료!')
    } catch (err) {
      setError(err instanceof Error ? err.message : '재구축 실패')
    } finally {
      setIsRebuilding(false)
    }
  }, [])

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">RAG 시스템 테스트 (Ollama 전용)</h1>
        <p className="text-muted-foreground">
          Ollama 로컬 RAG 시스템의 검색 정확도와 응답 품질을 테스트합니다.
        </p>
        <Badge variant="outline" className="mt-2">
          개발/테스트 전용 페이지
        </Badge>
      </div>

      {/* 모델 설정 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            모델 설정
          </CardTitle>
          <CardDescription>Ollama에 설치된 모델을 선택하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {/* 임베딩 모델 선택 */}
            <div className="space-y-2">
              <Label htmlFor="embedding-model">임베딩 모델</Label>
              <Select
                value={selectedEmbeddingModel}
                onValueChange={setSelectedEmbeddingModel}
                disabled={isLoadingModels}
              >
                <SelectTrigger id="embedding-model">
                  <SelectValue placeholder="임베딩 모델 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels
                    .filter((m) => m.name.includes('embed') || m.name.includes('nomic'))
                    .map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  {/* 기본값 포함 */}
                  {!availableModels.some((m) => m.name === 'nomic-embed-text') && (
                    <SelectItem value="nomic-embed-text">nomic-embed-text</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 추론 모델 선택 */}
            <div className="space-y-2">
              <Label htmlFor="inference-model">추론 모델 (LLM)</Label>
              <Select
                value={selectedInferenceModel}
                onValueChange={setSelectedInferenceModel}
                disabled={isLoadingModels}
              >
                <SelectTrigger id="inference-model">
                  <SelectValue placeholder="추론 모델 선택" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels
                    .filter(
                      (m) =>
                        !m.name.includes('embed') &&
                        (m.name.includes('qwen') ||
                          m.name.includes('llama') ||
                          m.name.includes('mistral') ||
                          m.name.includes('gemma'))
                    )
                    .map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  {/* 기본값 포함 */}
                  {!availableModels.some((m) => m.name === 'qwen2.5:3b') && (
                    <SelectItem value="qwen2.5:3b">qwen2.5:3b</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button
              onClick={fetchAvailableModels}
              disabled={isLoadingModels}
              variant="outline"
              size="sm"
            >
              {isLoadingModels ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  조회 중...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  모델 목록 새로고침
                </>
              )}
            </Button>
            <Badge variant="secondary">{availableModels.length}개 모델 감지됨</Badge>
          </div>
        </CardContent>
      </Card>

      {/* DB 관리 */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            데이터베이스 관리
          </CardTitle>
          <CardDescription>문서 추가, 수정, 삭제, 재구축</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={dbTab} onValueChange={(v) => setDbTab(v as typeof dbTab)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="add">
                <Plus className="mr-2 h-4 w-4" />
                추가
              </TabsTrigger>
              <TabsTrigger value="edit">
                <Edit className="mr-2 h-4 w-4" />
                수정
              </TabsTrigger>
              <TabsTrigger value="delete">
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </TabsTrigger>
              <TabsTrigger value="rebuild">
                <RefreshCw className="mr-2 h-4 w-4" />
                재구축
              </TabsTrigger>
            </TabsList>

            {/* 문서 추가 */}
            <TabsContent value="add" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-title">제목 *</Label>
                <Input
                  id="new-title"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="예: t-test 개요"
                  disabled={isAdding}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-content">내용 *</Label>
                <Textarea
                  id="new-content"
                  value={newDocContent}
                  onChange={(e) => setNewDocContent(e.target.value)}
                  placeholder="문서 내용을 입력하세요..."
                  rows={6}
                  disabled={isAdding}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-library">라이브러리 *</Label>
                  <Input
                    id="new-library"
                    value={newDocLibrary}
                    onChange={(e) => setNewDocLibrary(e.target.value)}
                    placeholder="예: scipy, statsmodels"
                    disabled={isAdding}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-category">카테고리</Label>
                  <Input
                    id="new-category"
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value)}
                    placeholder="예: hypothesis-testing"
                    disabled={isAdding}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-summary">요약</Label>
                <Textarea
                  id="new-summary"
                  value={newDocSummary}
                  onChange={(e) => setNewDocSummary(e.target.value)}
                  placeholder="문서 요약 (선택사항)"
                  rows={2}
                  disabled={isAdding}
                />
              </div>

              <Button onClick={handleAddDocument} disabled={isAdding}>
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    추가 중...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    문서 추가
                  </>
                )}
              </Button>
            </TabsContent>

            {/* 문서 수정 */}
            <TabsContent value="edit" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-id">Document ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="edit-id"
                    value={editDocId}
                    onChange={(e) => setEditDocId(e.target.value)}
                    placeholder="예: scipy_ttest_ind"
                    disabled={isLoadingDoc || isEditing}
                  />
                  <Button
                    onClick={handleLoadDocument}
                    disabled={isLoadingDoc || !editDocId.trim()}
                    variant="outline"
                  >
                    {isLoadingDoc ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-title">제목</Label>
                <Input
                  id="edit-title"
                  value={editDocTitle}
                  onChange={(e) => setEditDocTitle(e.target.value)}
                  disabled={isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-content">내용</Label>
                <Textarea
                  id="edit-content"
                  value={editDocContent}
                  onChange={(e) => setEditDocContent(e.target.value)}
                  rows={6}
                  disabled={isEditing}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">카테고리</Label>
                  <Input
                    id="edit-category"
                    value={editDocCategory}
                    onChange={(e) => setEditDocCategory(e.target.value)}
                    disabled={isEditing}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-summary">요약</Label>
                  <Input
                    id="edit-summary"
                    value={editDocSummary}
                    onChange={(e) => setEditDocSummary(e.target.value)}
                    disabled={isEditing}
                  />
                </div>
              </div>

              <Button onClick={handleUpdateDocument} disabled={isEditing || !editDocId.trim()}>
                {isEditing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    수정 중...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    문서 수정
                  </>
                )}
              </Button>
            </TabsContent>

            {/* 문서 삭제 */}
            <TabsContent value="delete" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delete-id">Document ID</Label>
                <Input
                  id="delete-id"
                  value={deleteDocId}
                  onChange={(e) => setDeleteDocId(e.target.value)}
                  placeholder="예: scipy_ttest_ind"
                  disabled={isDeleting}
                />
              </div>

              <Button
                onClick={handleDeleteDocument}
                disabled={isDeleting || !deleteDocId.trim()}
                variant="destructive"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    삭제 중...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    문서 삭제
                  </>
                )}
              </Button>
            </TabsContent>

            {/* DB 재구축 */}
            <TabsContent value="rebuild" className="space-y-4">
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ 주의: 전체 데이터베이스를 재구축하면 모든 사용자 추가 문서가 삭제되고,
                  원본 데이터로 초기화됩니다.
                </p>
              </div>

              <Button
                onClick={handleRebuildDatabase}
                disabled={isRebuilding}
                variant="outline"
                className="gap-2"
              >
                {isRebuilding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    재구축 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    전체 DB 재구축
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

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
            <Label htmlFor="method">통계 메서드 범위 (선택)</Label>
            <input
              id="method"
              type="text"
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              placeholder="예: tTest, linearRegression (질문 범위를 좁힙니다)"
              className="w-full px-3 py-2 border rounded-md"
              disabled={isLoading}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* 버튼 */}
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
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">{result.query}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="default">Ollama (Local)</Badge>
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
                                {source.score && (
                                  <Badge variant="outline">Score: {source.score.toFixed(3)}</Badge>
                                )}
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
