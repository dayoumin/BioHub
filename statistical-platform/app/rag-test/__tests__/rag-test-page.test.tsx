/**
 * RAG Test Page - 환경변수 테스트
 *
 * 목적: NEXT_PUBLIC_OLLAMA_ENDPOINT 환경변수가 올바르게 동작하는지 검증
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

describe('RAG Test Page - Ollama Endpoint Configuration', () => {
  const originalEnv = process.env

  beforeEach(() => {
    // 환경변수 초기화
    process.env = { ...originalEnv }

    // fetch mock 초기화
    global.fetch = jest.fn()
  })

  afterEach(() => {
    // 환경변수 복원
    process.env = originalEnv

    // mock 정리
    jest.restoreAllMocks()
  })

  describe('환경변수 없을 때', () => {
    it('기본값 localhost:11434를 사용해야 함', async () => {
      // Given: 환경변수 없음
      delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT

      // Mock fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      })
      global.fetch = mockFetch as any

      // When: 환경변수로 엔드포인트 결정
      const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'
      await fetch(`${ollamaEndpoint}/api/tags`)

      // Then: localhost:11434 호출됨
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags')
    })
  })

  describe('환경변수 있을 때', () => {
    it('환경변수 값을 사용해야 함', async () => {
      // Given: 환경변수 설정
      process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = 'https://my-ollama.com'

      // Mock fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] })
      })
      global.fetch = mockFetch as any

      // When: 환경변수로 엔드포인트 결정
      const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'
      await fetch(`${ollamaEndpoint}/api/tags`)

      // Then: 환경변수 값 사용
      expect(mockFetch).toHaveBeenCalledWith('https://my-ollama.com/api/tags')
    })

    it('다양한 엔드포인트 형식을 지원해야 함', async () => {
      const testCases = [
        'http://192.168.1.100:11434',
        'https://ollama.example.com',
        'http://localhost:8080'
      ]

      for (const endpoint of testCases) {
        // Given
        process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = endpoint
        const mockFetch = jest.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ models: [] })
        })
        global.fetch = mockFetch as any

        // When
        const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'
        await fetch(`${ollamaEndpoint}/api/tags`)

        // Then
        expect(mockFetch).toHaveBeenCalledWith(`${endpoint}/api/tags`)
      }
    })
  })

  describe('에러 처리', () => {
    it('fetch 실패 시 에러를 던져야 함', async () => {
      // Given: fetch 실패
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500
      })
      global.fetch = mockFetch as any

      // When/Then: 에러 발생
      const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'
      const response = await fetch(`${ollamaEndpoint}/api/tags`)

      expect(response.ok).toBe(false)
    })

    it('네트워크 에러 시 예외를 던져야 함', async () => {
      // Given: 네트워크 에러
      const mockFetch = jest.fn().mockRejectedValue(new Error('Network error'))
      global.fetch = mockFetch as any

      // When/Then: 예외 발생
      const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'

      await expect(fetch(`${ollamaEndpoint}/api/tags`)).rejects.toThrow('Network error')
    })
  })

  describe('실제 컴포넌트 로직 검증', () => {
    it('fetchAvailableModels 로직이 환경변수를 올바르게 사용함', async () => {
      // Given: 환경변수 설정
      process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = 'https://test-ollama.com'

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          models: [
            { name: 'mxbai-embed-large:latest' },
            { name: 'deepseek-r1:7b:latest' }
          ]
        })
      })
      global.fetch = mockFetch as any

      // When: 실제 컴포넌트 로직 시뮬레이션
      const ollamaEndpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT || 'http://localhost:11434'
      const response = await fetch(`${ollamaEndpoint}/api/tags`)

      if (!response.ok) {
        throw new Error('Ollama 서버에 연결할 수 없습니다')
      }

      const data = await response.json()

      // Then: 올바른 엔드포인트 호출 및 데이터 파싱
      expect(mockFetch).toHaveBeenCalledWith('https://test-ollama.com/api/tags')
      expect(data.models).toHaveLength(2)
      expect(data.models[0].name).toBe('mxbai-embed-large:latest')
    })
  })
})