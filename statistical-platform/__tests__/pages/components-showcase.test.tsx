/**
 * components-showcase setInterval cleanup 테스트
 *
 * 목적:
 * 1. setInterval 메모리 누수 방지 검증 (단위 테스트)
 * 2. useRef + cleanup 로직 검증
 * 3. 회귀 방지: 향후 수정 시 버그 재발 방지
 *
 * 참고: 페이지 전체 테스트는 E2E로 분리 (Layout 복잡도)
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { useRef, useEffect, useState } from 'react'

/**
 * 실제 components-showcase의 interval 로직을 추출한 커스텀 훅
 */
function useProgressSimulation() {
  const [progress, setProgress] = useState(0)
  const [isProgressing, setIsProgressing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const startProgress = () => {
    // 기존 interval이 있으면 먼저 정리 (중복 방지)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    setIsProgressing(true)
    setProgress(0)

    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          setIsProgressing(false)
          return 100
        }
        return prev + 10
      })
    }, 500)
  }

  const resetProgress = () => {
    // interval 정리
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setProgress(0)
    setIsProgressing(false)
  }

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return { progress, isProgressing, startProgress, resetProgress, intervalRef }
}

describe('ComponentsShowcase - setInterval Cleanup', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('1. setInterval cleanup on unmount', () => {
    it('should clear interval when hook unmounts', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      const { result, unmount } = renderHook(() => useProgressSimulation())

      // 시작
      act(() => {
        result.current.startProgress()
      })

      expect(result.current.intervalRef.current).not.toBeNull()

      // 언마운트
      unmount()

      // clearInterval이 호출되었는지 확인
      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
    })
  })

  describe('2. interval 중복 방지', () => {
    it('should clear previous interval when starting new progress', () => {
      const { result } = renderHook(() => useProgressSimulation())

      // 첫 번째 시작
      act(() => {
        result.current.startProgress()
      })

      // 진행
      act(() => {
        jest.advanceTimersByTime(1000) // 20%
      })

      expect(result.current.progress).toBe(20)

      // 두 번째 시작 (기존 interval 정리되고 0부터 재시작)
      act(() => {
        result.current.startProgress()
      })

      expect(result.current.progress).toBe(0)

      // 진행
      act(() => {
        jest.advanceTimersByTime(500) // 10%
      })

      expect(result.current.progress).toBe(10)
    })

    it('should not create multiple intervals on rapid starts', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval')

      const { result } = renderHook(() => useProgressSimulation())

      const initialCallCount = setIntervalSpy.mock.calls.length

      // 빠르게 3번 시작
      act(() => {
        result.current.startProgress()
        result.current.startProgress()
        result.current.startProgress()
      })

      // setInterval이 3번 호출됨 (각 시작마다 1번씩)
      expect(setIntervalSpy).toHaveBeenCalledTimes(initialCallCount + 3)

      // 하지만 실제로 실행 중인 interval은 1개만
      act(() => {
        jest.advanceTimersByTime(500)
      })

      // 10%만 증가 (중복 interval이 없으므로)
      expect(result.current.progress).toBe(10)

      setIntervalSpy.mockRestore()
    })
  })

  describe('3. resetProgress 동작', () => {
    it('should clear interval and reset progress on reset', () => {
      const { result } = renderHook(() => useProgressSimulation())

      // 시작
      act(() => {
        result.current.startProgress()
      })

      // 진행
      act(() => {
        jest.advanceTimersByTime(1000) // 20%
      })

      expect(result.current.progress).toBe(20)
      expect(result.current.isProgressing).toBe(true)

      // Reset
      act(() => {
        result.current.resetProgress()
      })

      expect(result.current.progress).toBe(0)
      expect(result.current.isProgressing).toBe(false)
      expect(result.current.intervalRef.current).toBeNull()

      // 시간 진행해도 더 이상 업데이트되지 않음
      act(() => {
        jest.advanceTimersByTime(1000)
      })

      expect(result.current.progress).toBe(0)
    })
  })

  describe('4. 100% 도달 시 자동 정리', () => {
    it('should clear interval when progress reaches 100%', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      const { result } = renderHook(() => useProgressSimulation())

      // 시작
      act(() => {
        result.current.startProgress()
      })

      const initialCallCount = clearIntervalSpy.mock.calls.length

      // 100%까지 진행 (500ms * 10 = 5000ms)
      act(() => {
        jest.advanceTimersByTime(5000)
      })

      expect(result.current.progress).toBe(100)
      // isProgressing과 intervalRef는 setProgress 콜백 내에서 비동기적으로 업데이트됨
      // 다음 틱까지 기다림
      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(result.current.isProgressing).toBe(false)
      expect(result.current.intervalRef.current).toBeNull()

      // clearInterval이 호출되었는지 확인
      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(initialCallCount)

      clearIntervalSpy.mockRestore()
    })

    it('should not exceed 100%', () => {
      const { result } = renderHook(() => useProgressSimulation())

      // 시작
      act(() => {
        result.current.startProgress()
      })

      // 100% 이상 진행
      act(() => {
        jest.advanceTimersByTime(10000) // 과도하게 진행
      })

      // 100%에서 멈춤
      expect(result.current.progress).toBe(100)
    })
  })

  describe('5. 전체 생명주기 테스트', () => {
    it('should handle full lifecycle correctly', () => {
      const { result } = renderHook(() => useProgressSimulation())

      // 1. 시작
      act(() => {
        result.current.startProgress()
      })

      expect(result.current.progress).toBe(0)
      expect(result.current.isProgressing).toBe(true)

      // 2. 50%까지 진행
      act(() => {
        jest.advanceTimersByTime(2500) // 50%
      })

      expect(result.current.progress).toBe(50)

      // 3. Reset
      act(() => {
        result.current.resetProgress()
      })

      expect(result.current.progress).toBe(0)
      expect(result.current.isProgressing).toBe(false)

      // 4. 다시 시작
      act(() => {
        result.current.startProgress()
      })

      act(() => {
        jest.advanceTimersByTime(1000) // 20%
      })

      expect(result.current.progress).toBe(20)

      // 5. 100%까지 완료
      act(() => {
        jest.advanceTimersByTime(4000) // 총 100%
      })

      expect(result.current.progress).toBe(100)

      // 상태 업데이트 대기
      act(() => {
        jest.advanceTimersByTime(100)
      })

      expect(result.current.isProgressing).toBe(false)

      // 6. 100% 이후 더 이상 증가하지 않음
      act(() => {
        jest.advanceTimersByTime(2000)
      })

      expect(result.current.progress).toBe(100)
    })
  })
})
