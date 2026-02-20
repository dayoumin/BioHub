/**
 * checkServiceWorkerCache 로직 테스트
 *
 * pyodide-core.service.ts의 private 메서드를 직접 테스트할 수 없으므로
 * 동일한 로직을 추출하여 Cache API 동작을 시뮬레이션합니다.
 *
 * 테스트 시나리오:
 * 1. 캐시에 .wasm 파일이 있으면 true
 * 2. 캐시 이름이 pyodide-cache- 접두사를 가져야 함
 * 3. 캐시에 .wasm 파일이 없으면 false
 * 4. caches API가 없으면 false (SSR/비지원 환경)
 * 5. 캐시 접근 에러 시 false (graceful fallback)
 * 6. 여러 캐시 중 pyodide 캐시를 정확히 찾음
 * 7. 버전이 변경되어도 접두사 매칭으로 동작
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

/**
 * checkServiceWorkerCache 로직 재현
 * (pyodide-core.service.ts의 private 메서드와 동일한 로직)
 */
async function checkServiceWorkerCache(): Promise<boolean> {
  try {
    if (typeof caches === 'undefined') return false

    const allCacheNames = await caches.keys()
    const pyodideCacheName = allCacheNames.find(name => name.startsWith('pyodide-cache-'))
    if (!pyodideCacheName) return false

    const cache = await caches.open(pyodideCacheName)
    const keys = await cache.keys()
    return keys.some(req => req.url.includes('.wasm'))
  } catch {
    return false
  }
}

// --- Cache API Mock 헬퍼 ---

interface MockCacheEntry {
  url: string
}

function createMockCache(entries: MockCacheEntry[]) {
  return {
    keys: vi.fn().mockResolvedValue(
      entries.map(e => ({ url: e.url }))
    ),
    match: vi.fn(),
    put: vi.fn(),
    add: vi.fn(),
    addAll: vi.fn(),
    delete: vi.fn(),
    matchAll: vi.fn(),
  }
}

function setupCacheAPI(cacheMap: Record<string, MockCacheEntry[]>) {
  const cacheNames = Object.keys(cacheMap)
  const cacheInstances: Record<string, ReturnType<typeof createMockCache>> = {}

  for (const name of cacheNames) {
    cacheInstances[name] = createMockCache(cacheMap[name])
  }

  const mockCaches = {
    keys: vi.fn().mockResolvedValue(cacheNames),
    open: vi.fn((name: string) => {
      if (cacheInstances[name]) {
        return Promise.resolve(cacheInstances[name])
      }
      return Promise.resolve(createMockCache([]))
    }),
    has: vi.fn(),
    match: vi.fn(),
    delete: vi.fn(),
  }

  globalThis.caches = mockCaches
  return mockCaches
}

function removeCacheAPI() {
  // @ts-expect-error - cleanup
  delete globalThis.caches
}

