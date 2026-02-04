/**
 * Statistics Platform Service Worker
 *
 * Pyodide CDN 캐싱 전용 Service Worker
 * - Pyodide 라이브러리 (~10MB) 캐싱
 * - NumPy, SciPy, statsmodels 등 패키지 캐싱
 * - 두 번째 방문부터 즉시 로드 (2~3초 → 0.3초)
 *
 * @version 1.1.0
 */

const CACHE_VERSION = 'v1.1.0'
const PYODIDE_CACHE = `pyodide-cache-${CACHE_VERSION}`
const APP_CACHE = `app-cache-${CACHE_VERSION}`

// Pyodide CDN URL 패턴
const PYODIDE_CDN_PATTERN = /^https:\/\/cdn\.jsdelivr\.net\/pyodide\/.*/i

// 365일 (1년, 밀리초) - 통계 라이브러리는 안정적이므로 장기 캐싱
const MAX_AGE = 365 * 24 * 60 * 60 * 1000

/**
 * Service Worker 설치 이벤트
 */
self.addEventListener('install', (event) => {
  console.log('[SW] 설치 중...', CACHE_VERSION)

  // 즉시 활성화
  self.skipWaiting()
})

/**
 * Service Worker 활성화 이벤트
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] 활성화 중...', CACHE_VERSION)

  event.waitUntil(
    (async () => {
      // 이전 버전 캐시 삭제
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter(name =>
            (name.startsWith('pyodide-cache-') || name.startsWith('app-cache-')) &&
            name !== PYODIDE_CACHE &&
            name !== APP_CACHE
          )
          .map(name => {
            console.log('[SW] 이전 캐시 삭제:', name)
            return caches.delete(name)
          })
      )

      // 모든 클라이언트에 즉시 적용
      await self.clients.claim()
      console.log('[SW] 활성화 완료')
    })()
  )
})

/**
 * Fetch 이벤트 핸들러
 */
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // localhost 요청은 Service Worker가 개입하지 않음 (Ollama 등 로컬 서버)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return // Service Worker 처리 생략 (브라우저 기본 동작)
  }

  // Pyodide CDN 요청인 경우
  if (PYODIDE_CDN_PATTERN.test(request.url)) {
    event.respondWith(handlePyodideCDN(request))
    return
  }

  // 일반 요청은 네트워크 우선
  event.respondWith(fetch(request))
})

/**
 * Pyodide CDN 요청 처리 (Cache First 전략)
 *
 * 1. GET 요청만 캐싱 (HEAD, POST 등은 네트워크로 직접)
 * 2. 캐시 확인
 * 3. 캐시 있으면 → 즉시 반환 (만료 체크)
 * 4. 캐시 없으면 → 네트워크에서 다운로드 → 캐시 저장
 *
 * @param {Request} request
 * @returns {Promise<Response>}
 */
async function handlePyodideCDN(request) {
  // GET 요청만 캐싱 처리 (HEAD, POST 등은 네트워크로 직접)
  if (request.method !== 'GET') {
    console.log('[SW] Non-GET request, bypassing cache:', request.method, request.url.split('/').pop())
    return fetch(request)
  }

  const cache = await caches.open(PYODIDE_CACHE)

  try {
    // 1. 캐시 확인
    const cachedResponse = await cache.match(request)

    if (cachedResponse) {
      // 캐시 만료 체크
      const cachedDate = new Date(cachedResponse.headers.get('date') || 0)
      const now = new Date()
      const age = now - cachedDate

      if (age < MAX_AGE) {
        console.log('[SW] 캐시에서 반환:', request.url.split('/').pop())
        return cachedResponse
      } else {
        console.log('[SW] 캐시 만료, 재다운로드:', request.url.split('/').pop())
        await cache.delete(request)
      }
    }

    // 2. 네트워크에서 다운로드
    console.log('[SW] CDN에서 다운로드 중...:', request.url.split('/').pop())
    const networkResponse = await fetch(request)

    // 다운로드 성공 시 캐시 저장
    if (networkResponse && networkResponse.status === 200) {
      // Response는 한 번만 사용할 수 있으므로 clone
      const responseToCache = networkResponse.clone()

      // 비동기로 캐시 저장 (응답 속도 우선)
      cache.put(request, responseToCache).catch(error => {
        console.error('[SW] 캐시 저장 실패:', error)
      })

      console.log('[SW] 캐시 저장 완료:', request.url.split('/').pop())
    }

    return networkResponse

  } catch (error) {
    console.error('[SW] Pyodide CDN 요청 실패:', error)

    // 네트워크 실패 시 캐시 재확인 (만료되어도 사용)
    const cachedResponse = await cache.match(request)
    if (cachedResponse) {
      console.warn('[SW] 네트워크 실패, 만료된 캐시 사용:', request.url.split('/').pop())
      return cachedResponse
    }

    throw error
  }
}

/**
 * 메시지 이벤트 핸들러
 *
 * 캐시 통계, 캐시 삭제 등 관리 기능
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data

  switch (type) {
    case 'GET_CACHE_STATS':
      handleGetCacheStats(event)
      break

    case 'CLEAR_CACHE':
      handleClearCache(event, payload)
      break

    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    default:
      console.warn('[SW] 알 수 없는 메시지:', type)
  }
})

/**
 * 캐시 통계 조회
 */
async function handleGetCacheStats(event) {
  try {
    const cache = await caches.open(PYODIDE_CACHE)
    const requests = await cache.keys()

    const stats = {
      version: CACHE_VERSION,
      pyodideCacheSize: requests.length,
      items: requests.map(req => ({
        url: req.url,
        name: req.url.split('/').pop()
      }))
    }

    event.ports[0].postMessage({ success: true, data: stats })
  } catch (error) {
    event.ports[0].postMessage({ success: false, error: error.message })
  }
}

/**
 * 캐시 삭제
 */
async function handleClearCache(event, payload) {
  try {
    const cacheType = payload?.cacheType || 'all'

    if (cacheType === 'all' || cacheType === 'pyodide') {
      await caches.delete(PYODIDE_CACHE)
      console.log('[SW] Pyodide 캐시 삭제 완료')
    }

    if (cacheType === 'all' || cacheType === 'app') {
      await caches.delete(APP_CACHE)
      console.log('[SW] 앱 캐시 삭제 완료')
    }

    event.ports[0].postMessage({ success: true })
  } catch (error) {
    event.ports[0].postMessage({ success: false, error: error.message })
  }
}

console.log('[SW] Service Worker 로드 완료:', CACHE_VERSION)