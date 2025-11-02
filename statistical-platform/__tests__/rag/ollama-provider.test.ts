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
      topK: 5,
      testMode: true // 테스트 모드 활성화
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
      // embeddingModel과 inferenceModel은 빈 문자열로 초기화되며, initialize() 시 자동 감지됨
      expect(defaultProvider['embeddingModel']).toBe('')
      expect(defaultProvider['inferenceModel']).toBe('')
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

    it('should auto-detect qwen model when not explicitly set', async () => {
      const autoProvider = new OllamaRAGProvider({
        name: 'Auto Detect Test',
        embeddingModel: 'nomic-embed-text',
        testMode: true // SQLite DB 로드 스킵
        // inferenceModel 미지정 - 자동 감지
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'qwen2.5' }
          ]
        })
      })

      await autoProvider.initialize()

      expect(autoProvider['inferenceModel']).toBe('qwen2.5')
    })

    it('should auto-detect gemma model when qwen not available', async () => {
      const autoProvider = new OllamaRAGProvider({
        name: 'Gemma Auto Detect Test',
        embeddingModel: 'nomic-embed-text',
        testMode: true // SQLite DB 로드 스킵
        // inferenceModel 미지정 - 자동 감지
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'gemma' }
            // qwen 없음
          ]
        })
      })

      await autoProvider.initialize()

      expect(autoProvider['inferenceModel']).toBe('gemma')
    })

    it('should auto-detect gpt model when qwen and gemma not available', async () => {
      const autoProvider = new OllamaRAGProvider({
        name: 'GPT Auto Detect Test',
        embeddingModel: 'nomic-embed-text',
        testMode: true // SQLite DB 로드 스킵
        // inferenceModel 미지정 - 자동 감지
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'gpt4' }
            // qwen, gemma 없음
          ]
        })
      })

      await autoProvider.initialize()

      expect(autoProvider['inferenceModel']).toBe('gpt4')
    })

    it('should auto-detect fallback model (e.g. mistral) when qwen/gemma/gpt not available', async () => {
      const autoProvider = new OllamaRAGProvider({
        name: 'Fallback Auto Detect Test',
        embeddingModel: 'nomic-embed-text',
        testMode: true // SQLite DB 로드 스킵
        // inferenceModel 미지정
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'mistral' }, // qwen/gemma/gpt 없음
            { name: 'neural-chat' }
          ]
        })
      })

      await autoProvider.initialize()

      // mistral 이나 neural-chat 중 하나가 선택되어야 함 (4순위)
      expect(
        autoProvider['inferenceModel'] === 'mistral' ||
        autoProvider['inferenceModel'] === 'neural-chat'
      ).toBe(true)
    })

    it('should show available models in error message when only embedding models found', async () => {
      const autoProvider = new OllamaRAGProvider({
        name: 'Error Message Test',
        embeddingModel: 'nomic-embed-text',
        testMode: true // SQLite DB 로드 스킵
        // inferenceModel 미지정
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'mxbai-embed-large' } // embedding 모델만 있음
          ]
        })
      })

      try {
        await autoProvider.initialize()
        fail('Should have thrown error')
      } catch (error) {
        const errorMessage = (error as Error).message
        // 에러 메시지에 embedding 모델만 설치되어 있음을 명시
        expect(errorMessage).toContain('embedding 모델만 설치')
        // 설치된 모든 모델 목록 포함 확인
        expect(errorMessage).toContain('설치된 모델:')
        expect(errorMessage).toContain('nomic-embed-text')
        expect(errorMessage).toContain('mxbai-embed-large')
        // 하드코딩된 모델이 없는지 확인
        expect(errorMessage).not.toContain('qwen2.5:3b')
      }
    })

    it('should respect priority order regardless of API response order', async () => {
      const autoProvider = new OllamaRAGProvider({
        name: 'Priority Order Test',
        embeddingModel: 'nomic-embed-text',
        testMode: true // SQLite DB 로드 스킵
        // inferenceModel 미지정
      })

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'nomic-embed-text' },
            { name: 'gemma' },      // 2순위가 먼저 나옴
            { name: 'qwen2.5' },    // 1순위가 뒤에 나옴
            { name: 'mistral' }     // fallback
          ]
        })
      })

      await autoProvider.initialize()

      // API 응답 순서에 관계없이 qwen(1순위)이 선택되어야 함
      expect(autoProvider['inferenceModel']).toBe('qwen2.5')
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
