import { describe, expect, it } from 'vitest'
import { getMethodRequirements } from '@/lib/statistics/variable-requirements'
import type { AnalysisOptions } from '@/types/analysis'
import { buildAnalysisExecutionContext } from '../analysis-execution'

function makeAnalysisOptions(
  overrides: Partial<AnalysisOptions> = {}
): AnalysisOptions {
  return {
    alpha: 0.05,
    showAssumptions: true,
    showEffectSize: true,
    methodSettings: {},
    ...overrides,
  }
}

describe('buildAnalysisExecutionContext', () => {
  it('managed default alternative is not allowed to overwrite suggestedSettings.alternative', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({ alternative: 'two-sided' }),
      methodRequirements: getMethodRequirements('one-sample-t'),
      selectedMethodId: 'one-sample-t',
      suggestedSettings: { alternative: 'greater' },
      variableMapping: { dependentVar: 'score' },
    })

    expect(result.effectiveExecutionSettings.alternative).toBe('greater')
  })

  it('explicit user alternative overrides suggestedSettings.alternative', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({ alternative: 'less' }),
      methodRequirements: getMethodRequirements('one-sample-t'),
      selectedMethodId: 'one-sample-t',
      suggestedSettings: { alternative: 'greater' },
      variableMapping: { dependentVar: 'score' },
    })

    expect(result.effectiveExecutionSettings.alternative).toBe('less')
  })

  it('explicitly re-selecting the default alternative overrides suggestedSettings.alternative', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({
        alternative: 'two-sided',
        methodSettings: {
          __managedAnalysisOptionOverrides: 'alternative',
        },
      }),
      methodRequirements: getMethodRequirements('one-sample-t'),
      selectedMethodId: 'one-sample-t',
      suggestedSettings: { alternative: 'greater' },
      variableMapping: { dependentVar: 'score' },
    })

    expect(result.effectiveExecutionSettings.alternative).toBe('two-sided')
  })

  it('proportion methods carry only the schema-managed nullProportion into execution variables', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({ testValue: 42 }),
      methodRequirements: getMethodRequirements('one-sample-proportion'),
      selectedMethodId: 'one-sample-proportion',
      variableMapping: { dependentVar: 'outcome' },
    })

    expect(result.effectiveExecutionVariables).toEqual({
      dependentVar: 'outcome',
      nullProportion: '0.5',
    })
    expect(result.effectiveExecutionSettings.ciMethod).toBe('wilson')
  })

  it('one-sample t-test carries the schema default testValue into execution variables even before Step 3 initializes state', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions(),
      methodRequirements: getMethodRequirements('one-sample-t'),
      selectedMethodId: 'one-sample-t',
      variableMapping: { dependentVar: 'score' },
    })

    expect(result.effectiveExecutionVariables).toEqual({
      dependentVar: 'score',
      testValue: '0',
    })
  })

  it('builds summary entries with option labels and execution toggles', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({
        showAssumptions: false,
        methodSettings: {
          postHoc: 'games-howell',
          welch: true,
        },
      }),
      methodRequirements: getMethodRequirements('one-way-anova'),
      selectedMethodId: 'one-way-anova',
      variableMapping: { dependentVar: 'score', groupVar: 'group' },
    })

    expect(result.executionSettingEntries).toEqual(
      expect.arrayContaining([
        { key: 'alpha', label: 'alpha', value: '0.05' },
        { key: 'postHoc', label: '사후검정 방법', value: 'Games-Howell' },
        { key: 'welch', label: '분산 동질성 처리', value: 'Welch ANOVA' },
        { key: 'showAssumptions', label: '가정 검정', value: '건너뜀' },
        { key: 'showEffectSize', label: '효과크기', value: '표시' },
      ])
    )
  })

  it('localizes summary entries for the generic domain', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({
        showAssumptions: false,
        showEffectSize: false,
        methodSettings: {
          postHoc: 'games-howell',
          welch: true,
        },
      }),
      methodRequirements: getMethodRequirements('one-way-anova'),
      selectedMethodId: 'one-way-anova',
      variableMapping: { dependentVar: 'score', groupVar: 'group' },
      presentationLanguage: 'en',
    })

    expect(result.executionSettingEntries).toEqual(
      expect.arrayContaining([
        { key: 'postHoc', label: 'Post-hoc method', value: 'Games-Howell' },
        { key: 'welch', label: 'Homogeneity handling', value: 'Welch ANOVA' },
        { key: 'showAssumptions', label: 'Assumption checks', value: 'Skipped' },
        { key: 'showEffectSize', label: 'Effect size', value: 'Hidden' },
      ])
    )
  })

  it('does not pass the materialized equalVar default through plain two-sample-t execution', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({
        methodSettings: {
          equalVar: 'true',
        },
      }),
      methodRequirements: getMethodRequirements('two-sample-t'),
      selectedMethodId: 'two-sample-t',
      variableMapping: { dependentVar: 'score', groupVar: 'group' },
    })

    expect(result.effectiveExecutionSettings.equalVar).toBeUndefined()
  })

  it('preserves explicit equalVar overrides for plain two-sample-t execution', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({
        methodSettings: {
          equalVar: 'false',
          __explicitMethodSettingKeys: 'equalVar',
        },
      }),
      methodRequirements: getMethodRequirements('two-sample-t'),
      selectedMethodId: 'two-sample-t',
      variableMapping: { dependentVar: 'score', groupVar: 'group' },
    })

    expect(result.effectiveExecutionSettings.equalVar).toBe('false')
  })
})
