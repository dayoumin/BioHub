/**
 * Parser Architecture 테스트
 *
 * Parser와 Chunking Strategy 분리 검증
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { ParserRegistry } from '../../lib/rag/parsers/parser-registry'
import { HWPParser } from '../../lib/rag/parsers/hwp-parser'
import { MarkdownParser } from '../../lib/rag/parsers/markdown-parser'

describe('Parser Architecture', () => {
  describe('HWPParser', () => {
    it('should have correct metadata', () => {
      const parser = new HWPParser()
      const metadata = parser.getMetadata()

      expect(metadata.name).toBe('hwp-parser')
      expect(metadata.version).toBe('1.0.0')
      expect(metadata.supportedFormats).toEqual(['.hwp', '.hwpx'])
      expect(metadata.url).toBe('https://github.com/123jimin/node-hwp')
    })

    it('should support .hwp and .hwpx formats', () => {
      const parser = new HWPParser()
      expect(parser.supportedFormats).toContain('.hwp')
      expect(parser.supportedFormats).toContain('.hwpx')
    })
  })

  describe('MarkdownParser', () => {
    it('should have correct metadata', () => {
      const parser = new MarkdownParser()
      const metadata = parser.getMetadata()

      expect(metadata.name).toBe('markdown-parser')
      expect(metadata.version).toBe('1.0.0')
      expect(metadata.supportedFormats).toEqual(['.md', '.txt', '.text', '.markdown'])
    })

    it('should support markdown formats', () => {
      const parser = new MarkdownParser()
      expect(parser.supportedFormats).toContain('.md')
      expect(parser.supportedFormats).toContain('.txt')
      expect(parser.supportedFormats).toContain('.markdown')
    })
  })

  describe('ParserRegistry', () => {
    let registry: ParserRegistry

    beforeEach(() => {
      registry = new ParserRegistry()
      registry.clear() // 초기화
    })

    it('should register parsers', () => {
      const hwpParser = new HWPParser()
      registry.register(hwpParser)

      const parsers = registry.getAllParsers()
      expect(parsers.length).toBe(1)
      expect(parsers[0]).toBe(hwpParser)
    })

    it('should get parser by file extension', () => {
      const hwpParser = new HWPParser()
      const mdParser = new MarkdownParser()

      registry.register(hwpParser)
      registry.register(mdParser)

      expect(registry.getParser('.hwp')).toBe(hwpParser)
      expect(registry.getParser('.md')).toBe(mdParser)
      expect(registry.getParser('.txt')).toBe(mdParser)
    })

    it('should get parser by file path', () => {
      const hwpParser = new HWPParser()
      const mdParser = new MarkdownParser()

      registry.register(hwpParser)
      registry.register(mdParser)

      expect(registry.getParser('/path/to/document.hwp')).toBe(hwpParser)
      expect(registry.getParser('/path/to/document.md')).toBe(mdParser)
      expect(registry.getParser('/path/to/file.txt')).toBe(mdParser)
    })

    it('should handle case-insensitive extensions', () => {
      const hwpParser = new HWPParser()
      registry.register(hwpParser)

      expect(registry.getParser('.HWP')).toBe(hwpParser)
      expect(registry.getParser('.Hwp')).toBe(hwpParser)
      expect(registry.getParser('/path/to/DOC.HWP')).toBe(hwpParser)
    })

    it('should return null for unsupported formats', () => {
      const hwpParser = new HWPParser()
      registry.register(hwpParser)

      expect(registry.getParser('.pdf')).toBeNull()
      expect(registry.getParser('.docx')).toBeNull()
      expect(registry.getParser('/path/to/file.unknown')).toBeNull()
    })

    it('should get all supported formats', () => {
      const hwpParser = new HWPParser()
      const mdParser = new MarkdownParser()

      registry.register(hwpParser)
      registry.register(mdParser)

      const formats = registry.getSupportedFormats()
      expect(formats).toContain('.hwp')
      expect(formats).toContain('.hwpx')
      expect(formats).toContain('.md')
      expect(formats).toContain('.txt')
    })

    it('should not duplicate parsers', () => {
      const mdParser = new MarkdownParser()
      registry.register(mdParser)

      // .md, .txt, .text, .markdown 모두 같은 파서를 가리킴
      const parsers = registry.getAllParsers()
      expect(parsers.length).toBe(1)
    })
  })

  describe('Parser Selection Logic', () => {
    it('should select HWPParser for HWP files', () => {
      const registry = new ParserRegistry()
      registry.clear()
      registry.register(new HWPParser())
      registry.register(new MarkdownParser())

      const hwpFiles = [
        '/path/to/doc.hwp',
        '/path/to/doc.hwpx',
        '/path/to/doc.HWP'
      ]

      hwpFiles.forEach(filePath => {
        const parser = registry.getParser(filePath)
        expect(parser?.name).toBe('hwp-parser')
      })
    })

    it('should select MarkdownParser for text files', () => {
      const registry = new ParserRegistry()
      registry.clear()
      registry.register(new HWPParser())
      registry.register(new MarkdownParser())

      const textFiles = [
        '/path/to/doc.md',
        '/path/to/doc.txt',
        '/path/to/doc.markdown'
      ]

      textFiles.forEach(filePath => {
        const parser = registry.getParser(filePath)
        expect(parser?.name).toBe('markdown-parser')
      })
    })
  })

  describe('Separation of Concerns', () => {
    it('should separate parsing from chunking', () => {
      const hwpParser = new HWPParser()
      const mdParser = new MarkdownParser()

      // 파서는 parse() 메서드만 제공
      expect(hwpParser.parse).toBeDefined()
      expect(mdParser.parse).toBeDefined()

      // 청킹 관련 메서드는 없어야 함
      expect('chunk' in hwpParser).toBe(false)
      expect('chunk' in mdParser).toBe(false)
    })

    it('should have consistent parser interface', () => {
      const parsers = [
        new HWPParser(),
        new MarkdownParser()
      ]

      parsers.forEach(parser => {
        expect(parser).toHaveProperty('name')
        expect(parser).toHaveProperty('supportedFormats')
        expect(parser).toHaveProperty('parse')
        expect(parser).toHaveProperty('getMetadata')

        expect(typeof parser.name).toBe('string')
        expect(Array.isArray(parser.supportedFormats)).toBe(true)
        expect(typeof parser.parse).toBe('function')
        expect(typeof parser.getMetadata).toBe('function')
      })
    })
  })
})
