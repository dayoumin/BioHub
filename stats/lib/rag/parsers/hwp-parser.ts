/**
 * HWP/HWPX 파서
 *
 * node-hwp를 사용하여 HWP 파일에서 텍스트를 추출
 * 파싱 책임만 담당 (청킹은 별도 전략에서 처리)
 */

import type { DocumentParser, ParserMetadata } from './base-parser'

export class HWPParser implements DocumentParser {
  name = 'hwp-parser'
  supportedFormats = ['.hwp'] // node-hwp는 HWP5(바이너리), HML만 지원 (.hwpx 미지원)

  /**
   * HWP 파일에서 텍스트 추출
   */
  async parse(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
       
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
   *
   * 구조 보존 규칙:
   * - 블록 태그 (</P>, </SECTION>) → \n\n (문단 구분)
   * - 인라인 태그 → 공백
   * - Chunker가 인식할 수 있도록 구조 유지
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

      // XML to text conversion with structure preservation
      const text = hwpml
        // 1. 블록 레벨 태그 → \n\n (문단 구분)
        .replace(/<\/(P|SECTION|TABLE|LIST)>/gi, '\n\n')
        // 2. 줄바꿈 태그 → \n
        .replace(/<BR\s*\/?>/gi, '\n')
        // 3. 나머지 XML 태그 제거
        .replace(/<[^>]+>/g, ' ')
        // 4. HTML 엔티티 디코딩 (기본적인 것만)
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
        // 5. 연속된 공백/탭 → 단일 공백
        .replace(/[ \t]+/g, ' ')
        // 6. 연속된 줄바꿈 정리 (3개 이상 → 2개)
        .replace(/\n{3,}/g, '\n\n')
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
      description: 'HWP5 (binary) file parser using node-hwp (HWPX not supported)',
      url: 'https://github.com/123jimin/node-hwp'
    }
  }
}
