/**
 * Ollama RAG Provider (SQLite 연동)
 *
 * Ollama를 사용하는 완전 로컬 RAG 제공자
 * - 임베딩: nomic-embed-text (137M, 빠르고 정확)
 * - 추론: qwen2.5 (3B-7B, 한국어 우수)
 * - Vector DB: SQLite (sql.js로 브라우저에서 실행)
 *
 * 설치:
 * 1. Ollama 설치: https://ollama.com/download
 * 2. 모델 다운로드:
 *    ollama pull nomic-embed-text
 *    ollama pull qwen2.5:3b
 */

import { BaseRAGProvider, RAGContext, RAGResponse, RAGProviderConfig } from './base-provider'

export interface OllamaProviderConfig extends RAGProviderConfig {
  /** Ollama API 엔드포인트 (기본: http://localhost:11434) */
  ollamaEndpoint?: string
  /** 임베딩 모델 (기본: nomic-embed-text) */
  embeddingModel?: string
  /** 추론 모델 (기본: qwen2.5:3b) */
  inferenceModel?: string
  /** SQLite DB 경로 (기본: /rag-data/rag.db) */
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
  doc_id: string
  title: string
  content: string
  library: string
  category: string | null
  score: number
}

interface DBDocument {
  doc_id: string
  title: string
  content: string
  library: string
  category: string | null
  summary: string | null
}

export class OllamaRAGProvider extends BaseRAGProvider {
  private ollamaEndpoint: string
  private embeddingModel: string
  private inferenceModel: string
  private vectorDbPath: string
  private topK: number
  private isInitialized = false

  // SQLite DB (sql.js 사용)
  private db: unknown = null  // SQL.Database 타입
  private documents: DBDocument[] = []

  constructor(config: OllamaProviderConfig) {
    super(config)

    this.ollamaEndpoint = config.ollamaEndpoint || 'http://localhost:11434'
    this.embeddingModel = config.embeddingModel || 'nomic-embed-text'
    this.inferenceModel = config.inferenceModel || 'qwen2.5:3b'
    this.vectorDbPath = config.vectorDbPath || '/rag-data/rag.db'
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

      const data = (await response.json()) as { models: Array<{ name: string }> }
      const models = data.models || []

      // 2. 임베딩 모델 확인
      const hasEmbeddingModel = models.some((m) => m.name.includes(this.embeddingModel))
      if (!hasEmbeddingModel) {
        throw new Error(
          `임베딩 모델 '${this.embeddingModel}'이 설치되지 않았습니다.\n` +
            `다음 명령어로 설치하세요: ollama pull ${this.embeddingModel}`
        )
      }

      // 3. 추론 모델 확인
      const hasInferenceModel = models.some((m) => m.name.includes(this.inferenceModel))
      if (!hasInferenceModel) {
        throw new Error(
          `추론 모델 '${this.inferenceModel}'이 설치되지 않았습니다.\n` +
            `다음 명령어로 설치하세요: ollama pull ${this.inferenceModel}`
        )
      }

      console.log('[OllamaProvider] 모델 확인 완료:')
      console.log(`  - 임베딩: ${this.embeddingModel}`)
      console.log(`  - 추론: ${this.inferenceModel}`)

      // 4. SQLite DB 로드 (sql.js 사용)
      await this.loadSQLiteDB()

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
    // SQLite DB 연결 정리
    if (this.db) {
      // sql.js의 close() 메서드 호출 (타입 단언)
      const sqlDb = this.db as { close: () => void }
      sqlDb.close()
      this.db = null
    }
    this.documents = []
    this.isInitialized = false
  }

