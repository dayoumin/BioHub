import { describe, expect, it } from 'vitest'
import {
  createDocumentSourceRef,
  type DocumentBlueprint,
} from '../document-blueprint-types'
import { findDocumentSourceUsages } from '../document-source-usage'

function makeDocument(
  overrides: Partial<DocumentBlueprint> = {},
): DocumentBlueprint {
  const now = '2026-04-21T00:00:00.000Z'
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: '문서 A',
    language: 'ko',
    metadata: {},
    createdAt: now,
    updatedAt: now,
    sections: [],
    ...overrides,
  }
}

describe('findDocumentSourceUsages', () => {
  it('deduplicates overlapping section and nested provenance into one section destination', () => {
    const documents = [
      makeDocument({
        sections: [
          {
            id: 'results',
            title: '결과',
            content: 'content',
            sourceRefs: [createDocumentSourceRef('analysis', 'hist_1')],
            editable: true,
            generatedBy: 'user',
            tables: [
              {
                caption: 'Table 1',
                headers: ['A'],
                rows: [['1']],
                sourceAnalysisId: 'hist_1',
                sourceAnalysisLabel: 't-test',
              },
            ],
            figures: [
              {
                entityId: 'figure_1',
                label: 'Figure 1',
                caption: 'Bar chart',
                relatedAnalysisId: 'hist_1',
              },
            ],
          },
        ],
      }),
    ]

    const usages = findDocumentSourceUsages(documents, 'hist_1')

    expect(usages).toEqual([
      expect.objectContaining({
        documentId: 'doc-1',
        sectionId: 'results',
        kind: 'table',
        label: 'Table 1',
      }),
    ])
  })

  it('finds a single section-aware usage for a Graph Studio figure source', () => {
    const documents = [
      makeDocument({
        sections: [
          {
            id: 'results',
            title: '결과',
            content: 'content',
            sourceRefs: [createDocumentSourceRef('figure', 'figure_1')],
            editable: true,
            generatedBy: 'user',
            figures: [
              {
                entityId: 'figure_1',
                label: 'Figure 1',
                caption: 'Bar chart',
              },
            ],
          },
        ],
      }),
    ]

    const usages = findDocumentSourceUsages(documents, 'figure_1')

    expect(usages).toEqual([
      expect.objectContaining({
        documentId: 'doc-1',
        sectionId: 'results',
        kind: 'figure',
        label: 'Figure 1',
      }),
    ])
  })
})
