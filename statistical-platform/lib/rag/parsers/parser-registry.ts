/**
 * Parser Registry
 *
 * 파일 확장자별로 적절한 파서를 자동 선택
 */

import * as path from 'path'
import type { DocumentParser, ParserRegistry as IParserRegistry } from './base-parser'
import { HWPParser } from './hwp-parser'
import { MarkdownParser } from './markdown-parser'

/**
 * 파서 레지스트리 싱글톤
 */
export class ParserRegistry implements IParserRegistry {
  private parsers: Map<string, DocumentParser> = new Map()
  private static instance: ParserRegistry | null = null

  private constructor() {
    // 기본 파서 등록
    this.register(new HWPParser())
    this.register(new MarkdownParser())
  }

  /**
   * 싱글톤 인스턴스 가져오기
   */
  static getInstance(): ParserRegistry {
    if (!ParserRegistry.instance) {
      ParserRegistry.instance = new ParserRegistry()
    }
    return ParserRegistry.instance
  }

  /**
   * 파서 등록
   */
  register(parser: DocumentParser): void {
    for (const format of parser.supportedFormats) {
      const normalized = format.toLowerCase().startsWith('.')
        ? format.toLowerCase()
        : `.${format.toLowerCase()}`

      this.parsers.set(normalized, parser)
    }

    console.log(
      `[ParserRegistry] Registered parser: ${parser.name} (${parser.supportedFormats.join(', ')})`
    )
  }

  /**
   * 파일 확장자로 파서 찾기
   *
   * @param filePathOrExtension - 파일 경로 또는 확장자 (.hwp, document.hwp 모두 가능)
   */
  getParser(filePathOrExtension: string): DocumentParser | null {
    const ext = filePathOrExtension.includes('/')
      ? path.extname(filePathOrExtension).toLowerCase()
      : filePathOrExtension.toLowerCase().startsWith('.')
        ? filePathOrExtension.toLowerCase()
        : `.${filePathOrExtension.toLowerCase()}`

    return this.parsers.get(ext) || null
  }

  /**
   * 등록된 모든 파서 목록
   */
  getAllParsers(): DocumentParser[] {
    const uniqueParsers = new Set(this.parsers.values())
    return Array.from(uniqueParsers)
  }

  /**
   * 지원하는 모든 확장자 목록
   */
  getSupportedFormats(): string[] {
    return Array.from(this.parsers.keys())
  }

  /**
   * 레지스트리 초기화 (테스트용)
   */
  clear(): void {
    this.parsers.clear()
  }
}

/**
 * 기본 레지스트리 인스턴스 (편의용)
 */
export const defaultParserRegistry = ParserRegistry.getInstance()
