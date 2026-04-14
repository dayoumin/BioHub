import { usePinnedGeneticsToolsStore } from '@/lib/genetics/pinned-tools-store'
import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'

describe('usePinnedGeneticsToolsStore (genetics wrapper)', () => {
  beforeEach(() => {
    usePinnedGeneticsToolsStore.setState({ pinnedIds: [] })
    usePinnedToolsStore.setState({ pinnedIds: [] })
    window.localStorage.clear()
  })

  afterEach(() => {
    usePinnedGeneticsToolsStore.persist.clearStorage()
    usePinnedToolsStore.persist.clearStorage()
  })

  it('genetics 전용 persist 키를 사용한다', () => {
    usePinnedGeneticsToolsStore.getState().togglePin('barcoding')

    expect(window.localStorage.getItem('biohub-pinned-genetics-tools')).not.toBeNull()
    expect(window.localStorage.getItem('biohub-pinned-bio-tools')).toBeNull()
  })

  it('bio-tools 스토어와 상태가 격리된다', () => {
    usePinnedGeneticsToolsStore.getState().togglePin('barcoding')

    expect(usePinnedGeneticsToolsStore.getState().pinnedIds).toEqual(['barcoding'])
    expect(usePinnedToolsStore.getState().pinnedIds).toEqual([])
    expect(usePinnedToolsStore.getState().isPinned('barcoding')).toBe(false)
  })
})
