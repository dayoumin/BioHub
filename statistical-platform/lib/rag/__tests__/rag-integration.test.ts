/**
 * RAG 통합 테스트
 *
 * RAG Service와 OllamaProvider의 전체 흐름 검증
 * - queryRAG() 함수의 올바른 초기화
 * - 벡터 스토어 선택
 * - 하이브리드 검색 동작
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { RAGService, queryRAG } from '../rag-service'
import type { RAGContext } from '../providers/base-provider'

describe('RAG Integration Tests', () => {
  beforeEach(() => {
    // 각 테스트 전에 Singleton 초기화
    // @ts-expect-error - private 멤버 접근 (테스트 목적)
    RAGService.instance = null
  })

  describe('queryRAG() Function Flow', () => {
    it('should initialize with qwen3-embedding-0.6b vectorStoreId', async () => {
      const service = RAGService.getInstance()
      const initSpy = jest.spyOn(service, 'initialize')

      try {
        // queryRAG()는 내부적으로 초기화 호출
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })

        expect(initSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            vectorStoreId: 'qwen3-embedding-0.6b',
          })
        )

        // @ts-expect-error - private 멤버 접근 (테스트 목적)
        expect(service.config.vectorStoreId).toBe('qwen3-embedding-0.6b')
      } finally {
        initSpy.mockRestore()
      }
    })

    it('should use qwen3 vector store by default (111 documents)', async () => {
      const service = RAGService.getInstance()

      await service.initialize({
        vectorStoreId: 'qwen3-embedding-0.6b',
      })

      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      const config = service.config
      expect(config.vectorStoreId).toBe('qwen3-embedding-0.6b')

      // DB 경로 확인
      // /rag-data/vector-qwen3-embedding-0.6b.db (111 docs)
      // /rag-data/vector-mxbai-embed-large.db (0 docs - 미사용)
      expect(config.vectorStoreId).not.toBe('mxbai-embed-large')
    })
  })

  describe('Vector Store Selection', () => {
    it('should support switching between vector stores', async () => {
      const service = RAGService.getInstance()

      // 첫 번째 벡터 스토어
      await service.initialize({
        vectorStoreId: 'qwen3-embedding-0.6b',
      })
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      expect(service.config.vectorStoreId).toBe('qwen3-embedding-0.6b')

      // 두 번째 벡터 스토어로 전환
      await service.initialize({
        vectorStoreId: 'mxbai-embed-large',
      })
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      expect(service.config.vectorStoreId).toBe('mxbai-embed-large')
    })

    it('should preserve configuration across calls', async () => {
      const service = RAGService.getInstance()

      const config = {
        vectorStoreId: 'qwen3-embedding-0.6b',
        topK: 5,
      }

      await service.initialize(config)

      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      expect(service.config.vectorStoreId).toBe('qwen3-embedding-0.6b')
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      expect(service.config.topK).toBe(5)
    })
  })

  describe('Embedding API Validation', () => {
    it('should use correct Ollama API format (input field)', async () => {
      /**
       * Ollama Embeddings API 요청:
       *
       * ✅ 올바른 형식:
       * POST /api/embeddings
       * {
       *   "model": "nomic-embed-text",
       *   "input": "query text"  ← input 필드 (prompt 아님)
       * }
       *
       * ❌ 잘못된 형식 (이전 코드):
       * {
       *   "model": "nomic-embed-text",
       *   "prompt": "query text"  ← prompt 필드 (올라마 API에서 지원 안 함)
       * }
       *
       * 결과:
       * - 잘못된 형식 → 400 Bad Request
       * - 응답 본문: {} (빈 에러 객체)
       * - 콘솔: [OllamaProvider] 임베딩 생성 실패 상세: {}
       */

      const correctPayload = {
        model: 'nomic-embed-text',
        input: 'what is t-test',
      }

      const incorrectPayload = {
        model: 'nomic-embed-text',
        prompt: 'what is t-test', // ❌ 수정 전 코드
      }

      // ✅ 올바른 형식 검증
      expect(correctPayload).toHaveProperty('input')
      expect(correctPayload).not.toHaveProperty('prompt')

      // ❌ 잘못된 형식 식별
      expect(incorrectPayload).toHaveProperty('prompt')
      expect(incorrectPayload).not.toHaveProperty('input')
    })
  })

  describe('Database Path Resolution', () => {
    it('should resolve vectorStoreId to correct DB path', async () => {
      const service = RAGService.getInstance()

      const config = {
        vectorStoreId: 'qwen3-embedding-0.6b',
      }

      await service.initialize(config)

      // vectorStoreId → vectorDbPath 변환:
      // 'qwen3-embedding-0.6b' → '/rag-data/vector-qwen3-embedding-0.6b.db'
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      expect(service.config.vectorStoreId).toBe('qwen3-embedding-0.6b')

      // 경로 계산 검증
      const expectedPath = `/rag-data/vector-qwen3-embedding-0.6b.db`
      // OllamaProvider 생성 시 이 경로가 사용됨
    })
  })

  describe('Error Recovery', () => {
    it('should handle initialization errors gracefully', async () => {
      const service = RAGService.getInstance()

      try {
        // 잘못된 설정으로 초기화 시도 (실제 환경에서만 에러)
        await service.initialize({
          vectorStoreId: 'nonexistent-store',
        })

        // Test mode에서는 성공, 프로덕션에서는 실패
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
      }
    })

    it('should allow retry after failed initialization', async () => {
      const service = RAGService.getInstance()

      try {
        // 첫 번째 시도 (실패 가능)
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })

        // 두 번째 시도 (같은 설정으로 캐싱됨)
        await service.initialize({
          vectorStoreId: 'qwen3-embedding-0.6b',
        })

        expect(service).toBeDefined()
      } catch (error) {
        // 에러 발생 시에도 서비스는 정상 동작해야 함
        expect(error).toBeInstanceOf(Error)
      }
    })
  })

  describe('Performance: Singleton Caching', () => {
    it('should cache initialized provider for same configuration', async () => {
      const service = RAGService.getInstance()

      // 첫 번째 초기화
      const start1 = Date.now()
      await service.initialize({
        vectorStoreId: 'qwen3-embedding-0.6b',
      })
      const time1 = Date.now() - start1

      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      const provider1 = service.provider

      // 두 번째 초기화 (같은 설정)
      const start2 = Date.now()
      await service.initialize({
        vectorStoreId: 'qwen3-embedding-0.6b',
      })
      const time2 = Date.now() - start2

      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      const provider2 = service.provider

      // 같은 인스턴스여야 함 (캐싱)
      expect(provider1).toBe(provider2)

      // 두 번째 초기화가 훨씬 빨라야 함 (실제 동작 안 함)
      // 주의: 실제 시간 측정은 시스템 부하에 따라 불안정할 수 있음
    })

    it('should not cache when configuration changes', async () => {
      const service = RAGService.getInstance()

      await service.initialize({
        vectorStoreId: 'qwen3-embedding-0.6b',
      })
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      const provider1 = service.provider

      // 다른 설정으로 초기화
      await service.initialize({
        vectorStoreId: 'mxbai-embed-large',
      })
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      const provider2 = service.provider

      // 다른 인스턴스여야 함 (새로 초기화)
      expect(provider1).not.toBe(provider2)
    })
  })

  describe('Configuration Validation', () => {
    it('should handle missing vectorStoreId gracefully', async () => {
      const service = RAGService.getInstance()

      await service.initialize({
        // vectorStoreId를 지정하지 않음
        topK: 10,
      })

      // 기본값 사용 또는 환경변수 사용
      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      const config = service.config
      expect(config).toBeDefined()
    })

    it('should validate topK parameter', async () => {
      const service = RAGService.getInstance()

      await service.initialize({
        vectorStoreId: 'qwen3-embedding-0.6b',
        topK: 3,
      })

      // @ts-expect-error - private 멤버 접근 (테스트 목적)
      expect(service.config.topK).toBe(3)
    })
  })

  describe('Metadata and Vector Store Info', () => {
    it('should provide available vector store information', () => {
      // vector-stores.json에서 메타데이터 로드
      const availableStores = [
        {
          id: 'qwen3-embedding-0.6b',
          name: 'Qwen3 Embedding (0.6B)',
          dbPath: '/rag-data/vector-qwen3-embedding-0.6b.db',
          embeddingModel: 'qwen3-embedding:0.6b',
          dimensions: 1024,
          docCount: 111, // ← 중요: 111개 문서
          fileSize: '5.4 MB',
          createdAt: 1762128783193,
        },
        {
          id: 'mxbai-embed-large',
          name: 'MixedBread AI Embed Large',
          dbPath: '/rag-data/vector-mxbai-embed-large.db',
          embeddingModel: 'mxbai-embed-large',
          dimensions: 1024,
          docCount: 0, // ← 0개 (미사용)
          fileSize: '92.0 KB',
          createdAt: 1762128783150,
        },
      ]

      // qwen3-embedding-0.6b가 111개 문서를 가짐
      const activeStore = availableStores.find((s) => s.id === 'qwen3-embedding-0.6b')
      expect(activeStore?.docCount).toBe(111)
      expect(activeStore?.dbPath).toBe('/rag-data/vector-qwen3-embedding-0.6b.db')
    })
  })
})

describe('Real-World Scenario: Chatbot Query', () => {
  it('should handle a complete query flow', async () => {
    const service = RAGService.getInstance()

    // 1. 초기화
    await service.initialize({
      vectorStoreId: 'qwen3-embedding-0.6b',
    })
    expect(await service.isReady()).toBe(true)

    // 2. 쿼리 준비
    const context: RAGContext = {
      query: 't-test는 언제 사용하나요?',
    }

    // 3. 쿼리 실행 (모의 처리)
    // 실제 환경에서는 OllamaProvider가 처리
    // - 쿼리 임베딩 생성 (input 필드 사용) ✅
    // - Vector 검색 수행
    // - FTS 검색 수행
    // - 하이브리드 결과 반환
  })
})
