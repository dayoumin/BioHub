import { describe, expect, it } from 'vitest'
import type { LiteratureItem } from '@/lib/types/literature'
import type { CitationRecord } from '../citation-types'
import {
  buildCitationSectionGate,
  getCitationUsageContract,
} from '../citation-source-contract'

function makeCitation(overrides: Partial<LiteratureItem> = {}): CitationRecord {
  return {
    id: 'cit_1',
    projectId: 'proj_1',
    addedAt: '2026-04-29T00:00:00.000Z',
    item: {
      id: 'lit_1',
      source: 'openalex',
      title: 'Population genetics of marine fish',
      authors: ['Kim J', 'Lee S'],
      year: 2025,
      journal: 'Marine Biology',
      url: 'https://example.com/paper',
      doi: '10.1234/example',
      abstract: 'This study evaluated population genetic structure in marine fish.',
      searchedName: 'Gadus morhua',
      ...overrides,
    },
  }
}

describe('citation source contract', () => {
  it('allows narrative citation only when DOI and literature summary are present', () => {
    const contract = getCitationUsageContract(makeCitation())

    expect(contract.status).toBe('verified')
    expect(contract.allowedSections).toEqual(['introduction', 'discussion', 'references'])
    expect(contract.reasons).toEqual([])
  })

  it('keeps DOI-backed records without summary out of Introduction and Discussion', () => {
    const contract = getCitationUsageContract(makeCitation({ abstract: undefined }))

    expect(contract.status).toBe('reference-only')
    expect(contract.allowedSections).toEqual(['references'])
    expect(contract.reasons).toEqual(['missing-literature-summary'])
  })

  it('keeps URL-only records out of narrative citation even when a title exists', () => {
    const contract = getCitationUsageContract(makeCitation({
      doi: undefined,
      abstract: 'A searchable summary exists but DOI verification is absent.',
    }))

    expect(contract.status).toBe('reference-only')
    expect(contract.allowedSections).toEqual(['references'])
    expect(contract.reasons).toEqual(['missing-doi'])
  })

  it('marks records without usable metadata as invalid for References too', () => {
    const contract = getCitationUsageContract(makeCitation({
      title: '',
      authors: [],
      doi: undefined,
      url: '',
      abstract: undefined,
    }))

    expect(contract.status).toBe('invalid')
    expect(contract.allowedSections).toEqual([])
    expect(contract.reasons).toEqual(['missing-title', 'missing-authors', 'missing-identifier'])
  })

  it('blocks Introduction drafting when citation-backed text is requested without verified citation source', () => {
    const gate = buildCitationSectionGate({
      citations: [makeCitation({ abstract: undefined })],
      section: 'introduction',
      requiresCitation: true,
      language: 'ko',
    })

    expect(gate.status).toBe('blocked')
    expect(gate.canGenerateDraft).toBe(false)
    expect(gate.verifiedNarrativeCitationCount).toBe(0)
    expect(gate.referenceOnlyCitationCount).toBe(1)
    expect(gate.messages[0]).toContain('검증된 문헌 요약 source')
  })

  it('allows References generation with reference-only citations', () => {
    const gate = buildCitationSectionGate({
      citations: [makeCitation({ abstract: undefined })],
      section: 'references',
      requiresCitation: true,
      language: 'ko',
    })

    expect(gate.status).toBe('ready')
    expect(gate.canGenerateDraft).toBe(true)
    expect(gate.referenceOnlyCitationCount).toBe(1)
  })

  it('marks Discussion as reviewable when verified and reference-only citations are mixed', () => {
    const gate = buildCitationSectionGate({
      citations: [
        makeCitation({ id: 'lit_verified' }),
        {
          ...makeCitation({ id: 'lit_reference_only', abstract: undefined }),
          id: 'cit_2',
        },
      ],
      section: 'discussion',
      requiresCitation: true,
      language: 'en',
    })

    expect(gate.status).toBe('needs-review')
    expect(gate.canGenerateDraft).toBe(true)
    expect(gate.verifiedNarrativeCitationCount).toBe(1)
    expect(gate.referenceOnlyCitationCount).toBe(1)
  })
})
