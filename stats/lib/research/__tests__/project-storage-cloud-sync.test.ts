const projectCloudMocks = vi.hoisted(() => ({
  deleteCloudResearchProject: vi.fn(),
  fetchCloudProjectDetail: vi.fn(),
  linkCloudProjectEntityRef: vi.fn(),
  listCloudResearchProjects: vi.fn(),
  unlinkCloudProjectEntityRef: vi.fn(),
  upsertCloudResearchProject: vi.fn(),
}))

vi.mock('@/lib/research/project-cloud', () => projectCloudMocks)

describe('project-storage cloud sync', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()

    projectCloudMocks.deleteCloudResearchProject.mockReset()
    projectCloudMocks.fetchCloudProjectDetail.mockReset()
    projectCloudMocks.linkCloudProjectEntityRef.mockReset()
    projectCloudMocks.listCloudResearchProjects.mockReset()
    projectCloudMocks.unlinkCloudProjectEntityRef.mockReset()
    projectCloudMocks.upsertCloudResearchProject.mockReset()

    projectCloudMocks.deleteCloudResearchProject.mockResolvedValue(undefined)
    projectCloudMocks.fetchCloudProjectDetail.mockResolvedValue({ project: null, entities: [] })
    projectCloudMocks.linkCloudProjectEntityRef.mockResolvedValue(undefined)
    projectCloudMocks.listCloudResearchProjects.mockResolvedValue([])
    projectCloudMocks.unlinkCloudProjectEntityRef.mockResolvedValue(undefined)
    projectCloudMocks.upsertCloudResearchProject.mockResolvedValue(undefined)
  })

  it('prefers newer cloud project metadata during hydrate', async () => {
    const {
      hydrateResearchProjectsFromCloud,
      listResearchProjects,
      saveResearchProject,
    } = await import('../project-storage')

    saveResearchProject({
      id: 'proj-1',
      name: 'Local name',
      status: 'active',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    })

    projectCloudMocks.listCloudResearchProjects.mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Remote name',
        status: 'archived',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-02T00:00:00.000Z',
      },
    ])

    const hydrated = await hydrateResearchProjectsFromCloud(true)

    expect(hydrated).toEqual([
      expect.objectContaining({
        id: 'proj-1',
        name: 'Remote name',
        status: 'archived',
      }),
    ])
    expect(listResearchProjects()).toEqual(hydrated)
  })

  it('does not reinsert pending unlinks and preserves local refs that are absent from cloud detail', async () => {
    const {
      hydrateProjectRefsFromCloud,
      listProjectEntityRefs,
      removeProjectEntityRef,
      upsertProjectEntityRef,
    } = await import('../project-storage')

    upsertProjectEntityRef({
      projectId: 'proj-1',
      entityKind: 'protein-result',
      entityId: 'protein-1',
      label: 'Protein result',
    })
    upsertProjectEntityRef({
      projectId: 'proj-1',
      entityKind: 'analysis',
      entityId: 'analysis-1',
      label: 'Local analysis',
    })
    await Promise.resolve()

    projectCloudMocks.unlinkCloudProjectEntityRef.mockImplementation(
      () => new Promise<void>(() => {})
    )

    removeProjectEntityRef('proj-1', 'protein-result', 'protein-1')

    projectCloudMocks.fetchCloudProjectDetail.mockResolvedValue({
      project: null,
      entities: [
        {
          id: 'remote-pref-1',
          projectId: 'proj-1',
          entityKind: 'protein-result',
          entityId: 'protein-1',
          label: 'Stale protein result',
          createdAt: '2026-04-03T00:00:00.000Z',
          updatedAt: '2026-04-03T00:00:00.000Z',
        },
      ],
    })

    await hydrateProjectRefsFromCloud('proj-1')

    expect(listProjectEntityRefs('proj-1')).toEqual([
      expect.objectContaining({
        projectId: 'proj-1',
        entityKind: 'analysis',
        entityId: 'analysis-1',
        label: 'Local analysis',
      }),
    ])
  })

  it('keeps a local ref while its cloud link is still pending', async () => {
    const {
      hydrateProjectRefsFromCloud,
      listProjectEntityRefs,
      upsertProjectEntityRef,
    } = await import('../project-storage')

    projectCloudMocks.linkCloudProjectEntityRef.mockImplementation(
      () => new Promise<void>(() => {})
    )

    upsertProjectEntityRef({
      projectId: 'proj-1',
      entityKind: 'analysis',
      entityId: 'analysis-1',
      label: 'Local analysis',
    })

    projectCloudMocks.fetchCloudProjectDetail.mockResolvedValue({
      project: null,
      entities: [],
    })

    await hydrateProjectRefsFromCloud('proj-1')

    expect(listProjectEntityRefs('proj-1')).toEqual([
      expect.objectContaining({
        projectId: 'proj-1',
        entityKind: 'analysis',
        entityId: 'analysis-1',
        label: 'Local analysis',
      }),
    ])
  })

  it('syncs provenance edges to and from the cloud entity payload', async () => {
    const {
      hydrateProjectRefsFromCloud,
      listProjectEntityRefs,
      upsertProjectEntityRef,
    } = await import('../project-storage')

    upsertProjectEntityRef({
      projectId: 'proj-1',
      entityKind: 'figure',
      entityId: 'figure-1',
      label: 'Figure 1',
      provenanceEdges: [
        {
          role: 'derived-from',
          targetKind: 'analysis',
          targetId: 'analysis-1',
          label: 'T-Test',
        },
      ],
    })
    await Promise.resolve()

    expect(projectCloudMocks.linkCloudProjectEntityRef).toHaveBeenCalledWith(expect.objectContaining({
      provenanceEdges: [
        expect.objectContaining({
          targetKind: 'analysis',
          targetId: 'analysis-1',
        }),
      ],
    }))

    projectCloudMocks.fetchCloudProjectDetail.mockResolvedValue({
      project: null,
      entities: [
        {
          id: 'remote-pref-1',
          projectId: 'proj-1',
          entityKind: 'figure',
          entityId: 'figure-1',
          label: 'Figure 1',
          provenanceEdges: [
            {
              role: 'derived-from',
              targetKind: 'analysis',
              targetId: 'analysis-remote',
              label: 'Remote ANOVA',
            },
          ],
          createdAt: '2026-04-22T00:00:00.000Z',
          updatedAt: '2026-04-22T00:00:00.000Z',
        },
      ],
    })

    await hydrateProjectRefsFromCloud('proj-1')

    expect(listProjectEntityRefs('proj-1')).toEqual([
      expect.objectContaining({
        entityKind: 'figure',
        entityId: 'figure-1',
        provenanceEdges: [
          expect.objectContaining({
            targetKind: 'analysis',
            targetId: 'analysis-remote',
          }),
        ],
      }),
    ])
  })
})