describe('checkServiceWorkerCache', () => {
  afterEach(() => {
    removeCacheAPI()
  })

  // ===== 시나리오 1: 캐시에 .wasm 파일 존재 =====
  describe('캐시 히트', () => {
    it('pyodide-cache에 .wasm 파일이 있으면 true를 반환한다', async () => {
      setupCacheAPI({
        'pyodide-cache-v1.0.0': [
          { url: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.asm.wasm' },
          { url: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js' },
          { url: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/numpy.tar' },
        ],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(true)
    })

    it('.wasm 확장자가 URL 어디에든 포함되어 있으면 인식한다', async () => {
      setupCacheAPI({
        'pyodide-cache-v2.0.0': [
          { url: 'https://example.com/path/to/some-module.wasm' },
        ],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(true)
    })
  })

  // ===== 시나리오 2: 접두사 매칭 =====
  describe('캐시 이름 접두사 매칭', () => {
    it('pyodide-cache- 접두사를 가진 캐시만 검색한다', async () => {
      const mockCaches = setupCacheAPI({
        'other-cache-v1': [
          { url: 'https://example.com/app.wasm' },
        ],
        'pyodide-cache-v1.0.0': [
          { url: 'https://cdn.jsdelivr.net/pyodide/pyodide.asm.wasm' },
        ],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(true)

      // pyodide-cache-v1.0.0이 열림
      expect(mockCaches.open).toHaveBeenCalledWith('pyodide-cache-v1.0.0')
    })

    it('pyodide-cache- 접두사가 없는 캐시만 있으면 false', async () => {
      setupCacheAPI({
        'my-app-cache': [
          { url: 'https://example.com/app.wasm' },
        ],
        'workbox-cache': [
          { url: 'https://cdn.example.com/bundle.js' },
        ],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(false)
    })
  })

  // ===== 시나리오 3: .wasm 파일 없음 =====
  describe('캐시 미스', () => {
    it('pyodide 캐시에 .wasm 파일이 없으면 false', async () => {
      setupCacheAPI({
        'pyodide-cache-v1.0.0': [
          { url: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js' },
          { url: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/numpy.tar' },
        ],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(false)
    })

    it('pyodide 캐시가 비어있으면 false', async () => {
      setupCacheAPI({
        'pyodide-cache-v1.0.0': [],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(false)
    })
  })

  // ===== 시나리오 4: caches API 미지원 =====
  describe('API 미지원 환경', () => {
    it('caches가 undefined이면 false (SSR 등)', async () => {
      removeCacheAPI()

      const result = await checkServiceWorkerCache()
      expect(result).toBe(false)
    })
  })

  // ===== 시나리오 5: 에러 처리 =====
  describe('에러 처리', () => {
    it('caches.keys()가 에러를 throw하면 false (graceful)', async () => {
      // @ts-expect-error - mock
      globalThis.caches = {
        keys: vi.fn().mockRejectedValue(new Error('SecurityError: Access denied')),
      }

      const result = await checkServiceWorkerCache()
      expect(result).toBe(false)
    })

    it('caches.open()이 에러를 throw하면 false (graceful)', async () => {
      // @ts-expect-error - mock
      globalThis.caches = {
        keys: vi.fn().mockResolvedValue(['pyodide-cache-v1.0.0']),
        open: vi.fn().mockRejectedValue(new Error('QuotaExceededError')),
      }

      const result = await checkServiceWorkerCache()
      expect(result).toBe(false)
    })

    it('cache.keys()가 에러를 throw하면 false (graceful)', async () => {
      const brokenCache = {
        keys: vi.fn().mockRejectedValue(new Error('Cache corrupted')),
      }
      // @ts-expect-error - mock
      globalThis.caches = {
        keys: vi.fn().mockResolvedValue(['pyodide-cache-v1.0.0']),
        open: vi.fn().mockResolvedValue(brokenCache),
      }

      const result = await checkServiceWorkerCache()
      expect(result).toBe(false)
    })
  })

  // ===== 시나리오 6: 다중 캐시 환경 =====
  describe('다중 캐시 환경', () => {
    it('여러 캐시 중 첫 번째 pyodide-cache-를 찾는다', async () => {
      const mockCaches = setupCacheAPI({
        'app-cache-v1': [
          { url: 'https://example.com/app.js' },
        ],
        'pyodide-cache-v1.0.0': [
          { url: 'https://cdn.jsdelivr.net/pyodide/pyodide.asm.wasm' },
        ],
        'pyodide-cache-v2.0.0': [
          { url: 'https://cdn.jsdelivr.net/pyodide/v2/pyodide.asm.wasm' },
        ],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(true)

      // 첫 번째 매칭 캐시가 열림 (v1.0.0)
      expect(mockCaches.open).toHaveBeenCalledWith('pyodide-cache-v1.0.0')
    })
  })

  // ===== 시나리오 7: 버전 변경 대응 =====
  describe('버전 변경 대응', () => {
    it('캐시 버전이 v3.0.0으로 변경되어도 접두사 매칭으로 동작', async () => {
      setupCacheAPI({
        'pyodide-cache-v3.0.0': [
          { url: 'https://cdn.jsdelivr.net/pyodide/v0.27/full/pyodide.asm.wasm' },
        ],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(true)
    })

    it('비표준 버전 형식도 접두사 매칭으로 동작', async () => {
      setupCacheAPI({
        'pyodide-cache-beta-2025': [
          { url: 'https://cdn.jsdelivr.net/pyodide/pyodide.asm.wasm' },
        ],
      })

      const result = await checkServiceWorkerCache()
      expect(result).toBe(true)
    })
  })
})
