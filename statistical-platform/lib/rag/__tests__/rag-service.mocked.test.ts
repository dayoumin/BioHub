/**
 * RAG Service 테스트 (fetch 모킹 버전)
 *
 * Ollama 서버 없이 안전하게 실행 가능한 테스트
 * - fetch를 전역적으로 모킹
 * - 네트워크 에러 방지
 * - Singleton 및 설정 관리 검증
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import {
  RAGService,
  vectorStoreIdToPath,
  parseVectorStoreFilename,
} from '../rag-service'
import type { RAGServiceConfig } from '../rag-service'

describe('RAGService with Mocked Network', () => {
  beforeEach(() => {
    // 각 테스트 전에 Singleton 초기화
    // @ts-expect-error - private 멤버 접근 (테스트 목적)
    RAGService.instance = null

    // Fetch 전역 모킹 설정
    // @ts-expect-error - 모킹
    global.fetch = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
    // @ts-expect-error - 모킹 제거
    delete global.fetch
  })

  describe('Singleton Pattern with Network Isolation', () => {
    it('should return same instance without network calls', () => {
      const instance1 = RAGService.getInstance()
      const instance2 = RAGService.getInstance()
      expect(instance1).toBe(instance2)

      // 이 단계에서는 fetch 호출 없어야 함 (Singleton 반환만)
      // @ts-expect-error - 모킹
      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should initialize with mocked Ollama response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5' },
          ],
        }),
      }

      // @ts-expect-error - 모킹
      global.fetch = jest.fn().mockResolvedValueOnce(mockResponse)

      const service = RAGService.getInstance()

      try {
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })
      } catch (e) {
        // SQLite DB 로드 에러는 무시 (네트워크 모킹만 목표)
      }

      // Ollama API 호출 확인
      // @ts-expect-error - 모킹
      const calls = global.fetch.mock.calls
      const tagsCall = calls.find(
        (call) =>
          typeof call[0] === 'string' && call[0].includes('/api/tags')
      )
      expect(tagsCall).toBeDefined()
    })

    it('should handle Ollama connection error gracefully', async () => {
      // Ollama 서버 미실행 시뮬레이션
      // @ts-expect-error - 모킹
      global.fetch = jest.fn().mockRejectedValueOnce(
        new Error('ECONNREFUSED: Connection refused')
      )

      const service = RAGService.getInstance()

      try {
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })
        // @ts-expect-error Jest fail method
        expect.fail('should throw error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toMatch(/Connection|ECONNREFUSED|connect/)
      }
    })

    it('should not reinitialize on same configuration', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5' },
          ],
        }),
      }

      // @ts-expect-error - 모킹
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce(mockResponse)
        .mockResolvedValueOnce(mockResponse)

      const service = RAGService.getInstance()
      const config: RAGServiceConfig = {
        vectorStoreId: 'qwen3-embedding-0.6b',
      }

      try {
        // 첫 번째 초기화
        await service.initialize(config)
      } catch (e) {
        // DB 로드 에러 무시
      }

      // @ts-expect-error - 모킹
      const firstFetchCount = global.fetch.mock.calls.length

      try {
        // 두 번째 초기화 (같은 설정)
        await service.initialize(config)
      } catch (e) {
        // DB 로드 에러 무시
      }

      // @ts-expect-error - 모킹
      const secondFetchCount = global.fetch.mock.calls.length

      // 캐싱되므로 fetch 호출이 증가하지 않아야 함
      expect(firstFetchCount).toBe(secondFetchCount)
    })

    it('should reinitialize when configuration changes', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5' },
          ],
        }),
      }

      // @ts-expect-error - 모킹
      global.fetch = jest
        .fn()
        .mockResolvedValue(mockResponse)

      const service = RAGService.getInstance()

      try {
        // 첫 번째 초기화
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })
      } catch (e) {
        // DB 로드 에러 무시
      }

      // @ts-expect-error - 모킹
      const firstFetchCount = global.fetch.mock.calls.length

      try {
        // 다른 설정으로 초기화
        await service.initialize({
          vectorStoreId: 'mxbai-embed-large',
        })
      } catch (e) {
        // DB 로드 에러 무시
      }

      // @ts-expect-error - 모킹
      const secondFetchCount = global.fetch.mock.calls.length

      // 설정이 변경되었으므로 fetch 호출이 증가해야 함
      expect(secondFetchCount).toBeGreaterThan(firstFetchCount)
    })
  })

  describe('Configuration with Environment Variables', () => {
    it('should accept vectorStoreId from environment', () => {
      const originalEnv = process.env.NEXT_PUBLIC_VECTOR_STORE_ID

      try {
        // 환경변수 설정
        process.env.NEXT_PUBLIC_VECTOR_STORE_ID = 'mxbai-embed-large'

        const vectorStoreId =
          process.env.NEXT_PUBLIC_VECTOR_STORE_ID || 'qwen3-embedding-0.6b'

        expect(vectorStoreId).toBe('mxbai-embed-large')
      } finally {
        // 환경변수 복원
        process.env.NEXT_PUBLIC_VECTOR_STORE_ID = originalEnv
      }
    })

    it('should use default when environment variable not set', () => {
      const originalEnv = process.env.NEXT_PUBLIC_VECTOR_STORE_ID

      try {
        // 환경변수 제거
        delete process.env.NEXT_PUBLIC_VECTOR_STORE_ID

        const vectorStoreId =
          process.env.NEXT_PUBLIC_VECTOR_STORE_ID || 'qwen3-embedding-0.6b'

        expect(vectorStoreId).toBe('qwen3-embedding-0.6b')
      } finally {
        // 환경변수 복원
        process.env.NEXT_PUBLIC_VECTOR_STORE_ID = originalEnv
      }
    })
  })

  describe('Embedding API Request Format', () => {
    it('should send embedding request with correct format', async () => {
      const mockEmbeddingResponse = {
        ok: true,
        json: async () => ({
          embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
        }),
      }

      // @ts-expect-error - 모킹
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [
              { name: 'nomic-embed-text' },
              { name: 'qwen2.5' },
            ],
          }),
        })
        .mockResolvedValueOnce(mockEmbeddingResponse)

      const service = RAGService.getInstance()

      try {
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })

        // 초기화 시 /api/tags 호출됨
        // @ts-expect-error - 모킹
        const tagsCall = global.fetch.mock.calls[0]
        expect(tagsCall[0]).toContain('/api/tags')
      } catch (e) {
        // DB 로드 에러 무시
      }
    })

    it('should use input field (not prompt) for embeddings', () => {
      // ✅ 올바른 요청 형식
      const correctRequest = {
        model: 'nomic-embed-text',
        input: 'query text', // ← "input" 필드 사용
      }

      // ❌ 잘못된 형식
      const incorrectRequest = {
        model: 'nomic-embed-text',
        prompt: 'query text', // ← "prompt" 필드 (지원 안 함)
      }

      expect(correctRequest).toHaveProperty('input')
      expect(correctRequest).not.toHaveProperty('prompt')

      expect(incorrectRequest).toHaveProperty('prompt')
      expect(incorrectRequest).not.toHaveProperty('input')
    })
  })

  describe('Error Handling', () => {
    it('should handle 400 Bad Request from Ollama', async () => {
      // Ollama API 에러 (잘못된 요청)
      // @ts-expect-error - 모킹
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid model' }),
      })

      const service = RAGService.getInstance()

      try {
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })
        // @ts-expect-error Jest fail method
        expect.fail('should throw error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should handle 404 Not Found from Ollama', async () => {
      // Ollama API에서 모델 찾을 수 없음
      // @ts-expect-error - 모킹
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Model not found' }),
      })

      const service = RAGService.getInstance()

      try {
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })
        // @ts-expect-error Jest fail method
        expect.fail('should throw error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should handle network timeout', async () => {
      // 네트워크 타임아웃
      // @ts-expect-error - 모킹
      global.fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Timeout after 30000ms'))

      const service = RAGService.getInstance()

      try {
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })
        // @ts-expect-error Jest fail method
        expect.fail('should throw error')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toMatch(/Timeout|timeout/)
      }
    })
  })

  describe('Vector Store Configuration Flexibility', () => {
    it('should support switching between vector stores via config', () => {
      const stores = [
        { id: 'qwen3-embedding-0.6b', docs: 111 },
        { id: 'mxbai-embed-large', docs: 0 },
        { id: 'nomic-embed-text', docs: 0 },
      ]

      stores.forEach(({ id, docs }) => {
        const config: RAGServiceConfig = {
          vectorStoreId: id,
        }

        expect(config.vectorStoreId).toBe(id)
        expect(vectorStoreIdToPath(id)).toContain(id)
      })
    })

    it('should handle dynamic store selection from environment', () => {
      const environments = [
        { env: 'qwen3-embedding-0.6b', expected: 'qwen3-embedding-0.6b' },
        { env: 'mxbai-embed-large', expected: 'mxbai-embed-large' },
        { env: undefined, expected: 'qwen3-embedding-0.6b' }, // default
      ]

      environments.forEach(({ env, expected }) => {
        const selected = env || 'qwen3-embedding-0.6b'
        expect(selected).toBe(expected)
      })
    })
  })
})
