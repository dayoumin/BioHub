import { describe, expect, it } from 'vitest'
import {
  buildDocumentQualitySnapshot,
  deriveDocumentQualitySummary,
  getDocumentQualityFreshness,
  updateDocumentReviewFindingStatus,
  type DocumentQualityReport,
  type DocumentReviewFinding,
} from '../document-quality-types'
import type { DocumentBlueprint } from '../document-blueprint-types'

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
        content: 'Initial result',
        sourceRefs: [],
        editable: true,
        generatedBy: 'user',
      },
    ],
    ...overrides,
  }
}

function makeFinding(overrides: Partial<DocumentReviewFinding> = {}): DocumentReviewFinding {
  return {
    id: 'finding-1',
    reportId: 'report-1',
    documentId: 'doc-1',
    projectId: 'project-1',
    ruleId: 'rule-1',
    category: 'source',
    severity: 'warning',
    status: 'open',
    title: 'Check value',
    message: 'Review this value.',
    createdAt: '2026-04-25T02:00:00.000Z',
    updatedAt: '2026-04-25T02:00:00.000Z',
    ...overrides,
  }
}

function makeReport(document: DocumentBlueprint, overrides: Partial<DocumentQualityReport> = {}): DocumentQualityReport {
  const snapshot = buildDocumentQualitySnapshot(document, {
    ruleEngineVersion: 'rules-1',
    sourceSnapshotHashes: { 'analysis:hist-1': 'source-hash-1' },
    targetJournalProfileVersion: 'journal-1',
  })
  return {
    id: 'report-1',
    documentId: document.id,
    projectId: document.projectId,
    status: 'completed',
    snapshot,
    findings: [],
    summary: deriveDocumentQualitySummary([]),
    generatedAt: '2026-04-25T02:00:00.000Z',
    updatedAt: '2026-04-25T02:00:00.000Z',
    ...overrides,
  }
}

