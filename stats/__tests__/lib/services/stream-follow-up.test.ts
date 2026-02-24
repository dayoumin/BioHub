/**
 * 결과 해석 후속 Q&A 스트리밍 시뮬레이션 테스트
 *
 * 실제 LLM 호출 없이 전체 흐름 검증:
 * 1. streamFollowUp — 메시지 배열 구성 (슬라이딩 윈도우 slice(-4))
 * 2. streamFollowUp — 청크 passthrough + 반환값
 * 3. 청크 콜백 가드 — 빈 배열 + 비assistant 마지막 요소 race condition
 * 4. isFollowUpStreamingRef — 더블클릭 동기 락 시뮬레이션
 * 5. streamWithModelMessages — pre-aborted signal → DOMException throw
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// =====================================================
// llmRecommender mock (streamFollowUp 의존성)
// vi.hoisted 필수: vi.mock은 호이스팅되므로 외부 변수에 접근 불가
// =====================================================

const { streamMessagesMock } = vi.hoisted(() => ({
  streamMessagesMock: vi.fn(),
}))

vi.mock('@/lib/services/llm-recommender', () => ({
  llmRecommender: {
    streamMessages: streamMessagesMock,
  },
}))

vi.mock('@/lib/services/ai/prompts', () => ({
  SYSTEM_PROMPT_INTERPRETER: 'system-prompt-mock',
}))

import { streamFollowUp, type FollowUpMessage } from '@/lib/services/result-interpreter'
import type { AnalysisResult } from '@/types/smart-flow'
import { OpenRouterRecommender } from '@/lib/services/openrouter-recommender'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- private 메서드 테스트
type AnyRecommender = Record<string, any>

// =====================================================
// 헬퍼
// =====================================================

/** AsyncGenerator mock: chunks를 yield하고 model을 return */
async function* makeStreamGen(
  chunks: string[],
  model = 'claude-3-5'
): AsyncGenerator<string, { model: string; provider: string }> {
  for (const chunk of chunks) yield chunk
  return { model, provider: 'openrouter' }
}

function makeResult(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    method: 'independent-t-test',
    statistic: 2.45,
    pValue: 0.014,
    interpretation: '유의한 차이 있음',
    ...overrides,
  }
}

function makeCtx(result?: AnalysisResult) {
  return {
    results: result ?? makeResult(),
    sampleSize: 60,
    variables: ['score', 'group'],
    uploadedFileName: 'data.csv',
  }
}

/** count개의 교대 user/assistant 메시지 생성 */
function makeHistory(count: number): FollowUpMessage[] {
  return Array.from({ length: count }, (_, i) => ({
    role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
    content: `message-${i}`,
  }))
}

/** 간단한 ChatMessage 모양 (콜백 가드 테스트용) */
interface SimpleChatMsg {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/**
 * ResultsActionStep의 setFollowUpMessages 업데이터 로직을 순수 함수로 추출
 * (실제 코드와 동일한 로직)
 */
function applyChunkGuard(prev: SimpleChatMsg[], accumulated: string): SimpleChatMsg[] {
  if (prev.length === 0) return prev
  const last = prev[prev.length - 1]
  if (last.role !== 'assistant') return prev
  return [...prev.slice(0, -1), { ...last, content: accumulated }]
}

// =====================================================
// 1. streamFollowUp: 메시지 배열 구성
// =====================================================

describe('streamFollowUp: 메시지 배열 구성', () => {
  beforeEach(() => vi.clearAllMocks())

  it('system → analysis → initial → history → question 순서', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([]))

    const history: FollowUpMessage[] = [
      { role: 'user', content: '첫 질문' },
      { role: 'assistant', content: '첫 답변' },
    ]
    await streamFollowUp('두 번째 질문', history, makeCtx(), '초기 해석 텍스트', vi.fn())

    const messages: Array<{ role: string; content: string }> = streamMessagesMock.mock.calls[0][0]

    // [0] system prompt
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toBe('system-prompt-mock')

    // [1] buildInterpretationPrompt 결과 (user role)
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('independent-t-test')

    // [2] 초기 해석 (assistant)
    expect(messages[2].role).toBe('assistant')
    expect(messages[2].content).toBe('초기 해석 텍스트')

    // [3], [4] 히스토리
    expect(messages[3].role).toBe('user')
    expect(messages[3].content).toBe('첫 질문')
    expect(messages[4].role).toBe('assistant')
    expect(messages[4].content).toBe('첫 답변')

    // 마지막: 새 질문
    expect(messages[messages.length - 1].role).toBe('user')
    expect(messages[messages.length - 1].content).toBe('두 번째 질문')
  })

  it('히스토리 없으면 system + analysis + initial + question = 4개', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([]))

