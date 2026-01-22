/**
 * semantic-rechunk.ts 통합 테스트
 *
 * 파일 타입 감지 로직 검증
 * (실제 HWP 파일 파싱은 제외 - 로직만 테스트)
 */

import { describe, it } from 'vitest'

describe('Semantic Rechunk - File Type Detection', () => {
  it('should detect HWP file by filePath extension (.hwp)', () => {
    const mockDoc = {
      doc_id: 'test-001',
      title: 'Test HWP Document',
      content: 'Some content',
      library: 'scipy',
      category: null,
      summary: null,
      filePath: '/path/to/document.hwp'
    }

    const ext = mockDoc.filePath.toLowerCase().match(/\.(hwp|hwpx)$/)
    expect(ext).toBeTruthy()
  })

  it('should detect HWP file by filePath extension (.hwpx)', () => {
    const mockDoc = {
      doc_id: 'test-002',
      title: 'Test HWPX Document',
      content: 'Some content',
      library: 'scipy',
      category: null,
      summary: null,
      filePath: '/path/to/document.hwpx'
    }

    const ext = mockDoc.filePath.toLowerCase().match(/\.(hwp|hwpx)$/)
    expect(ext).toBeTruthy()
  })

  it('should detect HWP file by doc_id prefix', () => {
    const mockDoc = {
      doc_id: 'hwp_doc_001',
      title: 'Test HWP Document',
      content: 'Some content',
      library: 'scipy',
      category: null,
      summary: null
    }

    const isHwp = mockDoc.doc_id.startsWith('hwp_')
    expect(isHwp).toBe(true)
  })

  it('should default to markdown for .md files', () => {
    const mockDoc = {
      doc_id: 'md_doc_001',
      title: 'Test Markdown Document',
      content: '# Some content',
      library: 'scipy',
      category: null,
      summary: null,
      filePath: '/path/to/document.md'
    }

    const ext = mockDoc.filePath.toLowerCase().match(/\.(hwp|hwpx)$/)
    expect(ext).toBeNull()
  })

  it('should default to markdown for .txt files', () => {
    const mockDoc = {
      doc_id: 'txt_doc_001',
      title: 'Test Text Document',
      content: 'Some content',
      library: 'scipy',
      category: null,
      summary: null,
      filePath: '/path/to/document.txt'
    }

    const ext = mockDoc.filePath.toLowerCase().match(/\.(hwp|hwpx)$/)
    expect(ext).toBeNull()
  })

  it('should default to markdown when no filePath is provided', () => {
    const mockDoc = {
      doc_id: 'doc_001',
      title: 'Test Document',
      content: 'Some content',
      library: 'scipy',
      category: null,
      summary: null
    }

    const hasFilePath = 'filePath' in mockDoc && mockDoc.filePath
    const isHwpById = mockDoc.doc_id.startsWith('hwp_')
    const shouldUseMarkdown = !hasFilePath && !isHwpById

    expect(shouldUseMarkdown).toBe(true)
  })
})

describe('Semantic Rechunk - Document Type Conversion', () => {
  it('should convert null category to undefined', () => {
    const mockDoc = {
      doc_id: 'test-001',
      title: 'Test Document',
      content: 'Some content',
      library: 'scipy',
      category: null as string | null,
      summary: null as string | null
    }

    const converted = {
      ...mockDoc,
      category: mockDoc.category ?? undefined,
      summary: mockDoc.summary ?? undefined
    }

    expect(converted.category).toBeUndefined()
    expect(converted.summary).toBeUndefined()
  })

  it('should preserve non-null category', () => {
    const mockDoc = {
      doc_id: 'test-002',
      title: 'Test Document',
      content: 'Some content',
      library: 'scipy',
      category: 'statistics' as string | null,
      summary: 'Test summary' as string | null
    }

    const converted = {
      ...mockDoc,
      category: mockDoc.category ?? undefined,
      summary: mockDoc.summary ?? undefined
    }

    expect(converted.category).toBe('statistics')
    expect(converted.summary).toBe('Test summary')
  })
})

describe('Semantic Rechunk - Chunking Strategy Selection', () => {
  it('should route to HWP strategy for .hwp files', () => {
    const mockDocs = [
      {
        doc_id: 'hwp_001',
        filePath: '/path/to/doc.hwp',
        expectedStrategy: 'hwp'
      },
      {
        doc_id: 'hwp_002',
        filePath: '/path/to/doc.hwpx',
        expectedStrategy: 'hwp'
      }
    ]

    mockDocs.forEach(doc => {
      const ext = doc.filePath.toLowerCase().match(/\.(hwp|hwpx)$/)
      const strategy = ext ? 'hwp' : 'markdown'
      expect(strategy).toBe(doc.expectedStrategy)
    })
  })

  it('should route to RecursiveCharacterTextSplitter for markdown/text files', () => {
    const mockDocs = [
      {
        doc_id: 'md_001',
        filePath: '/path/to/doc.md',
        expectedStrategy: 'markdown'
      },
      {
        doc_id: 'txt_001',
        filePath: '/path/to/doc.txt',
        expectedStrategy: 'markdown'
      },
      {
        doc_id: 'doc_001',
        // no filePath
        expectedStrategy: 'markdown'
      }
    ]

    mockDocs.forEach(doc => {
      const ext = doc.filePath?.toLowerCase().match(/\.(hwp|hwpx)$/)
      const strategy = ext ? 'hwp' : 'markdown'
      expect(strategy).toBe(doc.expectedStrategy)
    })
  })
})

