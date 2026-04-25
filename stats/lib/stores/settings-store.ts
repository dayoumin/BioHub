import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Settings Store
 *
 * Global application settings that persist across sessions.
 * Uses Zustand with localStorage persistence.
 */

export type UserLevel = 'beginner' | 'intermediate' | 'expert'
export type DocumentWriterProviderSetting = 'global' | 'template' | 'local-model' | 'api'
export type DocumentWriterQuality = 'fast' | 'balanced' | 'careful'
export type DocumentWriterSectionId =
  | 'introduction'
  | 'background'
  | 'summary'
  | 'methods'
  | 'results'
  | 'discussion'
  | 'conclusion'
  | 'custom'

export interface DocumentWriterSectionOverride {
  provider?: DocumentWriterProviderSetting
  quality?: DocumentWriterQuality
}

export interface DocumentWriterSettings {
  defaultProvider: DocumentWriterProviderSetting
  quality: DocumentWriterQuality
  sectionOverrides: Partial<Record<DocumentWriterSectionId, DocumentWriterSectionOverride>>
}

export const DEFAULT_DOCUMENT_WRITER_SETTINGS: DocumentWriterSettings = {
  defaultProvider: 'global',
  quality: 'balanced',
  sectionOverrides: {},
}

function isDocumentWriterProviderSetting(value: unknown): value is DocumentWriterProviderSetting {
  return value === 'global' || value === 'template' || value === 'local-model' || value === 'api'
}

function isDocumentWriterQuality(value: unknown): value is DocumentWriterQuality {
  return value === 'fast' || value === 'balanced' || value === 'careful'
}

function isDocumentWriterSectionId(value: string): value is DocumentWriterSectionId {
  return [
    'introduction',
    'background',
    'summary',
    'methods',
    'results',
    'discussion',
    'conclusion',
    'custom',
  ].includes(value)
}

export function normalizeDocumentWriterSettings(value: unknown): DocumentWriterSettings {
  if (!value || typeof value !== 'object') {
    return DEFAULT_DOCUMENT_WRITER_SETTINGS
  }

  const input = value as Partial<DocumentWriterSettings>
  const sectionOverrides: DocumentWriterSettings['sectionOverrides'] = {}
  const rawOverrides = input.sectionOverrides
  if (rawOverrides && typeof rawOverrides === 'object') {
    for (const [sectionId, override] of Object.entries(rawOverrides)) {
      if (!isDocumentWriterSectionId(sectionId) || !override || typeof override !== 'object') {
        continue
      }
      const candidate = override as DocumentWriterSectionOverride
      sectionOverrides[sectionId] = {
        ...(isDocumentWriterProviderSetting(candidate.provider) ? { provider: candidate.provider } : {}),
        ...(isDocumentWriterQuality(candidate.quality) ? { quality: candidate.quality } : {}),
      }
    }
  }

  return {
    defaultProvider: isDocumentWriterProviderSetting(input.defaultProvider)
      ? input.defaultProvider
      : DEFAULT_DOCUMENT_WRITER_SETTINGS.defaultProvider,
    quality: isDocumentWriterQuality(input.quality)
      ? input.quality
      : DEFAULT_DOCUMENT_WRITER_SETTINGS.quality,
    sectionOverrides,
  }
}

interface SettingsState {
  /**
   * Ollama recommendation path is intentionally dormant for the current product roadmap.
   * Keep the default as false. Revisit only when the app/internal-network deployment plan
   * requires local or self-hosted inference (personal workstation or server operation).
   */
  useOllamaForRecommendation: boolean

  /** User expertise level for result interpretation */
  userLevel: UserLevel

  /** Paper/document drafting provider and quality settings */
  documentWriterSettings: DocumentWriterSettings

  /** Set the Ollama recommendation preference */
  setUseOllamaForRecommendation: (value: boolean) => void

  /** Set the user expertise level */
  setUserLevel: (level: UserLevel) => void

  /** Update document writer settings */
  setDocumentWriterSettings: (settings: DocumentWriterSettings) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Keep disabled by default until the future app/internal-network rollout needs it.
      useOllamaForRecommendation: false,

      // Default to expert for professional analysis
      userLevel: 'expert',

      documentWriterSettings: DEFAULT_DOCUMENT_WRITER_SETTINGS,

      setUseOllamaForRecommendation: (value: boolean) => {
        set({ useOllamaForRecommendation: value })
      },

      setUserLevel: (level: UserLevel) => {
        set({ userLevel: level })
      },

      setDocumentWriterSettings: (settings: DocumentWriterSettings) => {
        set({ documentWriterSettings: normalizeDocumentWriterSettings(settings) })
      },
    }),
    {
      name: 'statPlatform_settings',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsState> | undefined
        return {
          ...currentState,
          ...persisted,
          documentWriterSettings: normalizeDocumentWriterSettings(persisted?.documentWriterSettings),
        }
      },
    }
  )
)
