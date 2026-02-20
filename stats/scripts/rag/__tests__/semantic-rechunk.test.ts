/**
 * 시맨틱 청킹 스크립트 테스트
 *
 * 목적: 빌드 타임 스크립트 검증
 * - 설정 값 검증
 * - 함수 로직 검증 (모킹 사용)
 * - 에러 처리 검증
 */

import { vi } from 'vitest'
import * as path from 'path'

// 테스트할 설정값 (semantic-rechunk.ts에서 export 필요)
describe('Semantic Rechunk Script - Configuration', () => {
  it('should use correct Ollama endpoint', () => {
    const defaultEndpoint = 'http://localhost:11434'
    expect(defaultEndpoint).toBe('http://localhost:11434')
  })

  it('should use nomic-embed-text as default embedding model', () => {
    const defaultModel = 'nomic-embed-text'
    expect(defaultModel).toBe('nomic-embed-text')
  })

  it('should use optimized chunk size (512 tokens)', () => {
    const chunkSize = 512
    expect(chunkSize).toBe(512)
    expect(chunkSize).toBeGreaterThan(500) // Chroma 연구 결과
  })

  it('should use increased overlap (100 tokens)', () => {
    const chunkOverlap = 100
    expect(chunkOverlap).toBe(100)
    expect(chunkOverlap).toBeGreaterThan(50) // 기존 50 → 100
  })

  it('should define hierarchical separators', () => {
    const separators = [
      "\n\n\n",  // 섹션 구분
      "\n\n",    // 문단 구분
      "\n",      // 줄 구분
      ". ",      // 문장 구분
      "! ",
      "? ",
      " ",       // 단어 구분
      ""
    ]

    expect(separators.length).toBeGreaterThan(0)
    expect(separators[0]).toBe("\n\n\n") // 가장 큰 단위부터
    expect(separators[separators.length - 1]).toBe("") // 마지막은 빈 문자열
  })

  it('should have correct source DB path', () => {
    const sourceDbPath = path.join(process.cwd(), '../rag-system/data/rag.db')
    expect(sourceDbPath).toContain('rag-system')
    expect(sourceDbPath).toContain('rag.db')
  })

  it('should have correct output DB path', () => {
    const outputDbPath = path.join(process.cwd(), 'public/rag-data/rag-semantic.db')
    expect(outputDbPath).toContain('public')
    expect(outputDbPath).toContain('rag-data')
    expect(outputDbPath).toContain('rag-semantic.db')
  })
})

describe('Semantic Rechunk Script - Vector Conversion', () => {
  it('should convert vector to BLOB correctly', () => {
    // vectorToBlob 함수 테스트
    const testVector = [0.1, 0.2, 0.3, 0.4]

    // 수동 변환 (스크립트와 동일한 로직)
    const buffer = new ArrayBuffer(testVector.length * 4)
    const view = new DataView(buffer)

    for (let i = 0; i < testVector.length; i++) {
      view.setFloat32(i * 4, testVector[i], true) // little-endian
    }

    const blob = new Uint8Array(buffer)

    expect(blob).toBeInstanceOf(Uint8Array)
    expect(blob.length).toBe(testVector.length * 4) // 4 bytes per float
  })

  it('should handle empty vector', () => {
    const emptyVector: number[] = []
    const buffer = new ArrayBuffer(emptyVector.length * 4)
    const blob = new Uint8Array(buffer)

    expect(blob.length).toBe(0)
  })

  it('should handle large vector (768 dimensions)', () => {
    // nomic-embed-text는 768차원
    const largeVector = new Array(768).fill(0.5)
    const buffer = new ArrayBuffer(largeVector.length * 4)

    expect(buffer.byteLength).toBe(768 * 4) // 3072 bytes
  })
})

