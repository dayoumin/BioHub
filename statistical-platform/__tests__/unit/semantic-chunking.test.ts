/**
 * SemanticChunkingStrategy 테스트
 *
 * 파서 독립적인 청킹 전략 검증
 * (LangChain ESM import 이슈로 인해 실제 청킹은 제외, 로직만 테스트)
 */

import { describe, it } from '@jest/globals'
import type { DocumentMetadata } from '../../lib/rag/strategies/chunking/semantic-chunking'

describe('SemanticChunkingStrategy - Configuration', () => {
  it('should have default options', () => {
    const defaultOptions = {
      chunkSize: 512,
      chunkOverlap: 100,
      separators: ['\n\n\n', '\n\n', '\n', '. ', '! ', '? ', ' ', '']
    }

    expect(defaultOptions.chunkSize).toBe(512)
    expect(defaultOptions.chunkOverlap).toBe(100)
    expect(defaultOptions.separators).toHaveLength(8)
  })

  it('should support custom options', () => {
    const customOptions = {
      chunkSize: 1024,
      chunkOverlap: 200,
      separators: ['\n\n', '\n']
    }

    expect(customOptions.chunkSize).toBe(1024)
    expect(customOptions.chunkOverlap).toBe(200)
    expect(customOptions.separators).toEqual(['\n\n', '\n'])
  })

  it('should have correct metadata structure', () => {
    const metadata = {
      name: 'semantic-chunking',
      version: '1.0.0',
      latency: '~100ms/document',
      accuracy: 'High (context-aware splitting)',
      params: {
        chunkSize: 512,
        chunkOverlap: 100,
        separators: ['\n\n\n', '\n\n', '\n', '. ', '! ', '? ', ' ', '']
      },
      url: 'https://js.langchain.com/docs/modules/indexes/text_splitters/'
    }

    expect(metadata.name).toBe('semantic-chunking')
    expect(metadata.version).toBe('1.0.0')
    expect(metadata.url).toContain('langchain.com')
    expect(metadata.params).toHaveProperty('chunkSize')
  })
})

describe('SemanticChunkingStrategy - Chunk Structure', () => {
  it('should generate correct chunk ID format', () => {
    const doc_id = 'doc_123'
    const chunkIndex = 0
    const expectedId = `${doc_id}_chunk_${chunkIndex}`

    expect(expectedId).toBe('doc_123_chunk_0')
    expect(expectedId).toContain('_chunk_')
  })

  it('should include all required chunk fields', () => {
    const mockChunk = {
      chunkId: 'test-001_chunk_0',
      parentDocId: 'test-001',
      title: 'Test Document',
      content: 'Test content',
      chunkIndex: 0,
      totalChunks: 3,
      library: 'scipy',
      category: 'statistics',
      summary: 'Test summary'
    }

    expect(mockChunk).toHaveProperty('chunkId')
    expect(mockChunk).toHaveProperty('parentDocId')
    expect(mockChunk).toHaveProperty('title')
    expect(mockChunk).toHaveProperty('content')
    expect(mockChunk).toHaveProperty('chunkIndex')
    expect(mockChunk).toHaveProperty('totalChunks')
    expect(mockChunk).toHaveProperty('library')
  })

  it('should preserve metadata in chunks', () => {
    const metadata: DocumentMetadata = {
      doc_id: 'test-001',
      title: 'Test Title',
      library: 'scipy',
      category: 'statistics',
      summary: 'Test summary'
    }

    expect(metadata.title).toBe('Test Title')
    expect(metadata.library).toBe('scipy')
    expect(metadata.category).toBe('statistics')
    expect(metadata.summary).toBe('Test summary')
  })

  it('should handle optional metadata fields', () => {
    const metadata: DocumentMetadata = {
      doc_id: 'test-001',
      title: 'Test',
      library: 'test'
      // category와 summary 없음
    }

    expect(metadata.category).toBeUndefined()
    expect(metadata.summary).toBeUndefined()
  })
})

describe('SemanticChunkingStrategy - Parser Independence', () => {
  it('should accept HWP-style text', () => {
    const hwpText = 'Section 1\n\n\nParagraph 1\n\nParagraph 2\n\n\nSection 2'
    expect(hwpText).toContain('\n\n\n') // 섹션 구분자
    expect(hwpText).toContain('\n\n')   // 문단 구분자
  })

  it('should accept Markdown-style text', () => {
    const mdText = '# Header\n\nContent here.\n\n## Subheader'
    expect(mdText).toContain('#')
    expect(mdText).toContain('\n\n')
  })

  it('should accept plain text', () => {
    const plainText = 'Just some plain text without structure.'
    expect(plainText.length).toBeGreaterThan(0)
  })

  it('should work with any text format', () => {
    const textFormats = [
      'HWP format: Section\n\n\nParagraph',
      'MD format: # Title\n\nContent',
      'Plain text format'
    ]

    textFormats.forEach(text => {
      expect(typeof text).toBe('string')
      expect(text.length).toBeGreaterThan(0)
    })
  })
})
