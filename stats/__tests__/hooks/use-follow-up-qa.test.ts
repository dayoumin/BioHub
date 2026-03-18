/**
 * useFollowUpQA — 핵심 동작 검증
 *
 * 1. handleFollowUp: 전송 즉시 followUpInput 초기화 (regression guard)
 * 2. handleFollowUp: 빈 문자열 / 공백은 무시
 * 3. handleFollowUp: 스트리밍 중 재호출은 동기 가드로 차단
 * 4. resetFollowUp: 메시지 + 입력 + 스트리밍 상태 초기화
 * 5. handleFollowUp: 스트리밍 완료 후 isFollowUpStreaming === false
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useFollowUpQA } from '@/hooks/use-follow-up-qa'
import type { AnalysisResult } from '@/types/analysis'

// ===== 모의 =====

const { streamFollowUpMock } = vi.hoisted(() => ({
  streamFollowUpMock: vi.fn(),
}))

vi.mock('@/lib/services/result-interpreter', () => ({
  streamFollowUp: streamFollowUpMock,
}))

// ===== 헬퍼 =====

function makeResult(): AnalysisResult {
  return {
    method: 'independent-t-test',
    statistic: 2.45,
    pValue: 0.014,
    interpretation: '유의한 차이 있음',
  }
}

function makeOptions(overrides: Partial<Parameters<typeof useFollowUpQA>[0]> = {}) {
  return {
    results: makeResult(),
    interpretation: '분석 결과: 유의미한 차이가 있습니다.',
    sampleSize: 60,
    mappedVariables: ['score', 'group'],
    uploadedFileName: 'data.csv',
    errorPrefix: (msg: string) => `오류: ${msg}`,
    errorMessage: '알 수 없는 오류가 발생했습니다.',
    ...overrides,
  }
}

// ===== 테스트 =====

describe('useFollowUpQA: handleFollowUp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 기본: 즉시 완료 (청크 없음)
    streamFollowUpMock.mockResolvedValue({ model: 'claude-3-5' })
  })

  it('전송 즉시 followUpInput이 빈 문자열로 초기화된다 (regression)', async () => {
    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    // 입력값 설정
    act(() => { result.current.setFollowUpInput('p값이 0.014라는 건 어떤 의미인가요?') })
    expect(result.current.followUpInput).toBe('p값이 0.014라는 건 어떤 의미인가요?')

    // 전송
    await act(async () => {
      await result.current.handleFollowUp(result.current.followUpInput)
    })

    // 전송 즉시 초기화
    expect(result.current.followUpInput).toBe('')
  })

  it('빈 문자열 전송은 무시된다 — 메시지도 추가되지 않는다', async () => {
    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    await act(async () => {
      await result.current.handleFollowUp('')
    })

    expect(result.current.followUpMessages).toHaveLength(0)
    expect(streamFollowUpMock).not.toHaveBeenCalled()
  })

  it('공백만 있는 입력은 무시된다', async () => {
    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    await act(async () => {
      await result.current.handleFollowUp('   ')
    })

    expect(result.current.followUpMessages).toHaveLength(0)
    expect(streamFollowUpMock).not.toHaveBeenCalled()
  })

  it('전송 후 user + assistant placeholder 두 메시지가 추가된다', async () => {
    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    await act(async () => {
      await result.current.handleFollowUp('효과크기는요?')
    })

    expect(result.current.followUpMessages).toHaveLength(2)
    expect(result.current.followUpMessages[0].role).toBe('user')
    expect(result.current.followUpMessages[0].content).toBe('효과크기는요?')
    expect(result.current.followUpMessages[1].role).toBe('assistant')
  })

  it('스트리밍 완료 후 isFollowUpStreaming === false', async () => {
    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    await act(async () => {
      await result.current.handleFollowUp('마무리 질문')
    })

    expect(result.current.isFollowUpStreaming).toBe(false)
  })

  it('스트리밍 중 재호출은 동기 가드로 차단된다 — 메시지는 2개만', async () => {
    // 첫 번째 호출이 완료되기 전까지 대기
    let resolveStream!: () => void
    streamFollowUpMock.mockReturnValue(
      new Promise<{ model: string }>((resolve) => { resolveStream = () => resolve({ model: 'test' }) })
    )

    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    // 첫 번째 전송 (완료 안 된 상태)
    act(() => { void result.current.handleFollowUp('첫 번째 질문') })

    // 두 번째 전송 시도 (가드에 막혀야 함)
    await act(async () => {
      await result.current.handleFollowUp('두 번째 질문')
    })

    // user + assistant placeholder = 2개 (두 번째는 추가 안 됨)
    expect(result.current.followUpMessages).toHaveLength(2)
    expect(result.current.followUpMessages[0].content).toBe('첫 번째 질문')

    // 스트림 완료
    await act(async () => { resolveStream() })
  })

  it('results === null 이면 전송하지 않는다', async () => {
    const { result } = renderHook(() =>
      useFollowUpQA(makeOptions({ results: null }))
    )

    await act(async () => {
      await result.current.handleFollowUp('질문')
    })

    expect(streamFollowUpMock).not.toHaveBeenCalled()
    expect(result.current.followUpMessages).toHaveLength(0)
  })

  it('interpretation === null 이면 전송하지 않는다', async () => {
    const { result } = renderHook(() =>
      useFollowUpQA(makeOptions({ interpretation: null }))
    )

    await act(async () => {
      await result.current.handleFollowUp('질문')
    })

    expect(streamFollowUpMock).not.toHaveBeenCalled()
  })
})

describe('useFollowUpQA: resetFollowUp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    streamFollowUpMock.mockResolvedValue({ model: 'claude-3-5' })
  })

  it('메시지 + 입력 + 스트리밍 상태가 모두 초기화된다', async () => {
    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    // 상태 채우기
    await act(async () => {
      result.current.setFollowUpInput('입력값')
      await result.current.handleFollowUp('질문')
    })

    expect(result.current.followUpMessages.length).toBeGreaterThan(0)

    // 리셋
    act(() => { result.current.resetFollowUp() })

    expect(result.current.followUpMessages).toHaveLength(0)
    expect(result.current.followUpInput).toBe('')
    expect(result.current.isFollowUpStreaming).toBe(false)
  })

  it('리셋 후 새 전송이 정상 동작한다', async () => {
    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    await act(async () => {
      await result.current.handleFollowUp('첫 질문')
    })

    act(() => { result.current.resetFollowUp() })

    await act(async () => {
      await result.current.handleFollowUp('두 번째 질문')
    })

    // 리셋 후 새 메시지만 있어야 함
    expect(result.current.followUpMessages).toHaveLength(2)
    expect(result.current.followUpMessages[0].content).toBe('두 번째 질문')
  })
})

describe('useFollowUpQA: 스트리밍 에러 처리', () => {
  beforeEach(() => vi.clearAllMocks())

  it('스트리밍 에러 시 assistant 메시지에 errorPrefix 적용', async () => {
    streamFollowUpMock.mockRejectedValue(new Error('네트워크 오류'))

    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    await act(async () => {
      await result.current.handleFollowUp('질문')
    })

    const assistantMsg = result.current.followUpMessages.find(m => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('오류: 네트워크 오류')
    expect(result.current.isFollowUpStreaming).toBe(false)
  })

  it('Error 인스턴스가 아닌 에러 시 errorMessage 폴백', async () => {
    streamFollowUpMock.mockRejectedValue('string error')

    const { result } = renderHook(() => useFollowUpQA(makeOptions()))

    await act(async () => {
      await result.current.handleFollowUp('질문')
    })

    const assistantMsg = result.current.followUpMessages.find(m => m.role === 'assistant')
    expect(assistantMsg?.content).toBe('알 수 없는 오류가 발생했습니다.')
  })
})
