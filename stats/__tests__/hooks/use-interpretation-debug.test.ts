/**
 * useInterpretation act() 경고 디버그 테스트
 * 단계별 로그로 문제 원인 추적
 */
import { it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInterpretation } from '@/hooks/use-interpretation'
import { useHistoryStore } from '@/lib/stores/history-store'
import type { AnalysisResult } from '@/types/analysis'

const { requestInterpretationMock } = vi.hoisted(() => ({
  requestInterpretationMock: vi.fn(),
}))
vi.mock('@/lib/services/result-interpreter', () => ({
  requestInterpretation: (...args: Parameters<typeof requestInterpretationMock>) =>
    requestInterpretationMock(...args),
}))
vi.mock('@/lib/utils/storage', () => ({
  getHistory: vi.fn().mockResolvedValue(null),
  saveHistory: vi.fn().mockResolvedValue(undefined),
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  useHistoryStore.setState({ currentHistoryId: null, loadedAiInterpretation: null })
})
afterEach(() => {
  vi.useRealTimers()
  useHistoryStore.setState({ currentHistoryId: null, loadedAiInterpretation: null })
})

const RESULTS: AnalysisResult = {
  method: 'independent-t-test',
  statistic: 2.45,
  pValue: 0.014,
  interpretation: '유의한 차이 있음',
}

function makeParams(results: AnalysisResult | null) {
  return {
    results,
    uploadedData: [],
    mappedVariables: [],
    uploadedFileName: null,
    variableMapping: null,
    errorMessage: 'error',
  }
}

it.skip('[단계1] 초기 렌더 후 mock 호출 여부', async () => {
  const callLog: string[] = []

  requestInterpretationMock.mockImplementation(
    (_ctx: unknown, onChunk: (c: string) => void) => {
      callLog.push('mock-start')
      return new Promise<{ model: string; provider: string }>((resolve) => {
        setTimeout(() => {
          callLog.push('timeout-fired')
          onChunk('해석 완료')
          resolve({ model: 'test-model', provider: 'openrouter' })
        }, 0)
      })
    }
  )

  // results: null → auto-trigger 없음
  const hook = renderHook(
    ({ results }) => useInterpretation(makeParams(results)),
    { initialProps: { results: null as AnalysisResult | null } }
  )
  callLog.push(`after-renderHook: mock-calls=${requestInterpretationMock.mock.calls.length}`)

  // Phase 1: rerender with results
  await act(async () => {
    callLog.push('act1-start')
    hook.rerender({ results: RESULTS })
    callLog.push(`act1-after-rerender: mock-calls=${requestInterpretationMock.mock.calls.length}`)
  })
  callLog.push(`after-act1: mock-calls=${requestInterpretationMock.mock.calls.length}, interp="${hook.result.current.interpretation}"`)

  // Phase 2: run all timers
  await act(async () => {
    callLog.push('act2-start: running timers')
    await vi.runAllTimersAsync()
    callLog.push(`act2-after-timers: mock-calls=${requestInterpretationMock.mock.calls.length}`)
  })
  callLog.push(`after-act2: interp="${hook.result.current.interpretation}", isInterpreting=${hook.result.current.isInterpreting}`)

  console.log('\n=== STEP LOG ===\n' + callLog.map((s, i) => `  ${i+1}. ${s}`).join('\n'))

  expect(requestInterpretationMock).toHaveBeenCalledTimes(1)
  expect(hook.result.current.interpretation).toBe('해석 완료')
  expect(hook.result.current.isInterpreting).toBe(false)
})

it.skip('[단계2] loadedAiInterpretation 복원 여부', async () => {
  const callLog: string[] = []

  requestInterpretationMock.mockImplementation(
    (_ctx: unknown, onChunk: (c: string) => void) => {
      callLog.push('mock-start')
      return new Promise<{ model: string; provider: string }>((resolve) => {
        setTimeout(() => {
          callLog.push('timeout-fired')
          onChunk('해석 완료')
          resolve({ model: 'test-model', provider: 'openrouter' })
        }, 0)
      })
    }
  )

  const hook = renderHook(
    ({ results }) => useInterpretation(makeParams(results)),
    { initialProps: { results: null as AnalysisResult | null } }
  )

  // 첫 분석
  await act(async () => { hook.rerender({ results: RESULTS }) })
  await act(async () => { await vi.runAllTimersAsync() })
  callLog.push(`after-first-analysis: interp="${hook.result.current.interpretation}"`)

  // history-C 전환 (loadedAiInterpretation 있음)
  await act(async () => {
    callLog.push('switching to history-C')
    useHistoryStore.setState({
      currentHistoryId: 'history-C',
      loadedAiInterpretation: '히스토리 C의 캐시된 해석',
    })
    callLog.push(`after-setState: loadedAiInterp="${useHistoryStore.getState().loadedAiInterpretation}"`)
  })
  callLog.push(`after-setState-act: interp="${hook.result.current.interpretation}"`)

  await act(async () => { await vi.runAllTimersAsync() })
  callLog.push(`after-runAllTimers: interp="${hook.result.current.interpretation}"`)

  console.log('\n=== RESTORATION LOG ===\n' + callLog.map((s, i) => `  ${i+1}. ${s}`).join('\n'))

  expect(hook.result.current.interpretation).toBe('히스토리 C의 캐시된 해석')
})
