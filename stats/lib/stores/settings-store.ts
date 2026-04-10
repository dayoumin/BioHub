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
  /**
   * Ollama recommendation path is intentionally dormant for the current product roadmap.
   * Keep the default as false. Revisit only when the app/internal-network deployment plan
   * requires local or self-hosted inference (personal workstation or server operation).
   */
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
      // Keep disabled by default until the future app/internal-network rollout needs it.
      useOllamaForRecommendation: false,

      // Default to expert for professional analysis
      userLevel: 'expert',

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
