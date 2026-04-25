import { beforeEach, describe, expect, it } from 'vitest'
import 'fake-indexeddb/auto'
import {
  deleteDocumentQualityReport,
  getLatestDocumentQualityReport,
  listDocumentQualityReports,
  loadDocumentQualityReport,
  saveDocumentQualityReport,
  updateDocumentQualityFindingStatus,
} from '../document-quality-storage'
import {
  deriveDocumentQualitySummary,
  type DocumentQualityReport,
  type DocumentReviewFinding,
} from '../document-quality-types'

function makeReport(
  id: string,
  overrides: Partial<DocumentQualityReport> = {},
): DocumentQualityReport {
  return {
    id,
    documentId: 'doc-1',
    projectId: 'project-1',
    status: 'completed',
    snapshot: {
      documentId: 'doc-1',
      projectId: 'project-1',
      baseDocumentUpdatedAt: '2026-04-25T01:00:00.000Z',
      documentContentHash: 'doc-hash',
      sectionHashes: {
        results: 'section-hash',
      },
      sourceSnapshotHashes: {},
      ruleEngineVersion: 'rules-1',
    },
    findings: [],
    summary: deriveDocumentQualitySummary([]),
    generatedAt: '2026-04-25T02:00:00.000Z',
    updatedAt: '2026-04-25T02:00:00.000Z',
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
    severity: 'critical',
    status: 'open',
    title: 'Finding',
    message: 'Check this.',
    createdAt: '2026-04-25T02:00:00.000Z',
    updatedAt: '2026-04-25T02:00:00.000Z',
    ...overrides,
  }
}

async function clearQualityReports(): Promise<void> {
  const reports = await listDocumentQualityReports()
  await Promise.all(reports.map((report) => deleteDocumentQualityReport(report.id)))
}

