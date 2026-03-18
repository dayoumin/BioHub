/**
 * useInterpretation — 히스토리 전환 시뮬레이션 테스트
 *
 * 전체 컴포넌트 렌더링 대신 renderHook으로 useInterpretation 훅을 직접 테스트.
 *
 * ## act() 패턴 (2-phase)
 *
 * React 18 concurrent mode에서 useEffect는 act() fn 완료 후 비동기로 실행된다.
 * → rerender와 timer 실행을 별도 act()로 분리해야 한다:
 *
 *   Phase 1: await act(async () => { rerender() })
 *     → act의 async 완료 단계에서 effect 실행, mock 호출, setTimeout 스케줄링
 *   Phase 2: await act(async () => { await vi.runAllTimersAsync() })
 *     → 스케줄된 setTimeout 실행, onChunk 콜백, Promise resolve, state update
 *
 * ## Zustand act() 경고
 *
 * Zustand useSyncExternalStore + React 18 + vi.useFakeTimers() 조합에서
 * 스토어 업데이트가 act 컨텍스트 밖에서 처리되어 act() 경고가 발생하는
 * 알려진 이슈. 테스트는 모두 통과하며, 경고는 console.error spy로 suppression.
 *
 * 시나리오:
 * 1. 새 분석 (results 설정 후) → auto-trigger
 * 2. 히스토리 B(해석 없음) 전환 → 재트리거
 * 3. 히스토리 C(해석 있음) 전환 → loadedAiInterpretation 복원, 재트리거 없음
 * 4. getHistory stale 응답 → 무시
 * 5. getHistory stale 에러 → 무시
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInterpretation } from '@/hooks/use-interpretation'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { AnalysisResult } from '@/types/analysis'

// ===== 모의 =====

const { requestInterpretationMock } = vi.hoisted(() => ({
  requestInterpretationMock: vi.fn(),
}))

vi.mock('@/lib/services/result-interpreter', () => ({
  requestInterpretation: (...args: Parameters<typeof requestInterpretationMock>) =>
    requestInterpretationMock(...args),
}))

const { getHistoryMock } = vi.hoisted(() => ({
  getHistoryMock: vi.fn<(id: string) => Promise<{ aiInterpretation?: string | null } | null>>(),
}))

vi.mock('@/lib/utils/storage', () => ({
  getHistory: (id: string) => getHistoryMock(id),
  saveHistory: vi.fn().mockResolvedValue(undefined),
}))

// ===== 헬퍼 =====

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    method: 'independent-t-test',
    statistic: 2.45,
    pValue: 0.014,
    interpretation: '유의한 차이 있음',
    ...overrides,
  }
}

function makeParams(results: AnalysisResult | null) {
  return {
    results,
    uploadedData: [{ id: 1, score: 10 }],
    mappedVariables: ['score', 'group'],
    uploadedFileName: 'data.csv',
    variableMapping: null,
    errorMessage: 'AI 해석 오류',
  }
}

/**
 * requestInterpretation mock: setTimeout(0) 기반 (fake timer 제어)
 *
 * Phase 1 act → effect 실행 → mock 호출 → setTimeout 스케줄
 * Phase 2 act → vi.runAllTimersAsync() → setTimeout 실행 → onChunk → state update (act 안)
 */
function mockStreamingInterpretation(text = '해석 완료') {
  requestInterpretationMock.mockImplementation(
    (_ctx: unknown, onChunk: (c: string) => void) =>
      new Promise<{ model: string; provider: string }>((resolve) => {
        setTimeout(() => {
          onChunk(text)
          resolve({ model: 'test-model', provider: 'openrouter' })
        }, 0)
      })
  )
}

/** Phase 1: rerender → effects flush */
async function phase1Rerender(fn: () => void) {
  await act(async () => { fn() })
}

/** Phase 2: fake timers 실행 → async chain 완료 */
async function phase2Timers() {
  await act(async () => { await vi.runAllTimersAsync() })
}

// ===== 초기화 =====

let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  getHistoryMock.mockResolvedValue(null)
  mockStreamingInterpretation()
  useHistoryStore.setState({ currentHistoryId: null, loadedAiInterpretation: null })
  // Zustand useSyncExternalStore + React 18 + fake timers 조합의 알려진 act() 경고 필터
  // originalError를 미리 캡처해 spy가 자기 자신을 재귀 호출하지 않도록 함
  const originalError = console.error.bind(console)
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : ''
    if (msg.includes('not wrapped in act')) return // known Zustand/React18 warning — 테스트는 모두 통과
    originalError(...args)
  })
})

