import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createDocumentSourceRef,
  type DocumentBlueprint,
} from '../document-blueprint-types'

const storageMocks = vi.hoisted(() => ({
  loadAllDocumentBlueprints: vi.fn(),
  loadDocumentBlueprints: vi.fn(),
  listProjectEntityRefs: vi.fn(),
}))

vi.mock('../document-blueprint-storage', () => ({
  loadAllDocumentBlueprints: storageMocks.loadAllDocumentBlueprints,
  loadDocumentBlueprints: storageMocks.loadDocumentBlueprints,
}))

vi.mock('../project-storage', () => ({
  listProjectEntityRefs: storageMocks.listProjectEntityRefs,
}))

import {
  findDocumentSourceUsages,
  loadDocumentSourceUsages,
} from '../document-source-usage'

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
  beforeEach(() => {
    storageMocks.loadAllDocumentBlueprints.mockReset()
    storageMocks.loadDocumentBlueprints.mockReset()
    storageMocks.listProjectEntityRefs.mockReset()
  })

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
                id: 'table_1',
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
        artifactId: 'table_1',
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
        artifactId: 'figure_1',
      }),
    ])
  })

  it('prefilters project documents through canonical draft provenance edges before scanning locations', async () => {
    const documents = [
      makeDocument({
        id: 'doc-1',
        title: '문서 A',
        sections: [
          {
            id: 'results-a',
            title: '결과 A',
            content: 'content',
            sourceRefs: [createDocumentSourceRef('analysis', 'hist_1')],
            editable: true,
            generatedBy: 'user',
          },
        ],
      }),
      makeDocument({
        id: 'doc-2',
        title: '문서 B',
        sections: [
          {
            id: 'results-b',
            title: '결과 B',
            content: 'content',
            sourceRefs: [createDocumentSourceRef('analysis', 'hist_1')],
            editable: true,
            generatedBy: 'user',
          },
        ],
      }),
    ]

    storageMocks.loadDocumentBlueprints.mockResolvedValue(documents)
    storageMocks.listProjectEntityRefs.mockReturnValue([
      {
        id: 'pref-1',
        projectId: 'project-1',
        entityKind: 'draft',
        entityId: 'doc-2',
        label: '문서 B',
        provenanceEdges: [{
          role: 'uses',
          targetKind: 'analysis',
          targetId: 'hist_1',
          label: 'ANAL-01',
        }],
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])

    const usages = await loadDocumentSourceUsages('hist_1', { projectId: 'project-1' })

    expect(usages).toEqual([
      expect.objectContaining({
        documentId: 'doc-2',
        sectionId: 'results-b',
        kind: 'section',
      }),
    ])
  })

  it('falls back to document scanning when draft provenance edges are missing', async () => {
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
          },
        ],
      }),
    ]

    storageMocks.loadDocumentBlueprints.mockResolvedValue(documents)
    storageMocks.listProjectEntityRefs.mockReturnValue([
      {
        id: 'pref-2',
        projectId: 'project-1',
        entityKind: 'draft',
        entityId: 'doc-1',
        label: '문서 A',
        provenanceEdges: [{
          role: 'uses',
          targetKind: 'analysis',
          targetId: 'other-analysis',
        }],
        createdAt: '2026-04-21T00:00:00.000Z',
        updatedAt: '2026-04-21T00:00:00.000Z',
      },
    ])

    const usages = await loadDocumentSourceUsages('hist_1', { projectId: 'project-1' })

    expect(usages).toEqual([
      expect.objectContaining({
        documentId: 'doc-1',
        sectionId: 'results',
        kind: 'section',
      }),
    ])
  })
})