describe('document-quality-storage', () => {
  beforeEach(async () => {
    await clearQualityReports()
  })

  it('round-trips a quality report without mutating the input object', async () => {
    const report = makeReport('report-1')
    const saved = await saveDocumentQualityReport(report)

    saved.snapshot.sectionHashes.results = 'mutated'
    saved.findings.push(makeFinding())

    const loaded = await loadDocumentQualityReport('report-1')

    expect(loaded?.snapshot.sectionHashes.results).toBe('section-hash')
    expect(loaded?.findings).toEqual([])
    expect(report.snapshot.sectionHashes.results).toBe('section-hash')
  })

  it('lists reports by document and project in latest order', async () => {
    await saveDocumentQualityReport(makeReport('older', {
      generatedAt: '2026-04-25T02:00:00.000Z',
      updatedAt: '2026-04-25T02:00:00.000Z',
    }))
    await saveDocumentQualityReport(makeReport('newer', {
      generatedAt: '2026-04-25T03:00:00.000Z',
      updatedAt: '2026-04-25T03:00:00.000Z',
    }))
    await saveDocumentQualityReport(makeReport('other-doc', {
      documentId: 'doc-2',
      generatedAt: '2026-04-25T04:00:00.000Z',
      snapshot: {
        ...makeReport('other-doc').snapshot,
        documentId: 'doc-2',
      },
      updatedAt: '2026-04-25T04:00:00.000Z',
    }))

    const documentReports = await listDocumentQualityReports({ documentId: 'doc-1' })
    const projectReports = await listDocumentQualityReports({ projectId: 'project-1' })

    expect(documentReports.map((report) => report.id)).toEqual(['newer', 'older'])
    expect(projectReports.map((report) => report.id)).toEqual(['other-doc', 'newer', 'older'])
  })

  it('uses id as deterministic tie-breaker for latest report', async () => {
    await saveDocumentQualityReport(makeReport('report-a', {
      generatedAt: '2026-04-25T02:00:00.000Z',
      updatedAt: '2026-04-25T02:00:00.000Z',
    }))
    await saveDocumentQualityReport(makeReport('report-z', {
      generatedAt: '2026-04-25T02:00:00.000Z',
      updatedAt: '2026-04-25T02:00:00.000Z',
    }))

    await expect(getLatestDocumentQualityReport('doc-1')).resolves.toEqual(
      expect.objectContaining({ id: 'report-z' }),
    )
  })

  it('deletes reports idempotently', async () => {
    await saveDocumentQualityReport(makeReport('report-1'))
    await deleteDocumentQualityReport('report-1')
    await deleteDocumentQualityReport('report-1')

    await expect(loadDocumentQualityReport('report-1')).resolves.toBeNull()
  })

  it('orders latest by generatedAt instead of later finding edits', async () => {
    await saveDocumentQualityReport(makeReport('new-review', {
      generatedAt: '2026-04-25T03:00:00.000Z',
      updatedAt: '2026-04-25T03:00:00.000Z',
    }))
    await saveDocumentQualityReport(makeReport('old-edited-review', {
      generatedAt: '2026-04-25T02:00:00.000Z',
      updatedAt: '2026-04-25T04:00:00.000Z',
    }))

    await expect(getLatestDocumentQualityReport('doc-1')).resolves.toEqual(
      expect.objectContaining({ id: 'new-review' }),
    )
  })

  it('recomputes summary from findings before saving', async () => {
    await saveDocumentQualityReport(makeReport('report-1', {
      findings: [makeFinding()],
      summary: deriveDocumentQualitySummary([]),
    }))

    await expect(loadDocumentQualityReport('report-1')).resolves.toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({
          critical: 1,
          unresolvedCritical: 1,
        }),
      }),
    )
  })

  it('rejects findings that do not belong to the report', async () => {
    await expect(saveDocumentQualityReport(makeReport('report-1', {
      findings: [makeFinding({ reportId: 'other-report' })],
    }))).rejects.toThrow('[document-quality-storage] Finding identity does not match report identity')
  })

  it('rejects invalid target ranges before saving', async () => {
    await expect(saveDocumentQualityReport(makeReport('report-1', {
      findings: [
        makeFinding({
          sectionId: undefined,
          targetRange: {
            startOffset: 2,
            endOffset: 3,
            sectionHash: 'section-hash',
          },
        }),
      ],
    }))).rejects.toThrow('[document-quality-storage] Finding targetRange requires sectionId')

    await expect(saveDocumentQualityReport(makeReport('report-2', {
      id: 'report-2',
      findings: [
        makeFinding({
          id: 'finding-2',
          reportId: 'report-2',
          sectionId: 'results',
          targetRange: {
            startOffset: 5,
            endOffset: 3,
            sectionHash: 'section-hash',
          },
        }),
      ],
    }))).rejects.toThrow('[document-quality-storage] Finding targetRange offsets are invalid')
  })

  it('updates a finding status through load-update-save and rederived summary', async () => {
    await saveDocumentQualityReport(makeReport('report-1', {
      findings: [
        makeFinding({
          reportId: 'report-1',
        }),
      ],
    }))

    const saved = await updateDocumentQualityFindingStatus('report-1', 'finding-1', 'ignored', {
      ignoredReason: '사용자 예외',
      updatedAt: '2026-04-25T03:00:00.000Z',
    })

    expect(saved.updatedAt).toBe('2026-04-25T03:00:00.000Z')
    expect(saved.findings[0]).toEqual(expect.objectContaining({
      status: 'ignored',
      ignoredReason: '사용자 예외',
      updatedAt: '2026-04-25T03:00:00.000Z',
    }))
    expect(saved.summary).toEqual(expect.objectContaining({
      openFindings: 0,
      ignoredFindings: 1,
      unresolvedCritical: 0,
    }))

    await expect(loadDocumentQualityReport('report-1')).resolves.toEqual(expect.objectContaining({
      summary: expect.objectContaining({
        ignoredFindings: 1,
      }),
    }))
  })
})
