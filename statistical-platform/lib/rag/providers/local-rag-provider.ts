/**
 * Local RAG Provider (구현 예정)
 *
 * 로컬 임베딩 + 추론 모델을 사용하는 RAG 제공자
 * - 임베딩: all-MiniLM-L6-v2 (Sentence Transformers)
 * - 벡터 DB: ChromaDB or FAISS
 * - 추론: Llama 3.2 or Claude (API)
 *
 * Week 2-4에서 구현 예정
 */

import { BaseRAGProvider, RAGContext, RAGResponse, RAGProviderConfig } from './base-provider'

export interface LocalRAGProviderConfig extends RAGProviderConfig {
  /** 임베딩 모델 경로 */
  embeddingModelPath?: string
  /** 벡터 DB 경로 */
  vectorDbPath?: string
  /** 추론 모델 설정 */
  inferenceModel?: {
    type: 'local' | 'api'
    modelName: string
    apiKey?: string
  }
}

export class LocalRAGProvider extends BaseRAGProvider {
  private isInitialized = false
  private embeddingModel: unknown = null // TODO: Week 2에서 구현
  private vectorDb: unknown = null // TODO: Week 2에서 구현
  private inferenceModel: unknown = null // TODO: Week 3에서 구현

  constructor(config: LocalRAGProviderConfig) {
    super(config)
  }

  async initialize(): Promise<void> {
    // TODO: Week 2-4에서 구현
    // 1. 임베딩 모델 로드
    // 2. 벡터 DB 연결
    // 3. 추론 모델 로드
    console.log('[LocalRAGProvider] 초기화 시작...')

    // 임시 구현: 로컬 파일 존재 확인
    const embeddingModelExists = false // TODO: 파일 체크
    const vectorDbExists = false // TODO: 파일 체크

    if (!embeddingModelExists) {
      throw new Error('임베딩 모델을 찾을 수 없습니다. Week 2 작업을 먼저 완료하세요.')
    }

    if (!vectorDbExists) {
      throw new Error('벡터 DB를 찾을 수 없습니다. Week 2 작업을 먼저 완료하세요.')
    }

    this.isInitialized = true
    console.log('[LocalRAGProvider] 초기화 완료')
  }

  async isReady(): Promise<boolean> {
    return this.isInitialized
  }

  async query(context: RAGContext): Promise<RAGResponse> {
    if (!this.isInitialized) {
      throw new Error('LocalRAGProvider가 초기화되지 않았습니다')
    }

    // TODO: Week 2-4에서 구현
    // 1. 쿼리 임베딩 생성
    // 2. 벡터 DB 검색 (Top-K)
    // 3. 관련 문서 + 쿼리 → 추론 모델
    // 4. 응답 생성

    // 임시 구현: 더미 응답
    return {
      answer: '(로컬 RAG는 아직 구현되지 않았습니다. Week 2-4 작업 후 사용 가능합니다.)',
      sources: [],
      model: {
        provider: 'Local RAG',
        embedding: 'all-MiniLM-L6-v2 (예정)',
        inference: 'Llama 3.2 or Claude (예정)'
      },
      metadata: {
        tokensUsed: 0,
        responseTime: 0
      }
    }
  }
}