afterEach(() => {
  vi.useRealTimers()
  consoleErrorSpy.mockRestore()
  useHistoryStore.setState({ currentHistoryId: null, loadedAiInterpretation: null })
})

// ===== 시나리오 1: 새 분석 auto-trigger =====

describe('새 분석 자동 해석 트리거', () => {
  it('results 설정 시 자동 해석 실행', async () => {
    const { result, rerender } = renderHook(
      ({ results }) => useInterpretation(makeParams(results)),
      { initialProps: { results: null as AnalysisResult | null } }
    )

    expect(requestInterpretationMock).not.toHaveBeenCalled()

    await phase1Rerender(() => rerender({ results: makeResult() }))
    await phase2Timers()

    expect(requestInterpretationMock).toHaveBeenCalledTimes(1)
    expect(result.current.interpretation).toBe('해석 완료')
    expect(result.current.isInterpreting).toBe(false)
  })

  it('같은 results로 재렌더해도 중복 호출 없음 (sentinelRef 차단)', async () => {
    const { rerender } = renderHook(
      ({ results }) => useInterpretation(makeParams(results)),
      { initialProps: { results: null as AnalysisResult | null } }
    )

    await phase1Rerender(() => rerender({ results: makeResult() }))
    await phase2Timers()

    expect(requestInterpretationMock).toHaveBeenCalledTimes(1)

    await phase1Rerender(() => rerender({ results: makeResult() }))
    await phase2Timers()

    expect(requestInterpretationMock).toHaveBeenCalledTimes(1)
  })
})

// ===== 시나리오 2: 히스토리 A → B(해석 없음) 전환 =====

describe('히스토리 전환: 해석 없는 히스토리로 이동', () => {
  it('B(해석 없음)로 전환하면 requestInterpretation 재호출', async () => {
    const resultsA = makeResult()
    const resultsB = makeResult({ method: 'anova', pValue: 0.12, statistic: 1.8 })

    const { rerender } = renderHook(
      ({ results }) => useInterpretation(makeParams(results)),
      { initialProps: { results: null as AnalysisResult | null } }
    )

    await phase1Rerender(() => rerender({ results: resultsA }))
    await phase2Timers()

    const callsBefore = requestInterpretationMock.mock.calls.length

    await phase1Rerender(() => {
      useHistoryStore.setState({ currentHistoryId: 'history-B', loadedAiInterpretation: null })
      rerender({ results: resultsB })
    })
    await phase2Timers()

    expect(requestInterpretationMock.mock.calls.length).toBeGreaterThan(callsBefore)
  })

  it('전환 후 interpretation이 새 해석으로 업데이트됨', async () => {
    const resultsA = makeResult()
    const resultsB = makeResult({ method: 'anova', pValue: 0.12, statistic: 1.8 })

    const { result, rerender } = renderHook(
      ({ results }) => useInterpretation(makeParams(results)),
      { initialProps: { results: null as AnalysisResult | null } }
    )

    await phase1Rerender(() => rerender({ results: resultsA }))
    await phase2Timers()

    mockStreamingInterpretation('히스토리 B 해석')

    await phase1Rerender(() => {
      useHistoryStore.setState({ currentHistoryId: 'history-B', loadedAiInterpretation: null })
      rerender({ results: resultsB })
    })
    await phase2Timers()

    expect(result.current.interpretation).toBe('히스토리 B 해석')
  })
})

// ===== 시나리오 3: 히스토리 A → C(해석 있음) 전환 =====

