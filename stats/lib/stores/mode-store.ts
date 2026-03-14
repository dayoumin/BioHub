import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AnalysisTrack } from '@/types/analysis'
import type { AiRecommendationContext } from '@/lib/utils/storage-types'

/**
 * UI 모드 상태 관리
 *
 * Hub 표시, 빠른 분석, 재분석 등 UI 모드 플래그.
 * 분석 데이터와 무관한 순수 UI 상태.
 */

export interface ModeState {
  isReanalysisMode: boolean
  showHub: boolean
  quickAnalysisMode: boolean
  purposeInputMode: 'ai' | 'browse'
  activeTrack: AnalysisTrack | null
  userQuery: string | null
  lastAiRecommendation: AiRecommendationContext | null

  setIsReanalysisMode: (mode: boolean) => void
  setShowHub: (show: boolean) => void
  setQuickAnalysisMode: (mode: boolean) => void
  setPurposeInputMode: (mode: 'ai' | 'browse') => void
  setActiveTrack: (track: AnalysisTrack | null) => void
  setUserQuery: (query: string | null) => void
  setLastAiRecommendation: (rec: AiRecommendationContext | null) => void

  resetMode: () => void
}

const initialModeState = {
  isReanalysisMode: false,
  showHub: true,
  quickAnalysisMode: false,
  purposeInputMode: 'ai' as const,
  activeTrack: null as AnalysisTrack | null,
  userQuery: null as string | null,
  lastAiRecommendation: null as AiRecommendationContext | null,
}

export const useModeStore = create<ModeState>()(
  persist(
    (set) => ({
      ...initialModeState,

      setIsReanalysisMode: (mode) => set({ isReanalysisMode: mode }),
      setShowHub: (show) => set({ showHub: show }),
      setQuickAnalysisMode: (mode) => set({ quickAnalysisMode: mode }),
      setPurposeInputMode: (mode) => set({ purposeInputMode: mode }),
      setActiveTrack: (track) => set({ activeTrack: track }),
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
