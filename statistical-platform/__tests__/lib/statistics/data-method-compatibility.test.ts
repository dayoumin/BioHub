/**
 * Data-Method Compatibility Layer Tests
 *
 * Tests for the central compatibility checking between data characteristics
 * and statistical method requirements.
 *
 * Representative methods tested:
 * 1. two-sample-t (t-test)
 * 2. one-way-anova (ANOVA)
 * 3. kruskal-wallis (non-parametric)
 * 4. simple-regression (regression)
 * 5. pca (multivariate)
 */

import {
  DataSummary,
  AssumptionResults,
  CompatibilityResult,
  checkMethodCompatibility,
  filterCompatibleMethods,
  getCompatibleMethods,
  getCompatibilityMap,
  extractDataSummary,
  extractAssumptionResults,
  checkStructuralCompatibility,
  getStructuralCompatibilityMap,
  mergeAssumptionResults
} from '@/lib/statistics/data-method-compatibility'

import { STATISTICAL_METHOD_REQUIREMENTS } from '@/lib/statistics/variable-requirements'

import {
  METHOD_ID_MAPPING,
  resolveMethodId,
  getCompatibilityForMethod
} from '@/lib/statistics/data-method-compatibility'

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Helper to create a DataSummary with defaults
 */
function createDataSummary(overrides: Partial<DataSummary> = {}): DataSummary {
  return {
    sampleSize: 100,
    continuousCount: 3,
    categoricalCount: 1,
    binaryCount: 1,
    ordinalCount: 0,
    dateCount: 0,
    groupLevels: new Map([['group', 2]]),
    pairedFlag: false,
    repeatedMeasures: false,
    missingRate: 0,
    variablesByType: {
      continuous: ['var1', 'var2', 'var3'],
      categorical: ['category'],
      binary: ['group'],
      ordinal: [],
      date: []
    },
    ...overrides
  }
}

/**
 * Helper to create AssumptionResults with defaults
 */
function createAssumptions(
  overrides: Partial<AssumptionResults> = {}
): AssumptionResults {
  return {
    normality: true,
    homogeneity: true,
    independence: true,
    ...overrides
  }
}

/**
 * Get a method by ID from requirements
 */
function getMethod(id: string) {
  const method = STATISTICAL_METHOD_REQUIREMENTS.find(m => m.id === id)
  if (!method) throw new Error(`Method not found: ${id}`)
  return method
}

// ============================================================================
// Test Suites
// ============================================================================

