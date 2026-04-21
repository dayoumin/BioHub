/**
 * DocumentBlueprint 타입 유틸 테스트
 *
 * convertPaperTable, buildFigureRef, generateDocumentId
 */

import { describe, it, expect } from 'vitest'
import {
  convertPaperTable,
  buildFigureRef,
  getGraphPrimaryAnalysisId,
  generateDocumentId,
} from '../document-blueprint-types'
import type { PaperTable } from '@/lib/services/paper-draft/paper-types'
import type { GraphProject } from '@/types/graph-studio'

const makeGraphProject = (
  overrides: Partial<GraphProject> = {},
): GraphProject => ({
  id: 'gp_1',
  name: 'Growth Chart',
  chartSpec: { chartType: 'bar' } as GraphProject['chartSpec'],
  dataPackageId: 'dp_1',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
})

describe('convertPaperTable', () => {
  it('should parse tab-separated plainText into headers and rows', () => {
    const pt: PaperTable = {
      id: 'descriptive',
      title: 'Table 1. 기술통계량',
      htmlContent: '<table>...</table>',
      plainText: 'Group\tMean\tSD\nA\t10.5\t2.3\nB\t12.1\t3.1',
    }

    const result = convertPaperTable(pt)

    expect(result.id).toBe('descriptive')
    expect(result.caption).toBe('Table 1. 기술통계량')
    expect(result.headers).toEqual(['Group', 'Mean', 'SD'])
    expect(result.rows).toEqual([
      ['A', '10.5', '2.3'],
      ['B', '12.1', '3.1'],
    ])
    expect(result.htmlContent).toBe('<table>...</table>')
  })

  it('should pad rows with fewer columns than headers', () => {
    const pt: PaperTable = {
      id: 'test-result',
      title: 'Table 2',
      htmlContent: '',
      plainText: 'A\tB\tC\n1\t2',
    }

    const result = convertPaperTable(pt)

    expect(result.headers).toEqual(['A', 'B', 'C'])
    expect(result.rows).toEqual([['1', '2', '']])
  })

  it('should handle single-row (header only) table', () => {
    const pt: PaperTable = {
      id: 'descriptive',
      title: 'Empty table',
      htmlContent: '',
      plainText: 'Col1\tCol2',
    }

    const result = convertPaperTable(pt)

    expect(result.headers).toEqual(['Col1', 'Col2'])
    expect(result.rows).toEqual([])
  })

  it('should handle empty plainText', () => {
    const pt: PaperTable = {
      id: 'descriptive',
      title: 'No data',
      htmlContent: '',
      plainText: '',
    }

    const result = convertPaperTable(pt)

    expect(result.headers).toEqual([])
    expect(result.rows).toEqual([])
  })

  it('should skip blank lines in plainText', () => {
    const pt: PaperTable = {
      id: 'descriptive',
      title: 'With blanks',
      htmlContent: '',
      plainText: 'H1\tH2\n\nR1\tR2\n',
    }

    const result = convertPaperTable(pt)

    expect(result.headers).toEqual(['H1', 'H2'])
    expect(result.rows).toEqual([['R1', 'R2']])
  })

  it('should preserve source analysis metadata when provided', () => {
    const pt: PaperTable = {
      id: 'test-result',
      title: 'ANOVA Table',
      htmlContent: '',
      plainText: 'Source\tF\tp\nGroup\t4.50\t0.012',
    }

    const result = convertPaperTable(pt, {
      sourceAnalysisId: 'hist_1',
      sourceAnalysisLabel: 'One-way ANOVA',
    })

    expect(result.sourceAnalysisId).toBe('hist_1')
    expect(result.sourceAnalysisLabel).toBe('One-way ANOVA')
  })
})

describe('buildFigureRef', () => {
  it('should create FigureRef with chart type in caption', () => {
    const gp = makeGraphProject()

    const result = buildFigureRef(gp, 0)

    expect(result.entityId).toBe('gp_1')
    expect(result.label).toBe('Figure 1')
    expect(result.caption).toBe('Growth Chart (bar)')
    expect(result.chartType).toBe('bar')
  })

  it('should use 1-based index for label', () => {
    const gp = makeGraphProject({ id: 'gp_3' })

    const result = buildFigureRef(gp, 2)

    expect(result.label).toBe('Figure 3')
  })

  it('should use name only when chartType is missing', () => {
    const gp = makeGraphProject({
      chartSpec: {} as GraphProject['chartSpec'],
    })

    const result = buildFigureRef(gp, 0)

    expect(result.caption).toBe('Growth Chart')
  })

  it('should preserve related analysis metadata when provided', () => {
    const gp = makeGraphProject()

    const result = buildFigureRef(gp, 0, {
      relatedAnalysisId: 'hist_1',
      relatedAnalysisLabel: 'One-way ANOVA',
      patternSummary: 'B 평균이 A보다 높음',
    })

    expect(result.relatedAnalysisId).toBe('hist_1')
    expect(result.relatedAnalysisLabel).toBe('One-way ANOVA')
    expect(result.patternSummary).toBe('B 평균이 A보다 높음')
  })
})

describe('getGraphPrimaryAnalysisId', () => {
  it('should prefer sourceRefs analysis ids over legacy analysisId', () => {
    const gp = makeGraphProject({
      analysisId: 'hist_legacy',
      sourceRefs: [{ kind: 'analysis', sourceId: 'hist_canonical', label: 'Canonical' }],
    })

    expect(getGraphPrimaryAnalysisId(gp)).toBe('hist_canonical')
  })

  it('should fall back to sourceSnapshot analysis refs before legacy analysisId', () => {
    const gp = makeGraphProject({
      analysisId: 'hist_legacy',
      sourceSnapshot: {
        capturedAt: '2026-01-01',
        rowCount: 3,
        columns: [],
        sourceRefs: [{ kind: 'analysis', sourceId: 'hist_snapshot', label: 'Snapshot' }],
      },
    })

    expect(getGraphPrimaryAnalysisId(gp)).toBe('hist_snapshot')
  })
})

describe('generateDocumentId', () => {
  it('should start with "doc_"', () => {
    const id = generateDocumentId()
    expect(id).toMatch(/^doc_\d+_[a-z0-9]+$/)
  })

  it('should generate unique IDs', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateDocumentId()))
    expect(ids.size).toBe(20)
  })
})
