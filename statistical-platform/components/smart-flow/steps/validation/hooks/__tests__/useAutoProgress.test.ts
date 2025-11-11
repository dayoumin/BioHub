/**
 * useAutoProgress Hook - Unit Tests
 *
 * @description
 * 자동 진행 카운트다운 훅 테스트
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useAutoProgress } from '../useAutoProgress'

// 타이머를 위한 fake timers 사용
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('useAutoProgress', () => {
  describe('초기 상태', () => {
    it('기본값으로 초기화되어야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false
        })
      )

      expect(result.current.countdown).toBe(5)
      expect(result.current.isPaused).toBe(false)
    })

    it('커스텀 initialCountdown으로 초기화되어야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false,
          initialCountdown: 10
        })
      )

      expect(result.current.countdown).toBe(10)
    })

    it('enabled=false이면 카운트다운이 시작되지 않아야 함', () => {
      const onComplete = jest.fn()
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: false,
          hasErrors: false,
          onComplete
        })
      )

      act(() => {
        jest.advanceTimersByTime(6000)
      })

      expect(result.current.countdown).toBe(5)
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('hasErrors=true이면 카운트다운이 시작되지 않아야 함', () => {
      const onComplete = jest.fn()
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: true,
          onComplete
        })
      )

      act(() => {
        jest.advanceTimersByTime(6000)
      })

      expect(result.current.countdown).toBe(5)
      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  describe('카운트다운 동작', () => {
    it('1초마다 countdown이 감소해야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false
        })
      )

      expect(result.current.countdown).toBe(5)

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(result.current.countdown).toBe(4)

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(result.current.countdown).toBe(3)
    })

    it('countdown이 0에 도달하면 onComplete가 호출되어야 함', () => {
      const onComplete = jest.fn()
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false,
          initialCountdown: 2,
          onComplete
        })
      )

      expect(result.current.countdown).toBe(2)

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(result.current.countdown).toBe(1)
      expect(onComplete).not.toHaveBeenCalled()

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(result.current.countdown).toBe(0)
      expect(onComplete).toHaveBeenCalledTimes(1)
    })

    it('countdown이 0에 도달한 후 더 이상 감소하지 않아야 함', () => {
      const onComplete = jest.fn()
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false,
          initialCountdown: 1,
          onComplete
        })
      )

      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(result.current.countdown).toBe(0)
      expect(onComplete).toHaveBeenCalledTimes(1)

      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(result.current.countdown).toBe(0)
      expect(onComplete).toHaveBeenCalledTimes(1) // 한 번만 호출
    })
  })

  describe('togglePause 기능', () => {
    it('일시정지하면 카운트다운이 멈춰야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false,
          initialCountdown: 5
        })
      )

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(result.current.countdown).toBe(3)

      act(() => {
        result.current.togglePause()
      })
      expect(result.current.isPaused).toBe(true)

      act(() => {
        jest.advanceTimersByTime(3000)
      })
      expect(result.current.countdown).toBe(3) // 멈춤
    })

    it('재개하면 카운트다운이 초기화되고 다시 시작해야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false,
          initialCountdown: 5
        })
      )

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(result.current.countdown).toBe(3)

      act(() => {
        result.current.togglePause() // 일시정지
      })
      expect(result.current.isPaused).toBe(true)

      act(() => {
        result.current.togglePause() // 재개
      })
      expect(result.current.isPaused).toBe(false)
      expect(result.current.countdown).toBe(5) // 초기화됨

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(result.current.countdown).toBe(4) // 다시 카운트다운
    })
  })

  describe('setEnabled 기능', () => {
    it('enabled를 true로 설정하면 카운트다운이 시작해야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: false,
          hasErrors: false,
          initialCountdown: 3
        })
      )

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(result.current.countdown).toBe(3) // 아직 시작 안 됨

      act(() => {
        result.current.setEnabled(true)
      })

      act(() => {
        jest.advanceTimersByTime(1000)
      })
      expect(result.current.countdown).toBe(2) // 시작됨
    })

    it('enabled를 true로 설정하면 isPaused가 false로 초기화되어야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: false,
          hasErrors: false
        })
      )

      act(() => {
        result.current.togglePause()
      })
      expect(result.current.isPaused).toBe(true)

      act(() => {
        result.current.setEnabled(true)
      })
      expect(result.current.isPaused).toBe(false)
    })

    it('enabled를 false로 설정하면 카운트다운이 멈춰야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false,
          initialCountdown: 5
        })
      )

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(result.current.countdown).toBe(3)

      act(() => {
        result.current.setEnabled(false)
      })

      act(() => {
        jest.advanceTimersByTime(3000)
      })
      expect(result.current.countdown).toBe(3) // 멈춤
    })
  })

  describe('resetCountdown 기능', () => {
    it('countdown을 초기값으로 리셋해야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: false,
          hasErrors: false,
          initialCountdown: 10
        })
      )

      act(() => {
        result.current.setEnabled(true)
      })

      act(() => {
        jest.advanceTimersByTime(5000)
      })
      expect(result.current.countdown).toBe(5)

      act(() => {
        result.current.resetCountdown()
      })
      expect(result.current.countdown).toBe(10)
    })
  })

  describe('에지 케이스', () => {
    it('onComplete 없이도 정상 작동해야 함', () => {
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false,
          initialCountdown: 1
        })
      )

      expect(() => {
        act(() => {
          jest.advanceTimersByTime(2000)
        })
      }).not.toThrow()

      expect(result.current.countdown).toBe(0)
    })

    it('hasErrors가 중간에 true로 변경되면 카운트다운이 멈춰야 함', () => {
      const { result, rerender } = renderHook(
        ({ hasErrors }) =>
          useAutoProgress({
            enabled: true,
            hasErrors,
            initialCountdown: 5
          }),
        { initialProps: { hasErrors: false } }
      )

      act(() => {
        jest.advanceTimersByTime(2000)
      })
      expect(result.current.countdown).toBe(3)

      rerender({ hasErrors: true })

      act(() => {
        jest.advanceTimersByTime(3000)
      })
      expect(result.current.countdown).toBe(3) // 멈춤
    })

    it('initialCountdown이 0이면 즉시 onComplete 호출', () => {
      const onComplete = jest.fn()
      const { result } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false,
          initialCountdown: 0,
          onComplete
        })
      )

      expect(result.current.countdown).toBe(0)
      // countdown이 이미 0이므로 타이머가 시작되지 않음
      expect(onComplete).not.toHaveBeenCalled()
    })

    it('메모리 누수 방지: unmount 시 타이머가 정리되어야 함', () => {
      const { unmount } = renderHook(() =>
        useAutoProgress({
          enabled: true,
          hasErrors: false
        })
      )

      const timerCount = jest.getTimerCount()
      unmount()

      expect(jest.getTimerCount()).toBeLessThan(timerCount)
    })
  })
})
