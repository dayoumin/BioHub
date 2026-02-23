import { beforeEach, describe, expect, it, vi } from 'vitest'

const { openRouterRecommenderMock, ollamaRecommenderMock, getSettingsStateMock } = vi.hoisted(() => ({
  openRouterRecommenderMock: {
    checkHealth: vi.fn(),
    recommendWithSystemPrompt: vi.fn(),
    generateRawText: vi.fn(),
    streamChatCompletion: vi.fn(),
  },
  ollamaRecommenderMock: {
    checkHealth: vi.fn(),
    recommendWithSystemPrompt: vi.fn(),
    generateRawText: vi.fn(),
    streamChatCompletion: vi.fn(),
    keywordBasedRecommend: vi.fn(),
  },
  getSettingsStateMock: vi.fn(),
}))

vi.mock('@/lib/services/openrouter-recommender', () => ({
  openRouterRecommender: openRouterRecommenderMock,
}))

vi.mock('@/lib/services/ollama-recommender', () => ({
  ollamaRecommender: ollamaRecommenderMock,
}))

vi.mock('@/lib/stores/settings-store', () => ({
  useSettingsStore: {
    getState: getSettingsStateMock,
  },
}))

vi.mock('@/lib/services/ai/prompts', () => ({
  getSystemPromptConsultant: () => 'consultant prompt',
  getSystemPromptDiagnostic: () => 'diagnostic prompt',
  getSystemPromptIntentRouter: () => 'intent router prompt',
}))

import { llmRecommender } from '@/lib/services/llm-recommender'

function makeRecommendation(id = 't-test') {
  return {
    method: {
      id,
      name: id,
      description: `${id} description`,
      category: 't-test',
    },
    confidence: 0.8,
    reasoning: ['reason'],
    assumptions: [],
    alternatives: [],
  }
}

async function consumeStream(generator: AsyncGenerator<string, { model: string; provider: string }>) {
  const chunks: string[] = []
  while (true) {
    const { value, done } = await generator.next()
    if (done) {
      return { chunks, result: value }
    }
    chunks.push(value)
  }
}

