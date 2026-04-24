import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import PapersHub from '../PapersHub'

const shared = vi.hoisted(() => ({
  routerPush: vi.fn(),
  setShowHub: vi.fn(),
  loadDocumentBlueprints: vi.fn(),
  listPackages: vi.fn(),
  listProjectEntityRefs: vi.fn(),
  loadEntityHistories: vi.fn(),
  resolveEntities: vi.fn(),
  createDocumentWritingSession: vi.fn(),
  startWritingSession: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: shared.routerPush }),
}))

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: () => ({ analysisHistory: [] }),
}))

vi.mock('@/lib/stores/research-project-store', () => ({
  useResearchProjectStore: (selector: (state: { activeProject: { id: string; name: string; presentation?: { emoji?: string } } | null }) => unknown) => selector({
    activeProject: { id: 'proj-1', name: 'Project One', presentation: { emoji: '🧪' } },
  }),
  selectActiveProject: (state: { activeProject: { id: string; name: string; presentation?: { emoji?: string } } | null }) => state.activeProject,
}))

vi.mock('@/lib/stores/store-orchestration', () => ({
  loadAndRestoreHistory: vi.fn(),
}))

vi.mock('@/lib/stores/mode-store', () => ({
  useModeStore: () => shared.setShowHub,
}))

vi.mock('@/lib/research', () => ({
  loadEntityHistories: (...args: unknown[]) => shared.loadEntityHistories(...args),
  resolveEntities: (...args: unknown[]) => shared.resolveEntities(...args),
  listProjectEntityRefs: (...args: unknown[]) => shared.listProjectEntityRefs(...args),
}))

vi.mock('@/lib/research/document-blueprint-storage', () => ({
  loadDocumentBlueprints: (...args: unknown[]) => shared.loadDocumentBlueprints(...args),
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT: 'document-blueprints-changed',
}))

vi.mock('@/lib/research/paper-package-storage', () => ({
  listPackages: (...args: unknown[]) => shared.listPackages(...args),
  PAPER_PACKAGES_CHANGED_EVENT: 'paper-packages-changed',
}))

vi.mock('@/lib/research/document-writing-session', () => ({
  canCreateDocumentWritingSessionForEntityKind: (entityKind: string) => entityKind === 'protein-result',
  createDocumentWritingSession: (...args: unknown[]) => shared.createDocumentWritingSession(...args),
  startWritingSession: (...args: unknown[]) => shared.startWritingSession(...args),
}))

vi.mock('@/lib/research/entity-tab-registry', () => ({
  getTabEntry: () => ({ label: '단백질', icon: '🧬' }),
}))

vi.mock('../DocumentAssemblyDialog', () => ({
  __esModule: true,
  default: () => null,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe('PapersHub', () => {
  beforeEach(() => {
    shared.routerPush.mockReset()
    shared.setShowHub.mockReset()
    shared.loadDocumentBlueprints.mockReset()
    shared.listPackages.mockReset()
    shared.listProjectEntityRefs.mockReset()
    shared.loadEntityHistories.mockReset()
    shared.resolveEntities.mockReset()
    shared.createDocumentWritingSession.mockReset()
    shared.startWritingSession.mockReset()

    shared.loadDocumentBlueprints.mockResolvedValue([])
    shared.listPackages.mockReturnValue([])
    shared.listProjectEntityRefs.mockReturnValue([
      {
        id: 'ref-1',
        projectId: 'proj-1',
        entityKind: 'protein-result',
        entityId: 'protein-1',
        label: 'Protein result',
        createdAt: '2026-04-24T00:00:00.000Z',
      },
    ])
    shared.loadEntityHistories.mockResolvedValue({})
    shared.resolveEntities.mockReturnValue([
      {
        ref: {
          id: 'ref-1',
          projectId: 'proj-1',
          entityKind: 'protein-result',
          entityId: 'protein-1',
          label: 'Protein result',
          createdAt: '2026-04-24T00:00:00.000Z',
        },
        loaded: true,
        summary: {
          title: 'Protein properties',
          subtitle: '321 aa',
          date: 'today',
          timestamp: Date.now(),
        },
      },
    ])
    shared.createDocumentWritingSession.mockResolvedValue({ id: 'doc-created' })
    shared.startWritingSession.mockResolvedValue({ id: 'doc-blank' })
  })

  it('starts a manual blank writing session from the hero action', async () => {
    const onOpenDocument = vi.fn()

    render(<PapersHub onOpenDocument={onOpenDocument} />)

    fireEvent.click(screen.getByRole('button', { name: '새 문서' }))

    await waitFor(() => {
      expect(shared.startWritingSession).toHaveBeenCalledWith({
        mode: 'manual-blank',
        projectId: 'proj-1',
        title: 'Project One 새 문서',
      })
      expect(onOpenDocument).toHaveBeenCalledWith('doc-blank')
    })
  })

  it('shows bio/genetics quick-start cards and opens a writing session', async () => {
    const onOpenDocument = vi.fn()

    render(<PapersHub onOpenDocument={onOpenDocument} />)

    await waitFor(() => {
      expect(screen.getByText('바이오·유전 결과에서 바로 작성')).toBeInTheDocument()
      expect(screen.getByText('Protein properties')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Protein properties/i }))

    await waitFor(() => {
      expect(shared.createDocumentWritingSession).toHaveBeenCalledWith({
        projectId: 'proj-1',
        title: 'Protein properties 문서 초안',
        sourceEntityIds: {
          entityIds: ['protein-1'],
        },
      })
      expect(onOpenDocument).toHaveBeenCalledWith('doc-created')
    })
  })

  it('refreshes writing source cards when project refs change', async () => {
    render(<PapersHub onOpenDocument={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Protein properties')).toBeInTheDocument()
    })

    shared.resolveEntities.mockReturnValueOnce([
      {
        ref: {
          id: 'ref-2',
          projectId: 'proj-1',
          entityKind: 'protein-result',
          entityId: 'protein-2',
          label: 'Protein result 2',
          createdAt: '2026-04-24T00:00:00.000Z',
        },
        loaded: true,
        summary: {
          title: 'Updated protein properties',
          subtitle: '512 aa',
          date: 'today',
          timestamp: Date.now() + 1000,
        },
      },
    ])

    window.dispatchEvent(new CustomEvent('research-project-entity-refs-changed', {
      detail: { projectIds: ['proj-1'] },
    }))

    await waitFor(() => {
      expect(screen.getByText('Updated protein properties')).toBeInTheDocument()
    })
  })
})
