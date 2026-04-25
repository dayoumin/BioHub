import { describe, expect, it } from 'vitest'
import {
  buildSourceSnapshotHashes,
  buildSourceEvidenceIndex,
  buildSourceEvidenceKey,
  getEvidenceKeysForSource,
} from '../document-source-evidence'
import {
  buildDocumentTableId,
  createDocumentSourceRef,
  type DocumentBlueprint,
  type DocumentTable,
} from '../document-blueprint-types'

function makeDocument(overrides: Partial<DocumentBlueprint> = {}): DocumentBlueprint {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: 'Draft',
    language: 'ko',
    metadata: {},
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T01:00:00.000Z',
    sections: [
      {
        id: 'results',
        title: 'Results',
        content: 'Results text',
        sourceRefs: [
          createDocumentSourceRef('analysis', 'hist-1', { label: 'ANOVA' }),
        ],
        tables: [
          {
            caption: 'Table 1. ANOVA',
            headers: ['F', 'p'],
            rows: [['4.2', '0.03']],
            sourceAnalysisId: 'hist-1',
            sourceAnalysisLabel: 'ANOVA',
          },
        ],
        figures: [
          {
            entityId: 'fig-1',
            label: 'Figure 1',
            caption: 'Figure 1. Growth',
            chartType: 'scatter',
            relatedAnalysisId: 'hist-1',
            relatedAnalysisLabel: 'ANOVA',
            patternSummary: 'Growth increased.',
          },
        ],
        sectionSupportBindings: [
          {
            id: 'support-1',
            sourceKind: 'citation-record',
            sourceId: 'citation-1',
            role: 'interpretation',
            label: 'Kim 2024',
            summary: 'Comparable result',
            linkedAnalysisIds: ['hist-1'],
            linkedFigureIds: ['fig-1'],
            included: true,
            origin: 'user',
          },
          {
            id: 'support-hidden',
            sourceKind: 'citation-record',
            sourceId: 'citation-hidden',
            role: 'interpretation',
            included: false,
            origin: 'user',
          },
        ],
        editable: true,
        generatedBy: 'user',
      },
    ],
    ...overrides,
  }
}

