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
  RAGContext,
  RAGResponse,
  SearchMode
} from './base-provider'
import {
  OllamaRAGProvider,
  OllamaProviderConfig,
  type SearchResult
} from './ollama-provider'

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

// LangGraph Provider는 OllamaProvider와 동일한 설정 사용
export type LangGraphOllamaProviderConfig = OllamaProviderConfig

/**
 * LangGraph 기반 Ollama RAG Provider
 *
 * OllamaRAGProvider를 상속하여 모든 검색/임베딩 로직 재사용
 * LangGraph로 워크플로우만 재구성
 */
export class LangGraphOllamaProvider extends OllamaRAGProvider {
  // 컴파일된 LangGraph 앱
  private ragApp: ReturnType<typeof StateGraph.prototype.compile> | null = null

  constructor(config: LangGraphOllamaProviderConfig) {
    super(config)
  }

  async initialize(): Promise<void> {
    console.log('[LangGraphOllamaProvider] 초기화 시작...')

    // OllamaProvider 초기화 (Ollama 연결, 모델 감지, SQLite 로드)
    await super.initialize()

    console.log('[LangGraphOllamaProvider] LangGraph 워크플로우 구성 중...')

    // LangGraph 워크플로우 생성
    this.ragApp = this.buildRAGWorkflow()

    console.log('[LangGraphOllamaProvider] 초기화 완료!')
  }

  async isReady(): Promise<boolean> {
    const parentReady = await super.isReady()
    return parentReady && this.ragApp !== null
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
      // OllamaProvider의 generateEmbedding 메서드 사용
      const embedding = await (this as any).generateEmbedding(state.query)
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

    try {
      // OllamaProvider의 searchByVector 메서드 사용
      const vectorResults = await (this as any).searchByVector(state.query)
      return { vectorResults }
    } catch (error) {
      console.warn('[VectorSearch] Vector 검색 실패:', error)
      return { vectorResults: [] }
    }
  }

  /**
   * 노드 4: BM25 키워드 검색
   */
  private async bm25Search(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log('[BM25Search] BM25 검색 중...')

    try {
      // OllamaProvider의 searchByKeyword 메서드 사용
      const bm25Results = (this as any).searchByKeyword(state.query)
      return { bm25Results }
    } catch (error) {
      console.warn('[BM25Search] BM25 검색 실패:', error)
      return { bm25Results: [] }
    }
  }

  /**
   * 노드 5: 검색 결과 병합 (Reciprocal Rank Fusion)
   */
  private async mergeResults(state: RAGStateType): Promise<Partial<RAGStateType>> {
    console.log('[MergeResults] RRF 병합 중...')

    // Hybrid 모드: Vector + BM25 병합 (RRF)
    if (state.searchMode === 'hybrid') {
      const k = 60
      const rrfScores = new Map<string, number>()

      // Vector 결과 RRF 점수 계산
      state.vectorResults.forEach((result, index) => {
        const rank = index + 1
        const rrfScore = 1 / (k + rank)
        rrfScores.set(result.doc_id, (rrfScores.get(result.doc_id) || 0) + rrfScore)
      })

      // BM25 결과 RRF 점수 계산
      state.bm25Results.forEach((result, index) => {
        const rank = index + 1
        const rrfScore = 1 / (k + rank)
        rrfScores.set(result.doc_id, (rrfScores.get(result.doc_id) || 0) + rrfScore)
      })

      // 문서 매핑 (doc_id → SearchResult)
      const docMap = new Map<string, SearchResult>()
      ;[...state.vectorResults, ...state.bm25Results].forEach((doc) => {
        if (!docMap.has(doc.doc_id)) {
          docMap.set(doc.doc_id, doc)
        }
      })

      // RRF 점수로 정렬
      const merged = Array.from(rrfScores.entries())
        .sort((a, b) => b[1] - a[1]) // 점수 내림차순
        .map(([doc_id, score]) => {
          const doc = docMap.get(doc_id)!
          return { ...doc, score }
        })

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

    const topK = (this as any).topK || 5
    const topResults = state.mergedResults.slice(0, topK)

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
      // OllamaProvider의 Ollama API 호출 로직 사용
      const inferenceModel = (this as any).inferenceModel
      const ollamaEndpoint = (this as any).ollamaEndpoint

      const response = await fetch(`${ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: inferenceModel,
          prompt,
          stream: false,
        }),
      })

      if (!response.ok) {
        throw new Error(`LLM 호출 실패: ${response.statusText}`)
      }

      const data = (await response.json()) as { response: string }
      const llmResponse = data.response

      // Citation 추출
      const citedDocIds = this.extractCitations(llmResponse, topResults)

      return {
        answer: llmResponse,
        citedDocIds,
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
   * Citation 추출 ([1], [2] 패턴)
   */
  private extractCitations(text: string, docs: SearchResult[]): number[] {
    const matches = text.match(/\[(\d+)\]/g)
    if (!matches) return []

    return matches
      .map((m) => parseInt(m.replace(/\[|\]/g, '')) - 1) // 0-based
      .filter((idx) => idx >= 0 && idx < docs.length)
      .filter((v, i, arr) => arr.indexOf(v) === i) // 중복 제거
  }

  /**
   * RAG 쿼리 실행 (LangGraph 기반)
   *
   * OllamaProvider.query()를 오버라이드하여 LangGraph 워크플로우 사용
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
      searchMode: context.searchMode || context.mode || 'hybrid',
      startTime,
    })

    const elapsed = Date.now() - startTime

    const embeddingModel = (this as any).embeddingModel
    const inferenceModel = (this as any).inferenceModel

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
        embedding: embeddingModel,
        inference: inferenceModel,
      },
      metadata: {
        responseTime: elapsed,
      },
    }
  }

  /**
   * cleanup 오버라이드 (LangGraph 앱 정리 추가)
   */
  async cleanup(): Promise<void> {
    this.ragApp = null
    await super.cleanup() // OllamaProvider cleanup 호출
  }

  // 문서 관리 메서드는 OllamaProvider에서 상속받아 그대로 사용
  // (addDocument, getDocument, updateDocument, deleteDocument, etc.)
}