  /**
   * 문서 추가 (TODO: Week 2에서 sql.js 연동)
   */
  async addDocument(document: {
    doc_id?: string
    title: string
    content: string
    library: string
    category?: string | null
    summary?: string | null
  }): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('OllamaProvider가 초기화되지 않았습니다')
    }

    // 문서 ID 생성 (제공되지 않은 경우)
    const docId = document.doc_id || `${document.library}_${Date.now()}`

    // TODO: Week 2에서 sql.js로 DB에 삽입
    // 현재는 메모리에만 추가
    const newDoc: DBDocument = {
      doc_id: docId,
      title: document.title,
      content: document.content,
      library: document.library,
      category: document.category || null,
      summary: document.summary || null
    }

    this.documents.push(newDoc)
    console.log(`[OllamaProvider] 문서 추가됨: ${docId}`)

    return docId
  }

  /**
   * 문서 수정 (TODO: Week 2에서 sql.js 연동)
   */
  async updateDocument(
    docId: string,
    updates: Partial<Pick<DBDocument, 'title' | 'content' | 'category' | 'summary'>>
  ): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('OllamaProvider가 초기화되지 않았습니다')
    }

    // TODO: Week 2에서 sql.js로 DB 업데이트
    // 현재는 메모리에서만 수정
    const docIndex = this.documents.findIndex((doc) => doc.doc_id === docId)

    if (docIndex === -1) {
      console.warn(`[OllamaProvider] 문서를 찾을 수 없음: ${docId}`)
      return false
    }

    // 필드 업데이트
    if (updates.title !== undefined) {
      this.documents[docIndex].title = updates.title
    }
    if (updates.content !== undefined) {
      this.documents[docIndex].content = updates.content
    }
    if (updates.category !== undefined) {
      this.documents[docIndex].category = updates.category
    }
    if (updates.summary !== undefined) {
      this.documents[docIndex].summary = updates.summary
    }

    console.log(`[OllamaProvider] 문서 수정됨: ${docId}`)
    return true
  }

  /**
   * 문서 삭제 (TODO: Week 2에서 sql.js 연동)
   */
  async deleteDocument(docId: string): Promise<boolean> {
    if (!this.isInitialized) {
      throw new Error('OllamaProvider가 초기화되지 않았습니다')
    }

    // TODO: Week 2에서 sql.js로 DB에서 삭제
    // 현재는 메모리에서만 삭제
    const docIndex = this.documents.findIndex((doc) => doc.doc_id === docId)

    if (docIndex === -1) {
      console.warn(`[OllamaProvider] 문서를 찾을 수 없음: ${docId}`)
      return false
    }

    this.documents.splice(docIndex, 1)
    console.log(`[OllamaProvider] 문서 삭제됨: ${docId}`)

    return true
  }

  /**
   * 문서 조회
   */
  async getDocument(docId: string): Promise<DBDocument | null> {
    if (!this.isInitialized) {
      throw new Error('OllamaProvider가 초기화되지 않았습니다')
    }

    const doc = this.documents.find((d) => d.doc_id === docId)
    return doc || null
  }

  /**
   * 전체 문서 수 조회
   */
  getDocumentCount(): number {
    return this.documents.length
  }

  async query(context: RAGContext): Promise<RAGResponse> {
    if (!this.isInitialized) {
      throw new Error('OllamaProvider가 초기화되지 않았습니다')
    }

    const startTime = Date.now()

    try {
      // 1. 키워드 검색 (FTS5 사용)
      console.log('[OllamaProvider] 키워드 검색 중...')
      const keywordResults = this.searchByKeyword(context.query)

      // 2. 검색 결과가 없으면 모든 문서에서 검색 (DBDocument → SearchResult 변환)
      const searchResults: SearchResult[] =
        keywordResults.length > 0
          ? keywordResults
          : this.documents.slice(0, this.topK).map((doc) => ({
              doc_id: doc.doc_id,
              title: doc.title,
              content: doc.content,
              library: doc.library,
              category: doc.category,
              score: 0.5 // 기본 스코어
            }))

      // 3. 관련 문서 컨텍스트 생성
      const contextText = this.buildContext(searchResults, context)

      // 4. 추론 모델로 응답 생성
      console.log('[OllamaProvider] 응답 생성 중...')
      const answer = await this.generateAnswer(contextText, context.query)

      const responseTime = Date.now() - startTime

      return {
        answer,
        sources: searchResults.map((result) => ({
          title: result.title,
          content: result.content.slice(0, 200) + '...',
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
   * SQLite DB 로드 (sql.js 사용)
   */
  private async loadSQLiteDB(): Promise<void> {
    console.log(`[OllamaProvider] SQLite DB 로드 중: ${this.vectorDbPath}`)

    try {
      // TODO: Week 2에서 sql.js 연동
      // 현재는 더미 데이터 사용
      console.log('[OllamaProvider] ⚠️ sql.js 미연동 - 더미 데이터 사용')

      // 더미 문서 (실제로는 DB에서 로드)
      this.documents = [
        {
          doc_id: 'scipy_ttest_ind',
          title: 'scipy.stats.ttest_ind',
          content:
            'Calculate the T-test for the means of two independent samples of scores. This test assumes that the populations have identical variances.',
          library: 'scipy',
          category: 'hypothesis',
          summary: 'Two independent samples t-test'
        },
        {
          doc_id: 'scipy_mannwhitneyu',
          title: 'scipy.stats.mannwhitneyu',
          content:
            'Compute the Mann-Whitney U statistic. The Mann-Whitney U test is a nonparametric test of the null hypothesis that the distribution underlying sample x is the same as the distribution underlying sample y.',
          library: 'scipy',
          category: 'hypothesis',
          summary: 'Mann-Whitney U test (nonparametric)'
        },
        {
          doc_id: 'numpy_mean',
          title: 'numpy.mean',
          content:
            'Compute the arithmetic mean along the specified axis. Returns the average of the array elements.',
          library: 'numpy',
          category: 'descriptive',
          summary: 'Arithmetic mean'
        }
      ]

      console.log(`[OllamaProvider] ✓ ${this.documents.length}개 문서 로드됨`)
    } catch (error) {
      throw new Error(
        `SQLite DB 로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`
      )
    }
  }

  /**
   * 키워드 검색 (FTS5 사용)
   */
  private searchByKeyword(query: string): SearchResult[] {
    // TODO: Week 2에서 FTS5 검색 구현
    // 현재는 간단한 문자열 매칭 사용
    console.log(`[OllamaProvider] 키워드 검색: "${query}"`)

    const queryLower = query.toLowerCase()
    const results: SearchResult[] = []

    for (const doc of this.documents) {
      const titleMatch = doc.title.toLowerCase().includes(queryLower)
      const contentMatch = doc.content.toLowerCase().includes(queryLower)

      if (titleMatch || contentMatch) {
        // 간단한 BM25 스코어 (제목 매칭에 더 높은 가중치)
        const score = titleMatch ? 0.9 : 0.7

        results.push({
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          library: doc.library,
          category: doc.category,
          score
        })
      }
    }

    // 스코어 순 정렬 후 Top-K
    results.sort((a, b) => b.score - a.score)
    return results.slice(0, this.topK)
  }

  /**
   * 임베딩 생성 (Vector 검색용, Week 2에서 구현)
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

    const data = (await response.json()) as EmbeddingResponse
    return data.embedding
  }

  /**
   * 컨텍스트 생성 (검색 결과 + 메서드 정보)
   */
  private buildContext(searchResults: SearchResult[], context: RAGContext): string {
    let contextText = '다음은 관련 문서입니다:\n\n'

    searchResults.forEach((result, index) => {
      contextText += `[문서 ${index + 1}] ${result.title}\n`
      contextText += `${result.content}\n\n`
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
          num_predict: 1000
        }
      })
    })

    if (!response.ok) {
      throw new Error(`응답 생성 실패: ${response.statusText}`)
    }

    const data = (await response.json()) as GenerateResponse
    return data.response.trim()
  }
}
