/**
 * Ollama RAG Provider (SQLite 연동)
 *
 * Ollama를 사용하는 완전 로컬 RAG 제공자
 * - 임베딩: Ollama에 설치된 embedding 모델 자동 감지
 * - 추론: Ollama에 설치된 추론 모델 자동 감지 (우선순위: qwen > gemma > gpt > 기타)
 * - Vector DB: SQLite (sql.js로 브라우저에서 실행)
 *
 * 설치:
 * 1. Ollama 설치: https://ollama.com/download
 * 2. 모델 다운로드 (예시):
 *    ollama pull nomic-embed-text
 *    ollama pull qwen2.5
 *    # 또는 다른 모델: gemma, mistral, neural-chat 등
 */

import {
  BaseRAGProvider,
  RAGContext,
  RAGResponse,
  RAGProviderConfig,
  DocumentInput,
  Document
} from './base-provider'
import { IndexedDBStorage, type StoredDocument, type StoredEmbedding } from '../indexeddb-storage'
import initSqlJs from '@jlongster/sql.js'
import {
  initSqlWithIndexedDB,
  persistDB,
  type SqlJsStatic,
  type SqlJsDatabase,
  type SqlJsExecResult
} from '../utils/sql-indexeddb'
import { chunkDocument, estimateTokens } from '../utils/chunking'
import { vectorToBlob } from '../utils/blob-utils'
import { detectEnvironment } from '@/lib/utils/environment-detector'

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
 * sql.js 로더 (npm 패키지 사용 - 완전 오프라인)
 */
async function loadSqlJs(): Promise<SqlJsStatic> {
  // 브라우저 환경 체크
  if (typeof window === 'undefined') {
    throw new Error('sql.js는 브라우저 환경에서만 사용 가능합니다')
  }

  console.log('[sql.js] npm 패키지에서 로드 중...')

  // npm 패키지 사용 (완전 오프라인, CDN 의존성 없음)
  const SQL = await initSqlJs({
    locateFile: (file: string) => `/sql-wasm/${file}`
  })

  console.log('[sql.js] ✓ 로드 완료 (오프라인 모드)')
  return SQL as unknown as SqlJsStatic
}

export interface OllamaProviderConfig extends RAGProviderConfig {
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

interface EmbeddingResponse {
  embedding: number[]
}

interface GenerateResponse {
  model: string
  created_at: string
  response: string
  done: boolean
}

export interface SearchResult {
  doc_id: string
  title: string
  content: string
  library: string
  category: string | null
  score: number
}

export interface DBDocument {
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
  private SQL: any = null  // absurd-sql용 SQL 객체 저장
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

    // 0. Ollama 가용성 체크 (endpoint 기반)
    // - NEXT_PUBLIC_OLLAMA_ENDPOINT 설정됨 → 어디서든 허용
    // - 설정 없음 + localhost → 허용
    // - 설정 없음 + 원격 → 차단
    const hasExplicitEndpoint = !!process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT

    if (!hasExplicitEndpoint && detectEnvironment() === 'web') {
      throw new Error('RAG 챗봇은 로컬 환경에서만 사용 가능합니다. NEXT_PUBLIC_OLLAMA_ENDPOINT를 설정하거나 localhost에서 실행해주세요.')
    }

    // 1. Ollama 서버 연결 확인
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000) // 3초 타임아웃

      const response = await fetch(`${this.ollamaEndpoint}/api/tags`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Ollama 서버에 연결할 수 없습니다')
      }

      const data = (await response.json()) as unknown

      // 타입 가드: models 배열 추출
      if (typeof data !== 'object' || data === null) {
        throw new Error('Ollama API 응답이 유효하지 않습니다')
      }

      const record = data as Record<string, unknown>
      if (!Array.isArray(record.models)) {
        throw new Error('Ollama API에서 모델 목록을 찾을 수 없습니다')
      }

      // 모델 목록을 안전하게 추출
      const models: Array<{ name: string }> = record.models
        .map((m: unknown) => {
          if (typeof m === 'object' && m !== null) {
            const modelRecord = m as Record<string, unknown>
            if (typeof modelRecord.name === 'string') {
              return { name: modelRecord.name }
            }
          }
          return null
        })
        .filter((m): m is { name: string } => m !== null)

      if (models.length === 0) {
        throw new Error('Ollama에 설치된 모델이 없습니다')
      }

