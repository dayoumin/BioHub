import { describe, expect, it } from 'vitest'
import type { ValidationResults } from '@/types/analysis'
import type { ExportContext } from '@/lib/services/export/export-types'
import type { DraftContext } from '../paper-types'
import {
  buildStudySchema,
  buildStudySchemaSourceFingerprint,
  isStudySchemaCompatible,
} from '../study-schema'

function makeExportContext(): ExportContext {
  return {
    analysisResult: {
      method: 'Independent t-test',
      canonicalMethodId: 'two-sample-t',
      displayMethodName: '독립표본 t-검정',
      statistic: 2.31,
      statisticName: 't',
      pValue: 0.028,
      df: 38,
      effectSize: {
        value: 0.74,
        type: 'cohens-d',
        interpretation: 'medium-to-large',
      },
      confidence: {
        lower: 1.2,
        upper: 5.6,
        estimate: 3.4,
        level: 0.95,
      },
      interpretation: '실험군과 대조군 간 차이가 유의했다.',
      assumptions: {
        normality: {
          group1: {
            statistic: 0.97,
            pValue: 0.31,
            isNormal: true,
          },
          group2: {
            statistic: 0.95,
            pValue: 0.22,
            isNormal: true,
          },
        },
        homogeneity: {
          levene: {
            statistic: 1.12,
            pValue: 0.29,
            equalVariance: true,
          },
        },
      },
      groupStats: [
        { name: 'control', mean: 12.3, std: 1.1, n: 20 },
        { name: 'treated', mean: 15.7, std: 1.5, n: 20 },
      ],
      postHoc: [],
      coefficients: [],
    },
    statisticalResult: {
      testName: 'Independent t-test',
      statistic: 2.31,
      pValue: 0.028,
      interpretation: 'significant',
    },
    aiInterpretation: 'AI summary',
    apaFormat: 't(38) = 2.31, p = .028, d = 0.74',
    dataInfo: {
      fileName: 'growth.csv',
      totalRows: 40,
      columnCount: 3,
      variables: ['group', 'length', 'weight'],
    },
    rawDataRows: null,
  }
}

function makeDraftContext(): DraftContext {
  return {
    variableLabels: {
      group: '처리군',
      length: '체장',
      weight: '체중',
    },
    variableUnits: {
      length: 'cm',
      weight: 'g',
    },
    groupLabels: {
      control: '대조군',
      treated: '실험군',
    },
    dependentVariable: '체장',
    researchContext: '양식 어류의 처리 효과 비교',
  }
}

function makeValidationResults(): ValidationResults {
  return {
    isValid: true,
    totalRows: 40,
    columnCount: 3,
    missingValues: 2,
    duplicateRows: 0,
    dataType: 'mixed',
    variables: ['group', 'length', 'weight'],
    errors: [],
    warnings: ['length 컬럼에 결측치 2개가 있습니다.'],
  }
}

