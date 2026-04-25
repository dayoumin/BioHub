import { describe, expect, it } from 'vitest'
import type { DocumentBlueprint } from '../document-blueprint-types'
import { sanitizeDocumentLlmReviewFindings } from '../document-llm-review-sanitizer'

function makeDocument(): DocumentBlueprint {
  return {
    id: 'doc-1',
    projectId: 'project-1',
    preset: 'paper',
    title: 'Draft',
    language: 'en',
    sections: [{
      id: 'discussion',
      title: 'Discussion',
      content: 'The intervention may improve outcomes.',
      sourceRefs: [],
      editable: true,
      generatedBy: 'llm',
    }],
    metadata: {},
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
  }
}

describe('sanitizeDocumentLlmReviewFindings', () => {
  it('keeps flow/style/mechanics findings as user-confirmed review suggestions', () => {
    const findings = sanitizeDocumentLlmReviewFindings(makeDocument(), [{
      category: 'style',
      severity: 'warning',
      title: 'Tone down certainty',
      message: 'The sentence overstates a directional interpretation.',
      sectionId: 'discussion',
      suggestion: {
        replacementText: 'The intervention may be associated with improved outcomes.',
        canAutoApply: true,
        requiresUserConfirmation: false,
      },
      targetRange: {
        startOffset: 0,
        endOffset: 20,
      },
    }], {
      reportId: 'report-1',
      generatedAt: '2026-04-25T01:00:00.000Z',
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]).toEqual(expect.objectContaining({
      documentId: 'doc-1',
      projectId: 'project-1',
      category: 'style',
      severity: 'warning',
      status: 'open',
      sectionId: 'discussion',
      title: 'Tone down certainty',
    }))
    expect(findings[0]?.targetRange).toBeUndefined()
    expect(findings[0]?.suggestion).toEqual({
      replacementText: 'The intervention may be associated with improved outcomes.',
      canAutoApply: false,
      requiresUserConfirmation: true,
    })
  })

  it('drops source, citation, format, and journal compliance findings from LLM output', () => {
    const findings = sanitizeDocumentLlmReviewFindings(makeDocument(), [
      {
        category: 'source',
        severity: 'error',
        title: 'Source mismatch',
        message: 'Replace the statistic.',
      },
      {
        category: 'citation',
        severity: 'warning',
        title: 'Citation patch',
        message: 'Add a reference.',
      },
      {
        category: 'format',
        severity: 'warning',
        title: 'Journal format',
        message: 'Change the reference style.',
      },
      {
        category: 'journal',
        severity: 'info',
        title: 'Journal fit',
        message: 'This journal may fit.',
      },
    ], {
      reportId: 'report-1',
      generatedAt: '2026-04-25T01:00:00.000Z',
    })

    expect(findings).toEqual([])
  })

  it('drops findings that attempt to patch document structure, citations, sources, or statistics', () => {
    const findings = sanitizeDocumentLlmReviewFindings(makeDocument(), [
      {
        category: 'style',
        severity: 'warning',
        title: 'Unsafe content patch',
        message: 'Patch content directly.',
        content: 'Direct replacement',
      },
      {
        category: 'mechanics',
        severity: 'warning',
        title: 'Unsafe citation patch',
        message: 'Patch citations directly.',
        suggestion: {
          replacementText: 'Use a different citation.',
          citationIds: ['ref-1'],
        },
      },
      {
        category: 'flow',
        severity: 'warning',
        title: 'Unsafe statistic patch',
        message: 'Patch the source-bound statistic.',
        suggestion: {
          replacementText: 'p = 0.001',
          sourceBoundStatistic: {
            sourceId: 'analysis-1',
          },
        },
      },
      {
        category: 'style',
        severity: 'warning',
        title: 'Unsafe case variant',
        message: 'Patch content through a case variant.',
        Content: 'Direct replacement',
      },
      {
        category: 'flow',
        severity: 'warning',
        title: 'Unsafe nested patch',
        message: 'Patch content through nested operations.',
        operations: [{
          patch: {
            referencesToAdd: ['ref-1'],
          },
        }],
      },
    ], {
      reportId: 'report-1',
      generatedAt: '2026-04-25T01:00:00.000Z',
    })

    expect(findings).toEqual([])
  })

  it('keeps the review finding but removes source-bound replacement text', () => {
    const findings = sanitizeDocumentLlmReviewFindings(makeDocument(), [
      {
        category: 'style',
        severity: 'warning',
        title: 'Avoid overclaiming significance',
        message: 'The interpretation should be checked against the source result.',
        suggestion: {
          replacementText: 'The effect was significant (p = 0.001; see Table 1).',
        },
      },
      {
        category: 'style',
        severity: 'warning',
        title: 'Avoid patching sample size',
        message: 'The sample size should be checked against the source result.',
        suggestion: {
          replacementText: 'The final analytic sample was n = 42 with OR = 1.8 and 95% CI [1.2, 2.3].',
        },
      },
      {
        category: 'style',
        severity: 'warning',
        title: 'Avoid patching unicode statistics',
        message: 'The statistical threshold should be checked against the source result.',
        suggestion: {
          replacementText: `Results were significant at p ${String.fromCharCode(0x2264)} .05 and require interpretation.`,
        },
      },
    ], {
      reportId: 'report-1',
      generatedAt: '2026-04-25T01:00:00.000Z',
    })

    expect(findings).toHaveLength(3)
    expect(findings.every((finding) => finding.suggestion === undefined)).toBe(true)
  })

  it('downgrades critical LLM findings and omits unknown section ids', () => {
    const findings = sanitizeDocumentLlmReviewFindings(makeDocument(), [{
      category: 'flow',
      severity: 'critical',
      title: 'Missing transition',
      message: 'The section jumps from result to implication.',
      sectionId: 'missing-section',
    }], {
      reportId: 'report-1',
      generatedAt: '2026-04-25T01:00:00.000Z',
    })

    expect(findings).toHaveLength(1)
    expect(findings[0]?.severity).toBe('error')
    expect(findings[0]?.sectionId).toBeUndefined()
  })
})
