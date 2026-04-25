import { describe, expect, it } from 'vitest'
import type { SectionWritingContext } from '../document-section-writing-context'
import { templateDocumentWriterEngine } from '../document-writer-engine'

function makeContext(): SectionWritingContext {
  return {
    documentId: 'doc_1',
    projectId: 'proj_1',
    documentTitle: 'Draft paper',
    language: 'en',
    sectionId: 'discussion',
    sectionTitle: 'Discussion',
    sectionKind: 'discussion',
    existingContent: '',
    sourceRefs: [],
    sources: [
      {
        sourceId: 'hist_1',
        sourceType: 'analysis',
        title: 'ANOVA',
        results: 'Group differences were significant.',
      },
    ],
    supportItems: [
      {
        id: 'support_1',
        sourceKind: 'citation-record',
        sourceId: 'citation_1',
        role: 'comparison',
        roleLabel: '비교',
        label: 'Smith 2025',
        summary: 'Compare the result direction.',
        excerpt: 'A similar direction was reported.',
        citationIds: ['citation_1'],
      },
    ],
    supportMarkdown: '### Narrative Support Notes\n\n- 비교: Smith 2025',
    citationIds: ['citation_1'],
    writingGoal: 'Interpret the findings against the attached literature.',
    journalRequirements: ['Style preset: imrad'],
  }
}

describe('templateDocumentWriterEngine', () => {
  it('renders a provider-neutral draft input with sources and support claims', async () => {
    const result = await templateDocumentWriterEngine.writeSection({
      provider: 'template',
      context: makeContext(),
    })

    expect(result.provider).toBe('template')
    expect(result.citationIds).toEqual(['citation_1'])
    expect(result.content).toContain('Discussion Writing Input')
    expect(result.content).toContain('Group differences were significant.')
    expect(result.content).toContain('Smith 2025')
    expect(result.content).toContain('Style preset: imrad')
    expect(result.content).not.toContain('Narrative Support Notes')
  })
})