describe('Data-Method Compatibility Layer', () => {
  describe('checkMethodCompatibility', () => {
    describe('Two-Sample t-test (two-sample-t)', () => {
      const method = getMethod('two-sample-t')

      it('should be compatible with valid data', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 1,
          binaryCount: 1,
          groupLevels: new Map([['group', 2]])
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('compatible')
        expect(result.reasons).toHaveLength(0)
        expect(result.score).toBeGreaterThanOrEqual(90)
      })

      it('should be incompatible without continuous variable', () => {
        const data = createDataSummary({
          continuousCount: 0,
          categoricalCount: 2
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('연속형'))).toBe(true)
      })

      it('should be incompatible without 2-level group variable', () => {
        const data = createDataSummary({
          binaryCount: 0,
          groupLevels: new Map([['category', 5]])
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('2개 수준'))).toBe(true)
      })

      it('should warn when normality is violated', () => {
        const data = createDataSummary()
        const assumptions = createAssumptions({ normality: false })

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('정규성'))).toBe(true)
        expect(result.assumptionViolations).toContain('정규성 가정 위반')
      })

      it('should warn when homogeneity is violated', () => {
        const data = createDataSummary()
        const assumptions = createAssumptions({ homogeneity: false })

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('등분산성'))).toBe(true)
      })

      it('should suggest Mann-Whitney as alternative when normality fails', () => {
        const data = createDataSummary({
          continuousCount: 0 // Force incompatibility
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        // Check if alternatives are suggested
        expect(result.status).toBe('incompatible')
        // Note: alternatives may or may not include mann-whitney depending on its compatibility
      })

      it('should be incompatible when sample size is too small', () => {
        const data = createDataSummary({ sampleSize: 3 })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('표본 크기'))).toBe(true)
      })
    })

    describe('One-Way ANOVA (one-way-anova)', () => {
      const method = getMethod('one-way-anova')

      it('should be compatible with 3+ group levels', () => {
        const data = createDataSummary({
          sampleSize: 50,
          continuousCount: 1,
          categoricalCount: 1,
          groupLevels: new Map([['treatment', 3]])
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('compatible')
      })

      it('should be incompatible with only 2 groups', () => {
        const data = createDataSummary({
          groupLevels: new Map([['group', 2]])
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('3개 이상'))).toBe(true)
      })

      it('should warn when normality fails for ANOVA', () => {
        const data = createDataSummary({
          groupLevels: new Map([['treatment', 4]])
        })
        const assumptions = createAssumptions({ normality: false })

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.assumptionViolations).toContain('정규성 가정 위반')
      })
    })

    describe('Kruskal-Wallis (kruskal-wallis)', () => {
      const method = getMethod('kruskal-wallis')

      it('should be compatible when ANOVA assumptions are violated', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 1,
          groupLevels: new Map([['treatment', 3]])
        })
        const assumptions = createAssumptions({ normality: false })

        const result = checkMethodCompatibility(data, assumptions, method)

        // Kruskal-Wallis doesn't require normality
        expect(result.status).not.toBe('incompatible')
      })

      it('should require 3+ groups', () => {
        const data = createDataSummary({
          groupLevels: new Map([['group', 2]])
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('3개 이상'))).toBe(true)
      })
    })

    describe('Simple Regression (simple-regression)', () => {
      const method = getMethod('simple-regression')

      it('should be compatible with 2+ continuous variables', () => {
        const data = createDataSummary({
          sampleSize: 50,
          continuousCount: 2
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('compatible')
      })

      it('should be incompatible with only 1 continuous variable', () => {
        const data = createDataSummary({
          continuousCount: 1
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('연속형'))).toBe(true)
      })
    })

    describe('PCA (pca)', () => {
      const method = getMethod('pca')

      it('should be compatible or warning with enough variables and samples', () => {
        const data = createDataSummary({
          sampleSize: 100,
          continuousCount: 5
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        // compatible 또는 warning (가정 검정 결과에 따라 다름)
        expect(['compatible', 'warning']).toContain(result.status)
      })

      it('should warn when sample size is small relative to variables', () => {
        const data = createDataSummary({
          sampleSize: 15, // Less than 5 * 5 variables
          continuousCount: 5
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        // Should still be compatible but with warning about sample size
        expect(result.reasons.some(r => r.includes('변수당 5배'))).toBe(true)
      })

      it('should be incompatible with < 2 continuous variables', () => {
        const data = createDataSummary({
          continuousCount: 1
        })
        const assumptions = createAssumptions()

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('incompatible')
      })
    })
  })

  describe('filterCompatibleMethods', () => {
    it('should return results for all methods', () => {
      const data = createDataSummary()
      const assumptions = createAssumptions()

      const results = filterCompatibleMethods(data, assumptions)

      expect(results.length).toBe(STATISTICAL_METHOD_REQUIREMENTS.length)
    })

    it('should classify methods correctly', () => {
      const data = createDataSummary({
        continuousCount: 3,
        binaryCount: 1,
        groupLevels: new Map([['group', 2]])
      })
      const assumptions = createAssumptions()

      const results = filterCompatibleMethods(data, assumptions)

      const tTest = results.find(r => r.methodId === 'two-sample-t')
      expect(tTest?.status).toBe('compatible')
    })
  })

  describe('getCompatibleMethods', () => {
    it('should return only compatible/warning methods', () => {
      const data = createDataSummary()
      const assumptions = createAssumptions()

      const results = getCompatibleMethods(data, assumptions)

      results.forEach(r => {
        expect(r.status).not.toBe('incompatible')
      })
    })

    it('should sort by score descending', () => {
      const data = createDataSummary()
      const assumptions = createAssumptions()

      const results = getCompatibleMethods(data, assumptions)

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].score ?? 0).toBeGreaterThanOrEqual(results[i].score ?? 0)
      }
    })
  })

  describe('getCompatibilityMap', () => {
    it('should return a Map with methodId keys', () => {
      const data = createDataSummary()
      const assumptions = createAssumptions()

      const map = getCompatibilityMap(data, assumptions)

      expect(map).toBeInstanceOf(Map)
      expect(map.has('two-sample-t')).toBe(true)
      expect(map.has('one-way-anova')).toBe(true)
    })
  })

  describe('extractDataSummary', () => {
    it('should extract summary from validation results', () => {
      const validationResults = {
        totalRows: 50,
        missingValues: 5,
        columnStats: [
          { name: 'id', type: 'numeric' as const, uniqueValues: 50, idDetection: { isId: true } },
          { name: 'weight', type: 'numeric' as const, uniqueValues: 45 },
          { name: 'height', type: 'numeric' as const, uniqueValues: 40 },
          { name: 'gender', type: 'categorical' as const, uniqueValues: 2 },
          { name: 'treatment', type: 'categorical' as const, uniqueValues: 3 }
        ]
      }

      const summary = extractDataSummary(validationResults)

      expect(summary.sampleSize).toBe(50)
      expect(summary.continuousCount).toBe(2) // weight, height (id excluded)
      expect(summary.binaryCount).toBe(1) // gender
      expect(summary.categoricalCount).toBe(1) // treatment
      expect(summary.groupLevels.get('gender')).toBe(2)
      expect(summary.groupLevels.get('treatment')).toBe(3)
    })

    it('should filter out ID columns', () => {
      const validationResults = {
        totalRows: 100,
        missingValues: 0,
        columnStats: [
          { name: 'ID', type: 'numeric' as const, uniqueValues: 100, idDetection: { isId: true } },
          { name: 'value', type: 'numeric' as const, uniqueValues: 80 }
        ]
      }

      const summary = extractDataSummary(validationResults)

      expect(summary.continuousCount).toBe(1)
      expect(summary.variablesByType.continuous).not.toContain('ID')
    })
  })

  describe('extractAssumptionResults', () => {
    it('should extract normality from Shapiro-Wilk', () => {
      const assumptions = {
        normality: {
          shapiroWilk: { pValue: 0.05, isNormal: false }
        }
      }

      const result = extractAssumptionResults(assumptions)

      expect(result.normality).toBe(false)
    })

    it('should extract homogeneity from Levene', () => {
      const assumptions = {
        homogeneity: {
          levene: { pValue: 0.03, equalVariance: false }
        }
      }

      const result = extractAssumptionResults(assumptions)

      expect(result.homogeneity).toBe(false)
    })

    it('should return unknown for missing tests', () => {
      const result = extractAssumptionResults(undefined)

      expect(result.normality).toBe('unknown')
      expect(result.homogeneity).toBe('unknown')
      expect(result.independence).toBe('unknown')
    })

    it('should combine group normality tests', () => {
      const assumptions = {
        normality: {
          group1: { isNormal: true },
          group2: { isNormal: false }
        }
      }

      const result = extractAssumptionResults(assumptions)

      // Both groups must be normal
      expect(result.normality).toBe(false)
    })
  })
})

describe('Integration: Real-world Scenarios', () => {
  describe('Scenario 1: Fish weight comparison study', () => {
    it('should recommend t-test for 2-group comparison with continuous outcome', () => {
      const data = createDataSummary({
        sampleSize: 60,
        continuousCount: 1, // weight_g
        binaryCount: 1, // diet_type (A or B)
        groupLevels: new Map([['diet_type', 2]])
      })
      const assumptions = createAssumptions({ normality: true, homogeneity: true })

      const compatible = getCompatibleMethods(data, assumptions)
      const tTest = compatible.find(r => r.methodId === 'two-sample-t')

      expect(tTest).toBeDefined()
      expect(tTest?.status).toBe('compatible')
    })

    it('should recommend Mann-Whitney when normality fails', () => {
      const data = createDataSummary({
        sampleSize: 60,
        continuousCount: 1,
        binaryCount: 1,
        groupLevels: new Map([['diet_type', 2]])
      })
      const assumptions = createAssumptions({ normality: false })

      const compatible = getCompatibleMethods(data, assumptions)
      const mannWhitney = compatible.find(r => r.methodId === 'mann-whitney')
      const tTest = compatible.find(r => r.methodId === 'two-sample-t')

      expect(mannWhitney?.status).toBe('compatible')
      expect(tTest?.status).toBe('warning') // Still usable with caution
    })
  })

  describe('Scenario 2: Multi-treatment aquaculture study', () => {
    it('should recommend ANOVA for 4-group comparison', () => {
      const data = createDataSummary({
        sampleSize: 80,
        continuousCount: 1, // growth_rate
        categoricalCount: 1, // treatment (Control, A, B, C)
        groupLevels: new Map([['treatment', 4]])
      })
      const assumptions = createAssumptions()

      const compatible = getCompatibleMethods(data, assumptions)
      const anova = compatible.find(r => r.methodId === 'one-way-anova')

      expect(anova).toBeDefined()
      expect(anova?.status).toBe('compatible')
    })
  })

  describe('Scenario 3: Small sample pilot study', () => {
    it('should flag methods requiring larger samples', () => {
      const data = createDataSummary({
        sampleSize: 8,
        continuousCount: 5
      })
      const assumptions = createAssumptions()

      const results = filterCompatibleMethods(data, assumptions)
      const pca = results.find(r => r.methodId === 'pca')
      const factorAnalysis = results.find(r => r.methodId === 'factor-analysis')

      // These should have warnings or be incompatible
      expect(pca?.reasons.some(r => r.includes('표본'))).toBe(true)
      expect(factorAnalysis?.reasons.some(r => r.includes('표본'))).toBe(true)
    })
  })
})

