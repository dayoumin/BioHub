import { afterAll, describe, expect, it, vi } from 'vitest'
import {
  getMethodRequirements,
  getRegistrySize,
  getSelectorType,
  registerMethod,
  _unregisterByPrefix,
} from '@/lib/registry'
import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'

describe('Method Registry', () => {
  afterAll(() => {
    _unregisterByPrefix('__test-')
  })
  describe('boot data', () => {
    it('keeps the migrated selector map populated', () => {
      expect(getRegistrySize()).toBeGreaterThanOrEqual(60)
    })

    const primaryMappings: Array<[string, string]> = [
      ['one-sample-t', 'one-sample'],
      ['paired-t', 'paired'],
      ['wilcoxon', 'paired'],
      ['two-sample-t', 'group-comparison'],
      ['welch-t', 'group-comparison'],
      ['one-way-anova', 'group-comparison'],
      ['mann-whitney', 'group-comparison'],
      ['kruskal-wallis', 'group-comparison'],
      ['two-way-anova', 'two-way-anova'],
      ['correlation', 'correlation'],
      ['pca', 'correlation'],
      ['simple-regression', 'multiple-regression'],
      ['logistic-regression', 'multiple-regression'],
      ['chi-square', 'chi-square'],
      ['chi-square-independence', 'chi-square'],
      ['friedman', 'auto'],
      ['repeated-measures-anova', 'auto'],
      ['arima', 'auto'],
      ['kaplan-meier', 'auto'],
      ['power-analysis', 'auto'],
    ]

    it.each(primaryMappings)('maps %s to %s', (methodId, expectedType) => {
      expect(getSelectorType(methodId)).toBe(expectedType)
    })

    const legacyMappings: Array<[string, string]> = [
      ['t-test', 'group-comparison'],
      ['anova', 'group-comparison'],
      ['regression', 'multiple-regression'],
      ['cluster', 'correlation'],
      ['roc-curve', 'auto'],
    ]

    it.each(legacyMappings)('maps legacy id %s to %s', (methodId, expectedType) => {
      expect(getSelectorType(methodId)).toBe(expectedType)
    })
  })

  describe('getSelectorType()', () => {
    it('falls back to default for unknown ids', () => {
      expect(getSelectorType('nonexistent-method')).toBe('default')
      expect(getSelectorType('')).toBe('default')
    })
  })

  describe('registerMethod()', () => {
    it('registers a new selector type', () => {
      registerMethod({
        id: '__test-new-method__',
        selectorType: 'paired',
      })

      expect(getSelectorType('__test-new-method__')).toBe('paired')
    })

    it('registers aliases with the same selector type', () => {
      registerMethod({
        id: '__test-alias-primary__',
        selectorType: 'one-sample',
        aliases: ['__test-alias-1__', '__test-alias-2__'],
      })

      expect(getSelectorType('__test-alias-primary__')).toBe('one-sample')
      expect(getSelectorType('__test-alias-1__')).toBe('one-sample')
      expect(getSelectorType('__test-alias-2__')).toBe('one-sample')
    })

    it('adds canonical metadata when name and category are provided', () => {
      const testId = '__test-auto-canonical__'
      expect(STATISTICAL_METHODS[testId]).toBeUndefined()

      registerMethod({
        id: testId,
        selectorType: 'correlation',
        name: 'Test Auto Canonical',
        koreanName: 'Test Auto Canonical KR',
        description: 'Test method for auto-registration',
        category: 'descriptive',
      })

      expect(STATISTICAL_METHODS[testId]).toBeDefined()
      expect(STATISTICAL_METHODS[testId].name).toBe('Test Auto Canonical')
      expect(STATISTICAL_METHODS[testId].koreanName).toBe('Test Auto Canonical KR')
      expect(STATISTICAL_METHODS[testId].category).toBe('descriptive')
    })

    it('throws when selectorType conflicts with an existing method id', () => {
      registerMethod({
        id: '__test-conflict__',
        selectorType: 'paired',
      })

      expect(() =>
        registerMethod({
          id: '__test-conflict__',
          selectorType: 'correlation',
        })
      ).toThrow('cannot re-register')

      expect(getSelectorType('__test-conflict__')).toBe('paired')
    })

    it('throws when alias conflicts with an existing selector type', () => {
      registerMethod({
        id: '__test-alias-conflict-primary__',
        selectorType: 'paired',
      })

      expect(() =>
        registerMethod({
          id: '__test-alias-conflict-secondary__',
          selectorType: 'correlation',
          aliases: ['__test-alias-conflict-primary__'],
        })
      ).toThrow('cannot re-register')

      // Atomicity: failed registration must not leave partial state
      expect(getSelectorType('__test-alias-conflict-secondary__')).toBe('default')
    })

    it('throws when canonical metadata conflicts with an existing method', () => {
      expect(() =>
        registerMethod({
          id: 't-test',
          selectorType: 'group-comparison',
          name: 'Should Not Overwrite',
          category: 'other',
        })
      ).toThrow('different name')

      expect(STATISTICAL_METHODS['t-test'].name).toBe('Independent Samples t-Test')
    })

    it('is idempotent for the same selector type', () => {
      expect(() => {
        registerMethod({
          id: '__test-idempotent__',
          selectorType: 'auto',
        })
        registerMethod({
          id: '__test-idempotent__',
          selectorType: 'auto',
        })
      }).not.toThrow()
    })

    it('bootstraps safely when constants are imported before registry consumers', async () => {
      vi.resetModules()

      const constants = await import('@/lib/constants/statistical-methods')
      const registry = await import('@/lib/registry')

      expect(constants.STATISTICAL_METHODS['t-test']).toBeDefined()
      expect(registry.getSelectorType('t-test')).toBe('group-comparison')
    })
  })

  describe('getMethodRequirements()', () => {
    it('returns registered requirements', () => {
      registerMethod({
        id: '__test-with-reqs__',
        selectorType: 'group-comparison',
        requirements: {
          minSampleSize: 30,
          variableTypes: ['numeric', 'categorical'],
          assumptions: ['normality', 'homogeneity'],
        },
      })

      const reqs = getMethodRequirements('__test-with-reqs__')
      expect(reqs).toBeDefined()
      expect(reqs!.minSampleSize).toBe(30)
      expect(reqs!.variableTypes).toEqual(['numeric', 'categorical'])
      expect(reqs!.assumptions).toEqual(['normality', 'homogeneity'])
    })

    it('returns undefined when requirements are not registered', () => {
      registerMethod({
        id: '__test-no-reqs__',
        selectorType: 'auto',
      })

      expect(getMethodRequirements('__test-no-reqs__')).toBeUndefined()
    })

    it('returns undefined for unknown methods', () => {
      expect(getMethodRequirements('__never-registered__')).toBeUndefined()
    })
  })
})
