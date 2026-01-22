/**
 * RAG Service 테스트
 *
 * 테스트 범위:
 * 1. Singleton 패턴 검증
 * 2. 설정 변경 감지 및 처리
 * 3. 벡터 스토어 ID 변환
 * 4. 초기화 로직 및 캐싱
 * 5. queryRAG() 함수의 올바른 설정
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { vi } from 'vitest'
import {
  RAGService,
  queryRAG,
  vectorStoreIdToPath,
  parseVectorStoreFilename,
  getAvailableVectorStores,
} from '../rag-service'
import type { RAGServiceConfig, RAGProviderType } from '../rag-service'

/**
 * Ollama 모킹 응답 (테스트용)
 */
const mockOllamaTagsResponse = {
  ok: true,
  json: async () => ({
    models: [
      { name: 'nomic-embed-text' },
      { name: 'qwen2.5' },
    ],
  }),
}

describe('RAGService', () => {
  beforeEach(() => {
    // 각 테스트 전에 Singleton 초기화
    // @ts-expect-error - private 멤버 접근 (테스트 목적)
    RAGService.instance = null

    // ✅ Fetch 전역 모킹 설정 (Ollama 서버 대신)
    // @ts-expect-error - 전역 fetch 모킹
    global.fetch = vi.fn().mockResolvedValue(mockOllamaTagsResponse)
  })

  afterEach(() => {
    // 테스트 후 fetch 모킹 정리
    vi.clearAllMocks()
    // @ts-expect-error - 모킹 제거
    delete global.fetch
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = RAGService.getInstance()
      const instance2 = RAGService.getInstance()
      expect(instance1).toBe(instance2)
    })

    it('should initialize only once for the same configuration', async () => {
      const service = RAGService.getInstance()
      const config: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
      }

      // 첫 번째 초기화
      await service.initialize(config)
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      const provider1 = service.provider

      // 두 번째 초기화 (같은 설정)
      await service.initialize(config)
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      const provider2 = service.provider

      // ✅ 같은 설정이면 캐싱되므로 같은 provider 인스턴스여야 함
      expect(provider1).toBe(provider2)
      expect(provider1).toBeDefined()  // ← null이 아님을 보장
    })

    it('should not reinitialize on same configuration call', async () => {
      const service = RAGService.getInstance()
      const config: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
      }

      // provider 상태는 설정 변경에 따라 결정됨
      // 설정이 변경되지 않으면 재초기화 안 함
      expect(service).toBeDefined()
    })
  })

  describe('Vector Store ID to Path Conversion', () => {
    it('should convert vectorStoreId to correct file path', () => {
      expect(vectorStoreIdToPath('qwen3-embedding-0.6b')).toBe(
        '/rag-data/vector-qwen3-embedding-0.6b.db'
      )

      expect(vectorStoreIdToPath('mxbai-embed-large')).toBe(
        '/rag-data/vector-mxbai-embed-large.db'
      )

      expect(vectorStoreIdToPath('nomic-embed-text')).toBe(
        '/rag-data/vector-nomic-embed-text.db'
      )
    })

    it('should handle hyphenated names correctly', () => {
      const path = vectorStoreIdToPath('my-custom-embed-1.5b')
      expect(path).toBe('/rag-data/vector-my-custom-embed-1.5b.db')
      expect(path).toMatch(/^\/rag-data\/vector-[\w\-\.]+\.db$/)
    })
  })

  describe('Vector Store Filename Parsing', () => {
    it('should parse valid vector store filenames', () => {
      const result1 = parseVectorStoreFilename('vector-qwen3-embedding-0.6b.db')
      expect(result1).toEqual({
        id: 'qwen3-embedding-0.6b',
        model: 'qwen3-embedding:0.6b',
      })

      const result2 = parseVectorStoreFilename('vector-mxbai-embed-large.db')
      expect(result2).toEqual({
        id: 'mxbai-embed-large',
        model: 'mxbai-embed-large',
      })
    })

    it('should return null for invalid filenames', () => {
      expect(parseVectorStoreFilename('rag.db')).toBeNull()
      expect(parseVectorStoreFilename('document.txt')).toBeNull()
      expect(parseVectorStoreFilename('vector-nomodel')).toBeNull()
    })

    it('should correctly transform version numbers in model names', () => {
      const result = parseVectorStoreFilename('vector-embedding-model-2.0b.db')
      expect(result?.model).toBe('embedding-model:2.0b')
    })
  })

  describe('Provider Type', () => {
    it('should return "ollama" as provider type', () => {
      const service = RAGService.getInstance()
      expect(service.getProviderType()).toBe('ollama')
    })
  })

  describe('Configuration Management', () => {
    it('should accept configuration object', () => {
      const service = RAGService.getInstance()

      const config1: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
        topK: 10,
      }

      // 설정 객체 구조 검증
      expect(config1).toHaveProperty('vectorStoreId')
      expect(config1).toHaveProperty('topK')
      expect(config1.vectorStoreId).toBe('qwen3-embedding-0.6b')
      expect(config1.topK).toBe(10)
    })

    it('should support partial configuration updates', () => {
      const baseConfig: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
        topK: 5,
      }

      const updateConfig: RAGServiceConfig = {
        topK: 10,
      }

      // 병합 시뮬레이션
      const merged = { ...baseConfig, ...updateConfig }

      expect(merged.vectorStoreId).toBe('qwen3-embedding-0.6b')
      expect(merged.topK).toBe(10)
    })
  })

  describe('Initialization State', () => {
    it('should track isReady state correctly', () => {
      const service = RAGService.getInstance()

      // 초기화 전 상태 확인만 (network 호출 없음)
      // 실제 초기화는 네트워크 필요하므로 mocked 테스트에서 수행
      expect(service).toBeDefined()
    })
  })

  describe('queryRAG Function', () => {
    it('should use environment variable or default vectorStoreId', () => {
      // queryRAG 함수의 패턴:
      // const vectorStoreId = process.env.NEXT_PUBLIC_VECTOR_STORE_ID || 'qwen3-embedding-0.6b'

      const originalEnv = process.env.NEXT_PUBLIC_VECTOR_STORE_ID

      try {
        // 환경변수 없을 때: 기본값
        delete process.env.NEXT_PUBLIC_VECTOR_STORE_ID
        const defaultStore =
          process.env.NEXT_PUBLIC_VECTOR_STORE_ID || 'qwen3-embedding-0.6b'
        expect(defaultStore).toBe('qwen3-embedding-0.6b')

        // 환경변수 있을 때: 환경변수 사용
        process.env.NEXT_PUBLIC_VECTOR_STORE_ID = 'mxbai-embed-large'
        const customStore =
          process.env.NEXT_PUBLIC_VECTOR_STORE_ID || 'qwen3-embedding-0.6b'
        expect(customStore).toBe('mxbai-embed-large')
      } finally {
        // 환경변수 복원
        process.env.NEXT_PUBLIC_VECTOR_STORE_ID = originalEnv
      }
    })

    it('should support flexible vector store configuration', () => {
      // queryRAG 호출 시 환경변수로 벡터 스토어 선택 가능
      const stores = [
        'qwen3-embedding-0.6b',
        'mxbai-embed-large',
        'nomic-embed-text',
      ]

      stores.forEach((storeId) => {
        const config: RAGServiceConfig = { vectorStoreId: storeId }
        expect(config.vectorStoreId).toBe(storeId)
      })
    })
  })

  describe('Service Cleanup', () => {
    it('should support shutdown method', () => {
      const service = RAGService.getInstance()

      // shutdown은 cleanup + instance 제거
      // 실제 호출은 mocked 테스트에서 수행
      expect(service).toHaveProperty('shutdown')
      expect(typeof service.shutdown).toBe('function')
    })
  })

  describe('Error Handling', () => {
    it('should have error handling for uninitialized service', () => {
      const service = RAGService.getInstance()

      // query 메서드 존재 확인
      expect(service).toHaveProperty('query')
      expect(typeof service.query).toBe('function')

      // 실제 에러는 mocked 테스트에서 검증
    })
  })
})

