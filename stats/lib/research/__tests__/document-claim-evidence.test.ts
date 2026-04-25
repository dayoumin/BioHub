import { describe, expect, it } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'
import {
  checkNumericClaimEvidence,
  getDocumentNumericClaims,
} from '../document-claim-evidence'
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

  it('reads structured numeric claims from document metadata', () => {
    const document = makeDocument()
    document.metadata = {
      numericClaims: [{
        claimId: 'claim-1',
        documentId: 'doc-1',
        sectionId: 'results',
        text: 'p <= 0.05',
        evidenceKeys: ['table-1'],
        metricLabel: 'p',
        operator: '<=',
        value: 0.05,
        rowLabel: 'Treatment',
      }, {
        claimId: 'bad-claim',
      }],
    }

    expect(getDocumentNumericClaims(document)).toEqual([expect.objectContaining({
      claimId: 'claim-1',
      metricLabel: 'p',
      operator: '<=',
    })])
  })

  it('conservatively collects free-text p and n claims with likely table evidence', () => {
    const document = makeDocument()
    document.sections[0] = {
      ...document.sections[0],
      content: 'Treatment was significant (p < .05) with n = 42.',
      tables: [{
        id: 'table-1',
        caption: 'Model results',
        headers: ['term', 'p', 'n'],
        rows: [['Treatment', '0.03', '42']],
        sourceAnalysisId: 'analysis-1',
      }],
    }
    const index = buildSourceEvidenceIndex(document)

    const claims = getDocumentNumericClaims(document, {
      evidenceIndex: index,
      includeFreeText: true,
    })

    expect(claims).toEqual(expect.arrayContaining([
      expect.objectContaining({
        sectionId: 'results',
        text: 'p < .05',
        metricLabel: 'p',
        operator: '<',
        value: 0.05,
        evidenceKeys: ['doc:doc-1:section:results:table:table-1'],
      }),
      expect.objectContaining({
        sectionId: 'results',
        text: 'n = 42',
        metricLabel: 'n',
        operator: '=',
        value: 42,
        evidenceKeys: ['doc:doc-1:section:results:table:table-1'],
      }),
    ]))
  })

  it('skips free-text claims when no same-section metric table exists', () => {
    const document = makeDocument()
    document.sections[0] = {
      ...document.sections[0],
      content: 'The difference was reported as t = 2.1.',
    }
    const index = buildSourceEvidenceIndex(document)

    const claims = getDocumentNumericClaims(document, {
      evidenceIndex: index,
      includeFreeText: true,
    })

    expect(claims).toEqual([])
  })

  it('skips free-text claims when metric evidence is not unique enough', () => {
    const document = makeDocument()
    document.sections[0] = {
      ...document.sections[0],
      content: 'Treatment was significant (p < .05).',
      tables: [{
        id: 'table-1',
        caption: 'Model results',
        headers: ['term', 'p'],
        rows: [['Treatment', '0.03'], ['Control', '0.90']],
        sourceAnalysisId: 'analysis-1',
      }],
    }
    const index = buildSourceEvidenceIndex(document)

    expect(getDocumentNumericClaims(document, {
      evidenceIndex: index,
      includeFreeText: true,
    })).toEqual([])
  })

  it('does not collect broad numeric prose as free-text claims', () => {
    const document = makeDocument()
    document.sections[0] = {
      ...document.sections[0],
      content: 'There were 12 samples across 3 tanks, and the analysis finished in 2 minutes.',
    }
    const index = buildSourceEvidenceIndex(document)

    expect(getDocumentNumericClaims(document, {
      evidenceIndex: index,
      includeFreeText: true,
    })).toEqual([])
  })

  it('collects conservative effect-size style claims when matching metric headers exist', () => {
    const document = makeDocument()
    document.sections[0] = {
      ...document.sections[0],
      content: 'The association was modest (r = .31), while the odds ratio was OR = 1.8.',
      tables: [{
        id: 'table-1',
        caption: 'Model results',
        headers: ['term', 'r', 'OR'],
        rows: [['Treatment', '0.31', '1.8']],
        sourceAnalysisId: 'analysis-1',
      }],
    }
    const index = buildSourceEvidenceIndex(document)

    const claims = getDocumentNumericClaims(document, {
      evidenceIndex: index,
      includeFreeText: true,
    })

    expect(claims).toEqual(expect.arrayContaining([
      expect.objectContaining({
        text: 'r = .31',
        metricLabel: 'r',
        value: 0.31,
      }),
      expect.objectContaining({
        text: 'OR = 1.8',
        metricLabel: 'OR',
        value: 1.8,
      }),
    ]))
  })
})
