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

import { useState, useCallback, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
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
  Plus,
  List,
  Search,
  ChevronDown,
  ChevronUp,
  Copy
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { queryRAG, rebuildRAGDatabase, RAGService } from '@/lib/rag/rag-service'
import type { RAGResponse, DocumentInput, Document, SearchMode } from '@/lib/rag/providers/base-provider'

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

// 함수명 → 한글명 매핑 테이블 (주요 100개 함수)
const FUNCTION_NAME_MAP: Record<string, string> = {
  // SciPy - Hypothesis Testing
  'scipy.stats.binom_test': '이항검정',
  'scipy.stats.chi2_contingency': '카이제곱 독립성 검정',
  'scipy.stats.chisquare': '카이제곱 적합도 검정',
  'scipy.stats.fisher_exact': '피셔 정확검정',
  'scipy.stats.friedmanchisquare': '프리드만 검정',
  'scipy.f_oneway': '일원 분산분석',
  'scipy.stats.kruskal': '크러스컬-왈리스 검정',
  'scipy.stats.mannwhitneyu': '만-휘트니 U 검정',
  'scipy.stats.ttest_ind': '독립표본 t검정',
  'scipy.stats.ttest_rel': '대응표본 t검정',
  'scipy.stats.ttest_1samp': '일표본 t검정',
  'scipy.stats.wilcoxon': '윌콕슨 부호순위 검정',
  'scipy.stats.ranksums': '윌콕슨 순위합 검정',
  'scipy.stats.kstest': '콜모고로프-스미르노프 검정',
  'scipy.stats.shapiro': '샤피로-윌크 정규성 검정',
  'scipy.stats.normaltest': '정규성 검정',
  'scipy.stats.levene': '레빈 등분산 검정',
  'scipy.stats.bartlett': '바틀렛 등분산 검정',
  'scipy.stats.anderson': '앤더슨-달링 정규성 검정',
  'scipy.stats.jarque_bera': '자크-베라 정규성 검정',

  // SciPy - Distributions
  'scipy.stats.chi2': '카이제곱 분포',
  'scipy.stats.f': 'F 분포',
  'scipy.stats.t': 't 분포',
  'scipy.stats.norm': '정규 분포',

  // SciPy - Descriptive
  'scipy.stats.describe': '기술통계',
  'scipy.stats.entropy': '엔트로피',
  'scipy.stats.kurtosis': '첨도',
  'scipy.stats.skew': '왜도',
  'scipy.stats.pearsonr': '피어슨 상관계수',
  'scipy.stats.spearmanr': '스피어만 상관계수',
  'scipy.stats.kendalltau': '켄달 타우 상관계수',

  // NumPy - Descriptive
  'numpy.mean': '평균',
  'numpy.median': '중앙값',
  'numpy.std': '표준편차',
  'numpy.var': '분산',
  'numpy.corrcoef': '상관계수',
  'numpy.cov': '공분산',
  'numpy.min': '최솟값',
  'numpy.max': '최댓값',
  'numpy.percentile': '백분위수',
  'numpy.quantile': '분위수',

  // Statsmodels - Regression
  'statsmodels.api.OLS': '일반 최소제곱 회귀',
  'statsmodels.api.Logit': '로지스틱 회귀',
  'statsmodels.api.GLM': '일반화 선형 모형',
  'statsmodels.api.WLS': '가중 최소제곱 회귀',
  'statsmodels.api.GLS': '일반화 최소제곱 회귀',
  'statsmodels.tsa.arima.model.ARIMA': 'ARIMA 모형',

  // Pingouin
  'pingouin.ttest': 't검정',
  'pingouin.anova': '분산분석',
  'pingouin.rm_anova': '반복측정 분산분석',
  'pingouin.ancova': '공분산분석',
  'pingouin.mixed_anova': '혼합 분산분석',
  'pingouin.welch_anova': '웰치 분산분석',
  'pingouin.kruskal': '크러스컬-왈리스 검정',
  'pingouin.friedman': '프리드만 검정',
  'pingouin.cochran': '코크란 Q 검정',
  'pingouin.corr': '상관분석',
  'pingouin.partial_corr': '편상관분석',
  'pingouin.pairwise_corr': '쌍별 상관분석',
  'pingouin.rm_corr': '반복측정 상관분석',
  'pingouin.power_ttest': 't검정 검정력 분석',
  'pingouin.power_anova': '분산분석 검정력 분석'
}

export default function RAGTestPage() {
  // 쿼리 테스트 상태
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<TestResult[]>([])

  // 모델 선택 상태
  const [availableModels, setAvailableModels] = useState<OllamaModel[]>([])
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState('Q78KG/Qwen3-Embedding-4B:latest')
  const [selectedInferenceModel, setSelectedInferenceModel] = useState('qwen3:4b')
  const [isLoadingModels, setIsLoadingModels] = useState(false)

  // 검색 모드 상태
  const [searchMode, setSearchMode] = useState<SearchMode>('fts5')

  // DB 관리 상태
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [dbTab, setDbTab] = useState<'add' | 'edit' | 'delete' | 'list' | 'rebuild'>('list')

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

  // 문서 목록 상태
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null) // 확장된 문서 ID
  const [searchTerm, setSearchTerm] = useState('') // 검색어
  const [filterCategory, setFilterCategory] = useState<string>('all') // 카테고리 필터
  const [filterLibrary, setFilterLibrary] = useState<string>('all') // 라이브러리 필터
  const [currentPage, setCurrentPage] = useState(1) // 현재 페이지
  const itemsPerPage = 20 // 페이지당 항목 수
  const [copySuccess, setCopySuccess] = useState<string | null>(null) // 복사 성공 메시지

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

      // 임베딩 모델 자동 감지 및 설정
      const embeddingModel = data.models.find((m) =>
        m.name.toLowerCase().includes('embed') ||
        m.name.toLowerCase().includes('embedding')
      )
      if (embeddingModel) {
        setSelectedEmbeddingModel(embeddingModel.name)
      }

      // 추론 모델 자동 감지 및 설정 (qwen3 우선)
      const inferenceModel = data.models.find((m) =>
        m.name.includes('qwen3:4b') || m.name.includes('qwen3')
      )
      if (inferenceModel) {
        setSelectedInferenceModel(inferenceModel.name)
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

      // 쿼리 실행 (검색 모드 전달)
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
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsLoading(false)
    }
  }, [query, selectedEmbeddingModel, selectedInferenceModel, searchMode])

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

  // 문서 목록 조회
  const handleLoadDocuments = useCallback(async () => {
    setIsLoadingDocs(true)
    setError(null)

    try {
      const ragService = RAGService.getInstance()
      await ragService.initialize()

      const provider = ragService['provider']
      if (!provider) {
        throw new Error('Provider가 초기화되지 않았습니다')
      }

      // Get all documents from the provider
      const allDocs = provider.getAllDocuments()
      setDocuments(allDocs)
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 목록 조회 실패')
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  // 필터링 및 페이지네이션 로직
  const filteredAndPagedDocuments = useMemo(() => {
    // 1. 검색 필터링
    let filtered = documents.filter((doc) => {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch =
        searchTerm === '' ||
        doc.title.toLowerCase().includes(searchLower) ||
        (doc.summary && doc.summary.toLowerCase().includes(searchLower)) ||
        doc.content.toLowerCase().includes(searchLower)

      // 2. 카테고리 필터링
      const matchesCategory =
        filterCategory === 'all' || doc.category === filterCategory

      // 3. 라이브러리 필터링
      const matchesLibrary =
        filterLibrary === 'all' || doc.library === filterLibrary

      return matchesSearch && matchesCategory && matchesLibrary
    })

    // 4. 페이지네이션
    const totalPages = Math.ceil(filtered.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paged = filtered.slice(startIndex, endIndex)

    return { filtered, paged, totalPages }
  }, [documents, searchTerm, filterCategory, filterLibrary, currentPage])

  // 고유 카테고리/라이브러리 목록
  const uniqueCategories = useMemo(() => {
    const categories = new Set(
      documents.map((d) => d.category || 'uncategorized').filter(Boolean)
    )
    return Array.from(categories).sort()
  }, [documents])

  const uniqueLibraries = useMemo(() => {
    const libraries = new Set(documents.map((d) => d.library))
    return Array.from(libraries).sort()
  }, [documents])

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
      // 재구축 후 문서 목록 새로고침
      void handleLoadDocuments()
    } catch (err) {
      setError(err instanceof Error ? err.message : '재구축 실패')
    } finally {
      setIsRebuilding(false)
    }
  }, [handleLoadDocuments])

  // DB 탭이 'list'로 변경될 때 문서 목록 자동 로드
  useEffect(() => {
    if (dbTab === 'list') {
      void handleLoadDocuments()
    }
  }, [dbTab, handleLoadDocuments])

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
                    .filter(
                      (m) =>
                        m.name.toLowerCase().includes('embed') ||
                        m.name.toLowerCase().includes('embedding') ||
                        m.name.includes('nomic')
                    )
                    .map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  {availableModels.length === 0 && (
                    <SelectItem value="Q78KG/Qwen3-Embedding-4B:latest">
                      Q78KG/Qwen3-Embedding-4B:latest (기본값)
                    </SelectItem>
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
                        !m.name.toLowerCase().includes('embed') &&
                        (m.name.includes('qwen') ||
                          m.name.includes('llama') ||
                          m.name.includes('mistral') ||
                          m.name.includes('gemma') ||
                          m.name.includes('gpt'))
                    )
                    .map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        {model.name}
                      </SelectItem>
                    ))}
                  {availableModels.length === 0 && (
                    <SelectItem value="qwen3:4b">qwen3:4b (기본값)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 검색 모드 선택 */}
          <div className="mt-4 space-y-2">
            <Label htmlFor="search-mode">검색 모드</Label>
            <Select
              value={searchMode}
              onValueChange={(value) => setSearchMode(value as SearchMode)}
            >
              <SelectTrigger id="search-mode">
                <SelectValue placeholder="검색 모드 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fts5">
                  <div className="flex flex-col">
                    <span className="font-medium">FTS5 (SQLite Full-Text Search)</span>
                    <span className="text-xs text-muted-foreground">키워드 기반 검색 (빠름)</span>
                  </div>
                </SelectItem>
                <SelectItem value="vector">
                  <div className="flex flex-col">
                    <span className="font-medium">Vector DB (임베딩 검색)</span>
                    <span className="text-xs text-muted-foreground">의미론적 검색 (느림, 정확)</span>
                  </div>
                </SelectItem>
                <SelectItem value="hybrid">
                  <div className="flex flex-col">
                    <span className="font-medium">Hybrid (FTS5 + Vector)</span>
                    <span className="text-xs text-muted-foreground">RRF 결합 (가장 정확, 가장 느림)</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              💡 <strong>FTS5</strong>: 키워드 매칭 (현재 구현: 단순 .includes()) |
              <strong>Vector</strong>: 임베딩 유사도 (코사인 유사도) |
              <strong>Hybrid</strong>: RRF 알고리즘으로 결합
            </p>
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
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                문서 목록
              </TabsTrigger>
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

            {/* 문서 목록 */}
            <TabsContent value="list" className="space-y-4">
              {/* 헤더: 전체 개수 + 새로고침 */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  전체 {documents.length}개 문서 · 필터링 결과 {filteredAndPagedDocuments.filtered.length}개
                </p>
                <Button
                  onClick={handleLoadDocuments}
                  disabled={isLoadingDocs}
                  variant="outline"
                  size="sm"
                >
                  {isLoadingDocs ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      로딩 중...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      새로고침
                    </>
                  )}
                </Button>
              </div>

              {/* 필터 및 검색 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 검색 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="제목, 요약, 내용 검색..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value)
                      setCurrentPage(1) // 검색 시 첫 페이지로
                    }}
                    className="pl-9"
                  />
                </div>

                {/* 카테고리 필터 */}
                <Select
                  value={filterCategory}
                  onValueChange={(value) => {
                    setFilterCategory(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 카테고리</SelectItem>
                    {uniqueCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* 라이브러리 필터 */}
                <Select
                  value={filterLibrary}
                  onValueChange={(value) => {
                    setFilterLibrary(value)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="라이브러리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 라이브러리</SelectItem>
                    {uniqueLibraries.map((lib) => (
                      <SelectItem key={lib} value={lib}>
                        {lib}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 문서 목록 (간결한 카드 형식) */}
              <div className="space-y-2">
                {filteredAndPagedDocuments.paged.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground border rounded-lg">
                    {documents.length === 0
                      ? '문서가 없습니다. "새로고침" 버튼을 눌러주세요.'
                      : '검색 결과가 없습니다.'}
                  </div>
                ) : (
                  filteredAndPagedDocuments.paged.map((doc) => {
                    // 1. 한글 매핑 우선 사용
                    const koreanName = FUNCTION_NAME_MAP[doc.title]

                    // 2. summary/title에서 "---" 제거
                    const cleanSummary = doc.summary
                      ? doc.summary
                          .replace(/^---\s*/i, '')
                          .replace(/^title:\s*/i, '')
                          .replace(/description:.*$/i, '')
                          .replace(/source:.*$/i, '')
                          .trim()
                      : null

                    const cleanTitle = doc.title
                      .replace(/^---\s*/i, '')
                      .replace(/^title:\s*/i, '')
                      .replace(/description:.*$/i, '')
                      .replace(/source:.*$/i, '')
                      .trim()

                    // 3. 최종 표시 이름: 한글명 > summary > title
                    const displayName = koreanName || cleanSummary || cleanTitle

                    const isExpanded = expandedDocId === doc.doc_id

                    return (
                      <div
                        key={doc.doc_id}
                        className="border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                      >
                        {/* 기본 표시 (항상 보이는 정보) */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {/* 라이브러리 배지를 맨 앞으로 */}
                              <Badge variant="secondary" className="text-xs shrink-0">
                                {doc.library}
                              </Badge>
                              {doc.category && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {doc.category}
                                </Badge>
                              )}
                              {/* 한글 제목/요약 (폰트 크기 조정) */}
                              <span className="text-sm truncate">{displayName}</span>
                            </div>
                          </div>

                          {/* 작업 버튼 */}
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                setExpandedDocId(isExpanded ? null : doc.doc_id)
                              }
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditDocId(doc.doc_id)
                                setDbTab('edit')
                                void handleLoadDocument()
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setDeleteDocId(doc.doc_id)
                                setDbTab('delete')
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* 상세 정보 (확장 시에만 표시) */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">ID:</span>
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded flex-1">
                                {doc.doc_id}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  await navigator.clipboard.writeText(doc.doc_id)
                                  setCopySuccess(doc.doc_id)
                                  setTimeout(() => setCopySuccess(null), 2000)
                                }}
                                title="ID 복사"
                              >
                                {copySuccess === doc.doc_id ? (
                                  <span className="text-green-600 text-xs">✓</span>
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            {cleanSummary && (
                              <div>
                                <span className="text-muted-foreground">요약:</span> {cleanSummary}
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">제목:</span> {cleanTitle}
                            </div>
                            <div>
                              <span className="text-muted-foreground">내용 미리보기:</span>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">
                                {doc.content}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* 페이지네이션 */}
              {filteredAndPagedDocuments.totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    페이지 {currentPage} / {filteredAndPagedDocuments.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      이전
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((p) =>
                          Math.min(filteredAndPagedDocuments.totalPages, p + 1)
                        )
                      }
                      disabled={currentPage === filteredAndPagedDocuments.totalPages}
                    >
                      다음
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

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
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-4 space-y-2">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                  ⚠️ 주의: 원본 데이터베이스로 초기화
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 list-disc list-inside space-y-1">
                  <li>
                    <strong>삭제됨</strong>: IndexedDB에 저장된 모든 사용자 문서 (영구 저장소)
                  </li>
                  <li>
                    <strong>복원됨</strong>: 원본 DB 파일 (public/rag-data/rag.db)
                  </li>
                  <li>
                    <strong>용도</strong>: 테스트 데이터 정리, 원본으로 되돌리기
                  </li>
                </ul>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                  💡 참고: 사용자가 추가/수정한 문서는 IndexedDB에 영구 저장되므로,
                  페이지 새로고침 후에도 유지됩니다. 재구축 시 IndexedDB가 초기화됩니다.
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
                    초기화 중...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    원본 DB로 초기화
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
              rows={4}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              💡 FTS5 검색이 질문에서 키워드를 자동으로 추출하여 관련 문서를 찾습니다.
            </p>
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
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {result.response.answer}
                        </ReactMarkdown>
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