describe('buildStudySchema', () => {
  it('maps analysis, variable, and validation metadata into a paper-ready schema', () => {
    const schema = buildStudySchema({
      exportContext: makeExportContext(),
      draftContext: makeDraftContext(),
      methodId: 'two-sample-t',
      variableMapping: {
        dependentVar: 'length',
        groupVar: 'group',
        variables: ['length', 'weight'],
      },
      validationResults: makeValidationResults(),
      analysisOptions: {
        confidenceLevel: 0.95,
        alternative: 'two-sided',
      },
      title: '사료 처리에 따른 체장 차이',
      projectId: 'proj-1',
      historyId: 'hist-1',
      researchQuestion: '사료 처리에 따라 체장이 달라지는가?',
      hypothesis: '실험군의 체장이 더 길다.',
      dataDescription: '처리군과 대조군 각각 20개체를 비교했다.',
    })

    expect(schema.study.title).toBe('사료 처리에 따른 체장 차이')
    expect(schema.source.fileName).toBe('growth.csv')
    expect(schema.source.missingValues).toBe(2)
    expect(schema.source.sourceFingerprint).toMatch(/^v1:/)
    expect(schema.variables).toEqual([
      {
        columnKey: 'group',
        label: '처리군',
        unit: undefined,
        roles: ['group'],
      },
      {
        columnKey: 'length',
        label: '체장',
        unit: 'cm',
        roles: ['dependent', 'variable'],
      },
      {
        columnKey: 'weight',
        label: '체중',
        unit: 'g',
        roles: ['variable'],
      },
    ])
    expect(schema.groups).toEqual([
      { key: 'control', label: '대조군' },
      { key: 'treated', label: '실험군' },
    ])
    expect(schema.materials.sources[0]).toMatchObject({
      kind: 'dataset',
      label: 'growth.csv',
      origin: 'data-file',
      verification: {
        status: 'verified',
        evidence: '40 rows, 3 variables',
      },
    })
    expect(schema.preprocessing.validation).toEqual({
      missingValues: 2,
      duplicateRows: 0,
      warnings: ['length 컬럼에 결측치 2개가 있습니다.'],
      errors: [],
    })
    expect(schema.preprocessing.warnings).toEqual([
      'Missing values are present but handling is not user-confirmed.',
    ])
    expect(schema.assumptions).toHaveLength(3)
    expect(schema.analysis.effectSize).toEqual({
      value: 0.74,
      type: 'cohens-d',
      interpretation: 'medium-to-large',
    })
    expect(schema.analysis.confidenceInterval).toEqual({
      lower: 1.2,
      upper: 5.6,
      estimate: 3.4,
      level: 0.95,
    })
    expect(schema.analysis.options).toEqual([
      { key: 'confidenceLevel', value: 0.95 },
      { key: 'alternative', value: 'two-sided' },
    ])
    expect(schema.readiness).toEqual({
      methods: true,
      results: true,
      captions: true,
    })
    expect(schema.issues).toEqual([
      {
        code: 'validationWarningsPresent',
        severity: 'warning',
        section: 'schema',
        message: '데이터 검증 경고가 남아 있습니다. 자동 생성 문장에 주의 문구를 포함해야 합니다.',
      },
    ])
  })

  it('rejects schema reuse when the source fingerprint changes', () => {
    const exportContext = makeExportContext()
    const draftContext = makeDraftContext()
    const variableMapping = {
      dependentVar: 'length',
      groupVar: 'group',
      variables: ['length', 'weight'],
    }
    const schema = buildStudySchema({
      exportContext,
      draftContext,
      methodId: 'two-sample-t',
      variableMapping,
      validationResults: makeValidationResults(),
      language: 'ko',
    })

    const changedFingerprint = buildStudySchemaSourceFingerprint({
      exportContext,
      draftContext: {
        ...draftContext,
        variableLabels: {
          ...draftContext.variableLabels,
          length: '체장 변경',
        },
      },
      methodId: 'two-sample-t',
      variableMapping,
      validationResults: makeValidationResults(),
      language: 'ko',
    })

    expect(isStudySchemaCompatible(schema, {
      methodId: 'two-sample-t',
      fileName: 'growth.csv',
      sourceFingerprint: schema.source.sourceFingerprint,
    })).toBe(true)
    expect(isStudySchemaCompatible(schema, {
      methodId: 'two-sample-t',
      fileName: 'growth.csv',
      sourceFingerprint: changedFingerprint,
    })).toBe(false)
  })

  it('marks methods/results as not ready when blocking prerequisites are missing', () => {
    const exportContext = makeExportContext()
    exportContext.analysisResult.postHoc = [
      {
        group1: 'control',
        group2: 'treated',
        pvalue: 0.02,
        significant: true,
      },
    ]
    exportContext.analysisResult.effectSize = undefined
    exportContext.analysisResult.confidence = undefined
    exportContext.analysisResult.assumptions = undefined

    const schema = buildStudySchema({
      exportContext,
      draftContext: makeDraftContext(),
      methodId: 'anova',
      variableMapping: null,
      validationResults: {
        ...makeValidationResults(),
        warnings: [],
      },
    })

    expect(schema.issues.map((issue) => issue.code)).toEqual([
      'missingResearchQuestion',
      'missingHypothesis',
      'missingVariableDefinitions',
      'missingEffectSize',
      'missingConfidenceInterval',
      'missingAssumptionChecks',
      'missingPostHocMethod',
    ])
    expect(schema.readiness).toEqual({
      methods: false,
      results: false,
      captions: false,
    })
  })

  it('preserves Materials/Samples sources and blocks unverified species claims', () => {
    const schema = buildStudySchema({
      exportContext: makeExportContext(),
      draftContext: makeDraftContext(),
      methodId: 'two-sample-t',
      variableMapping: {
        dependentVar: 'length',
        groupVar: 'group',
      },
      validationResults: {
        ...makeValidationResults(),
        warnings: [],
      },
      dataDescription: '양식 어류 성장 자료',
      materialSources: [
        {
          kind: 'species',
          label: 'Salmo salar',
          scientificName: 'Salmo salar',
          origin: 'user-input',
          verificationStatus: 'unverified',
        },
      ],
      sampling: {
        collectionLocation: 'Jeju hatchery',
        equipment: ['caliper'],
      },
    })

    expect(schema.materials.sources).toHaveLength(2)
    expect(schema.materials.sources.find((source) => source.kind === 'species')).toMatchObject({
      label: 'Salmo salar',
      scientificName: 'Salmo salar',
      verification: {
        status: 'unverified',
      },
      allowedClaims: ['source-label'],
    })
    expect(schema.materials.sampling.collectionLocation).toBe('Jeju hatchery')
    expect(schema.materials.sampling.equipment).toEqual(['caliper'])
    expect(schema.issues.map((issue) => issue.code)).toContain('unverifiedSpeciesSource')
    expect(schema.readiness.methods).toBe(false)
  })

  it('marks Methods not ready when validation errors are present', () => {
    const schema = buildStudySchema({
      exportContext: makeExportContext(),
      draftContext: makeDraftContext(),
      methodId: 'two-sample-t',
      variableMapping: {
        dependentVar: 'length',
        groupVar: 'group',
      },
      validationResults: {
        ...makeValidationResults(),
        warnings: [],
        errors: ['length 컬럼에 숫자가 아닌 값이 있습니다.'],
      },
      dataDescription: '처리군과 대조군 각각 20개체를 비교했다.',
    })

    expect(schema.preprocessing.errors).toEqual(['length 컬럼에 숫자가 아닌 값이 있습니다.'])
    expect(schema.issues.map((issue) => issue.code)).toContain('validationErrorsPresent')
    expect(schema.readiness.methods).toBe(false)
  })
})
