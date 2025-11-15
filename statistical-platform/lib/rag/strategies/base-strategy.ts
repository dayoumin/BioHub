/**
 * RAG 전략 인터페이스
 *
 * 청킹, 재순위화 등 RAG 컴포넌트를 플러그인으로 분리
 */

import type { Document } from '../providers/base-provider'

/**
 * 청크 인터페이스
 */
export interface Chunk {
  /** 청크 ID (예: 'doc_1_chunk_0') */
  chunkId: string
  /** 원본 문서 ID */
  parentDocId: string
  /** 문서 제목 */
  title: string
  /** 청크 내용 */
  content: string
  /** 청크 인덱스 (0부터 시작) */
  chunkIndex: number
  /** 전체 청크 개수 */
  totalChunks: number
  /** 라이브러리 (예: 'scipy', 'statsmodels') */
  library: string
  /** 카테고리 (선택) */
  category?: string
  /** 요약 (선택) */
  summary?: string
}

/**
 * 검색 결과 인터페이스
 */
export interface SearchResult {
  /** 문서 ID */
  docId: string
  /** 문서 제목 */
  title: string
  /** 문서 내용 */
  content: string
  /** 관련성 점수 (0.0 ~ 1.0) */
  score: number
  /** 라이브러리 */
  library?: string
  /** 카테고리 */
  category?: string
}

/**
 * 전략 메타데이터
 */
export interface StrategyMetadata {
  /** 전략 이름 */
  name: string
  /** 버전 */
  version: string
  /** 평균 지연 시간 (선택) */
  latency?: string
  /** 정확도 (선택) */
  accuracy?: string
  /** 파라미터 (선택) */
  params?: Record<string, unknown>
  /** 참고 논문 (선택) */
  paper?: string
  /** 참고 URL (선택) */
  url?: string
}

/**
 * 청킹 전략 인터페이스
 */
export interface ChunkingStrategy {
  /** 전략 이름 */
  name: string
  /** 지원 파일 형식 (예: ['.md', '.txt']) */
  supportedFormats: string[]

  /**
   * 문서를 청크로 분할
   */
  chunk(document: Document): Promise<Chunk[]>

  /**
   * 전략 메타데이터 조회
   */
  getMetadata(): StrategyMetadata
}

/**
 * 재순위화 전략 인터페이스
 */
export interface RerankingStrategy {
  /** 전략 이름 */
  name: string

  /**
   * 검색 결과 재순위화
   */
  rerank(
    query: string,
    candidates: SearchResult[],
    topK: number
  ): Promise<SearchResult[]>

  /**
   * 전략 메타데이터 조회
   */
  getMetadata(): StrategyMetadata
}

/**
 * 전략 레지스트리 인터페이스
 */
export interface StrategyRegistry {
  /**
   * 청킹 전략 등록
   */
  registerChunking(strategy: ChunkingStrategy): void

  /**
   * 재순위화 전략 등록
   */
  registerReranking(strategy: RerankingStrategy): void

  /**
   * 청킹 전략 조회
   */
  getChunking(name: string): ChunkingStrategy | undefined

  /**
   * 재순위화 전략 조회
   */
  getReranking(name: string): RerankingStrategy | undefined

  /**
   * 모든 청킹 전략 조회
   */
  getAllChunking(): ChunkingStrategy[]

  /**
   * 모든 재순위화 전략 조회
   */
  getAllReranking(): RerankingStrategy[]
}
