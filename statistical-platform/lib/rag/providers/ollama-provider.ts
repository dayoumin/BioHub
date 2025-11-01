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

import {
  BaseRAGProvider,
  RAGContext,
  RAGResponse,
  RAGProviderConfig,
  DocumentInput,
  Document
} from './base-provider'

/**
 * sql.js 타입 정의 (브라우저 SQLite)
 */
interface SqlJsStatic {
  Database: new (data?: Uint8Array) => SqlJsDatabase
}

interface SqlJsDatabase {
  exec(sql: string): SqlJsExecResult[]
  close(): void
}

interface SqlJsExecResult {
  columns: string[]
  values: unknown[][]
}

/**
 * sql.js CDN 로더
 */
async function loadSqlJs(): Promise<SqlJsStatic> {
  // 브라우저 환경 체크
  if (typeof window === 'undefined') {
    throw new Error('sql.js는 브라우저 환경에서만 사용 가능합니다')
  }

  // @ts-expect-error - window.initSqlJs is loaded from CDN
  if (typeof window.initSqlJs === 'function') {
    // @ts-expect-error - CDN script provides this
    return await window.initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    })
  }

  // CDN 스크립트가 없으면 동적 로드 시도
  console.log('[sql.js] CDN 스크립트 동적 로드 시도...')

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://sql.js.org/dist/sql-wasm.js'
    script.async = true

    script.onload = async () => {
      // @ts-expect-error - CDN에서 로드됨
      if (typeof window.initSqlJs === 'function') {
        // @ts-expect-error - CDN에서 로드됨
        const SQL = await window.initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        })
        resolve(SQL)
      } else {
        reject(new Error('sql.js 로드 실패'))
      }
    }

    script.onerror = () => {
      reject(new Error('sql.js CDN 스크립트 로드 실패'))
    }

    document.head.appendChild(script)
  })
}

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
  /** 테스트 모드 (in-memory 데이터 사용, 기본: false) */
  testMode?: boolean
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

// DocumentInput은 base-provider.ts에서 export됨

export class OllamaRAGProvider extends BaseRAGProvider {
  private ollamaEndpoint: string
  private embeddingModel: string
  private inferenceModel: string
  private vectorDbPath: string
  private topK: number
  private testMode: boolean
  private isInitialized = false

  // SQLite DB (sql.js 사용)
  private db: SqlJsDatabase | null = null
  private documents: DBDocument[] = []

