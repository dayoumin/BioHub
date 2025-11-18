/**
 * Ollama Check Utility Tests
 * - AbortController timeout polyfill 브라우저 호환성 테스트
 * - Ollama 서버 연결 확인 테스트
 */

import { checkOllamaStatus } from '@/lib/rag/utils/ollama-check'

// Mock fetch
global.fetch = jest.fn()

describe('checkOllamaStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('AbortController Timeout Polyfill', () => {
    it('should use AbortController instead of AbortSignal.timeout', async () => {
      // Mock successful response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'mxbai-embed-large' },
            { name: 'qwen2.5:7b' },
          ],
        }),
      })

      const promise = checkOllamaStatus('http://localhost:11434')

      // Verify fetch was called with AbortController signal
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        })
      )

      await promise
    })

    it('should abort request after 3000ms timeout', async () => {
      // Mock fetch that respects AbortController
      ;(global.fetch as jest.Mock).mockImplementationOnce(
        (_url: string, options: RequestInit) =>
          new Promise((resolve, reject) => {
            const signal = options.signal as AbortSignal
            if (signal) {
              signal.addEventListener('abort', () => {
                reject(new Error('The operation was aborted'))
              })
            }
            // Never resolve normally
          })
      )

      const promise = checkOllamaStatus('http://localhost:11434')

      // Fast-forward time by 3000ms to trigger setTimeout
      jest.advanceTimersByTime(3000)

      // Wait a bit for promise to settle
      await jest.runAllTimersAsync()

      const result = await promise

      // Should return error due to abort
      expect(result.isAvailable).toBe(false)
      expect(result.error).toContain('aborted')
    })

    it('should clear timeout after successful response', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen2.5:7b' }],
        }),
      })

      await checkOllamaStatus('http://localhost:11434')

      // Verify clearTimeout was called
      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })

    it('should clear timeout after error', async () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')

      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error')
      )

      await checkOllamaStatus('http://localhost:11434')

      // Verify clearTimeout was called in catch block
      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })
  })

  describe('Ollama Server Connection', () => {
    it('should detect embedding and inference models', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'mxbai-embed-large' },
            { name: 'qwen2.5:7b' },
            { name: 'llama3:8b' },
          ],
        }),
      })

      const result = await checkOllamaStatus('http://localhost:11434')

      expect(result.isAvailable).toBe(true)
      expect(result.hasEmbeddingModel).toBe(true)
      expect(result.hasInferenceModel).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should return error when server is unavailable', async () => {
      ;(global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Failed to fetch')
      )

      const result = await checkOllamaStatus('http://localhost:11434')

      expect(result.isAvailable).toBe(false)
      expect(result.error).toBe('Failed to fetch')
    })

    it('should return error when response is not ok', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const result = await checkOllamaStatus('http://localhost:11434')

      expect(result.isAvailable).toBe(false)
      expect(result.error).toBe('Ollama 서버 응답 에러: 500')
    })

    it('should handle empty model list', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [],
        }),
      })

      const result = await checkOllamaStatus('http://localhost:11434')

      expect(result.isAvailable).toBe(true)
      expect(result.hasEmbeddingModel).toBe(false)
      expect(result.hasInferenceModel).toBe(false)
      expect(result.error).toBe('설치된 모델이 없습니다')
    })
  })

  describe('Model Detection Logic', () => {
    it('should not confuse embedding models as inference models', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          models: [
            { name: 'mxbai-embed-large' },
            { name: 'nomic-embed-text' },
          ],
        }),
      })

      const result = await checkOllamaStatus('http://localhost:11434')

      expect(result.hasEmbeddingModel).toBe(true)
      expect(result.hasInferenceModel).toBe(false) // Should NOT detect as inference
    })

    it('should detect various inference model names', async () => {
      const testCases = [
        { name: 'qwen2.5:7b', expected: true },
        { name: 'gemma:2b', expected: true },
        { name: 'mistral:7b', expected: true },
        { name: 'llama3:8b', expected: true },
        { name: 'neural-chat:7b', expected: true },
        { name: 'unknown-model', expected: false },
      ]

      for (const testCase of testCases) {
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            models: [{ name: testCase.name }],
          }),
        })

        const result = await checkOllamaStatus('http://localhost:11434')

        expect(result.hasInferenceModel).toBe(testCase.expected)
      }
    })
  })
})