describe('document-source-evidence', () => {
  it('builds stable evidence items from section sources, tables, figures, and included support bindings', () => {
    const document = makeDocument()
    const table = document.sections[0]?.tables?.[0] as DocumentTable
    const tableId = buildDocumentTableId(table)

    const index = buildSourceEvidenceIndex(document)

    expect(index.items.map((item) => item.kind)).toEqual([
      'section-source',
      'table',
      'figure',
      'support-binding',
    ])
    expect(index.byKey[buildSourceEvidenceKey([
      'doc',
      'doc-1',
      'section',
      'results',
      'table',
      tableId,
    ])]).toEqual(expect.objectContaining({
      kind: 'table',
      artifactId: tableId,
      label: 'Table 1. ANOVA',
    }))
    expect(index.items.some((item) => item.artifactId === 'support-hidden')).toBe(false)
  })

  it('indexes evidence by section and source lookup keys without duplicates', () => {
    const index = buildSourceEvidenceIndex(makeDocument())

    expect(index.bySectionId.results).toHaveLength(4)

    const analysisEvidenceKeys = getEvidenceKeysForSource(index, {
      kind: 'analysis',
      sourceId: 'hist-1',
    })
    expect(analysisEvidenceKeys).toHaveLength(4)
    expect(new Set(analysisEvidenceKeys).size).toBe(4)

    const figureEvidenceKeys = getEvidenceKeysForSource(index, {
      kind: 'figure',
      sourceId: 'fig-1',
    })
    expect(figureEvidenceKeys).toHaveLength(2)
    expect(getEvidenceKeysForSource(index, {
      kind: 'citation-record',
      sourceId: 'citation-1',
    })).toHaveLength(1)
  })

  it('keeps stable keys when source labels change', () => {
    const first = buildSourceEvidenceIndex(makeDocument())
    const second = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          sourceRefs: [
            createDocumentSourceRef('analysis', 'hist-1', { label: 'Renamed analysis' }),
          ],
        },
      ],
    }))

    expect(first.items.map((item) => item.key)).toEqual(second.items.map((item) => item.key))
    expect(first.items.find((item) => item.kind === 'section-source')?.contentHash).toBe(
      second.items.find((item) => item.kind === 'section-source')?.contentHash,
    )
  })

  it('keeps explicit table keys stable while changing contentHash when table display content changes', () => {
    const first = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          tables: [
            {
              id: 'table-explicit',
              caption: 'Table 1. ANOVA',
              headers: ['F', 'p'],
              rows: [['4.2', '0.03']],
              sourceAnalysisId: 'hist-1',
            },
          ],
        },
      ],
    }))
    const second = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          tables: [
            {
              id: 'table-explicit',
              caption: 'Table 1. Updated ANOVA',
              headers: ['F', 'p'],
              rows: [['4.2', '0.03']],
              sourceAnalysisId: 'hist-1',
            },
          ],
        },
      ],
    }))

    const firstTable = first.items.find((item) => item.kind === 'table')
    const secondTable = second.items.find((item) => item.kind === 'table')

    expect(firstTable?.key).toBe(secondTable?.key)
    expect(firstTable?.contentHash).not.toBe(secondTable?.contentHash)
  })

  it('builds source snapshot hashes from evidence content by source', () => {
    const first = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          tables: [
            {
              id: 'table-explicit',
              caption: 'Table 1. ANOVA',
              headers: ['F', 'p'],
              rows: [['4.2', '0.03']],
              sourceAnalysisId: 'hist-1',
            },
          ],
        },
      ],
    }))
    const second = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          tables: [
            {
              id: 'table-explicit',
              caption: 'Table 1. Updated ANOVA',
              headers: ['F', 'p'],
              rows: [['4.2', '0.03']],
              sourceAnalysisId: 'hist-1',
            },
          ],
        },
      ],
    }))

    const firstHashes = buildSourceSnapshotHashes(first)
    const secondHashes = buildSourceSnapshotHashes(second)
    const analysisSourceKey = buildSourceEvidenceKey(['source', 'analysis', 'hist-1'])

    expect(firstHashes[analysisSourceKey]).toBeDefined()
    expect(firstHashes[analysisSourceKey]).not.toBe(secondHashes[analysisSourceKey])
  })

  it('keeps source snapshot hashes stable when display labels change', () => {
    const firstHashes = buildSourceSnapshotHashes(buildSourceEvidenceIndex(makeDocument()))
    const secondHashes = buildSourceSnapshotHashes(buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          title: 'Renamed section',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'hist-1', { label: 'Renamed analysis' }),
          ],
          tables: [
            {
              caption: 'Table 1. ANOVA',
              headers: ['F', 'p'],
              rows: [['4.2', '0.03']],
              sourceAnalysisId: 'hist-1',
              sourceAnalysisLabel: 'Renamed ANOVA',
            },
          ],
        },
      ],
    })))

    expect(firstHashes).toEqual(secondHashes)
  })

  it('uses separate source snapshot hashes per source kind and skips blank source ids', () => {
    const index = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          sectionSupportBindings: [
            {
              id: 'blank-support',
              sourceKind: 'citation-record',
              sourceId: '',
              role: 'interpretation',
              included: true,
              origin: 'user',
            },
          ],
        },
      ],
    }))
    const hashes = buildSourceSnapshotHashes(index)

    expect(hashes[buildSourceEvidenceKey(['source', 'analysis', 'hist-1'])]).toBeDefined()
    expect(hashes[buildSourceEvidenceKey(['source', 'figure', 'fig-1'])]).toBeDefined()
    expect(hashes[buildSourceEvidenceKey(['source', 'citation-record', ''])]).toBeUndefined()
  })

  it('keeps duplicate explicit artifact ids addressable instead of overwriting byKey', () => {
    const index = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          tables: [
            {
              id: 'duplicate-table',
              caption: 'Table A',
              headers: ['F'],
              rows: [['4.2']],
              sourceAnalysisId: 'hist-1',
            },
            {
              id: 'duplicate-table',
              caption: 'Table B',
              headers: ['p'],
              rows: [['0.03']],
              sourceAnalysisId: 'hist-2',
            },
          ],
        },
      ],
    }))

    const tableItems = index.items.filter((item) => item.kind === 'table')
    expect(tableItems).toHaveLength(2)
    expect(new Set(tableItems.map((item) => item.key)).size).toBe(2)
    expect(tableItems.every((item) => item.key.includes(':hash:'))).toBe(true)
    expect(Object.keys(index.byKey)).toHaveLength(index.items.length)
  })

  it('uses deterministic support keys when legacy support bindings have no id', () => {
    const document = makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          sectionSupportBindings: [
            {
              sourceKind: 'deep-research-note',
              sourceId: 'note-1',
              role: 'comparison',
              summary: 'Stable note',
              included: true,
              origin: 'user',
            },
          ] as unknown as NonNullable<DocumentBlueprint['sections'][number]['sectionSupportBindings']>,
        },
      ],
    })

    const first = buildSourceEvidenceIndex(document)
    const second = buildSourceEvidenceIndex(document)

    expect(first.items.find((item) => item.kind === 'support-binding')?.key).toBe(
      second.items.find((item) => item.kind === 'support-binding')?.key,
    )
  })

  it('normalizes legacy source refs before building evidence keys', () => {
    const index = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          id: 'results',
          title: 'Results',
          content: '',
          sourceRefs: [
            'legacy-source',
          ] as unknown as ReturnType<typeof createDocumentSourceRef>[],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))

    expect(getEvidenceKeysForSource(index, {
      kind: 'supplementary',
      sourceId: 'legacy-source',
    })).toHaveLength(1)
  })

  it('does not index whitespace-only table source ids as real sources', () => {
    const index = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          tables: [
            {
              id: 'table-with-blank-source',
              caption: 'Table 1',
              headers: ['F'],
              rows: [['4.2']],
              sourceAnalysisId: '   ',
            },
          ],
        },
      ],
    }))

    const tableItem = index.items.find((item) => item.artifactId === 'table-with-blank-source')
    expect(tableItem?.sourceRefs).toEqual([])
    expect(getEvidenceKeysForSource(index, { kind: 'analysis', sourceId: '   ' })).toEqual([])
  })

  it('separates identical source ids with different source kinds', () => {
    const index = buildSourceEvidenceIndex(makeDocument({
      sections: [
        {
          id: 'results',
          title: 'Results',
          content: '',
          sourceRefs: [
            createDocumentSourceRef('analysis', 'shared'),
            createDocumentSourceRef('figure', 'shared'),
          ],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))

    expect(getEvidenceKeysForSource(index, { kind: 'analysis', sourceId: 'shared' })).toHaveLength(1)
    expect(getEvidenceKeysForSource(index, { kind: 'figure', sourceId: 'shared' })).toHaveLength(1)
    expect(getEvidenceKeysForSource(index, { kind: 'analysis', sourceId: 'shared' })[0]).not.toBe(
      getEvidenceKeysForSource(index, { kind: 'figure', sourceId: 'shared' })[0],
    )
  })
})
