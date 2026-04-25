import { describe, expect, it } from 'vitest'
import {
  mergeDocumentSectionSupportBindings,
  normalizeDocumentSectionSupportBinding,
  normalizeDocumentSectionSupportBindings,
} from '../document-support-asset-types'

describe('document-support-asset-types', () => {
  it('normalizes defaults and dedupes linked ids', () => {
    const normalized = normalizeDocumentSectionSupportBinding({
      sourceKind: 'citation-record',
      sourceId: 'cit_1',
      role: 'background',
      summary: '  핵심 배경 문헌  ',
      citationIds: ['cit_1', 'cit_1', 'cit_2'],
      linkedAnalysisIds: ['analysis_1', 'analysis_1'],
    })

    expect(normalized.id).toMatch(/^dsb_/)
    expect(normalized.summary).toBe('핵심 배경 문헌')
    expect(normalized.included).toBe(true)
    expect(normalized.origin).toBe('user')
    expect(normalized.citationIds).toEqual(['cit_1', 'cit_2'])
    expect(normalized.linkedAnalysisIds).toEqual(['analysis_1'])
  })

  it('merges same binding identity and preserves explicit excluded state', () => {
    const merged = mergeDocumentSectionSupportBindings(
      [{
        id: 'dsb_existing',
        sourceKind: 'deep-research-note',
        sourceId: 'note_1',
        role: 'interpretation',
        summary: '기존 요약',
        citationIds: ['cit_1'],
        included: false,
        origin: 'user',
      }],
      [{
        id: 'dsb_existing',
        sourceKind: 'deep-research-note',
        sourceId: 'note_1',
        role: 'interpretation',
        summary: '갱신된 요약',
        citationIds: ['cit_2'],
        included: true,
        origin: 'writer',
      }],
    )

    expect(merged).toEqual([{
      id: 'dsb_existing',
      sourceKind: 'deep-research-note',
      sourceId: 'note_1',
      role: 'interpretation',
      summary: '갱신된 요약',
      citationIds: ['cit_1', 'cit_2'],
      included: false,
      origin: 'user',
    }])
  })

  it('keeps distinct drafts when the same source-role pair carries different summaries', () => {
    const normalized = normalizeDocumentSectionSupportBindings([
      {
        sourceKind: 'citation-record',
        sourceId: 'cit_1',
        role: 'background',
        summary: '첫 번째 주장',
        citationIds: ['cit_1'],
      },
      {
        sourceKind: 'citation-record',
        sourceId: 'cit_1',
        role: 'background',
        summary: '두 번째 주장',
        citationIds: ['cit_2'],
      },
    ])

    expect(normalized).toHaveLength(2)
    expect(normalized?.map((binding) => binding.summary)).toEqual(['첫 번째 주장', '두 번째 주장'])
  })
})
