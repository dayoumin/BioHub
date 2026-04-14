import { createPinnedToolsStore, MAX_PINNED_TOOLS } from '@/lib/stores/create-pinned-store'

const PERSIST_KEY = 'test-pinned-store'

describe('createPinnedToolsStore', () => {
  const useStore = createPinnedToolsStore(PERSIST_KEY)

  beforeEach(() => {
    useStore.setState({ pinnedIds: [] })
    window.localStorage.clear()
  })

  afterEach(() => {
    useStore.persist.clearStorage()
  })

  describe('togglePin', () => {
    it('핀 추가 → 해제 시 각 단계의 상태를 모두 검증한다', () => {
      const { togglePin } = useStore.getState()

      expect(useStore.getState().pinnedIds).toEqual([])
      expect(useStore.getState().isPinned('fst')).toBe(false)

      togglePin('fst')
      expect(useStore.getState().pinnedIds).toEqual(['fst'])
      expect(useStore.getState().isPinned('fst')).toBe(true)

      togglePin('fst')
      expect(useStore.getState().pinnedIds).toEqual([])
      expect(useStore.getState().isPinned('fst')).toBe(false)
    })

    it(`${MAX_PINNED_TOOLS}개 초과 시 기존 핀을 보존하고 신규 추가만 거부한다`, () => {
      const { togglePin } = useStore.getState()

      for (const toolId of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
        togglePin(toolId)
      }

      const state = useStore.getState()
      expect(state.pinnedIds).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
      expect(state.pinnedIds).toHaveLength(MAX_PINNED_TOOLS)
      expect(state.isPinned('g')).toBe(false)
      expect(state.isPinned('a')).toBe(true)
    })
  })

  describe('reorderPins', () => {
    it('activeId를 overId 위치로 이동시키며 before/after 순서를 확인한다', () => {
      useStore.setState({ pinnedIds: ['barcoding', 'fst', 'hardy-weinberg'] })
      expect(useStore.getState().pinnedIds).toEqual(['barcoding', 'fst', 'hardy-weinberg'])

      useStore.getState().reorderPins('hardy-weinberg', 'barcoding')

      expect(useStore.getState().pinnedIds).toEqual(['hardy-weinberg', 'barcoding', 'fst'])
    })

    it('존재하지 않는 id를 받으면 순서를 그대로 유지한다', () => {
      useStore.setState({ pinnedIds: ['a', 'b', 'c'] })

      useStore.getState().reorderPins('unknown', 'a')
      expect(useStore.getState().pinnedIds).toEqual(['a', 'b', 'c'])

      useStore.getState().reorderPins('a', 'unknown')
      expect(useStore.getState().pinnedIds).toEqual(['a', 'b', 'c'])
    })

    it('동일한 id로 호출하면 변화 없이 반환한다', () => {
      useStore.setState({ pinnedIds: ['a', 'b', 'c'] })

      useStore.getState().reorderPins('b', 'b')

      expect(useStore.getState().pinnedIds).toEqual(['a', 'b', 'c'])
    })
  })

  describe('persist', () => {
    it('localStorage에서 고정 순서를 복원한다', async () => {
      window.localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          state: { pinnedIds: ['alpha', 'beta', 'gamma'] },
          version: 0,
        }),
      )

      useStore.persist.rehydrate()
      await Promise.resolve()

      expect(useStore.getState().pinnedIds).toEqual(['alpha', 'beta', 'gamma'])
    })
  })
})
