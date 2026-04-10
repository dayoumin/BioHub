const shared = vi.hoisted(() => ({
  callOrder: [] as string[],
}))

const geneticsMocks = vi.hoisted(() => ({
  hydrateGeneticsHistoryFromCloud: vi.fn(async () => {
    shared.callOrder.push('hydrate')
    return []
  }),
  loadAnalysisHistory: vi.fn(() => {
    shared.callOrder.push('blast-load')
    return []
  }),
  loadGeneticsHistory: vi.fn((filter?: string) => {
    shared.callOrder.push(`genetics-load:${filter ?? 'all'}`)
    return filter === 'protein'
      ? [{
        id: 'protein-1',
        analysisName: 'Protein result',
        sequenceLength: 128,
        molecularWeight: 14000,
        isoelectricPoint: 6.4,
        isStable: true,
        createdAt: 1710000000000,
      }]
      : []
  }),
}))

vi.mock('@/lib/genetics', () => geneticsMocks)
vi.mock('@/lib/utils/storage', () => ({
  getAllHistory: vi.fn(() => []),
}))
vi.mock('@/lib/graph-studio', () => ({
  listProjects: vi.fn(() => []),
}))
vi.mock('@/lib/bio-tools', () => ({
  loadBioToolHistory: vi.fn(() => []),
}))
vi.mock('..', () => ({
  loadAllDocumentBlueprints: vi.fn(() => []),
}))

describe('loadEntityHistories', () => {
  beforeEach(() => {
    vi.resetModules()
    shared.callOrder.length = 0
    geneticsMocks.hydrateGeneticsHistoryFromCloud.mockClear()
    geneticsMocks.loadAnalysisHistory.mockClear()
    geneticsMocks.loadGeneticsHistory.mockClear()
  })

  it('hydrates genetics history before resolving protein refs', async () => {
    const { loadEntityHistories } = await import('../entity-loader')

    const options = await loadEntityHistories([
      {
        id: 'pref-1',
        projectId: 'proj-1',
        entityKind: 'protein-result',
        entityId: 'protein-1',
        createdAt: '2026-04-01T00:00:00.000Z',
      },
    ])

    expect(geneticsMocks.hydrateGeneticsHistoryFromCloud).toHaveBeenCalledTimes(1)
    expect(geneticsMocks.loadGeneticsHistory).toHaveBeenCalledWith('protein')
    expect(shared.callOrder).toEqual(['hydrate', 'genetics-load:protein'])
    expect(options).toEqual({
      proteinHistory: [
        expect.objectContaining({
          id: 'protein-1',
          analysisName: 'Protein result',
        }),
      ],
    })
  })
})
