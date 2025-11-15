/**
 * Markdown/Text 파서
 *
 * Markdown 및 일반 텍스트 파일에서 텍스트를 추출
 * 단순히 파일 내용을 읽어서 반환
 */

import * as fs from 'fs'
import type { DocumentParser, ParserMetadata } from './base-parser'

export class MarkdownParser implements DocumentParser {
  name = 'markdown-parser'
  supportedFormats = ['.md', '.txt', '.text', '.markdown']

  /**
   * Markdown/Text 파일에서 텍스트 추출
   */
  async parse(filePath: string): Promise<string> {
    try {
      // 파일 읽기 (UTF-8)
      const content = fs.readFileSync(filePath, 'utf-8')
      return content
    } catch (error) {
      console.error('[MarkdownParser] Error reading file:', error)
      throw new Error(
        `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      )
    }
  }

  /**
   * 파서 메타데이터 반환
   */
  getMetadata(): ParserMetadata {
    return {
      name: 'markdown-parser',
      version: '1.0.0',
      supportedFormats: this.supportedFormats,
      description: 'Markdown and plain text file parser'
    }
  }
}
