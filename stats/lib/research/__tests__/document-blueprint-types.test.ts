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
  buildDocumentAuthoringPlanFromStudySchema,
  buildGeneratedArtifactId,
  createGeneratedArtifactProvenance,
  getDocumentAuthoringPlan,
  getDocumentSourceRefKey,
  upsertGeneratedArtifactProvenance,
} from '../document-blueprint-types'
import type { DocumentBlueprint } from '../document-blueprint-types'
import type { PaperTable } from '@/lib/services/paper-draft/paper-types'
import type { StudySchema } from '@/lib/services/paper-draft/study-schema'
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

const makeStudySchema = (
  options: {
    historyId?: string
    methodName?: string
    sourceFingerprint?: string
  } = {},
): StudySchema => {
  const now = '2026-04-29T00:00:00.000Z'
  const methodName = options.methodName ?? '독립표본 t-검정'

  return {
    version: 1,
    generatedAt: now,
    language: 'ko',
    study: {},
    source: {
      historyId: options.historyId,
      variables: [],
      warnings: [],
      errors: [],
      sourceFingerprint: options.sourceFingerprint ?? `v1:${options.historyId ?? 'test'}`,
    },
    variables: [],
    groups: [],
    materials: {
      sources: [],
      sampling: {
        equipment: [],
        reagents: [],
      },
      prohibitedAutoClaims: [
        'equipment-name',
        'reagent-name',
        'ethics-approval',
        'collection-location',
        'storage-condition',
        'verified-species-identity',
      ],
      warnings: [],
      errors: [],
    },
    preprocessing: {
      validation: {
        missingValues: 0,
        duplicateRows: 0,
        warnings: [],
        errors: [],
      },
      steps: [],
      prohibitedAutoClaims: [
        'outlier-removal',
        'mcar',
        'mar',
        'variable-transform',
        'standardization',
        'exclusion-criteria',
      ],
      warnings: [],
      errors: [],
    },
    assumptions: [],
    analysis: {
      methodId: 'two-sample-t',
      methodName,
      statistic: 2,
      pValue: 0.03,
      postHocCount: 0,
      coefficientCount: 0,
      groupStatCount: 0,
      options: [],
    },
    reporting: {},
    issues: [],
    readiness: { methods: true, results: true, captions: true },
  }
}

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

  it('should default invalid legacy metadata to an empty object', () => {
    const now = new Date().toISOString()
    const legacyDocument = {
      id: 'doc_4',
      projectId: 'proj_1',
      preset: 'paper',
      title: 'Legacy metadata document',
      language: 'ko',
      metadata: null,
      createdAt: now,
      updatedAt: now,
      sections: [],
    } as unknown as DocumentBlueprint

    const normalized = normalizeDocumentBlueprint(legacyDocument)

    expect(normalized.metadata).toEqual({})
  })

  it('should preserve paper study schema metadata when present', () => {
    const now = new Date().toISOString()
    const studySchema: StudySchema = {
      version: 1,
      generatedAt: now,
      language: 'ko',
      study: {},
      source: {
        variables: [],
        warnings: [],
        errors: [],
        sourceFingerprint: 'v1:test',
      },
      variables: [],
      groups: [],
      materials: {
        sources: [],
        sampling: {
          equipment: [],
          reagents: [],
        },
        prohibitedAutoClaims: [
          'equipment-name',
          'reagent-name',
          'ethics-approval',
          'collection-location',
          'storage-condition',
          'verified-species-identity',
        ],
        warnings: [],
        errors: [],
      },
      preprocessing: {
        validation: {
          missingValues: 0,
          duplicateRows: 0,
          warnings: [],
          errors: [],
        },
        steps: [],
        prohibitedAutoClaims: [
          'outlier-removal',
          'mcar',
          'mar',
          'variable-transform',
          'standardization',
          'exclusion-criteria',
        ],
        warnings: [],
        errors: [],
      },
      assumptions: [],
      analysis: {
        methodId: 't-test',
        methodName: 't-test',
        statistic: 2,
        pValue: 0.03,
        postHocCount: 0,
        coefficientCount: 0,
        groupStatCount: 0,
        options: [],
      },
      reporting: {},
      issues: [],
      readiness: { methods: true, results: true, captions: true },
    }

    const normalized = normalizeDocumentBlueprint({
      id: 'doc_5',
      projectId: 'proj_1',
      preset: 'paper',
      title: 'Study schema document',
      language: 'ko',
      metadata: { studySchema },
      createdAt: now,
      updatedAt: now,
      sections: [],
    })

    expect('studySchema' in normalized.metadata).toBe(true)
    expect((normalized.metadata as { studySchema?: typeof studySchema }).studySchema).toBe(studySchema)
  })

  it('should build a source-keyed authoring plan from a study schema', () => {
    const studySchema = makeStudySchema({
      historyId: 'hist_1',
      methodName: '일원분산분석',
      sourceFingerprint: 'v1:hist-1',
    })

    const plan = buildDocumentAuthoringPlanFromStudySchema(studySchema)

    expect(plan.mode).toBe('single-source')
    expect(plan.primarySourceRef).toEqual({
      kind: 'analysis',
      sourceId: 'hist_1',
      label: '일원분산분석',
    })
    expect(plan.sources).toHaveLength(1)
    expect(plan.sources[0]?.role).toBe('primary-analysis')
    expect(plan.sources[0]?.sourceFingerprint).toBe('v1:hist-1')
    expect(plan.sources[0]?.studySchema).toBe(studySchema)
  })

  it('should keep study schemas per source when an authoring plan has multiple analyses', () => {
    const firstSchema = makeStudySchema({
      historyId: 'hist_1',
      methodName: '일원분산분석',
      sourceFingerprint: 'v1:hist-1',
    })
    const secondSchema = makeStudySchema({
      historyId: 'hist_2',
      methodName: '선형 회귀',
      sourceFingerprint: 'v1:hist-2',
    })
    const firstPlan = buildDocumentAuthoringPlanFromStudySchema(firstSchema)
    const mergedPlan = buildDocumentAuthoringPlanFromStudySchema(secondSchema, firstPlan)
    const normalized = normalizeDocumentBlueprint({
      id: 'doc_6',
      projectId: 'proj_1',
      preset: 'paper',
      title: 'Multi-analysis document',
      language: 'ko',
      metadata: { authoringPlan: mergedPlan },
      createdAt: firstSchema.generatedAt,
      updatedAt: secondSchema.generatedAt,
      sections: [],
    })
    const plan = getDocumentAuthoringPlan(normalized.metadata)

    expect(plan?.mode).toBe('multi-source')
    expect(plan?.primarySourceRef).toEqual({
      kind: 'analysis',
      sourceId: 'hist_1',
      label: '일원분산분석',
    })
    expect(plan?.sources.map((source) => getDocumentSourceRefKey(source.sourceRef))).toEqual([
      'analysis:hist_1',
      'analysis:hist_2',
    ])
    expect(plan?.sources[0]?.role).toBe('primary-analysis')
    expect(plan?.sources[1]?.role).toBe('secondary-analysis')
    expect(plan?.sources[0]?.studySchema).toBe(firstSchema)
    expect(plan?.sources[1]?.studySchema).toBe(secondSchema)
  })

  it('should create deterministic generated artifact provenance from source refs', () => {
    const sourceRefs = [
      createDocumentSourceRef('analysis', 'hist_2'),
      createDocumentSourceRef('analysis', 'hist_1'),
    ]

    const artifact = createGeneratedArtifactProvenance({
      artifactKind: 'results',
      generatedAt: '2026-04-29T00:00:00.000Z',
      generator: {
        type: 'template',
        id: 'document-writing-orchestrator',
      },
      sourceRefs,
    })

    expect(artifact.artifactId).toBe(buildGeneratedArtifactId('results', sourceRefs))
    expect(artifact.artifactId).toBe(buildGeneratedArtifactId('results', [...sourceRefs].reverse()))
    expect(artifact.generator.id).toBe('document-writing-orchestrator')
  })

  it('should connect generated artifact provenance back to authoring plan sources and sections', () => {
    const firstSchema = makeStudySchema({
      historyId: 'hist_1',
      methodName: '일원분산분석',
    })
    const authoringPlan = buildDocumentAuthoringPlanFromStudySchema(firstSchema)
    const sourceRef = createDocumentSourceRef('analysis', 'hist_1', { label: '일원분산분석' })
    const artifact = createGeneratedArtifactProvenance({
      artifactKind: 'methods',
      generatedAt: '2026-04-29T00:00:00.000Z',
      generator: {
        type: 'template',
        id: 'document-writing-orchestrator',
      },
      sourceRefs: [sourceRef],
    })

    const metadata = upsertGeneratedArtifactProvenance({ authoringPlan }, artifact)
    const plan = getDocumentAuthoringPlan(metadata)

    expect((metadata as { generatedArtifacts?: unknown[] }).generatedArtifacts).toEqual([artifact])
    expect(plan?.sources[0]?.generatedArtifactIds).toEqual([artifact.artifactId])
    expect(plan?.sectionPlans).toEqual([
      {
        sectionId: 'methods',
        sourceRefs: [sourceRef],
        generatedArtifactIds: [artifact.artifactId],
      },
    ])
  })
})
