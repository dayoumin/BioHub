import { describe, expect, it } from 'vitest'
import type { StudySchema } from '../study-schema'
import { buildMethodsDraftReadiness } from '../methods-readiness'

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
      sources: [
        {
          id: 'dataset:growth.csv',
          kind: 'dataset',
          label: 'growth.csv',
          origin: 'data-file',
          verification: {
            status: 'verified',
            evidence: '40 rows, 3 variables',
          },
          allowedClaims: ['source-label', 'data-file-name', 'row-count', 'variable-count'],
        },
      ],
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
    assumptions: [
      {
        category: 'normality',
        testName: 'Shapiro-Wilk',
        statistic: 0.97,
        pValue: 0.31,
        passed: true,
      },
    ],
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

describe('buildMethodsDraftReadiness', () => {
  it('returns ready when Methods inputs are sufficient', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema())

    expect(readiness.status).toBe('ready')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.shouldReviewBeforeInsert).toBe(false)
    expect(readiness.promptCount).toBe(0)
    expect(readiness.scope.category).toBe('t-test')
    expect(readiness.blockingGateRules).toEqual([])
    expect(readiness.reviewGateRules).toEqual([])
    expect(readiness.checklist.every((item) => item.status === 'complete')).toBe(true)
  })

  it('asks only user-facing follow-up questions for reviewable gaps', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      study: {},
      source: {
        ...makeSchema().source,
        missingValues: 2,
      },
      preprocessing: {
        ...makeSchema().preprocessing,
        validation: {
          ...makeSchema().preprocessing.validation,
          missingValues: 2,
        },
        warnings: ['Missing values are present but handling is not user-confirmed.'],
      },
      assumptions: [],
    }))

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.shouldReviewBeforeInsert).toBe(true)
    expect(readiness.reviewGateRules).toEqual([
      'missing-study-purpose',
      'missing-data-handling',
      'missing-data-description',
      'missing-assumption-decision',
    ])
    expect(readiness.prompts.map((prompt) => prompt.field)).toEqual([
      'researchQuestion',
      'dataDescription',
      'missingDataHandling',
      'assumptionDecision',
    ])
    expect(readiness.prompts.find((prompt) => prompt.field === 'missingDataHandling')?.priority).toBe('required')
  })

  it('marks reviewable gaps complete when user-backed method notes are present', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      study: {
        researchQuestion: '사료 처리에 따라 체장이 달라지는가?',
        context: '사료 처리에 따른 체장 차이를 평가',
        dataDescription: '대조군과 처리군 각 20개체의 체장을 비교했다.',
        missingDataHandling: '결측값이 포함된 행은 해당 분석에서 제외했다.',
        assumptionDecision: '정규성 가정이 충족되어 모수 검정을 유지했다.',
      },
      source: {
        ...makeSchema().source,
        missingValues: 2,
      },
      preprocessing: {
        ...makeSchema().preprocessing,
        validation: {
          ...makeSchema().preprocessing.validation,
          missingValues: 2,
        },
      },
      assumptions: [],
    }))

    expect(readiness.checklist.find((item) => item.id === 'missing-data')?.status).toBe('complete')
    expect(readiness.checklist.find((item) => item.id === 'assumption-checks')?.status).toBe('complete')
    expect(readiness.prompts.map((prompt) => prompt.field)).not.toContain('missingDataHandling')
    expect(readiness.prompts.map((prompt) => prompt.field)).not.toContain('assumptionDecision')
  })

  it('requires review when an assumption fails without a user-confirmed decision', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      assumptions: [
        {
          category: 'normality',
          testName: 'Shapiro-Wilk',
          statistic: 0.83,
          pValue: 0.004,
          passed: false,
        },
      ],
    }))

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.shouldReviewBeforeInsert).toBe(true)
    expect(readiness.reviewGateRules).toContain('missing-assumption-decision')
    expect(readiness.checklist.find((item) => item.id === 'assumption-checks')?.status).toBe('warning')
    expect(readiness.prompts.map((prompt) => prompt.field)).toContain('assumptionDecision')
  })

  it('treats failed assumptions as complete only after a user-confirmed decision is present', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      study: {
        ...makeSchema().study,
        assumptionDecision: '정규성 가정 위반이 확인되어 Welch 보정 검정을 사용했다.',
      },
      assumptions: [
        {
          category: 'normality',
          testName: 'Shapiro-Wilk',
          statistic: 0.83,
          pValue: 0.004,
          passed: false,
        },
      ],
    }))

    expect(readiness.status).toBe('ready')
    expect(readiness.shouldReviewBeforeInsert).toBe(false)
    expect(readiness.reviewGateRules).not.toContain('missing-assumption-decision')
    expect(readiness.checklist.find((item) => item.id === 'assumption-checks')?.status).toBe('complete')
    expect(readiness.prompts.map((prompt) => prompt.field)).not.toContain('assumptionDecision')
  })

  it('blocks Methods drafting when variable roles are missing', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      variables: [
        { columnKey: 'length', label: '체장', roles: ['display'] },
      ],
    }))

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.checklist.find((item) => item.id === 'variable-roles')?.status).toBe('blocked')
  })

  it('blocks Materials/Samples wording when species source is not verified', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      materials: {
        ...makeSchema().materials,
        sources: [
          ...makeSchema().materials.sources,
          {
            id: 'species:salmo-salar',
            kind: 'species',
            label: 'Salmo salar',
            origin: 'user-input',
            scientificName: 'Salmo salar',
            verification: {
              status: 'unverified',
            },
            allowedClaims: ['source-label'],
          },
        ],
        errors: ['Species source "Salmo salar" is unverified.'],
      },
    }))

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toContain('unverified-species-source')
    expect(readiness.checklist.find((item) => item.id === 'materials-source')?.status).toBe('blocked')
  })

  it('blocks Methods drafting whenever validation errors remain', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      source: {
        ...makeSchema().source,
        errors: ['length 컬럼에 숫자가 아닌 값이 있습니다.'],
      },
    }))

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toEqual(['validation-errors'])
    expect(readiness.checklist.find((item) => item.id === 'missing-data')?.gateRule).toBe('validation-errors')
  })

  it('requires review when preprocessing source has unconfirmed transformation steps', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      preprocessing: {
        ...makeSchema().preprocessing,
        steps: [
          {
            id: 'pre:z-score',
            kind: 'standardization',
            label: 'z-score scaling',
            origin: 'pipeline-log',
            status: 'unconfirmed',
            affectedVariables: ['length'],
          },
        ],
        warnings: ['Preprocessing steps include transformations or exclusions without user-confirmed rationale.'],
      },
    }))

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.reviewGateRules).toContain('missing-data-handling')
    expect(readiness.checklist.find((item) => item.id === 'preprocessing-source')?.status).toBe('needs-input')
  })

  it('blocks Methods drafting when post hoc results lack a correction method', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        postHocCount: 3,
        postHocMethod: undefined,
      },
    }))

    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.prompts.map((prompt) => prompt.field)).toContain('postHocMethod')
  })

  it('requires model rationale review for regression methods without blocking draft generation', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        methodId: 'linear-regression',
        methodName: '선형 회귀',
        canonicalMethodId: 'linear-regression',
      },
    }))

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.scope.category).toBe('regression')
    expect(readiness.reviewGateRules).toContain('missing-model-rationale')
    expect(readiness.prompts.map((prompt) => prompt.field)).toContain('analysisRationale')
  })

  it('does not block design methods only because variable roles are absent', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      variables: [],
      analysis: {
        ...makeSchema().analysis,
        methodId: 'power-analysis',
        methodName: '검정력 분석',
        canonicalMethodId: 'power-analysis',
      },
    }))

    expect(readiness.status).toBe('ready')
    expect(readiness.scope.category).toBe('design')
    expect(readiness.blockingGateRules).not.toContain('missing-variable-roles')
    expect(readiness.checklist.find((item) => item.id === 'variable-roles')).toBeUndefined()
  })

  it('does not block descriptive methods for absent variable roles but preserves review gates', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      variables: [],
      assumptions: [],
      analysis: {
        ...makeSchema().analysis,
        methodId: 'descriptive-stats',
        methodName: '기술통계량',
        canonicalMethodId: 'descriptive-stats',
      },
    }))

    expect(readiness.status).toBe('needs-review')
    expect(readiness.canGenerateDraft).toBe(true)
    expect(readiness.scope.category).toBe('descriptive')
    expect(readiness.blockingGateRules).not.toContain('missing-variable-roles')
    expect(readiness.reviewGateRules).toEqual(['missing-assumption-decision'])
    expect(readiness.checklist.find((item) => item.id === 'variable-roles')).toBeUndefined()
  })

  it('still blocks descriptive methods when species source is unsafe', () => {
    const readiness = buildMethodsDraftReadiness(makeSchema({
      analysis: {
        ...makeSchema().analysis,
        methodId: 'descriptive-stats',
        methodName: '기술통계량',
        canonicalMethodId: 'descriptive-stats',
      },
      materials: {
        ...makeSchema().materials,
        sources: [
          ...makeSchema().materials.sources,
          {
            id: 'species:unknown',
            kind: 'species',
            label: 'Unknown species',
            origin: 'user-input',
            verification: {
              status: 'failed',
            },
            allowedClaims: ['source-label'],
          },
        ],
        errors: ['Species source "Unknown species" is failed.'],
      },
    }))

    expect(readiness.scope.category).toBe('descriptive')
    expect(readiness.status).toBe('blocked')
    expect(readiness.canGenerateDraft).toBe(false)
    expect(readiness.blockingGateRules).toContain('unverified-species-source')
  })
})
