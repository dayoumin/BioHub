/**
 * Ollama RAG Provider
 *
 * Ollama를 사용하는 완전 로컬 RAG 제공자
 * - 임베딩: nomic-embed-text (137M, 빠르고 정확)
 * - 추론: llama3.2 (3B) 또는 qwen2.5 (7B, 한국어 우수)
 * - Vector DB: ChromaDB (브라우저 IndexedDB)
 *
 * 설치:
 * 1. Ollama 설치: https://ollama.com/download
 * 2. 모델 다운로드:
 *    ollama pull nomic-embed-text
 *    ollama pull llama3.2
 */

import { BaseRAGProvider, RAGContext, RAGResponse, RAGProviderConfig } from './base-provider'

export interface OllamaProviderConfig extends RAGProviderConfig {
  /** Ollama API 엔드포인트 (기본: http://localhost:11434) */
  ollamaEndpoint?: string
  /** 임베딩 모델 (기본: nomic-embed-text) */
  embeddingModel?: string
  /** 추론 모델 (기본: llama3.2) */
  inferenceModel?: string
  /** Vector DB 경로 (ChromaDB) */
  vectorDbPath?: string
  /** Top-K 검색 결과 수 (기본: 5) */
  topK?: number
}

interface EmbeddingResponse {
  embedding: number[]
}

interface GenerateResponse {
  model: string
  created_at: string
  response: string
  done: boolean
}

interface SearchResult {
  id: string
  score: number
  metadata: {
    title: string
    source: string
    library: string
  }
  document: string
}

export class OllamaRAGProvider extends BaseRAGProvider {
  private ollamaEndpoint: string
  private embeddingModel: string
  private inferenceModel: string
  private vectorDbPath: string
  private topK: number
  private isInitialized = false

  // Vector DB (나중에 ChromaDB 연동)
  private vectorDb: unknown = null

  constructor(config: OllamaProviderConfig) {
    super(config)

    this.ollamaEndpoint = config.ollamaEndpoint || 'http://localhost:11434'
    this.embeddingModel = config.embeddingModel || 'nomic-embed-text'
    this.inferenceModel = config.inferenceModel || 'llama3.2'
    this.vectorDbPath = config.vectorDbPath || './rag-system/data/vector_db'
    this.topK = config.topK || 5
  }

