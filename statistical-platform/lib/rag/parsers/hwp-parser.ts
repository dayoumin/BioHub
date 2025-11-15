/**
 * HWP/HWPX 파서
 *
 * node-hwp를 사용하여 HWP 파일에서 텍스트를 추출
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
    return new Promise((resolve, reject) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import('node-hwp')
        .then((hwpModule) => {
          const hwp = hwpModule.default || hwpModule

          // node-hwp API: hwp.open(filePath, callback)
          hwp.open(filePath, (err: Error | null, doc: unknown) => {
            if (err) {
              console.error('[HWPParser] Error parsing HWP file:', err)
              reject(
                new Error(`Failed to parse HWP file: ${err.message}`)
              )
              return
            }

            try {
              // HWPML to text conversion
              const extractedText = this.extractText(doc)
              resolve(extractedText)
            } catch (extractError) {
              console.error('[HWPParser] Error extracting text:', extractError)
              reject(extractError)
            }
          })
        })
        .catch((importError) => {
          console.error('[HWPParser] Error importing node-hwp:', importError)
          reject(new Error(`Failed to import node-hwp: ${importError instanceof Error ? importError.message : String(importError)}`))
        })
    })
  }

  /**
   * HWP 문서에서 텍스트 추출 (HWPML → Text)
   * node-hwp의 doc.toHML() 사용
   */
  private extractText(hwpDoc: unknown): string {
    try {
      // node-hwp doc object has toHML() method
      const doc = hwpDoc as { toHML?: () => string }

      if (typeof doc.toHML !== 'function') {
        throw new Error('Invalid HWP document: toHML() method not found')
      }

      // Get HWPML (XML format)
      const hwpml = doc.toHML()

      // Simple XML to text conversion
      // Remove XML tags and extract text content
      const text = hwpml
        .replace(/<[^>]+>/g, ' ') // Remove XML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()

      return text
    } catch (error) {
      console.error('[HWPParser] Error extracting text from HWP:', error)
      throw error
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
      description: 'HWP/HWPX file parser using node-hwp',
      url: 'https://github.com/123jimin/node-hwp'
    }
  }
}
