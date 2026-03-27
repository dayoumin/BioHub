import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useBlastExecution } from '@/hooks/use-blast-execution'
import type { BlastSubmitPayload, UseBlastExecutionOptions } from '@/hooks/use-blast-execution'
import type { BlastErrorCode } from '@/lib/genetics/blast-utils'

// ── 헬퍼 ──

function mockSubmitResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockStatusResponse(status: string): Response {
  return new Response(JSON.stringify({ status }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockResultResponse(hits: Array<Record<string, unknown>>): Response {
  return new Response(JSON.stringify({ hits }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const BASE_PAYLOAD: BlastSubmitPayload = { sequence: 'ATGCGTAC', marker: 'COI' }

function defaultOptions<T>(overrides?: Partial<UseBlastExecutionOptions<T>>): UseBlastExecutionOptions<T> {
  return {
    payload: BASE_PAYLOAD,
    transform: vi.fn().mockResolvedValue([]) as unknown as UseBlastExecutionOptions<T>['transform'],
    onComplete: vi.fn(),
    onError: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  } as UseBlastExecutionOptions<T>
}

// ── 캐시 히트 경로 ──

describe('useBlastExecution — 캐시 히트', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('캐시 히트 시 transform → onComplete 호출', async () => {
    const cachedHits = [{ accession: 'AB1', identity: 0.99 }]
    const transformedResult = { hits: cachedHits }
    const transform = vi.fn().mockResolvedValue(transformedResult)
    const onComplete = vi.fn()

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockSubmitResponse({ cached: true, hits: cachedHits }),
    )

    const opts = defaultOptions({ transform, onComplete })

    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1)
    }, { timeout: 5000 })

    expect(transform).toHaveBeenCalledWith(cachedHits, expect.any(AbortSignal))
    expect(onComplete).toHaveBeenCalledWith(transformedResult, expect.any(Number))
  })

  it('캐시 경로에서 transform reject 시 onError 호출 + delay가 phase 덮어쓰지 않음', async () => {
    const onError = vi.fn()
    const onComplete = vi.fn()
    const transform = vi.fn().mockRejectedValue(new Error('enrich failed'))

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockSubmitResponse({ cached: true, hits: [{ accession: 'X' }] }),
    )

    const opts = defaultOptions({ transform, onError, onComplete })
    const { result } = renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
    }, { timeout: 5000 })

    expect(onError).toHaveBeenCalledWith('enrich failed', 'unknown')
    expect(onComplete).not.toHaveBeenCalled()

    // delay IIFE가 나중에 phase를 덮어쓰지 않는지 확인
    // 800ms + 800ms 대기 후에도 error 유지
    await new Promise(r => setTimeout(r, 2000))
    expect(result.current.phase).toBe('error')
  })
})

// ── 일반 경로 (폴링) ──

describe('useBlastExecution — 일반 경로', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('submit → poll(READY) → fetch → transform → onComplete', async () => {
    const resultHits = [{ accession: 'AB1' }]
    const transform = vi.fn().mockResolvedValue(resultHits)
    const onComplete = vi.fn()

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockSubmitResponse({ rid: 'RID1', rtoe: 1 }))
      .mockResolvedValueOnce(mockStatusResponse('READY'))
      .mockResolvedValueOnce(mockResultResponse(resultHits))

    const opts = defaultOptions({ transform, onComplete })

    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1)
    }, { timeout: 20000 })

    expect(transform).toHaveBeenCalledWith(resultHits, expect.any(AbortSignal))
    expect(onComplete).toHaveBeenCalledWith(resultHits, expect.any(Number))

    // fetch 호출: submit + status + result = 3
    expect(fetchSpy).toHaveBeenCalledTimes(3)
  })

  it('rid 없으면 폴링 없이 즉시 에러', async () => {
    const onError = vi.fn()

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockSubmitResponse({ rtoe: 1 }), // rid 없음
    )

    const opts = defaultOptions({ onError })
    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
    }, { timeout: 5000 })

    expect(onError).toHaveBeenCalledWith(
      '서버가 요청 ID를 반환하지 않았습니다.',
      'network',
    )
  })

  it('BLAST FAILED 상태 시 에러', async () => {
    const onError = vi.fn()

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(mockSubmitResponse({ rid: 'RID1', rtoe: 1 }))
      .mockResolvedValueOnce(mockStatusResponse('FAILED'))

    const opts = defaultOptions({ onError })
    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
    }, { timeout: 20000 })

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('NCBI BLAST 실패'),
      'blast-failed',
    )
  })
})

