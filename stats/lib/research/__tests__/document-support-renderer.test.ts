import { describe, expect, it } from 'vitest'
import type { DocumentBlueprint, DocumentSection } from '../document-blueprint-types'
import {
  buildRenderableDocument,
  buildRenderableSectionContent,
  renderSectionSupportMarkdown,
  stripRenderedSectionSupportMarkdown,
} from '../document-support-renderer'

function makeSection(overrides: Partial<DocumentSection> = {}): DocumentSection {
  return {
    id: 'discussion',
    title: '고찰',
    content: '',
    sourceRefs: [],
    editable: true,
    generatedBy: 'user',
    sectionSupportBindings: [{
      id: 'dsb_1',
      sourceKind: 'citation-record',
      sourceId: 'cit_1',
      role: 'comparison',
      label: 'Marine Ecology Review',
      summary: '핵심 비교 메모',
      excerpt: '초록 발췌 메모',
      included: true,
      origin: 'user',
    }],
    ...overrides,
  }
}

function makeDocument(section: DocumentSection): DocumentBlueprint {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: '문헌 메모 문서',
    language: 'ko',
    metadata: {},
    sections: [section],
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  }
}

describe('document-support-renderer', () => {
  it('renders support notes for writer context without promoting them into manuscript content', () => {
    const support = renderSectionSupportMarkdown(makeSection(), 'ko')
    const content = buildRenderableSectionContent(makeSection(), 'ko')

    expect(support).toContain('서술 근거 메모')
    expect(support).toContain('핵심 비교 메모')
    expect(support).toContain('초록 발췌 메모')
    expect(content).toBe('')
  })

  it('does not append support notes when a renderable document is rendered', () => {
    const once = buildRenderableDocument(makeDocument(makeSection({ content: '본문' })))
    const twice = buildRenderableDocument(once)

    const content = twice.sections[0]?.content ?? ''
    expect(content).toBe('본문')
    expect(content).not.toContain('서술 근거 메모')
  })
  it('removes stale rendered support blocks from manuscript content', () => {
    const firstContent = `${buildRenderableSectionContent(makeSection({ content: 'Body' }), 'ko')}\n\n${renderSectionSupportMarkdown(makeSection(), 'ko')}`
    const updatedContent = buildRenderableSectionContent(makeSection({
      content: firstContent,
      sectionSupportBindings: [{
        id: 'dsb_1',
        sourceKind: 'citation-record',
        sourceId: 'cit_1',
        role: 'comparison',
        label: 'Updated Review',
        summary: 'Updated claim memo',
        excerpt: 'Updated excerpt memo',
        included: true,
        origin: 'user',
      }],
    }), 'ko')

    expect(updatedContent).toBe('Body')
    expect(updatedContent).not.toContain('Updated Review')
    expect(updatedContent).not.toContain('Marine Ecology Review')
    expect(stripRenderedSectionSupportMarkdown(updatedContent, renderSectionSupportMarkdown(makeSection(), 'ko'))).toBe('Body')
  })
})
