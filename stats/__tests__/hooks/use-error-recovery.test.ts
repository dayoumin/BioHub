import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useErrorRecovery } from '@/hooks/use-error-recovery'

describe('useErrorRecovery', () => {
  it('초기 상태: retryCount=0, isExhausted=false', () => {
    const { result } = renderHook(() => useErrorRecovery())
    expect(result.current.retryCount).toBe(0)
    expect(result.current.isExhausted).toBe(false)
    expect(result.current.lastError).toBeNull()
  })

  it('recordRetry 호출 시 카운트 증가 + true 반환', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 2 }))

    let ok = false
    act(() => { ok = result.current.recordRetry() })
    expect(ok).toBe(true)
    expect(result.current.retryCount).toBe(1)
    expect(result.current.isExhausted).toBe(false)
  })

  it('maxRetries 도달 시 isExhausted=true', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 2 }))

    act(() => { result.current.recordRetry() })
    act(() => { result.current.recordRetry() })
    expect(result.current.retryCount).toBe(2)
    expect(result.current.isExhausted).toBe(true)
  })

  it('소진 후 recordRetry 호출 시 false 반환, 카운트 미증가', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 1 }))

    act(() => { result.current.recordRetry() })
    expect(result.current.isExhausted).toBe(true)

    let ok = true
    act(() => { ok = result.current.recordRetry() })
    expect(ok).toBe(false)
    expect(result.current.retryCount).toBe(1) // 증가 안 함
  })

  it('reset 후 카운트 + 에러 초기화', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 2 }))

    act(() => { result.current.recordRetry() })
    act(() => { result.current.setError('some error') })
    act(() => { result.current.recordRetry() })
    expect(result.current.isExhausted).toBe(true)
    expect(result.current.lastError).toBeNull() // recordRetry가 클리어

    act(() => { result.current.reset() })
    expect(result.current.retryCount).toBe(0)
    expect(result.current.isExhausted).toBe(false)
    expect(result.current.lastError).toBeNull()
  })

  it('기본 maxRetries는 2', () => {
    const { result } = renderHook(() => useErrorRecovery())

    act(() => { result.current.recordRetry() })
    expect(result.current.isExhausted).toBe(false)
    act(() => { result.current.recordRetry() })
    expect(result.current.isExhausted).toBe(true)
  })

  it('setError로 에러 메시지 기록', () => {
    const { result } = renderHook(() => useErrorRecovery())

    act(() => { result.current.setError('network timeout') })
    expect(result.current.lastError).toBe('network timeout')
  })

  it('recordRetry 시 이전 lastError 클리어', () => {
    const { result } = renderHook(() => useErrorRecovery())

    act(() => { result.current.setError('first error') })
    expect(result.current.lastError).toBe('first error')

    act(() => { result.current.recordRetry() })
    expect(result.current.lastError).toBeNull()
  })

  it('동기 연속 호출 시 ref 기반 가드가 정확히 차단', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 1 }))

    // act 하나에서 연속 호출 — 같은 렌더 사이클
    let first = false
    let second = false
    act(() => {
      first = result.current.recordRetry()   // count: 0 → 1
      second = result.current.recordRetry()  // count: 1 → 차단 (ref 기반)
    })
    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(result.current.retryCount).toBe(1)
  })
})
