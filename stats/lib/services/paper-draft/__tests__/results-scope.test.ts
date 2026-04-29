import { describe, expect, it } from 'vitest'
import { getResultsAutomationScope } from '../results-scope'

describe('getResultsAutomationScope', () => {
  it('resolves t-test scope with numeric result facts and conservative prohibited claims', () => {
    const scope = getResultsAutomationScope('two-sample-t', 'ko')

    expect(scope.category).toBe('t-test')
    expect(scope.autoFacts.map((item) => item.id)).toEqual(expect.arrayContaining([
      'test-statistic',
      'p-value',
      'effect-size',
      'confidence-interval',
      'group-statistics',
      'source-provenance',
    ]))
    expect(scope.prohibitedClaims.map((item) => item.id)).toEqual(expect.arrayContaining([
      'p-value-contradiction',
      'causal-interpretation',
      'effect-strength-without-criteria',
      'unsupported-biological-meaning',
    ]))
    expect(scope.blockedWhen).toEqual([
      'missing-core-statistic',
      'missing-p-value',
      'missing-source-provenance',
    ])
  })

  it('adds post-hoc review gate for ANOVA-family methods', () => {
    const scope = getResultsAutomationScope('one-way-anova', 'en')

    expect(scope.category).toBe('anova')
    expect(scope.autoFacts.map((item) => item.id)).toContain('post-hoc-results')
    expect(scope.reviewWhen).toContain('missing-post-hoc-method')
  })

  it('uses model-fit review for regression-family methods', () => {
    const scope = getResultsAutomationScope('linear-regression', 'en')

    expect(scope.category).toBe('regression')
    expect(scope.autoFacts.map((item) => item.id)).toContain('model-coefficients')
    expect(scope.autoFacts.map((item) => item.id)).toContain('model-fit')
    expect(scope.reviewWhen).toContain('missing-model-fit')
  })

  it('does not require effect size or CI review for descriptive methods', () => {
    const scope = getResultsAutomationScope('descriptive-stats', 'ko')

    expect(scope.category).toBe('descriptive')
    expect(scope.blockedWhen).not.toContain('missing-p-value')
    expect(scope.reviewWhen).toEqual([])
  })
})