    await streamFollowUp('질문', [], makeCtx(), '초기', vi.fn())

    const messages: unknown[] = streamMessagesMock.mock.calls[0][0]
    expect(messages).toHaveLength(4)
  })

  it('히스토리 2턴(4개)이면 4개 모두 포함 — 총 8개', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([]))

    const history = makeHistory(4) // u,a,u,a — 정확히 4개
    await streamFollowUp('질문', history, makeCtx(), '초기', vi.fn())

    const messages: unknown[] = streamMessagesMock.mock.calls[0][0]
    // system + analysis + initial + 4 + question = 8
    expect(messages).toHaveLength(8)
  })

  it('히스토리 6개이면 slice(-4)로 마지막 4개만 포함 — 총 8개', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([]))

    const history = makeHistory(6) // message-0 ~ message-5
    await streamFollowUp('질문', history, makeCtx(), '초기', vi.fn())

    const messages: Array<{ role: string; content: string }> = streamMessagesMock.mock.calls[0][0]
    // system + analysis + initial + 4(slice) + question = 8
    expect(messages).toHaveLength(8)

    // 포함된 히스토리는 마지막 4개 (message-2 ~ message-5)
    const historySlice = messages.slice(3, -1)
    expect(historySlice[0].content).toBe('message-2')
    expect(historySlice[1].content).toBe('message-3')
    expect(historySlice[2].content).toBe('message-4')
    expect(historySlice[3].content).toBe('message-5')
  })

  it('히스토리 5개이면 slice(-4)로 마지막 4개 — 총 8개', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([]))

    const history = makeHistory(5) // message-0 ~ message-4
    await streamFollowUp('질문', history, makeCtx(), '초기', vi.fn())

    const messages: Array<{ role: string; content: string }> = streamMessagesMock.mock.calls[0][0]
    expect(messages).toHaveLength(8)

    const historySlice = messages.slice(3, -1)
    expect(historySlice[0].content).toBe('message-1') // slice(-4) from 5 = index 1
    expect(historySlice[3].content).toBe('message-4')
  })

  it('히스토리 1개이면 그대로 포함 — 총 5개', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([]))

    const history: FollowUpMessage[] = [{ role: 'user', content: 'q1' }]
    await streamFollowUp('질문', history, makeCtx(), '초기', vi.fn())

    const messages: unknown[] = streamMessagesMock.mock.calls[0][0]
    expect(messages).toHaveLength(5) // system + analysis + initial + 1 + question
  })

  it('signal이 있으면 streamMessages에 그대로 전달된다', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([]))

    const controller = new AbortController()
    await streamFollowUp('질문', [], makeCtx(), '초기', vi.fn(), controller.signal)

    expect(streamMessagesMock.mock.calls[0][1]).toBe(controller.signal)
  })
})

// =====================================================
// 2. streamFollowUp: 스트리밍 + 반환값
// =====================================================

describe('streamFollowUp: 스트리밍 + 반환값', () => {
  beforeEach(() => vi.clearAllMocks())

  it('청크들이 onChunk 콜백에 순서대로 전달된다', async () => {
    const chunks = ['안녕', '하세요', '!']
    streamMessagesMock.mockReturnValue(makeStreamGen(chunks, 'claude-3-5'))

    const received: string[] = []
    await streamFollowUp('질문', [], makeCtx(), '초기', (c) => received.push(c))

    expect(received).toEqual(['안녕', '하세요', '!'])
  })

  it('반환값에 model 정보가 포함된다', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen(['텍스트'], 'gpt-4o'))

    const result = await streamFollowUp('질문', [], makeCtx(), '초기', vi.fn())

    expect(result).toEqual({ model: 'gpt-4o' })
  })

  it('스트림이 비어도 정상 완료된다', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([], 'claude-3-5'))

    const received: string[] = []
    const result = await streamFollowUp('질문', [], makeCtx(), '초기', (c) => received.push(c))

    expect(received).toHaveLength(0)
    expect(result.model).toBe('claude-3-5')
  })

  it('청크가 많아도 모두 전달된다', async () => {
    const chunks = Array.from({ length: 50 }, (_, i) => `chunk-${i}`)
    streamMessagesMock.mockReturnValue(makeStreamGen(chunks))

    const received: string[] = []
    await streamFollowUp('질문', [], makeCtx(), '초기', (c) => received.push(c))

    expect(received).toHaveLength(50)
    expect(received[0]).toBe('chunk-0')
    expect(received[49]).toBe('chunk-49')
  })

  it('스트림 에러가 호출자에게 전파된다', async () => {
    async function* errorGen(): AsyncGenerator<string, { model: string; provider: string }> {
      yield '일부 텍스트'
      throw new Error('스트림 실패')
    }
    streamMessagesMock.mockReturnValue(errorGen())

    await expect(
      streamFollowUp('질문', [], makeCtx(), '초기', vi.fn())
    ).rejects.toThrow('스트림 실패')
  })

  it('buildInterpretationPrompt가 올바른 분석 컨텍스트를 포함한다', async () => {
    streamMessagesMock.mockReturnValue(makeStreamGen([]))

    await streamFollowUp(
      '질문',
      [],
      makeCtx(makeResult({ pValue: 0.001, method: 'anova' })),
      '초기',
      vi.fn()
    )

    const messages: Array<{ role: string; content: string }> = streamMessagesMock.mock.calls[0][0]
    // [1]은 analysis prompt (buildInterpretationPrompt 결과)
    expect(messages[1].content).toContain('anova')
    expect(messages[1].content).toContain('0.001000')
    expect(messages[1].content).toContain('통계적으로 유의함')
  })
})

