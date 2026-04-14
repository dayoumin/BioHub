import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const MAX_PINNED_TOOLS = 6

export interface PinnedToolsState {
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
  const moved = next[oldIndex]
  if (moved === undefined) return next

  next.splice(oldIndex, 1)
  next.splice(newIndex, 0, moved)
  return next
}

export function createPinnedToolsStore(persistKey: string) {
  return create<PinnedToolsState>()(
    persist(
      (set, get) => ({
        pinnedIds: [],
        togglePin: (toolId: string) =>
          set((state) => {
            if (state.pinnedIds.includes(toolId)) {
              return { pinnedIds: state.pinnedIds.filter((id) => id !== toolId) }
            }
            if (state.pinnedIds.length >= MAX_PINNED_TOOLS) return state
            return { pinnedIds: [...state.pinnedIds, toolId] }
          }),
        reorderPins: (activeId: string, overId: string) =>
          set((state) => ({
            pinnedIds: movePinnedId(state.pinnedIds, activeId, overId),
          })),
        isPinned: (toolId: string) => get().pinnedIds.includes(toolId),
      }),
      { name: persistKey },
    ),
  )
}