// ── 429 retry ──

describe('useBlastExecution — 429 retry', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('429 후 재시도 성공', async () => {
    const onComplete = vi.fn()
    const transform = vi.fn().mockResolvedValue([])

    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ retryAfter: 0 }), { status: 429 }))
      .mockResolvedValueOnce(mockSubmitResponse({ cached: true, hits: [] }))

    const opts = defaultOptions({ transform, onComplete })
    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1)
    }, { timeout: 10000 })
  })
})

// ── submit 에러 ──

describe('useBlastExecution — submit 에러', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('비-JSON 응답 시 network 에러', async () => {
    const onError = vi.fn()

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('<html>502</html>', {
        status: 502,
        headers: { 'Content-Type': 'text/html' },
      }),
    )

    const opts = defaultOptions({ onError })
    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
    }, { timeout: 5000 })

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('분석 서버에 연결할 수 없습니다'),
      'network',
    )
  })

  it('JSON 에러 응답의 message 전달', async () => {
    const onError = vi.fn()

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Invalid sequence' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    const opts = defaultOptions({ onError })
    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(onError).toHaveBeenCalledTimes(1)
    }, { timeout: 5000 })

    expect(onError).toHaveBeenCalledWith('Invalid sequence', 'network')
  })
})

// ── 취소 ──

describe('useBlastExecution — 취소', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('cancel 호출 시 onCancel 콜백 호출', () => {
    const onCancel = vi.fn()

    // submit이 오래 걸리도록 설정
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => {}), // 영원히 pending
    )

    const opts = defaultOptions({ onCancel })
    const { result } = renderHook(() => useBlastExecution(opts))

    act(() => {
      result.current.cancel()
    })

    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('언마운트 시 진행 중인 작업 abort', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => {}),
    )

    const opts = defaultOptions({})
    const { unmount } = renderHook(() => useBlastExecution(opts))

    // 언마운트 — abort되므로 에러 콜백이 호출되지 않아야 함
    unmount()

    // 약간의 시간을 두고 에러가 발생하지 않는지 확인
    await new Promise(r => setTimeout(r, 100))
    expect(opts.onError).not.toHaveBeenCalled()
  })
})

// ── currentStep 계산 ──

describe('useBlastExecution — currentStep', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('submitting phase에서 currentStep=0', () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      () => new Promise(() => {}),
    )

    const opts = defaultOptions({})
    const { result } = renderHook(() => useBlastExecution(opts))

    expect(result.current.phase).toBe('submitting')
    expect(result.current.currentStep).toBe(0)
  })
})

// ── submit payload 구성 ──

describe('useBlastExecution — payload 구성', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('marker 전용 payload', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockSubmitResponse({ cached: true, hits: [] }),
    )

    const opts = defaultOptions({
      payload: { sequence: 'ATGC', marker: 'COI' },
      transform: vi.fn().mockResolvedValue([]),
    })

    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    const body = JSON.parse(spy.mock.calls[0][1]?.body as string) as Record<string, unknown>
    expect(body.sequence).toBe('ATGC')
    expect(body.marker).toBe('COI')
    expect(body.program).toBeUndefined()
  })

  it('범용 BLAST payload (program/database/expect)', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      mockSubmitResponse({ cached: true, hits: [] }),
    )

    const opts = defaultOptions({
      payload: {
        sequence: 'ATGC',
        program: 'blastn',
        database: 'nt',
        expect: 0.001,
        hitlistSize: 100,
        megablast: true,
      },
      transform: vi.fn().mockResolvedValue([]),
    })

    renderHook(() => useBlastExecution(opts))

    await waitFor(() => {
      expect(spy).toHaveBeenCalled()
    })

    const body = JSON.parse(spy.mock.calls[0][1]?.body as string) as Record<string, unknown>
    expect(body.program).toBe('blastn')
    expect(body.database).toBe('nt')
    expect(body.expect).toBe(0.001)
    expect(body.hitlistSize).toBe(100)
    expect(body.megablast).toBe(true)
  })
})
