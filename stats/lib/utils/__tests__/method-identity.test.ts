import { describe, expect, it } from 'vitest'
import { resolveMethodIdentity } from '@/lib/utils/method-identity'

describe('resolveMethodIdentity', () => {
  it('Welch ANOVA variant를 canonical/display/variant로 분리한다', () => {
    const identity = resolveMethodIdentity({
      methodId: 'anova',
      methodName: 'One-Way ANOVA',
      testVariant: 'welch',
    })

    expect(identity.canonicalMethodId).toBe('one-way-anova')
    expect(identity.displayMethodName).toBe('Welch ANOVA')
    expect(identity.executionVariant).toBe('welch')
    expect(identity.executionVariantLabel).toBe('Welch ANOVA')
  })

  it('Welch t-test variant를 canonical/display/variant로 분리한다', () => {
    const identity = resolveMethodIdentity({
      methodId: 'two-sample-t',
      methodName: 'Independent Samples t-Test',
      testVariant: 'welch',
    })

    expect(identity.canonicalMethodId).toBe('two-sample-t')
    expect(identity.displayMethodName).toBe('Welch t-Test')
    expect(identity.executionVariant).toBe('welch')
    expect(identity.executionVariantLabel).toBe('Welch t-test')
  })

  it('standard variant는 display만 유지하고 별도 label을 만들지 않는다', () => {
    const identity = resolveMethodIdentity({
      methodId: 'two-sample-t',
      methodName: 'Independent Samples t-Test',
      testVariant: 'standard',
    })

    expect(identity.canonicalMethodId).toBe('two-sample-t')
    expect(identity.displayMethodName).toBe('Independent Samples t-Test')
    expect(identity.executionVariant).toBe('standard')
    expect(identity.executionVariantLabel).toBeNull()
  })
})
