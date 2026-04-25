import type { DocumentSection } from './document-blueprint-types'
import {
  buildDocumentSectionQualityHash,
  type DocumentReviewFinding,
} from './document-quality-types'

export type ApplyDocumentFindingSuggestionFailureReason =
  | 'missing-section'
  | 'missing-target-range'
  | 'missing-suggestion'
  | 'not-auto-applicable'
  | 'section-mismatch'
  | 'section-hash-mismatch'
  | 'invalid-offsets'

export type ApplyDocumentFindingSuggestionResult =
  | {
      ok: true
      section: DocumentSection
      content: string
    }
  | {
      ok: false
      reason: ApplyDocumentFindingSuggestionFailureReason
    }

export function applyDocumentFindingSuggestionToSection(
  section: DocumentSection | null | undefined,
  finding: DocumentReviewFinding,
): ApplyDocumentFindingSuggestionResult {
  if (!section) {
    return { ok: false, reason: 'missing-section' }
  }

  if (!finding.targetRange) {
    return { ok: false, reason: 'missing-target-range' }
  }

  if (!finding.suggestion) {
    return { ok: false, reason: 'missing-suggestion' }
  }

  if (!finding.suggestion.canAutoApply) {
    return { ok: false, reason: 'not-auto-applicable' }
  }

  if (finding.sectionId !== section.id) {
    return { ok: false, reason: 'section-mismatch' }
  }

  if (buildDocumentSectionQualityHash(section) !== finding.targetRange.sectionHash) {
    return { ok: false, reason: 'section-hash-mismatch' }
  }

  const { startOffset, endOffset } = finding.targetRange
  if (
    !Number.isFinite(startOffset)
    || !Number.isFinite(endOffset)
    || !Number.isInteger(startOffset)
    || !Number.isInteger(endOffset)
    || startOffset < 0
    || endOffset < startOffset
    || endOffset > section.content.length
  ) {
    return { ok: false, reason: 'invalid-offsets' }
  }

  const content = [
    section.content.slice(0, startOffset),
    finding.suggestion.replacementText,
    section.content.slice(endOffset),
  ].join('')

  return {
    ok: true,
    content,
    section: {
      ...section,
      content,
      plateValue: undefined,
      generatedBy: 'user',
    },
  }
}
