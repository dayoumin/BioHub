import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SectionWritingContext } from '../document-section-writing-context'

const {
  mockOpenRouterGenerateRawText,
  mockOllamaCheckHealth,
  mockOllamaGenerateRawText,
  mockGetSettingsState,
} = vi.hoisted(() => ({
  mockOpenRouterGenerateRawText: vi.fn(),
  mockOllamaCheckHealth: vi.fn(),
  mockOllamaGenerateRawText: vi.fn(),
  mockGetSettingsState: vi.fn(),
}))

vi.mock('@/lib/services/recommenders/openrouter-recommender', () => ({
  openRouterRecommender: {
    generateRawText: mockOpenRouterGenerateRawText,
  },
}))

vi.mock('@/lib/services/recommenders/ollama-recommender', () => ({
  ollamaRecommender: {
    checkHealth: mockOllamaCheckHealth,
    generateRawText: mockOllamaGenerateRawText,
  },
}))

vi.mock('@/lib/stores/settings-store', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/stores/settings-store')>()
  return {
    ...actual,
    useSettingsStore: {
      getState: mockGetSettingsState,
    },
  }
})

import {
  apiDocumentWriterEngine,
  getPreferredDocumentWriterProvider,
  localModelDocumentWriterEngine,
} from '../document-llm-writer-engine'

function makeContext(): SectionWritingContext {
  return {
    documentId: 'doc_1',
    projectId: 'proj_1',
    documentTitle: 'Draft paper',
    language: 'en',
    sectionId: 'discussion',
    sectionTitle: 'Discussion',
    sectionKind: 'discussion',
    existingContent: '',
    sourceRefs: [],
    sources: [],
    supportItems: [{
      id: 'support_1',
      sourceKind: 'citation-record',
      sourceId: 'citation_1',
      role: 'comparison',
      roleLabel: 'Comparison',
      label: 'Smith 2025',
      summary: 'Compare with literature.',
      citationIds: ['citation_1'],
    }],
    supportMarkdown: '',
    citationIds: ['citation_1'],
    writingGoal: 'Discuss the result.',
  }
}

describe('document LLM writer engines', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettingsState.mockReturnValue({ useOllamaForRecommendation: false })
    mockOpenRouterGenerateRawText.mockResolvedValue('LLM generated discussion.')
    mockOllamaCheckHealth.mockResolvedValue(true)
    mockOllamaGenerateRawText.mockResolvedValue('Local generated discussion.')
  })

  it('uses OpenRouter raw text for api writer and preserves citation ids', async () => {
    const result = await apiDocumentWriterEngine.writeSection({
      provider: 'api',
      quality: 'careful',
      context: makeContext(),
    })

    expect(result.provider).toBe('api')
    expect(result.content).toBe('LLM generated discussion.')
    expect(result.citationIds).toEqual(['citation_1'])
    expect(mockOpenRouterGenerateRawText).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining('Smith 2025'),
      { temperature: 0.2, maxTokens: 2600 },
    )
  })

  it('falls back to template when api writer returns no content', async () => {
    mockOpenRouterGenerateRawText.mockResolvedValue(null)
    mockOllamaGenerateRawText.mockResolvedValue(null)

    const result = await apiDocumentWriterEngine.writeSection({
      provider: 'api',
      context: makeContext(),
    })

    expect(result.provider).toBe('template')
    expect(result.content).toContain('Discussion Writing Input')
  })

  it('falls back from api to local model before template', async () => {
    mockOpenRouterGenerateRawText.mockResolvedValue(null)
    mockOllamaGenerateRawText.mockResolvedValue('Fallback local draft.')

    const result = await apiDocumentWriterEngine.writeSection({
      provider: 'api',
      context: makeContext(),
    })

    expect(result.provider).toBe('local-model')
    expect(result.content).toBe('Fallback local draft.')
  })

  it('uses Ollama raw text for local model writer when healthy', async () => {
    const result = await localModelDocumentWriterEngine.writeSection({
      provider: 'local-model',
      quality: 'fast',
      context: makeContext(),
    })

    expect(result.provider).toBe('local-model')
    expect(result.content).toBe('Local generated discussion.')
    expect(mockOllamaGenerateRawText).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { temperature: 0.15, maxTokens: 900 },
    )
  })

  it('falls back from local model to api before template', async () => {
    mockOllamaCheckHealth.mockResolvedValue(false)
    mockOpenRouterGenerateRawText.mockResolvedValue('Fallback API draft.')

    const result = await localModelDocumentWriterEngine.writeSection({
      provider: 'local-model',
      context: makeContext(),
    })

    expect(result.provider).toBe('api')
    expect(result.content).toBe('Fallback API draft.')
  })

  it('reads the existing global Ollama preference for default provider choice', () => {
    mockGetSettingsState.mockReturnValue({ useOllamaForRecommendation: true })

    expect(getPreferredDocumentWriterProvider()).toBe('local-model')
  })
})
