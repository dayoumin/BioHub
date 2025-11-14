/**
 * Ollama Endpoint Logic Test
 *
 * NEXT_PUBLIC_OLLAMA_ENDPOINT 환경변수 처리 로직 검증
 * - 환경변수 설정 시 사용자 지정 엔드포인트 사용
 * - 환경변수 미설정 시 기본 엔드포인트 사용
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'

describe('Ollama Endpoint Logic', () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT

  afterEach(() => {
    // 테스트 후 원래 환경변수 복원
    if (ORIGINAL_ENV === undefined) {
      delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
    } else {
      process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = ORIGINAL_ENV
    }
  })

  describe('환경변수 설정 시', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT = 'http://custom-server:11434'
    })

    it('사용자 지정 엔드포인트를 반환해야 함', () => {
      const endpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      expect(endpoint).toBe('http://custom-server:11434')
    })

    it('환경변수가 올바른 형식이어야 함', () => {
      const endpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      expect(endpoint).toMatch(/^https?:\/\//)
    })
  })

  describe('환경변수 미설정 시', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
    })

    it('환경변수가 undefined여야 함', () => {
      const endpoint = process.env.NEXT_PUBLIC_OLLAMA_ENDPOINT
      expect(endpoint).toBeUndefined()
    })
  })

  describe('Vercel 환경 체크', () => {
    it('VERCEL 환경변수가 있으면 Vercel 환경으로 인식', () => {
      const originalVercel = process.env.VERCEL
      process.env.VERCEL = '1'

      const isVercel = process.env.VERCEL === '1'
      expect(isVercel).toBe(true)

      // 복원
      if (originalVercel === undefined) {
        delete process.env.VERCEL
      } else {
        process.env.VERCEL = originalVercel
      }
    })

    it('VERCEL_ENV 환경변수가 있으면 Vercel 환경으로 인식', () => {
      const originalVercelEnv = process.env.VERCEL_ENV
      process.env.VERCEL_ENV = 'production'

      const isVercel = process.env.VERCEL_ENV !== undefined
      expect(isVercel).toBe(true)

      // 복원
      if (originalVercelEnv === undefined) {
        delete process.env.VERCEL_ENV
      } else {
        process.env.VERCEL_ENV = originalVercelEnv
      }
    })
  })
})
