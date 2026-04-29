import { describe, expect, it } from 'vitest'
import type { StudySchema } from '../study-schema'
import { buildResultsDraftReadiness } from '../results-readiness'

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
      { columnKey: 'weight', label: '체중', unit: 'g', roles: ['display'] },
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
      effectSize: {
        value: 0.74,
        type: 'cohens-d',
      },
      confidenceInterval: {
        lower: 0.12,
        upper: 1.36,
        level: 0.95,
      },
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

describe('buildResultsDraftReadiness', () => {
  it('returns ready when core Results facts are sufficient', () => {
    const readiness = buildResultsDraftReadiness(makeSchema())

    expect(readiness.status).toBe('ready')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.shouldReviewBeforeInsert).toBe(false)
    expect(readiness.scope.category).toBe('t-test')
    expect(readiness.blockingGateRules).toEqual([])
    expect(readiness.reviewGateRules).toEqual([])
  })

  it('blocks Results drafting when the core statistic is missing', () => {
    const readiness = buildResultsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        statistic: Number.NaN,
      },
    }))

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toEqual(['missing-core-statistic'])
    expect(readiness.checklist.find((item) => item.id === 'core-statistic')?.status).toBe('blocked')
  })

  it('blocks Results drafting when the p-value is missing', () => {
    const readiness = buildResultsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        pValue: Number.NaN,
      },
    }))

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toEqual(['missing-p-value'])
  })

  it('blocks Results drafting when source provenance is missing', () => {
    const readiness = buildResultsDraftReadiness(makeSchema({
      source: {
        ...makeSchema().source,
        sourceFingerprint: '',
      },
    }))

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toEqual(['missing-source-provenance'])
  })

  it('allows abbreviated Results when effect size or CI is missing', () => {
    const readiness = buildResultsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        effectSize: undefined,
        confidenceInterval: undefined,
      },
    }))

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.shouldReviewBeforeInsert).toBe(true)
    expect(readiness.reviewGateRules).toEqual(['missing-effect-size', 'missing-confidence-interval'])
  })

  it('does not require effect size or CI for descriptive methods', () => {
    const readiness = buildResultsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        methodId: 'descriptive-stats',
        methodName: '기술통계량',
        canonicalMethodId: 'descriptive-stats',
        pValue: Number.NaN,
        effectSize: undefined,
        confidenceInterval: undefined,
        groupStatCount: 0,
      },
    }))

    expect(readiness.status).toBe('ready')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.scope.category).toBe('descriptive')
    expect(readiness.reviewGateRules).toEqual([])
  })

  it('marks regression model-fit gaps for review even when coefficients exist', () => {
    const readiness = buildResultsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        methodId: 'linear-regression',
        methodName: '선형 회귀',
        canonicalMethodId: 'linear-regression',
        coefficientCount: 2,
        options: [],
      },
    }))

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.reviewGateRules).toContain('missing-model-fit')
  })

  it('marks ANOVA post-hoc correction gaps for review without inventing a method', () => {
    const readiness = buildResultsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        methodId: 'one-way-anova',
        methodName: '일원분산분석',
        canonicalMethodId: 'one-way-anova',
        postHocCount: 3,
        postHocMethod: undefined,
      },
    }))

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.reviewGateRules).toContain('missing-post-hoc-method')
  })
})
