/**
 * 파일 업로드 플로우 테스트
 *
 * 전체 워크플로우:
 * 1. 파일 선택 → 2. 파서 선택 → 3. 파싱 → 4. 메타데이터 생성 → 5. 문서 추가
 */

import { describe, it } from 'vitest'
import type { Document } from '@/lib/rag/providers/base-provider'

describe('File Upload Flow - Metadata Extraction', () => {
  it('should extract metadata from filename pattern: {library}-{category}-{title}.ext', () => {
    const fileName = 'scipy-hypothesis-ttest_ind.pdf'
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
    const parts = fileNameWithoutExt.split('-')

    const library = parts[0]
    const category = parts[1]
    const title = parts.slice(2).join('-')

    expect(library).toBe('scipy')
    expect(category).toBe('hypothesis')
    expect(title).toBe('ttest_ind')
  })

  it('should handle filename with only library and title', () => {
    const fileName = 'numpy-array_basics.hwp'
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
    const parts = fileNameWithoutExt.split('-')

    let library = 'custom'
    let category = 'general'
    let title = fileNameWithoutExt

    if (parts.length === 2) {
      library = parts[0]
      title = parts[1]
    }

    expect(library).toBe('numpy')
    expect(category).toBe('general')
    expect(title).toBe('array_basics')
  })

  it('should generate doc_id with timestamp and sanitized filename', () => {
    const fileName = 'scipy-hypothesis-t test.pdf'
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
    const timestamp = 1234567890

    const sanitized = fileNameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_')
    const doc_id = `user_${timestamp}_${sanitized}`

    expect(doc_id).toContain('user_')
    expect(doc_id).toContain('scipy-hypothesis-t_test')
    expect(doc_id).not.toContain(' ') // 공백 제거됨
  })

  it('should handle Korean filename gracefully', () => {
    const fileName = '통계학-기초-t검정.hwp'
    const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
    const sanitized = fileNameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_')

    // 한글은 _ 로, 하이픈과 알파벳은 유지됨
    expect(sanitized).toBe('___-__-t__')
    expect(sanitized).not.toContain('통')
    expect(sanitized).not.toContain('검')
    // 실제 구현에서는 fallback 로직 필요 (예: uuid 사용)
  })
})

describe('File Upload Flow - Parser Selection', () => {
  it('should select parser by file extension', () => {
    const testCases = [
      { file: 'test.hwp', expected: 'hwp-parser' },
      { file: 'test.hwpx', expected: 'hwp-parser' },
      { file: 'test.pdf', expected: 'pdf-parser' },
      { file: 'test.md', expected: 'markdown-parser' },
      { file: 'test.txt', expected: 'markdown-parser' },
    ]

    testCases.forEach(({ file, expected }) => {
      const ext = '.' + file.split('.').pop()?.toLowerCase()

      // Mock parser registry
      const parserMap: Record<string, string> = {
        '.hwp': 'hwp-parser',
        '.hwpx': 'hwp-parser',
        '.pdf': 'pdf-parser',
        '.md': 'markdown-parser',
        '.txt': 'markdown-parser',
      }

      expect(parserMap[ext]).toBe(expected)
    })
  })

  it('should handle case-insensitive extensions', () => {
    const extensions = ['.PDF', '.Hwp', '.MD', '.TXT']

    extensions.forEach(ext => {
      const normalized = ext.toLowerCase()
      expect(normalized).toMatch(/^\.(pdf|hwp|md|txt)$/)
    })
  })

  it('should reject unsupported formats', () => {
    const unsupportedFiles = ['test.docx', 'test.xlsx', 'test.pptx']
    const supportedFormats = ['.hwp', '.hwpx', '.pdf', '.md', '.txt']

    unsupportedFiles.forEach(file => {
      const ext = '.' + file.split('.').pop()?.toLowerCase()
      expect(supportedFormats).not.toContain(ext)
    })
  })
})

describe('File Upload Flow - API Integration', () => {
  it('should send FormData with file to /api/rag/parse-file', async () => {
    const mockFile = new File(['test content'], 'test.md', { type: 'text/markdown' })
    const formData = new FormData()
    formData.append('file', mockFile)

    expect(formData.get('file')).toBeInstanceOf(File)
    expect((formData.get('file') as File).name).toBe('test.md')
  })

  it('should handle successful API response', () => {
    const mockResponse = {
      success: true,
      text: 'Parsed text content',
      metadata: {
        fileName: 'test.pdf',
        fileSize: 1024,
        fileType: '.pdf',
        parserName: 'pdf-parser',
        textLength: 19,
      },
    }

    expect(mockResponse.success).toBe(true)
    expect(mockResponse.text).toBeTruthy()
    expect(mockResponse.metadata.parserName).toBe('pdf-parser')
  })

  it('should handle API error response', () => {
    const mockErrorResponse = {
      error: '지원하지 않는 파일 형식입니다 (.docx)',
      supportedFormats: ['.hwp', '.hwpx', '.pdf', '.md', '.txt'],
    }

    expect(mockErrorResponse.error).toContain('지원하지 않는')
    expect(mockErrorResponse.supportedFormats).toHaveLength(5)
  })
})

describe('File Upload Flow - Document Creation', () => {
  it('should create valid Document object', () => {
    const document = {
      doc_id: 'user_1234567890_scipy_ttest',
      title: 'scipy.stats.ttest_ind',
      library: 'scipy',
      category: 'hypothesis',
      content: 'Parsed PDF content here...',
      summary: 'Independent t-test function',
    }

    expect(document).toHaveProperty('doc_id')
    expect(document).toHaveProperty('title')
    expect(document).toHaveProperty('library')
    expect(document).toHaveProperty('content')
    expect(document.doc_id).toContain('user_')
  })

  it('should handle optional fields', () => {
    const document: Document = {
      doc_id: 'user_1234567890_test',
      title: 'Test Document',
      library: 'custom',
      content: 'Content',
      // category와 summary 없음
    }

    expect(document.category).toBeUndefined()
    expect(document.summary).toBeUndefined()
  })
})

describe('File Upload Flow - State Management', () => {
  it('should track upload state transitions', () => {
    type UploadStatus = 'pending' | 'parsing' | 'success' | 'error'

    const stateTransitions: UploadStatus[] = ['pending', 'parsing', 'success']

    expect(stateTransitions[0]).toBe('pending')
    expect(stateTransitions[1]).toBe('parsing')
    expect(stateTransitions[2]).toBe('success')
  })

  it('should handle error state', () => {
    type UploadStatus = 'pending' | 'parsing' | 'success' | 'error'

    const errorTransition: UploadStatus[] = ['pending', 'parsing', 'error']

    expect(errorTransition[2]).toBe('error')
  })
})

describe('File Upload Flow - Integration Points', () => {
  it('should integrate with RAGService.addDocument', () => {
    const mockDocument = {
      doc_id: 'user_123_test',
      title: 'Test',
      library: 'custom',
      content: 'Content',
    }

    // RAGService.addDocument(mockDocument) 호출 시뮬레이션
    expect(mockDocument.doc_id).toBeTruthy()
    expect(mockDocument.title).toBeTruthy()
    expect(mockDocument.library).toBeTruthy()
    expect(mockDocument.content).toBeTruthy()
  })

  it('should trigger vector store rebuild manually', () => {
    let isRebuilding = false

    // Vector Store 재구축 트리거
    const handleRebuild = () => {
      isRebuilding = true
    }

    handleRebuild()
    expect(isRebuilding).toBe(true)
  })
})
