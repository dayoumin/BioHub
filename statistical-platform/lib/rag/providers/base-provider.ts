/**
 * RAG Provider Base Interface
 *
 * 통계 분석 도우미를 위한 RAG 제공자 추상화
 * Claude API, 로컬 RAG 등 다양한 구현체를 지원
 */

/**
 * 검색 모드 (Ollama Provider 전용)
 */
export type SearchMode = 'fts5' | 'vector' | 'hybrid'

/**
 * Vector Store 정보
 */
export interface VectorStore {
  /** Vector Store ID (파일명 기반, 예: 'qwen3-embedding-0.6b') */
  id: string
  /** 표시 이름 (예: 'Qwen3 Embedding (0.6B)') */
  name: string
  /** DB 파일 경로 (예: '/rag-data/rag-qwen3-embedding-0.6b.db') */
  dbPath: string
  /** 임베딩 모델 이름 (예: 'qwen3-embedding:0.6b') */
  embeddingModel: string
  /** 임베딩 차원 (예: 1024) */
  dimensions: number
  /** 문서 개수 */
  docCount: number
  /** DB 파일 크기 (예: '5.4 MB') */
  fileSize: string
  /** 생성 시간 (Unix timestamp, 선택사항) */
  createdAt?: number
}

export interface RAGContext {
  /** 사용자 쿼리 */
  query: string
  /** 통계 메서드 (예: 'tTest', 'linearRegression') */
  method?: string
  /** 현재 분석 데이터 (선택) */
  analysisData?: unknown
  /** 대화 히스토리 (선택) */
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  /** 검색 모드 (Ollama Provider 전용) */
  searchMode?: SearchMode
}

export interface RAGResponse {
  /** 생성된 응답 */
  answer: string
  /** 참조된 문서 (선택) */
  sources?: Array<{
    title: string
    content: string
    score: number
  }>
  /** 사용된 모델 정보 */
  model: {
    provider: string
    embedding?: string
    inference?: string
  }
  /** 응답 메타데이터 */
  metadata?: {
    tokensUsed?: number
    responseTime?: number
  }
}

export interface RAGProviderConfig {
  /** 제공자 이름 */
  name: string
  /** API 키 (필요 시) */
  apiKey?: string
  /** 커스텀 설정 */
  options?: Record<string, unknown>
}

/**
 * 문서 입력 인터페이스
 */
export interface DocumentInput {
  doc_id?: string
  title: string
  content: string
  library: string
  category?: string
  summary?: string
}

/**
 * 문서 조회 결과 인터페이스
 */
export interface Document {
  doc_id: string
  title: string
  content: string
  library: string
  category?: string
  summary?: string
}

/**
 * RAG Provider 추상 클래스
 *
 * 모든 RAG 제공자는 이 인터페이스를 구현해야 함
 */
export abstract class BaseRAGProvider {
  protected config: RAGProviderConfig

  constructor(config: RAGProviderConfig) {
    this.config = config
  }

  /**
   * 쿼리에 대한 응답 생성
   */
  abstract query(context: RAGContext): Promise<RAGResponse>

  /**
   * Provider 초기화 (선택)
   */
  async initialize(): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
  }

  /**
   * Provider 정리 (선택)
   */
  async cleanup(): Promise<void> {
    // 기본 구현: 아무것도 하지 않음
  }

  /**
   * Provider 상태 확인
   */
  abstract isReady(): Promise<boolean>

  /**
   * 문서 추가 (선택)
   */
  async addDocument(document: DocumentInput): Promise<string> {
    throw new Error('addDocument not implemented')
  }

  /**
   * 문서 조회 (선택)
   */
  async getDocument(docId: string): Promise<Document | null> {
    throw new Error('getDocument not implemented')
  }

  /**
   * 문서 수정 (선택)
   */
  async updateDocument(docId: string, updates: Partial<DocumentInput>): Promise<boolean> {
    throw new Error('updateDocument not implemented')
  }

  /**
   * 문서 삭제 (선택)
   */
  async deleteDocument(docId: string): Promise<boolean> {
    throw new Error('deleteDocument not implemented')
  }

  /**
   * 문서 개수 조회 (선택)
   */
  getDocumentCount(): number {
    throw new Error('getDocumentCount not implemented')
  }

  /**
   * 전체 문서 목록 조회 (선택)
   */
  getAllDocuments(): Document[] {
    throw new Error('getAllDocuments not implemented')
  }
}
