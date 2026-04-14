import { usePinnedToolsStore } from '@/lib/bio-tools/pinned-tools-store'
import { usePinnedGeneticsToolsStore } from '@/lib/genetics/pinned-tools-store'

describe('usePinnedToolsStore (bio-tools wrapper)', () => {
  beforeEach(() => {
    usePinnedToolsStore.setState({ pinnedIds: [] })
    usePinnedGeneticsToolsStore.setState({ pinnedIds: [] })
    window.localStorage.clear()
  })

  afterEach(() => {
    usePinnedToolsStore.persist.clearStorage()
    usePinnedGeneticsToolsStore.persist.clearStorage()
  })

  it('bio-tools 전용 persist 키를 사용한다', () => {
    usePinnedToolsStore.getState().togglePin('fst')

    const raw = window.localStorage.getItem('biohub-pinned-bio-tools')
    expect(raw).not.toBeNull()
    expect(window.localStorage.getItem('biohub-pinned-genetics-tools')).toBeNull()
  })

  it('genetics 스토어와 상태가 격리된다', () => {
    usePinnedToolsStore.getState().togglePin('fst')

    expect(usePinnedToolsStore.getState().pinnedIds).toEqual(['fst'])
    expect(usePinnedGeneticsToolsStore.getState().pinnedIds).toEqual([])
    expect(usePinnedGeneticsToolsStore.getState().isPinned('fst')).toBe(false)
  })
})
