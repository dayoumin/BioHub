import { describe, expect, it } from 'vitest'
import {
  getFigureProvenanceLines,
  getTableProvenanceLines,
  renderHtmlProvenance,
  renderMarkdownProvenanceLines,
} from '@/lib/services/export/document-provenance'

describe('document provenance helpers', () => {
  it('builds markdown-ready provenance lines for tables and figures', () => {
    expect(renderMarkdownProvenanceLines(getTableProvenanceLines({
      caption: 'Table 1',
      headers: ['A'],
      rows: [['1']],
      sourceAnalysisId: 'analysis-1',
      sourceAnalysisLabel: 'T-Test',
    }))).toEqual(['- 관련 분석: T-Test (ID: analysis-1)'])

    expect(renderMarkdownProvenanceLines(getFigureProvenanceLines({
      entityId: 'figure-1',
      label: 'Figure 1',
      caption: 'Graph Caption',
      relatedAnalysisId: 'analysis-1',
      relatedAnalysisLabel: 'T-Test',
      patternSummary: 'B가 A보다 높음',
    }))).toEqual([
      '- 관련 분석: T-Test (ID: analysis-1)',
      '- 패턴 요약: B가 A보다 높음',
    ])

    expect(renderHtmlProvenance([
      '관련 분석: T-Test (ID: analysis-1)',
      '패턴 요약: B가 A보다 높음',
    ])).toContain('<li>관련 분석: T-Test (ID: analysis-1)</li>')
  })
})
