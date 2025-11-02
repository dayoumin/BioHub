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
import { IndexedDBStorage, type StoredDocument } from '../indexeddb-storage'

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
 * window 객체 확장 (sql.js 스크립트 로드 시 추가됨)
 */
declare global {
  interface Window {
    initSqlJs?: (config: { locateFile?: (file: string) => string }) => Promise<SqlJsStatic>
  }
}

/**
 * SQLite BLOB을 float 배열로 변환
 * Python에서 struct.pack('f', ...)로 저장된 데이터를 복원
 */
function blobToFloatArray(blob: Uint8Array): number[] {
  const floats: number[] = []
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength)

  // 4바이트씩 읽어서 float32로 변환
  for (let i = 0; i < blob.byteLength; i += 4) {
    floats.push(view.getFloat32(i, true)) // true = little-endian
  }

  return floats
}

/**
 * sql.js CDN 로더
 */
async function loadSqlJs(): Promise<SqlJsStatic> {
  // 브라우저 환경 체크
  if (typeof window === 'undefined') {
    throw new Error('sql.js는 브라우저 환경에서만 사용 가능합니다')
  }

  // ✅ 온라인 환경: CDN에서 로드 시도
  if (typeof window.initSqlJs === 'function') {
    const SQL = await window.initSqlJs({
      locateFile: (file: string) => `https://sql.js.org/dist/${file}`
    })
    return SQL as SqlJsStatic
  }

  // ✅ 오프라인 대응: 로컬 리소스에서 로드 (public/sql-wasm/)
  console.log('[sql.js] CDN 실패, 로컬 리소스 로드 시도...')

  return new Promise<SqlJsStatic>((resolve, reject) => {
    // 방법 1: 로컬 CDN 시도 (public/sql-wasm/)
    const localScript = document.createElement('script')
    localScript.src = '/sql-wasm/sql-wasm.js'
    localScript.async = true

    localScript.onload = async () => {
      try {
        if (typeof window.initSqlJs === 'function') {
          const SQL = await window.initSqlJs({
            locateFile: (file: string) => `/sql-wasm/${file}`
          })
          resolve(SQL as SqlJsStatic)
        } else {
          throw new Error('로컬 sql.js 로드 실패')
        }
      } catch (error) {
        console.warn('[sql.js] 로컬 로드 실패, CDN 폴백:', error)
        loadFromCDN(resolve, reject)
      }
    }

    localScript.onerror = () => {
      console.warn('[sql.js] 로컬 파일 없음, CDN 폴백')
      loadFromCDN(resolve, reject)
    }

    document.head.appendChild(localScript)
  })
}

/**
 * CDN에서 sql.js 로드 (폴백)
 */
