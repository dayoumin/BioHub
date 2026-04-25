import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'

const { mockGetSettingsState } = vi.hoisted(() => ({
  mockGetSettingsState: vi.fn(),
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

vi.mock('@/lib/services/recommenders/openrouter-recommender', () => ({
  openRouterRecommender: {
    generateRawText: vi.fn(),
  },
}))

vi.mock('@/lib/services/recommenders/ollama-recommender', () => ({
  ollamaRecommender: {
    checkHealth: vi.fn(),
    generateRawText: vi.fn(),
  },
}))

import {
  DEFAULT_DOCUMENT_WRITER_SETTINGS,
  normalizeDocumentWriterSettings,
  type DocumentWriterSettings,
} from '@/lib/stores/settings-store'
import { resolveDocumentWriterSettings } from '../document-writer-engine-registry'

function makeDocument(overrides: Partial<DocumentBlueprint> = {}): DocumentBlueprint {
  const now = '2026-04-25T00:00:00.000Z'
  return {
    id: 'doc_1',
    projectId: 'proj_1',
    preset: 'paper',
    title: 'Draft paper',
    language: 'en',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    sections: [],
    ...overrides,
  }
}

describe('document writer engine registry', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSettingsState.mockReturnValue({
      useOllamaForRecommendation: false,
      documentWriterSettings: DEFAULT_DOCUMENT_WRITER_SETTINGS,
    })
  })

  it('uses global provider preference when document writer provider is global', () => {
    const resolved = resolveDocumentWriterSettings(makeDocument(), 'discussion')

    expect(resolved.provider).toBe('api')
    expect(resolved.quality).toBe('balanced')
  })

  it('uses section override provider and quality when configured', () => {
    const settings: DocumentWriterSettings = {
      defaultProvider: 'global',
      quality: 'balanced',
      sectionOverrides: {
        discussion: {
          provider: 'api',
          quality: 'careful',
        },
        results: {
          provider: 'template',
          quality: 'fast',
        },
      },
    }
    mockGetSettingsState.mockReturnValue({
      useOllamaForRecommendation: true,
      documentWriterSettings: settings,
    })

    const discussion = resolveDocumentWriterSettings(makeDocument(), 'discussion')
    const results = resolveDocumentWriterSettings(makeDocument(), 'results')

    expect(discussion.provider).toBe('api')
    expect(discussion.quality).toBe('careful')
    expect(results.provider).toBe('template')
    expect(results.quality).toBe('fast')
  })

  it('lets document metadata override app-level writer settings', () => {
    const resolved = resolveDocumentWriterSettings(makeDocument({
      metadata: {
        writerProvider: 'template',
        writerQuality: 'fast',
      },
    }), 'introduction')

    expect(resolved.provider).toBe('template')
    expect(resolved.quality).toBe('fast')
  })

  it('lets section override take priority over document metadata defaults', () => {
    const settings: DocumentWriterSettings = {
      defaultProvider: 'global',
      quality: 'balanced',
      sectionOverrides: {
        discussion: {
          provider: 'api',
          quality: 'careful',
        },
      },
    }
    mockGetSettingsState.mockReturnValue({
      useOllamaForRecommendation: true,
      documentWriterSettings: settings,
    })

    const resolved = resolveDocumentWriterSettings(makeDocument({
      metadata: {
        writerProvider: 'template',
        writerQuality: 'fast',
      },
    }), 'discussion')

    expect(resolved.provider).toBe('api')
    expect(resolved.quality).toBe('careful')
  })

  it('normalizes partial persisted writer settings', () => {
    expect(normalizeDocumentWriterSettings({
      defaultProvider: 'bad-provider',
    })).toEqual(DEFAULT_DOCUMENT_WRITER_SETTINGS)

    expect(normalizeDocumentWriterSettings({
      defaultProvider: 'api',
      quality: 'careful',
    })).toEqual({
      defaultProvider: 'api',
      quality: 'careful',
      sectionOverrides: {},
    })
  })
})
