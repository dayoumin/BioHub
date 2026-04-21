import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import TemplateSaveModal from '@/components/analysis/TemplateSaveModal'

let mockLocale = 'en-US'

vi.mock('@/hooks/use-app-preferences', () => ({
  useAppPreferences: () => ({
    locale: mockLocale,
  }),
}))

vi.mock('@/hooks/use-terminology', () => ({
  useTerminology: () => ({
    template: {
      saveTitle: 'Save Template',
      saveDescription: 'Save current analysis settings.',
      errors: {
        nameRequired: 'Name is required',
        settingsIncomplete: 'Settings are incomplete',
        saveFailed: 'Save failed',
      },
      methodCategories: {
        't-test': 'T-Test',
      },
      variableLabels: {
        dependent: 'Dependent',
        independent: 'Independent',
        group: 'Group',
        factor: 'Factor',
      },
      labels: {
        nameRequired: 'Template Name',
        descriptionOptional: 'Description',
      },
      placeholders: {
        name: 'Enter template name',
        description: 'Describe this template',
      },
      buttons: {
        cancel: 'Cancel',
        saving: 'Saving',
        save: 'Save',
      },
    },
  }),
}))

vi.mock('@/lib/stores/template-store', () => ({
  useTemplateStore: () => ({
    createTemplate: vi.fn(),
  }),
}))

vi.mock('@/lib/stores/analysis-store', () => ({
  useAnalysisStore: () => ({
    selectedMethod: {
      id: 'independent-t-test',
      name: 'Independent T-Test',
      description: 'Compare two independent groups',
      category: 't-test',
    },
    analysisPurpose: 'compare',
    variableMapping: {
      dependentVar: 'score',
      groupVar: 'group',
    },
    uploadedFileName: 'scores.csv',
    uploadedData: [{ score: 10, group: 'A' }],
  }),
}))

describe('TemplateSaveModal', () => {
  beforeEach(() => {
    mockLocale = 'en-US'
  })

  it('uses app locale when creating the default template name', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-21T09:00:00Z'))

    render(<TemplateSaveModal open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByDisplayValue('Independent T-Test (Apr 21)')).toBeInTheDocument()

    vi.useRealTimers()
  })

  it('preserves in-progress edits when locale changes while the modal stays open', () => {
    const { rerender } = render(<TemplateSaveModal open={true} onOpenChange={vi.fn()} />)

    const nameInput = screen.getByLabelText('Template Name')
    fireEvent.change(nameInput, { target: { value: 'Custom Name' } })

    mockLocale = 'ko-KR'
    rerender(<TemplateSaveModal open={true} onOpenChange={vi.fn()} />)

    expect(screen.getByDisplayValue('Custom Name')).toBeInTheDocument()
  })
})
