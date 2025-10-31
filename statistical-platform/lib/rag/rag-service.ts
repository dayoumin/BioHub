/**
 * RAG Service (Ollama 전용)
 *
 * 통계 페이지에서 사용하는 단일 인터페이스
 * 내부망 환경을 위한 완전 로컬 RAG 시스템
 */

import { BaseRAGProvider, RAGContext, RAGResponse } from './providers/base-provider'
import { OllamaRAGProvider } from './providers/ollama-provider'

export type RAGProviderType = 'ollama'

export class RAGService {
  private static instance: RAGService | null = null
  private provider: BaseRAGProvider | null = null
  private providerType: RAGProviderType

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
  async initialize(): Promise<void> {
    if (this.provider) {
      return // 이미 초기화됨
    }

    console.log('[RAGService] Ollama Provider 초기화 중...')

    // Ollama Provider 생성
    this.provider = new OllamaRAGProvider({
      name: 'Ollama (Local)',
      ollamaEndpoint: process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434',
      embeddingModel: process.env.NEXT_PUBLIC_OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
      inferenceModel: process.env.NEXT_PUBLIC_OLLAMA_INFERENCE_MODEL || 'qwen2.5:3b',
      vectorDbPath: process.env.NEXT_PUBLIC_VECTOR_DB_PATH || '/rag-data/rag.db',
      topK: parseInt(process.env.NEXT_PUBLIC_TOP_K || '5')
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
 */
export async function queryRAG(context: RAGContext): Promise<RAGResponse> {
  const ragService = RAGService.getInstance()
  await ragService.initialize()
  return ragService.query(context)
}

/**
 * 편의 함수: DB 재구축
 */
export async function rebuildRAGDatabase(): Promise<void> {
  const ragService = RAGService.getInstance()
  await ragService.rebuildDatabase()
}