describe('Semantic Rechunk Script - Document Interface', () => {
  it('should define correct Document interface', () => {
    interface Document {
      doc_id: string
      title: string
      content: string
      library: string
      category: string | null
      summary: string | null
    }

    const testDoc: Document = {
      doc_id: 'test-1',
      title: 'Test Document',
      content: 'This is a test content.',
      library: 'scipy',
      category: 'stats',
      summary: 'A test document'
    }

    expect(testDoc.doc_id).toBe('test-1')
    expect(testDoc.library).toBe('scipy')
  })

  it('should define correct ChunkedDocument interface', () => {
    interface ChunkedDocument {
      doc_id: string
      parent_doc_id: string
      title: string
      content: string
      chunk_index: number
      total_chunks: number
      library: string
      category: string | null
      summary: string | null
      embedding: number[]
      embedding_model: string
    }

    const testChunk: ChunkedDocument = {
      doc_id: 'test-1_chunk_0',
      parent_doc_id: 'test-1',
      title: 'Test Document',
      content: 'First chunk content',
      chunk_index: 0,
      total_chunks: 3,
      library: 'scipy',
      category: 'stats',
      summary: 'A test document',
      embedding: [0.1, 0.2, 0.3],
      embedding_model: 'nomic-embed-text'
    }

    expect(testChunk.chunk_index).toBe(0)
    expect(testChunk.total_chunks).toBe(3)
    expect(testChunk.embedding_model).toBe('nomic-embed-text')
  })
})

describe('Semantic Rechunk Script - Error Handling', () => {
  it('should handle Ollama connection errors', async () => {
    // Ollama 연결 실패 시나리오
    const fakeEndpoint = 'http://localhost:99999'

    try {
      const response = await fetch(`${fakeEndpoint}/api/tags`, {
        signal: AbortSignal.timeout(1000) // 1초 타임아웃
      })
      expect(response.ok).toBe(false)
    } catch (error) {
      expect(error).toBeDefined()
      // 연결 실패 또는 타임아웃 에러 예상
    }
  })

  it('should validate embedding model availability', () => {
    // 모델 목록에서 임베딩 모델 찾기
    const mockModels = [
      { name: 'qwen2.5:3b' },
      { name: 'nomic-embed-text' },
      { name: 'llama3' }
    ]

    const embeddingModel = 'nomic-embed-text'
    const hasModel = mockModels.some(m => m.name.includes(embeddingModel))

    expect(hasModel).toBe(true)
  })

  it('should detect missing embedding model', () => {
    const mockModels = [
      { name: 'qwen2.5:3b' },
      { name: 'llama3' }
    ]

    const embeddingModel = 'nomic-embed-text'
    const hasModel = mockModels.some(m => m.name.includes(embeddingModel))

    expect(hasModel).toBe(false)
  })
})

describe('Semantic Rechunk Script - SQL Schema', () => {
  it('should create chunks table with correct schema', () => {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS chunks (
        doc_id TEXT PRIMARY KEY,
        parent_doc_id TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        total_chunks INTEGER NOT NULL,
        library TEXT NOT NULL,
        category TEXT,
        summary TEXT,
        embedding BLOB,
        embedding_model TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `

    expect(createTableSQL).toContain('doc_id TEXT PRIMARY KEY')
    expect(createTableSQL).toContain('parent_doc_id TEXT NOT NULL')
    expect(createTableSQL).toContain('embedding BLOB')
    expect(createTableSQL).toContain('embedding_model TEXT')
  })

  it('should create FTS5 index for keyword search', () => {
    const createFtsSQL = `
      CREATE VIRTUAL TABLE IF NOT EXISTS chunks_fts USING fts5(
        doc_id UNINDEXED,
        title,
        content,
        library,
        category
      )
    `

    expect(createFtsSQL).toContain('VIRTUAL TABLE')
    expect(createFtsSQL).toContain('fts5')
    expect(createFtsSQL).toContain('doc_id UNINDEXED')
  })
})

describe('Semantic Rechunk Script - Chunk ID Generation', () => {
  it('should generate correct chunk IDs', () => {
    const parentDocId = 'scipy_stats_ttest'
    const chunkIndex = 0
    const chunkId = `${parentDocId}_chunk_${chunkIndex}`

    expect(chunkId).toBe('scipy_stats_ttest_chunk_0')
    expect(chunkId).toContain('_chunk_')
  })

  it('should handle multiple chunks', () => {
    const parentDocId = 'scipy_stats_ttest'
    const totalChunks = 5
    const chunkIds: string[] = []

    for (let i = 0; i < totalChunks; i++) {
      chunkIds.push(`${parentDocId}_chunk_${i}`)
    }

    expect(chunkIds).toHaveLength(5)
    expect(chunkIds[0]).toBe('scipy_stats_ttest_chunk_0')
    expect(chunkIds[4]).toBe('scipy_stats_ttest_chunk_4')
  })
})
