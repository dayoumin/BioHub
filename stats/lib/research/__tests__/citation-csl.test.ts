import { describe, expect, it } from 'vitest'
import type { CitationRecord } from '../citation-types'
import {
  buildInlineCitationMarkdown,
  collectInlineCitationIds,
  renderCitationBibliography,
  renderInlineCitation,
  resolveInlineCitationMarkdown,
} from '../citation-csl'
import type { LiteratureItem } from '@/lib/types/literature'

function makeCitationRecord(overrides: Partial<CitationRecord> = {}): CitationRecord {
  const item: LiteratureItem = {
    id: 'lit_1',
    source: 'openalex',
    title: 'Fisheries Population Dynamics',
    authors: ['Smith A', 'Jones B'],
    year: 2021,
    journal: 'Fisheries Research',
    url: 'https://example.com',
    doi: '10.0000/fr.2021',
    searchedName: 'test',
  }

  return {
    id: 'cit_1',
    projectId: 'proj_1',
    item,
    addedAt: '2026-04-24T00:00:00.000Z',
    ...overrides,
  }
}

describe('citation-csl', () => {
  it('renders bibliography entries via citeproc with doi output', () => {
    const entries = renderCitationBibliography([makeCitationRecord()])

    expect(entries).toHaveLength(1)
    expect(entries[0]).toContain('Smith, A.')
    expect(entries[0]).toContain('(2021)')
    expect(entries[0]).toContain('https://doi.org/10.0000/fr.2021')
  })

  it('renders short inline author-year citations', () => {
    const inline = renderInlineCitation(makeCitationRecord())

    expect(inline).toBe('(Smith & Jones, 2021)')
  })

  it('builds markdown links that preserve citation ids', () => {
    const markdown = buildInlineCitationMarkdown(makeCitationRecord())

    expect(markdown).toBe('[(Smith & Jones, 2021)](citation:cit_1)')
  })

  it('collects inline citation ids from markdown links', () => {
    const ids = collectInlineCitationIds(
      '서론 [(Smith & Jones, 2021)](citation:cit_1) 및 [(Lee, 2020)](citation:cit_2)',
    )

    expect(ids).toEqual(['cit_1', 'cit_2'])
  })

  it('resolves inline citation markdown with the latest citation record', () => {
    const record = makeCitationRecord({
      id: 'cit_latest',
      item: {
        id: 'lit_latest',
        source: 'openalex',
        title: 'Updated title',
        authors: ['Kim H', 'Park J'],
        year: 2025,
        journal: 'Aquaculture',
        url: 'https://example.com/updated',
        searchedName: 'updated',
      },
    })

    const resolved = resolveInlineCitationMarkdown(
      '배경은 [(Old Label, 2024)](citation:cit_latest)에 근거한다.',
      [record],
    )

    expect(resolved).toBe('배경은 (Kim & Park, 2025)에 근거한다.')
  })
})
