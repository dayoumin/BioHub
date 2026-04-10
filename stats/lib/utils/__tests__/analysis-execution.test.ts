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

  it('proportion methods merge testValue and fallback nullProportion into execution variables', () => {
    const result = buildAnalysisExecutionContext({
      analysisOptions: makeAnalysisOptions({ testValue: 42 }),
      methodRequirements: getMethodRequirements('one-sample-proportion'),
      selectedMethodId: 'one-sample-proportion',
      variableMapping: { dependentVar: 'outcome' },
    })

    expect(result.effectiveExecutionVariables).toEqual({
      dependentVar: 'outcome',
      testValue: '42',
      nullProportion: '0.5',
    })
    expect(result.effectiveExecutionSettings.ciMethod).toBe('wilson')
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
        { key: 'welch', label: 'Welch ANOVA', value: 'Welch ANOVA' },
        { key: 'showAssumptions', label: '가정 검정', value: '건너뜀' },
        { key: 'showEffectSize', label: '효과크기', value: '표시' },
      ])
    )
  })
})