describe('llmRecommender', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSettingsStateMock.mockReturnValue({ useOllamaForRecommendation: false })

    openRouterRecommenderMock.checkHealth.mockResolvedValue(true)
    ollamaRecommenderMock.checkHealth.mockResolvedValue(true)

    openRouterRecommenderMock.recommendWithSystemPrompt.mockResolvedValue({
      recommendation: makeRecommendation('openrouter-method'),
      responseText: 'openrouter text',
    })
    ollamaRecommenderMock.recommendWithSystemPrompt.mockResolvedValue({
      recommendation: makeRecommendation('ollama-method'),
      responseText: 'ollama text',
    })

    ollamaRecommenderMock.keywordBasedRecommend.mockReturnValue({
      recommendation: makeRecommendation('keyword-method'),
      responseText: 'keyword fallback',
    })

    // generateRawText: classifyIntent에서 사용, 기본값은 null (응답 없음)
    openRouterRecommenderMock.generateRawText.mockResolvedValue(null)
    ollamaRecommenderMock.generateRawText.mockResolvedValue(null)
  })

  it('falls back when provider returns text without recommendation', async () => {
    openRouterRecommenderMock.recommendWithSystemPrompt.mockResolvedValue({
      recommendation: null,
      responseText: 'explanation only',
    })

    const result = await llmRecommender.recommendFromNaturalLanguage('input', null, null, null)

    expect(openRouterRecommenderMock.recommendWithSystemPrompt).toHaveBeenCalledTimes(1)
    expect(ollamaRecommenderMock.recommendWithSystemPrompt).toHaveBeenCalledTimes(1)
    expect(result.provider).toBe('ollama')
    expect(result.recommendation?.method.id).toBe('ollama-method')
  })

  it('uses keyword fallback when both providers return no recommendation', async () => {
    openRouterRecommenderMock.recommendWithSystemPrompt.mockResolvedValue({
      recommendation: null,
      responseText: '',
    })
    ollamaRecommenderMock.recommendWithSystemPrompt.mockResolvedValue({
      recommendation: null,
      responseText: '',
    })

    const result = await llmRecommender.recommendFromNaturalLanguage('input', null, null, null)

    expect(ollamaRecommenderMock.keywordBasedRecommend).toHaveBeenCalledTimes(1)
    expect(result.provider).toBe('keyword')
    expect(result.recommendation?.method.id).toBe('keyword-method')
  })

  it('falls back to ollama stream when openrouter stream fails in default order', async () => {
    openRouterRecommenderMock.streamChatCompletion.mockRejectedValue(new Error('openrouter stream failed'))
    ollamaRecommenderMock.streamChatCompletion.mockImplementation(async function* () {
      yield 'ollama chunk 1'
      yield 'ollama chunk 2'
    })

    const { chunks, result } = await consumeStream(llmRecommender.stream('system', 'user'))

    expect(openRouterRecommenderMock.streamChatCompletion).toHaveBeenCalledTimes(1)
    expect(ollamaRecommenderMock.streamChatCompletion).toHaveBeenCalledTimes(1)
    expect(chunks).toEqual(['ollama chunk 1', 'ollama chunk 2'])
    expect(result).toEqual({ model: 'ollama', provider: 'ollama' })
  })

  it('uses openrouter as stream fallback when ollama-first setting is enabled', async () => {
    getSettingsStateMock.mockReturnValue({ useOllamaForRecommendation: true })
    ollamaRecommenderMock.streamChatCompletion.mockImplementation(async function* () {
      throw new Error('ollama stream failed')
    })
    openRouterRecommenderMock.streamChatCompletion.mockImplementation(
      async (_systemPrompt: string, _userPrompt: string, onChunk: (text: string) => void) => {
        onChunk('openrouter chunk')
        return { model: 'openrouter/test-model' }
      }
    )

    const { chunks, result } = await consumeStream(llmRecommender.stream('system', 'user'))

    expect(ollamaRecommenderMock.streamChatCompletion).toHaveBeenCalledTimes(1)
    expect(openRouterRecommenderMock.streamChatCompletion).toHaveBeenCalledTimes(1)
    expect(chunks).toEqual(['openrouter chunk'])
    expect(result).toEqual({ model: 'openrouter/test-model', provider: 'openrouter' })
  })

  it('propagates stream error to caller when all providers fail', async () => {
    openRouterRecommenderMock.streamChatCompletion.mockRejectedValue(new Error('openrouter stream failed'))
    ollamaRecommenderMock.streamChatCompletion.mockImplementation(async function* () {
      throw new Error('ollama stream failed')
    })

    const generator = llmRecommender.stream('system', 'user')

    await expect(generator.next()).rejects.toThrow('ollama stream failed')
  })

  // ===== per-call options 실제 전달 검증 =====

  it('recommendFromNaturalLanguage passes { maxTokens: 3500 } to recommendWithSystemPrompt', async () => {
    await llmRecommender.recommendFromNaturalLanguage('두 그룹 비교', null, null, null)

    // tryOpenRouter가 recommendWithSystemPrompt를 호출할 때 6번째 인자가 { maxTokens: 3500 }이어야 함
    expect(openRouterRecommenderMock.recommendWithSystemPrompt).toHaveBeenCalledWith(
      '두 그룹 비교',       // userInput
      'consultant prompt', // systemPrompt (validationResults=null이므로 CONSULTANT 모드)
      null,                // validationResults
      null,                // assumptionResults
      null,                // data
      { maxTokens: 3500 }  // options ← 검증 대상
    )
  })

  it('classifyIntent passes { temperature: 0.1, maxTokens: 1000 } to generateRawText', async () => {
    // 유효한 JSON 응답 반환 → parseIntentResponse가 파싱할 수 있어야 함
    const validResponse = JSON.stringify({
      track: 'direct-analysis',
      confidence: 0.85,
      methodId: null,
      reasoning: '명시적 분석 요청',
    })
    openRouterRecommenderMock.generateRawText.mockResolvedValueOnce(validResponse)

    await llmRecommender.classifyIntent('t-test 해줘')

    // generateRawText 3번째 인자가 { temperature: 0.1, maxTokens: 1000 }이어야 함
    expect(openRouterRecommenderMock.generateRawText).toHaveBeenCalledWith(
      'intent router prompt',              // systemPrompt
      't-test 해줘',                        // userInput
      { temperature: 0.1, maxTokens: 1000 } // options ← 검증 대상
    )
  })
})

