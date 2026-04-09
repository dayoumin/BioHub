import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AiRecommendationContext } from '@/lib/utils/storage-types'

/**
 * UI 모드 상태 관리
 *
 * Hub 표시, Step 흐름 트랙 등 UI 모드 플래그.
 * 분석 데이터와 무관한 순수 UI 상태.
 */

/** Step 네비게이션 흐름 트랙 */
export type StepTrack = 'normal' | 'quick' | 'reanalysis' | 'diagnostic'

export interface ModeState {
  stepTrack: StepTrack
  showHub: boolean
  lastAiRecommendation: AiRecommendationContext | null

  setStepTrack: (track: StepTrack) => void
  setShowHub: (show: boolean) => void
  setLastAiRecommendation: (rec: AiRecommendationContext | null) => void

  resetMode: () => void
}

const initialModeState = {
  stepTrack: 'normal' as StepTrack,
  showHub: true,
  lastAiRecommendation: null as AiRecommendationContext | null,
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      ...initialModeState,

      setStepTrack: (track) => set({ stepTrack: track }),
      setShowHub: (show) => set({ showHub: show }),
      setLastAiRecommendation: (rec) => set({ lastAiRecommendation: rec }),

      resetMode: () => set(initialModeState),
    }),
    {
      name: 'analysis-mode-storage',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
