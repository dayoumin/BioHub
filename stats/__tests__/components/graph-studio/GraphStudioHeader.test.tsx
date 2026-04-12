import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GraphStudioHeader } from '@/components/graph-studio/GraphStudioHeader'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import type { ChartSpec } from '@/types/graph-studio'

vi.mock('@/components/graph-studio/panels/ExportDialog', () => ({
  ExportDialog: () => <div data-testid="graph-studio-export-dialog" />,
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
})
