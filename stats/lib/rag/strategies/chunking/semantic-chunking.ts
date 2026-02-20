/**
 * Semantic Chunking Strategy
 *
 * RecursiveCharacterTextSplitter를 사용한 의미 기반 청킹
 * 파서와 독립적으로 작동 (텍스트만 입력받음)
 */

import type { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import type { Chunk, StrategyMetadata } from '../base-strategy'

export interface ChunkingOptions {
  chunkSize?: number
  chunkOverlap?: number
  separators?: string[]
}

export interface DocumentMetadata {
  doc_id: string
  title: string
  library: string
  category?: string
  summary?: string
}

/**
 * Semantic Chunking Strategy
 */
export class SemanticChunkingStrategy {
  name = 'semantic-chunking'
  private textSplitter: RecursiveCharacterTextSplitter | null = null
  private options: ChunkingOptions

  constructor(options: ChunkingOptions = {}) {
    this.options = {
      chunkSize: options.chunkSize ?? 512,
      chunkOverlap: options.chunkOverlap ?? 100,
      separators: options.separators ?? ['\n\n\n', '\n\n', '\n', '. ', '! ', '? ', ' ', '']
    }
  }

  /**
   * TextSplitter 초기화 (lazy)
   */
  private async getTextSplitter(): Promise<RecursiveCharacterTextSplitter> {
    if (!this.textSplitter) {
      const { RecursiveCharacterTextSplitter } = await import('@langchain/textsplitters')
      this.textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: this.options.chunkSize!,
        chunkOverlap: this.options.chunkOverlap!,
        separators: this.options.separators!,
        lengthFunction: (text: string) => text.length
      })
    }
    return this.textSplitter
  }

  /**
   * 텍스트를 청크로 분할
   *
   * @param text - 파서가 추출한 텍스트
   * @param metadata - 문서 메타데이터
   */
  async chunk(text: string, metadata: DocumentMetadata): Promise<Chunk[]> {
    try {
      // 1. 텍스트 분할
      const textSplitter = await this.getTextSplitter()
      const textChunks = await textSplitter.splitText(text)

      // 2. Chunk 객체 생성
      const chunks: Chunk[] = textChunks.map((content, index) => ({
        chunkId: `${metadata.doc_id}_chunk_${index}`,
        parentDocId: metadata.doc_id,
        title: metadata.title,
        content,
        chunkIndex: index,
        totalChunks: textChunks.length,
        library: metadata.library,
        category: metadata.category,
        summary: metadata.summary
      }))

      return chunks
    } catch (error) {
      console.error('[SemanticChunkingStrategy] Error chunking text:', error)
      throw error
    }
  }

  /**
   * 전략 메타데이터 반환
   */
  getMetadata(): StrategyMetadata {
    return {
      name: 'semantic-chunking',
      version: '1.0.0',
      latency: '~100ms/document',
      accuracy: 'High (context-aware splitting)',
      params: {
        chunkSize: this.options.chunkSize,
        chunkOverlap: this.options.chunkOverlap,
        separators: this.options.separators
      } as Record<string, unknown>,
      url: 'https://js.langchain.com/docs/modules/indexes/text_splitters/'
    }
  }
}
