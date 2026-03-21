'use client'

import { useState, useCallback, useRef } from 'react'

interface UseErrorRecoveryOptions {
  /** 최대 재시도 횟수 (기본 2) */
  maxRetries?: number
}

interface UseErrorRecoveryReturn {
  /** 현재까지 재시도한 횟수 */
  retryCount: number
  /** 최대 횟수 소진 여부 — true이면 대안 UI 표시 */
  isExhausted: boolean
  /** 재시도 가능 여부 확인 + 카운트 증가. 소진 시 false 반환 */
  recordRetry: () => boolean
  /** 에러 메시지 기록 (선택적 — 에러 표시용) */
  setError: (message: string) => void
  /** 카운터 + 에러 리셋 (새 세션, 히스토리 전환 시) */
  reset: () => void
  /** 마지막 에러 메시지 */
  lastError: string | null
}

/**
 * 에러 복구 카운터 — retry 횟수 추적 + 소진 판정
 *
 * 실행 로직(fetch, stream 등)은 호출자가 관리. 이 훅은 "몇 번 재시도했는지"만 추적.
 * AbortController, 타임아웃 등은 각 기능 훅(useInterpretation, useFollowUpQA)이 담당.
 *
 * @example
 * ```tsx
 * const { recordRetry, isExhausted, setError, reset } = useErrorRecovery()
 *
 * const handleError = async (error: Error) => {
 *   setError(error.message)
 *   if (isExhausted) {
 *     showFallback()
 *   } else if (recordRetry()) {
 *     await fetchInterpretation()  // 호출자가 직접 실행
 *   }
 * }
 * ```
 */
export function useErrorRecovery({
  maxRetries = 2,
}: UseErrorRecoveryOptions = {}): UseErrorRecoveryReturn {
  const [retryCount, setRetryCount] = useState(0)
  const [lastError, setLastError] = useState<string | null>(null)

  // ref 기반 가드 — 동기 연속 호출 시에도 정확한 카운트 보장
  const countRef = useRef(0)

  // isExhausted: ref 기반으로 즉시 반영 (state 업데이트 전에도 정확)
  // retryCount state는 UI 리렌더 트리거 용도
  const isExhausted = countRef.current >= maxRetries

  const recordRetry = useCallback((): boolean => {
    if (countRef.current >= maxRetries) return false
    countRef.current++
    setRetryCount(countRef.current)
    setLastError(null)
    return true
  }, [maxRetries])

  const setError = useCallback((message: string) => {
    setLastError(message)
  }, [])

  const reset = useCallback(() => {
    countRef.current = 0
    setRetryCount(0)
    setLastError(null)
  }, [])

  return { retryCount, isExhausted, recordRetry, setError, reset, lastError }
}
