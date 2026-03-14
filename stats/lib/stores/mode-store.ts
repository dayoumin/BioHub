import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AiRecommendationContext } from '@/lib/utils/storage-types'

/**
 * UI 모드 상태 관리
 *
 * Hub 표시, Step 흐름 트랙, 목적 입력 모드 등 UI 모드 플래그.
 * 분석 데이터와 무관한 순수 UI 상태.
 */

/** Step 네비게이션 흐름 트랙 */
export type StepTrack = 'normal' | 'quick' | 'reanalysis'

export interface ModeState {
  stepTrack: StepTrack
  showHub: boolean
  purposeInputMode: 'ai' | 'browse'
  userQuery: string | null
  lastAiRecommendation: AiRecommendationContext | null

  setStepTrack: (track: StepTrack) => void
  setShowHub: (show: boolean) => void
  setPurposeInputMode: (mode: 'ai' | 'browse') => void
  setUserQuery: (query: string | null) => void
  setLastAiRecommendation: (rec: AiRecommendationContext | null) => void

  resetMode: () => void
}

const initialModeState = {
  stepTrack: 'normal' as StepTrack,
  showHub: true,
  purposeInputMode: 'ai' as const,
  userQuery: null as string | null,
  lastAiRecommendation: null as AiRecommendationContext | null,
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      ...initialModeState,

      setStepTrack: (track) => set({ stepTrack: track }),
      setShowHub: (show) => set({ showHub: show }),
      setPurposeInputMode: (mode) => set({ purposeInputMode: mode }),
      setUserQuery: (query) => set({ userQuery: query }),
      setLastAiRecommendation: (rec) => set({ lastAiRecommendation: rec }),

      resetMode: () => set(initialModeState),
    }),
    {
      name: 'analysis-mode-storage',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        // Hub 질문만 persist (새로고침 시 복원)
        userQuery: state.userQuery,
        // purposeInputMode는 의도적으로 persist하지 않음 — 항상 'ai' 시작
      }),
    }
  )
)