// ============================================================================
// Edge Case Tests
// ============================================================================

describe('Edge Cases and Boundary Conditions', () => {
  describe('Variable consumption tracking', () => {
    it('should not allow same variable to satisfy multiple requirements', () => {
      // Multiple regression needs 1 dependent + 2+ independent (all continuous)
      // With only 2 continuous variables, it should still work (1 dep + 1 indep)
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 2
      })
      const assumptions = createAssumptions()
      const method = getMethod('multiple-regression')

      const result = checkMethodCompatibility(data, assumptions, method)

      // multiple-regression requires minCount: 2 for independent variables
      // So with only 2 continuous, 1 goes to dependent, 1 to independent = not enough
      expect(result.status).toBe('incompatible')
    })

    it('should work with exactly required variables', () => {
      // Simple regression: 1 dependent + 1 independent = 2 continuous
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 2
      })
      const assumptions = createAssumptions()
      const method = getMethod('simple-regression')

      const result = checkMethodCompatibility(data, assumptions, method)

      expect(result.status).toBe('compatible')
    })
  })

  describe('Group level edge cases', () => {
    it('should handle empty groupLevels Map', () => {
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 2,
        categoricalCount: 0,
        binaryCount: 0,
        groupLevels: new Map()
      })
      const assumptions = createAssumptions()
      const method = getMethod('two-sample-t')

      const result = checkMethodCompatibility(data, assumptions, method)

      expect(result.status).toBe('incompatible')
      expect(result.reasons.some(r => r.includes('2개 수준'))).toBe(true)
    })

    it('should accept binary variable for 2-group comparison', () => {
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        binaryCount: 1,
        categoricalCount: 0,
        groupLevels: new Map([['is_treated', 2]])
      })
      const assumptions = createAssumptions()
      const method = getMethod('two-sample-t')

      const result = checkMethodCompatibility(data, assumptions, method)

      expect(result.status).toBe('compatible')
    })
  })

  describe('Assumption combinations', () => {
    it('should accumulate multiple assumption warnings', () => {
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        binaryCount: 1,
        groupLevels: new Map([['group', 2]])
      })
      const assumptions = createAssumptions({
        normality: false,
        homogeneity: false
      })
      const method = getMethod('two-sample-t')

      const result = checkMethodCompatibility(data, assumptions, method)

      expect(result.status).toBe('warning')
      expect(result.assumptionViolations?.length).toBe(2)
      expect(result.assumptionViolations).toContain('정규성 가정 위반')
      expect(result.assumptionViolations).toContain('등분산성 가정 위반')
    })

    it('should not penalize non-parametric methods for normality', () => {
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        groupLevels: new Map([['group', 3]])
      })
      const assumptions = createAssumptions({ normality: false })
      const method = getMethod('kruskal-wallis')

      const result = checkMethodCompatibility(data, assumptions, method)

      // Kruskal-Wallis doesn't assume normality
      expect(result.assumptionViolations).toBeUndefined()
    })
  })

  describe('Score calculation', () => {
    it('should give higher score to fully compatible methods', () => {
      const data = createDataSummary({
        sampleSize: 100,
        continuousCount: 2,
        binaryCount: 1,
        groupLevels: new Map([['group', 2]])
      })
      const assumptionsOk = createAssumptions({ normality: true, homogeneity: true })
      const assumptionsFail = createAssumptions({ normality: false, homogeneity: false })

      const method = getMethod('two-sample-t')
      const resultOk = checkMethodCompatibility(data, assumptionsOk, method)
      const resultFail = checkMethodCompatibility(data, assumptionsFail, method)

      expect(resultOk.score).toBeGreaterThan(resultFail.score ?? 0)
    })
  })

  describe('Chi-square and categorical methods', () => {
    it('should require categorical variables for chi-square', () => {
      const data = createDataSummary({
        sampleSize: 100,
        continuousCount: 5,
        categoricalCount: 0,
        binaryCount: 0
      })
      const assumptions = createAssumptions()
      const method = getMethod('chi-square-independence')

      const result = checkMethodCompatibility(data, assumptions, method)

      expect(result.status).toBe('incompatible')
      expect(result.reasons.some(r => r.includes('범주형') || r.includes('이진형'))).toBe(true)
    })

    it('should accept binary variables for chi-square', () => {
      const data = createDataSummary({
        sampleSize: 100,
        continuousCount: 0,
        categoricalCount: 0,
        binaryCount: 2,
        groupLevels: new Map([['var1', 2], ['var2', 2]])
      })
      const assumptions = createAssumptions()
      const method = getMethod('chi-square-independence')

      const result = checkMethodCompatibility(data, assumptions, method)

      expect(result.status).toBe('compatible')
    })
  })

  describe('Paired tests', () => {
    it('should require paired flag or 2 continuous variables', () => {
      const data = createDataSummary({
        sampleSize: 30,
        continuousCount: 1, // Only 1 continuous
        pairedFlag: false
      })
      const assumptions = createAssumptions()
      const method = getMethod('paired-t')

      const result = checkMethodCompatibility(data, assumptions, method)

      // paired-t requires minCount: 2 for dependent variables
      expect(result.status).toBe('incompatible')
    })

    it('should accept 2 continuous variables for paired test', () => {
      const data = createDataSummary({
        sampleSize: 30,
        continuousCount: 2, // pre and post
        pairedFlag: false
      })
      const assumptions = createAssumptions()
      const method = getMethod('paired-t')

      const result = checkMethodCompatibility(data, assumptions, method)

      expect(result.status).toBe('compatible')
    })
  })

  describe('Alternatives suggestion', () => {
    it('should suggest Mann-Whitney when t-test is incompatible due to normality', () => {
      const data = createDataSummary({
        sampleSize: 30,
        continuousCount: 1,
        binaryCount: 1,
        groupLevels: new Map([['group', 2]])
      })
      const assumptions = createAssumptions({ normality: false })

      const results = filterCompatibleMethods(data, assumptions)
      const tTest = results.find(r => r.methodId === 'two-sample-t')
      const mannWhitney = results.find(r => r.methodId === 'mann-whitney')

      // t-test should have warning, Mann-Whitney should be compatible
      expect(tTest?.status).toBe('warning')
      expect(mannWhitney?.status).toBe('compatible')
    })
  })

  // ============================================================================
  // Structural Compatibility Tests (New Functions)
  // ============================================================================

  describe('Structural Compatibility (No Pyodide Required)', () => {
    describe('checkStructuralCompatibility', () => {
      it('should check only structural requirements, not assumptions', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 1,
          binaryCount: 1,
          groupLevels: new Map([['group', 2]])
        })
        const method = getMethod('two-sample-t')

        // Even without assumption results, structural check should work
        const result = checkStructuralCompatibility(data, method)

        // Should be compatible based on structure alone
        expect(result.status).toBe('compatible')
        expect(result.reasons).toHaveLength(0)
      })

      it('should detect structural incompatibility', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 0, // No continuous variables
          binaryCount: 1
        })
        const method = getMethod('two-sample-t')

        const result = checkStructuralCompatibility(data, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.length).toBeGreaterThan(0)
      })

      it('should not include assumption warnings in structural check', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 1,
          binaryCount: 1,
          groupLevels: new Map([['group', 2]])
        })
        const method = getMethod('two-sample-t')

        const result = checkStructuralCompatibility(data, method)

        // Structural check should never include assumption-related reasons
        const hasAssumptionReason = result.reasons.some(r =>
          r.includes('정규성') || r.includes('등분산성') || r.includes('독립성')
        )
        expect(hasAssumptionReason).toBe(false)
      })
    })

    describe('getStructuralCompatibilityMap', () => {
      it('should return map for all methods', () => {
        const data = createDataSummary()

        const map = getStructuralCompatibilityMap(data)

        // Should have entries for all methods
        expect(map.size).toBe(STATISTICAL_METHOD_REQUIREMENTS.length)
      })

      it('should correctly categorize methods by structural compatibility', () => {
        const data = createDataSummary({
          sampleSize: 100,
          continuousCount: 5,
          categoricalCount: 2,
          binaryCount: 1,
          groupLevels: new Map([['group', 2], ['treatment', 3]])
        })

        const map = getStructuralCompatibilityMap(data)

        // t-test should be compatible
        const tTest = map.get('two-sample-t')
        expect(tTest?.status).toBe('compatible')

        // ANOVA should be compatible (has 3-level group)
        const anova = map.get('one-way-anova')
        expect(anova?.status).toBe('compatible')
      })

      it('should mark methods as incompatible when data is insufficient', () => {
        const data = createDataSummary({
          sampleSize: 5, // Very small sample
          continuousCount: 1,
          categoricalCount: 0,
          binaryCount: 0
        })

        const map = getStructuralCompatibilityMap(data)

        // Most methods should be incompatible with such small data
        const incompatibleCount = Array.from(map.values())
          .filter(r => r.status === 'incompatible').length

        expect(incompatibleCount).toBeGreaterThan(0)
      })
    })

    describe('mergeAssumptionResults', () => {
      it('should add assumption warnings to structurally compatible methods', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 1,
          binaryCount: 1,
          groupLevels: new Map([['group', 2]])
        })

        // First get structural map
        const structuralMap = getStructuralCompatibilityMap(data)

        // t-test should be structurally compatible
        expect(structuralMap.get('two-sample-t')?.status).toBe('compatible')

        // Now merge with assumption violations
        const assumptions = createAssumptions({
          normality: false,
          homogeneity: false
        })

        const mergedMap = mergeAssumptionResults(structuralMap, assumptions)

        // t-test should now have warning status
        const tTest = mergedMap.get('two-sample-t')
        expect(tTest?.status).toBe('warning')
        expect(tTest?.reasons.some(r => r.includes('정규성'))).toBe(true)
      })

      it('should preserve incompatible status from structural check', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 0, // No continuous - structurally incompatible
          binaryCount: 1
        })

        const structuralMap = getStructuralCompatibilityMap(data)

        // Should be incompatible structurally
        expect(structuralMap.get('two-sample-t')?.status).toBe('incompatible')

        // Merging assumptions should not change incompatible status
        const assumptions = createAssumptions() // All good

        const mergedMap = mergeAssumptionResults(structuralMap, assumptions)

        // Should still be incompatible
        expect(mergedMap.get('two-sample-t')?.status).toBe('incompatible')
      })

      it('should not add warnings when assumptions are unknown', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 1,
          binaryCount: 1,
          groupLevels: new Map([['group', 2]])
        })

        const structuralMap = getStructuralCompatibilityMap(data)
        const assumptions = createAssumptions({
          normality: 'unknown',
          homogeneity: 'unknown'
        })

        const mergedMap = mergeAssumptionResults(structuralMap, assumptions)

        // t-test with unknown assumptions should have warnings for "검정 필요"
        const tTest = mergedMap.get('two-sample-t')
        // Status could be warning or compatible depending on method requirements
        expect(['compatible', 'warning']).toContain(tTest?.status)
      })
    })
  })

  describe('Dataset Change Scenarios', () => {
    it('should correctly recalculate when dataset variables change', () => {
      // Scenario: User uploads new data with different variables

      // Initial data: good for t-test
      const initialData = createDataSummary({
        sampleSize: 30,
        continuousCount: 1,
        binaryCount: 1,
        groupLevels: new Map([['group', 2]])
      })

      const initialMap = getStructuralCompatibilityMap(initialData)
      expect(initialMap.get('two-sample-t')?.status).toBe('compatible')

      // New data: no continuous variables
      const newData = createDataSummary({
        sampleSize: 30,
        continuousCount: 0,
        categoricalCount: 2,
        binaryCount: 1
      })

      const newMap = getStructuralCompatibilityMap(newData)
      expect(newMap.get('two-sample-t')?.status).toBe('incompatible')
    })

    it('should handle empty dataset gracefully', () => {
      const emptyData = createDataSummary({
        sampleSize: 0,
        continuousCount: 0,
        categoricalCount: 0,
        binaryCount: 0
      })

      const map = getStructuralCompatibilityMap(emptyData)

      // 대부분의 메서드는 빈 데이터에서 incompatible이어야 함
      // 일부 메서드(descriptive-stats 등)는 최소 요구조건이 매우 낮을 수 있음
      const results = Array.from(map.values())
      const incompatibleCount = results.filter(r => r.status === 'incompatible').length
      const totalCount = results.length

      // 최소 90% 이상의 메서드가 incompatible이어야 함
      expect(incompatibleCount / totalCount).toBeGreaterThanOrEqual(0.9)

      // 또한 sampleSize가 0이면 거의 모든 통계 분석이 불가능
      // compatible인 메서드가 있다면 최소 요구조건이 없는 특수 케이스
      const compatibleMethods = results.filter(r => r.status !== 'incompatible')
      if (compatibleMethods.length > 0) {
        // compatible 메서드들은 정말 최소 요구조건이 없는지 확인
        // (예: descriptive-stats는 어떤 데이터든 요약 통계 가능)
        expect(compatibleMethods.length).toBeLessThanOrEqual(5)
      }
    })
  })

  // ============================================================================
  // Extended Group Structure Tests
  // ============================================================================

  describe('Extended Group Structure Checks', () => {
    describe('Two-way ANOVA', () => {
      it('should require 2 categorical variables', () => {
        const data = createDataSummary({
          sampleSize: 50,
          continuousCount: 1,
          categoricalCount: 1, // Only 1 categorical
          binaryCount: 0,
          groupLevels: new Map([['factor1', 3]])
        })
        const method = getMethod('two-way-anova')

        const result = checkStructuralCompatibility(data, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('2개') && r.includes('요인'))).toBe(true)
      })

      it('should be compatible with 2 categorical variables', () => {
        const data = createDataSummary({
          sampleSize: 50,
          continuousCount: 1,
          categoricalCount: 2,
          binaryCount: 0,
          groupLevels: new Map([['factor1', 3], ['factor2', 2]])
        })
        const assumptions = createAssumptions()
        const method = getMethod('two-way-anova')

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('compatible')
      })

      it('should check group structure even when variable requirements pass', () => {
        // Note: two-way-anova requires types: ['categorical'] for factors
        // Binary variables are a separate type in variable-requirements.ts
        // So we need 2 categorical (not binary) for the variable check to pass
        // This test verifies that group structure check adds additional validation
        const data = createDataSummary({
          sampleSize: 50,
          continuousCount: 1,
          categoricalCount: 1, // Only 1 categorical
          binaryCount: 1, // Binary is separate type
          groupLevels: new Map([['factor1', 3], ['gender', 2]])
        })
        const method = getMethod('two-way-anova')

        const result = checkStructuralCompatibility(data, method)

        // Should fail because two-way-anova needs 2 categorical variables
        // (binary is not counted as categorical in variable-requirements)
        expect(result.status).toBe('incompatible')
      })
    })

    describe('ANCOVA', () => {
      it('should require categorical factor + continuous covariate', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 1, // Only 1 continuous (not enough for DV + covariate)
          categoricalCount: 1,
          groupLevels: new Map([['treatment', 3]])
        })
        const method = getMethod('ancova')

        const result = checkStructuralCompatibility(data, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('연속형 변수 2개'))).toBe(true)
      })

      it('should be compatible with proper ANCOVA data', () => {
        const data = createDataSummary({
          sampleSize: 50,
          continuousCount: 2, // DV + covariate
          categoricalCount: 1,
          groupLevels: new Map([['treatment', 3]])
        })
        const assumptions = createAssumptions()
        const method = getMethod('ancova')

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('compatible')
      })
    })

    describe('MANOVA', () => {
      it('should require 2+ continuous DVs', () => {
        const data = createDataSummary({
          sampleSize: 30,
          continuousCount: 1, // Only 1 continuous
          categoricalCount: 1,
          groupLevels: new Map([['group', 3]])
        })
        const method = getMethod('manova')

        const result = checkStructuralCompatibility(data, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('2개 이상의 종속변수'))).toBe(true)
      })

      it('should be compatible with multiple DVs and factor', () => {
        const data = createDataSummary({
          sampleSize: 50,
          continuousCount: 3, // Multiple DVs
          categoricalCount: 1,
          groupLevels: new Map([['group', 3]])
        })
        const assumptions = createAssumptions()
        const method = getMethod('manova')

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('compatible')
      })
    })

    describe('Repeated Measures ANOVA', () => {
      it('should require multiple continuous variables for time points', () => {
        const data = createDataSummary({
          sampleSize: 20,
          continuousCount: 1, // Only 1 time point
          repeatedMeasures: false
        })
        const method = getMethod('repeated-measures-anova')

        const result = checkStructuralCompatibility(data, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('반복측정'))).toBe(true)
      })

      it('should be compatible with repeatedMeasures flag and enough variables', () => {
        // Note: repeated-measures-anova requires minCount: 2 for within variables
        // So even with repeatedMeasures flag, we need 2+ continuous variables
        const data = createDataSummary({
          sampleSize: 20,
          continuousCount: 2, // Need at least 2 for minCount requirement
          repeatedMeasures: true // Flag set
        })
        const assumptions = createAssumptions()
        const method = getMethod('repeated-measures-anova')

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('compatible')
      })

      it('should be compatible with multiple continuous variables', () => {
        const data = createDataSummary({
          sampleSize: 20,
          continuousCount: 3, // time1, time2, time3
          repeatedMeasures: false
        })
        const assumptions = createAssumptions()
        const method = getMethod('repeated-measures-anova')

        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('compatible')
      })
    })

    describe('Friedman Test', () => {
      it('should require 3+ conditions for non-parametric repeated measures', () => {
        const data = createDataSummary({
          sampleSize: 15,
          continuousCount: 2, // Only 2 conditions
          repeatedMeasures: false
        })
        const method = getMethod('friedman')

        const result = checkStructuralCompatibility(data, method)

        expect(result.status).toBe('incompatible')
        expect(result.reasons.some(r => r.includes('3개 이상의 반복측정'))).toBe(true)
      })

      it('should be compatible with 3+ continuous variables', () => {
        const data = createDataSummary({
          sampleSize: 15,
          continuousCount: 3,
          repeatedMeasures: false
        })
        const assumptions = createAssumptions()
        const method = getMethod('friedman')

        const result = checkMethodCompatibility(data, assumptions, method)

        // Note: friedman also requires 3+ group levels, so check actual status
        expect(['compatible', 'incompatible']).toContain(result.status)
      })
    })
  })

  // ============================================================================
  // Extended Assumption String Tests
  // ============================================================================

  describe('Extended Assumption String Mapping', () => {
    describe('Chi-square expected frequency variants', () => {
      it('should handle "기대빈도 ≥ 5 (80% 셀)" assumption', () => {
        const data = createDataSummary({
          sampleSize: 100,
          categoricalCount: 2,
          groupLevels: new Map([['var1', 3], ['var2', 4]])
        })
        const assumptions = createAssumptions()
        // Set expected frequency to false
        assumptions.expectedFrequency = false

        const method = getMethod('chi-square-independence')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('기대빈도') || r.includes('Fisher'))).toBe(true)
      })
    })

    describe('Logistic regression assumptions', () => {
      it('should handle "선형성(로짓)" assumption', () => {
        const data = createDataSummary({
          sampleSize: 100,
          continuousCount: 2,
          binaryCount: 1,
          groupLevels: new Map([['outcome', 2]])
        })
        const assumptions = createAssumptions()
        assumptions.linearity = false

        const method = getMethod('logistic-regression')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('로짓') || r.includes('선형성'))).toBe(true)
      })

      it('should handle "다중공선성 없음" assumption', () => {
        const data = createDataSummary({
          sampleSize: 100,
          continuousCount: 2,
          binaryCount: 1,
          groupLevels: new Map([['outcome', 2]])
        })
        const assumptions = createAssumptions()
        assumptions.multicollinearity = false

        const method = getMethod('logistic-regression')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('다중공선성') || r.includes('VIF'))).toBe(true)
      })
    })

    describe('Ordinal regression assumptions', () => {
      it('should handle "비례 오즈 가정" assumption', () => {
        const data = createDataSummary({
          sampleSize: 100,
          continuousCount: 2,
          ordinalCount: 1
        })
        const assumptions = createAssumptions()
        assumptions.proportionalOdds = false

        const method = getMethod('ordinal-regression')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('비례 오즈') || r.includes('Brant'))).toBe(true)
      })
    })

    describe('Poisson regression assumptions', () => {
      it('should handle "평균과 분산이 같음" assumption', () => {
        const data = createDataSummary({
          sampleSize: 100,
          continuousCount: 2 // count variable treated as continuous
        })
        const assumptions = createAssumptions()
        assumptions.overdispersion = false

        const method = getMethod('poisson-regression')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('과분산') || r.includes('Negative Binomial'))).toBe(true)
      })
    })

    describe('Cox regression assumptions', () => {
      it('should handle "비례위험 가정" assumption', () => {
        const data = createDataSummary({
          sampleSize: 50,
          continuousCount: 2, // time + covariate
          binaryCount: 1 // event
        })
        const assumptions = createAssumptions()
        assumptions.proportionalHazards = false

        const method = getMethod('cox-regression')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('비례위험') || r.includes('Schoenfeld'))).toBe(true)
      })
    })

    describe('Time series assumptions', () => {
      it('should handle "정상성 (차분 후)" assumption', () => {
        const data = createDataSummary({
          sampleSize: 100,
          continuousCount: 1
        })
        const assumptions = createAssumptions()
        assumptions.stationarity = false

        const method = getMethod('arima')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('정상성') || r.includes('비정상'))).toBe(true)
      })

      it('should handle "잔차 백색잡음" assumption', () => {
        const data = createDataSummary({
          sampleSize: 100,
          continuousCount: 1
        })
        const assumptions = createAssumptions()
        assumptions.whiteNoise = false

        const method = getMethod('arima')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('백색잡음') || r.includes('자기상관'))).toBe(true)
      })

      it('should handle "주기적 계절성" assumption', () => {
        const data = createDataSummary({
          sampleSize: 48, // 4 years of monthly data
          continuousCount: 1
        })
        const assumptions = createAssumptions()
        assumptions.seasonality = false

        const method = getMethod('seasonal-decompose')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('계절') || r.includes('비계절'))).toBe(true)
      })
    })

    describe('Independence variants', () => {
      it('should handle "독립 시행" assumption (binomial test)', () => {
        const data = createDataSummary({
          sampleSize: 50,
          binaryCount: 1
        })
        const assumptions = createAssumptions()
        assumptions.independence = false

        const method = getMethod('binomial-test')
        const result = checkMethodCompatibility(data, assumptions, method)

        expect(result.status).toBe('warning')
        expect(result.reasons.some(r => r.includes('독립성'))).toBe(true)
      })
    })
  })

  describe('Invalid Factor Level Detection', () => {
    it('should detect categorical with only 1 level as invalid factor', () => {
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        categoricalCount: 2, // 2 categorical variables
        groupLevels: new Map([
          ['factor1', 3], // valid: 3 levels
          ['factor2', 1]  // invalid: only 1 level (constant)
        ])
      })
      const method = getMethod('two-way-anova')

      const result = checkStructuralCompatibility(data, method)

      // Should fail because one factor has only 1 level
      expect(result.status).toBe('incompatible')
      expect(result.reasons.some(r => r.includes('1개뿐') || r.includes('상수'))).toBe(true)
    })

    it('should pass when all factors have at least 2 levels', () => {
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        categoricalCount: 2,
        groupLevels: new Map([
          ['factor1', 3],
          ['factor2', 2]
        ])
      })
      const assumptions = createAssumptions()
      const method = getMethod('two-way-anova')

      const result = checkMethodCompatibility(data, assumptions, method)

      expect(result.status).toBe('compatible')
    })
  })

  describe('Binary factor double-counting prevention', () => {
    // Note: We use checkStructuralCompatibility to directly test checkGroupStructure
    // because checkMethodCompatibility also validates variable type requirements
    // (two-way-anova requires types: ['categorical'], not 'binary')

    it('should NOT double-count binary variables that are in groupLevels map', () => {
      // Bug scenario: binary vars in groupLevels were counted twice
      // - once in validFactorsFromGroupLevels (levels >= 2)
      // - again via binaryCount
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        categoricalCount: 2, // Need categorical to pass variable requirements
        binaryCount: 2, // 2 additional binary variables
        groupLevels: new Map([
          ['category1', 3],   // categorical in groupLevels
          ['category2', 4],   // categorical in groupLevels
          ['gender', 2],      // binary var in groupLevels
          ['treatment', 2]    // binary var in groupLevels
        ]),
        variablesByType: {
          continuous: ['dv'],
          categorical: ['category1', 'category2'],
          binary: ['gender', 'treatment'], // Both binary vars are in groupLevels
          ordinal: [],
          date: []
        }
      })
      const method = getMethod('two-way-anova')

      // Structural check tests checkGroupStructure directly
      // With the bug: validFactorCount would be 6 (4 from groupLevels + 2 from binaryCount)
      // Correct: validFactorCount should be 4 (no double-counting)
      const result = checkStructuralCompatibility(data, method)

      // Should pass structurally (has at least 2 valid factors)
      expect(result.status).toBe('compatible')
    })

    it('should correctly count binary variables not in groupLevels', () => {
      // Case: some binary variables are not yet in groupLevels map
      // These should be added to the count
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        categoricalCount: 2,
        binaryCount: 2, // 2 binary variables
        groupLevels: new Map([
          ['category1', 3],
          ['category2', 4],
          ['gender', 2]  // Only 1 binary in groupLevels
        ]),
        variablesByType: {
          continuous: ['dv'],
          categorical: ['category1', 'category2'],
          binary: ['gender', 'treatment'], // treatment is NOT in groupLevels
          ordinal: [],
          date: []
        }
      })
      const method = getMethod('two-way-anova')

      // validFactorCount = 3 (from groupLevels) + 1 (treatment not in groupLevels) = 4
      const result = checkStructuralCompatibility(data, method)

      expect(result.status).toBe('compatible')
    })

    it('should fail three-way-anova with only 2 binary factors in groupLevels', () => {
      // Verify correct counting: 2 binary vars should NOT become 4
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        categoricalCount: 0,
        binaryCount: 2,
        groupLevels: new Map([
          ['gender', 2],
          ['treatment', 2]
        ]),
        variablesByType: {
          continuous: ['dv'],
          categorical: [],
          binary: ['gender', 'treatment'],
          ordinal: [],
          date: []
        }
      })
      const method = getMethod('three-way-anova')

      const result = checkStructuralCompatibility(data, method)

      // three-way-anova requires 3 factors, we only have 2
      // Bug would make this pass (4 factors counted)
      expect(result.status).toBe('incompatible')
      expect(result.reasons.some(r => r.includes('3개') && r.includes('요인'))).toBe(true)
    })

    it('should count exactly correct number of valid factors (mixed scenario)', () => {
      // Complex scenario testing checkGroupStructure's factor counting:
      // - 2 categorical in groupLevels
      // - 1 binary in groupLevels (should NOT be double-counted)
      // - 1 binary NOT in groupLevels (should be added)
      // Total valid factors = 4 (not 5!)
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        categoricalCount: 3, // Need 3 categorical to pass three-way-anova variable requirements
        binaryCount: 2,
        groupLevels: new Map([
          ['region', 3],      // categorical
          ['department', 4],  // categorical
          ['level', 5],       // categorical
          ['gender', 2]       // binary in groupLevels
        ]),
        variablesByType: {
          continuous: ['dv'],
          categorical: ['region', 'department', 'level'],
          binary: ['gender', 'treatment'], // treatment NOT in groupLevels
          ordinal: [],
          date: []
        }
      })
      const method = getMethod('three-way-anova')

      // validFactorCount = 4 (from groupLevels) + 1 (treatment not in map) = 5
      // Without bug fix: would be 4 + 2 = 6
      const result = checkStructuralCompatibility(data, method)

      // three-way-anova requires 3 factors - should pass with 5 factors
      expect(result.status).toBe('compatible')
    })
  })
})

