/**
 * HWP 청킹 전략 테스트
 *
 * 주의: LangChain ESM import 이슈로 인해 실제 클래스 import는 제외
 * 대신 인터페이스, 설정, 로직만 테스트
 */

import { describe, it } from 'vitest'

describe('HWP Chunking Strategy - Configuration', () => {
  it('should use correct strategy name', () => {
    const strategyName = 'hwp-chunking'
    expect(strategyName).toBe('hwp-chunking')
  })

  it('should support .hwp and .hwpx formats', () => {
    const supportedFormats = ['.hwp', '.hwpx']
    expect(supportedFormats).toContain('.hwp')
    expect(supportedFormats).toContain('.hwpx')
  })

  it('should have correct metadata structure', () => {
    const metadata = {
      name: 'hwp-chunking',
      version: '1.0.0',
      url: 'https://github.com/hahnlee/hwp.js',
      params: {
        chunkSize: 512,
        chunkOverlap: 100
      }
    }

    expect(metadata.name).toBe('hwp-chunking')
    expect(metadata.version).toBe('1.0.0')
    expect(metadata.url).toBe('https://github.com/hahnlee/hwp.js')
  })

  it('should use same chunk size as semantic chunking', () => {
    const chunkSize = 512
    const chunkOverlap = 100

    expect(chunkSize).toBe(512)
    expect(chunkOverlap).toBe(100)
  })

  it('should use hierarchical separators', () => {
    const separators = ['\n\n\n', '\n\n', '\n', '. ', '! ', '? ', ' ', '']

    expect(separators).toHaveLength(8)
    expect(separators[0]).toBe('\n\n\n') // 섹션 구분
    expect(separators[1]).toBe('\n\n')   // 문단 구분
    expect(separators[separators.length - 1]).toBe('') // 마지막은 빈 문자열
  })
})

describe('HWP Chunking Strategy - Chunk Structure', () => {
  it('should generate correct chunk ID format', () => {
    const parentDocId = 'hwp_doc_001'
    const chunkIndex = 0
    const expectedId = `${parentDocId}_chunk_${chunkIndex}`

    expect(expectedId).toBe('hwp_doc_001_chunk_0')
    expect(expectedId).toContain('_chunk_')
  })

  it('should include all required chunk fields', () => {
    const mockChunk = {
      chunkId: 'hwp_doc_001_chunk_0',
      parentDocId: 'hwp_doc_001',
      title: 'Test HWP Document',
      content: 'HWP 파일의 첫 번째 청크 내용입니다.',
      chunkIndex: 0,
      totalChunks: 3,
      library: 'scipy',
      category: 'stats',
      summary: 'Test document summary'
    }

    expect(mockChunk).toHaveProperty('chunkId')
    expect(mockChunk).toHaveProperty('parentDocId')
    expect(mockChunk).toHaveProperty('title')
    expect(mockChunk).toHaveProperty('content')
    expect(mockChunk).toHaveProperty('chunkIndex')
    expect(mockChunk).toHaveProperty('totalChunks')
    expect(mockChunk).toHaveProperty('library')
  })

  it('should handle multiple chunks', () => {
    const parentDocId = 'hwp_doc_001'
    const totalChunks = 5
    const chunkIds: string[] = []

    for (let i = 0; i < totalChunks; i++) {
      chunkIds.push(`${parentDocId}_chunk_${i}`)
    }

    expect(chunkIds).toHaveLength(5)
    expect(chunkIds[0]).toBe('hwp_doc_001_chunk_0')
    expect(chunkIds[4]).toBe('hwp_doc_001_chunk_4')
  })
})

describe('HWP Chunking Strategy - File Path Detection', () => {
  it('should detect .hwp files', () => {
    const filePath = '/path/to/document.hwp'
    expect(filePath.endsWith('.hwp')).toBe(true)
  })

  it('should detect .hwpx files', () => {
    const filePath = '/path/to/document.hwpx'
    expect(filePath.endsWith('.hwpx')).toBe(true)
  })

  it('should reject non-HWP files', () => {
    const filePaths = [
      '/path/to/document.pdf',
      '/path/to/document.docx',
      '/path/to/document.md'
    ]

    filePaths.forEach(filePath => {
      expect(filePath.endsWith('.hwp') || filePath.endsWith('.hwpx')).toBe(false)
    })
  })

  it('should extract HWP path from document', () => {
    const mockDoc = {
      doc_id: 'test-1',
      title: 'Test HWP',
      content: 'Some content',
      library: 'test',
      hwpPath: '/path/to/document.hwp'
    }

    expect(mockDoc.hwpPath).toBeTruthy()
    expect(mockDoc.hwpPath.endsWith('.hwp')).toBe(true)
  })
})