describe('document-quality-types', () => {
  it('marks a report fresh only when document and source snapshot keys match', () => {
    const document = makeDocument()
    const report = makeReport(document)

    expect(getDocumentQualityFreshness(document, report, {
      ruleEngineVersion: 'rules-1',
      sourceSnapshotHashes: { 'analysis:hist-1': 'source-hash-1' },
      targetJournalProfileVersion: 'journal-1',
    })).toBe('fresh')
  })

  it('marks a report stale when section content changes', () => {
    const document = makeDocument()
    const report = makeReport(document)
    const editedDocument = makeDocument({
      sections: [
        {
          id: 'results',
          title: 'Results',
          content: 'Edited result',
          sourceRefs: [],
          editable: true,
          generatedBy: 'user',
        },
      ],
    })

    expect(getDocumentQualityFreshness(editedDocument, report, {
      ruleEngineVersion: 'rules-1',
      sourceSnapshotHashes: { 'analysis:hist-1': 'source-hash-1' },
      targetJournalProfileVersion: 'journal-1',
    })).toBe('stale')
  })

  it('marks a report stale when only document updatedAt changes', () => {
    const document = makeDocument()
    const report = makeReport(document)
    const resavedDocument = makeDocument({
      updatedAt: '2026-04-25T03:00:00.000Z',
    })

    expect(getDocumentQualityFreshness(resavedDocument, report, {
      ruleEngineVersion: 'rules-1',
      sourceSnapshotHashes: { 'analysis:hist-1': 'source-hash-1' },
      targetJournalProfileVersion: 'journal-1',
    })).toBe('stale')
  })

  it('marks a report stale when document language changes', () => {
    const document = makeDocument()
    const report = makeReport(document)
    const translatedDocument = makeDocument({
      language: 'en',
    })

    expect(getDocumentQualityFreshness(translatedDocument, report, {
      ruleEngineVersion: 'rules-1',
      sourceSnapshotHashes: { 'analysis:hist-1': 'source-hash-1' },
      targetJournalProfileVersion: 'journal-1',
    })).toBe('stale')
  })

  it('marks a report stale when source, journal, or rule versions change', () => {
    const document = makeDocument()
    const report = makeReport(document)

    expect(getDocumentQualityFreshness(document, report, {
      ruleEngineVersion: 'rules-2',
      sourceSnapshotHashes: { 'analysis:hist-1': 'source-hash-1' },
      targetJournalProfileVersion: 'journal-1',
    })).toBe('stale')
    expect(getDocumentQualityFreshness(document, report, {
      ruleEngineVersion: 'rules-1',
      sourceSnapshotHashes: { 'analysis:hist-1': 'source-hash-2' },
      targetJournalProfileVersion: 'journal-1',
    })).toBe('stale')
    expect(getDocumentQualityFreshness(document, report, {
      ruleEngineVersion: 'rules-1',
      sourceSnapshotHashes: { 'analysis:hist-1': 'source-hash-1' },
      targetJournalProfileVersion: 'journal-2',
    })).toBe('stale')
  })

  it('returns missing when no report is available', () => {
    expect(getDocumentQualityFreshness(makeDocument(), null, {
      ruleEngineVersion: 'rules-1',
    })).toBe('missing')
  })

  it('derives summary counts from open findings without counting ignored critical findings', () => {
    const findings = [
      makeFinding({ id: 'open-info', severity: 'info' }),
      makeFinding({ id: 'open-warning', severity: 'warning' }),
      makeFinding({ id: 'open-critical', severity: 'critical' }),
      makeFinding({ id: 'ignored-critical', severity: 'critical', status: 'ignored' }),
      makeFinding({ id: 'resolved-error', severity: 'error', status: 'resolved' }),
    ]

    expect(deriveDocumentQualitySummary(findings)).toEqual({
      totalFindings: 5,
      openFindings: 3,
      resolvedFindings: 1,
      ignoredFindings: 1,
      info: 1,
      warning: 1,
      error: 0,
      critical: 1,
      unresolvedCritical: 1,
    })
  })

  it('updates a finding status, timestamp, ignored reason, and summary without mutating siblings', () => {
    const document = makeDocument()
    const sibling = makeFinding({
      id: 'finding-2',
      ruleId: 'rule-2',
      severity: 'critical',
    })
    const report = makeReport(document, {
      findings: [makeFinding(), sibling],
      summary: deriveDocumentQualitySummary([makeFinding(), sibling]),
    })

    const ignored = updateDocumentReviewFindingStatus(report, 'finding-1', 'ignored', {
      ignoredReason: '검토 후 예외 처리',
      updatedAt: '2026-04-25T03:00:00.000Z',
    })

    expect(ignored.findings[0]).toEqual(expect.objectContaining({
      status: 'ignored',
      ignoredReason: '검토 후 예외 처리',
      updatedAt: '2026-04-25T03:00:00.000Z',
    }))
    expect(ignored.findings[1]).toBe(sibling)
    expect(ignored.summary).toEqual(expect.objectContaining({
      openFindings: 1,
      ignoredFindings: 1,
      unresolvedCritical: 1,
    }))

    const reopened = updateDocumentReviewFindingStatus(ignored, 'finding-1', 'open', {
      updatedAt: '2026-04-25T04:00:00.000Z',
    })

    expect(reopened.findings[0]).toEqual(expect.objectContaining({
      status: 'open',
      ignoredReason: undefined,
      updatedAt: '2026-04-25T04:00:00.000Z',
    }))
    expect(reopened.summary).toEqual(expect.objectContaining({
      openFindings: 2,
      ignoredFindings: 0,
      unresolvedCritical: 1,
    }))
  })

  it('supports resolved findings and throws for a missing finding id', () => {
    const document = makeDocument()
    const report = makeReport(document, {
      findings: [makeFinding()],
      summary: deriveDocumentQualitySummary([makeFinding()]),
    })

    expect(updateDocumentReviewFindingStatus(report, 'finding-1', 'resolved', {
      updatedAt: '2026-04-25T03:00:00.000Z',
    })).toEqual(expect.objectContaining({
      summary: expect.objectContaining({
        openFindings: 0,
        resolvedFindings: 1,
      }),
    }))

    expect(() => updateDocumentReviewFindingStatus(report, 'missing', 'ignored')).toThrow(
      '[document-quality] Finding not found',
    )
  })
})