  async initialize(): Promise<void> {
    console.log('[OllamaProvider] 초기화 시작...')

    // 1. Ollama 서버 연결 확인
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`)
      if (!response.ok) {
        throw new Error('Ollama 서버에 연결할 수 없습니다')
      }

      const data = await response.json()
      const models = data.models || []

      // 2. 임베딩 모델 확인
      const hasEmbeddingModel = models.some((m: { name: string }) =>
        m.name.includes(this.embeddingModel)
      )
      if (!hasEmbeddingModel) {
        throw new Error(
          `임베딩 모델 '${this.embeddingModel}'이 설치되지 않았습니다.\n` +
            `다음 명령어로 설치하세요: ollama pull ${this.embeddingModel}`
        )
      }

      // 3. 추론 모델 확인
      const hasInferenceModel = models.some((m: { name: string }) =>
        m.name.includes(this.inferenceModel)
      )
      if (!hasInferenceModel) {
        throw new Error(
          `추론 모델 '${this.inferenceModel}'이 설치되지 않았습니다.\n` +
            `다음 명령어로 설치하세요: ollama pull ${this.inferenceModel}`
        )
      }

      console.log('[OllamaProvider] 모델 확인 완료:')
      console.log(`  - 임베딩: ${this.embeddingModel}`)
      console.log(`  - 추론: ${this.inferenceModel}`)

      // 4. Vector DB 초기화 (TODO: ChromaDB 연동)
      // this.vectorDb = await this.initializeVectorDB()

      this.isInitialized = true
      console.log('[OllamaProvider] 초기화 완료!')
    } catch (error) {
      console.error('[OllamaProvider] 초기화 실패:', error)
      throw error
    }
  }

  async isReady(): Promise<boolean> {
    return this.isInitialized
  }

  async cleanup(): Promise<void> {
    // Vector DB 연결 정리 (TODO)
    this.isInitialized = false
  }

  async query(context: RAGContext): Promise<RAGResponse> {
    if (!this.isInitialized) {
      throw new Error('OllamaProvider가 초기화되지 않았습니다')
    }

    const startTime = Date.now()

    try {
      // 1. 쿼리 임베딩 생성
      console.log('[OllamaProvider] 쿼리 임베딩 생성 중...')
      const queryEmbedding = await this.generateEmbedding(context.query)

      // 2. Vector DB 검색 (Top-K)
      console.log(`[OllamaProvider] Vector DB 검색 중 (Top-${this.topK})...`)
      const searchResults = await this.searchVectorDB(queryEmbedding)

      // 3. 관련 문서 컨텍스트 생성
      const contextText = this.buildContext(searchResults, context)

      // 4. 추론 모델로 응답 생성
      console.log('[OllamaProvider] 응답 생성 중...')
      const answer = await this.generateAnswer(contextText, context.query)

      const responseTime = Date.now() - startTime

      return {
        answer,
        sources: searchResults.map((result) => ({
          title: result.metadata.title,
          content: result.document.slice(0, 200) + '...',
          score: result.score
        })),
        model: {
          provider: 'Ollama (Local)',
          embedding: this.embeddingModel,
          inference: this.inferenceModel
        },
        metadata: {
          responseTime
        }
      }
    } catch (error) {
      throw new Error(
        `Ollama Provider 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      )
    }
  }

  /**
   * 임베딩 생성
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${this.ollamaEndpoint}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.embeddingModel,
        prompt: text
      })
    })

    if (!response.ok) {
      throw new Error(`임베딩 생성 실패: ${response.statusText}`)
    }

    const data: EmbeddingResponse = await response.json()
    return data.embedding
  }

  /**
   * Vector DB 검색 (임시 구현 - Week 2에서 ChromaDB 연동)
   */
  private async searchVectorDB(queryEmbedding: number[]): Promise<SearchResult[]> {
    // TODO: Week 2에서 ChromaDB 연동
    // 현재는 더미 데이터 반환

    console.log('[OllamaProvider] ⚠️ Vector DB 미연동 - 더미 데이터 반환')

    return [
      {
        id: 'scipy_ttest_ind',
        score: 0.92,
        metadata: {
          title: 'scipy.stats.ttest_ind',
          source: 'https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.ttest_ind.html',
          library: 'scipy'
        },
        document: 'Calculate the T-test for the means of two independent samples...'
      },
      {
        id: 'worker2_t_test',
        score: 0.87,
        metadata: {
          title: 'worker2.t_test',
          source: 'project/worker2-hypothesis_functions.md',
          library: 'project'
        },
        document: 'def t_test(sample1: List[float], sample2: List[float]) -> Dict...'
      }
    ]
  }

  /**
   * 컨텍스트 생성 (검색 결과 + 메서드 정보)
   */
  private buildContext(searchResults: SearchResult[], context: RAGContext): string {
    let contextText = '다음은 관련 문서입니다:\n\n'

    searchResults.forEach((result, index) => {
      contextText += `[문서 ${index + 1}] ${result.metadata.title}\n`
      contextText += `${result.document}\n\n`
    })

    if (context.method) {
      contextText += `\n현재 사용자가 사용 중인 통계 메서드: ${context.method}\n`
    }

    return contextText
  }

  /**
   * 답변 생성 (Ollama 추론 모델)
   */
  private async generateAnswer(contextText: string, query: string): Promise<string> {
    const systemPrompt = `당신은 통계 분석 전문가입니다. 제공된 문서를 참고하여 사용자의 질문에 정확하고 친절하게 답변해주세요.

답변 시 주의사항:
- 제공된 문서의 정보를 우선적으로 사용하세요
- 코드 예제가 있다면 간단히 소개하세요
- 통계 용어는 한글과 영문을 병기하세요 (예: 귀무가설(Null Hypothesis))
- 너무 길지 않게 3-5문단으로 작성하세요`

    const prompt = `${systemPrompt}

${contextText}

사용자 질문: ${query}

답변:`

    const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.inferenceModel,
        prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 1000
        }
      })
    })

    if (!response.ok) {
      throw new Error(`응답 생성 실패: ${response.statusText}`)
    }

    const data: GenerateResponse = await response.json()
    return data.response.trim()
  }

  /**
   * Vector DB 초기화 (TODO: Week 2에서 구현)
   */
  private async initializeVectorDB(): Promise<unknown> {
    // TODO: ChromaDB 연동
    console.log('[OllamaProvider] Vector DB 초기화 (미구현)')
    return null
  }
}
