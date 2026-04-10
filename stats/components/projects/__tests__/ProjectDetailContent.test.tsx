import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ProjectEntityRef } from '@/lib/types/research'
import type { ResolvedEntity } from '@/lib/research'
import { ProjectDetailContent } from '../ProjectDetailContent'

const shared = vi.hoisted(() => ({
  refs: [] as ProjectEntityRef[],
  refreshProjects: vi.fn(),
  hydrateProjectRefsFromCloud: vi.fn(),
  hydrateResearchProjectsFromCloud: vi.fn(),
  loadEntityHistories: vi.fn(),
  removeProjectEntityRef: vi.fn(),
  resolveEntities: vi.fn(),
  toastSuccess: vi.fn(),
  routerPush: vi.fn(),
}))

function buildResolvedEntity(ref: ProjectEntityRef): ResolvedEntity {
  return {
    ref,
    loaded: true,
    summary: {
      title: ref.label ?? ref.entityId,
      date: 'today',
      timestamp: 1,
    },
  }
}

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: shared.routerPush }),
}))

vi.mock('@/lib/stores/research-project-store', () => ({
  useResearchProjectStore: (selector: (state: {
    projects: Array<{ id: string; name: string }>
    refreshProjects: () => void
  }) => unknown) => selector({
    projects: [{ id: 'proj-1', name: 'Project One' }],
    refreshProjects: shared.refreshProjects,
  }),
}))

vi.mock('@/lib/research', () => ({
  hydrateProjectRefsFromCloud: shared.hydrateProjectRefsFromCloud,
  hydrateResearchProjectsFromCloud: shared.hydrateResearchProjectsFromCloud,
  listProjectEntityRefs: vi.fn((projectId?: string) => (
    projectId ? shared.refs.filter(ref => ref.projectId === projectId) : shared.refs
  )),
  loadEntityHistories: shared.loadEntityHistories,
  removeProjectEntityRef: shared.removeProjectEntityRef,
  resolveEntities: shared.resolveEntities,
}))

vi.mock('../ProjectHeader', () => ({
  ProjectHeader: ({ project }: { project: { name: string } }) => <div>{project.name}</div>,
}))

vi.mock('../EntityBrowser', () => ({
  EntityBrowser: ({
    entities,
    onUnlink,
  }: {
    entities: ResolvedEntity[]
    onUnlink: (entity: ResolvedEntity) => void
  }) => (
    <div>
      {entities.map(entity => (
        <div key={entity.ref.entityId}>
          <span>{entity.summary.title}</span>
          <button type="button" onClick={() => onUnlink(entity)}>
            unlink-{entity.ref.entityId}
          </button>
        </div>
      ))}
    </div>
  ),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: shared.toastSuccess,
  },
}))

describe('ProjectDetailContent', () => {
  beforeEach(() => {
    shared.refs = [
      {
        id: 'pref-1',
        projectId: 'proj-1',
        entityKind: 'protein-result',
        entityId: 'protein-1',
        label: 'Protein result',
        createdAt: '2026-04-01T00:00:00.000Z',
      },
      {
        id: 'pref-2',
        projectId: 'proj-1',
        entityKind: 'analysis',
        entityId: 'analysis-1',
        label: 'Analysis result',
        createdAt: '2026-04-01T00:00:00.000Z',
      },
    ]

    shared.refreshProjects.mockReset()
    shared.hydrateProjectRefsFromCloud.mockReset()
    shared.hydrateResearchProjectsFromCloud.mockReset()
    shared.loadEntityHistories.mockReset()
    shared.removeProjectEntityRef.mockReset()
    shared.resolveEntities.mockReset()
    shared.toastSuccess.mockReset()
    shared.routerPush.mockReset()

    shared.hydrateResearchProjectsFromCloud.mockResolvedValue([])
    shared.hydrateProjectRefsFromCloud.mockResolvedValue(shared.refs)
    shared.loadEntityHistories.mockResolvedValue({})
    shared.resolveEntities.mockImplementation((refs: ProjectEntityRef[]) => refs.map(buildResolvedEntity))
    shared.removeProjectEntityRef.mockImplementation((
      projectId: string,
      entityKind: ProjectEntityRef['entityKind'],
      entityId: string,
    ) => {
      shared.refs = shared.refs.filter(ref => !(
        ref.projectId === projectId
        && ref.entityKind === entityKind
        && ref.entityId === entityId
      ))
    })

    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does not force a second cloud ref hydrate immediately after unlink', async () => {
    render(<ProjectDetailContent projectId="proj-1" />)

    await waitFor(() => {
      expect(screen.getByText('Protein result')).toBeInTheDocument()
      expect(screen.getByText('Analysis result')).toBeInTheDocument()
    })

    expect(shared.hydrateProjectRefsFromCloud).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'unlink-protein-1' }))

    await waitFor(() => {
      expect(screen.queryByText('Protein result')).not.toBeInTheDocument()
      expect(screen.getByText('Analysis result')).toBeInTheDocument()
    })

    expect(shared.removeProjectEntityRef).toHaveBeenCalledWith('proj-1', 'protein-result', 'protein-1')
    expect(shared.hydrateProjectRefsFromCloud).toHaveBeenCalledTimes(1)
  })
})
