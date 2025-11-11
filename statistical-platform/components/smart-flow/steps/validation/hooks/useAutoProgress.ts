/**
 * Auto Progress Hook
 *
 * @description
 * 데이터 검증 완료 후 자동으로 다음 단계로 진행하는 카운트다운 기능
 * - 5초 카운트다운
 * - 일시정지/재개
 * - 에러 발생 시 자동 정지
 */

import { useState, useEffect, useCallback } from 'react'

interface UseAutoProgressOptions {
  /** 자동 진행 활성화 여부 */
  enabled: boolean
  /** 검증 결과 */
  hasErrors: boolean
  /** 카운트다운 초기값 (기본: 5초) */
  initialCountdown?: number
  /** 카운트다운 완료 시 콜백 */
  onComplete?: () => void
}

interface UseAutoProgressReturn {
  /** 현재 카운트다운 값 */
  countdown: number
  /** 일시정지 상태 */
  isPaused: boolean
  /** 일시정지/재개 토글 */
  togglePause: () => void
  /** 자동 진행 활성화/비활성화 */
  setEnabled: (enabled: boolean) => void
  /** 카운트다운 초기화 */
  resetCountdown: () => void
}

export function useAutoProgress({
  enabled,
  hasErrors,
  initialCountdown = 5,
  onComplete
}: UseAutoProgressOptions): UseAutoProgressReturn {
  const [autoProgress, setAutoProgress] = useState(enabled)
  const [countdown, setCountdown] = useState(initialCountdown)
  const [isPaused, setIsPaused] = useState(false)
  const [hasCompleted, setHasCompleted] = useState(false)

  // 자동 진행 카운트다운
  useEffect(() => {
    if (!autoProgress || hasErrors || isPaused || hasCompleted) {
      return
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0) {
          return 0
        }
        if (prev <= 1) {
          setHasCompleted(true)
          onComplete?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [autoProgress, hasErrors, isPaused, onComplete, hasCompleted])

  const togglePause = useCallback(() => {
    setIsPaused(prev => {
      if (prev) {
        // 재시작 시 카운트다운 초기화
        setCountdown(initialCountdown)
        setHasCompleted(false)
      }
      return !prev
    })
  }, [initialCountdown])

  const setEnabled = useCallback((enabled: boolean) => {
    setAutoProgress(enabled)
    if (enabled) {
      setCountdown(initialCountdown)
      setIsPaused(false)
      setHasCompleted(false)
    }
  }, [initialCountdown])

  const resetCountdown = useCallback(() => {
    setCountdown(initialCountdown)
    setHasCompleted(false)
  }, [initialCountdown])

  return {
    countdown,
    isPaused,
    togglePause,
    setEnabled,
    resetCountdown
  }
}
