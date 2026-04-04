/**
 * hub-chat-service 단위 테스트
 *
 * 검증 항목:
 * 1. 현재 메시지 중복 전달 버그 재현 — chatHistory에 현재 메시지가 포함되면 중복됨
 * 2. 수정 후 동작 — priorMessages(addMessage 전 스냅샷)를 chatHistory로 전달 → 중복 없음
 * 3. 히스토리 슬라이싱 — 5턴이 있을 때 slice(-4)로 최근 4턴만 LLM에 전달됨
 * 4. 첫 메시지 — chatHistory 빈 배열로 전달됨
 * 5. 에러 메시지 필터링 — isError: true 메시지는 flowHistory에서 제외됨
 * 6. system 메시지 필터링 — role: 'system' 메시지는 flowHistory에서 제외됨
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { HubChatMessage } from '@/lib/stores/hub-chat-store'
import type { FlowChatMessage, ResolvedIntent } from '@/types/analysis'

const BASE_INTENT: Omit<ResolvedIntent, 'track'> = {
  confidence: 0.9, method: null, reasoning: '', needsData: false, provider: 'keyword',
}
const CONSULTATION_INTENT: ResolvedIntent = { ...BASE_INTENT, track: 'data-consultation' }
const ANALYSIS_INTENT: ResolvedIntent = { ...BASE_INTENT, track: 'direct-analysis' }

// ===== Helpers =====

let msgCounter = 0

function makeHubMsg(overrides: Partial<HubChatMessage> = {}): HubChatMessage {
  msgCounter++
  return {
    id: `msg_${msgCounter}`,
    role: 'user',
    content: `테스트 메시지 ${msgCounter}`,
    timestamp: Date.now() + msgCounter,
    ...overrides,
  }
}

function makeHistory(count: number, startRole: 'user' | 'assistant' = 'user'): HubChatMessage[] {
  return Array.from({ length: count }, (_, i) => {
    const role: 'user' | 'assistant' = i % 2 === 0 ? startRole : (startRole === 'user' ? 'assistant' : 'user')
    return makeHubMsg({ role, content: `히스토리 메시지 ${i + 1}` })
  })
}

// ===== Mocks =====

// openRouterRecommender를 vi.mock으로 모킹
vi.mock('@/lib/services/recommenders/openrouter-recommender', () => ({
  openRouterRecommender: {
    recommendWithSystemPrompt: vi.fn(),
  },
}))

// 프롬프트 빌더 모킹 (외부 의존성 차단)
vi.mock('@/lib/services/ai/prompts', () => ({
  getSystemPromptConsultant: vi.fn(() => 'consultant-system-prompt'),
  getSystemPromptDiagnostic: vi.fn(() => 'diagnostic-system-prompt'),
}))

// ===== Tests =====

describe('hub-chat-service — getHubAiResponse', () => {
  let openRouterRecommender: { recommendWithSystemPrompt: ReturnType<typeof vi.fn> }
  let getHubAiResponse: typeof import('@/lib/services/hub-chat-service').getHubAiResponse

  beforeEach(async () => {
    msgCounter = 0
    vi.clearAllMocks()

    // 동적 import로 mock이 적용된 모듈을 가져옴
    const recommenderMod = await import('@/lib/services/recommenders/openrouter-recommender')
    openRouterRecommender = recommenderMod.openRouterRecommender as unknown as {
      recommendWithSystemPrompt: ReturnType<typeof vi.fn>
    }

    const serviceMod = await import('@/lib/services/hub-chat-service')
    getHubAiResponse = serviceMod.getHubAiResponse

    // 기본 mock 응답
    openRouterRecommender.recommendWithSystemPrompt.mockResolvedValue({
      recommendation: null,
      responseText: 'AI 응답 텍스트',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===== 시나리오 1: 첫 메시지 (히스토리 없음) =====

  describe('시나리오 1: 첫 메시지 — chatHistory 빈 배열', () => {
    it('chatHistory가 빈 배열이면 flowHistory도 빈 배열로 LLM에 전달된다', async () => {
      await getHubAiResponse({
        userMessage: '안녕하세요, t-검정이 뭔가요?',
        intent: CONSULTATION_INTENT,
        dataContext: null,
        chatHistory: [],   // 이전 대화 없음
      })

      expect(openRouterRecommender.recommendWithSystemPrompt).toHaveBeenCalledOnce()

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }

      // 빈 배열이어야 함
      expect(options.chatHistory).toEqual([])
      expect(options.chatHistory).toHaveLength(0)
    })
  })

  // ===== 시나리오 2: 수정 전 버그 재현 =====

  describe('시나리오 2: 수정 전 버그 재현 — 현재 메시지가 chatHistory에 포함되면 중복됨', () => {
    it('현재 메시지가 chatHistory에 포함된 채로 전달되면 LLM이 동일 내용을 두 번 받는다', async () => {
      const currentMessage = '두 그룹의 평균을 비교하고 싶어요'

      // 버그 시나리오: addMessage 후에 store.messages 전체를 chatHistory로 전달
      // → 현재 메시지가 chatHistory[last] + userMessage로 두 번 전달됨
      const historyIncludingCurrent: HubChatMessage[] = [
        makeHubMsg({ role: 'user', content: '이전 질문입니다' }),
        makeHubMsg({ role: 'assistant', content: '이전 답변입니다' }),
        makeHubMsg({ role: 'user', content: currentMessage }),  // 현재 메시지가 히스토리에 포함!
      ]

      await getHubAiResponse({
        userMessage: currentMessage,
        intent: ANALYSIS_INTENT,
        dataContext: null,
        chatHistory: historyIncludingCurrent,  // 현재 메시지 포함 (버그 상태)
      })

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const receivedUserMessage = callArgs[0] as string   // 1번째 인자: userMessage
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }
      const flowHistory = options.chatHistory

      // 버그: LLM이 동일 내용을 두 번 받음
      // userMessage에 한 번, flowHistory 마지막에 한 번
      const lastHistoryContent = flowHistory[flowHistory.length - 1]?.content
      const isDuplicated = lastHistoryContent === receivedUserMessage

      expect(isDuplicated).toBe(true)   // 중복 발생 확인 (버그 재현)
      expect(receivedUserMessage).toBe(currentMessage)
      expect(lastHistoryContent).toBe(currentMessage)
    })
  })

  // ===== 시나리오 3: 수정 후 동작 검증 =====

  describe('시나리오 3: 수정 후 — priorMessages로 현재 메시지 제외', () => {
    it('이전 대화 3턴 + 현재 메시지가 있을 때, chatHistory는 3턴만 포함하고 현재 메시지는 제외된다', async () => {
      const currentMessage = '공분산분석(ANCOVA)도 고려해야 하나요?'

      // 수정 후: addMessage 전에 스냅샷 → 현재 메시지 미포함
      const priorMessages: HubChatMessage[] = [
        makeHubMsg({ role: 'user', content: '두 그룹 비교하려고 해요' }),
        makeHubMsg({ role: 'assistant', content: '독립표본 t-검정을 추천드립니다' }),
        makeHubMsg({ role: 'user', content: '공변량이 있으면 어떻게 하나요?' }),
        // currentMessage는 아직 addMessage 전이므로 priorMessages에 없음
      ]

      await getHubAiResponse({
        userMessage: currentMessage,
        intent: ANALYSIS_INTENT,
        dataContext: null,
        chatHistory: priorMessages,  // 현재 메시지 제외 (수정 후 올바른 동작)
      })

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const receivedUserMessage = callArgs[0] as string
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }
      const flowHistory = options.chatHistory

      // 현재 메시지는 userMessage로만 전달됨
      expect(receivedUserMessage).toBe(currentMessage)

      // flowHistory에 현재 메시지 내용이 없어야 함
      const containsCurrent = flowHistory.some((m) => m.content === currentMessage)
      expect(containsCurrent).toBe(false)

      // 이전 3턴이 모두 포함됨 (3 <= 4이므로 slice(-4) 효과 없음)
      expect(flowHistory).toHaveLength(3)
      expect(flowHistory[0].content).toBe('두 그룹 비교하려고 해요')
      expect(flowHistory[1].content).toBe('독립표본 t-검정을 추천드립니다')
      expect(flowHistory[2].content).toBe('공변량이 있으면 어떻게 하나요?')
    })

    it('chatHistory에 현재 메시지와 동일한 내용이 없다 — 중복 없음 확인', async () => {
      const currentMessage = '다중회귀분석에서 다중공선성을 어떻게 확인하나요?'
      const priorMessages: HubChatMessage[] = [
        makeHubMsg({ role: 'user', content: '회귀분석을 하고 싶어요' }),
        makeHubMsg({ role: 'assistant', content: '단순 선형 회귀분석을 추천드립니다' }),
      ]

      await getHubAiResponse({
        userMessage: currentMessage,
        intent: ANALYSIS_INTENT,
        dataContext: null,
        chatHistory: priorMessages,
      })

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }
      const flowHistory = options.chatHistory

      // flowHistory의 모든 메시지가 현재 메시지와 다름
      flowHistory.forEach((msg) => {
        expect(msg.content).not.toBe(currentMessage)
      })

      // userMessage와 flowHistory를 합쳐도 currentMessage가 1번만 등장
      const allContents = [
        ...flowHistory.map((m) => m.content),
        currentMessage,  // userMessage
      ]
      const occurrences = allContents.filter((c) => c === currentMessage).length
      expect(occurrences).toBe(1)  // 정확히 1번만
    })
  })

  // ===== 시나리오 4: 히스토리 슬라이싱 =====

  describe('시나리오 4: 히스토리 슬라이싱 — compressChatHistory로 최근 4개 원본 + 이전 축약', () => {
    it('이전 5턴 + 현재 메시지일 때, flowHistory는 축약 1개 + 최근 4개 = 5개를 포함한다', async () => {
      const currentMessage = '결과를 어떻게 해석하나요?'

      // 5개의 이전 메시지 (현재 메시지 제외)
      // compressChatHistory: index 0은 축약 요약으로 변환, index 1~4는 원본 유지
      const priorMessages: HubChatMessage[] = [
        makeHubMsg({ role: 'user', content: '가장 오래된 질문' }),          // index 0 → 축약 요약
        makeHubMsg({ role: 'assistant', content: '오래된 답변' }),           // index 1 → 포함
        makeHubMsg({ role: 'user', content: '중간 질문' }),                 // index 2 → 포함
        makeHubMsg({ role: 'assistant', content: '중간 답변' }),             // index 3 → 포함
        makeHubMsg({ role: 'user', content: '최근 질문' }),                 // index 4 → 포함
        // currentMessage는 addMessage 전이므로 priorMessages에 없음 (수정 후 동작)
      ]

      await getHubAiResponse({
        userMessage: currentMessage,
        intent: ANALYSIS_INTENT,
        dataContext: null,
        chatHistory: priorMessages,
      })

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }
      const flowHistory = options.chatHistory

      // compressChatHistory → 축약 요약 1개 + 최근 4개 = 5개
      expect(flowHistory).toHaveLength(5)

      // 가장 오래된 메시지(index 0)는 원본이 아닌 축약 요약에 포함
      const containsOldestOriginal = flowHistory.some((m) => m.content === '가장 오래된 질문')
      expect(containsOldestOriginal).toBe(false)  // 원본은 없음

      // 첫 번째는 축약 요약 메시지
      expect(flowHistory[0].content).toContain('[이전 대화 맥락')

      // 나머지 4개는 순서대로 포함
      expect(flowHistory[1].content).toBe('오래된 답변')
      expect(flowHistory[2].content).toBe('중간 질문')
      expect(flowHistory[3].content).toBe('중간 답변')
      expect(flowHistory[4].content).toBe('최근 질문')
    })

    it('이전 4턴 정확히 = slice(-4) 경계 — 모두 포함됨', async () => {
      const currentMessage = '이 분석이 맞나요?'
      const priorMessages: HubChatMessage[] = makeHistory(4)  // 정확히 4개

      await getHubAiResponse({
        userMessage: currentMessage,
        intent: ANALYSIS_INTENT,
        dataContext: null,
        chatHistory: priorMessages,
      })

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }
      const flowHistory = options.chatHistory

      // 4개 = slice(-4) → 모두 포함
      expect(flowHistory).toHaveLength(4)
    })

    it('이전 10턴이 있어도 flowHistory는 축약 1개 + 최근 4개 = 최대 5개로 제한된다', async () => {
      const priorMessages: HubChatMessage[] = makeHistory(10)

      await getHubAiResponse({
        userMessage: '현재 질문',
        intent: CONSULTATION_INTENT,
        dataContext: null,
        chatHistory: priorMessages,
      })

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }
      const flowHistory = options.chatHistory

      expect(flowHistory).toHaveLength(5)  // 축약 1개 + 최근 4개
      expect(flowHistory.length).toBeLessThanOrEqual(5)
    })
  })

  // ===== 시나리오 5: 에러 메시지 필터링 =====

  describe('시나리오 5: isError 메시지 필터링', () => {
    it('isError: true 메시지는 flowHistory에서 제외된다', async () => {
      const priorMessages: HubChatMessage[] = [
        makeHubMsg({ role: 'user', content: '정상 질문' }),
        makeHubMsg({ role: 'assistant', content: '에러 발생', isError: true }),  // 제외 대상
        makeHubMsg({ role: 'assistant', content: '정상 답변' }),
      ]

      await getHubAiResponse({
        userMessage: '새 질문',
        intent: CONSULTATION_INTENT,
        dataContext: null,
        chatHistory: priorMessages,
      })

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }
      const flowHistory = options.chatHistory

      // 에러 메시지 제외 → 2개만 남아야 함
      expect(flowHistory).toHaveLength(2)

      const containsError = flowHistory.some((m) => m.content === '에러 발생')
      expect(containsError).toBe(false)  // 에러 메시지 없음

      expect(flowHistory[0].content).toBe('정상 질문')
      expect(flowHistory[1].content).toBe('정상 답변')
    })
  })

  // ===== 시나리오 6: system 메시지 필터링 =====

  describe('시나리오 6: system 메시지 필터링', () => {
    it('role: system 메시지는 flowHistory에서 제외된다', async () => {
      const priorMessages: HubChatMessage[] = [
        { id: 'sys_1', role: 'system', content: '시스템 프롬프트', timestamp: Date.now() },
        makeHubMsg({ role: 'user', content: '사용자 질문' }),
        makeHubMsg({ role: 'assistant', content: 'AI 답변' }),
      ]

      await getHubAiResponse({
        userMessage: '새 질문',
        intent: CONSULTATION_INTENT,
        dataContext: null,
        chatHistory: priorMessages,
      })

      const callArgs = openRouterRecommender.recommendWithSystemPrompt.mock.calls[0]
      const options = callArgs[5] as { chatHistory: FlowChatMessage[] }
      const flowHistory = options.chatHistory

      // system 메시지 제외 → 2개만 남아야 함
      expect(flowHistory).toHaveLength(2)

      const containsSystem = flowHistory.some((m) => m.content === '시스템 프롬프트')
      expect(containsSystem).toBe(false)  // system 메시지 없음
    })
  })

  // ===== 시나리오 7: 응답 값 검증 =====

  describe('시나리오 7: 응답 값 정상 반환', () => {
    it('LLM 응답 텍스트가 content로 반환된다', async () => {
      openRouterRecommender.recommendWithSystemPrompt.mockResolvedValue({
        recommendation: null,
        responseText: '독립표본 t-검정을 추천드립니다.',
      })

      const result = await getHubAiResponse({
        userMessage: '두 그룹을 비교하고 싶어요',
        intent: ANALYSIS_INTENT,
        dataContext: null,
        chatHistory: [],
      })

      expect(result.content).toBe('독립표본 t-검정을 추천드립니다.')
      expect(result.recommendation).toBeNull()
    })

    it('LLM 호출 실패 시 에러 메시지를 반환하고 예외를 던지지 않는다', async () => {
      openRouterRecommender.recommendWithSystemPrompt.mockRejectedValue(
        new Error('Network error')
      )

      const result = await getHubAiResponse({
        userMessage: '질문',
        intent: CONSULTATION_INTENT,
        dataContext: null,
        chatHistory: [],
      })

      // 예외가 아닌 에러 메시지 반환
      expect(result.content).toContain('오류')
      expect(result.recommendation).toBeNull()
    })
  })
})
