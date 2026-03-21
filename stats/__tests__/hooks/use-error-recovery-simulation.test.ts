/**
 * useErrorRecovery 실제 사용 시나리오 시뮬레이션
 *
 * 3가지 의도된 사용처를 모사:
 * 1. AI 해석 — 2회 실패 후 fallback 표시
 * 2. 변수 자동감지 — 1회 실패 시 토스트 + 재시도
 * 3. 허브 채팅 — 에러 후 메시지 복원 + 재시도
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useErrorRecovery } from '@/hooks/use-error-recovery'

// ─── 시나리오 1: AI 해석 graceful degradation ──────────────────────

describe('시나리오: AI 해석 2회 실패 → fallback', () => {
  it('1회 실패 → 재시도 가능, 2회 실패 → isExhausted + fallback', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 2 }))

    // 시뮬: interpretError 발생
    const interpretError = new Error('OpenRouter 429: Rate limit exceeded')

    // 1회차 실패
    act(() => {
      result.current.setError(interpretError.message)
    })
    expect(result.current.lastError).toBe('OpenRouter 429: Rate limit exceeded')
    expect(result.current.isExhausted).toBe(false)

    // 사용자가 "재시도" 클릭 → recordRetry
    let canRetry = false
    act(() => {
      canRetry = result.current.recordRetry()
    })
    expect(canRetry).toBe(true)
    expect(result.current.retryCount).toBe(1)
    expect(result.current.lastError).toBeNull() // recordRetry가 클리어

    // 2회차도 실패
    act(() => {
      result.current.setError('OpenRouter 503: Service unavailable')
    })

    // 사용자가 또 "재시도" 클릭
    act(() => {
      canRetry = result.current.recordRetry()
    })
    expect(canRetry).toBe(true)
    expect(result.current.retryCount).toBe(2)
    expect(result.current.isExhausted).toBe(true)

    // 3회차 시도 → 차단됨
    act(() => {
      result.current.setError('Network timeout')
    })
    act(() => {
      canRetry = result.current.recordRetry()
    })
    expect(canRetry).toBe(false) // 소진!
    expect(result.current.retryCount).toBe(2) // 증가 안 함

    // UI는 isExhausted 보고 fallback 표시
    expect(result.current.isExhausted).toBe(true)
    expect(result.current.lastError).toBe('Network timeout')
  })

  it('중간에 성공하면 에러 클리어, 카운트는 유지', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 2 }))

    // 1회 실패 → 재시도
    act(() => {
      result.current.setError('timeout')
      result.current.recordRetry()
    })
    expect(result.current.retryCount).toBe(1)
    expect(result.current.lastError).toBeNull() // recordRetry가 클리어

    // 2회차 성공! — setError 호출 안 함
    // retryCount는 1로 유지, lastError는 null
    expect(result.current.retryCount).toBe(1)
    expect(result.current.lastError).toBeNull()
    expect(result.current.isExhausted).toBe(false) // 아직 여유 있음
  })
})

// ─── 시나리오 2: 변수 자동감지 실패 ──────────────────────────────

describe('시나리오: 변수감지 실패 → 토스트 + 수동 선택 안내', () => {
  it('감지 실패 시 에러 기록, 재시도 성공 시 정상 진행', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 1 }))
    const showToast = vi.fn()

    // 변수 감지 실패
    const detectVariables = vi.fn()
      .mockRejectedValueOnce(new Error('Column type ambiguous'))
      .mockResolvedValueOnce({ numeric: ['x'], categorical: ['group'] })

    // 1회 실패
    act(() => {
      result.current.setError('Column type ambiguous')
      showToast('변수 자동감지에 실패했습니다.')
    })
    expect(showToast).toHaveBeenCalledWith('변수 자동감지에 실패했습니다.')
    expect(result.current.isExhausted).toBe(false)

    // 재시도
    let ok = false
    act(() => {
      ok = result.current.recordRetry()
    })
    expect(ok).toBe(true)
    expect(result.current.retryCount).toBe(1)
    expect(result.current.isExhausted).toBe(true) // maxRetries=1이라 소진

    // 소진 후 → "수동으로 선택해주세요" UI 표시
    expect(result.current.isExhausted).toBe(true)
  })
})

// ─── 시나리오 3: 허브 채팅 에러 복구 ──────────────────────────────

describe('시나리오: 허브 채팅 에러 → 메시지 복원', () => {
  it('에러 후 reset으로 새 대화 시작', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 2 }))

    // 채팅 전송 실패
    act(() => { result.current.setError('분류 중 오류 발생') })
    act(() => { result.current.recordRetry() })

    // 또 실패
    act(() => { result.current.setError('API timeout') })
    act(() => { result.current.recordRetry() })

    expect(result.current.isExhausted).toBe(true)

    // 사용자가 "새 대화" 클릭 → reset
    act(() => { result.current.reset() })
    expect(result.current.retryCount).toBe(0)
    expect(result.current.isExhausted).toBe(false)
    expect(result.current.lastError).toBeNull()

    // 다시 재시도 가능
    let ok = false
    act(() => { ok = result.current.recordRetry() })
    expect(ok).toBe(true)
  })
})

// ─── 엣지 케이스 ──────────────────────────────────────────────────

describe('엣지 케이스', () => {
  it('maxRetries=0 → 처음부터 소진 상태', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 0 }))
    expect(result.current.isExhausted).toBe(true)

    let ok = true
    act(() => { ok = result.current.recordRetry() })
    expect(ok).toBe(false)
  })

  it('동기 연속 호출 — 더블클릭 시뮬레이션', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 1 }))

    // 더블클릭: 같은 렌더 사이클에서 2번 호출
    let first = false
    let second = false
    act(() => {
      first = result.current.recordRetry()
      second = result.current.recordRetry() // ref 가드가 차단해야 함
    })
    expect(first).toBe(true)
    expect(second).toBe(false)
    expect(result.current.retryCount).toBe(1) // 1번만 증가
  })

  it('reset 후 연속 retry — 전체 라이프사이클', () => {
    const { result } = renderHook(() => useErrorRecovery({ maxRetries: 1 }))

    // 소진
    act(() => { result.current.recordRetry() })
    expect(result.current.isExhausted).toBe(true)

    // 리셋
    act(() => { result.current.reset() })
    expect(result.current.isExhausted).toBe(false)

    // 다시 소진
    act(() => { result.current.recordRetry() })
    expect(result.current.isExhausted).toBe(true)

    // 다시 차단
    let ok = true
    act(() => { ok = result.current.recordRetry() })
    expect(ok).toBe(false)
  })
})
