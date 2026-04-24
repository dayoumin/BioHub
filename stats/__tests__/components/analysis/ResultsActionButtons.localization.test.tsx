import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { ResultsActionButtons } from '@/components/analysis/steps/results/ResultsActionButtons'

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('@/components/common/ConfirmAlertDialog', () => ({
  ConfirmAlertDialog: () => null,
}))

const terminology = {
  results: {
    buttons: {
      backToVariables: 'Back to Variables',
      reanalyze: 'Reanalyze with New Data',
      newAnalysis: 'New Analysis',
      changeMethod: 'Change Method',
      saveTemplate: 'Save as Template',
      moreActions: 'More',
      exportDocx: 'Word Document (DOCX)',
      exportExcel: 'Excel Spreadsheet',
      exportHtml: 'HTML (.html)',
    },
    exportDialog: {
      title: 'Export Options',
      description: 'Choose what to export.',
      formatLabel: 'Format',
      contentLabel: 'Content',
      includeInterpretation: 'Interpretation',
      includeRawData: 'Raw Data',
      includeMethodology: 'Methodology',
      includeReferences: 'References',
      cancel: 'Cancel',
      confirm: 'Export',
    },
    confirm: {
      backToVariables: {
        title: 'Return?',
        description: 'Return to variables.',
        confirm: 'Go',
        cancel: 'Cancel',
      },
      newAnalysis: {
        title: 'Start new?',
        description: 'Clear current result.',
        confirm: 'Start new',
        cancel: 'Cancel',
      },
      changeMethod: {
        title: 'Change method?',
        description: 'Current result will be removed.',
        confirm: 'Change method',
        cancel: 'Cancel',
      },
    },
    actionPanel: {
      title: 'Next actions',
      description: 'Choose whether to refine this result or start a separate analysis flow.',
      continueTitle: 'Continue with current result',
      continueDescription: 'Adjust variables or settings while keeping the same data and method.',
      restartTitle: 'Start a new flow',
      restartDescription: 'Begin again with new data or a new analysis goal, separate from the current result.',
      toolsEyebrow: 'Utilities',
      toolsTitle: 'Additional actions',
      toolsDescription: 'Change method, save a template, or open Graph Studio.',
      graphStudio: 'Graph Studio',
    },
  },
} as never

describe('ResultsActionButtons localization', () => {
  it('renders action panel and export labels from terminology', () => {
    render(
      <ResultsActionButtons
        onBackToVariables={vi.fn()}
        onOpenGraphStudio={vi.fn()}
        onReanalyze={vi.fn()}
        onNewAnalysisConfirm={vi.fn()}
        onChangeMethodConfirm={vi.fn()}
        onSaveTemplate={vi.fn()}
        exportDialogOpen={true}
        onExportDialogOpenChange={vi.fn()}
        exportFormat="docx"
        onExportFormatChange={vi.fn()}
        exportOptions={{
          includeInterpretation: true,
          includeRawData: false,
          includeMethodology: false,
          includeReferences: false,
        }}
        onExportOptionsChange={vi.fn()}
        onExportWithOptions={vi.fn()}
        isExporting={false}
        hasUploadedData={true}
        t={terminology}
      />,
    )

    expect(screen.getByText('Next actions')).toBeInTheDocument()
    expect(screen.getByText('Continue with current result')).toBeInTheDocument()
    expect(screen.getByText('Start a new flow')).toBeInTheDocument()
    expect(screen.getByText('Additional actions')).toBeInTheDocument()
    expect(screen.getByText('Word Document (DOCX)')).toBeInTheDocument()
    expect(screen.getByText('Excel Spreadsheet')).toBeInTheDocument()
    expect(screen.getByText('HTML (.html)')).toBeInTheDocument()
  })
})
