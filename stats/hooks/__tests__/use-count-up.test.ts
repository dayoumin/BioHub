/**
 * use-count-up hook 테스트
 * - P2 수정 검증: lazy initialization으로 reduced-motion 첫 프레임 flash 방지
 */
import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useCountUp } from '../use-count-up'

describe('useCountUp', () => {
  let originalMatchMedia: typeof window.matchMedia

  beforeEach(() => {
    vi.useFakeTimers()
    originalMatchMedia = window.matchMedia
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('target이 null이면 "-" 반환', () => {
    const { result } = renderHook(() => useCountUp(null))
    expect(result.current).toBe('-')
  })

  it('target이 undefined이면 "-" 반환', () => {
    const { result } = renderHook(() => useCountUp(undefined))
    expect(result.current).toBe('-')
  })

  it('started=false이면 "0.00" 반환', () => {
    const { result } = renderHook(() => useCountUp(42, { started: false }))
    expect(result.current).toBe('0.00')
  })

  it('decimals 옵션이 반영되어야 함', () => {
    const { result } = renderHook(() => useCountUp(null, { decimals: 4 }))
    expect(result.current).toBe('-')
  })

  it('started=false + decimals=4이면 "0.0000" 반환', () => {
    const { result } = renderHook(() => useCountUp(100, { started: false, decimals: 4 }))
    expect(result.current).toBe('0.0000')
  })

  describe('prefers-reduced-motion', () => {
    it('reduced-motion 사용자는 첫 렌더링부터 즉시 최종값 (flash 없음)', () => {
      // lazy initializer가 window.matchMedia를 즉시 읽으므로
      // 첫 렌더링에서 바로 target 값이 나와야 함
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const { result } = renderHook(() => useCountUp(99.5, { started: true, decimals: 2 }))

      // 첫 렌더링에서 즉시 최종값 — "0.00"에서 시작하는 flash 없음
      expect(result.current).toBe('99.50')
    })

    it('일반 사용자는 0에서 시작하여 애니메이션', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }))

      const { result } = renderHook(() => useCountUp(50, { started: true }))

      // 초기값은 0.00 (애니메이션 시작 전)
      expect(result.current).toBe('0.00')
    })
  })
})