  constructor(config: OllamaProviderConfig) {
    super(config)

    this.ollamaEndpoint = config.ollamaEndpoint || 'http://localhost:11434'
    this.embeddingModel = config.embeddingModel || 'nomic-embed-text'
    this.inferenceModel = config.inferenceModel || 'qwen2.5:3b'
    this.vectorDbPath = config.vectorDbPath || '/rag-data/rag.db'
    this.topK = config.topK || 5
    this.testMode = config.testMode || false
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
      this.db.close()
      this.db = null
    }
    this.documents = []
    this.isInitialized = false
  }

  /**
   * Helper: 초기화 확인
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('OllamaProvider가 초기화되지 않았습니다')
    }
  }

  /**
   * Helper: 문서 인덱스 검색
   * @returns 문서 인덱스 또는 null (찾지 못한 경우)
   */
  private findDocumentIndex(docId: string): number | null {
    const index = this.documents.findIndex((doc) => doc.doc_id === docId)
    if (index === -1) {
      console.warn(`[OllamaProvider] 문서를 찾을 수 없음: ${docId}`)
      return null
    }
    return index
  }

  /**
   * Helper: SQL Injection 방지 (작은따옴표 이스케이프)
   */
  private escapeSQL(value: string): string {
    return value.replace(/'/g, "''")
  }

  /**
   * 문서 추가 (SQLite 연동 또는 테스트 모드)
   */
  async addDocument(document: DocumentInput): Promise<string> {
    this.ensureInitialized()

    // 문서 ID 생성 (제공되지 않은 경우)
    const docId = document.doc_id || `${document.library}_${Date.now()}`

    // 메모리 캐시에 추가
    const newDoc: DBDocument = {
      doc_id: docId,
      title: document.title,
      content: document.content,
      library: document.library,
      category: document.category || null,
      summary: document.summary || null
    }

    this.documents.push(newDoc)

    // 프로덕션 모드: SQLite에도 삽입
    if (!this.testMode && this.db) {
      const currentTime = Math.floor(Date.now() / 1000)
      const wordCount = document.content.split(/\s+/).length

      this.db.exec(`
        INSERT INTO documents (
          doc_id, title, library, category,
          content, summary,
          created_at, updated_at, word_count
        ) VALUES (
          '${this.escapeSQL(docId)}',
          '${this.escapeSQL(document.title)}',
          '${this.escapeSQL(document.library)}',
          ${document.category ? `'${this.escapeSQL(document.category)}'` : 'NULL'},
          '${this.escapeSQL(document.content)}',
          ${document.summary ? `'${this.escapeSQL(document.summary)}'` : 'NULL'},
          ${currentTime},
          ${currentTime},
          ${wordCount}
        )
      `)
    }

    console.log(`[OllamaProvider] 문서 추가됨: ${docId}`)
    return docId
  }

  /**
   * 문서 수정 (SQLite 연동 또는 테스트 모드)
   */
  async updateDocument(
    docId: string,
    updates: Partial<Pick<DBDocument, 'title' | 'content' | 'category' | 'summary'>>
  ): Promise<boolean> {
    this.ensureInitialized()

    const docIndex = this.findDocumentIndex(docId)

    if (docIndex === null) {
      return false
    }

    // 메모리 캐시 업데이트
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

    // 프로덕션 모드: SQLite도 업데이트
    if (!this.testMode && this.db) {
      const setClauses: string[] = []
      const currentTime = Math.floor(Date.now() / 1000)

      if (updates.title !== undefined) {
        setClauses.push(`title = '${this.escapeSQL(updates.title)}'`)
      }
      if (updates.content !== undefined) {
        setClauses.push(`content = '${this.escapeSQL(updates.content)}'`)
        const wordCount = updates.content.split(/\s+/).length
        setClauses.push(`word_count = ${wordCount}`)
      }
      if (updates.category !== undefined) {
        setClauses.push(
          updates.category === null ? 'category = NULL' : `category = '${this.escapeSQL(updates.category)}'`
        )
      }
      if (updates.summary !== undefined) {
        setClauses.push(
          updates.summary === null ? 'summary = NULL' : `summary = '${this.escapeSQL(updates.summary)}'`
        )
      }

      setClauses.push(`updated_at = ${currentTime}`)

      this.db.exec(`
        UPDATE documents
        SET ${setClauses.join(', ')}
        WHERE doc_id = '${this.escapeSQL(docId)}'
      `)
    }

    console.log(`[OllamaProvider] 문서 수정됨: ${docId}`)
    return true
  }

  /**
   * 문서 삭제 (SQLite 연동 또는 테스트 모드)
   */
  async deleteDocument(docId: string): Promise<boolean> {
    this.ensureInitialized()

    const docIndex = this.findDocumentIndex(docId)

    if (docIndex === null) {
      return false
    }

    // 메모리 캐시에서 삭제
    this.documents.splice(docIndex, 1)

    // 프로덕션 모드: SQLite에서도 삭제
    if (!this.testMode && this.db) {
      this.db.exec(`
        DELETE FROM documents
        WHERE doc_id = '${this.escapeSQL(docId)}'
      `)
    }

    console.log(`[OllamaProvider] 문서 삭제됨: ${docId}`)
    return true
  }

  /**
   * 문서 조회
   */
  async getDocument(docId: string): Promise<Document | null> {
    this.ensureInitialized()

    const dbDoc = this.documents.find((d) => d.doc_id === docId)
    if (!dbDoc) {
      return null
    }

    // DBDocument → Document 변환
    return {
      doc_id: dbDoc.doc_id,
      title: dbDoc.title,
      content: dbDoc.content,
      library: dbDoc.library,
      category: dbDoc.category || undefined,
      summary: dbDoc.summary || undefined
    }
  }

  /**
   * 전체 문서 수 조회
   */
  getDocumentCount(): number {
    return this.documents.length
  }

  async query(context: RAGContext): Promise<RAGResponse> {
    this.ensureInitialized()

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
   * SQLite DB 로드 (sql.js 사용 또는 테스트 모드)
   */
  private async loadSQLiteDB(): Promise<void> {
    console.log(`[OllamaProvider] SQLite DB 로드 중: ${this.vectorDbPath}`)

    try {
      // 테스트 모드: 더미 데이터 사용
      if (this.testMode) {
        console.log('[OllamaProvider] ⚠️ 테스트 모드 - 더미 데이터 사용')

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

        console.log(`[OllamaProvider] ✓ ${this.documents.length}개 더미 문서 로드됨`)
        return
      }

      // 프로덕션 모드: sql.js 사용
      // 1. sql.js 라이브러리 로드
      console.log('[OllamaProvider] sql.js 로딩 중...')
      const SQL = await loadSqlJs()

      // 2. SQLite DB 파일 다운로드
      console.log(`[OllamaProvider] DB 파일 다운로드 중: ${this.vectorDbPath}`)
      const response = await fetch(this.vectorDbPath)

      if (!response.ok) {
        throw new Error(`DB 파일을 찾을 수 없습니다: ${this.vectorDbPath}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // 3. sql.js Database 초기화
      this.db = new SQL.Database(uint8Array)
      console.log('[OllamaProvider] ✓ DB 연결 성공')

      // 4. documents 테이블에서 모든 문서 로드
      const result = this.db.exec(`
        SELECT doc_id, title, content, library, category, summary
        FROM documents
        ORDER BY created_at DESC
      `)

      if (result.length === 0 || result[0].values.length === 0) {
        console.warn('[OllamaProvider] ⚠️ DB에 문서가 없습니다')
        this.documents = []
        return
      }

      // 5. 결과를 DBDocument[] 형식으로 변환
      const columns = result[0].columns
      const values = result[0].values

      this.documents = values.map((row) => {
        const doc: Record<string, unknown> = {}
        columns.forEach((col, index) => {
          doc[col] = row[index]
        })

        // 타입 가드로 안전하게 변환
        if (
          typeof doc.doc_id !== 'string' ||
          typeof doc.title !== 'string' ||
          typeof doc.content !== 'string' ||
          typeof doc.library !== 'string'
        ) {
          throw new Error('DB 스키마 오류: 필수 필드 누락')
        }

        return {
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          library: doc.library,
          category: doc.category === null ? null : String(doc.category),
          summary: doc.summary === null ? null : String(doc.summary)
        }
      })

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
