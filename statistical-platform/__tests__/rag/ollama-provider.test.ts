/**
 * Ollama Provider 테스트
 *
 * 목적:
 * 1. Provider 초기화 검증
 * 2. 키워드 검색 기능 검증
 * 3. SQLite DB 로딩 검증 (더미 데이터)
 */

import { OllamaRAGProvider } from '@/lib/rag/providers/ollama-provider'
import type { RAGContext } from '@/lib/rag/providers/base-provider'

// Fetch mock
global.fetch = jest.fn()

describe('OllamaRAGProvider', () => {
  let provider: OllamaRAGProvider

  beforeEach(() => {
    provider = new OllamaRAGProvider({
      name: 'Ollama Test',
      ollamaEndpoint: 'http://localhost:11434',
      embeddingModel: 'nomic-embed-text',
      inferenceModel: 'qwen2.5:3b',
      vectorDbPath: '/test/rag.db',
      topK: 5
    })

    // Fetch mock 초기화
    jest.clearAllMocks()
  })

  describe('Configuration', () => {
    it('should initialize with correct config', () => {
      expect(provider).toBeDefined()
      expect(provider['ollamaEndpoint']).toBe('http://localhost:11434')
      expect(provider['embeddingModel']).toBe('nomic-embed-text')
      expect(provider['inferenceModel']).toBe('qwen2.5:3b')
      expect(provider['topK']).toBe(5)
    })

    it('should use default values when not provided', () => {
      const defaultProvider = new OllamaRAGProvider({ name: 'Default' })

      expect(defaultProvider['ollamaEndpoint']).toBe('http://localhost:11434')
      expect(defaultProvider['embeddingModel']).toBe('nomic-embed-text')
      expect(defaultProvider['inferenceModel']).toBe('qwen2.5:3b')
      expect(defaultProvider['vectorDbPath']).toBe('/rag-data/rag.db')
      expect(defaultProvider['topK']).toBe(5)
    })
  })

  describe('Initialization', () => {
    it('should check Ollama server connection', async () => {
      // Mock Ollama API response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5:3b' }
          ]
        })
      })

      await provider.initialize()

      expect(global.fetch).toHaveBeenCalledWith('http://localhost:11434/api/tags')
      expect(await provider.isReady()).toBe(true)
    })

    it('should throw error if Ollama server is not available', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found'
      })

      await expect(provider.initialize()).rejects.toThrow('Ollama 서버에 연결할 수 없습니다')
    })

    it('should throw error if embedding model is not installed', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'qwen2.5:3b' } // nomic-embed-text 없음
          ]
        })
      })

      await expect(provider.initialize()).rejects.toThrow('임베딩 모델')
    })

    it('should throw error if inference model is not installed', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' } // qwen2.5 없음
          ]
        })
      })

      await expect(provider.initialize()).rejects.toThrow('추론 모델')
    })
  })

  describe('SQLite DB Loading', () => {
    it('should load dummy documents', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5:3b' }
          ]
        })
      })

      await provider.initialize()

      // 더미 데이터 확인
      expect(provider['documents']).toBeDefined()
      expect(provider['documents'].length).toBeGreaterThan(0)
    })
  })

  describe('Keyword Search', () => {
    beforeEach(async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5:3b' }
          ]
        })
      })

      await provider.initialize()
    })

    it('should search by keyword', () => {
      const results = provider['searchByKeyword']('t-test')

      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should return results with scores', () => {
      const results = provider['searchByKeyword']('mean')

      if (results.length > 0) {
        expect(results[0]).toHaveProperty('score')
        expect(results[0]).toHaveProperty('title')
        expect(results[0]).toHaveProperty('content')
      }
    })

    it('should limit results to topK', () => {
      const results = provider['searchByKeyword']('test')

      expect(results.length).toBeLessThanOrEqual(provider['topK'])
    })
  })

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5:3b' }
          ]
        })
      })

      await provider.initialize()
      expect(await provider.isReady()).toBe(true)

      await provider.cleanup()
      expect(await provider.isReady()).toBe(false)
      expect(provider['documents'].length).toBe(0)
    })
  })
})
