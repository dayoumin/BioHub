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
  normalizeDocumentBlueprint,
  createDocumentSourceRef,
} from '../document-blueprint-types'
import type { DocumentBlueprint } from '../document-blueprint-types'
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
  it('should prefer sourceRefs analysis ids over compat analysisId', () => {
    const gp = makeGraphProject({
      analysisId: 'hist_compat',
      sourceRefs: [{ kind: 'analysis', sourceId: 'hist_canonical', label: 'Canonical' }],
    })

    expect(getGraphPrimaryAnalysisId(gp)).toBe('hist_canonical')
  })

  it('should fall back to sourceSnapshot analysis refs before compat analysisId', () => {
    const gp = makeGraphProject({
      analysisId: 'hist_compat',
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

describe('normalizeDocumentBlueprint', () => {
  it('should provide a default idle writing state for legacy documents', () => {
    const now = new Date().toISOString()
    const normalized = normalizeDocumentBlueprint({
      id: 'doc_1',
      projectId: 'proj_1',
      preset: 'paper',
      title: 'Legacy document',
      language: 'ko',
      metadata: {},
      createdAt: now,
      updatedAt: now,
      sections: [{
        id: 'results',
        title: '결과',
        content: '본문',
        sourceRefs: [createDocumentSourceRef('analysis', 'hist_1')],
        editable: true,
        generatedBy: 'template',
      }],
    })

    expect(normalized.writingState).toEqual({
      status: 'idle',
      jobId: undefined,
      startedAt: undefined,
      updatedAt: undefined,
      errorMessage: undefined,
      sectionStates: {},
    })
  })

  it('should preserve existing writing state fields', () => {
    const now = new Date().toISOString()
    const normalized = normalizeDocumentBlueprint({
      id: 'doc_2',
      projectId: 'proj_1',
      preset: 'paper',
      title: 'Drafting document',
      language: 'ko',
      metadata: {},
      createdAt: now,
      updatedAt: now,
      writingState: {
        status: 'patching',
        jobId: 'job_1',
        startedAt: now,
        updatedAt: now,
        errorMessage: undefined,
        sectionStates: {
          results: {
            status: 'patched',
            jobId: 'job_1',
            updatedAt: now,
          },
        },
      },
      sections: [{
        id: 'results',
        title: '결과',
        content: '본문',
        sourceRefs: [],
        editable: true,
        generatedBy: 'llm',
      }],
    })

    expect(normalized.writingState?.status).toBe('patching')
    expect(normalized.writingState?.jobId).toBe('job_1')
    expect(normalized.writingState?.sectionStates.results?.status).toBe('patched')
  })

  it('should normalize legacy unknown and string source refs into supplementary refs', () => {
    const now = new Date().toISOString()
    const legacyDocument = {
      id: 'doc_3',
      projectId: 'proj_1',
      preset: 'paper',
      title: 'Legacy supplementary document',
      language: 'ko',
      metadata: {},
      createdAt: now,
      updatedAt: now,
      sections: [{
        id: 'results',
        title: '결과',
        content: '본문',
        sourceRefs: [
          { kind: 'unknown', sourceId: 'legacy_1', label: 'Legacy ref' },
          'legacy_2',
        ],
        editable: true,
        generatedBy: 'template',
      }],
    } as unknown as DocumentBlueprint
    const normalized = normalizeDocumentBlueprint(legacyDocument)

    expect(normalized.sections[0]?.sourceRefs).toEqual([
      { kind: 'supplementary', sourceId: 'legacy_1', label: 'Legacy ref' },
      { kind: 'supplementary', sourceId: 'legacy_2', label: undefined },
    ])
  })
})