      // 2. 임베딩 모델 자동 감지 또는 확인
      if (!this.embeddingModel) {
        // 모델이 지정되지 않았으면 RAM 기반 동적 추천
        try {
          // dynamic import를 사용하여 순환 의존성 방지
          const { getRecommendedEmbeddingModel } = await import('@/lib/rag/utils/model-recommender')
          const recommendedEmbeddingModel = await getRecommendedEmbeddingModel(this.ollamaEndpoint)

          if (recommendedEmbeddingModel) {
            this.embeddingModel = recommendedEmbeddingModel
            console.log(`[OllamaProvider] 추천 임베딩 모델 사용: ${this.embeddingModel}`)
          } else {
            throw new Error('추천할 임베딩 모델을 찾을 수 없습니다')
          }
        } catch (error) {
          console.warn('[OllamaProvider] 동적 임베딩 모델 추천 실패, 폴백 로직 사용:', error)

          // 폴백: 간단한 필터링으로 선택 (이전 방식)
          const embeddingModel = models.find((m) => {
            const lower = m.name.toLowerCase()
            return lower.includes('nomic-embed')
          }) || models.find((m) => {
            const lower = m.name.toLowerCase()
            return lower.includes('embed') && lower.includes('text')
          }) || models.find((m) => {
            const lower = m.name.toLowerCase()
            return lower.includes('embed') || lower.includes('embedding')
          })

          if (!embeddingModel) {
            const availableModels = models.map((m) => m.name).join(', ')
            throw new Error(
              '임베딩 모델을 찾을 수 없습니다.\n' +
              `사용 가능한 모델: ${availableModels || '없음'}\n` +
              '다음 명령어로 설치하세요: ollama pull nomic-embed-text'
            )
          }
          this.embeddingModel = embeddingModel.name
          console.log(`[OllamaProvider] 폴백 임베딩 모델 사용: ${this.embeddingModel}`)
        }
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
        // 동적 모델 추천 시스템 사용 (GPU RAM 기반)
        try {
          // dynamic import를 사용하여 순환 의존성 방지
          const { getRecommendedModel } = await import('@/lib/rag/utils/model-recommender')
          const recommendedModel = await getRecommendedModel(this.ollamaEndpoint)

          if (recommendedModel) {
            this.inferenceModel = recommendedModel
            console.log(`[OllamaProvider] 추천 모델 사용: ${this.inferenceModel}`)
          } else {
            throw new Error('추천할 추론 모델을 찾을 수 없습니다')
          }
        } catch (error) {
          console.warn('[OllamaProvider] 동적 모델 추천 실패, 폴백 로직 사용:', error)

          // 폴백: 기존 우선순위 기반 선택
          const nonEmbeddingModels = models.filter(
            (m) =>
              !m.name.toLowerCase().includes('embed') &&
              !m.name.toLowerCase().includes('embedding')
          )

          const inferenceModel = nonEmbeddingModels.sort((a, b) => {
            const getPriority = (name: string): number => {
              const lower = name.toLowerCase()
              if (lower.includes('qwen')) return 0
              if (lower.includes('gemma')) return 1
              if (lower.includes('deepseek')) return 2
              if (lower.includes('llama')) return 3
              return 4
            }
            return getPriority(a.name) - getPriority(b.name)
          })[0]

          if (!inferenceModel) {
            const allModelNames = models.map((m) => m.name).join(', ')
            throw new Error(
              '추론 가능한 모델을 찾을 수 없습니다.\n' +
              `설치된 모델: ${allModelNames || '없음'}\n` +
              '다음 중 하나를 설치하세요:\n' +
              '  ollama pull qwen3\n' +
              '  ollama pull gemma3\n' +
              '  ollama pull llama3.2\n' +
              '  또는 다른 대형 언어 모델'
            )
          }
          this.inferenceModel = inferenceModel.name
          console.log(`[OllamaProvider] 폴백 모델 사용: ${this.inferenceModel}`)
        }
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

  /**
   * 사용 가능한 모든 Ollama 모델 목록 반환
   * (전체 모델 목록 - 임베딩/추론 구분 없음)
   */
  async getAllAvailableModels(): Promise<Array<{ name: string }>> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`)
      if (!response.ok) {
        console.warn('[OllamaProvider] 모델 목록 조회 실패:', response.statusText)
        return []
      }

      const data = (await response.json()) as { models: Array<{ name: string }> }
      return data.models || []
    } catch (error) {
      console.warn('[OllamaProvider] 모델 목록 조회 중 오류:', error)
      return []
    }
  }

  /**
   * 사용 가능한 임베딩 모델 목록 반환
   * (embedding/embedding 포함된 모델만)
   */
  async getAvailableEmbeddingModels(): Promise<string[]> {
    const allModels = await this.getAllAvailableModels()
    return allModels
      .filter((m) =>
        m.name.toLowerCase().includes('embed') ||
        m.name.toLowerCase().includes('embedding')
      )
      .map((m) => m.name)
  }

  /**
   * 사용 가능한 추론 모델 목록 반환
   * (embedding/embedding 제외된 모델만)
   */
  async getAvailableInferenceModels(): Promise<string[]> {
    const allModels = await this.getAllAvailableModels()
    return allModels
      .filter(
        (m) =>
          !m.name.toLowerCase().includes('embed') &&
          !m.name.toLowerCase().includes('embedding')
      )
      .map((m) => m.name)
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
   * Helper: LLM 응답에서 내부 추론 태그 제거
   *
   * 제거 대상:
   * - <think>...</think>: 모델의 내부 사고 과정
   * - &lt;think&gt;...&lt;/think&gt;: HTML 이스케이프된 태그
   * - -sensitive: 민감 정보 마커
   */
  private cleanThinkTags(text: string): string {
    return text
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/&lt;think&gt;[\s\S]*?&lt;\/think&gt;/gi, '')
      .replace(/-?sensitive\s*<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^-?sensitive\s*/im, '')
  }

  /**
   * Helper: 토큰 수 추정 (간단한 휴리스틱)
   *
   * 정확한 토큰화는 모델별 토크나이저가 필요하지만,
   * 성능 모니터링 목적으로는 근사치로 충분합니다.
   *
   * 추정 방식:
   * - 영문: ~4자 = 1토큰
   * - 한글: ~2자 = 1토큰
   * - 공백/구두점: 별도 카운트
   */
  private estimateTokenCount(text: string): number {
    // 한글 문자 수
    const koreanChars = (text.match(/[\u3131-\uD79D]/g) || []).length
    // 영문 + 숫자
    const alphanumericChars = (text.match(/[a-zA-Z0-9]/g) || []).length
    // 공백 + 구두점
    const whitespaceAndPunctuation = (text.match(/[\s\p{P}]/gu) || []).length

    // 추정 토큰 수
    const estimatedTokens =
      Math.ceil(koreanChars / 2) + // 한글 2자 ≈ 1토큰
      Math.ceil(alphanumericChars / 4) + // 영문 4자 ≈ 1토큰
      whitespaceAndPunctuation * 0.5 // 공백/구두점 ≈ 0.5토큰

    return Math.max(1, Math.round(estimatedTokens))
  }

  /**
   * 문서 추가 (청크 기반 임베딩 - Phase 3)
   *
   * 변경 사항:
   * - 문서를 500 토큰 청크로 분할
   * - 각 청크별 임베딩 생성
   * - embeddings 테이블에 저장
   * - IndexedDB embeddings 스토어에도 저장
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
      embedding: null,  // Phase 3: 더 이상 단일 임베딩 사용 안 함
      embedding_model: null
    }

    this.documents.push(newDoc)

    const currentTime = Date.now()
    const currentTimeSec = Math.floor(currentTime / 1000)

    // IndexedDB에 문서 메타데이터 저장
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
      console.log(`[OllamaProvider] ✓ 문서 메타데이터 저장 완료: ${docId}`)
    }

    // SQLite documents 테이블에 문서 메타데이터 저장
    if (!this.testMode && this.db) {
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

    // ========== Phase 3: 청크 기반 임베딩 생성 ==========

    // 1. 문서 청킹
    const chunks = chunkDocument(document.content, {
      maxTokens: 500,
      overlapTokens: 50,
      preserveBoundaries: true
    })

    // 빈 문서 처리 (청크 0개)
    if (chunks.length === 0) {
      console.log(`[OllamaProvider] ⚠️ 빈 문서 - 임베딩 생성 건너뜀: ${docId}`)
      return docId
    }

    console.log(`[OllamaProvider] 문서 청킹 완료: ${chunks.length}개 청크 생성`)

    // 2. 각 청크별 임베딩 생성 및 저장
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      const chunkTokens = estimateTokens(chunk)

      try {
        // 임베딩 생성
        const embedding = await this.generateEmbedding(chunk)
        const embeddingVector = new Float32Array(embedding)

        // SQLite embeddings 테이블에 저장 (testMode가 아닐 때만)
        if (!this.testMode && this.db) {
          const hexBlob = vectorToBlob(embeddingVector)

          this.db.exec(`
            INSERT INTO embeddings (
              doc_id, chunk_index, chunk_text, chunk_tokens,
              embedding, embedding_model, created_at
            ) VALUES (
              '${this.escapeSQL(docId)}',
              ${i},
              '${this.escapeSQL(chunk)}',
              ${chunkTokens},
              X'${hexBlob}',
              '${this.embeddingModel}',
              ${currentTimeSec}
            )
          `)
        }

        // IndexedDB embeddings 스토어에 저장 (항상 실행)
        const storedEmbedding: StoredEmbedding = {
          doc_id: docId,
          chunk_index: i,
          chunk_text: chunk,
          chunk_tokens: chunkTokens,
          embedding: embeddingVector.buffer,
          embedding_model: this.embeddingModel,
          created_at: currentTime
        }

        await IndexedDBStorage.saveEmbedding(storedEmbedding)

        console.log(`[OllamaProvider] 청크 ${i + 1}/${chunks.length} 임베딩 저장 완료`)
      } catch (error) {
        // 임베딩 생성 실패 시 에러 정보 포함하여 전파
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[OllamaProvider] ❌ 청크 ${i + 1}/${chunks.length} 임베딩 생성 실패:`, errorMessage)
        throw new Error(`문서 ${docId} 청크 ${i} 임베딩 생성 실패: ${errorMessage}`)
      }
    }

    // absurd-sql: 변경사항을 IndexedDB에 영구 저장
    if (!this.testMode && this.SQL && this.db) {
      persistDB(this.SQL, this.db)
    }

    console.log(`[OllamaProvider] ✅ 문서 추가 완료: ${docId} (${chunks.length}개 청크)`)
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

    // ========== Phase 3: content 변경 시 임베딩 재생성 ==========
    if (updates.content !== undefined) {
      // 1. 기존 임베딩 삭제
      await IndexedDBStorage.deleteEmbeddingsByDocId(docId)
      console.log(`[OllamaProvider] ✓ 기존 임베딩 삭제 완료: ${docId}`)

      if (!this.testMode && this.db) {
        this.db.exec(`
          DELETE FROM embeddings
          WHERE doc_id = '${this.escapeSQL(docId)}'
        `)
      }

      // 2. 새 임베딩 생성
      const chunks = chunkDocument(updates.content, {
        maxTokens: 500,
        overlapTokens: 50,
        preserveBoundaries: true
      })

      if (chunks.length > 0) {
        console.log(`[OllamaProvider] 새 임베딩 생성 시작: ${chunks.length}개 청크`)

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i]
          const chunkTokens = estimateTokens(chunk)

          try {
            const embedding = await this.generateEmbedding(chunk)
            const embeddingVector = new Float32Array(embedding)
            const currentTimeSec = Math.floor(currentTime / 1000)

            // SQLite 저장
            if (!this.testMode && this.db) {
              const hexBlob = vectorToBlob(embeddingVector)
              this.db.exec(`
                INSERT INTO embeddings (
                  doc_id, chunk_index, chunk_text, chunk_tokens,
                  embedding, embedding_model, created_at
                ) VALUES (
                  '${this.escapeSQL(docId)}',
                  ${i},
                  '${this.escapeSQL(chunk)}',
                  ${chunkTokens},
                  X'${hexBlob}',
                  '${this.embeddingModel}',
                  ${currentTimeSec}
                )
              `)
            }

            // IndexedDB 저장
            const storedEmbedding: StoredEmbedding = {
              doc_id: docId,
              chunk_index: i,
              chunk_text: chunk,
              chunk_tokens: chunkTokens,
              embedding: embeddingVector.buffer,
              embedding_model: this.embeddingModel,
              created_at: currentTime
            }

            await IndexedDBStorage.saveEmbedding(storedEmbedding)
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            console.error(`[OllamaProvider] ❌ 청크 ${i + 1} 임베딩 생성 실패:`, errorMessage)
            throw new Error(`문서 ${docId} 업데이트 중 청크 ${i} 임베딩 생성 실패: ${errorMessage}`)
          }
        }

        console.log(`[OllamaProvider] ✓ 새 임베딩 생성 완료: ${chunks.length}개 청크`)
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

      // ✅ absurd-sql: 변경사항을 IndexedDB에 영구 저장
      if (this.SQL) {
        persistDB(this.SQL, this.db)
      }
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

    // IndexedDB에서 문서 삭제 (영구 저장소)
    if (typeof window !== 'undefined' && !this.testMode) {
      await IndexedDBStorage.deleteDocument(docId)
      console.log(`[OllamaProvider] ✓ IndexedDB 문서 삭제 완료: ${docId}`)
    }

    // IndexedDB에서 임베딩 삭제 (Phase 3: 청크 기반 임베딩)
    await IndexedDBStorage.deleteEmbeddingsByDocId(docId)
    console.log(`[OllamaProvider] ✓ IndexedDB 임베딩 삭제 완료: ${docId}`)

    // 프로덕션 모드: SQLite 메모리 DB에서도 삭제
    if (!this.testMode && this.db) {
      // documents 테이블 삭제
      this.db.exec(`
        DELETE FROM documents
        WHERE doc_id = '${this.escapeSQL(docId)}'
      `)

      // embeddings 테이블 삭제 (Phase 3)
      this.db.exec(`
        DELETE FROM embeddings
        WHERE doc_id = '${this.escapeSQL(docId)}'
      `)

      // ✅ absurd-sql: 변경사항을 IndexedDB에 영구 저장
      if (this.SQL) {
        persistDB(this.SQL, this.db)
      }
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
    let searchMode = context.searchMode || 'vector' // 기본값: vector (FAISS 방식)
    let usedFallback = false

    try {
      let searchResults: SearchResult[] = []

      // 검색 모드에 따라 다른 검색 수행 (with Graceful Degradation)
      if (searchMode === 'fts5') {
        // 1. FTS5 키워드 검색 (기존 방식)
        console.log('[OllamaProvider] FTS5 키워드 검색 중...')
        searchResults = this.searchByKeyword(context.query)
      } else if (searchMode === 'vector') {
        // 2. Vector 검색 (임베딩 기반) → 실패 시 LLM 직접 응답
        console.log('[OllamaProvider] Vector 검색 중...')
        try {
          searchResults = await this.searchByVector(context.query)
        } catch (error) {
          console.warn('[OllamaProvider] ⚠️ Vector 검색 실패, LLM 직접 응답 모드:', error)
          usedFallback = true
          // FTS5 폴백 없이 빈 결과 → LLM이 직접 응답
          searchResults = []
        }
      } else if (searchMode === 'hybrid') {
        // 3. Hybrid 검색 (FTS5 + Vector 결합) → 실패 시 LLM 직접 응답
        console.log('[OllamaProvider] Hybrid 검색 중 (FTS5 + Vector)...')
        try {
          searchResults = await this.searchHybrid(context.query)
        } catch (error) {
          console.warn('[OllamaProvider] ⚠️ Hybrid 검색 실패, LLM 직접 응답 모드:', error)
          usedFallback = true
          // FTS5 폴백 없이 빈 결과 → LLM이 직접 응답
          searchResults = []
        }
      }

      // 검색 결과가 없고 폴백 모드가 아니면 상위 K개 반환
      // usedFallback=true면 RAG 없이 LLM 직접 응답
      if (searchResults.length === 0 && !usedFallback) {
        console.log('[OllamaProvider] ⚠️ 검색 결과 없음 - Fallback: 상위 5개 문서 반환')
        searchResults = this.documents.slice(0, this.topK).map((doc) => ({
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          library: doc.library,
          category: doc.category,
          score: 0.5 // 기본 스코어
        }))
      } else if (usedFallback) {
        console.log('[OllamaProvider] ℹ️ RAG 없이 LLM 직접 응답 모드')
      }

      // LLM Reranking (Top-20 → Top-5)
      // 검색 결과가 topK보다 많으면 Reranking 수행
      const useReranking = context.useReranking !== false // 기본값: true
      if (useReranking && searchResults.length > this.topK) {
        console.log(`[OllamaProvider] Reranking 활성화: ${searchResults.length}개 → ${this.topK}개`)
        searchResults = await this.rerank(context.query, searchResults, this.topK)
      }

      // 관련 문서 컨텍스트 생성
      const contextText = this.buildContext(searchResults, context)

      // 추론 모델로 응답 생성
      console.log('[OllamaProvider] 응답 생성 중...')
      const { answer, citedDocIds } = await this.generateAnswer(contextText, context.query)

      const responseTime = Date.now() - startTime

      console.log(`[OllamaProvider] ✓ 답변 생성 완료 (사용 문서: ${citedDocIds.length}개 / ${searchResults.length}개)`)

      return {
        answer,
        sources: searchResults.map((result) => ({
          title: result.title,
          content: result.content.slice(0, 200) + '...',
          score: result.score
        })),
        citedDocIds, // ✅ Perplexity 스타일: LLM이 실제 사용한 문서 인덱스
        model: {
          provider: `Ollama (Local - ${searchMode.toUpperCase()}${usedFallback ? ' [Fallback]' : ''})`,
          embedding: this.embeddingModel,
          inference: this.inferenceModel
        },
        metadata: {
          responseTime
        }
      }
    } catch (error) {
      // RAG 검색/처리 실패 시 RAG 없이 바로 LLM 답변 생성
      console.warn('[OllamaProvider] ⚠️ RAG 처리 실패, LLM 직접 응답으로 폴백:', error instanceof Error ? error.message : error)

      try {
        // RAG 없이 바로 LLM 응답 생성
        const { answer } = await this.generateAnswer('', context.query)

        return {
          answer,
          sources: [],
          citedDocIds: [],
          model: {
            provider: 'Ollama (Local - No RAG)',
            embedding: this.embeddingModel || 'none',
            inference: this.inferenceModel
          },
          metadata: {
            responseTime: Date.now() - startTime,
            noRAG: true
          }
        }
      } catch (fallbackError) {
        throw new Error(
          `Ollama Provider 오류: ${fallbackError instanceof Error ? fallbackError.message : '알 수 없는 오류'}`
        )
      }
    }
  }

  /**
   * 스트리밍 쿼리 응답 생성 (Perplexity 스타일)
   *
   * @param context - RAG 컨텍스트
   * @param onChunk - 텍스트 조각 콜백
   * @param onSources - 참조 문서 콜백 (검색 완료 시 1회 호출)
   * @returns 최종 응답 메타데이터 (citedDocIds 포함)
   */
  async queryStream(
    context: RAGContext,
    onChunk: (chunk: string) => void,
    onSources?: (sources: Array<{ title: string; content: string; score: number }>) => void
  ): Promise<Omit<RAGResponse, 'answer'>> {
    this.ensureInitialized()

    const startTime = Date.now()
    let searchMode = context.searchMode || 'vector' // 기본값: vector (FAISS 방식)
    let usedFallback = false

    try {
      let searchResults: SearchResult[] = []

      // 검색 모드에 따라 다른 검색 수행 (query 메서드와 동일)
      if (searchMode === 'fts5') {
        console.log('[OllamaProvider] FTS5 키워드 검색 중...')
        searchResults = this.searchByKeyword(context.query)
      } else if (searchMode === 'vector') {
        // Vector 검색 → 실패 시 LLM 직접 응답
        console.log('[OllamaProvider] Vector 검색 중...')
        try {
          searchResults = await this.searchByVector(context.query)
        } catch (error) {
          console.warn('[OllamaProvider] ⚠️ Vector 검색 실패, LLM 직접 응답 모드:', error)
          usedFallback = true
          searchResults = []
        }
      } else if (searchMode === 'hybrid') {
        // Hybrid 검색 → 실패 시 LLM 직접 응답
        console.log('[OllamaProvider] Hybrid 검색 중 (FTS5 + Vector)...')
        try {
          searchResults = await this.searchHybrid(context.query)
        } catch (error) {
          console.warn('[OllamaProvider] ⚠️ Hybrid 검색 실패, LLM 직접 응답 모드:', error)
          usedFallback = true
          searchResults = []
        }
      }

      // 검색 결과가 없고 폴백 모드가 아니면 상위 K개 반환
      // usedFallback=true면 RAG 없이 LLM 직접 응답
      if (searchResults.length === 0 && !usedFallback) {
        console.log('[OllamaProvider] ⚠️ 검색 결과 없음 - Fallback: 상위 5개 문서 반환')
        searchResults = this.documents.slice(0, this.topK).map((doc) => ({
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          library: doc.library,
          category: doc.category,
          score: 0.5
        }))
      } else if (usedFallback) {
        console.log('[OllamaProvider] ℹ️ RAG 없이 LLM 직접 응답 모드')
      }

      // LLM Reranking
      const useReranking = context.useReranking !== false
      if (useReranking && searchResults.length > this.topK) {
        console.log(`[OllamaProvider] Reranking 활성화: ${searchResults.length}개 → ${this.topK}개`)
        searchResults = await this.rerank(context.query, searchResults, this.topK)
      }

      // 참조 문서 콜백 호출 (검색 완료)
      if (onSources) {
        onSources(
          searchResults.map((result) => ({
            title: result.title,
            content: result.content.slice(0, 200) + '...',
            score: result.score
          }))
        )
      }

      // 관련 문서 컨텍스트 생성
      const contextText = this.buildContext(searchResults, context)

      // 스트리밍 응답 생성 (성능 메트릭 수집)
      console.log('[OllamaProvider] 스트리밍 응답 생성 중...')
      let fullAnswer = ''
      let firstTokenTime: number | null = null
      let tokenCount = 0
      const generationStartTime = Date.now()

      for await (const chunk of this.streamGenerateAnswer(contextText, context.query)) {
        // 첫 토큰 시간 기록 (TTFT)
        if (firstTokenTime === null) {
          firstTokenTime = Date.now()
        }

        fullAnswer += chunk
        tokenCount += this.estimateTokenCount(chunk)
        onChunk(chunk)
      }

      const generationTime = Date.now() - generationStartTime

      // <cited_docs> 태그 파싱 (스트리밍 완료 후)
      const citedDocsMatch = fullAnswer.match(/<cited_docs>([\d,\s-]+)<\/cited_docs>/i)
      let citedDocIds: number[] = []

      if (citedDocsMatch) {
        const parsed = citedDocsMatch[1]
          .split(',')
          .map((n) => parseInt(n.trim()) - 1) // 1-based → 0-based
          .filter((n) => !isNaN(n) && n >= 0)

        if (parsed.length > 0) {
          citedDocIds = parsed
        }
      }

      const responseTime = Date.now() - startTime
      const ttft = firstTokenTime ? firstTokenTime - generationStartTime : undefined
      const tokensPerSecond = generationTime > 0 ? (tokenCount / generationTime) * 1000 : undefined

      console.log(`[OllamaProvider] ✓ 스트리밍 완료 (사용 문서: ${citedDocIds.length}개 / ${searchResults.length}개)`)
      if (ttft !== undefined) {
        console.log(`[OllamaProvider] 성능: TTFT=${ttft}ms, TPS=${tokensPerSecond?.toFixed(2)}, 토큰=${tokenCount}개`)
      }

      return {
        sources: searchResults.map((result) => ({
          title: result.title,
          content: result.content.slice(0, 200) + '...',
          score: result.score
        })),
        citedDocIds,
        model: {
          provider: `Ollama (Local - ${searchMode.toUpperCase()}${usedFallback ? ' [Fallback]' : ''})`,
          embedding: this.embeddingModel,
          inference: this.inferenceModel
        },
        metadata: {
          responseTime,
          tokensUsed: tokenCount,
          ttft,
          tokensPerSecond
        }
      }
    } catch (error) {
      // RAG 검색/처리 실패 시 RAG 없이 바로 LLM 답변 생성
      console.warn('[OllamaProvider] ⚠️ RAG 처리 실패, LLM 직접 응답으로 폴백:', error instanceof Error ? error.message : error)

      try {
        // RAG 없이 바로 LLM 응답 생성
        let fullAnswer = ''
        const generationStartTime = Date.now()

        for await (const chunk of this.streamGenerateAnswer('', context.query)) {
          fullAnswer += chunk
          onChunk(chunk)
        }

        // 참조 문서 없음 알림
        if (onSources) {
          onSources([])
        }

        return {
          sources: [],
          citedDocIds: [],
          model: {
            provider: 'Ollama (Local - No RAG)',
            embedding: this.embeddingModel || 'none',
            inference: this.inferenceModel
          },
          metadata: {
            responseTime: Date.now() - startTime,
            tokensUsed: this.estimateTokenCount(fullAnswer),
            noRAG: true
          }
        }
      } catch (fallbackError) {
        throw new Error(
          `Ollama Provider 오류: ${fallbackError instanceof Error ? fallbackError.message : '알 수 없는 오류'}`
        )
      }
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

      // 프로덕션 모드: absurd-sql 사용 (IndexedDB 백엔드)
      // vectorDbPath에서 vectorStoreId 추출
      // 예: '/rag-data/vector-qwen3-embedding-0.6b.db' → 'qwen3-embedding-0.6b'
      const vectorStoreId = this.vectorDbPath
        .replace('/rag-data/vector-', '')
        .replace('.db', '')

      console.log(`[OllamaProvider] Vector Store ID: ${vectorStoreId}`)

      // 1. absurd-sql로 IndexedDB 기반 SQLite 초기화
      const { SQL, db } = await initSqlWithIndexedDB(vectorStoreId)

      this.SQL = SQL  // persistDB에서 사용하기 위해 저장
      this.db = db
      console.log('[OllamaProvider] ✓ DB 연결 성공 (IndexedDB 백엔드)')

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

      // 5-1. embeddings 테이블에서 청크 임베딩 로드 (Phase 3)
      const embeddingsResult = this.db.exec(`
        SELECT doc_id, chunk_index, chunk_text, chunk_tokens, embedding, embedding_model, created_at
        FROM embeddings
        ORDER BY doc_id, chunk_index
      `)

      if (embeddingsResult.length > 0 && embeddingsResult[0].values.length > 0) {
        const embCols = embeddingsResult[0].columns
        const embValues = embeddingsResult[0].values

        // IndexedDB에 청크 임베딩 저장
        const storedEmbeddings: StoredEmbedding[] = []

        for (const row of embValues) {
          const embData: Record<string, unknown> = {}
          embCols.forEach((col, index) => {
            embData[col] = row[index]
          })

          // 타입 검증
          if (
            typeof embData.doc_id !== 'string' ||
            typeof embData.chunk_index !== 'number' ||
            typeof embData.chunk_text !== 'string' ||
            typeof embData.chunk_tokens !== 'number' ||
            typeof embData.embedding_model !== 'string' ||
            typeof embData.created_at !== 'number'
          ) {
            console.warn('[OllamaProvider] ⚠️ embeddings 테이블 스키마 오류, 스킵')
            continue
          }

          // BLOB 변환: Uint8Array → Float32Array → ArrayBuffer
          let embeddingBuffer: ArrayBuffer | null = null
          if (embData.embedding && embData.embedding instanceof Uint8Array) {
            try {
              const floatArray = blobToFloatArray(embData.embedding)
              embeddingBuffer = new Float32Array(floatArray).buffer
            } catch (error) {
              console.warn(`[OllamaProvider] 임베딩 변환 실패 (${embData.doc_id} chunk ${embData.chunk_index}):`, error)
              continue
            }
          }

          if (!embeddingBuffer) {
            console.warn(`[OllamaProvider] ⚠️ 임베딩 BLOB 없음 (${embData.doc_id} chunk ${embData.chunk_index})`)
            continue
          }

          storedEmbeddings.push({
            doc_id: embData.doc_id,
            chunk_index: embData.chunk_index,
            chunk_text: embData.chunk_text,
            chunk_tokens: embData.chunk_tokens,
            embedding: embeddingBuffer,
            embedding_model: embData.embedding_model,
            created_at: embData.created_at
          })
        }

        // IndexedDB에 배치 저장 (브라우저 환경에서만)
        if (typeof window !== 'undefined' && storedEmbeddings.length > 0) {
          try {
            await IndexedDBStorage.saveEmbeddingsBatch(storedEmbeddings)
            console.log(`[OllamaProvider] ✓ ${storedEmbeddings.length}개 청크 임베딩 IndexedDB에 저장됨`)
          } catch (error) {
            console.warn('[OllamaProvider] ⚠️ 청크 임베딩 IndexedDB 저장 실패:', error)
          }
        }
      } else {
        console.log('[OllamaProvider] ℹ️ embeddings 테이블 비어있음 (청크 임베딩 없음)')
      }

      // 5-2. DB에서 임베딩 모델 확인 및 자동 설정
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

    // 스코어 순 정렬 후 후보 개수만큼 반환 (Reranking을 위해)
    results.sort((a, b) => b.score - a.score)
    const candidateLimit = this.topK * 4
    return results.slice(0, candidateLimit)
  }

  /**
   * Vector 검색 (임베딩 기반 의미론적 검색)
   */
  private async searchByVector(query: string): Promise<SearchResult[]> {
    console.log(`[OllamaProvider] Vector 검색 (청크 기반): "${query}"`)

    try {
      // 1. 쿼리 임베딩 생성 (1개만 생성 - 빠름!)
      const startTime = Date.now()
      const queryEmbedding = await this.generateEmbedding(query)
      const embeddingTime = Date.now() - startTime
      console.log(`[OllamaProvider] 쿼리 임베딩 생성: ${embeddingTime}ms`)

      // 2. 임베딩으로 검색 (재사용 가능한 메서드 호출)
      return await this.searchByVectorWithEmbedding(queryEmbedding, startTime)
    } catch (error) {
      console.error('[OllamaProvider] Vector 검색 실패:', error)
      // Fallback: 빈 배열 반환 (query에서 Fallback 처리)
      return []
    }
  }

  /**
   * Vector 검색 (임베딩 재사용 버전)
   *
   * LangGraph 워크플로우에서 이미 생성된 임베딩을 재사용하기 위한 메서드
   * 중복 임베딩 호출을 방지하여 성능 향상
   *
   * @param queryEmbedding - 이미 생성된 쿼리 임베딩
   * @param startTime - 성능 측정을 위한 시작 시간 (선택)
   */
  protected async searchByVectorWithEmbedding(
    queryEmbedding: number[],
    startTime?: number
  ): Promise<SearchResult[]> {
    const actualStartTime = startTime ?? Date.now()
    console.log(`[OllamaProvider] Vector 검색 (임베딩 재사용)`)

    try {
      // ========== Phase 3: 청크 기반 검색 ==========
      // 1. IndexedDB에서 모든 청크 임베딩 로드
      const allEmbeddings = await IndexedDBStorage.getEmbeddingsByModel(this.embeddingModel)

      if (allEmbeddings.length === 0) {
        console.warn('[OllamaProvider] ⚠️ 임베딩이 있는 청크가 없습니다. Fallback to FTS5.')
        return []
      }

      console.log(`[OllamaProvider] ${allEmbeddings.length}개 청크 임베딩 로드됨`)

      // 3. 각 청크와 쿼리 간 코사인 유사도 계산
      interface ChunkScore {
        doc_id: string
        chunk_index: number
        chunk_text: string
        score: number
      }

      const chunkScores: ChunkScore[] = []

      for (const embeddingData of allEmbeddings) {
        // ArrayBuffer → Float32Array
        const chunkEmbedding = new Float32Array(embeddingData.embedding)
        const queryVector = new Float32Array(queryEmbedding)

        // 코사인 유사도 계산
        const similarity = this.cosineSimilarity(
          Array.from(queryVector),
          Array.from(chunkEmbedding)
        )

        chunkScores.push({
          doc_id: embeddingData.doc_id,
          chunk_index: embeddingData.chunk_index,
          chunk_text: embeddingData.chunk_text,
          score: similarity
        })
      }

      // 4. 유사도 순 정렬
      chunkScores.sort((a, b) => b.score - a.score)

      // 5. 문서별로 최고 점수 청크 집계 (Max Pooling)
      const docScores = new Map<string, { maxScore: number; bestChunk: string }>()

      for (const chunk of chunkScores) {
        const existing = docScores.get(chunk.doc_id)
        if (!existing || chunk.score > existing.maxScore) {
          docScores.set(chunk.doc_id, {
            maxScore: chunk.score,
            bestChunk: chunk.chunk_text
          })
        }
      }

      // 6. 문서 정보와 매핑하여 SearchResult 생성
      const results: SearchResult[] = []

      for (const [doc_id, scoreData] of docScores.entries()) {
        const doc = this.documents.find((d) => d.doc_id === doc_id)
        if (!doc) {
          console.warn(`[OllamaProvider] ⚠️ 문서를 찾을 수 없음: ${doc_id}`)
          continue
        }

        results.push({
          doc_id: doc.doc_id,
          title: doc.title,
          content: doc.content,
          library: doc.library,
          category: doc.category,
          score: scoreData.maxScore
        })
      }

      // 7. 점수 순 정렬 후 후보 개수만큼 반환 (Reranking을 위해)
      results.sort((a, b) => b.score - a.score)
      const totalTime = Date.now() - actualStartTime
      const candidateLimit = this.topK * 4
      console.log(
        `[OllamaProvider] Vector 검색 완료: ${totalTime}ms (${allEmbeddings.length}개 청크 → ${results.length}개 문서)`
      )

      return results.slice(0, candidateLimit)
    } catch (error) {
      console.error('[OllamaProvider] Vector 검색 (임베딩 재사용) 실패:', error)
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
      // Reranking을 위해 topK의 4배 (보통 20개) 가져오기
      const candidateLimit = this.topK * 4
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
        .slice(0, candidateLimit)

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
          input: truncatedText // Ollama embeddings API expects `input`
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
   * LLM Reranking (Top-20 → Top-5)
   *
   * 검색 결과를 LLM으로 재순위화하여 정확도 향상
   *
   * @param query - 사용자 질문
   * @param candidates - 검색 결과 후보 (Top-20)
   * @param topK - 최종 반환할 개수 (기본: 5)
   * @returns 재순위화된 상위 K개 결과
   */
  private async rerank(
    query: string,
    candidates: SearchResult[],
    topK: number = 5
  ): Promise<SearchResult[]> {
    // 후보가 topK 이하면 그대로 반환
    if (candidates.length <= topK) {
      return candidates
    }

    console.log(`[OllamaProvider] Reranking ${candidates.length}개 → ${topK}개...`)

    try {
      // 1. 각 문서에 번호 부여 (1부터 시작)
      const numberedDocs = candidates.map((doc, i) => ({
        number: i + 1,
        doc
      }))

      // 2. LLM Reranking 프롬프트 생성
      const prompt = `질문: ${query}

다음 문서들을 위 질문과의 관련성 순으로 정렬하세요.
가장 관련성이 높은 문서를 1순위로 하여 상위 ${topK}개만 선택하세요.

${numberedDocs.map(({ number, doc }) =>
  `[${number}] ${doc.title}\n${doc.content.slice(0, 200)}...`
).join('\n\n')}

답변 형식: 숫자만 쉼표로 구분 (예: 5,2,8,1,3)
상위 ${topK}개 문서 번호:`

      // 3. Ollama API 호출 (Reranking)
      const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.inferenceModel,
          prompt,
          stream: false,
          options: {
            temperature: 0, // 결정론적 순위
            num_predict: 100 // 짧은 응답 (숫자만)
          }
        })
      })

      if (!response.ok) {
        console.warn('[OllamaProvider] ⚠️ Reranking 실패, 원본 순서 유지')
        return candidates.slice(0, topK)
      }

      const data = (await response.json()) as GenerateResponse
      const ranking = data.response.trim()

      // 4. 응답 파싱: "5,2,8,1,3" → [5, 2, 8, 1, 3]
      const indices = ranking
        .split(',')
        .map((n) => parseInt(n.trim()))
        .filter((n) => !isNaN(n) && n >= 1 && n <= candidates.length)

      // 5. 파싱 실패 시 원본 순서 반환
      if (indices.length === 0) {
        console.warn('[OllamaProvider] ⚠️ Reranking 응답 파싱 실패, 원본 순서 유지')
        console.log(`[OllamaProvider] 응답: ${ranking}`)
        return candidates.slice(0, topK)
      }

      // 6. 재순위화된 결과 생성 (중복 제거)
      const rerankedResults: SearchResult[] = []
      const usedIndices = new Set<number>()

      for (const idx of indices) {
        if (usedIndices.has(idx)) continue
        if (rerankedResults.length >= topK) break

        const doc = candidates[idx - 1] // 1-based → 0-based
        if (doc) {
          rerankedResults.push(doc)
          usedIndices.add(idx)
        }
      }

      // 7. topK개를 못 채웠으면 원본에서 추가
      if (rerankedResults.length < topK) {
        for (let i = 0; i < candidates.length && rerankedResults.length < topK; i++) {
          if (!usedIndices.has(i + 1)) {
            rerankedResults.push(candidates[i])
          }
        }
      }

      console.log(`[OllamaProvider] ✓ Reranking 완료: ${rerankedResults.length}개`)
      return rerankedResults

    } catch (error) {
      console.warn('[OllamaProvider] ⚠️ Reranking 에러, 원본 순서 유지:', error)
      return candidates.slice(0, topK)
    }
  }

  /**
   * 컨텍스트 생성 (검색 결과 + 메서드 정보)
   */
  private buildContext(searchResults: SearchResult[], context: RAGContext): string {
    let contextText = '다음은 관련 문서입니다 (번호를 기억하세요):\n\n'

    searchResults.forEach((result, index) => {
      contextText += `[${index + 1}] ${result.title}\n`
      contextText += `${result.content}\n\n`
    })

    if (context.method) {
      contextText += `\n현재 사용자가 사용 중인 통계 메서드: ${context.method}\n`
    }

    return contextText
  }

  /**
   * 답변 생성 (Ollama 추론 모델)
   * @returns {answer: string, citedDocIds: number[]} - 답변과 사용된 문서 인덱스
   */
  private async generateAnswer(contextText: string, query: string): Promise<{ answer: string; citedDocIds: number[] }> {
    const systemPrompt = `당신은 통계 분석 분야의 경험 많은 튜터입니다.
아래 제공된 한국 통계 교육 자료를 바탕으로, 사용자의 질문에 명확하고 친근하게 답변해주세요.


📚 콘텐츠 참고 방식 (Perplexity 스타일)
───────────────────────────────────
• 제공된 자료를 최우선으로 활용하되, 관련 없으면 자유롭게 설명
• 자료에 없는 내용은 "문서에 따르면..." 또는 "일반적으로..." 로 구분
• **중요 1**: 답변 작성 중 문서를 참조할 때마다 **즉시 인라인 인용 [번호]**를 추가하세요
  예) "t-test는 정규성 가정이 필요합니다[1]. 등분산성도 확인해야 합니다[2]."
• **중요 2**: 답변에 실제 사용한 문서 번호를 마지막에 <cited_docs>태그로 명시하세요


💬 답변 스타일 가이드
───────────────────────────────────
• 마크다운으로 구조화하기: 제목(##), 리스트(-), 강조(**) 활용
  예) "## T-검정이란?", "- 가정 1:", "**주의사항**"

• 용어는 한글+영문 함께 표기
  예) "귀무가설(Null Hypothesis)", "1종 오류(Type I Error)"

• 결론 먼저 → 상세 설명 순서로
  예) "네, 정규성 검정은 필수입니다. 이유는..."

• 조건/주의사항은 명확하게 표시
  예) "⚠️ 이 방법은 샘플이 30개 이상일 때만 권장합니다"


🚫 피해야 할 것
───────────────────────────────────
• 내부 reasoning 태그(<think>, <sensitive> 등) 노출 금지
• 불필요한 기술 용어 남용
• 길고 복잡한 문장


📖 답변 형식 (필수!)
───────────────────────────────────
답변 내용...

<cited_docs>1,3,5</cited_docs>

**설명**: 답변에 실제 참조한 문서 번호를 쉼표로 구분하여 cited_docs 태그에 넣으세요.
예시: [1], [2] 문서 사용 시 → <cited_docs>1,2</cited_docs>`

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

    // Helper를 사용한 태그 제거 (스트리밍과 동일한 로직)
    answer = this.cleanThinkTags(answer)

    // <cited_docs> 태그 파싱 (Perplexity 스타일 - 답변에 사용된 문서 추적)
    // 정규식: 숫자, 쉼표, 공백, 마이너스 기호 허용 (LLM 오류 처리)
    const citedDocsMatch = answer.match(/<cited_docs>([\d,\s-]+)<\/cited_docs>/i)
    let citedDocIds: number[] = []

    if (citedDocsMatch) {
      // "1,3,5" → [1, 3, 5]로 변환 (0-based index로 변환: 1 → 0, 3 → 2)
      const parsed = citedDocsMatch[1]
        .split(',')
        .map(n => parseInt(n.trim()) - 1) // 1-based → 0-based
        .filter(n => !isNaN(n) && n >= 0)

      // 유효한 번호가 하나라도 있을 때만 태그 제거
      if (parsed.length > 0) {
        citedDocIds = parsed
        // <cited_docs> 태그 제거 (사용자에게 보이지 않도록)
        answer = answer.replace(/<cited_docs>[\s\S]*?<\/cited_docs>/gi, '')
      }
    }

    return {
      answer: answer.trim(),
      citedDocIds
    }
  }

  /**
   * Ollama 스트리밍 응답 생성 (단어/토큰별 실시간 반환)
   *
   * @param contextText - RAG 검색 결과로 생성한 컨텍스트
   * @param query - 사용자 질문
   * @param options - 스트리밍 옵션
   * @yields 생성된 응답의 토큰들
   */
  async *streamGenerateAnswer(
    contextText: string,
    query: string,
    options?: {
      /** 최대 재시도 횟수 (기본: 3) */
      maxRetries?: number
      /** 취소 신호 (AbortController) */
      signal?: AbortSignal
    }
  ): AsyncGenerator<string> {
    const maxRetries = options?.maxRetries ?? 3
    const signal = options?.signal

    // 중복 방지: 첫 청크 발생 여부 추적
    let hasYieldedAnyChunk = false

    // Exponential backoff로 재시도
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        for await (const chunk of this.streamGenerateAnswerInternal(contextText, query, signal)) {
          hasYieldedAnyChunk = true
          yield chunk
        }
        return // 성공 시 종료
      } catch (error) {
        // 이미 청크를 yield했다면 재시도 불가 (중복 방지)
        if (hasYieldedAnyChunk) {
          console.error('[streamGenerateAnswer] 스트리밍 중 에러 발생, 재시도 불가 (이미 청크 전송됨)')
          throw error
        }

        // 마지막 시도 또는 사용자 취소 시 에러 전파
        if (attempt === maxRetries || (error instanceof Error && error.name === 'AbortError')) {
          throw error
        }

        // Exponential backoff (1s, 2s, 4s...)
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        console.warn(`[streamGenerateAnswer] 시도 ${attempt}/${maxRetries} 실패, ${delayMs}ms 후 재시도...`, error)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  /**
   * 스트리밍 응답 생성 내부 로직 (재시도 로직 분리)
   */
  private async *streamGenerateAnswerInternal(
    contextText: string,
    query: string,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const systemPrompt = `당신은 통계 분석 분야의 경험 많은 튜터입니다.
아래 제공된 한국 통계 교육 자료를 바탕으로, 사용자의 질문에 명확하고 친근하게 답변해주세요.


📚 콘텐츠 참고 방식 (Perplexity 스타일)
───────────────────────────────────
• 제공된 자료를 최우선으로 활용하되, 관련 없으면 자유롭게 설명
• 자료에 없는 내용은 "문서에 따르면..." 또는 "일반적으로..." 로 구분
• **중요 1**: 답변 작성 중 문서를 참조할 때마다 **즉시 인라인 인용 [번호]**를 추가하세요
  예) "t-test는 정규성 가정이 필요합니다[1]. 등분산성도 확인해야 합니다[2]."
• **중요 2**: 답변에 실제 사용한 문서 번호를 마지막에 <cited_docs>태그로 명시하세요


💬 답변 스타일 가이드
───────────────────────────────────
• 마크다운으로 구조화하기: 제목(##), 리스트(-), 강조(**) 활용
  예) "## T-검정이란?", "- 가정 1:", "**주의사항**"

• 용어는 한글+영문 함께 표기
  예) "귀무가설(Null Hypothesis)", "1종 오류(Type I Error)"

• 결론 먼저 → 상세 설명 순서로
  예) "네, 정규성 검정은 필수입니다. 이유는..."

• 조건/주의사항은 명확하게 표시
  예) "⚠️ 이 방법은 샘플이 30개 이상일 때만 권장합니다"


🚫 피해야 할 것
───────────────────────────────────
• 내부 reasoning 태그(<think>, <sensitive> 등) 노출 금지
• 불필요한 기술 용어 남용
• 길고 복잡한 문장


📖 답변 형식 (필수!)
───────────────────────────────────
답변 내용...

<cited_docs>1,3,5</cited_docs>

**설명**: 답변에 실제 참조한 문서 번호를 쉼표로 구분하여 cited_docs 태그에 넣으세요.`

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
      }),
      signal // AbortController 신호 전달
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
              // Helper를 사용한 태그 제거
              const chunk = this.cleanThinkTags(json.response)

              if (chunk) {
                yield chunk
              }
            }
          } catch {
            // JSON 파싱 실패는 무시 (불완전한 데이터일 수 있음)
            console.debug('[streamGenerateAnswerInternal] JSON 파싱 실패:', line)
          }
        }
      }

      // TextDecoder 플러시 (멀티바이트 문자 보호)
      buffer += decoder.decode()

      // 남은 버퍼 처리
      if (buffer.trim()) {
        try {
          const json = JSON.parse(buffer) as { response?: string }
          if (json.response) {
            const chunk = this.cleanThinkTags(json.response)

            if (chunk) {
              yield chunk
            }
          }
        } catch {
          console.debug('[streamGenerateAnswerInternal] 최종 버퍼 JSON 파싱 실패')
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Vector Store 재구축 (모든 문서의 임베딩 재생성)
   *
   * 사용 사례:
   * - 임베딩 모델 변경 시
   * - 청킹 파라미터 변경 시
   * - 임베딩 손상 시 복구
   *
   * @param options 재구축 옵션
   * @returns 재구축 결과 통계
   */
  async rebuildVectorStore(options?: {
    /** 진행률 콜백 (0-100) */
    onProgress?: (progress: number, current: number, total: number, docTitle: string) => void
    /** 특정 문서만 재구축 (docId 배열) */
    docIds?: string[]
  }): Promise<{
    totalDocs: number
    processedDocs: number
    totalChunks: number
    successDocs: number
    failedDocs: number
    errors: Array<{ docId: string; error: string }>
  }> {
    this.ensureInitialized()

    const allDocs = this.getAllDocuments()
    const targetDocs = options?.docIds
      ? allDocs.filter(doc => options.docIds!.includes(doc.doc_id))
      : allDocs

    if (targetDocs.length === 0) {
      console.warn('[rebuildVectorStore] 재구축할 문서 없음')
      return {
        totalDocs: 0,
        processedDocs: 0,
        totalChunks: 0,
        successDocs: 0,
        failedDocs: 0,
        errors: []
      }
    }

    console.log(`[rebuildVectorStore] 시작: ${targetDocs.length}개 문서 재구축`)

    const stats = {
      totalDocs: targetDocs.length,
      processedDocs: 0,
      totalChunks: 0,
      successDocs: 0,
      failedDocs: 0,
      errors: [] as Array<{ docId: string; error: string }>
    }

    for (let i = 0; i < targetDocs.length; i++) {
      const doc = targetDocs[i]
      const progress = Math.floor(((i + 1) / targetDocs.length) * 100)

      try {
        // 진행률 콜백 호출
        if (options?.onProgress) {
          options.onProgress(progress, i + 1, targetDocs.length, doc.title)
        }

        console.log(`[rebuildVectorStore] [${i + 1}/${targetDocs.length}] ${doc.title}`)

        // 1. 기존 임베딩 삭제
        await IndexedDBStorage.deleteEmbeddingsByDocId(doc.doc_id)

        if (!this.testMode && this.db) {
          this.db.exec(`
            DELETE FROM embeddings
            WHERE doc_id = '${this.escapeSQL(doc.doc_id)}'
          `)
        }

        // 2. 문서 청킹
        const chunks = chunkDocument(doc.content, {
          maxTokens: 500,
          overlapTokens: 50,
          preserveBoundaries: true
        })

        if (chunks.length === 0) {
          console.warn(`[rebuildVectorStore] ⚠️ 빈 문서 스킵: ${doc.doc_id}`)
          stats.processedDocs++
          continue
        }

        // 3. 각 청크 임베딩 생성 및 저장
        for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
          const chunk = chunks[chunkIdx]
          const chunkTokens = estimateTokens(chunk)

          const embedding = await this.generateEmbedding(chunk)
          const embeddingVector = new Float32Array(embedding)
          const currentTime = Date.now()
          const currentTimeSec = Math.floor(currentTime / 1000)

          // SQLite 저장
          if (!this.testMode && this.db) {
            const hexBlob = vectorToBlob(embeddingVector)
            this.db.exec(`
              INSERT INTO embeddings (
                doc_id, chunk_index, chunk_text, chunk_tokens,
                embedding, embedding_model, created_at
              ) VALUES (
                '${this.escapeSQL(doc.doc_id)}',
                ${chunkIdx},
                '${this.escapeSQL(chunk)}',
                ${chunkTokens},
                X'${hexBlob}',
                '${this.embeddingModel}',
                ${currentTimeSec}
              )
            `)
          }

          // IndexedDB 저장
          const storedEmbedding: StoredEmbedding = {
            doc_id: doc.doc_id,
            chunk_index: chunkIdx,
            chunk_text: chunk,
            chunk_tokens: chunkTokens,
            embedding: embeddingVector.buffer,
            embedding_model: this.embeddingModel,
            created_at: currentTime
          }

          await IndexedDBStorage.saveEmbedding(storedEmbedding)
          stats.totalChunks++
        }

        console.log(`[rebuildVectorStore] ✓ ${doc.title}: ${chunks.length}개 청크 재생성`)
        stats.successDocs++
        stats.processedDocs++

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[rebuildVectorStore] ❌ ${doc.title} 실패:`, errorMessage)

        stats.failedDocs++
        stats.processedDocs++
        stats.errors.push({
          docId: doc.doc_id,
          error: errorMessage
        })
      }
    }

    // SQLite 영구 저장 (프로덕션 모드)
    if (!this.testMode && this.db && this.SQL) {
      try {
        persistDB(this.SQL, this.db)
        console.log(`[rebuildVectorStore] ✓ SQLite DB 영구 저장 완료`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[rebuildVectorStore] ⚠️ SQLite DB 저장 실패:`, errorMessage)
      }
    }

    console.log(`[rebuildVectorStore] 완료:`, stats)
    return stats
  }
}
