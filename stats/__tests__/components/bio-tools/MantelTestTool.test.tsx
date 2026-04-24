import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode, RefObject } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MantelTestTool from '@/components/bio-tools/tools/MantelTestTool'
import { getBioToolWithMeta } from '@/lib/bio-tools/bio-tool-metadata'
import type { BioToolHistoryEntry } from '@/lib/bio-tools/bio-tool-history'
import type { CsvData } from '@/components/bio-tools/BioCsvUpload'

const scrollRef = { current: null } as RefObject<HTMLDivElement | null>
const pyodideCallWorkerMethodMock = vi.fn()

vi.mock('@/components/bio-tools/BioCsvUpload', () => ({
  BioCsvUpload: ({
    description,
    onDataLoaded,
  }: {
    description: string
    onDataLoaded: (data: CsvData) => void
  }): ReactElement => {
    const buttonLabel = description.includes('첫 번째') ? '거리행렬 X 업로드' : '거리행렬 Y 업로드'
    return (
      <button
        type="button"
        onClick={() => onDataLoaded({
          headers: ['site', 'value'],
          rows: [{ site: 'A', value: '1' }, { site: 'B', value: '2' }],
          fileName: buttonLabel,
        })}
      >
        {buttonLabel}
      </button>
    )
  },
}))

vi.mock('@/components/bio-tools/BioErrorBanner', () => ({
  BioErrorBanner: ({ error }: { error: string | null }) => error ? <div>{error}</div> : null,
}))

vi.mock('@/components/bio-tools/BioColumnSelect', () => ({
  BioColumnSelect: () => <div>column-select</div>,
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button type="button" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span>선택...</span>,
}))

vi.mock('@/hooks/use-scroll-to-results', () => ({
  useScrollToResults: () => scrollRef,
}))

vi.mock('@/components/bio-tools/BioResultsHeader', () => ({
  BioResultsHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/common/results', () => ({
  BioResultSummary: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/lib/bio-tools/bio-export-tables', () => ({
  getBioExportTables: () => [],
}))

vi.mock('@/components/bio-tools/BioToolIntro', () => ({
  BioToolIntro: () => <div>intro</div>,
}))

vi.mock('@/lib/stores/research-project-store', () => ({
  useResearchProjectStore: {
    getState: () => ({}),
  },
  selectActiveProject: () => null,
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/services/pyodide/core/pyodide-core.service', () => ({
  PyodideCoreService: {
    getInstance: () => ({
      callWorkerMethod: pyodideCallWorkerMethodMock,
    }),
  },
}))

describe('MantelTestTool', () => {
  beforeEach(() => {
    pyodideCallWorkerMethodMock.mockReset()
  })

  it('hides restored-history provenance after a fresh analysis starts and completes', async () => {
    const found = getBioToolWithMeta('mantel-test')
    if (!found) {
      throw new Error('Mantel tool metadata not found')
    }

    const initialEntry: BioToolHistoryEntry = {
      id: 'bio-mantel-history',
      toolId: 'mantel-test',
      toolNameEn: 'Mantel Test',
      toolNameKo: 'Mantel 검정',
      csvFileName: 'restored-x.csv + restored-y.csv',
      columnConfig: {
        siteColX: 'site',
        siteColY: 'site',
        method: 'pearson',
      },
      results: {
        r: 0.42,
        pValue: 0.03,
        method: 'pearson',
        permutations: 999,
      },
      createdAt: Date.now(),
    }

    pyodideCallWorkerMethodMock
      .mockResolvedValueOnce({ distanceMatrix: [[0, 1], [1, 0]] })
      .mockResolvedValueOnce({ distanceMatrix: [[0, 2], [2, 0]] })
      .mockResolvedValueOnce({
        r: 0.11,
        pValue: 0.2,
        method: 'pearson',
        permutations: 999,
      })

    render(
      <MantelTestTool
        tool={found.tool}
        meta={found.meta}
        initialEntry={initialEntry}
      />,
    )

    expect(screen.getByText('히스토리에서 복원된 결과')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '거리행렬 X 업로드' }))
    fireEvent.click(screen.getByRole('button', { name: '거리행렬 Y 업로드' }))

    await waitFor(() => {
      expect(screen.queryByText('히스토리에서 복원된 결과')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: '분석 실행' }))

    await waitFor(() => {
      expect(pyodideCallWorkerMethodMock).toHaveBeenCalledTimes(3)
    })

    expect(screen.queryByText('히스토리에서 복원된 결과')).not.toBeInTheDocument()
  })
})
