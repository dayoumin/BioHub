/**
 * Bio-Tools 핀 관리 스토어
 *
 * Zustand persist → localStorage 자동 동기화.
 * 최대 6개 핀 제한.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_PINNED = 6

interface PinnedToolsState {
  pinnedIds: string[]
  togglePin: (toolId: string) => void
  isPinned: (toolId: string) => boolean
}

export const usePinnedToolsStore = create<PinnedToolsState>()(
  persist(
    (set, get) => ({
      pinnedIds: [],
      togglePin: (toolId: string) =>
        set((state) => {
          const exists = state.pinnedIds.includes(toolId)
          if (exists) {
            return { pinnedIds: state.pinnedIds.filter((id) => id !== toolId) }
          }
          if (state.pinnedIds.length >= MAX_PINNED) return state
          return { pinnedIds: [...state.pinnedIds, toolId] }
        }),
      isPinned: (toolId: string) => get().pinnedIds.includes(toolId),
    }),
    { name: 'biohub-pinned-bio-tools' },
  ),
)