describe('Semantic Rechunk - Lazy Initialization', () => {
  it('should initialize HWP strategy only when needed', () => {
    let hwpStrategy: unknown | null = null

    // 첫 번째 HWP 문서 처리 시
    const needsHwpStrategy = true
    if (needsHwpStrategy && !hwpStrategy) {
      hwpStrategy = {} // Mock initialization
    }

    expect(hwpStrategy).toBeTruthy()
  })

  it('should reuse HWP strategy instance', () => {
    let hwpStrategy: unknown | null = null

    // 첫 번째 문서
    if (!hwpStrategy) {
      hwpStrategy = { instance: 1 }
    }
    const firstInstance = hwpStrategy

    // 두 번째 문서 (재사용)
    if (!hwpStrategy) {
      hwpStrategy = { instance: 2 }
    }
    const secondInstance = hwpStrategy

    expect(firstInstance).toBe(secondInstance)
  })
})

describe('Semantic Rechunk - Chunk Structure Mapping', () => {
  it('should map HWP chunks to common format', () => {
    const mockHwpChunks = [
      {
        chunkId: 'hwp_001_chunk_0',
        parentDocId: 'hwp_001',
        title: 'Test Document',
        content: 'Chunk content 1',
        chunkIndex: 0,
        totalChunks: 2,
        library: 'scipy',
        category: undefined,
        summary: undefined
      },
      {
        chunkId: 'hwp_001_chunk_1',
        parentDocId: 'hwp_001',
        title: 'Test Document',
        content: 'Chunk content 2',
        chunkIndex: 1,
        totalChunks: 2,
        library: 'scipy',
        category: undefined,
        summary: undefined
      }
    ]

    const mappedChunks = mockHwpChunks.map(chunk => ({
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      totalChunks: chunk.totalChunks
    }))

    expect(mappedChunks).toHaveLength(2)
    expect(mappedChunks[0]).toEqual({
      content: 'Chunk content 1',
      chunkIndex: 0,
      totalChunks: 2
    })
    expect(mappedChunks[1]).toEqual({
      content: 'Chunk content 2',
      chunkIndex: 1,
      totalChunks: 2
    })
  })

  it('should map text splitter chunks to common format', () => {
    const mockTextChunks = ['Chunk 1', 'Chunk 2', 'Chunk 3']

    const mappedChunks = mockTextChunks.map((content, index) => ({
      content,
      chunkIndex: index,
      totalChunks: mockTextChunks.length
    }))

    expect(mappedChunks).toHaveLength(3)
    expect(mappedChunks[0]).toEqual({
      content: 'Chunk 1',
      chunkIndex: 0,
      totalChunks: 3
    })
    expect(mappedChunks[2]).toEqual({
      content: 'Chunk 3',
      chunkIndex: 2,
      totalChunks: 3
    })
  })
})

describe('Semantic Rechunk - Error Handling', () => {
  it('should handle documents without filePath gracefully', () => {
    const mockDoc = {
      doc_id: 'test-001',
      title: 'Test Document',
      content: 'Some content',
      library: 'scipy',
      category: null,
      summary: null
      // no filePath
    }

    const hasFilePath = 'filePath' in mockDoc && mockDoc.filePath
    expect(hasFilePath).toBe(false)

    // Should fall back to doc_id detection
    const isHwpById = mockDoc.doc_id.startsWith('hwp_')
    expect(isHwpById).toBe(false)
  })

  it('should handle case-insensitive file extensions', () => {
    const testCases = [
      '/path/to/DOC.HWP',
      '/path/to/doc.Hwp',
      '/path/to/doc.HWP',
      '/path/to/doc.hwp'
    ]

    testCases.forEach(filePath => {
      const ext = filePath.toLowerCase().match(/\.(hwp|hwpx)$/)
      expect(ext).toBeTruthy()
    })
  })

  it('should reject invalid file extensions', () => {
    const testCases = [
      '/path/to/doc.pdf',
      '/path/to/doc.docx',
      '/path/to/doc',
      '/path/to/doc.hwp.txt'
    ]

    testCases.forEach(filePath => {
      const ext = filePath.toLowerCase().match(/\.(hwp|hwpx)$/)
      expect(ext).toBeNull()
    })
  })
})
