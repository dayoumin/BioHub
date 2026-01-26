/**
 * Ollama 상태 체크 유틸리티 테스트
 */

import { checkOllamaStatus } from '@/lib/rag/utils/ollama-check'

import { vi, Mock } from 'vitest'
// fetch 모킹
global.fetch = vi.fn()

describe('checkOllamaStatus - Ollama 연결 확인', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('성공 케이스', () => {
    it('Ollama 서버 연결 및 모델 설치 확인', async () => {
      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'qwen3-embedding:0.6b' },
            { name: 'qwen3:4b' },
          ],
        }),
      })

      const status = await checkOllamaStatus()

      expect(status.isAvailable).toBe(true)
      expect(status.hasEmbeddingModel).toBe(true)
      expect(status.hasInferenceModel).toBe(true)
      expect(status.endpoint).toBe('http://localhost:11434')
      expect(status.error).toBeUndefined()
    })

    it('다양한 임베딩 모델 인식', async () => {
      const embeddingModels = ['qwen3-embedding', 'nomic-embed-text', 'mxbai-embed-large']

      for (const model of embeddingModels) {
        ;(global.fetch as Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            models: [{ name: model }, { name: 'qwen3:4b' }],
          }),
        })

        const status = await checkOllamaStatus()

        expect(status.hasEmbeddingModel).toBe(true)
      }
    })

    it('다양한 추론 모델 인식', async () => {
      const inferenceModels = ['qwen3:4b', 'gemma:7b', 'mistral:latest', 'llama2', 'neural-chat']

      for (const model of inferenceModels) {
        ;(global.fetch as Mock).mockResolvedValue({
          ok: true,
          json: async () => ({
            models: [{ name: 'qwen3-embedding:0.6b' }, { name: model }],
          }),
        })

        const status = await checkOllamaStatus()

        expect(status.hasInferenceModel).toBe(true)
      }
    })
  })

  describe('실패 케이스', () => {
    it('Ollama 서버 미응답 시 에러 처리', async () => {
      ;(global.fetch as Mock).mockRejectedValue(new Error('fetch failed'))

      const status = await checkOllamaStatus()

      expect(status.isAvailable).toBe(false)
      expect(status.hasEmbeddingModel).toBe(false)
      expect(status.hasInferenceModel).toBe(false)
      expect(status.error).toBe('fetch failed')
    })

    it('Ollama 서버 응답 에러 (500)', async () => {
      ;(global.fetch as Mock).mockResolvedValue({
        ok: false,
        status: 500,
      })

      const status = await checkOllamaStatus()

      expect(status.isAvailable).toBe(false)
      expect(status.error).toBe('Ollama 서버 응답 에러: 500')
    })

    it('설치된 모델이 없는 경우', async () => {
      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [],
        }),
      })

      const status = await checkOllamaStatus()

      expect(status.isAvailable).toBe(true)
      expect(status.hasEmbeddingModel).toBe(false)
      expect(status.hasInferenceModel).toBe(false)
      expect(status.error).toBe('설치된 모델이 없습니다')
    })

    it('임베딩 모델만 없는 경우', async () => {
      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen3:4b' }],
        }),
      })

      const status = await checkOllamaStatus()

      expect(status.isAvailable).toBe(true)
      expect(status.hasEmbeddingModel).toBe(false)
      expect(status.hasInferenceModel).toBe(true)
    })

    it('추론 모델만 없는 경우', async () => {
      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen3-embedding:0.6b' }],
        }),
      })

      const status = await checkOllamaStatus()

      expect(status.isAvailable).toBe(true)
      expect(status.hasEmbeddingModel).toBe(true)
      expect(status.hasInferenceModel).toBe(false)
    })
  })

  describe('커스텀 엔드포인트', () => {
    it('사용자 정의 엔드포인트 사용', async () => {
      const customEndpoint = 'http://192.168.1.100:11434'

      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen3-embedding:0.6b' }, { name: 'qwen3:4b' }],
        }),
      })

      const status = await checkOllamaStatus(customEndpoint)

      expect(status.endpoint).toBe(customEndpoint)
      expect(global.fetch).toHaveBeenCalledWith(
        `${customEndpoint}/api/tags`,
        expect.objectContaining({
          method: 'GET',
        })
      )
    })
  })

  describe('타임아웃 처리', () => {
    it('3초 타임아웃 설정 확인', async () => {
      ;(global.fetch as Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [{ name: 'qwen3-embedding:0.6b' }, { name: 'qwen3:4b' }],
        }),
      })

      await checkOllamaStatus()

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/tags',
        expect.objectContaining({
          method: 'GET',
          signal: expect.any(AbortSignal),
        })
      )
    })
  })
})
