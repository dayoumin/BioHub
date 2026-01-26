/**
 * Ollama Provider CRUD 테스트
 *
 * 목적:
 * 1. 문서 추가 기능 검증
 * 2. 문서 수정 기능 검증
 * 3. 문서 삭제 기능 검증
 * 4. 문서 조회 기능 검증
 */

import { OllamaRAGProvider } from '@/lib/rag/providers/ollama-provider'

import { vi } from 'vitest'
// Fetch mock
global.fetch = vi.fn()

describe('OllamaRAGProvider - CRUD Operations', () => {
  let provider: OllamaRAGProvider

  beforeEach(async () => {
    provider = new OllamaRAGProvider({
      name: 'Ollama CRUD Test',
      ollamaEndpoint: 'http://localhost:11434',
      embeddingModel: 'nomic-embed-text',
      inferenceModel: 'qwen2.5:3b',
      vectorDbPath: '/test/rag.db',
      topK: 5,
      testMode: true // 테스트 모드 활성화
    })

    // Ollama 서버 모킹 (초기화용)
    ;(global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        models: [{ name: 'nomic-embed-text' }, { name: 'qwen2.5:3b' }]
      })
    })

    // Provider 초기화
    await provider.initialize()

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await provider.cleanup()
  })

  describe('Document Creation (C)', () => {
    it('should add a new document', async () => {
      const initialCount = provider.getDocumentCount()

      const docId = await provider.addDocument({
        title: 'Test Document',
        content: 'This is a test document for CRUD operations',
        library: 'test',
        category: 'testing',
        summary: 'Test summary'
      })

      expect(docId).toBeDefined()
      expect(docId).toContain('test_')
      expect(provider.getDocumentCount()).toBe(initialCount + 1)
    })

    it('should add document with custom doc_id', async () => {
      const customId = 'custom_test_doc'

      const docId = await provider.addDocument({
        doc_id: customId,
        title: 'Custom ID Document',
        content: 'Document with custom ID',
        library: 'test'
      })

      expect(docId).toBe(customId)

      const doc = await provider.getDocument(customId)
      expect(doc).not.toBeNull()
      expect(doc?.title).toBe('Custom ID Document')
    })

    it('should throw error if not initialized', async () => {
      const uninitProvider = new OllamaRAGProvider({ name: 'Uninit' })

      await expect(
        uninitProvider.addDocument({
          title: 'Test',
          content: 'Test',
          library: 'test'
        })
      ).rejects.toThrow('초기화되지 않았습니다')
    })
  })

  describe('Document Read (R)', () => {
    it('should get existing document', async () => {
      // 문서 추가
      const docId = await provider.addDocument({
        title: 'Read Test',
        content: 'Document for read test',
        library: 'test',
        category: 'reading'
      })

      // 문서 조회
      const doc = await provider.getDocument(docId)

      expect(doc).not.toBeNull()
      expect(doc?.doc_id).toBe(docId)
      expect(doc?.title).toBe('Read Test')
      expect(doc?.content).toBe('Document for read test')
      expect(doc?.library).toBe('test')
      expect(doc?.category).toBe('reading')
    })

    it('should return null for non-existent document', async () => {
      const doc = await provider.getDocument('non_existent_id')

      expect(doc).toBeNull()
    })

    it('should get document count', () => {
      const initialCount = provider.getDocumentCount()

      expect(typeof initialCount).toBe('number')
      expect(initialCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Document Update (U)', () => {
    it('should update document title', async () => {
      // 문서 추가
      const docId = await provider.addDocument({
        title: 'Original Title',
        content: 'Original content',
        library: 'test'
      })

      // 제목 수정
      const success = await provider.updateDocument(docId, {
        title: 'Updated Title'
      })

      expect(success).toBe(true)

      // 수정 확인
      const doc = await provider.getDocument(docId)
      expect(doc?.title).toBe('Updated Title')
      expect(doc?.content).toBe('Original content') // 내용은 유지
    })

    it('should update document content', async () => {
      const docId = await provider.addDocument({
        title: 'Test',
        content: 'Original content',
        library: 'test'
      })

      const success = await provider.updateDocument(docId, {
        content: 'Updated content'
      })

      expect(success).toBe(true)

      const doc = await provider.getDocument(docId)
      expect(doc?.content).toBe('Updated content')
    })

    it('should update multiple fields', async () => {
      const docId = await provider.addDocument({
        title: 'Original',
        content: 'Original',
        library: 'test',
        category: 'old'
      })

      const success = await provider.updateDocument(docId, {
        title: 'New Title',
        content: 'New Content',
        category: 'new',
        summary: 'New Summary'
      })

      expect(success).toBe(true)

      const doc = await provider.getDocument(docId)
      expect(doc?.title).toBe('New Title')
      expect(doc?.content).toBe('New Content')
      expect(doc?.category).toBe('new')
      expect(doc?.summary).toBe('New Summary')
    })

    it('should return false for non-existent document', async () => {
      const success = await provider.updateDocument('non_existent', {
        title: 'New'
      })

      expect(success).toBe(false)
    })

    it('should throw error if not initialized', async () => {
      const uninitProvider = new OllamaRAGProvider({ name: 'Uninit' })

      await expect(uninitProvider.updateDocument('test', { title: 'New' })).rejects.toThrow(
        '초기화되지 않았습니다'
      )
    })
  })

  describe('Document Delete (D)', () => {
    it('should delete existing document', async () => {
      // 문서 추가
      const docId = await provider.addDocument({
        title: 'To Delete',
        content: 'This will be deleted',
        library: 'test'
      })

      const initialCount = provider.getDocumentCount()

      // 삭제
      const success = await provider.deleteDocument(docId)

      expect(success).toBe(true)
      expect(provider.getDocumentCount()).toBe(initialCount - 1)

      // 삭제 확인
      const doc = await provider.getDocument(docId)
      expect(doc).toBeNull()
    })

    it('should return false for non-existent document', async () => {
      const success = await provider.deleteDocument('non_existent')

      expect(success).toBe(false)
    })

    it('should throw error if not initialized', async () => {
      const uninitProvider = new OllamaRAGProvider({ name: 'Uninit' })

      await expect(uninitProvider.deleteDocument('test')).rejects.toThrow('초기화되지 않았습니다')
    })
  })

  describe('CRUD Integration', () => {
    it('should perform full CRUD lifecycle', async () => {
      // Create
      const docId = await provider.addDocument({
        title: 'Lifecycle Test',
        content: 'Initial content',
        library: 'test',
        category: 'lifecycle'
      })

      expect(docId).toBeDefined()

      // Read
      let doc = await provider.getDocument(docId)
      expect(doc?.title).toBe('Lifecycle Test')

      // Update
      const updateSuccess = await provider.updateDocument(docId, {
        title: 'Updated Lifecycle',
        content: 'Updated content'
      })
      expect(updateSuccess).toBe(true)

      doc = await provider.getDocument(docId)
      expect(doc?.title).toBe('Updated Lifecycle')

      // Delete
      const deleteSuccess = await provider.deleteDocument(docId)
      expect(deleteSuccess).toBe(true)

      doc = await provider.getDocument(docId)
      expect(doc).toBeNull()
    })

    it('should maintain document count consistency', async () => {
      const initialCount = provider.getDocumentCount()

      // 3개 추가
      const id1 = await provider.addDocument({
        title: 'Doc 1',
        content: 'Content 1',
        library: 'test'
      })
      const id2 = await provider.addDocument({
        title: 'Doc 2',
        content: 'Content 2',
        library: 'test'
      })
      const id3 = await provider.addDocument({
        title: 'Doc 3',
        content: 'Content 3',
        library: 'test'
      })

      expect(provider.getDocumentCount()).toBe(initialCount + 3)

      // 1개 삭제
      await provider.deleteDocument(id2)
      expect(provider.getDocumentCount()).toBe(initialCount + 2)

      // 나머지 삭제
      await provider.deleteDocument(id1)
      await provider.deleteDocument(id3)
      expect(provider.getDocumentCount()).toBe(initialCount)
    })
  })
})
