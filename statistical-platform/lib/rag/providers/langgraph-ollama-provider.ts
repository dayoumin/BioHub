/**
 * LangGraph 기반 Ollama RAG Provider
 *
 * LangGraph.js를 사용한 상태 머신 기반 RAG 제공자
 * - 병렬 실행: Vector 검색 + BM25 검색 동시 수행
 * - 상태 관리: 전체 워크플로우 상태 추적
 * - 확장 가능: 조건 분기, Human-in-the-Loop 등 쉽게 추가 가능
 *
 * 기존 OllamaRAGProvider와 호환되는 인터페이스 제공
 */

import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import {
  BaseRAGProvider,
  RAGContext,
  RAGResponse,
  RAGProviderConfig,
  DocumentInput,
  Document,
  SearchMode
} from './base-provider'
import type { DBDocument, SearchResult } from './ollama-provider'

/**
 * LangGraph RAG 상태 정의
 *
 * 모든 노드가 접근 가능한 공유 상태
 */
const RAGState = Annotation.Root({
  // 입력
  query: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  searchMode: Annotation<SearchMode>({
    reducer: (x, y) => y ?? x,
    default: () => 'hybrid' as SearchMode,
  }),

  // 임베딩
  queryEmbedding: Annotation<number[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),

  // 검색 결과
  vectorResults: Annotation<SearchResult[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  bm25Results: Annotation<SearchResult[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),
  mergedResults: Annotation<SearchResult[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),

  // LLM 생성
  answer: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  citedDocIds: Annotation<number[]>({
    reducer: (x, y) => y ?? x ?? [],
    default: () => [],
  }),

  // 메타데이터
  startTime: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => Date.now(),
  }),
})

type RAGStateType = typeof RAGState.State

export interface LangGraphOllamaProviderConfig extends RAGProviderConfig {
  /** Ollama API 엔드포인트 (기본: http://localhost:11434) */
  ollamaEndpoint?: string
  /** 임베딩 모델 (기본: nomic-embed-text) */
  embeddingModel?: string
  /** 추론 모델 (자동 감지 또는 명시적 지정) */
  inferenceModel?: string
  /** SQLite DB 경로 (기본: /rag-data/rag.db) */
  vectorDbPath?: string
  /** Top-K 검색 결과 수 (기본: 5) */
  topK?: number
  /** 테스트 모드 (in-memory 데이터 사용, 기본: false) */
  testMode?: boolean
}

/**
 * LangGraph 기반 Ollama RAG Provider
 */
export class LangGraphOllamaProvider extends BaseRAGProvider {
  private ollamaEndpoint: string
  private embeddingModel: string
  private inferenceModel: string
  private vectorDbPath: string
  private topK: number
  private testMode: boolean
  private isInitialized = false

  // 컴파일된 LangGraph 앱
  private ragApp: ReturnType<typeof StateGraph.prototype.compile> | null = null

  // 문서 캐시 (간단한 구현 - 실제로는 OllamaProvider의 로직 재사용)
  private documents: DBDocument[] = []

  constructor(config: LangGraphOllamaProviderConfig) {
    super(config)

    this.ollamaEndpoint = config.ollamaEndpoint || 'http://localhost:11434'
    this.embeddingModel = config.embeddingModel || ''
    this.inferenceModel = config.inferenceModel || ''
    this.vectorDbPath = config.vectorDbPath || '/rag-data/rag.db'
    this.topK = config.topK || 5
    this.testMode = config.testMode || false
  }

  async initialize(): Promise<void> {
    console.log('[LangGraphOllamaProvider] 초기화 시작...')

    // TODO: OllamaProvider의 초기화 로직 재사용
    // 1. Ollama 서버 연결 확인
    // 2. 모델 자동 감지/확인
    // 3. SQLite DB 로드
    // 지금은 간단히 초기화만 표시

    console.log('[LangGraphOllamaProvider] LangGraph 워크플로우 구성 중...')

    // LangGraph 워크플로우 생성
    this.ragApp = this.buildRAGWorkflow()

    this.isInitialized = true
    console.log('[LangGraphOllamaProvider] 초기화 완료!')
  }

  async isReady(): Promise<boolean> {
    return this.isInitialized && this.ragApp !== null
  }

