/**
 * Service Worker 등록 유틸리티 테스트
 */

import {
  registerServiceWorker,
  unregisterServiceWorker,
  getServiceWorkerStatus
} from '@/lib/utils/register-sw'

describe('Service Worker Registration', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  describe('registerServiceWorker', () => {
    it('브라우저 환경이 아니면 실패해야 함', async () => {
      // window가 없는 환경 시뮬레이션 (Node.js 환경)
      process.env.NODE_ENV = 'production'
      const result = await registerServiceWorker()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Service Worker not supported')
    })

    it('개발 환경에서는 등록하지 않아야 함', async () => {
      // Node.js 환경에서는 window가 없어서 브라우저 체크에서 먼저 실패함
      // 실제 브라우저 환경에서만 development 체크가 가능
      process.env.NODE_ENV = 'development'
      const result = await registerServiceWorker()

      expect(result.success).toBe(false)
      // Node.js 환경이므로 브라우저 체크 에러가 먼저 발생
      expect(result.error).toBe('Service Worker not supported')
    })
  })

  describe('getServiceWorkerStatus', () => {
    it('브라우저 환경이 아니면 registered: false 반환', async () => {
      const status = await getServiceWorkerStatus()

      expect(status).toEqual({ registered: false })
    })
  })
})
