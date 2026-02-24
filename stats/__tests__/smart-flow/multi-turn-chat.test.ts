/**
 * Multi-turn 채팅 히스토리 시뮬레이션 테스트
 *
 * 실제 LLM 호출 없이 전체 흐름을 검증:
 * 1. FlowStateMachine — chatMessages CRUD + RESET_NAVIGATION 보존
 * 2. isError 필터 — 에러 버블이 LLM 컨텍스트에서 제외
 * 3. historyMessages slice(-4) — 최근 2턴만 전달
 * 4. handleAiSubmit 순서 시뮬레이션 — prevChatMessages 캡처 타이밍
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { flowReducer, initialFlowState } from '@/components/smart-flow/steps/purpose/FlowStateMachine'
import type { FlowChatMessage } from '@/types/smart-flow'

// ============================================================
// 헬퍼
// ============================================================

function makeMsg(overrides: Partial<FlowChatMessage> & { id: string }): FlowChatMessage {
  return {
    role: 'user',
    content: '테스트 메시지',
    ...overrides,
  }
}

const USER_MSG = makeMsg({ id: 'u1', role: 'user', content: '두 그룹 비교하고 싶어요' })
const ASSISTANT_MSG = makeMsg({ id: 'a1', role: 'assistant', content: '독립표본 t-검정을 추천합니다.', provider: 'openrouter' })
const ERROR_MSG = makeMsg({ id: 'e1', role: 'assistant', content: 'AI 서비스 오류', isError: true })

// ============================================================
// Group 1: FlowStateMachine — chatMessages 상태 관리
// ============================================================

describe('FlowStateMachine — chatMessages', () => {
  describe('ADD_CHAT_MESSAGE', () => {
    it('빈 배열에 첫 메시지가 추가된다', () => {
      const before = initialFlowState
      expect(before.chatMessages).toHaveLength(0)

      const after = flowReducer(before, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG })

      expect(after.chatMessages).toHaveLength(1)
      expect(after.chatMessages[0]).toEqual(USER_MSG)
    })

    it('기존 메시지를 보존한 채 새 메시지를 추가한다', () => {
      const withOne = flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG })
      const withTwo = flowReducer(withOne, { type: 'ADD_CHAT_MESSAGE', message: ASSISTANT_MSG })

      expect(withTwo.chatMessages).toHaveLength(2)
      expect(withTwo.chatMessages[0].id).toBe('u1')
      expect(withTwo.chatMessages[1].id).toBe('a1')
    })

    it('isError: true 메시지도 chatMessages에 저장된다 (UI용)', () => {
      const after = flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: ERROR_MSG })

      expect(after.chatMessages).toHaveLength(1)
      expect(after.chatMessages[0].isError).toBe(true)
    })
  })

  describe('CLEAR_CHAT_HISTORY', () => {
    it('모든 메시지를 비운다', () => {
      const withMsgs = flowReducer(
        flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG }),
        { type: 'ADD_CHAT_MESSAGE', message: ASSISTANT_MSG }
      )
      expect(withMsgs.chatMessages).toHaveLength(2)

      const cleared = flowReducer(withMsgs, { type: 'CLEAR_CHAT_HISTORY' })

      expect(cleared.chatMessages).toHaveLength(0)
    })
  })

  describe('RESET', () => {
    it('chatMessages를 포함한 전체 상태를 초기화한다', () => {
      // 메시지 + aiRecommendation + aiError 모두 세팅
      const withMsg = flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG })
      const withRec = flowReducer(withMsg, {
        type: 'SET_AI_RECOMMENDATION',
        recommendation: {
          method: { id: 't-test', name: 't-검정', description: '', category: 't-test' as const },
          confidence: 0.9, reasoning: [], assumptions: [],
        },
      })
      const withError = flowReducer(withRec, { type: 'AI_CHAT_ERROR', error: '일시적 오류' })

      expect(withError.chatMessages).toHaveLength(1)
      expect(withError.aiRecommendation).not.toBeNull()
      expect(withError.aiError).toBe('일시적 오류')

      const reset = flowReducer(withError, { type: 'RESET' })

      expect(reset.chatMessages).toHaveLength(0)
      expect(reset.step).toBe('ai-chat')
      expect(reset.aiRecommendation).toBeNull()
      expect(reset.aiError).toBeNull()
    })
  })

  describe('RESET_NAVIGATION', () => {
    it('chatMessages를 보존하고 네비게이션 상태만 초기화한다', () => {
      // 메시지 2개 + 네비게이션 상태 변경
      const withState = flowReducer(
        flowReducer(
          flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG }),
          { type: 'ADD_CHAT_MESSAGE', message: ASSISTANT_MSG }
        ),
        { type: 'GO_TO_GUIDED' }  // step: 'category'로 이동
      )
      expect(withState.step).toBe('category')
      expect(withState.chatMessages).toHaveLength(2)

      const reset = flowReducer(withState, { type: 'RESET_NAVIGATION' })

      // 보존: chatMessages
      expect(reset.chatMessages).toHaveLength(2)
      expect(reset.chatMessages[0].id).toBe('u1')
      expect(reset.chatMessages[1].id).toBe('a1')

      // 초기화: 네비게이션
      expect(reset.step).toBe('ai-chat')
      expect(reset.selectedCategory).toBeNull()
      expect(reset.aiRecommendation).toBeNull()
      expect(reset.isAiLoading).toBe(false)
    })

    it('chatMessages가 없어도 안전하게 동작한다', () => {
      const result = flowReducer(initialFlowState, { type: 'RESET_NAVIGATION' })

      expect(result.chatMessages).toHaveLength(0)
      expect(result.step).toBe('ai-chat')
    })
  })

  describe('GO_BACK', () => {
    it('뒤로 가도 chatMessages가 보존된다 (preserveAiState)', () => {
      const withMsg = flowReducer(
        flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG }),
        { type: 'GO_TO_GUIDED' }  // step: 'category'로 이동 (히스토리에 'ai-chat' 쌓임)
      )
      expect(withMsg.chatMessages).toHaveLength(1)
      expect(withMsg.step).toBe('category')

      const goBack = flowReducer(withMsg, { type: 'GO_BACK' })

      expect(goBack.step).toBe('ai-chat')
      expect(goBack.chatMessages).toHaveLength(1)
      expect(goBack.chatMessages[0].id).toBe('u1')
    })
  })

  describe('START_AI_CHAT', () => {
    it('chatMessages를 건드리지 않고 로딩 상태만 변경한다', () => {
      const withMsg = flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG })
      expect(withMsg.chatMessages).toHaveLength(1)

      const loading = flowReducer(withMsg, { type: 'START_AI_CHAT' })

      expect(loading.isAiLoading).toBe(true)
      expect(loading.chatMessages).toHaveLength(1)  // 변화 없음
    })
  })
})

// ============================================================
// Group 2: isError 필터 — LLM 컨텍스트에서 에러 버블 제외
// ============================================================

describe('isError 필터링 — openrouter-recommender', () => {
  let recommender: import('@/lib/services/openrouter-recommender').OpenRouterRecommender

  beforeEach(async () => {
    vi.stubEnv('NEXT_PUBLIC_OPENROUTER_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_OPENROUTER_MODEL', 'openai/gpt-4o-mini')
    vi.resetModules()
    const mod = await import('@/lib/services/openrouter-recommender')
    recommender = new mod.OpenRouterRecommender()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  it('isError: true 메시지가 LLM 요청에서 제외된다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test',
        model: 'openai/gpt-4o-mini',
        choices: [{
          message: {
            role: 'assistant',
            content: '```json\n{"methodId":"t-test","methodName":"독립표본 t-검정","confidence":0.9,"reasoning":["두 그룹 비교"],"alternatives":[]}\n```'
          }
        }]
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const chatHistory: FlowChatMessage[] = [
      { id: 'u1', role: 'user', content: '두 그룹 비교' },
      { id: 'a1', role: 'assistant', content: '독립표본 t-검정 추천', provider: 'openrouter' },
      { id: 'e1', role: 'assistant', content: 'AI 서비스 오류', isError: true },  // ← 제외 대상
    ]

    await recommender.recommendWithSystemPrompt(
      '정규성이 만족 안 되면요?',
      'system prompt',
      null, null, null,
      { chatHistory }
    )

    expect(mockFetch).toHaveBeenCalledOnce()
    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const messages = body.messages as Array<{ role: string; content: string }>

    // 에러 메시지 제외 확인
    const errorMsgInBody = messages.find(m => m.content === 'AI 서비스 오류')
    expect(errorMsgInBody).toBeUndefined()

    // 정상 메시지는 포함 확인
    const userHistoryInBody = messages.find(m => m.content === '두 그룹 비교')
    expect(userHistoryInBody).toBeDefined()
    expect(userHistoryInBody?.role).toBe('user')

    // 현재 질문(마지막 user)은 포함 — buildUserPrompt가 템플릿으로 감싸므로 includes()
    const currentQuestion = messages.find(m => m.role === 'user' && m.content.includes('정규성이 만족 안 되면요?'))
    expect(currentQuestion).toBeDefined()
    expect(currentQuestion?.role).toBe('user')
  })

  it('정상 메시지 5개 중 최근 4개만 히스토리로 전달된다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test',
        model: 'openai/gpt-4o-mini',
        choices: [{
          message: { role: 'assistant', content: '```json\n{"methodId":"t-test","methodName":"t-검정","confidence":0.8,"reasoning":["test"],"alternatives":[]}\n```' }
        }]
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    const chatHistory: FlowChatMessage[] = [
      { id: 'u1', role: 'user', content: '첫번째 질문' },        // ← slice(-4) 제외
      { id: 'a1', role: 'assistant', content: '첫번째 응답' },   // ← slice(-4) 포함 (4개 중 첫 번째)
      { id: 'u2', role: 'user', content: '두번째 질문' },
      { id: 'a2', role: 'assistant', content: '두번째 응답' },
      { id: 'u3', role: 'user', content: '세번째 질문' },
    ]

    await recommender.recommendWithSystemPrompt(
      '네번째 질문', 'system', null, null, null, { chatHistory }
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const messages = body.messages as Array<{ role: string; content: string }>

    // 첫번째 질문은 잘려야 함 (slice(-4) → 최근 4개만)
    expect(messages.find(m => m.content === '첫번째 질문')).toBeUndefined()

    // 나머지 히스토리는 포함
    expect(messages.find(m => m.content === '첫번째 응답')).toBeDefined()
    expect(messages.find(m => m.content === '두번째 질문')).toBeDefined()
    expect(messages.find(m => m.content === '두번째 응답')).toBeDefined()
    expect(messages.find(m => m.content === '세번째 질문')).toBeDefined()

    // 순서: [system, ...history(4), currentUser]
    // currentUser는 buildUserPrompt 템플릿으로 감싸임 → includes()
    expect(messages[0].role).toBe('system')
    expect(messages[messages.length - 1].content).toContain('네번째 질문')
  })

  it('chatHistory가 없으면 [system, user] 2개만 전달된다', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test',
        model: 'openai/gpt-4o-mini',
        choices: [{
          message: { role: 'assistant', content: '```json\n{"methodId":"t-test","methodName":"t-검정","confidence":0.8,"reasoning":["test"],"alternatives":[]}\n```' }
        }]
      })
    })
    vi.stubGlobal('fetch', mockFetch)

    await recommender.recommendWithSystemPrompt(
      '질문', 'system', null, null, null
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    const messages = body.messages as Array<{ role: string; content: string }>

    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
    // buildUserPrompt가 감싸므로 includes()
    expect(messages[1].content).toContain('질문')
  })
})

// ============================================================
// Group 3: handleAiSubmit 디스패치 시퀀스 — flowReducer 기반
// ============================================================

describe('handleAiSubmit 디스패치 시퀀스 — flowReducer', () => {
  /**
   * React 컴포넌트 없이 flowReducer로 실제 상태 변화를 검증:
   * - ADD_CHAT_MESSAGE(user) → START_AI_CHAT → ADD_CHAT_MESSAGE(assistant) 순서
   * - prevChatMessages 캡처 타이밍 (dispatch 전)
   * - 에러 버블 isError: true 보존
   * - RESET_NAVIGATION이 에러 버블을 UI 표시용으로 보존
   */

  it('1턴 정상 시퀀스: 사용자 메시지 → 로딩 → 어시스턴트 메시지', () => {
    // handleAiSubmit dispatch 순서 재현
    // 1) ADD_CHAT_MESSAGE(user)
    const s1 = flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG })
    expect(s1.chatMessages).toHaveLength(1)
    expect(s1.chatMessages[0].role).toBe('user')
    expect(s1.isAiLoading).toBe(false)  // 아직 로딩 전

    // 2) START_AI_CHAT
    const s2 = flowReducer(s1, { type: 'START_AI_CHAT' })
    expect(s2.isAiLoading).toBe(true)
    expect(s2.chatMessages).toHaveLength(1)  // 메시지는 그대로

    // 3) ADD_CHAT_MESSAGE(assistant)
    const s3 = flowReducer(s2, { type: 'ADD_CHAT_MESSAGE', message: ASSISTANT_MSG })
    expect(s3.chatMessages).toHaveLength(2)
    expect(s3.chatMessages[0].id).toBe('u1')
    expect(s3.chatMessages[1].id).toBe('a1')
    expect(s3.chatMessages[1].provider).toBe('openrouter')
    expect(s3.isAiLoading).toBe(true)  // ADD_CHAT_MESSAGE는 isAiLoading을 변경하지 않음
  })

  it('2턴 시퀀스: prevChatMessages 캡처 타이밍 — dispatch 전 상태를 가리킨다', () => {
    // 1턴 완료 상태 (u1, a1)
    const afterTurn1 = flowReducer(
      flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG }),
      { type: 'ADD_CHAT_MESSAGE', message: ASSISTANT_MSG }
    )
    expect(afterTurn1.chatMessages).toHaveLength(2)

    // 2턴 시작 — prevChatMessages를 dispatch 전에 캡처 (불변 참조)
    const prevChatMessages = afterTurn1.chatMessages  // [u1, a1]

    const u2: FlowChatMessage = { id: 'u2', role: 'user', content: '후속 질문' }
    const afterAdd = flowReducer(afterTurn1, { type: 'ADD_CHAT_MESSAGE', message: u2 })

    // prevChatMessages는 이전 상태를 가리킴 (현재 질문 u2 미포함)
    expect(prevChatMessages).toHaveLength(2)
    expect(prevChatMessages.find(m => m.content === '후속 질문')).toBeUndefined()

    // dispatch 후 state는 3개
    expect(afterAdd.chatMessages).toHaveLength(3)
    expect(afterAdd.chatMessages[2].content).toBe('후속 질문')
  })

  it('에러 시퀀스: 에러 버블이 chatMessages에 저장되고 isError: true를 유지한다', () => {
    // ADD(user) → START_AI_CHAT → ADD(error bubble)
    const s1 = flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG })
    const s2 = flowReducer(s1, { type: 'START_AI_CHAT' })
    const s3 = flowReducer(s2, { type: 'ADD_CHAT_MESSAGE', message: ERROR_MSG })

    expect(s3.chatMessages).toHaveLength(2)
    expect(s3.chatMessages[0].role).toBe('user')
    expect(s3.chatMessages[1].isError).toBe(true)
    expect(s3.chatMessages[1].role).toBe('assistant')
    // 에러 버블에는 provider, recommendation이 없음
    expect(s3.chatMessages[1].provider).toBeUndefined()
    expect(s3.chatMessages[1].recommendation).toBeUndefined()
  })

  it('RESET_NAVIGATION: 에러 버블 포함한 chatMessages를 UI 표시용으로 보존한다', () => {
    // 에러 발생 상태 (u1 + error bubble)
    const withError = flowReducer(
      flowReducer(initialFlowState, { type: 'ADD_CHAT_MESSAGE', message: USER_MSG }),
      { type: 'ADD_CHAT_MESSAGE', message: ERROR_MSG }
    )
    expect(withError.chatMessages).toHaveLength(2)
    expect(withError.chatMessages[1].isError).toBe(true)

    // 모드 전환 (AI → Browse → AI) 시뮬레이션
    const afterReset = flowReducer(withError, { type: 'RESET_NAVIGATION' })

    // 에러 버블을 포함한 채팅 기록은 UI 표시용으로 보존
    expect(afterReset.chatMessages).toHaveLength(2)
    expect(afterReset.chatMessages[0].id).toBe('u1')
    expect(afterReset.chatMessages[1].isError).toBe(true)

    // 네비게이션은 초기화
    expect(afterReset.step).toBe('ai-chat')
    expect(afterReset.aiRecommendation).toBeNull()
  })
})
