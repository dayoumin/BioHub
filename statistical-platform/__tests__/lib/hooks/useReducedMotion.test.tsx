/**
 * useReducedMotion Hook 테스트
 *
 * 테스트 범위:
 * - Issue #1: Legacy browser support (Safari ≤13, Android WebView)
 * - Issue #2: Initial state flash prevention (lazy initialization)
 * - SSR safety (window undefined)
 * - matchMedia 미지원 브라우저
 * - 실시간 변경 감지 (OS 설정 변경)
 */

import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useReducedMotion } from '@/lib/hooks/useReducedMotion'

describe('useReducedMotion', () => {
  // 원본 matchMedia 저장
  const originalMatchMedia = window.matchMedia

  afterEach(() => {
    // 각 테스트 후 복원
    window.matchMedia = originalMatchMedia
  })

  describe('Issue #2: Initial State (Lazy Initialization)', () => {
    it('should return false initially when prefers-reduced-motion is not set', () => {
      // matchMedia mock (reduce 미설정)
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(), // Safari ≤13
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))

      const { result } = renderHook(() => useReducedMotion())

      // ✅ 첫 렌더링부터 false (애니메이션 허용)
      expect(result.current).toBe(false)
    })

    it('should return true initially when prefers-reduced-motion is set', () => {
      // matchMedia mock (reduce 설정됨)
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: true, // ✅ reduce 활성화
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))

      const { result } = renderHook(() => useReducedMotion())

      // ✅ 첫 렌더링부터 true (애니메이션 플래시 방지!)
      expect(result.current).toBe(true)
    })
  })

  describe('Issue #1: Legacy Browser Support', () => {
    it('should use addEventListener when available (modern browsers)', () => {
      const addEventListenerSpy = vi.fn()
      const removeEventListenerSpy = vi.fn()

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: addEventListenerSpy, // ✅ 모던 API
        removeEventListener: removeEventListenerSpy,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))

      const { unmount } = renderHook(() => useReducedMotion())

      // ✅ addEventListener 호출됨
      expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))

      unmount()

      // ✅ cleanup: removeEventListener 호출됨
      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should fallback to addListener when addEventListener is undefined (Safari ≤13)', () => {
      const addListenerSpy = vi.fn()
      const removeListenerSpy = vi.fn()

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        // ❌ addEventListener 미지원 (Safari ≤13)
        addEventListener: undefined as unknown as typeof jest.fn,
        removeEventListener: undefined as unknown as typeof jest.fn,
        onchange: null,
        addListener: addListenerSpy, // ✅ Legacy API
        removeListener: removeListenerSpy,
        dispatchEvent: vi.fn()
      }))

      const { unmount } = renderHook(() => useReducedMotion())

      // ✅ addListener fallback 호출됨
      expect(addListenerSpy).toHaveBeenCalledWith(expect.any(Function))

      unmount()

      // ✅ cleanup: removeListener 호출됨
      expect(removeListenerSpy).toHaveBeenCalledWith(expect.any(Function))
    })
  })

  describe('SSR and Browser Compatibility', () => {
    it('should return false when matchMedia is not supported', () => {
      // matchMedia 미지원 브라우저 (IE9 이하)
      window.matchMedia = undefined as unknown as typeof window.matchMedia

      const { result } = renderHook(() => useReducedMotion())

      // ✅ 안전하게 false 반환
      expect(result.current).toBe(false)
    })
  })

  describe('Real-time Change Detection', () => {
    it('should update when OS setting changes (modern browsers)', () => {
      let changeHandler: ((event: MediaQueryListEvent) => void) | null = null

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false, // 초기: reduce 비활성화
        media: query,
        addEventListener: vi.fn((event, handler) => {
          if (event === 'change') {
            changeHandler = handler as (event: MediaQueryListEvent) => void
          }
        }),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))

      const { result } = renderHook(() => useReducedMotion())

      // 초기값: false
      expect(result.current).toBe(false)

      // OS 설정 변경 시뮬레이션 (reduce 활성화)
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent)
        }
      })

      // ✅ 상태 업데이트됨
      expect(result.current).toBe(true)
    })

    it('should update when OS setting changes (legacy browsers)', () => {
      let changeHandler: ((event: MediaQueryListEvent) => void) | null = null

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: undefined as unknown as typeof jest.fn,
        removeEventListener: undefined as unknown as typeof jest.fn,
        onchange: null,
        addListener: vi.fn((handler) => {
          changeHandler = handler as (event: MediaQueryListEvent) => void
        }),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))

      const { result } = renderHook(() => useReducedMotion())

      expect(result.current).toBe(false)

      // Legacy API로 변경 시뮬레이션
      act(() => {
        if (changeHandler) {
          changeHandler({ matches: true } as MediaQueryListEvent)
        }
      })

      // ✅ 상태 업데이트됨
      expect(result.current).toBe(true)
    })
  })

  describe('Cleanup', () => {
    it('should remove event listener on unmount (modern browsers)', () => {
      const removeEventListenerSpy = vi.fn()

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: removeEventListenerSpy,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))

      const { unmount } = renderHook(() => useReducedMotion())

      unmount()

      // ✅ cleanup 함수 호출됨
      expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
    })

    it('should remove listener on unmount (legacy browsers)', () => {
      const removeListenerSpy = vi.fn()

      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        addEventListener: undefined as unknown as typeof jest.fn,
        removeEventListener: undefined as unknown as typeof jest.fn,
        onchange: null,
        addListener: vi.fn(),
        removeListener: removeListenerSpy,
        dispatchEvent: vi.fn()
      }))

      const { unmount } = renderHook(() => useReducedMotion())

      unmount()

      // ✅ cleanup 함수 호출됨
      expect(removeListenerSpy).toHaveBeenCalledWith(expect.any(Function))
    })
  })
})
