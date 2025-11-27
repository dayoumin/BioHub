import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Settings Store
 *
 * Global application settings that persist across sessions.
 * Uses Zustand with localStorage persistence.
 */

export type UserLevel = 'beginner' | 'intermediate' | 'expert'

interface SettingsState {
  /** Whether to use Ollama LLM for analysis method recommendation in Smart Flow */
  useOllamaForRecommendation: boolean

  /** User expertise level for result interpretation */
  userLevel: UserLevel

  /** Set the Ollama recommendation preference */
  setUseOllamaForRecommendation: (value: boolean) => void

  /** Set the user expertise level */
  setUserLevel: (level: UserLevel) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default to DecisionTree (faster and more stable)
      useOllamaForRecommendation: false,

      // Default to beginner for easier understanding
      userLevel: 'beginner',

      setUseOllamaForRecommendation: (value: boolean) => {
        set({ useOllamaForRecommendation: value })
      },

      setUserLevel: (level: UserLevel) => {
        set({ userLevel: level })
      },
    }),
    {
      name: 'statPlatform_settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
