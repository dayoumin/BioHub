import { usePinnedGeneticsToolsStore } from '@/lib/genetics/pinned-tools-store'

describe('usePinnedGeneticsToolsStore', () => {
  beforeEach(() => {
    window.localStorage.clear()
    usePinnedGeneticsToolsStore.setState({ pinnedIds: [] })
  })

  afterEach(() => {
    usePinnedGeneticsToolsStore.persist.clearStorage()
  })

  it('도구를 고정하고 다시 해제할 수 있다', () => {
    const { togglePin } = usePinnedGeneticsToolsStore.getState()

    togglePin('barcoding')
    expect(usePinnedGeneticsToolsStore.getState().pinnedIds).toEqual(['barcoding'])
    expect(usePinnedGeneticsToolsStore.getState().isPinned('barcoding')).toBe(true)

    togglePin('barcoding')
    expect(usePinnedGeneticsToolsStore.getState().pinnedIds).toEqual([])
    expect(usePinnedGeneticsToolsStore.getState().isPinned('barcoding')).toBe(false)
  })

  it('최대 6개까지만 고정한다', () => {
    const { togglePin } = usePinnedGeneticsToolsStore.getState()

    for (const toolId of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      togglePin(toolId)
    }

    expect(usePinnedGeneticsToolsStore.getState().pinnedIds).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('고정된 도구 순서를 다시 배치할 수 있다', () => {
    usePinnedGeneticsToolsStore.setState({ pinnedIds: ['barcoding', 'phylogeny', 'protein'] })

    usePinnedGeneticsToolsStore.getState().reorderPins('protein', 'barcoding')

    expect(usePinnedGeneticsToolsStore.getState().pinnedIds).toEqual(['protein', 'barcoding', 'phylogeny'])
  })

  it('persist 저장소에서 고정 순서를 다시 복원한다', async () => {
    window.localStorage.setItem(
      'biohub-pinned-genetics-tools',
      JSON.stringify({
        state: { pinnedIds: ['barcoding', 'protein', 'phylogeny'] },
        version: 0,
      }),
    )

    usePinnedGeneticsToolsStore.persist.rehydrate()
    await Promise.resolve()

    expect(usePinnedGeneticsToolsStore.getState().pinnedIds).toEqual(['barcoding', 'protein', 'phylogeny'])
  })
})
