import { describe, expect, it } from 'vitest'
import { BIO_TOOL_RESULT_CONTRACT_FIXTURES } from '@/lib/bio-tools/bio-tool-result-contract-fixtures'
import { getDocumentWritingSourceReadiness } from '../document-writing-source-readiness'

describe('document writing source readiness', () => {
  it('marks stale sources as requiring reassembly before other readiness labels', () => {
    const readiness = getDocumentWritingSourceReadiness({
      sourceKind: 'analysis',
      sectionId: 'results',
      needsReassemble: true,
    })

    expect(readiness.status).toBe('stale')
    expect(readiness.label).toBe('재조립 필요')
  })

  it('labels analysis sources by section automation scope', () => {
    expect(getDocumentWritingSourceReadiness({
      sourceKind: 'analysis',
      sectionId: 'methods',
    }).label).toBe('Methods 자동 작성 가능')

    expect(getDocumentWritingSourceReadiness({
      sourceKind: 'analysis',
      sectionId: 'results',
    }).label).toBe('Results 자동 작성 가능')
  })

  it('marks dedicated Bio-Tools with guarded results as ready', () => {
    const fixture = BIO_TOOL_RESULT_CONTRACT_FIXTURES.find((item) => item.toolId === 'alpha-diversity')

    expect(fixture).toBeDefined()
    const readiness = getDocumentWritingSourceReadiness({
      sourceKind: 'supplementary',
      entityKind: 'bio-tool-result',
      bioTool: fixture
        ? {
          toolId: fixture.toolId,
          results: fixture.results,
        }
        : undefined,
    })

    expect(readiness.status).toBe('ready')
    expect(readiness.label).toBe('전용 writer 사용')
  })

  it('falls back when a Bio-Tool result shape does not pass its writer guard', () => {
    const readiness = getDocumentWritingSourceReadiness({
      sourceKind: 'supplementary',
      entityKind: 'bio-tool-result',
      bioTool: {
        toolId: 'alpha-diversity',
        results: { site_results: [] },
      },
    })

    expect(readiness.status).toBe('review')
    expect(readiness.label).toBe('결과 shape 확인 필요')
  })

  it('labels dedicated genetics supplementary writers as source-backed but review-needed', () => {
    const readiness = getDocumentWritingSourceReadiness({
      sourceKind: 'supplementary',
      entityKind: 'seq-stats-result',
    })

    expect(readiness.status).toBe('review')
    expect(readiness.label).toBe('제한 writer 확인')
    expect(readiness.detail).toContain('생물학적 해석')
  })
})