// =====================================================
// 3. 청크 콜백 가드: race condition 방지
// =====================================================

describe('청크 콜백 가드: 재해석 중 배열 초기화 race 방지', () => {
  const baseMessages: SimpleChatMsg[] = [
    { id: 'u1', role: 'user', content: '질문' },
    { id: 'a1', role: 'assistant', content: '' }, // placeholder
  ]

  it('정상: assistant placeholder가 accumulated 텍스트로 교체된다', () => {
    const result = applyChunkGuard(baseMessages, '안녕하세요')

    expect(result).toHaveLength(2)
    expect(result[0]).toBe(baseMessages[0]) // user 메시지는 참조 동일
    expect(result[1].content).toBe('안녕하세요')
    expect(result[1].id).toBe('a1') // id 보존
  })

  it('가드 1: prev가 빈 배열이면 원본 참조를 반환한다 (재해석으로 초기화된 경우)', () => {
    const empty: SimpleChatMsg[] = []

    const result = applyChunkGuard(empty, '청크 텍스트')

    expect(result).toBe(empty) // 같은 참조
    expect(result).toHaveLength(0)
  })

  it('가드 2: 마지막 메시지가 user이면 원본 참조를 반환한다', () => {
    const onlyUser: SimpleChatMsg[] = [{ id: 'u1', role: 'user', content: '질문' }]

    const result = applyChunkGuard(onlyUser, '청크 텍스트')

    expect(result).toBe(onlyUser) // 같은 참조
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe('질문') // 변경 없음
  })

  it('가드 1이 가드 2보다 먼저 실행된다 (빈 배열에서 last 접근 없이 반환)', () => {
    // 빈 배열이면 last를 참조하지 않고 즉시 반환해야 함
    // (런타임 에러 없이 통과되면 올바른 순서)
    const empty: SimpleChatMsg[] = []
    expect(() => applyChunkGuard(empty, '텍스트')).not.toThrow()
  })

  it('여러 청크가 누적될 때 최종 accumulated 값이 반영된다', () => {
    let state = baseMessages
    const words = ['안', '녕', '하', '세', '요']
    let accumulated = ''

    for (const word of words) {
      accumulated += word
      state = applyChunkGuard(state, accumulated)
    }

    expect(state[1].content).toBe('안녕하세요')
  })

  it('에러 메시지도 동일한 가드로 안전하게 업데이트된다', () => {
    const result = applyChunkGuard(baseMessages, '오류: API 키를 확인해주세요')

    expect(result[1].content).toBe('오류: API 키를 확인해주세요')
    expect(result).toHaveLength(2)
  })
})

// =====================================================
// 4. isFollowUpStreamingRef: 동기 락 시뮬레이션
// =====================================================

