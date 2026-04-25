import { describe, expect, it } from 'vitest'
import {
  DOCUMENT_PREFLIGHT_RULE_ENGINE_VERSION,
  runDocumentPreflightRules,
} from '../document-preflight-rules'
import {
  createDocumentSourceRef,
  type DocumentBlueprint,
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
            id: 'table-1',
            caption: 'Table 1. ANOVA',
            headers: ['F', 'p'],
            rows: [['4.2', '0.03']],
            sourceAnalysisId: 'hist-1',
            sourceAnalysisLabel: 'ANOVA',
          },
        ],
        figures: [
          {
            entityId: 'figure-1',
            label: 'Figure 1',
            caption: 'Figure 1. Growth',
            relatedAnalysisId: 'hist-1',
          },
        ],
        sectionSupportBindings: [
          {
            id: 'support-1',
            sourceKind: 'citation-record',
            sourceId: 'citation-1',
            role: 'interpretation',
            included: true,
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

function runPreflight(document: DocumentBlueprint): ReturnType<typeof runDocumentPreflightRules> {
  return runDocumentPreflightRules(document, {
    reportId: 'report-1',
    generatedAt: '2026-04-25T02:00:00.000Z',
  })
}

describe('document-preflight-rules', () => {
  it('returns a completed empty report for a source-backed document with captions', () => {
    const report = runPreflight(makeDocument())

    expect(report.status).toBe('completed')
    expect(report.snapshot.ruleEngineVersion).toBe(DOCUMENT_PREFLIGHT_RULE_ENGINE_VERSION)
    expect(Object.keys(report.snapshot.sourceSnapshotHashes)).toContain('source:analysis:hist-1')
    expect(report.findings).toEqual([])
    expect(report.summary.totalFindings).toBe(0)
  })

  it('flags documents without any source evidence', () => {
    const report = runPreflight(makeDocument({
      sections: [
        {
          id: 'discussion',
          title: 'Discussion',
          content: 'Narrative only.',
          sourceRefs: [],
          editable: true,
          generatedBy: 'user',
        },
      ],
    }))

    expect(report.findings).toEqual([
      expect.objectContaining({
        ruleId: 'document.sources.none',
        severity: 'warning',
        sectionId: undefined,
      }),
    ])
    expect(report.summary.warning).toBe(1)
  })

  it('flags table caption and source problems with deterministic finding ids', () => {
    const report = runPreflight(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          tables: [
            {
              id: 'table-bad',
              caption: '',
              headers: ['F'],
              rows: [['4.2']],
            },
          ],
        },
      ],
    }))

    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      'table.caption.missing',
      'table.source.missing',
    ])
    expect(report.findings.map((finding) => finding.id)).toEqual([
      'finding:report-1:doc-1:table.caption.missing:results:table-bad',
      'finding:report-1:doc-1:table.source.missing:results:table-bad',
    ])
    expect(report.findings[0]?.evidence).toEqual([
      expect.objectContaining({
        sourceId: 'table-bad',
        sourceKind: 'document-artifact',
      }),
    ])
    expect(report.summary.warning).toBe(2)
    expect(report.summary.error).toBe(0)
  })

  it('flags missing figure captions without requiring related analysis', () => {
    const report = runPreflight(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          figures: [
            {
              entityId: 'figure-empty-caption',
              label: 'Figure 1',
              caption: '',
            },
          ],
        },
      ],
    }))

    expect(report.findings).toEqual([
      expect.objectContaining({
        ruleId: 'figure.caption.missing',
        severity: 'warning',
        sectionId: 'results',
      }),
    ])
  })

  it('ignores excluded support bindings but flags included broken support metadata', () => {
    const report = runPreflight(makeDocument({
      sections: [
        {
          ...makeDocument().sections[0],
          sectionSupportBindings: [
            {
              id: 'support-excluded',
              sourceKind: 'citation-record',
              sourceId: '',
              role: 'interpretation',
              included: false,
              origin: 'user',
            },
            {
              id: 'support-bad',
              sourceKind: 'reference-package',
              sourceId: '',
              role: 'comparison',
              citationIds: ['citation-1', ''],
              included: true,
              origin: 'user',
            },
          ],
        },
      ],
    }))

    expect(report.findings.map((finding) => finding.ruleId)).toEqual([
      'support.source.missing',
      'support.citation.blank',
    ])
    expect(report.summary.error).toBe(1)
    expect(report.summary.warning).toBe(1)
  })

  it('uses an external evidence index and rejects mismatched indexes', () => {
    const document = makeDocument()
    expect(() => runDocumentPreflightRules(document, {
      reportId: 'report-1',
      generatedAt: '2026-04-25T02:00:00.000Z',
      evidenceIndex: {
        documentId: 'doc-other',
        projectId: 'project-1',
        documentUpdatedAt: document.updatedAt,
        items: [],
        byKey: {},
        bySectionId: {},
        bySourceKey: {},
      },
    })).toThrow('[document-preflight-rules] SourceEvidenceIndex does not match document')
  })
})
