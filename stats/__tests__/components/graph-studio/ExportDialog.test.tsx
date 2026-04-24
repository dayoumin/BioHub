import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ExportDialog } from '@/components/graph-studio/panels/ExportDialog'
import { useGraphStudioStore } from '@/lib/stores/graph-studio-store'
import type { ChartSpec } from '@/types/graph-studio'

vi.mock('@/lib/graph-studio/use-matplotlib-export', () => ({
  useMatplotlibExport: () => ({
    exportWithMatplotlib: vi.fn(),
    isExporting: false,
    progress: null,
    error: null,
    warnings: [],
    clearWarnings: vi.fn(),
  }),
}))

vi.mock('@/lib/graph-studio/matplotlib-compat', () => ({
  getMatplotlibCompatibilityReport: () => ({
    isExportable: true,
    blockingIssues: [],
    warningIssues: [],
  }),
  getMatplotlibSupportedChartTypeLabels: () => ['bar'],
}))

function makeSpec(): ChartSpec {
  return {
    version: '1.0',
    chartType: 'bar',
    title: 'Styled chart',
    data: { sourceId: 'src-1', columns: [] },
    encoding: {
      x: { field: 'group', type: 'nominal' },
      y: { field: 'value', type: 'quantitative' },
    },
    style: {
      preset: 'default',
      scheme: 'Set2',
      font: {
        family: 'Arial, Helvetica, sans-serif',
        size: 14,
        titleSize: 16,
        labelSize: 12,
        axisTitleSize: 12,
      },
      colors: ['#123456', '#abcdef'],
      background: '#fafafa',
      padding: 24,
      showDataLabels: true,
      showSampleCounts: true,
    },
    annotations: [],
    exportConfig: { format: 'png', dpi: 96 },
  }
}

describe('ExportDialog', () => {
  beforeEach(() => {
    act(() => {
      useGraphStudioStore.getState().resetAll()
      useGraphStudioStore.getState().setChartSpec(makeSpec())
    })
  })

  it('applies journal size preset without clobbering current style overrides', async () => {
    const user = userEvent.setup()
    const historyBefore = useGraphStudioStore.getState().specHistory.length
    const historyIndexBefore = useGraphStudioStore.getState().historyIndex

    render(<ExportDialog onExport={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '내보내기 설정 열기' }))
    await user.click(screen.getByRole('button', { name: 'Nature 단일 칼럼' }))

    const chartSpec = useGraphStudioStore.getState().chartSpec
    expect(chartSpec?.style).toMatchObject({
      preset: 'default',
      scheme: 'Set2',
      colors: ['#123456', '#abcdef'],
      background: '#fafafa',
      padding: 24,
      showDataLabels: true,
      showSampleCounts: true,
    })
    expect(chartSpec?.style.font).toMatchObject({
      family: 'Arial, Helvetica, sans-serif',
      size: 14,
      titleSize: 16,
      labelSize: 12,
      axisTitleSize: 12,
    })
    expect(chartSpec?.exportConfig).toMatchObject({
      dpi: 300,
      physicalWidth: 86,
      physicalHeight: 60,
    })
    expect(useGraphStudioStore.getState().specHistory).toHaveLength(historyBefore)
    expect(useGraphStudioStore.getState().historyIndex).toBe(historyIndexBefore)
  })
})
