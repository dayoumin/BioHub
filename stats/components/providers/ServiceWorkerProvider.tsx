'use client'

/**
 * Service Worker Provider
 *
 * 앱 시작 시 Service Worker 자동 등록
 * Pyodide CDN 캐싱 활성화
 */

import { useEffect } from 'react'
import { registerServiceWorker } from '@/lib/utils/register-sw'

export function ServiceWorkerProvider() {
  useEffect(() => {
    // 프로덕션 환경에서만 등록
    if (process.env.NODE_ENV === 'production') {
      registerServiceWorker()
        .then((result) => {
          if (result.success) {
            console.log('[App] Service Worker 등록 성공')
          } else {
            console.warn('[App] Service Worker 등록 실패:', result.error)
          }
        })
        .catch((error) => {
          console.error('[App] Service Worker 등록 에러:', error)
        })
    }
  }, [])

  // 렌더링 없음 (순수 로직만)
  return null
}
