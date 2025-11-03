/**
 * RAG Service (Ollama 전용)
 *
 * 통계 페이지에서 사용하는 단일 인터페이스
 * 내부망 환경을 위한 완전 로컬 RAG 시스템
 */

import { BaseRAGProvider, RAGContext, RAGResponse, VectorStore } from './providers/base-provider'
import { OllamaRAGProvider } from './providers/ollama-provider'

export type RAGProviderType = 'ollama'

export interface RAGServiceConfig {
  /** Vector Store ID (우선순위 1, 예: 'qwen3-embedding-0.6b') */
  vectorStoreId?: string
  /** 임베딩 모델 (우선순위 2, vectorStoreId가 없을 때 사용) */
  embeddingModel?: string
  /** 추론 모델 (LLM) */
  inferenceModel?: string
  /** Ollama 엔드포인트 */
  ollamaEndpoint?: string
  /** Vector DB 경로 (Deprecated: vectorStoreId 사용 권장) */
  vectorDbPath?: string
  /** Top-K 검색 결과 수 */
  topK?: number
}

export class RAGService {
  private static instance: RAGService | null = null
  private provider: BaseRAGProvider | null = null
  private providerType: RAGProviderType
  private config: RAGServiceConfig = {}

  private constructor() {
    // Ollama Provider 고정 (내부망 전용)
    this.providerType = 'ollama'
  }

  /**
   * Singleton 인스턴스 가져오기
   */
  static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService()
    }
    return RAGService.instance
  }

  /**
   * Provider 초기화
   */
  async initialize(config?: RAGServiceConfig): Promise<void> {
    // 설정이 변경되었으면 기존 provider 정리
    if (this.provider && config) {
      const hasConfigChanged =
        config.vectorStoreId !== this.config.vectorStoreId ||
        config.embeddingModel !== this.config.embeddingModel ||
        config.inferenceModel !== this.config.inferenceModel

      if (hasConfigChanged) {
        await this.provider.cleanup()
        this.provider = null
      }
    }

    if (this.provider) {
      return // 이미 초기화됨
    }

    // 설정 업데이트
    if (config) {
      this.config = { ...this.config, ...config }
    }

    console.log('[RAGService] Ollama Provider 초기화 중...')

    // vectorStoreId → vectorDbPath 변환
    let vectorDbPath = this.config.vectorDbPath || process.env.NEXT_PUBLIC_VECTOR_DB_PATH
    if (this.config.vectorStoreId) {
      vectorDbPath = vectorStoreIdToPath(this.config.vectorStoreId)
      console.log(`[RAGService] Vector Store ID: ${this.config.vectorStoreId}`)
      console.log(`[RAGService] Vector DB Path: ${vectorDbPath}`)
    } else if (this.config.vectorDbPath) {
      console.warn('[RAGService] ⚠️ vectorDbPath는 deprecated입니다. vectorStoreId 사용을 권장합니다.')
    }

    // Ollama Provider 생성
    this.provider = new OllamaRAGProvider({
      name: 'Ollama (Local)',
      ollamaEndpoint:
        this.config.ollamaEndpoint ||
        process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT ||
        'http://localhost:11434',
      embeddingModel:
        this.config.embeddingModel ||
        process.env.NEXT_PUBLIC_OLLAMA_EMBEDDING_MODEL,
      inferenceModel:
        this.config.inferenceModel ||
        process.env.NEXT_PUBLIC_OLLAMA_INFERENCE_MODEL,
      vectorDbPath: vectorDbPath || '/rag-data/rag.db',
      topK: this.config.topK || parseInt(process.env.NEXT_PUBLIC_TOP_K || '5'),
      testMode: process.env.NODE_ENV === 'test' // 테스트 환경에서 testMode 활성화
    })

    await this.provider.initialize()
    console.log('[RAGService] Ollama Provider 초기화 완료')
  }

  /**
   * Provider 준비 상태 확인
   */
  async isReady(): Promise<boolean> {
    if (!this.provider) {
      return false
    }
    return this.provider.isReady()
  }

  /**
   * 쿼리 실행
   */
  async query(context: RAGContext): Promise<RAGResponse> {
    if (!this.provider) {
      throw new Error('RAGService가 초기화되지 않았습니다. initialize()를 먼저 호출하세요.')
    }

    const isReady = await this.provider.isReady()
    if (!isReady) {
      throw new Error('Provider가 준비되지 않았습니다')
    }

    return this.provider.query(context)
  }

  /**
   * 현재 Provider 타입 가져오기
   */
  getProviderType(): RAGProviderType {
    return this.providerType
  }

  /**
   * DB 재구축 (문서 추가/수정 후 호출)
   */
  async rebuildDatabase(): Promise<void> {
    console.log('[RAGService] 데이터베이스 재구축 중...')

    if (this.provider) {
      await this.provider.cleanup()
      this.provider = null
    }

    await this.initialize()
    console.log('[RAGService] 데이터베이스 재구축 완료')
  }

  /**
   * 서비스 종료 (리소스 정리)
   */
  async shutdown(): Promise<void> {
    if (this.provider) {
      await this.provider.cleanup()
      this.provider = null
    }
    RAGService.instance = null
  }
}