  /**
   * LangGraph RAG 워크플로우 구축
   *
   * 워크플로우:
   * 1. Router: 검색 모드 결정 (fts5/vector/hybrid)
   * 2. Vector Search: 임베딩 기반 검색 (병렬)
   * 3. BM25 Search: 키워드 기반 검색 (병렬)
   * 4. Merge: RRF 병합
   * 5. Generate: LLM 답변 생성
   */
  private buildRAGWorkflow() {
    const workflow = new StateGraph(RAGState)
      // 노드 정의
      .addNode('router', this.routeSearchMode.bind(this))
      .addNode('embedQuery', this.embedQuery.bind(this))
      .addNode('vectorSearch', this.vectorSearch.bind(this))
      .addNode('bm25Search', this.bm25Search.bind(this))
      .addNode('mergeResults', this.mergeResults.bind(this))
      .addNode('generateAnswer', this.generateAnswer.bind(this))

    // 엣지 정의 (워크플로우)
    workflow
      .addEdge(START, 'router')
      .addConditionalEdges(
        'router',
        (state: RAGStateType) => state.searchMode,
        {
          'fts5': 'bm25Search',
          'vector': 'embedQuery',
          'hybrid': 'embedQuery',
        }
      )
      .addEdge('embedQuery', 'vectorSearch')
      .addEdge('embedQuery', 'bm25Search') // 병렬 실행!
      .addEdge('vectorSearch', 'mergeResults')
      .addEdge('bm25Search', 'mergeResults')
      .addEdge('mergeResults', 'generateAnswer')
      .addEdge('generateAnswer', END)

    return workflow.compile()
  }

  /**
   * 노드 1: 검색 모드 라우팅
   */
  private async routeSearchMode(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log(`[Router] 검색 모드: ${state.searchMode}`)
    // 상태 그대로 반환 (라우팅만 수행)
    return {}
  }

  /**
   * 노드 2: 쿼리 임베딩 생성
   */
  private async embedQuery(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log('[EmbedQuery] 임베딩 생성 중...')

    try {
      const embedding = await this.generateEmbedding(state.query)
      return { queryEmbedding: embedding }
    } catch (error) {
      console.warn('[EmbedQuery] 임베딩 생성 실패:', error)
      return { queryEmbedding: [] }
    }
  }

  /**
   * 노드 3: Vector 검색
   */
  private async vectorSearch(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log('[VectorSearch] Vector 검색 중...')

    // TODO: 실제 Vector 검색 구현 (OllamaProvider.searchByVector 재사용)
    // 지금은 Mock 데이터 반환
    const vectorResults: SearchResult[] = [
      {
        doc_id: 'vec1',
        title: 'Vector Result 1',
        content: `Vector result for "${state.query}"`,
        library: 'test',
        category: null,
        score: 0.9,
      },
    ]

    return { vectorResults }
  }

  /**
   * 노드 4: BM25 키워드 검색
   */
  private async bm25Search(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log('[BM25Search] BM25 검색 중...')

    // TODO: 실제 BM25 검색 구현 (OllamaProvider.searchByKeyword 재사용)
    // 지금은 Mock 데이터 반환
    const bm25Results: SearchResult[] = [
      {
        doc_id: 'bm25-1',
        title: 'BM25 Result 1',
        content: `BM25 result for "${state.query}"`,
        library: 'test',
        category: null,
        score: 0.85,
      },
    ]

    return { bm25Results }
  }

  /**
   * 노드 5: 검색 결과 병합 (Reciprocal Rank Fusion)
   */
  private async mergeResults(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log('[MergeResults] RRF 병합 중...')

    // Hybrid 모드: Vector + BM25 병합
    if (state.searchMode === 'hybrid') {
      const merged = this.reciprocalRankFusion(
        [state.vectorResults, state.bm25Results],
        60
      )
      return { mergedResults: merged }
    }

    // Vector 전용
    if (state.searchMode === 'vector') {
      return { mergedResults: state.vectorResults }
    }

    // FTS5 전용
    return { mergedResults: state.bm25Results }
  }