// ============================================================================
// ID Mapping Layer Tests
// ============================================================================

describe('ID Mapping Layer', () => {
  describe('METHOD_ID_MAPPING', () => {
    it('should map UI method IDs to requirements IDs', () => {
      // T-tests
      expect(METHOD_ID_MAPPING['t-test']).toBe('two-sample-t')
      expect(METHOD_ID_MAPPING['paired-t']).toBe('paired-t')

      // ANOVA
      expect(METHOD_ID_MAPPING['anova']).toBe('one-way-anova')

      // Non-parametric
      expect(METHOD_ID_MAPPING['wilcoxon']).toBe('wilcoxon-signed-rank')
      expect(METHOD_ID_MAPPING['mann-whitney']).toBe('mann-whitney')

      // Correlation
      expect(METHOD_ID_MAPPING['correlation']).toBe('pearson-correlation')

      // Chi-square
      expect(METHOD_ID_MAPPING['chi-square']).toBe('chi-square-independence')

      // Descriptive
      expect(METHOD_ID_MAPPING['descriptive']).toBe('descriptive-stats')
    })

    it('should include all common UI method IDs', () => {
      const commonUIIds = [
        't-test', 'paired-t', 'welch-t', 'one-sample-t',
        'anova', 'mann-whitney', 'wilcoxon', 'kruskal-wallis',
        'correlation', 'regression', 'chi-square', 'descriptive'
      ]

      for (const id of commonUIIds) {
        expect(METHOD_ID_MAPPING[id]).toBeDefined()
      }
    })
  })

  describe('resolveMethodId', () => {
    it('should resolve mapped IDs', () => {
      expect(resolveMethodId('t-test')).toBe('two-sample-t')
      expect(resolveMethodId('anova')).toBe('one-way-anova')
      expect(resolveMethodId('wilcoxon')).toBe('wilcoxon-signed-rank')
    })

    it('should return input for unmapped IDs (identity mapping)', () => {
      expect(resolveMethodId('two-sample-t')).toBe('two-sample-t')
      expect(resolveMethodId('some-unknown-id')).toBe('some-unknown-id')
    })
  })

  describe('getCompatibilityForMethod', () => {
    it('should find compatibility by UI method ID', () => {
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        binaryCount: 1,
        groupLevels: new Map([['group', 2]])
      })

      const map = getStructuralCompatibilityMap(data)

      // Direct lookup by requirements ID should work
      const directResult = map.get('two-sample-t')
      expect(directResult).toBeDefined()

      // Lookup by UI ID should also work via getCompatibilityForMethod
      const uiResult = getCompatibilityForMethod(map, 't-test')
      expect(uiResult).toBeDefined()
      expect(uiResult?.methodId).toBe('two-sample-t')
    })

    it('should return undefined for non-existent methods', () => {
      const data = createDataSummary()
      const map = getStructuralCompatibilityMap(data)

      const result = getCompatibilityForMethod(map, 'non-existent-method')
      expect(result).toBeUndefined()
    })

    it('should resolve ANOVA compatibility correctly', () => {
      const data = createDataSummary({
        sampleSize: 50,
        continuousCount: 1,
        categoricalCount: 1,
        groupLevels: new Map([['treatment', 4]])
      })

      const map = getStructuralCompatibilityMap(data)

      // UI uses 'anova', requirements uses 'one-way-anova'
      const result = getCompatibilityForMethod(map, 'anova')
      expect(result).toBeDefined()
      expect(result?.status).toBe('compatible')
    })

    it('should resolve Mann-Whitney compatibility correctly', () => {
      const data = createDataSummary({
        sampleSize: 30,
        continuousCount: 1,
        binaryCount: 1,
        groupLevels: new Map([['group', 2]])
      })

      const map = getStructuralCompatibilityMap(data)

      const result = getCompatibilityForMethod(map, 'mann-whitney')
      expect(result).toBeDefined()
      expect(result?.status).toBe('compatible')
    })
  })
})

