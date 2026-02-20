import { beforeEach, describe, expect, it, vi } from 'vitest'

const { openRouterRecommenderMock, ollamaRecommenderMock, getSettingsStateMock } = vi.hoisted(() => ({
  openRouterRecommenderMock: {
    checkHealth: vi.fn(),
    recommendWithSystemPrompt: vi.fn(),
    streamChatCompletion: vi.fn(),
  },
  ollamaRecommenderMock: {
    checkHealth: vi.fn(),
    recommendWithSystemPrompt: vi.fn(),
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
})

