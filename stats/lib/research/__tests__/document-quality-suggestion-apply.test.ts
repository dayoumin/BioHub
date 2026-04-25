import { describe, expect, it } from 'vitest'
import type { DocumentSection } from '../document-blueprint-types'
import {
  buildDocumentSectionQualityHash,
  type DocumentReviewFinding,
} from '../document-quality-types'
import { applyDocumentFindingSuggestionToSection } from '../document-quality-suggestion-apply'

function makeSection(overrides: Partial<DocumentSection> = {}): DocumentSection {
  return {
    id: 'results',
    title: 'Results',
    content: 'The p value is 0.04.',
    sourceRefs: [],
    editable: true,
    generatedBy: 'llm',
    ...overrides,
  }
}

function makeFinding(
  section: DocumentSection,
  overrides: Partial<DocumentReviewFinding> = {},
): DocumentReviewFinding {
  return {
    id: 'finding-1',
    reportId: 'report-1',
    documentId: 'doc-1',
    projectId: 'project-1',
    ruleId: 'style.suggestion',
    category: 'style',
    severity: 'warning',
    status: 'open',
    title: 'Suggestion',
    message: 'Replace text.',
    sectionId: section.id,
    targetRange: {
      startOffset: 15,
      endOffset: 19,
      sectionHash: buildDocumentSectionQualityHash(section),
    },
    suggestion: {
      replacementText: '0.038',
      canAutoApply: true,
      requiresUserConfirmation: false,
    },
    createdAt: '2026-04-25T00:00:00.000Z',
    updatedAt: '2026-04-25T00:00:00.000Z',
    ...overrides,
  }
}

describe('applyDocumentFindingSuggestionToSection', () => {
  it('applies a range-backed suggestion and clears stale plate value', () => {
    const section = makeSection({
      plateValue: [{ type: 'p', children: [{ text: 'old plate' }] }],
    })
    const result = applyDocumentFindingSuggestionToSection(section, makeFinding(section))

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      content: 'The p value is 0.038.',
    }))
    if (result.ok) {
      expect(result.section.content).toBe('The p value is 0.038.')
      expect(result.section.plateValue).toBeUndefined()
      expect(result.section.generatedBy).toBe('user')
    }
  })

  it('blocks missing suggestion, non-auto suggestion, and missing range', () => {
    const section = makeSection()

    expect(applyDocumentFindingSuggestionToSection(section, makeFinding(section, {
      suggestion: undefined,
    }))).toEqual({ ok: false, reason: 'missing-suggestion' })

    expect(applyDocumentFindingSuggestionToSection(section, makeFinding(section, {
      suggestion: {
        replacementText: '0.038',
        canAutoApply: false,
        requiresUserConfirmation: true,
      },
    }))).toEqual({ ok: false, reason: 'not-auto-applicable' })

    expect(applyDocumentFindingSuggestionToSection(section, makeFinding(section, {
      targetRange: undefined,
    }))).toEqual({ ok: false, reason: 'missing-target-range' })
  })

  it('blocks stale section hashes and invalid offsets', () => {
    const section = makeSection()

    expect(applyDocumentFindingSuggestionToSection(section, makeFinding(section, {
      targetRange: {
        startOffset: 15,
        endOffset: 19,
        sectionHash: 'stale-hash',
      },
    }))).toEqual({ ok: false, reason: 'section-hash-mismatch' })

    expect(applyDocumentFindingSuggestionToSection(section, makeFinding(section, {
      targetRange: {
        startOffset: 15,
        endOffset: 999,
        sectionHash: buildDocumentSectionQualityHash(section),
      },
    }))).toEqual({ ok: false, reason: 'invalid-offsets' })

    expect(applyDocumentFindingSuggestionToSection(section, makeFinding(section, {
      targetRange: {
        startOffset: Number.NaN,
        endOffset: 19,
        sectionHash: buildDocumentSectionQualityHash(section),
      },
    }))).toEqual({ ok: false, reason: 'invalid-offsets' })

    expect(applyDocumentFindingSuggestionToSection(section, makeFinding(section, {
      targetRange: {
        startOffset: 15.5,
        endOffset: 19,
        sectionHash: buildDocumentSectionQualityHash(section),
      },
    }))).toEqual({ ok: false, reason: 'invalid-offsets' })
  })
})