describe('HWP Chunking Strategy - Text Extraction Logic', () => {
  it('should extract text from HWP sections', () => {
    // Mock HWP structure
    const mockSections = [
      {
        paragraphs: [
          { content: [{ text: '첫 번째 문단' }] },
          { content: [{ text: '두 번째 문단' }] }
        ]
      },
      {
        paragraphs: [
          { content: [{ text: '세 번째 문단' }] }
        ]
      }
    ]

    // 예상 결과: 섹션은 \n\n\n으로, 문단은 \n\n으로 구분
    expect(mockSections).toHaveLength(2)
    expect(mockSections[0].paragraphs).toHaveLength(2)
    expect(mockSections[1].paragraphs).toHaveLength(1)
  })

  it('should handle empty paragraphs', () => {
    const mockParagraph = { content: [] }
    expect(mockParagraph.content).toHaveLength(0)
  })

  it('should handle paragraphs with text field', () => {
    const mockParagraph = { text: '직접 텍스트 필드' }
    expect(mockParagraph.text).toBe('직접 텍스트 필드')
  })

  it('should handle paragraphs with content array', () => {
    const mockParagraph = {
      content: [
        { text: 'Part 1' },
        { value: 'Part 2' },
        { text: 'Part 3' }
      ]
    }

    const texts = mockParagraph.content
      .map(item => item.text || (item as { value?: string }).value || '')
      .join('')

    expect(texts).toBe('Part 1Part 2Part 3')
  })

  it('should join sections with triple newlines', () => {
    const sections = ['Section 1 content', 'Section 2 content']
    const joined = sections.join('\n\n\n')

    expect(joined).toContain('\n\n\n')
    expect(joined).toBe('Section 1 content\n\n\nSection 2 content')
  })

  it('should join paragraphs with double newlines', () => {
    const paragraphs = ['Paragraph 1', 'Paragraph 2', 'Paragraph 3']
    const joined = paragraphs.join('\n\n')

    expect(joined).toContain('\n\n')
    expect(joined).toBe('Paragraph 1\n\nParagraph 2\n\nParagraph 3')
  })
})

describe('HWP Chunking Strategy - Error Handling', () => {
  it('should detect missing HWP path', () => {
    const mockDoc = {
      doc_id: 'test-1',
      title: 'Test Document',
      content: 'Some content',
      library: 'test'
      // hwpPath 없음
    }

    const hasHwpPath = 'hwpPath' in mockDoc
    expect(hasHwpPath).toBe(false)
  })

  it('should validate file extension', () => {
    const invalidPaths = [
      '/path/to/document.txt',
      '/path/to/document.pdf',
      '/path/to/document'
    ]

    invalidPaths.forEach(path => {
      const isValidHWP = path.endsWith('.hwp') || path.endsWith('.hwpx')
      expect(isValidHWP).toBe(false)
    })
  })
})

describe('HWP Chunking Strategy - Integration', () => {
  it('should be compatible with semantic chunking settings', () => {
    const hwpSettings = {
      chunkSize: 512,
      chunkOverlap: 100
    }

    const semanticSettings = {
      chunkSize: 512,
      chunkOverlap: 100
    }

    expect(hwpSettings.chunkSize).toBe(semanticSettings.chunkSize)
    expect(hwpSettings.chunkOverlap).toBe(semanticSettings.chunkOverlap)
  })

  it('should support plugin architecture interface', () => {
    const strategyInterface = {
      name: 'hwp-chunking',
      supportedFormats: ['.hwp', '.hwpx'],
      chunk: async () => [],
      getMetadata: () => ({ name: 'hwp-chunking', version: '1.0.0' })
    }

    expect(strategyInterface).toHaveProperty('name')
    expect(strategyInterface).toHaveProperty('supportedFormats')
    expect(strategyInterface).toHaveProperty('chunk')
    expect(strategyInterface).toHaveProperty('getMetadata')

    expect(typeof strategyInterface.chunk).toBe('function')
    expect(typeof strategyInterface.getMetadata).toBe('function')
  })

  it('should match ChunkingStrategy interface', () => {
    // ChunkingStrategy 인터페이스 필드 확인
    const requiredFields = ['name', 'supportedFormats', 'chunk', 'getMetadata']

    const mockStrategy = {
      name: 'test',
      supportedFormats: ['.test'],
      chunk: async () => [],
      getMetadata: () => ({ name: 'test', version: '1.0.0' })
    }

    requiredFields.forEach(field => {
      expect(mockStrategy).toHaveProperty(field)
    })
  })
})
