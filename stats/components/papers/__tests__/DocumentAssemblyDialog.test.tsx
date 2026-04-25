import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DocumentAssemblyDialog from '../DocumentAssemblyDialog'

const shared = vi.hoisted(() => ({
  assembleDocument: vi.fn(),
  saveDocumentBlueprint: vi.fn(),
  listProjectEntityRefs: vi.fn(() => []),
  analysisHistory: [] as unknown[],
  listGraphProjects: vi.fn(() => []),
  loadBioToolHistory: vi.fn(() => []),
  loadAnalysisHistory: vi.fn(() => []),
  loadGeneticsHistory: vi.fn(() => []),
}))

vi.mock('@/lib/research/document-assembler', () => ({
  assembleDocument: (...args: unknown[]) => shared.assembleDocument(...args),
}))

vi.mock('@/lib/research/document-blueprint-storage', () => ({
  saveDocumentBlueprint: (...args: unknown[]) => shared.saveDocumentBlueprint(...args),
}))

vi.mock('@/lib/research/project-storage', () => ({
  listProjectEntityRefs: () => shared.listProjectEntityRefs(),
}))

vi.mock('@/lib/stores/history-store', () => ({
  useHistoryStore: () => ({ analysisHistory: shared.analysisHistory }),
}))

vi.mock('@/lib/graph-studio/project-storage', () => ({
  listProjects: () => shared.listGraphProjects(),
}))

vi.mock('@/lib/bio-tools/bio-tool-history', () => ({
  loadBioToolHistory: () => shared.loadBioToolHistory(),
}))

vi.mock('@/lib/genetics/analysis-history', () => ({
  loadAnalysisHistory: () => shared.loadAnalysisHistory(),
  loadGeneticsHistory: () => shared.loadGeneticsHistory(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}))

describe('DocumentAssemblyDialog', () => {
  beforeEach(() => {
    shared.assembleDocument.mockReset()
    shared.saveDocumentBlueprint.mockReset()
    shared.listProjectEntityRefs.mockClear()
    shared.listGraphProjects.mockClear()
    shared.loadBioToolHistory.mockClear()
    shared.loadAnalysisHistory.mockClear()
    shared.loadGeneticsHistory.mockClear()
    shared.analysisHistory = []
    shared.assembleDocument.mockReturnValue({
      id: 'doc-1',
      projectId: 'project-1',
      preset: 'paper',
      title: 'Draft',
      language: 'ko',
      sections: [],
      metadata: {},
      createdAt: '2026-04-25T00:00:00.000Z',
      updatedAt: '2026-04-25T00:00:00.000Z',
    })
    shared.saveDocumentBlueprint.mockImplementation(async (doc: unknown) => doc)
  })

  it('stores the selected journal profile snapshot when creating a paper document', async () => {
    const user = userEvent.setup()

    render(
      <DocumentAssemblyDialog
        open
        onOpenChange={vi.fn()}
        projectId="project-1"
        projectName="Project One"
        onCreated={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'APA' }))
    await user.type(screen.getByPlaceholderText('Target journal (optional)'), 'Example Journal')
    const titleInput = document.querySelector<HTMLInputElement>('#doc-title')
    expect(titleInput).not.toBeNull()
    if (titleInput) {
      fireEvent.change(titleInput, { target: { value: 'Draft' } })
    }
    await user.click(screen.getByRole('button', { name: '문서 만들기' }))

    await waitFor(() => expect(shared.assembleDocument).toHaveBeenCalledTimes(1))
    const assembleOptions = shared.assembleDocument.mock.calls[0]?.[0] as {
      metadata?: {
        targetJournalProfile?: {
          stylePreset?: string
          targetJournal?: string
        }
      }
    }
    expect(assembleOptions.metadata?.targetJournalProfile).toEqual(expect.objectContaining({
      stylePreset: 'apa',
      targetJournal: 'Example Journal',
    }))
  })
})