/**
 * 편의 함수: RAG 쿼리 실행
 *
 * ✅ 초기화 전략:
 * - 이미 초기화되어 있으면 스킵 (기존 설정 보존)
 * - 첫 호출 시만 초기화 (성능 최적화)
 *
 * ✅ 벡터 스토어 선택 우선순위:
 * 1. NEXT_PUBLIC_VECTOR_STORE_ID 환경변수 (배포 시 유연함)
 * 2. 기본값: 'qwen3-embedding-0.6b' (111개 문서, 최신 DB)
 */
export async function queryRAG(context: RAGContext): Promise<RAGResponse> {
  const ragService = RAGService.getInstance()

  // 이미 초기화되어 있으면 스킵 (기존 설정 보존)
  if (!(await ragService.isReady())) {
    // 환경변수로 벡터 스토어 선택 (프로덕션 배포 시 유연함)
    const vectorStoreId =
      process.env.NEXT_PUBLIC_VECTOR_STORE_ID || 'qwen3-embedding-0.6b'

    await ragService.initialize({
      vectorStoreId,
    })
  }

  return ragService.query(context)
}

/**
 * 편의 함수: DB 재구축
 */
export async function rebuildRAGDatabase(): Promise<void> {
  const ragService = RAGService.getInstance()
  await ragService.rebuildDatabase()
}

/**
 * Vector Store ID를 DB 경로로 변환
 * 예: 'qwen3-embedding-0.6b' → '/rag-data/vector-qwen3-embedding-0.6b.db'
 */
export function vectorStoreIdToPath(vectorStoreId: string): string {
  return `/rag-data/vector-${vectorStoreId}.db`
}

/**
 * DB 파일명에서 Vector Store 정보 파싱
 * 예: 'vector-qwen3-embedding-0.6b.db' → { id: 'qwen3-embedding-0.6b', model: 'qwen3-embedding:0.6b' }
 */
export function parseVectorStoreFilename(filename: string): { id: string; model: string } | null {
  const match = filename.match(/^vector-(.+)\.db$/)
  if (!match) return null

  const id = match[1]
  // 파일명의 마지막 '-숫자' → 모델명의 ':숫자'로 변환
  // 'qwen3-embedding-0.6b' → 'qwen3-embedding:0.6b'
  // 'mxbai-embed-large' → 'mxbai-embed-large' (변환 안 함)
  const model = id.replace(/-(\d+(?:\.\d+)?[a-z]?)$/, ':$1')

  return { id, model }
}

/**
 * 사용 가능한 Vector Store 목록 조회 (동적 로드)
 *
 * 빌드 시 생성된 vector-stores.json 파일에서 메타데이터 로드
 * 파일 생성: npm run generate:vector-stores
 */
export async function getAvailableVectorStores(): Promise<VectorStore[]> {
  try {
    // Fetch metadata JSON (static file generated at build time)
    const response = await fetch('/rag-data/vector-stores.json')

    if (!response.ok) {
      console.warn('[getAvailableVectorStores] 메타데이터 파일 없음, 빈 배열 반환')
      return []
    }

    const stores: VectorStore[] = await response.json()
    return stores
  } catch (error) {
    console.error('[getAvailableVectorStores] 메타데이터 로드 실패:', error)
    return []
  }
}