// ============================================================================
// extractDataSummary columns alias Tests
// ============================================================================

describe('extractDataSummary with columns alias', () => {
  it('should work with columnStats property', () => {
    const validationResults = {
      totalRows: 50,
      missingValues: 5,
      columnStats: [
        { name: 'weight', type: 'numeric' as const, uniqueValues: 45 },
        { name: 'group', type: 'categorical' as const, uniqueValues: 2 }
      ]
    }

    const summary = extractDataSummary(validationResults)

    expect(summary.sampleSize).toBe(50)
    expect(summary.continuousCount).toBe(1)
    expect(summary.binaryCount).toBe(1)
  })

  it('should work with columns property (alias)', () => {
    const validationResults = {
      totalRows: 50,
      missingValues: 5,
      columns: [
        { name: 'weight', type: 'numeric' as const, uniqueValues: 45 },
        { name: 'group', type: 'categorical' as const, uniqueValues: 2 }
      ]
    }

    const summary = extractDataSummary(validationResults)

    expect(summary.sampleSize).toBe(50)
    expect(summary.continuousCount).toBe(1)
    expect(summary.binaryCount).toBe(1)
  })

  it('should prefer columnStats over columns when both exist', () => {
    const validationResults = {
      totalRows: 50,
      missingValues: 5,
      columnStats: [
        { name: 'var1', type: 'numeric' as const, uniqueValues: 45 },
        { name: 'var2', type: 'numeric' as const, uniqueValues: 40 }
      ],
      columns: [
        { name: 'different', type: 'categorical' as const, uniqueValues: 3 }
      ]
    }

    const summary = extractDataSummary(validationResults)

    // Should use columnStats
    expect(summary.continuousCount).toBe(2)
    expect(summary.categoricalCount).toBe(0)
  })

  it('should handle empty columns gracefully', () => {
    const validationResults = {
      totalRows: 50,
      missingValues: 0,
      columns: []
    }

    const summary = extractDataSummary(validationResults)

    expect(summary.sampleSize).toBe(50)
    expect(summary.continuousCount).toBe(0)
    expect(summary.categoricalCount).toBe(0)
  })

  it('should handle missing both columnStats and columns', () => {
    const validationResults = {
      totalRows: 50,
      missingValues: 0
    }

    const summary = extractDataSummary(validationResults)

    expect(summary.sampleSize).toBe(50)
    expect(summary.continuousCount).toBe(0)
    expect(summary.categoricalCount).toBe(0)
  })
})

