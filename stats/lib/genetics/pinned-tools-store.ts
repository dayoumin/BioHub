import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const MAX_PINNED = 6

interface PinnedGeneticsToolsState {
  pinnedIds: string[]
  togglePin: (toolId: string) => void
  reorderPins: (activeId: string, overId: string) => void
  isPinned: (toolId: string) => boolean
}

function movePinnedId(ids: readonly string[], activeId: string, overId: string): string[] {
  const oldIndex = ids.indexOf(activeId)
  const newIndex = ids.indexOf(overId)

  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) {
    return [...ids]
  }

  const next = [...ids]
  const [moved] = next.splice(oldIndex, 1)

  if (!moved) {
    return next
  }

  next.splice(newIndex, 0, moved)
  return next
}

export const usePinnedGeneticsToolsStore = create<PinnedGeneticsToolsState>()(
  persist(
    (set, get) => ({
      pinnedIds: [],
      togglePin: (toolId: string) =>
        set((state) => {
          const exists = state.pinnedIds.includes(toolId)
          if (exists) {
            return { pinnedIds: state.pinnedIds.filter((id) => id !== toolId) }
          }
          if (state.pinnedIds.length >= MAX_PINNED) {
            return state
          }
          return { pinnedIds: [...state.pinnedIds, toolId] }
        }),
      reorderPins: (activeId: string, overId: string) =>
        set((state) => ({
          pinnedIds: movePinnedId(state.pinnedIds, activeId, overId),
        })),
      isPinned: (toolId: string) => get().pinnedIds.includes(toolId),
    }),
    { name: 'biohub-pinned-genetics-tools' },
  ),
)
