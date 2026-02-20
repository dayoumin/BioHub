/**
 * HWP 청킹 전략
 *
 * hwp.js를 사용하여 HWP/HWPX 파일을 구조 기반으로 분할
 */

import type { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import type { ChunkingStrategy, Chunk, StrategyMetadata } from '../base-strategy'
import type { Document } from '../../providers/base-provider'

// hwp.js는 타입 정의가 불완전하므로 동적 import 사용

export class HWPChunkingStrategy implements ChunkingStrategy {
  name = 'hwp-chunking'
  supportedFormats = ['.hwp', '.hwpx']

  private textSplitter: RecursiveCharacterTextSplitter | null = null

  constructor() {
    // RecursiveCharacterTextSplitter는 런타임에 생성
  }

  private async getTextSplitter(): Promise<RecursiveCharacterTextSplitter> {
    if (!this.textSplitter) {
      const { RecursiveCharacterTextSplitter } = await import('@langchain/textsplitters')
      this.textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 512,
        chunkOverlap: 100,
        separators: ['\n\n\n', '\n\n', '\n', '. ', '! ', '? ', ' ', '']
      })
    }
    return this.textSplitter
  }

  async chunk(document: Document): Promise<Chunk[]> {
    try {
      // 1. HWP 파일 경로 확인
      const hwpPath = this.getHWPPath(document)
      if (!hwpPath) {
        throw new Error('HWP file path not found in document')
      }

      // 2. HWP 파일 파싱
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HWPDocument = (await import('hwp.js')) as any
      const hwpDoc = await HWPDocument.default.load(hwpPath)

      // 3. 텍스트 추출
      const extractedText = this.extractText(hwpDoc)

      // 4. 시맨틱 청킹 적용
      const textSplitter = await this.getTextSplitter()
      const textChunks = await textSplitter.splitText(extractedText)

      // 5. Chunk 객체 생성
      const chunks: Chunk[] = textChunks.map((content, index) => ({
        chunkId: `${document.doc_id}_chunk_${index}`,
        parentDocId: document.doc_id,
        title: document.title,
        content,
        chunkIndex: index,
        totalChunks: textChunks.length,
        library: document.library,
        category: document.category || undefined,
        summary: document.summary || undefined
      }))

      return chunks
    } catch (error) {
      console.error('[HWPChunkingStrategy] Error chunking HWP document:', error)
      throw error
    }
  }

  /**
   * HWP 파일 경로 추출
   */
  private getHWPPath(document: Document): string | null {
    // Document에 hwpPath 또는 filePath가 있을 것으로 가정
    // @ts-expect-error - hwpPath는 확장 필드
    if (document.hwpPath) {
      // @ts-expect-error - hwpPath는 확장 필드
      return document.hwpPath
    }

    // @ts-expect-error - filePath는 확장 필드
    if (document.filePath?.endsWith('.hwp') || document.filePath?.endsWith('.hwpx')) {
      // @ts-expect-error - filePath는 확장 필드
      return document.filePath
    }

    return null
  }

  /**
   * HWP 문서에서 텍스트 추출
   */
  private extractText(hwpDoc: unknown): string {
    const sections: string[] = []

    try {
      // HWP 문서의 섹션 순회
      const doc = hwpDoc as { sections?: Array<{ paragraphs?: unknown[] }> }
      if (doc.sections) {
        for (const section of doc.sections) {
          const sectionText: string[] = []

          // 각 섹션의 문단 추출
          if (section.paragraphs) {
            for (const paragraph of section.paragraphs) {
              const paragraphText = this.extractParagraphText(paragraph)
              if (paragraphText.trim()) {
                sectionText.push(paragraphText)
              }
            }
          }

          if (sectionText.length > 0) {
            sections.push(sectionText.join('\n\n'))
          }
        }
      }
    } catch (error) {
      console.warn('[HWPChunkingStrategy] Error extracting text from HWP:', error)
    }

    return sections.join('\n\n\n')
  }

  /**
   * 문단에서 텍스트 추출
   */
  private extractParagraphText(paragraph: unknown): string {
    try {
      // hwp.js의 Paragraph 타입은 복잡하므로 unknown으로 처리
      const para = paragraph as {
        content?: Array<{ text?: string; value?: string }>
        text?: string
      }

      // 방법 1: content 배열에서 추출
      if (para.content && Array.isArray(para.content)) {
        return para.content
          .map((item) => item.text || item.value || '')
          .join('')
      }

      // 방법 2: text 필드 직접 사용
      if (para.text) {
        return para.text
      }

      return ''
    } catch (error) {
      console.warn('[HWPChunkingStrategy] Error extracting paragraph text:', error)
      return ''
    }
  }

  getMetadata(): StrategyMetadata {
    return {
      name: 'hwp-chunking',
      version: '1.0.0',
      latency: '~30s/document (build time)',
      accuracy: 'N/A (same as semantic chunking)',
      params: {
        chunkSize: 512,
        chunkOverlap: 100,
        separators: ['\n\n\n', '\n\n', '\n', '. ', '! ', '? ', ' ', '']
      },
      url: 'https://github.com/hahnlee/hwp.js'
    }
  }
}