describe('히스토리 전환: 캐시된 해석 복원', () => {
  it('loadedAiInterpretation 있으면 requestInterpretation 미호출', async () => {
    const { result, rerender } = renderHook(
      ({ results }) => useInterpretation(makeParams(results)),
      { initialProps: { results: null as AnalysisResult | null } }
    )

    await phase1Rerender(() => rerender({ results: makeResult() }))
    await phase2Timers()

    requestInterpretationMock.mockClear()

    await phase1Rerender(() => {
      useHistoryStore.setState({
        currentHistoryId: 'history-C',
        loadedAiInterpretation: '히스토리 C의 캐시된 해석',
      })
      rerender({ results: makeResult() })
    })
    await phase2Timers()

    expect(result.current.interpretation).toBe('히스토리 C의 캐시된 해석')
    expect(requestInterpretationMock).not.toHaveBeenCalled()
  })

  it('복원 후 isInterpreting은 false', async () => {
    const { result, rerender } = renderHook(
      ({ results }) => useInterpretation(makeParams(results)),
      { initialProps: { results: null as AnalysisResult | null } }
    )

    await phase1Rerender(() => rerender({ results: makeResult() }))
    await phase2Timers()

    await phase1Rerender(() => {
      useHistoryStore.setState({
        currentHistoryId: 'history-C',
        loadedAiInterpretation: '복원된 해석',
      })
    })
    await phase2Timers()

    expect(result.current.interpretation).toBe('복원된 해석')
    expect(result.current.isInterpreting).toBe(false)
  })
})

// ===== 시나리오 4: getHistory stale 응답 방어 =====

describe('새로고침 복원: stale getHistory 응답 무시', () => {
  it('응답 도착 전 다른 히스토리로 전환하면 stale 응답 무시', async () => {
    let resolveOld!: (val: { aiInterpretation: string } | null) => void

    getHistoryMock.mockImplementation((id: string) => {
      if (id === 'old-id') return new Promise(resolve => { resolveOld = resolve })
      return Promise.resolve(null)
    })

    // 새로고침 복원 경로: currentHistoryId = old-id
    await act(async () => {
      useHistoryStore.setState({ currentHistoryId: 'old-id', loadedAiInterpretation: null })
    })

    const { result, rerender } = renderHook(
      ({ results }) => useInterpretation(makeParams(results)),
      { initialProps: { results: null as AnalysisResult | null } }
    )

    // results 설정 → 첫 마운트 effect (currentHistoryId 있으면 getHistory 호출)
    await phase1Rerender(() => rerender({ results: makeResult() }))
    await phase2Timers()

    expect(getHistoryMock).toHaveBeenCalledWith('old-id')

    // 응답 도착 전 new-id로 전환 (해석 있음)
    await phase1Rerender(() => {
      useHistoryStore.setState({
        currentHistoryId: 'new-id',
        loadedAiInterpretation: '새 히스토리 해석',
      })
      rerender({ results: makeResult({ method: 'anova', pValue: 0.12, statistic: 1.8 }) })
    })
    await phase2Timers()

    expect(result.current.interpretation).toBe('새 히스토리 해석')

    requestInterpretationMock.mockClear()

    // stale 응답 도착
    await act(async () => {
      resolveOld({ aiInterpretation: '오래된 해석 — 무시되어야 함' })
    })
    await phase2Timers()

    // stale 응답이 현재 해석을 덮어쓰지 않음
    expect(result.current.interpretation).toBe('새 히스토리 해석')
    expect(requestInterpretationMock).not.toHaveBeenCalled()
  })

  it('getHistory 에러 도착 전 전환 → stale 에러, 신규 히스토리 해석 유지', async () => {
    let rejectOld!: (err: Error) => void

    getHistoryMock.mockImplementation((id: string) => {
      if (id === 'old-id') return new Promise((_, reject) => { rejectOld = reject })
      return Promise.resolve(null)
    })

    await act(async () => {
      useHistoryStore.setState({ currentHistoryId: 'old-id', loadedAiInterpretation: null })
    })

    const { result, rerender } = renderHook(
      ({ results }) => useInterpretation(makeParams(results)),
      { initialProps: { results: null as AnalysisResult | null } }
    )

    await phase1Rerender(() => rerender({ results: makeResult() }))
    await phase2Timers()

    expect(getHistoryMock).toHaveBeenCalledWith('old-id')

    await phase1Rerender(() => {
      useHistoryStore.setState({
        currentHistoryId: 'new-id',
        loadedAiInterpretation: '새 해석',
      })
      rerender({ results: makeResult({ method: 'anova', pValue: 0.12, statistic: 1.8 }) })
    })
    await phase2Timers()

    expect(result.current.interpretation).toBe('새 해석')

    requestInterpretationMock.mockClear()

    await act(async () => {
      rejectOld(new Error('network error'))
    })
    await phase2Timers()

    expect(requestInterpretationMock).not.toHaveBeenCalled()
    expect(result.current.interpretation).toBe('새 해석')
  })
})
