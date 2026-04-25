import { describe, expect, it } from 'vitest'
import type {
  DocumentQualityReport,
  DocumentReviewFinding,
} from '../document-quality-types'
import { mergeDocumentLlmReviewFindingsIntoReport } from '../document-llm-review-report'

function makeReport(overrides: Partial<DocumentQualityReport> = {}): DocumentQualityReport {
  const generatedAt = '2026-04-25T00:00:00.000Z'
  return {
    id: 'report-1',
    documentId: 'doc-1',
    projectId: 'project-1',
    status: 'completed',
    snapshot: {
      documentId: 'doc-1',
      projectId: 'project-1',
      baseDocumentUpdatedAt: generatedAt,
      documentContentHash: 'doc-hash',
      sectionHashes: {},
      sourceSnapshotHashes: {},
      ruleEngineVersion: 'document-preflight-rules:v1',
    },
    findings: [],
    summary: {
      totalFindings: 0,
      openFindings: 0,
      resolvedFindings: 0,
      ignoredFindings: 0,
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
      unresolvedCritical: 0,
    },
    generatedAt,
    updatedAt: generatedAt,
    ...overrides,
  }
}

function makeFinding(overrides: Partial<DocumentReviewFinding> = {}): DocumentReviewFinding {
  const generatedAt = '2026-04-25T00:00:00.000Z'
  return {
    id: 'finding-llm-1',
    reportId: 'report-1',
    documentId: 'doc-1',
    projectId: 'project-1',
    ruleId: 'document-llm-review-sanitizer:v1:style',
    category: 'style',
    severity: 'warning',
    status: 'open',
    title: 'Style',
    message: 'Tighten the sentence.',
    createdAt: generatedAt,
    updatedAt: generatedAt,
    ...overrides,
  }
}

describe('mergeDocumentLlmReviewFindingsIntoReport', () => {
  it('merges sanitized LLM findings and recalculates the report summary', () => {
    const report = makeReport({
      findings: [makeFinding({
        id: 'finding-rule-1',
        ruleId: 'table.caption.missing',
        category: 'format',
        severity: 'error',
      })],
    })

    const merged = mergeDocumentLlmReviewFindingsIntoReport(report, [makeFinding()], {
      updatedAt: '2026-04-25T01:00:00.000Z',
    })

    expect(merged.status).toBe('completed')
    expect(merged.findings.map((finding) => finding.id)).toEqual(['finding-rule-1', 'finding-llm-1'])
    expect(merged.summary).toEqual(expect.objectContaining({
      totalFindings: 2,
      openFindings: 2,
      error: 1,
      warning: 1,
    }))
    expect(report.findings).toHaveLength(1)
  })

  it('keeps deterministic findings when the LLM review fails', () => {
    const report = makeReport({
      findings: [makeFinding({
        id: 'finding-rule-1',
        ruleId: 'support.source.missing',
        category: 'source',
        severity: 'error',
      })],
    })

    const merged = mergeDocumentLlmReviewFindingsIntoReport(report, [], {
      updatedAt: '2026-04-25T01:00:00.000Z',
      errorMessage: 'LLM review timed out.',
    })

    expect(merged.status).toBe('partial')
    expect(merged.errorMessage).toBe('LLM review timed out.')
    expect(merged.findings).toHaveLength(1)
    expect(merged.summary.error).toBe(1)
  })

  it('rejects findings for another report or document', () => {
    expect(() => mergeDocumentLlmReviewFindingsIntoReport(makeReport(), [makeFinding({
      reportId: 'other-report',
    })], {
      updatedAt: '2026-04-25T01:00:00.000Z',
    })).toThrow('[document-llm-review-report] Finding identity does not match report identity')
  })
})
