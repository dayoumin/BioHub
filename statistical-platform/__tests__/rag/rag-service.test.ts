/**
 * RAG Service 테스트
 *
 * 목적:
 * 1. RAGService Singleton 패턴 검증
 * 2. Ollama Provider 초기화 검증
 * 3. DB 재구축 기능 검증
 */

import { RAGService, queryRAG, rebuildRAGDatabase } from '@/lib/rag/rag-service'

import { vi } from 'vitest'
// Fetch mock
global.fetch = vi.fn()

describe('RAGService', () => {
  beforeEach(() => {
    // Singleton 인스턴스 초기화
    // @ts-expect-error - private field access for testing
    RAGService.instance = null
    vi.clearAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = RAGService.getInstance()
      const instance2 = RAGService.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should have ollama as provider type', () => {
      const service = RAGService.getInstance()
      expect(service.getProviderType()).toBe('ollama')
    })
  })

  describe('Initialization', () => {
    it('should initialize Ollama provider successfully', async () => {
      ;(global.fetch as Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5:3b' }
          ]
        })
      })

      const service = RAGService.getInstance()
      await service.initialize()

      const isReady = await service.isReady()
      expect(isReady).toBe(true)
    })

    it('should handle Ollama server not available', async () => {
      ;(global.fetch as Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      })

      const service = RAGService.getInstance()

      await expect(service.initialize()).rejects.toThrow()
    })
  })

  describe('Database Rebuild', () => {
    it('should have rebuildDatabase method', () => {
      const service = RAGService.getInstance()
      expect(typeof service.rebuildDatabase).toBe('function')
    })

    it('should have shutdown method', () => {
      const service = RAGService.getInstance()
      expect(typeof service.shutdown).toBe('function')
    })
  })

  describe('Convenience Functions', () => {
    it('should export queryRAG function', () => {
      expect(typeof queryRAG).toBe('function')
    })

    it('should export rebuildRAGDatabase function', () => {
      expect(typeof rebuildRAGDatabase).toBe('function')
    })
  })
})