function loadFromCDN(
  resolve: (value: SqlJsStatic) => void,
  reject: (reason?: unknown) => void
): void {
  const cdnScript = document.createElement('script')
  cdnScript.src = 'https://sql.js.org/dist/sql-wasm.js'
  cdnScript.async = true

  cdnScript.onload = async () => {
    try {
      if (typeof window.initSqlJs === 'function') {
        const SQL = await window.initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`
        })
        resolve(SQL as SqlJsStatic)
      } else {
        reject(new Error('sql.js 로드 실패'))
      }
    } catch (error) {
      reject(error)
    }
  }

  cdnScript.onerror = () => {
    reject(new Error('sql.js CDN 스크립트 로드 실패'))
  }

  document.head.appendChild(cdnScript)
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
  embedding: number[] | null  // 사전 생성된 임베딩 벡터
  embedding_model: string | null
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
    this.embeddingModel = config.embeddingModel || '' // 빈 문자열로 초기화, initialize()에서 자동 감지
    this.inferenceModel = config.inferenceModel || '' // 빈 문자열로 초기화, initialize()에서 자동 감지
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

      // 2. 임베딩 모델 자동 감지 또는 확인
      if (!this.embeddingModel) {
        // 모델이 지정되지 않았으면 자동 감지
        const embeddingModel = models.find((m) =>
          m.name.toLowerCase().includes('embed') ||
          m.name.toLowerCase().includes('embedding')
        )
        if (!embeddingModel) {
          throw new Error(
            '임베딩 모델을 찾을 수 없습니다.\n' +
            '다음 명령어로 설치하세요: ollama pull nomic-embed-text'
          )
        }
        this.embeddingModel = embeddingModel.name
        console.log(`[OllamaProvider] 임베딩 모델 자동 감지: ${this.embeddingModel}`)
      } else {
        // 지정된 모델이 설치되어 있는지 확인
        const hasEmbeddingModel = models.some((m) => m.name.includes(this.embeddingModel))
        if (!hasEmbeddingModel) {
          throw new Error(
            `임베딩 모델 '${this.embeddingModel}'이 설치되지 않았습니다.\n` +
            `다음 명령어로 설치하세요: ollama pull ${this.embeddingModel}`
          )
        }
      }

      // 3. 추론 모델 자동 감지 또는 확인
      if (!this.inferenceModel) {
        // 모델이 지정되지 않았으면 자동 감지 (임베딩 모델 제외)
        const inferenceModel = models.find((m) =>
          !m.name.toLowerCase().includes('embed') &&
          !m.name.toLowerCase().includes('embedding') &&
          (m.name.toLowerCase().includes('qwen') ||
           m.name.toLowerCase().includes('gemma') ||
           m.name.toLowerCase().includes('gpt'))
        )
        if (!inferenceModel) {
          throw new Error(
            '추론 모델을 찾을 수 없습니다.\n' +
            '다음 명령어로 설치하세요: ollama pull qwen2.5:3b'
          )
        }
        this.inferenceModel = inferenceModel.name
        console.log(`[OllamaProvider] 추론 모델 자동 감지: ${this.inferenceModel}`)
      } else {
        // 지정된 모델이 설치되어 있는지 확인
        const hasInferenceModel = models.some((m) => m.name.includes(this.inferenceModel))
        if (!hasInferenceModel) {
          throw new Error(
            `추론 모델 '${this.inferenceModel}'이 설치되지 않았습니다.\n` +
            `다음 명령어로 설치하세요: ollama pull ${this.inferenceModel}`
          )
        }
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

    // IndexedDB 초기화 (재구축 시 사용자 문서도 삭제)
    if (typeof window !== 'undefined' && !this.testMode) {
      await IndexedDBStorage.clearAllDocuments()
      console.log('[OllamaProvider] ✓ IndexedDB 초기화 완료')
    }
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
      summary: document.summary || null,
      embedding: null,  // 새 문서는 임베딩 없음
      embedding_model: null
    }

    this.documents.push(newDoc)

    const currentTime = Date.now()

    // IndexedDB에 저장 (영구 저장소 - 브라우저 환경에서만)
    if (typeof window !== 'undefined' && !this.testMode) {
      const storedDoc: StoredDocument = {
        doc_id: docId,
        title: document.title,
        content: document.content,
        library: document.library,
        category: document.category || null,
        summary: document.summary || null,
        created_at: currentTime,
        updated_at: currentTime
      }

      await IndexedDBStorage.saveDocument(storedDoc)
      console.log(`[OllamaProvider] ✓ IndexedDB 저장 완료: ${docId}`)
    }

    // 프로덕션 모드: SQLite 메모리 DB에도 삽입 (검색 성능)
    if (!this.testMode && this.db) {
      const currentTimeSec = Math.floor(currentTime / 1000)
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
          ${currentTimeSec},
          ${currentTimeSec},
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

    const currentTime = Date.now()

    // IndexedDB 업데이트 (영구 저장소)
    if (typeof window !== 'undefined' && !this.testMode) {
      // 기존 문서 조회
      const existingDoc = await IndexedDBStorage.getDocument(docId)

      if (existingDoc) {
        // 업데이트된 문서 생성
        const updatedDoc: StoredDocument = {
          ...existingDoc,
          title: updates.title !== undefined ? updates.title : existingDoc.title,
          content: updates.content !== undefined ? updates.content : existingDoc.content,
          category: updates.category !== undefined ? updates.category : existingDoc.category,
          summary: updates.summary !== undefined ? updates.summary : existingDoc.summary,
          updated_at: currentTime
        }

        await IndexedDBStorage.saveDocument(updatedDoc)
        console.log(`[OllamaProvider] ✓ IndexedDB 업데이트 완료: ${docId}`)
      }
    }

    // 프로덕션 모드: SQLite 메모리 DB도 업데이트
    if (!this.testMode && this.db) {
      const setClauses: string[] = []
      const currentTimeSec = Math.floor(currentTime / 1000)

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

      setClauses.push(`updated_at = ${currentTimeSec}`)

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

    // IndexedDB에서 삭제 (영구 저장소)
    if (typeof window !== 'undefined' && !this.testMode) {
      await IndexedDBStorage.deleteDocument(docId)
      console.log(`[OllamaProvider] ✓ IndexedDB 삭제 완료: ${docId}`)
    }

    // 프로덕션 모드: SQLite 메모리 DB에서도 삭제
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

  /**
   * 전체 문서 목록 조회
   */
  getAllDocuments(): Document[] {
    // DBDocument → Document 변환
    return this.documents.map((dbDoc) => ({
      doc_id: dbDoc.doc_id,
      title: dbDoc.title,
      content: dbDoc.content,
      library: dbDoc.library,
      category: dbDoc.category || undefined,
      summary: dbDoc.summary || undefined
    }))
  }

  async query(context: RAGContext): Promise<RAGResponse> {
    this.ensureInitialized()

    const startTime = Date.now()
    const searchMode = context.searchMode || 'hybrid' // 기본값: hybrid

    try {
      let searchResults: SearchResult[] = []

      // 검색 모드에 따라 다른 검색 수행
      if (searchMode === 'fts5') {
        // 1. FTS5 키워드 검색 (기존 방식)
        console.log('[OllamaProvider] FTS5 키워드 검색 중...')
        searchResults = this.searchByKeyword(context.query)
      } else if (searchMode === 'vector') {
        // 2. Vector 검색 (임베딩 기반)
        console.log('[OllamaProvider] Vector 검색 중...')
        searchResults = await this.searchByVector(context.query)
      } else if (searchMode === 'hybrid') {
        // 3. Hybrid 검색 (FTS5 + Vector 결합)
        console.log('[OllamaProvider] Hybrid 검색 중 (FTS5 + Vector)...')
        searchResults = await this.searchHybrid(context.query)
      }

      // 검색 결과가 없으면 모든 문서에서 상위 K개 반환 (Fallback)
      if (searchResults.length === 0) {
        console.log('[OllamaProvider] ⚠️ 검색 결과 없음 - Fallback: 상위 5개 문서 반환')
        searchResults = this.documents.slice(0, this.topK).map((doc) => ({
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          library: doc.library,
          category: doc.category,
          score: 0.5 // 기본 스코어
        }))
      }

      // 관련 문서 컨텍스트 생성
      const contextText = this.buildContext(searchResults, context)

      // 추론 모델로 응답 생성
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
          provider: `Ollama (Local - ${searchMode.toUpperCase()})`,
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
            summary: 'Two independent samples t-test',
            embedding: null,
            embedding_model: null
          },
          {
            doc_id: 'scipy_mannwhitneyu',
            title: 'scipy.stats.mannwhitneyu',
            content:
              'Compute the Mann-Whitney U statistic. The Mann-Whitney U test is a nonparametric test of the null hypothesis that the distribution underlying sample x is the same as the distribution underlying sample y.',
            library: 'scipy',
            category: 'hypothesis',
            summary: 'Mann-Whitney U test (nonparametric)',
            embedding: null,
            embedding_model: null
          },
          {
            doc_id: 'numpy_mean',
            title: 'numpy.mean',
            content:
              'Compute the arithmetic mean along the specified axis. Returns the average of the array elements.',
            library: 'numpy',
            category: 'descriptive',
            summary: 'Arithmetic mean',
            embedding: null,
            embedding_model: null
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

      // 4. documents 테이블에서 모든 문서 로드 (임베딩 포함)
      const result = this.db.exec(`
        SELECT doc_id, title, content, library, category, summary, embedding, embedding_model
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

        // 임베딩 BLOB 변환 (Uint8Array → number[])
        let embedding: number[] | null = null
        if (doc.embedding && doc.embedding instanceof Uint8Array) {
          try {
            embedding = blobToFloatArray(doc.embedding)
          } catch (error) {
            console.warn(`[OllamaProvider] 임베딩 변환 실패 (${doc.doc_id}):`, error)
          }
        }

        return {
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          library: doc.library,
          category: doc.category === null ? null : String(doc.category),
          summary: doc.summary === null ? null : String(doc.summary),
          embedding,
          embedding_model: doc.embedding_model === null ? null : String(doc.embedding_model)
        }
      })

      const embeddedDocsCount = this.documents.filter((d) => d.embedding !== null).length
      console.log(`[OllamaProvider] ✓ ${this.documents.length}개 원본 문서 로드됨 (임베딩: ${embeddedDocsCount}개)`)

      // 5-1. DB에서 임베딩 모델 확인 및 자동 설정
      const dbEmbeddingModel = this.documents.find((d) => d.embedding_model !== null)?.embedding_model
      if (dbEmbeddingModel) {
        if (this.embeddingModel && this.embeddingModel !== dbEmbeddingModel) {
          console.log(`[OllamaProvider] ℹ️ 임베딩 모델 자동 변경 (Vector Store 일치성 보장):`)
          console.log(`  - 설정값: ${this.embeddingModel}`)
          console.log(`  - DB 저장 모델: ${dbEmbeddingModel}`)
          console.log(`  → DB 모델로 자동 설정됩니다`)
        }
        this.embeddingModel = dbEmbeddingModel
        console.log(`[OllamaProvider] ✓ 임베딩 모델: ${this.embeddingModel}`)
      } else if (embeddedDocsCount > 0) {
        console.warn(`[OllamaProvider] ⚠️ 임베딩은 있지만 embedding_model 정보가 없습니다`)
      }

      // 6. IndexedDB에서 사용자 문서 로드 및 병합 (브라우저 환경에서만)
      if (typeof window !== 'undefined') {
        const userDocs = await IndexedDBStorage.getAllDocuments()

        if (userDocs.length > 0) {
          // StoredDocument → DBDocument 변환
          const userDBDocs: DBDocument[] = userDocs.map((doc) => ({
            doc_id: doc.doc_id,
            title: doc.title,
            content: doc.content,
            library: doc.library,
            category: doc.category,
            summary: doc.summary,
            embedding: null,  // 사용자 문서는 임베딩 없음 (실시간 생성 필요)
            embedding_model: null
          }))

          // 메모리 캐시에 병합
          this.documents = [...this.documents, ...userDBDocs]

          // SQLite 메모리 DB에도 추가 (검색 성능)
          if (this.db) {
            for (const doc of userDocs) {
              const wordCount = doc.content.split(/\s+/).length
              const createdAtSec = Math.floor(doc.created_at / 1000)
              const updatedAtSec = Math.floor(doc.updated_at / 1000)

              this.db.exec(`
                INSERT INTO documents (
                  doc_id, title, library, category,
                  content, summary,
                  created_at, updated_at, word_count
                ) VALUES (
                  '${this.escapeSQL(doc.doc_id)}',
                  '${this.escapeSQL(doc.title)}',
                  '${this.escapeSQL(doc.library)}',
                  ${doc.category ? `'${this.escapeSQL(doc.category)}'` : 'NULL'},
                  '${this.escapeSQL(doc.content)}',
                  ${doc.summary ? `'${this.escapeSQL(doc.summary)}'` : 'NULL'},
                  ${createdAtSec},
                  ${updatedAtSec},
                  ${wordCount}
                )
              `)
            }
          }

          console.log(`[OllamaProvider] ✓ ${userDocs.length}개 사용자 문서 병합됨 (IndexedDB)`)
        }
      }

      console.log(`[OllamaProvider] ✓ 총 ${this.documents.length}개 문서 로드 완료`)
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
   * Vector 검색 (임베딩 기반 의미론적 검색)
   */
  private async searchByVector(query: string): Promise<SearchResult[]> {
    console.log(`[OllamaProvider] Vector 검색: "${query}"`)

    try {
      // 1. 쿼리 임베딩 생성 (1개만 생성 - 빠름!)
      const startTime = Date.now()
      const queryEmbedding = await this.generateEmbedding(query)
      const embeddingTime = Date.now() - startTime
      console.log(`[OllamaProvider] 쿼리 임베딩 생성: ${embeddingTime}ms`)

      // 2. 사전 생성된 임베딩이 있는 문서만 필터링
      const docsWithEmbeddings = this.documents.filter((doc) => doc.embedding !== null)

      if (docsWithEmbeddings.length === 0) {
        console.warn('[OllamaProvider] ⚠️ 임베딩이 있는 문서가 없습니다. Fallback to FTS5.')
        return []
      }

      // 3. 사전 생성된 임베딩으로 코사인 유사도 계산 (매우 빠름!)
      const results: SearchResult[] = []

      for (const doc of docsWithEmbeddings) {
        // DB에서 로드한 사전 생성 임베딩 사용 (API 호출 없음!)
        const docEmbedding = doc.embedding!

        // 코사인 유사도 계산
        const similarity = this.cosineSimilarity(queryEmbedding, docEmbedding)

        results.push({
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          library: doc.library,
          category: doc.category,
          score: similarity
        })
      }

      // 유사도 순 정렬 후 Top-K
      results.sort((a, b) => b.score - a.score)
      const totalTime = Date.now() - startTime
      console.log(`[OllamaProvider] Vector 검색 완료: ${totalTime}ms (${docsWithEmbeddings.length}개 문서)`)

      return results.slice(0, this.topK)
    } catch (error) {
      console.error('[OllamaProvider] Vector 검색 실패:', error)
      // Fallback: 빈 배열 반환 (query에서 Fallback 처리)
      return []
    }
  }

  /**
   * Hybrid 검색 (FTS5 + Vector 결합)
   *
   * Reciprocal Rank Fusion (RRF) 알고리즘 사용:
   * RRF(d) = Σ 1 / (k + rank(d))
   *
   * k = 60 (상수, 논문에서 검증된 값)
   */
  private async searchHybrid(query: string): Promise<SearchResult[]> {
    console.log(`[OllamaProvider] Hybrid 검색: "${query}"`)

    try {
      // 1. FTS5 검색
      const fts5Results = this.searchByKeyword(query)

      // 2. Vector 검색
      const vectorResults = await this.searchByVector(query)

      // 3. RRF로 결합
      const k = 60
      const rrfScores = new Map<string, number>()

      // FTS5 결과 RRF 점수 계산
      fts5Results.forEach((result, index) => {
        const rank = index + 1
        const rrfScore = 1 / (k + rank)
        rrfScores.set(result.doc_id, (rrfScores.get(result.doc_id) || 0) + rrfScore)
      })

      // Vector 결과 RRF 점수 계산
      vectorResults.forEach((result, index) => {
        const rank = index + 1
        const rrfScore = 1 / (k + rank)
        rrfScores.set(result.doc_id, (rrfScores.get(result.doc_id) || 0) + rrfScore)
      })

      // 4. 모든 문서 정보 매핑 (doc_id → Document)
      const docMap = new Map<string, DBDocument>()
      this.documents.forEach((doc) => docMap.set(doc.doc_id, doc))

      // 5. RRF 점수 기준 정렬
      const hybridResults: SearchResult[] = Array.from(rrfScores.entries())
        .map(([doc_id, score]) => {
          const doc = docMap.get(doc_id)
          if (!doc) {
            throw new Error(`문서를 찾을 수 없습니다: ${doc_id}`)
          }

          return {
            doc_id: doc.doc_id,
            title: doc.title,
            content: doc.content,
            library: doc.library,
            category: doc.category,
            score
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, this.topK)

      console.log(`[OllamaProvider] Hybrid 검색 완료: ${hybridResults.length}개 문서 (FTS5: ${fts5Results.length}, Vector: ${vectorResults.length})`)
      return hybridResults
    } catch (error) {
      console.error('[OllamaProvider] Hybrid 검색 실패:', error)
      // Fallback: FTS5만 사용
      return this.searchByKeyword(query)
    }
  }

  /**
   * 코사인 유사도 계산
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error('벡터 길이가 다릅니다')
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i]
      norm1 += vec1[i] * vec1[i]
      norm2 += vec2[i] * vec2[i]
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)
    if (magnitude === 0) {
      return 0
    }

    return dotProduct / magnitude
  }

  /**
   * 임베딩 생성 (Vector 검색용, Week 2에서 구현)
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // 텍스트 길이 제한 (임베딩 모델은 보통 512 토큰 제한)
    // 대략 1 토큰 = 4자로 가정하여 2000자로 제한
    const MAX_CHARS = 2000
    const truncatedText = text.length > MAX_CHARS
      ? text.slice(0, MAX_CHARS) + '...'
      : text

    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.embeddingModel,
          prompt: truncatedText
        })
      })

      if (!response.ok) {
        // 에러 응답 본문 읽기
        let errorDetail = response.statusText
        try {
          const errorData = await response.json()
          errorDetail = errorData.error || errorData.message || response.statusText
        } catch {
          // JSON 파싱 실패 시 statusText 사용
        }

        console.error('[OllamaProvider] 임베딩 생성 실패 상세:', {
          status: response.status,
          statusText: response.statusText,
          errorDetail,
          model: this.embeddingModel,
          textLength: text.length,
          truncatedLength: truncatedText.length
        })

        throw new Error(`임베딩 생성 실패 (${response.status}): ${errorDetail}`)
      }

      const data = (await response.json()) as EmbeddingResponse

      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('임베딩 응답 형식이 올바르지 않습니다')
      }

      return data.embedding
    } catch (error) {
      if (error instanceof Error) {
        console.error('[OllamaProvider] 임베딩 생성 에러:', error.message)
        throw error
      }
      throw new Error('임베딩 생성 중 알 수 없는 오류 발생')
    }
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

답변 형식 규칙:
- **문서 우선**: 제공된 문서의 정보를 우선적으로 사용하세요
- **마크다운 필수**: 제목(##), 리스트(-), 강조(**) 등을 활용하여 구조화하세요
- **용어 병기**: 통계 용어는 한글과 영문을 함께 표기하세요 (예: 귀무가설(Null Hypothesis))
- **핵심 먼저**: 결론을 먼저 제시한 후, 상세 설명을 추가하세요
- **주의사항 명시**: 적용 조건이나 제약사항이 있으면 명확히 표시하세요
- **추론 과정 숨김**: <think>, </think>, <sensitive> 같은 내부 태그를 절대 사용하지 마세요

답변 구조 (권장):
1. 간단한 요약 (1-2문장)
2. 상세 설명 (마크다운 활용)
3. 주의사항 또는 추가 정보`

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
          num_predict: 3000 // Increased from 1000 to prevent truncation
        }
      })
    })

    if (!response.ok) {
      throw new Error(`응답 생성 실패: ${response.statusText}`)
    }

    const data = (await response.json()) as GenerateResponse
    let answer = data.response.trim()

    // <think> 태그 및 내용 제거 (후처리)
    // 패턴 1: <think>...</think> 태그와 내용 모두 제거
    answer = answer.replace(/<think>[\s\S]*?<\/think>/gi, '')
    // 패턴 2: HTML 이스케이프된 태그도 제거
    answer = answer.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '')
    // 패턴 3: -sensitive <think> 형태 제거
    answer = answer.replace(/-?sensitive\s*<think>[\s\S]*?<\/think>/gi, '')
    // 패턴 4: 줄 시작의 -sensitive 제거
    answer = answer.replace(/^-?sensitive\s*/im, '')

    return answer.trim()
  }

  /**
   * Ollama 스트리밍 응답 생성 (단어/토큰별 실시간 반환)
   *
   * @param contextText - RAG 검색 결과로 생성한 컨텍스트
   * @param query - 사용자 질문
   * @yields 생성된 응답의 토큰들
   */
  async *streamGenerateAnswer(contextText: string, query: string): AsyncGenerator<string> {
    const systemPrompt = `당신은 통계 분석 전문가입니다. 제공된 문서를 참고하여 사용자의 질문에 정확하고 친절하게 답변해주세요.

답변 형식 규칙:
- **문서 우선**: 제공된 문서의 정보를 우선적으로 사용하세요
- **마크다운 필수**: 제목(##), 리스트(-), 강조(**) 등을 활용하여 구조화하세요
- **용어 병기**: 통계 용어는 한글과 영문을 함께 표기하세요 (예: 귀무가설(Null Hypothesis))
- **핵심 먼저**: 결론을 먼저 제시한 후, 상세 설명을 추가하세요
- **주의사항 명시**: 적용 조건이나 제약사항이 있으면 명확히 표시하세요
- **추론 과정 숨김**: <think>, </think>, <sensitive> 같은 내부 태그를 절대 사용하지 마세요

답변 구조 (권장):
1. 간단한 요약 (1-2문장)
2. 상세 설명 (마크다운 활용)
3. 주의사항 또는 추가 정보`

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
        stream: true, // 스트리밍 활성화
        options: {
          temperature: 0.7,
          top_p: 0.9,
          num_predict: 3000
        }
      })
    })

    if (!response.ok) {
      throw new Error(`응답 생성 실패: ${response.statusText}`)
    }

    // ReadableStream으로 스트리밍 처리
    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('응답 스트림을 읽을 수 없습니다')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')

        // 마지막 불완전한 라인은 다음 반복을 위해 보관
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim() === '') continue

          try {
            const json = JSON.parse(line) as { response?: string; done?: boolean }
            if (json.response) {
              // <think> 태그 제거 (스트리밍 중)
              let chunk = json.response
              chunk = chunk.replace(/<think>[\s\S]*?<\/think>/gi, '')
              chunk = chunk.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '')
              chunk = chunk.replace(/-?sensitive\s*<think>[\s\S]*?<\/think>/gi, '')
              chunk = chunk.replace(/^-?sensitive\s*/im, '')

              if (chunk) {
                yield chunk
              }
            }
          } catch {
            // JSON 파싱 실패는 무시 (불완전한 데이터일 수 있음)
            console.debug('[streamGenerateAnswer] JSON 파싱 실패:', line)
          }
        }
      }

      // 남은 버퍼 처리
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer) as { response?: string }
          if (json.response) {
            let chunk = json.response
            chunk = chunk.replace(/<think>[\s\S]*?<\/think>/gi, '')
            chunk = chunk.replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '')
            chunk = chunk.replace(/-?sensitive\s*<think>[\s\S]*?<\/think>/gi, '')
            chunk = chunk.replace(/^-?sensitive\s*/im, '')

            if (chunk) {
              yield chunk
            }
          }
        } catch {
          console.debug('[streamGenerateAnswer] 최종 버퍼 JSON 파싱 실패')
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
