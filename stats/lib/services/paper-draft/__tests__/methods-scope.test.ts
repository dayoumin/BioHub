import { describe, expect, it } from 'vitest'
import { getMethodsAutomationScope } from '../methods-scope'

describe('getMethodsAutomationScope', () => {
  it('resolves t-test scope with common facts and conservative prohibited claims', () => {
    const scope = getMethodsAutomationScope('two-sample-t', 'ko')

    expect(scope.category).toBe('t-test')
    expect(scope.autoFacts.map((item) => item.id)).toEqual(expect.arrayContaining([
      'analysis-method',
      'variable-roles',
      'sample-size',
      'group-structure',
      'assumption-test-names',
      'software-provenance',
    ]))
    expect(scope.prohibitedClaims.map((item) => item.id)).toEqual(expect.arrayContaining([
      'random-assignment',
      'blinding',
      'preregistration',
      'causal-claim',
      'specific-post-hoc-correction',
    ]))
    expect(scope.blockedWhen).toEqual(expect.arrayContaining([
      'missing-variable-roles',
      'validation-errors',
    ]))
  })

  it('adds post-hoc correction input for ANOVA-family methods', () => {
    const scope = getMethodsAutomationScope('one-way-anova', 'en')

    expect(scope.category).toBe('anova')
    expect(scope.autoFacts.map((item) => item.id)).toContain('post-hoc-method')
    expect(scope.userInputs.map((item) => item.id)).toContain('post-hoc-correction')
    expect(scope.blockedWhen).toContain('missing-post-hoc-method')
  })

  it('requires model rationale review for regression-family methods', () => {
    const scope = getMethodsAutomationScope('linear-regression', 'en')

    expect(scope.category).toBe('regression')
    expect(scope.autoFacts.map((item) => item.id)).toContain('model-family')
    expect(scope.userInputs.map((item) => item.id)).toContain('analysis-rationale')
    expect(scope.reviewWhen).toContain('missing-model-rationale')
  })

  it('falls back to the conservative other scope for unknown methods', () => {
    const scope = getMethodsAutomationScope('unknown-method', 'ko')

    expect(scope.category).toBe('other')
    expect(scope.blockedWhen).toContain('missing-variable-roles')
    expect(scope.prohibitedClaims.map((item) => item.id)).toContain('causal-claim')
  })
})
