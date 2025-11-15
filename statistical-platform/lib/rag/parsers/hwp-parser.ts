/**
 * HWP/HWPX 파서
 *
 * hwp.js를 사용하여 HWP 파일에서 텍스트를 추출
 * 파싱 책임만 담당 (청킹은 별도 전략에서 처리)
 */

import type { DocumentParser, ParserMetadata } from './base-parser'

export class HWPParser implements DocumentParser {
  name = 'hwp-parser'
  supportedFormats = ['.hwp', '.hwpx']

  /**
   * HWP 파일에서 텍스트 추출
   */
  async parse(filePath: string): Promise<string> {
    try {
      // 1. HWP 파일 로드 (동적 import)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const HWPDocument = (await import('hwp.js')) as any
      const hwpDoc = await HWPDocument.default.load(filePath)

      // 2. 텍스트 추출
      const extractedText = this.extractText(hwpDoc)

      return extractedText
    } catch (error) {
      console.error('[HWPParser] Error parsing HWP file:', error)
      throw new Error(
        `Failed to parse HWP file: ${error instanceof Error ? error.message : String(error)}`
      )
    }
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
      console.warn('[HWPParser] Error extracting text from HWP:', error)
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
      console.warn('[HWPParser] Error extracting paragraph text:', error)
      return ''
    }
  }

  /**
   * 파서 메타데이터 반환
   */
  getMetadata(): ParserMetadata {
    return {
      name: 'hwp-parser',
      version: '1.0.0',
      supportedFormats: this.supportedFormats,
      description: 'HWP/HWPX file parser using hwp.js',
      url: 'https://github.com/hahnlee/hwp.js'
    }
  }
}
