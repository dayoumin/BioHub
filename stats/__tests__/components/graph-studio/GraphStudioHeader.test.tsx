import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphStudioHeader } from '@/components/graph-studio/GraphStudioHeader'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import type { ChartSpec } from '@/types/graph-studio'

function createDeferred<T>(): {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const {
  mockRouterPush,
  mockLoadDocumentSourceUsages,
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
} = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockLoadDocumentSourceUsages: vi.fn(),
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT: 'document-blueprints-changed',
}))

vi.mock('@/components/graph-studio/panels/ExportDialog', () => ({
  ExportDialog: () => <div data-testid="graph-studio-export-dialog" />,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

vi.mock('@/lib/research/document-source-usage', () => ({
  loadDocumentSourceUsages: (sourceId: string) => mockLoadDocumentSourceUsages(sourceId),
}))

vi.mock('@/lib/research/document-blueprint-storage', () => ({
  DOCUMENT_BLUEPRINTS_CHANGED_EVENT,
}))

function makeSpec(title = 'Test Chart'): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title,
    data: { sourceId: 'src-1', columns: [] },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: { preset: 'default' },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
  }
}

function makeProject(spec: ChartSpec) {
  const now = new Date().toISOString()
  return {
    id: 'project-1',
    name: 'Saved Chart',
    chartSpec: spec,
    dataPackageId: 'pkg-1',
    createdAt: now,
    updatedAt: now,
  }
}

describe('GraphStudioHeader', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    mockRouterPush.mockReset()
    mockLoadDocumentSourceUsages.mockReset()
    mockLoadDocumentSourceUsages.mockResolvedValue([])
    act(() => {
      useGraphStudioStore.getState().resetAll()
    })
  })

  it('asks for confirmation before clearing an unsaved chart session', async () => {
    const user = userEvent.setup()

    act(() => {
      useGraphStudioStore.getState().setChartSpec(makeSpec())
    })

    render(<GraphStudioHeader />)

    await user.click(screen.getByTestId('graph-studio-new-chart'))

    expect(useGraphStudioStore.getState().chartSpec).not.toBeNull()
    expect(screen.getByText('새 차트를 만드시겠습니까?')).toBeInTheDocument()
  })

  it('clears the session after confirming new chart creation', async () => {
    const user = userEvent.setup()

    act(() => {
      useGraphStudioStore.getState().setChartSpec(makeSpec())
    })

    render(<GraphStudioHeader />)

    await user.click(screen.getByTestId('graph-studio-new-chart'))
    await user.click(screen.getByRole('button', { name: '새 차트 만들기' }))

    expect(useGraphStudioStore.getState().chartSpec).toBeNull()
    expect(useGraphStudioStore.getState().dataPackage).toBeNull()
  })

  it('clears a clean saved chart without showing the confirmation dialog', async () => {
    const user = userEvent.setup()
    const spec = makeSpec()

    act(() => {
      useGraphStudioStore.getState().setProject(makeProject(spec))
    })

    render(<GraphStudioHeader />)

    await user.click(screen.getByTestId('graph-studio-new-chart'))

    expect(useGraphStudioStore.getState().chartSpec).toBeNull()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('shows a disabled saving state while a save is in progress', () => {
    act(() => {
      useGraphStudioStore.getState().setChartSpec(makeSpec())
    })

    render(<GraphStudioHeader onSave={vi.fn()} isSaving />)

    const saveButton = screen.getByTestId('graph-studio-save')
    expect(saveButton).toBeDisabled()
    expect(saveButton).toHaveTextContent('저장 중...')
  })

  it('links to a document that uses the current figure project', async () => {
    const user = userEvent.setup()
    const spec = makeSpec()
    mockLoadDocumentSourceUsages.mockResolvedValue([
      {
        documentId: 'doc-1',
        documentTitle: '논문 초안',
        sectionId: 'results',
        sectionTitle: '결과',
        kind: 'figure',
        label: 'Figure 1',
      },
    ])

    act(() => {
      useGraphStudioStore.getState().setProject(makeProject(spec))
    })

    render(<GraphStudioHeader />)

    await user.click(await screen.findByRole('button', { name: '논문 초안' }))

    expect(mockLoadDocumentSourceUsages).toHaveBeenCalledWith('project-1')
    expect(mockRouterPush).toHaveBeenCalledWith('/papers?doc=doc-1&section=results')
  })

  it('reloads document usages when papers change and shows explicit destinations', async () => {
    const spec = makeSpec()
    mockLoadDocumentSourceUsages
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          documentId: 'doc-1',
          documentTitle: '논문 초안',
          sectionId: 'results',
          sectionTitle: '결과',
          kind: 'figure',
          label: 'Figure 1',
        },
        {
          documentId: 'doc-2',
          documentTitle: '보고서',
          sectionId: 'results',
          sectionTitle: '결과',
          kind: 'figure',
          label: 'Figure 2',
        },
      ])

    act(() => {
      useGraphStudioStore.getState().setProject(makeProject(spec))
    })

    render(<GraphStudioHeader />)

    expect(screen.queryByRole('button', { name: '논문 초안' })).not.toBeInTheDocument()

    await act(async () => {
      window.dispatchEvent(new CustomEvent(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, {
        detail: { projectId: 'project-1', documentId: 'doc-1', action: 'saved' },
      }))
    })

    expect(await screen.findByRole('button', { name: '논문 초안' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '보고서' })).toBeInTheDocument()
    expect(mockLoadDocumentSourceUsages).toHaveBeenCalledTimes(2)
  })

  it('keeps the newest document usages when an older request resolves later', async () => {
    const spec = makeSpec()
    const firstRequest = createDeferred<Array<{
      documentId: string
      documentTitle: string
      sectionId: string
      sectionTitle: string
      kind: 'section' | 'table' | 'figure'
      label: string
    }>>()
    const secondRequest = createDeferred<Array<{
      documentId: string
      documentTitle: string
      sectionId: string
      sectionTitle: string
      kind: 'section' | 'table' | 'figure'
      label: string
    }>>()

    mockLoadDocumentSourceUsages
      .mockImplementationOnce(() => firstRequest.promise)
      .mockImplementationOnce(() => secondRequest.promise)

    act(() => {
      useGraphStudioStore.getState().setProject(makeProject(spec))
    })

    render(<GraphStudioHeader />)

    await act(async () => {
      window.dispatchEvent(new CustomEvent(DOCUMENT_BLUEPRINTS_CHANGED_EVENT, {
        detail: { projectId: 'project-1', documentId: 'doc-2', action: 'saved' },
      }))
    })

    await act(async () => {
      secondRequest.resolve([
        {
          documentId: 'doc-2',
          documentTitle: '최신 문서',
          sectionId: 'results',
          sectionTitle: '결과',
          kind: 'figure',
          label: 'Figure 2',
        },
      ])
      await secondRequest.promise
    })

    expect(await screen.findByRole('button', { name: '최신 문서' })).toBeInTheDocument()

    await act(async () => {
      firstRequest.resolve([
        {
          documentId: 'doc-1',
          documentTitle: '오래된 문서',
          sectionId: 'results',
          sectionTitle: '결과',
          kind: 'figure',
          label: 'Figure 1',
        },
      ])
      await firstRequest.promise
    })

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '오래된 문서' })).not.toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: '최신 문서' })).toBeInTheDocument()
  })
})
