import { describe, expect, it } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'
import { checkNumericClaimEvidence } from '../document-claim-evidence'
import { buildSourceEvidenceIndex } from '../document-source-evidence'

function makeDocument(): DocumentBlueprint {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: 'Draft',
    language: 'en',
    sections: [{
      id: 'results',
      title: 'Results',
      content: 'The result was statistically significant.',
      sourceRefs: [],
      editable: true,
      generatedBy: 'template',
      tables: [{
        id: 'table-1',
        caption: 'Model results',
        headers: ['term', 'p', 'OR'],
        rows: [['Treatment', '0.03', '1.8']],
        sourceAnalysisId: 'analysis-1',
      }],
    }],
    metadata: {},
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  }
}

describe('checkNumericClaimEvidence', () => {
  it('links numeric claims to structured table evidence', () => {
    const index = buildSourceEvidenceIndex(makeDocument())
    const tableKey = index.items.find((item) => item.kind === 'table')?.key
    expect(tableKey).toBeDefined()

    const result = checkNumericClaimEvidence(index, {
      claimId: 'claim-1',
      documentId: 'doc-1',
      sectionId: 'results',
      text: 'p <= 0.05',
      evidenceKeys: tableKey ? [tableKey] : [],
      metricLabel: 'p',
      operator: '<=',
      value: 0.05,
      rowLabel: 'Treatment',
    })

    expect(result).toEqual(expect.objectContaining({
      claimId: 'claim-1',
      status: 'linked',
      observedValue: '0.03',
      expectedValue: 'p <= 0.05',
    }))
  })

  it('reports missing and ambiguous claim evidence', () => {
    const index = buildSourceEvidenceIndex(makeDocument())
    const tableKey = index.items.find((item) => item.kind === 'table')?.key ?? 'missing'

    expect(checkNumericClaimEvidence(index, {
      claimId: 'claim-missing',
      documentId: 'doc-1',
      sectionId: 'results',
      text: 'p <= 0.05',
      evidenceKeys: ['missing-key'],
      metricLabel: 'p',
      operator: '<=',
      value: 0.05,
      rowLabel: 'Treatment',
    }).status).toBe('missing')

    expect(checkNumericClaimEvidence(index, {
      claimId: 'claim-ambiguous',
      documentId: 'doc-1',
      sectionId: 'results',
      text: 'p <= 0.05',
      evidenceKeys: [tableKey, tableKey],
      metricLabel: 'p',
      operator: '<=',
      value: 0.05,
      rowLabel: 'Treatment',
    }).status).toBe('ambiguous')
  })

  it('reports mismatches for table values that do not satisfy the claim', () => {
    const index = buildSourceEvidenceIndex(makeDocument())
    const tableKey = index.items.find((item) => item.kind === 'table')?.key

    const result = checkNumericClaimEvidence(index, {
      claimId: 'claim-1',
      documentId: 'doc-1',
      sectionId: 'results',
      text: 'p < 0.01',
      evidenceKeys: tableKey ? [tableKey] : [],
      metricLabel: 'p',
      operator: '<',
      value: 0.01,
      rowLabel: 'Treatment',
    })

    expect(result).toEqual(expect.objectContaining({
      status: 'mismatch',
      observedValue: '0.03',
      expectedValue: 'p < 0.01',
    }))
  })

  it('treats multi-row table evidence as ambiguous without a row label', () => {
    const document = makeDocument()
    document.sections[0]?.tables?.[0]?.rows.push(['Control', '0.80', '1.0'])
    const index = buildSourceEvidenceIndex(document)
    const tableKey = index.items.find((item) => item.kind === 'table')?.key

    const result = checkNumericClaimEvidence(index, {
      claimId: 'claim-1',
      documentId: 'doc-1',
      sectionId: 'results',
      text: 'p <= 0.05',
      evidenceKeys: tableKey ? [tableKey] : [],
      metricLabel: 'p',
      operator: '<=',
      value: 0.05,
    })

    expect(result.status).toBe('ambiguous')
  })
})
