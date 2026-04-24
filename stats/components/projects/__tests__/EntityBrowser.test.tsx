import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ResolvedEntity } from '@/lib/research/entity-resolver'
import { EntityBrowser } from '../EntityBrowser'

const shared = vi.hoisted(() => ({
  createDocumentWritingSession: vi.fn(),
  onNavigate: vi.fn(),
  onUnlink: vi.fn(),
}))

vi.mock('@/lib/research/entity-tab-registry', () => ({
  ENTITY_TAB_REGISTRY: [
    { id: 'protein-result', label: '단백질', icon: '🧬', emptyMessage: 'empty' },
  ],
  loadTabSettings: () => ({ 'protein-result': true }),
  getTabEntry: () => ({ id: 'protein-result', label: '단백질', icon: '🧬', emptyMessage: 'empty' }),
}))

vi.mock('@/lib/research/source-navigation', () => ({
  buildDocumentEditorUrl: (documentId: string) => `/papers?doc=${documentId}`,
}))

vi.mock('@/lib/research/document-writing-session', () => ({
  canCreateDocumentWritingSessionForEntityKind: (entityKind: string) => entityKind === 'protein-result',
  createDocumentWritingSession: (...args: unknown[]) => shared.createDocumentWritingSession(...args),
}))

vi.mock('../ReportComposer', () => ({
  ReportComposer: () => null,
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe('EntityBrowser', () => {
  beforeEach(() => {
    shared.createDocumentWritingSession.mockReset()
    shared.onNavigate.mockReset()
    shared.onUnlink.mockReset()
    shared.createDocumentWritingSession.mockResolvedValue({ id: 'doc-created' })
  })

  it('starts a writing session from a project bio/genetics entity', async () => {
    const entities: ResolvedEntity[] = [
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
    ]

    render(
      <EntityBrowser
        entities={entities}
        projectId="proj-1"
        projectName="Project One"
        onNavigate={shared.onNavigate}
        onUnlink={shared.onUnlink}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: '자료 작성' }))

    await waitFor(() => {
      expect(shared.createDocumentWritingSession).toHaveBeenCalledWith({
        projectId: 'proj-1',
        title: 'Protein properties 문서 초안',
        sourceEntityIds: {
          entityIds: ['protein-1'],
        },
      })
      expect(shared.onNavigate).toHaveBeenCalledWith('/papers?doc=doc-created')
    })
  })
})
