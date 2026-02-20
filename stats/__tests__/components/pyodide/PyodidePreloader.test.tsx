/**
 * PyodidePreloader 컴포넌트 테스트
 *
 * 테스트 시나리오:
 * 1. UI 렌더링하지 않음 (null 반환)
 * 2. requestIdleCallback으로 유휴 시간에 초기화 예약
 * 3. Safari 폴백 (setTimeout 1000ms)
 * 4. 이미 초기화된 경우 스킵
 * 5. 초기화 실패 시 무시 (비치명적)
 * 6. 언마운트 시 cleanup
 * 7. StrictMode 이중 실행 방어
 */

import { render, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach, Mock } from 'vitest'

// --- Mock 설정 ---

// PyodideCoreService mock
const mockIsInitialized = vi.fn().mockReturnValue(false)
vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: () => ({
      isInitialized: mockIsInitialized,
    }),
  },
}))

// PyodideStatisticsService mock
const mockInitialize = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/services/pyodide-statistics', () => ({
  PyodideStatisticsService: {
    getInstance: () => ({
      initialize: mockInitialize,
    }),
  },
}))

// requestIdleCallback/cancelIdleCallback mock
let mockRequestIdleCallback: Mock | undefined
let mockCancelIdleCallback: Mock | undefined

describe('PyodidePreloader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsInitialized.mockReturnValue(false)
    mockInitialize.mockResolvedValue(undefined)

    // requestIdleCallback 지원 환경 시뮬레이션
    mockRequestIdleCallback = vi.fn((cb: () => void) => {
      // 즉시 실행 (테스트 편의)
      cb()
      return 42
    })
    mockCancelIdleCallback = vi.fn()
    globalThis.requestIdleCallback = mockRequestIdleCallback
    globalThis.cancelIdleCallback = mockCancelIdleCallback
  })

  afterEach(() => {
    cleanup()
    // @ts-expect-error - cleanup mock
    delete globalThis.requestIdleCallback
    // @ts-expect-error - cleanup mock
    delete globalThis.cancelIdleCallback
  })

  // ===== 시나리오 1: UI 렌더링 =====
  describe('렌더링', () => {
    it('null을 반환하여 UI를 렌더링하지 않는다', async () => {
      // 동적 import로 모듈 캐시 회피
      const { PyodidePreloader } = await import(
        '@/components/providers/PyodidePreloader'
      )
      const { container } = render(<PyodidePreloader />)
      expect(container.innerHTML).toBe('')
    })
  })

  // ===== 시나리오 2: requestIdleCallback 예약 =====
  describe('유휴 시간 예약', () => {
    it('requestIdleCallback으로 초기화를 예약한다', async () => {
      // requestIdleCallback이 콜백을 저장만 하고 즉시 실행하지 않도록 설정
      const storedCallbacks: (() => void)[] = []
      mockRequestIdleCallback = vi.fn((cb: () => void) => {
        storedCallbacks.push(cb)
        return 42
      })
      globalThis.requestIdleCallback = mockRequestIdleCallback

      const { PyodidePreloader } = await import(
        '@/components/providers/PyodidePreloader'
      )

      render(<PyodidePreloader />)

      // requestIdleCallback이 호출되었는지 확인
      expect(mockRequestIdleCallback).toHaveBeenCalledTimes(1)
      expect(typeof storedCallbacks[0]).toBe('function')
    })

    it('유휴 콜백 실행 시 PyodideStatisticsService.initialize()를 호출한다', async () => {
      const { PyodidePreloader } = await import(
        '@/components/providers/PyodidePreloader'
      )

      render(<PyodidePreloader />)

      // requestIdleCallback 콜백이 즉시 실행되도록 설정했으므로
      expect(mockInitialize).toHaveBeenCalledTimes(1)
    })
  })

  // ===== 시나리오 3: Safari 폴백 =====
  describe('Safari 폴백 (requestIdleCallback 미지원)', () => {
    it('requestIdleCallback이 없으면 setTimeout(1000ms)으로 폴백한다', async () => {
      vi.useFakeTimers()

      // requestIdleCallback 제거
      // @ts-expect-error - test mock
      delete globalThis.requestIdleCallback
      // @ts-expect-error - test mock
      delete globalThis.cancelIdleCallback

      // 모듈 캐시 클리어 후 재로드
      vi.resetModules()

      // Mock 재설정 (모듈 리셋 후)
      vi.doMock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
        PyodideCoreService: {
          getInstance: () => ({
            isInitialized: vi.fn().mockReturnValue(false),
          }),
        },
      }))

      const mockInit = vi.fn().mockResolvedValue(undefined)
      vi.doMock('@/lib/services/pyodide-statistics', () => ({
        PyodideStatisticsService: {
          getInstance: () => ({
            initialize: mockInit,
          }),
        },
      }))

      const { PyodidePreloader } = await import(
        '@/components/providers/PyodidePreloader'
      )

      render(<PyodidePreloader />)

      // 아직 initialize 호출 안됨
      expect(mockInit).not.toHaveBeenCalled()

      // 1초 경과
      vi.advanceTimersByTime(1000)
      await vi.runAllTimersAsync()

      expect(mockInit).toHaveBeenCalledTimes(1)

      vi.useRealTimers()
    })
  })

  // ===== 시나리오 4: 이미 초기화된 경우 스킵 =====
  describe('초기화 스킵', () => {
    it('이미 초기화되었으면 initialize()를 호출하지 않는다', async () => {
      mockIsInitialized.mockReturnValue(true)

      vi.resetModules()
      vi.doMock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
        PyodideCoreService: {
          getInstance: () => ({
            isInitialized: vi.fn().mockReturnValue(true),
          }),
        },
      }))

      const skipInit = vi.fn()
      vi.doMock('@/lib/services/pyodide-statistics', () => ({
        PyodideStatisticsService: {
          getInstance: () => ({
            initialize: skipInit,
          }),
        },
      }))

      const { PyodidePreloader } = await import(
        '@/components/providers/PyodidePreloader'
      )

      render(<PyodidePreloader />)

      // requestIdleCallback이 호출되지 않아야 함
      expect(skipInit).not.toHaveBeenCalled()
    })
  })

  // ===== 시나리오 5: 초기화 실패 시 무시 =====
  describe('실패 처리', () => {
    it('초기화 실패 시 에러를 throw하지 않는다 (비치명적)', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      vi.resetModules()
      vi.doMock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
        PyodideCoreService: {
          getInstance: () => ({
            isInitialized: vi.fn().mockReturnValue(false),
          }),
        },
      }))

      const failInit = vi.fn().mockRejectedValue(new Error('CDN 접근 불가'))
      vi.doMock('@/lib/services/pyodide-statistics', () => ({
        PyodideStatisticsService: {
          getInstance: () => ({
            initialize: failInit,
          }),
        },
      }))

      // requestIdleCallback을 즉시 실행하도록 설정
      // @ts-expect-error - IdleRequestCallback vs () => void 타입 불일치 (테스트용 단순화)
      globalThis.requestIdleCallback = vi.fn((cb: () => void) => {
        cb()
        return 99
      })

      const { PyodidePreloader } = await import(
        '@/components/providers/PyodidePreloader'
      )

      // 에러 없이 렌더링 완료되어야 함
      expect(() => render(<PyodidePreloader />)).not.toThrow()

      // Promise rejection이 처리될 때까지 대기
      await vi.waitFor(() => {
        expect(failInit).toHaveBeenCalledTimes(1)
      })

      consoleWarnSpy.mockRestore()
    })
  })

  // ===== 시나리오 6: 언마운트 cleanup =====
  describe('언마운트 cleanup', () => {
    it('언마운트 시 cancelIdleCallback을 호출한다', async () => {
      const storedCallbacks: (() => void)[] = []
      const mockCancel = vi.fn()

      // @ts-expect-error - IdleRequestCallback vs () => void 타입 불일치 (테스트용 단순화)
      globalThis.requestIdleCallback = vi.fn((cb: () => void) => {
        storedCallbacks.push(cb)
        return 77
      })
      globalThis.cancelIdleCallback = mockCancel

      vi.resetModules()
      vi.doMock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
        PyodideCoreService: {
          getInstance: () => ({
            isInitialized: vi.fn().mockReturnValue(false),
          }),
        },
      }))
      vi.doMock('@/lib/services/pyodide-statistics', () => ({
        PyodideStatisticsService: {
          getInstance: () => ({
            initialize: vi.fn().mockResolvedValue(undefined),
          }),
        },
      }))

      const { PyodidePreloader } = await import(
        '@/components/providers/PyodidePreloader'
      )

      const { unmount } = render(<PyodidePreloader />)

      unmount()

      // cancelIdleCallback이 올바른 핸들로 호출됨
      expect(mockCancel).toHaveBeenCalledWith(77)
    })
  })
})
