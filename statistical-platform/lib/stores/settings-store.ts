import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Settings Store
 *
 * Global application settings that persist across sessions.
 * Uses Zustand with localStorage persistence.
 */

interface SettingsState {
  /** Whether to use Ollama LLM for analysis method recommendation in Smart Flow */
  useOllamaForRecommendation: boolean

  /** Set the Ollama recommendation preference */
  setUseOllamaForRecommendation: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default to DecisionTree (faster and more stable)
      useOllamaForRecommendation: false,

      setUseOllamaForRecommendation: (value: boolean) => {
        set({ useOllamaForRecommendation: value })
      },
    }),
    {
      name: 'statPlatform_settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
