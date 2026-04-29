import { describe, expect, it } from 'vitest'
import type { StudySchema } from '../study-schema'
import { buildCaptionsDraftReadiness } from '../captions-readiness'

function makeSchema(overrides: Partial<StudySchema> = {}): StudySchema {
  return {
    version: 1,
    generatedAt: '2026-04-29T00:00:00.000Z',
    language: 'ko',
    study: {
      researchQuestion: '사료 처리에 따라 체장이 달라지는가?',
      context: '사료 처리에 따른 체장 차이를 평가',
      dataDescription: '대조군과 처리군 각 20개체의 체장을 비교했다.',
    },
    source: {
      historyId: 'hist-1',
      projectId: 'project-1',
      fileName: 'growth.csv',
      rowCount: 40,
      columnCount: 3,
      variables: ['group', 'length', 'weight'],
      missingValues: 0,
      duplicateRows: 0,
      warnings: [],
      errors: [],
      sourceFingerprint: 'v1:test',
    },
    variables: [
      { columnKey: 'group', label: '처리군', roles: ['group'] },
      { columnKey: 'length', label: '체장', unit: 'cm', roles: ['dependent'] },
    ],
    groups: [
      { key: 'control', label: '대조군' },
      { key: 'treated', label: '처리군' },
    ],
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
      methodName: '독립표본 t-검정',
      canonicalMethodId: 'two-sample-t',
      statistic: 2.31,
      pValue: 0.028,
      postHocCount: 0,
      coefficientCount: 0,
      groupStatCount: 2,
      options: [],
    },
    reporting: {
      dependentVariableLabel: '체장',
    },
    issues: [],
    readiness: {
      methods: true,
      results: true,
      captions: true,
    },
    ...overrides,
  }
}

describe('buildCaptionsDraftReadiness', () => {
  it('returns ready for table captions with source provenance and variable metadata', () => {
    const readiness = buildCaptionsDraftReadiness(makeSchema(), {
      tableCount: 2,
      figureCount: 0,
      hasFigureSource: false,
    })

    expect(readiness.status).toBe('ready')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.blockingGateRules).toEqual([])
    expect(readiness.reviewGateRules).toEqual([])
  })

  it('blocks captions when no table or figure source exists', () => {
    const readiness = buildCaptionsDraftReadiness(makeSchema(), {
      tableCount: 0,
      figureCount: 0,
      hasFigureSource: false,
    })

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toEqual(['missing-caption-source'])
  })

  it('blocks captions when source provenance is missing', () => {
    const readiness = buildCaptionsDraftReadiness(makeSchema({
      source: {
        ...makeSchema().source,
        sourceFingerprint: '',
      },
    }), {
      tableCount: 1,
      figureCount: 0,
      hasFigureSource: false,
    })

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toEqual(['missing-source-provenance'])
  })

  it('allows figure captions but marks message and panel description for review', () => {
    const readiness = buildCaptionsDraftReadiness(makeSchema(), {
      tableCount: 1,
      figureCount: 1,
      hasFigureSource: true,
      hasPanelSource: false,
    })

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.reviewGateRules).toEqual([
      'missing-caption-message',
      'missing-panel-description',
    ])
  })

  it('does not generate figure captions when a figure count lacks source binding', () => {
    const readiness = buildCaptionsDraftReadiness(makeSchema(), {
      tableCount: 0,
      figureCount: 1,
      hasFigureSource: false,
    })

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toEqual(['missing-caption-source'])
  })
})