describe('isFollowUpStreamingRef: 동기 락으로 더블클릭 방지', () => {
  it('두 번째 호출은 첫 번째가 완료되기 전에 즉시 반환된다', async () => {
    const ref = { current: false }
    const execution: string[] = []

    async function handleFollowUp(question: string): Promise<void> {
      if (ref.current) return // 동기 가드
      ref.current = true
      execution.push(`start:${question}`)
      await new Promise<void>(resolve => setTimeout(resolve, 10))
      execution.push(`end:${question}`)
      ref.current = false
    }

    // 두 번 동시 호출 — 두 번째는 ref.current === true여서 즉시 반환
    await Promise.all([handleFollowUp('질문1'), handleFollowUp('질문2')])

    expect(execution).toEqual(['start:질문1', 'end:질문1'])
    expect(execution).not.toContain('start:질문2')
  })

  it('첫 번째 완료 후 두 번째 호출은 정상 실행된다', async () => {
    const ref = { current: false }
    const execution: string[] = []

    async function handleFollowUp(question: string): Promise<void> {
      if (ref.current) return
      ref.current = true
      execution.push(`start:${question}`)
      await new Promise<void>(resolve => setTimeout(resolve, 5))
      execution.push(`end:${question}`)
      ref.current = false
    }

    await handleFollowUp('질문1') // 완료까지 대기
    await handleFollowUp('질문2') // 이제 실행 가능

    expect(execution).toEqual(['start:질문1', 'end:질문1', 'start:질문2', 'end:질문2'])
  })

  it('finally에서 ref를 반드시 해제한다 — 에러 발생 시에도', async () => {
    const ref = { current: false }

    async function handleFollowUp(): Promise<void> {
      if (ref.current) return
      ref.current = true
      try {
        await Promise.reject(new Error('스트리밍 실패'))
      } finally {
        ref.current = false // 에러가 발생해도 반드시 해제
      }
    }

    await expect(handleFollowUp()).rejects.toThrow('스트리밍 실패')
    expect(ref.current).toBe(false) // 락 해제 확인
  })

  it('에러 후 다음 호출이 정상 실행된다', async () => {
    const ref = { current: false }
    const execution: string[] = []

    async function handleFollowUp(question: string): Promise<void> {
      if (ref.current) return
      ref.current = true
      try {
        execution.push(`start:${question}`)
        if (question === '질문1') throw new Error('실패')
        execution.push(`end:${question}`)
      } finally {
        ref.current = false
      }
    }

    await expect(handleFollowUp('질문1')).rejects.toThrow('실패')
    expect(ref.current).toBe(false)

    // 에러 후에도 다음 호출 가능
    await handleFollowUp('질문2')
    expect(execution).toContain('end:질문2')
  })

  it('중단(abort) 시에도 ref가 해제된다 (finally 보장)', async () => {
    const ref = { current: false }

    async function handleFollowUp(signal: AbortSignal): Promise<void> {
      if (ref.current) return
      ref.current = true
      try {
        if (signal.aborted) return // abort 처리
        await new Promise<void>(resolve => setTimeout(resolve, 50))
      } finally {
        ref.current = false
      }
    }

    const controller = new AbortController()
    controller.abort() // pre-aborted

    await handleFollowUp(controller.signal)
    expect(ref.current).toBe(false)
  })
})

// =====================================================
// 5. streamWithModelMessages: pre-abort → DOMException
// =====================================================

describe('streamWithModelMessages: pre-aborted signal', () => {
  it('이미 취소된 signal로 호출하면 DOMException을 던진다', async () => {
    // private 메서드 접근 (TypeScript private = compile-time only)
    const recommender = new OpenRouterRecommender() as unknown as AnyRecommender

    const controller = new AbortController()
    controller.abort() // pre-aborted

    const onChunk = vi.fn()

    await expect(
      recommender.streamWithModelMessages(
        'test-model',
        [{ role: 'user', content: 'test' }],
        onChunk,
        controller.signal,
        0.5,
        1000
      )
    ).rejects.toSatisfy((e: unknown) =>
      e instanceof DOMException && e.name === 'AbortError'
    )

    // fetch는 호출되지 않아야 함 (pre-abort에서 즉시 throw)
    expect(onChunk).not.toHaveBeenCalled()
  })

  it('정상 signal로 호출하면 DOMException을 던지지 않는다 (fetch 실패는 다른 에러)', async () => {
    const recommender = new OpenRouterRecommender() as unknown as AnyRecommender

    const controller = new AbortController()
    // signal.aborted === false

    // fetch mock: 401 에러 시뮬레이션
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response('Unauthorized', { status: 401 })
    )

    const error = await recommender
      .streamWithModelMessages(
        'test-model',
        [{ role: 'user', content: 'test' }],
        vi.fn(),
        controller.signal,
        0.5,
        1000
      )
      .catch((e: unknown) => e)

    // DOMException이 아닌 다른 에러 (API 401)
    expect(error).not.toBeInstanceOf(DOMException)
    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toContain('401')

    fetchMock.mockRestore()
  })

  it('streamChatWithMessages에서 pre-abort 에러가 전파된다', async () => {
    const recommender = new OpenRouterRecommender() as unknown as AnyRecommender

    // models 배열이 비어있으면 루프가 돌지 않으므로 직접 설정
    recommender.config = {
      ...recommender.config,
      models: ['test-model'],
    }

    const controller = new AbortController()
    controller.abort()

    await expect(
      recommender.streamChatWithMessages(
        [{ role: 'user', content: 'test' }],
        vi.fn(),
        controller.signal
      )
    ).rejects.toSatisfy((e: unknown) =>
      e instanceof DOMException && e.name === 'AbortError'
    )
  })
})
