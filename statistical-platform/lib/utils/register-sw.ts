/**
 * Service Worker 등록 유틸리티
 *
 * Pyodide CDN 캐싱을 위한 Service Worker 등록 및 관리
 *
 * @module registerServiceWorker
 */

/**
 * Service Worker 등록 결과
 */
export interface ServiceWorkerRegistrationResult {
  success: boolean
  registration?: ServiceWorkerRegistration
  error?: string
}

/**
 * 캐시 통계
 */
export interface CacheStats {
  version: string
  pyodideCacheSize: number
  items: Array<{
    url: string
    name: string
  }>
}

/**
 * Service Worker 등록
 *
 * 프로덕션 환경에서만 등록
 * HTTPS 또는 localhost에서만 동작
 *
 * @returns 등록 결과
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  // 브라우저 환경 체크
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[SW] Service Worker를 지원하지 않는 브라우저입니다')
    return {
      success: false,
      error: 'Service Worker not supported'
    }
  }

  // 개발 환경에서는 등록하지 않음
  if (process.env.NODE_ENV === 'development') {
    console.log('[SW] 개발 환경에서는 Service Worker를 등록하지 않습니다')
    return {
      success: false,
      error: 'Development environment'
    }
  }

  try {
    console.log('[SW] Service Worker 등록 시작...')

    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    console.log('[SW] Service Worker 등록 완료:', registration.scope)

    // 업데이트 확인
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      if (!newWorker) return

      console.log('[SW] 새 버전 발견, 업데이트 중...')

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('[SW] 새 버전 설치 완료, 페이지 새로고침 권장')
          // TODO: 사용자에게 새로고침 권장 알림
        }
      })
    })

    return {
      success: true,
      registration
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[SW] Service Worker 등록 실패:', errorMessage)

    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Service Worker 등록 해제
 *
 * @returns 해제 성공 여부
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      await registration.unregister()
      console.log('[SW] Service Worker 등록 해제 완료')
      return true
    }
    return false
  } catch (error) {
    console.error('[SW] Service Worker 등록 해제 실패:', error)
    return false
  }
}

/**
 * 캐시 통계 조회
 *
 * @returns 캐시 통계
 */
export async function getCacheStats(): Promise<CacheStats | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration || !registration.active) {
      return null
    }

    // MessageChannel을 사용하여 SW와 통신
    const messageChannel = new MessageChannel()

    return new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve(event.data.data)
        } else {
          resolve(null)
        }
      }

      registration.active?.postMessage(
        { type: 'GET_CACHE_STATS' },
        [messageChannel.port2]
      )

      // 5초 타임아웃
      setTimeout(() => resolve(null), 5000)
    })
  } catch (error) {
    console.error('[SW] 캐시 통계 조회 실패:', error)
    return null
  }
}

/**
 * 캐시 삭제
 *
 * @param cacheType 'all' | 'pyodide' | 'app'
 * @returns 삭제 성공 여부
 */
export async function clearCache(cacheType: 'all' | 'pyodide' | 'app' = 'all'): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (!registration || !registration.active) {
      return false
    }

    const messageChannel = new MessageChannel()

    return new Promise((resolve) => {
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success)
      }

      registration.active?.postMessage(
        { type: 'CLEAR_CACHE', payload: { cacheType } },
        [messageChannel.port2]
      )

      setTimeout(() => resolve(false), 5000)
    })
  } catch (error) {
    console.error('[SW] 캐시 삭제 실패:', error)
    return false
  }
}

/**
 * Service Worker 상태 확인
 *
 * @returns 등록 여부 및 상태
 */
export async function getServiceWorkerStatus(): Promise<{
  registered: boolean
  state?: string
  scope?: string
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { registered: false }
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration()
    if (registration) {
      return {
        registered: true,
        state: registration.active?.state,
        scope: registration.scope
      }
    }
    return { registered: false }
  } catch (error) {
    console.error('[SW] 상태 확인 실패:', error)
    return { registered: false }
  }
}
