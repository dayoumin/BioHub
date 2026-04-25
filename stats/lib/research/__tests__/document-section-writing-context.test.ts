import { describe, expect, it } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'
import { buildSectionWritingContext } from '../document-section-writing-context'

function makeDocument(): DocumentBlueprint {
  const now = '2026-04-24T00:00:00.000Z'
  return {
    id: 'doc_1',
    projectId: 'proj_1',
    preset: 'paper',
    title: 'Draft paper',
    language: 'en',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    sections: [
      {
        id: 'discussion',
        title: 'Discussion',
        content: '',
        sourceRefs: [],
        sectionSupportBindings: [
          {
            id: 'support_1',
            sourceKind: 'citation-record',
            sourceId: 'citation_1',
            role: 'comparison',
            label: 'Smith 2025',
            summary: 'Compare with recent pooled estimates.',
            excerpt: 'A similar direction was reported.',
            citationIds: ['citation_1'],
            included: true,
            origin: 'user',
          },
          {
            id: 'support_2',
            sourceKind: 'citation-record',
            sourceId: 'citation_2',
            role: 'limitation',
            label: 'Excluded source',
            summary: 'This should not be included.',
            citationIds: ['citation_2'],
            included: false,
            origin: 'user',
          },
        ],
        editable: true,
        generatedBy: 'user',
      },
    ],
  }
}

describe('buildSectionWritingContext', () => {
  it('normalizes included support bindings into writer-ready context', () => {
    const document = makeDocument()
    const section = document.sections[0]!

    const context = buildSectionWritingContext({ document, section })

    expect(context.sectionKind).toBe('discussion')
    expect(context.writingGoal).toContain('Interpret the findings')
    expect(context.supportItems).toHaveLength(1)
    expect(context.supportItems[0]?.label).toBe('Smith 2025')
    expect(context.citationIds).toEqual(['citation_1'])
    expect(context.supportMarkdown).toContain('Narrative Support Notes')
    expect(context.supportMarkdown).not.toContain('Excluded source')
  })
})
