import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DocumentSectionList from '../DocumentSectionList'
import type {
  DocumentSection,
  DocumentWritingSectionState,
} from '@/lib/research/document-blueprint-types'

function makeSection(id: string, title: string, content = ''): DocumentSection {
  return {
    id,
    title,
    content,
    sourceRefs: [],
    editable: true,
    generatedBy: 'user',
  }
}

function renderSectionList(
  sections: DocumentSection[],
  activeSectionId: string,
  sectionStates: Record<string, DocumentWritingSectionState> = {},
): ReturnType<typeof render> {
  return render(
    <DocumentSectionList
      sections={sections}
      sectionStates={sectionStates}
      activeSectionId={activeSectionId}
      onSelectSection={vi.fn()}
      onReorder={vi.fn()}
      onDeleteSection={vi.fn()}
      onRenameSection={vi.fn()}
      onAddSection={vi.fn()}
    />,
  )
}

describe('DocumentSectionList', () => {
  it('moves the active section surface when selection changes', () => {
    const sections = [
      makeSection('intro', 'Introduction', 'draft'),
      makeSection('results', 'Results'),
    ]

    const { rerender } = renderSectionList(sections, 'intro')

    expect(screen.getByTestId('document-section-row-intro')).toHaveClass('bg-surface-container-highest')
    expect(screen.getByTestId('document-section-row-results')).toHaveClass('bg-surface-container-low')

    rerender(
      <DocumentSectionList
        sections={sections}
        activeSectionId="results"
        onSelectSection={vi.fn()}
        onReorder={vi.fn()}
        onDeleteSection={vi.fn()}
        onRenameSection={vi.fn()}
        onAddSection={vi.fn()}
      />,
    )

    expect(screen.getByTestId('document-section-row-results')).toHaveClass('bg-surface-container-highest')
  })

  it('renders compact writing chips for section-level progress', () => {
    renderSectionList(
      [
        makeSection('drafting', 'Drafting'),
        makeSection('patched', 'Patched'),
        makeSection('skipped', 'Skipped'),
        makeSection('failed', 'Failed'),
      ],
      'drafting',
      {
        drafting: { status: 'drafting' },
        patched: { status: 'patched' },
        skipped: { status: 'skipped' },
        failed: { status: 'failed' },
      },
    )

    expect(screen.getByTestId('document-section-writing-drafting')).toHaveTextContent('\uC791\uC131 \uC911')
    expect(screen.getByTestId('document-section-writing-patched')).toHaveTextContent('\uBC18\uC601\uB428')
    expect(screen.getByTestId('document-section-writing-skipped')).toHaveTextContent('\uBCF4\uC874')
    expect(screen.getByTestId('document-section-writing-failed')).toHaveTextContent('\uC2E4\uD328')
  })
})
