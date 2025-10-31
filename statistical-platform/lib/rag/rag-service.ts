/**
 * RAG Service (통합 레이어)
 *
 * 통계 페이지에서 사용하는 단일 인터페이스
 * 환경 변수로 Provider 선택 가능
 */

import { BaseRAGProvider, RAGContext, RAGResponse } from './providers/base-provider'
import { ClaudeRAGProvider } from './providers/claude-provider'
import { LocalRAGProvider } from './providers/local-rag-provider'
import { OllamaRAGProvider } from './providers/ollama-provider'

export type RAGProviderType = 'claude' | 'local' | 'ollama'

export class RAGService {
  private static instance: RAGService | null = null
  private provider: BaseRAGProvider | null = null
  private providerType: RAGProviderType

  private constructor() {
    // 환경 변수로 Provider 선택 (기본: claude)
    this.providerType = (process.env.NEXT_PUBLIC_RAG_PROVIDER as RAGProviderType) || 'claude'
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

    console.log(`[RAGService] ${this.providerType} Provider 초기화 중...`)

    switch (this.providerType) {
      case 'claude':
        this.provider = new ClaudeRAGProvider({
          name: 'Claude',
          apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || ''
        })
        break

      case 'ollama':
        this.provider = new OllamaRAGProvider({
          name: 'Ollama (Local)',
          ollamaEndpoint: process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434',
          embeddingModel: process.env.NEXT_PUBLIC_OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
          inferenceModel: process.env.NEXT_PUBLIC_OLLAMA_INFERENCE_MODEL || 'qwen3:4b-q4_K_M',
          vectorDbPath: process.env.NEXT_PUBLIC_VECTOR_DB_PATH,
          topK: parseInt(process.env.NEXT_PUBLIC_TOP_K || '5')
        })
        break

      case 'local':
        this.provider = new LocalRAGProvider({
          name: 'Local RAG',
          embeddingModelPath: process.env.NEXT_PUBLIC_EMBEDDING_MODEL_PATH,
          vectorDbPath: process.env.NEXT_PUBLIC_VECTOR_DB_PATH
        })
        break

      default:
        throw new Error(`지원하지 않는 Provider: ${this.providerType}`)
    }

    await this.provider.initialize()
    console.log(`[RAGService] ${this.providerType} Provider 초기화 완료`)
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
   * Provider 변경 (런타임에 교체)
   */
  async switchProvider(newProvider: RAGProviderType): Promise<void> {
    console.log(`[RAGService] Provider 변경: ${this.providerType} → ${newProvider}`)

    // 기존 Provider 정리
    if (this.provider) {
      await this.provider.cleanup()
    }

    this.providerType = newProvider
    this.provider = null

    // 새 Provider 초기화
    await this.initialize()
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