  /**
   * 노드 6: LLM 답변 생성
   */
  private async generateAnswer(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log('[GenerateAnswer] LLM 답변 생성 중...')

    const topResults = state.mergedResults.slice(0, this.topK)

    if (topResults.length === 0) {
      return {
        answer: '죄송합니다. 관련 문서를 찾을 수 없습니다.',
        citedDocIds: [],
      }
    }

    // 프롬프트 구성
    const contextText = topResults
      .map((doc, idx) => `[${idx + 1}] ${doc.title}\n${doc.content}`)
      .join('\n\n')

    const prompt = `다음 문서를 참고하여 사용자의 질문에 답변하세요.

문서:
${contextText}

질문: ${state.query}

답변 시 주의사항:
1. 문서 내용만을 기반으로 답변하세요
2. 참조한 문서는 [1], [2] 형식으로 인용하세요
3. 한국어로 답변하세요
4. 명확하고 정확하게 답변하세요

답변:`

    try {
      const llmResponse = await this.callLLM(prompt)
      return {
        answer: llmResponse,
        citedDocIds: [], // TODO: 실제 인용 추출
      }
    } catch (error) {
      console.error('[GenerateAnswer] LLM 생성 실패:', error)
      return {
        answer: '죄송합니다. 답변 생성 중 오류가 발생했습니다.',
        citedDocIds: [],
      }
    }
  }

  /**
   * RAG 쿼리 실행 (LangGraph 기반)
   */
  async query(context: RAGContext): Promise<RAGResponse> {
    if (!this.ragApp) {
      throw new Error('RAG 워크플로우가 초기화되지 않았습니다')
    }

    const startTime = Date.now()

    console.log('[LangGraphOllamaProvider] RAG 쿼리 실행:', context.query)

    // LangGraph 실행
    const result = await this.ragApp.invoke({
      query: context.query,
      searchMode: context.searchMode || 'hybrid',
      startTime,
    })

    const elapsed = Date.now() - startTime

    return {
      answer: result.answer,
      sources: result.mergedResults.map((doc: SearchResult) => ({
        title: doc.title,
        content: doc.content,
        score: doc.score,
      })),
      citedDocIds: result.citedDocIds,
      model: {
        provider: 'Ollama (LangGraph)',
        embedding: this.embeddingModel,
        inference: this.inferenceModel,
      },
      metadata: {
        responseTime: elapsed,
      },
    }
  }

  // ========== Helper 메서드 ==========

  /**
   * Ollama 임베딩 생성
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.ollamaEndpoint}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text,
      }),
    })

    if (!response.ok) {
      throw new Error(`임베딩 생성 실패: ${response.statusText}`)
    }

    const data = (await response.json()) as { embedding: number[] }
    return data.embedding
  }

  /**
   * Ollama LLM 호출
   */
  private async callLLM(prompt: string): Promise<string> {
    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.inferenceModel,
        prompt,
        stream: false,
      }),
    })

    if (!response.ok) {
      throw new Error(`LLM 호출 실패: ${response.statusText}`)
    }

    const data = (await response.json()) as { response: string }
    return data.response
  }

  /**
   * Reciprocal Rank Fusion (RRF) 병합
   */
  private reciprocalRankFusion(
    resultLists: SearchResult[][],
    k: number = 60
  ): SearchResult[] {
    const rrf: Map<string, { doc: SearchResult; score: number }> = new Map()

    for (const results of resultLists) {
      results.forEach((doc, rank) => {
        const existing = rrf.get(doc.doc_id)
        const rrfScore = 1 / (k + rank + 1)

        if (existing) {
          existing.score += rrfScore
        } else {
          rrf.set(doc.doc_id, { doc, score: rrfScore })
        }
      })
    }

    // 점수 기준 내림차순 정렬
    return Array.from(rrf.values())
      .sort((a, b) => b.score - a.score)
      .map((entry) => ({ ...entry.doc, score: entry.score }))
  }

  // ========== BaseRAGProvider 필수 메서드 ==========

  async cleanup(): Promise<void> {
    this.ragApp = null
    this.documents = []
    this.isInitialized = false
  }

  // 문서 관리 메서드는 OllamaProvider와 동일하게 구현 (생략)
  async addDocument(document: DocumentInput): Promise<string> {
    throw new Error('addDocument not implemented yet')
  }

  async getDocument(docId: string): Promise<Document | null> {
    throw new Error('getDocument not implemented yet')
  }

  getDocumentCount(): number {
    return this.documents.length
  }

  getAllDocuments(): Document[] {
    return this.documents
  }
}
