import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'

describe('usePinnedToolsStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    usePinnedToolsStore.setState({ pinnedIds: [] })
  })

  afterEach(() => {
    usePinnedToolsStore.persist.clearStorage()
  })

  it('도구를 고정하고 다시 해제할 수 있다', () => {
    const { togglePin } = usePinnedToolsStore.getState()

    togglePin('fst')
    expect(usePinnedToolsStore.getState().pinnedIds).toEqual(['fst'])
    expect(usePinnedToolsStore.getState().isPinned('fst')).toBe(true)

    togglePin('fst')
    expect(usePinnedToolsStore.getState().pinnedIds).toEqual([])
    expect(usePinnedToolsStore.getState().isPinned('fst')).toBe(false)
  })

  it('최대 6개까지만 고정한다', () => {
    const { togglePin } = usePinnedToolsStore.getState()

    for (const toolId of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      togglePin(toolId)
    }

    expect(usePinnedToolsStore.getState().pinnedIds).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('고정된 도구 순서를 다시 배치할 수 있다', () => {
    usePinnedToolsStore.setState({ pinnedIds: ['barcoding', 'fst', 'hardy-weinberg'] })

    usePinnedToolsStore.getState().reorderPins('hardy-weinberg', 'barcoding')

    expect(usePinnedToolsStore.getState().pinnedIds).toEqual(['hardy-weinberg', 'barcoding', 'fst'])
  })

  it('persist 저장소에서 고정 순서를 다시 복원한다', async () => {
    window.localStorage.setItem(
      'biohub-pinned-bio-tools',
      JSON.stringify({
        state: { pinnedIds: ['alpha', 'beta', 'gamma'] },
        version: 0,
      }),
    )

    usePinnedToolsStore.persist.rehydrate()
    await Promise.resolve()

    expect(usePinnedToolsStore.getState().pinnedIds).toEqual(['alpha', 'beta', 'gamma'])
  })
})