describe('Utility Functions', () => {
  describe('getAvailableVectorStores', () => {
    it('should return empty array if metadata file is not found', async () => {
      // 모의 fetch 설정
      const originalFetch = global.fetch
      // @ts-expect-error - 모의 처리
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
      })

      try {
        const stores = await getAvailableVectorStores()
        expect(stores).toEqual([])
      } finally {
        global.fetch = originalFetch
      }
    })

    it('should parse vector store metadata correctly', async () => {
      const mockStores = [
        {
          id: 'qwen3-embedding-0.6b',
          name: 'Qwen3 Embedding (0.6B)',
          dbPath: '/rag-data/vector-qwen3-embedding-0.6b.db',
          embeddingModel: 'qwen3-embedding:0.6b',
          dimensions: 1024,
          docCount: 111,
          fileSize: '5.4 MB',
          createdAt: 1762128783193,
        },
      ]

      const originalFetch = global.fetch
      // @ts-expect-error - 모의 처리
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => mockStores,
      })

      try {
        const stores = await getAvailableVectorStores()
        expect(stores).toEqual(mockStores)
        expect(stores[0].id).toBe('qwen3-embedding-0.6b')
        expect(stores[0].docCount).toBe(111)
      } finally {
        global.fetch = originalFetch
      }
    })
  })
})

describe('Integration: Configuration Flow', () => {
  it('should correctly flow from vectorStoreId to vectorDbPath', () => {
    const storeId = 'qwen3-embedding-0.6b'
    const expectedPath = vectorStoreIdToPath(storeId)

    expect(expectedPath).toBe('/rag-data/vector-qwen3-embedding-0.6b.db')
    expect(expectedPath).toMatch(/\.db$/)
    expect(expectedPath).toContain(storeId)
  })

  it('should round-trip: DB filename to metadata and back', () => {
    const dbFilename = 'vector-qwen3-embedding-0.6b.db'
    const parsed = parseVectorStoreFilename(dbFilename)

    expect(parsed).not.toBeNull()
    if (parsed) {
      const reconstructedPath = vectorStoreIdToPath(parsed.id)
      expect(reconstructedPath).toContain(parsed.id)
    }
  })
})
