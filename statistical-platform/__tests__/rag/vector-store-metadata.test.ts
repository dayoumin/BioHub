/**
 * Vector Store Metadata Tests
 *
 * getAvailableVectorStores() 동적 로드 기능 테스트
 */

import { getAvailableVectorStores } from '@/lib/rag/rag-service'
import type { VectorStore } from '@/lib/rag/providers/base-provider'

// Mock fetch for testing
global.fetch = jest.fn()

describe('getAvailableVectorStores', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('정상 동작', () => {
    it('vector-stores.json 파일을 fetch해야 함', async () => {
      const mockStores: VectorStore[] = [
        {
          id: 'test-model',
          name: 'Test Model',
          dbPath: '/rag-data/vector-test-model.db',
          embeddingModel: 'test-model',
          dimensions: 768,
          docCount: 50,
          fileSize: '2.5 MB',
          createdAt: 1234567890
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores
      })

      const stores = await getAvailableVectorStores()

      expect(global.fetch).toHaveBeenCalledWith('/rag-data/vector-stores.json')
      expect(stores).toEqual(mockStores)
    })

    it('여러 Vector Store가 있을 때 모두 반환해야 함', async () => {
      const mockStores: VectorStore[] = [
        {
          id: 'qwen3-embedding-0.6b',
          name: 'Qwen3 Embedding (0.6B)',
          dbPath: '/rag-data/vector-qwen3-embedding-0.6b.db',
          embeddingModel: 'qwen3-embedding:0.6b',
          dimensions: 1024,
          docCount: 111,
          fileSize: '5.4 MB',
          createdAt: 1762002430467
        },
        {
          id: 'mxbai-embed-large',
          name: 'MixedBread AI Embed Large',
          dbPath: '/rag-data/vector-mxbai-embed-large.db',
          embeddingModel: 'mxbai-embed-large',
          dimensions: 1024,
          docCount: 0,
          fileSize: '92.0 KB',
          createdAt: 1762002430343
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores
      })

      const stores = await getAvailableVectorStores()

      expect(stores).toHaveLength(2)
      expect(stores[0].id).toBe('qwen3-embedding-0.6b')
      expect(stores[1].id).toBe('mxbai-embed-large')
    })

    it('VectorStore 인터페이스를 만족해야 함', async () => {
      const mockStores: VectorStore[] = [
        {
          id: 'test-id',
          name: 'Test Name',
          dbPath: '/rag-data/vector-test.db',
          embeddingModel: 'test-model',
          dimensions: 768,
          docCount: 100,
          fileSize: '10 MB'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores
      })

      const stores = await getAvailableVectorStores()

      expect(stores[0]).toHaveProperty('id')
      expect(stores[0]).toHaveProperty('name')
      expect(stores[0]).toHaveProperty('dbPath')
      expect(stores[0]).toHaveProperty('embeddingModel')
      expect(stores[0]).toHaveProperty('dimensions')
      expect(stores[0]).toHaveProperty('docCount')
      expect(stores[0]).toHaveProperty('fileSize')
    })
  })

  describe('에러 처리', () => {
    it('파일이 없을 때 빈 배열 반환해야 함', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404
      })

      const stores = await getAvailableVectorStores()

      expect(stores).toEqual([])
    })

    it('fetch 실패 시 빈 배열 반환해야 함', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

      const stores = await getAvailableVectorStores()

      expect(stores).toEqual([])
    })

    it('잘못된 JSON 형식일 때 빈 배열 반환해야 함', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        }
      })

      const stores = await getAvailableVectorStores()

      expect(stores).toEqual([])
    })
  })

  describe('메타데이터 필드 검증', () => {
    it('파일 크기가 사람이 읽을 수 있는 형식이어야 함', async () => {
      const mockStores: VectorStore[] = [
        {
          id: 'test',
          name: 'Test',
          dbPath: '/rag-data/vector-test.db',
          embeddingModel: 'test',
          dimensions: 768,
          docCount: 100,
          fileSize: '5.4 MB'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores
      })

      const stores = await getAvailableVectorStores()

      expect(stores[0].fileSize).toMatch(/^\d+(\.\d+)?\s+(B|KB|MB|GB)$/)
    })

    it('dbPath가 올바른 경로여야 함', async () => {
      const mockStores: VectorStore[] = [
        {
          id: 'test',
          name: 'Test',
          dbPath: '/rag-data/vector-test.db',
          embeddingModel: 'test',
          dimensions: 768,
          docCount: 100,
          fileSize: '5 MB'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores
      })

      const stores = await getAvailableVectorStores()

      expect(stores[0].dbPath).toMatch(/^\/rag-data\/vector-.+\.db$/)
    })

    it('dimensions가 양수여야 함', async () => {
      const mockStores: VectorStore[] = [
        {
          id: 'test',
          name: 'Test',
          dbPath: '/rag-data/vector-test.db',
          embeddingModel: 'test',
          dimensions: 1024,
          docCount: 100,
          fileSize: '5 MB'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores
      })

      const stores = await getAvailableVectorStores()

      expect(stores[0].dimensions).toBeGreaterThan(0)
    })

    it('docCount가 음수가 아니어야 함', async () => {
      const mockStores: VectorStore[] = [
        {
          id: 'test',
          name: 'Test',
          dbPath: '/rag-data/vector-test.db',
          embeddingModel: 'test',
          dimensions: 768,
          docCount: 0,
          fileSize: '100 KB'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores
      })

      const stores = await getAvailableVectorStores()

      expect(stores[0].docCount).toBeGreaterThanOrEqual(0)
    })
  })

  describe('빌드 시나리오', () => {
    it('빈 배열도 처리할 수 있어야 함', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })

      const stores = await getAvailableVectorStores()

      expect(stores).toEqual([])
      expect(stores).toHaveLength(0)
    })

    it('정렬 순서를 유지해야 함 (build script가 정렬)', async () => {
      const mockStores: VectorStore[] = [
        {
          id: 'model-a',
          name: 'Model A',
          dbPath: '/rag-data/vector-model-a.db',
          embeddingModel: 'model-a',
          dimensions: 768,
          docCount: 200,
          fileSize: '10 MB'
        },
        {
          id: 'model-b',
          name: 'Model B',
          dbPath: '/rag-data/vector-model-b.db',
          embeddingModel: 'model-b',
          dimensions: 512,
          docCount: 50,
          fileSize: '5 MB'
        }
      ]

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores
      })

      const stores = await getAvailableVectorStores()

      // 빌드 스크립트가 docCount 내림차순으로 정렬
      expect(stores[0].docCount).toBeGreaterThanOrEqual(stores[1].docCount)
    })
  })
})