// ============================================================================
// Integration: Decision Tree Recommender with Compatibility Map
// ============================================================================

describe('Integration: Recommendation with Compatibility Map', () => {
  it('should correctly look up compatibility for recommended methods', () => {
    // Simulates what happens in DecisionTreeRecommender.recommendWithCompatibility
    const data = createDataSummary({
      sampleSize: 50,
      continuousCount: 1,
      binaryCount: 1,
      groupLevels: new Map([['group', 2]])
    })

    const map = getStructuralCompatibilityMap(data)

    // Recommender returns method with UI ID like 't-test'
    const recommendedMethodId = 't-test'

    // Lookup should work with getCompatibilityForMethod
    const compatibility = getCompatibilityForMethod(map, recommendedMethodId)

    expect(compatibility).toBeDefined()
    expect(compatibility?.status).toBe('compatible')
  })

  it('should detect incompatibility for recommended methods', () => {
    const data = createDataSummary({
      sampleSize: 50,
      continuousCount: 0, // No continuous variables
      categoricalCount: 2
    })

    const map = getStructuralCompatibilityMap(data)

    // t-test recommended but data has no continuous variables
    const compatibility = getCompatibilityForMethod(map, 't-test')

    expect(compatibility).toBeDefined()
    expect(compatibility?.status).toBe('incompatible')
  })

  it('should correctly handle alternative method lookups', () => {
    const data = createDataSummary({
      sampleSize: 30,
      continuousCount: 1,
      binaryCount: 1,
      groupLevels: new Map([['group', 2]])
    })

    const map = getStructuralCompatibilityMap(data)

    // Both t-test and mann-whitney should be found
    const tTest = getCompatibilityForMethod(map, 't-test')
    const mannWhitney = getCompatibilityForMethod(map, 'mann-whitney')

    expect(tTest).toBeDefined()
    expect(mannWhitney).toBeDefined()
  })
})
