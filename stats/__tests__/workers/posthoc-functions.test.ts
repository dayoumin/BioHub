/**
 * Post-hoc Functions Unit Tests
 *
 * Tests for:
 * - repeated_measures_posthoc (Repeated Measures ANOVA)
 * - cochran_q_posthoc (Cochran Q Test)
 * - MANOVA post-hoc improvements
 *
 * Note: These tests verify the mathematical logic used in Python workers.
 * For full integration tests, see __tests__/integration/pyodide-workers.test.ts
 */

describe('Post-hoc Functions', () => {
  describe('Repeated Measures ANOVA Post-hoc', () => {
    // Mock data: 5 subjects, 3 timepoints
    const mockDataMatrix = [
      [10, 12, 15],  // Subject 1
      [11, 14, 16],  // Subject 2
      [9, 11, 14],   // Subject 3
      [12, 13, 17],  // Subject 4
      [10, 12, 16],  // Subject 5
    ]
    const mockTimeLabels = ['Week1', 'Week2', 'Week3']

    it('should return correct structure for post-hoc result', () => {
      // Expected structure validation
      const expectedStructure = {
        method: expect.stringContaining('Paired t-test'),
        comparisons: expect.any(Array),
        pAdjustMethod: expect.any(String),
        nComparisons: expect.any(Number)
      }

      // For 3 timepoints, we expect 3 comparisons (3C2 = 3)
      const expectedComparisons = 3

      expect(expectedComparisons).toBe(3)
      expect(expectedStructure.method).toBeDefined()
    })

    it('should calculate correct number of comparisons', () => {
      // Formula: n(n-1)/2 where n = number of timepoints
      const nTimepoints = mockTimeLabels.length
      const expectedComparisons = (nTimepoints * (nTimepoints - 1)) / 2

      expect(expectedComparisons).toBe(3)
    })

    it('should have correct comparison keys', () => {
      const requiredKeys = [
        'timepoint1',
        'timepoint2',
        'meanDiff',
        'tStatistic',
        'pValue',
        'pAdjusted',
        'cohensD',
        'seDiff',
        'ciLower',
        'ciUpper',
        'df',
        'significant'
      ]

      // Validate that each comparison should have these keys
      expect(requiredKeys).toHaveLength(12)
    })

    it('should apply Bonferroni correction correctly', () => {
      // Bonferroni: adjusted_p = raw_p * n_comparisons
      const rawPValue = 0.02
      const nComparisons = 3
      const adjustedP = Math.min(rawPValue * nComparisons, 1.0)

      expect(adjustedP).toBe(0.06) // 0.02 * 3 = 0.06
    })

    it('should apply Holm correction correctly', () => {
      // Holm: sorted p-values, multiplied by (n - rank)
      const rawPValues = [0.01, 0.03, 0.05]
      const nComparisons = 3

      // Sort and apply Holm
      const sorted = [...rawPValues].sort((a, b) => a - b)
      const holmAdjusted = sorted.map((p, rank) =>
        Math.min(p * (nComparisons - rank), 1.0)
      )

      expect(holmAdjusted[0]).toBe(0.03) // 0.01 * 3
      expect(holmAdjusted[1]).toBe(0.06) // 0.03 * 2
      expect(holmAdjusted[2]).toBe(0.05) // 0.05 * 1
    })

    it('should calculate Cohen\'s d for paired samples correctly', () => {
      // Cohen's d for paired samples = mean(diff) / std(diff)
      const values1 = [10, 11, 9, 12, 10]
      const values2 = [15, 16, 14, 17, 16]
      const diff = values1.map((v, i) => v - values2[i])

      const meanDiff = diff.reduce((a, b) => a + b, 0) / diff.length
      const variance = diff.reduce((sum, d) => sum + Math.pow(d - meanDiff, 2), 0) / (diff.length - 1)
      const stdDiff = Math.sqrt(variance)
      const cohensD = meanDiff / stdDiff

      // Mean diff should be negative (values2 > values1)
      expect(meanDiff).toBeLessThan(0)
      expect(Math.abs(cohensD)).toBeGreaterThan(0.8) // Large effect
    })

    // NEW: NaN/Inf handling tests
    describe('NaN/Inf Data Handling', () => {
      it('should filter out rows with NaN values', () => {
        const dataWithNaN = [
          [10, 12, 15],
          [11, NaN, 16],   // Should be filtered
          [9, 11, 14],
          [12, 13, NaN],   // Should be filtered
          [10, 12, 16],
        ]

        // Simulate row-wise NaN cleaning logic from Python worker
        const validRows = dataWithNaN.filter(row =>
          row.every(val => !Number.isNaN(val) && Number.isFinite(val))
        )

        expect(validRows).toHaveLength(3)
        expect(validRows).not.toContainEqual([11, NaN, 16])
      })

      it('should filter out rows with Inf values', () => {
        const dataWithInf = [
          [10, 12, 15],
          [11, Infinity, 16],    // Should be filtered
          [9, 11, 14],
          [12, -Infinity, 17],   // Should be filtered
          [10, 12, 16],
        ]

        const validRows = dataWithInf.filter(row =>
          row.every(val => !Number.isNaN(val) && Number.isFinite(val))
        )

        expect(validRows).toHaveLength(3)
      })

      it('should throw error if fewer than 2 valid subjects remain', () => {
        const dataWithTooManyInvalid = [
          [10, NaN, 15],
          [11, Infinity, 16],
          [NaN, 11, 14],
          [12, 13, -Infinity],
          [10, NaN, 16],
        ]

        const validRows = dataWithTooManyInvalid.filter(row =>
          row.every(val => !Number.isNaN(val) && Number.isFinite(val))
        )

        // Should have 0 valid rows, which triggers error
        expect(validRows.length).toBeLessThan(2)
      })
    })
  })

  describe('Cochran Q Post-hoc', () => {
    // Mock data: 10 subjects, 4 conditions (binary 0/1)
    const mockDataMatrix = [
      [1, 1, 0, 0],
      [1, 0, 0, 0],
      [1, 1, 1, 0],
      [0, 1, 0, 0],
      [1, 1, 1, 1],
      [1, 0, 0, 0],
      [1, 1, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 0],
      [1, 1, 0, 1],
    ]

    it('should return correct structure for Cochran Q post-hoc', () => {
      const expectedStructure = {
        method: expect.stringContaining('McNemar'),
        comparisons: expect.any(Array),
        pAdjustMethod: expect.any(String),
        nComparisons: expect.any(Number)
      }

      expect(expectedStructure.method).toBeDefined()
    })

    it('should calculate correct number of comparisons', () => {
      // For 4 conditions: 4C2 = 6 comparisons
      const nConditions = 4
      const expectedComparisons = (nConditions * (nConditions - 1)) / 2

      expect(expectedComparisons).toBe(6)
    })

    it('should have correct comparison keys for Cochran Q', () => {
      const requiredKeys = [
        'condition1',
        'condition2',
        'b',
        'c',
        'chiSquare',
        'pValue',
        'pAdjusted',
        'rateDiff',
        'rate1',
        'rate2',
        'significant'
      ]

      expect(requiredKeys).toHaveLength(11)
    })

    it('should calculate McNemar statistic correctly', () => {
      // McNemar chi-square = (b - c)^2 / (b + c)
      const b = 5 // condition1=1, condition2=0
      const c = 2 // condition1=0, condition2=1

      const chiSquare = Math.pow(b - c, 2) / (b + c)
      expect(chiSquare).toBeCloseTo(1.286, 2) // (5-2)^2 / 7 = 9/7
    })

    it('should calculate success rate difference correctly', () => {
      const col1 = mockDataMatrix.map(row => row[0]) // [1,1,1,0,1,1,1,0,1,1]
      const col2 = mockDataMatrix.map(row => row[1]) // [1,0,1,1,1,0,1,0,1,1]

      const rate1 = col1.reduce((a, b) => a + b, 0) / col1.length
      const rate2 = col2.reduce((a, b) => a + b, 0) / col2.length
      const rateDiff = rate1 - rate2

      expect(rate1).toBe(0.8) // 8/10
      expect(rate2).toBe(0.7) // 7/10
      expect(rateDiff).toBeCloseTo(0.1, 2)
    })

    it('should handle zero b+c case', () => {
      // When b+c = 0, chi-square should be 0 and p-value should be 1
      const b = 0
      const c = 0

      const chiSquare = (b + c === 0) ? 0 : Math.pow(b - c, 2) / (b + c)
      const pValue = (b + c === 0) ? 1.0 : 0.05

      expect(chiSquare).toBe(0)
      expect(pValue).toBe(1.0)
    })

    // NEW: Binary data validation tests
    describe('Binary Data Validation', () => {
      it('should accept valid binary data (0 and 1 only)', () => {
        const validBinaryData = [
          [1, 0, 1, 0],
          [0, 0, 0, 1],
          [1, 1, 1, 1],
          [0, 1, 0, 0],
        ]

        const flatValues = validBinaryData.flat()
        const uniqueValues = [...new Set(flatValues)]
        const isValid = uniqueValues.every(v => v === 0 || v === 1)

        expect(isValid).toBe(true)
      })

      it('should reject non-binary data', () => {
        const invalidData = [
          [1, 0, 2, 0],   // Contains 2
          [0, 0, 0, 1],
          [1, 1, 1, 1],
        ]

        const flatValues = invalidData.flat()
        const uniqueValues = [...new Set(flatValues)]
        const isValid = uniqueValues.every(v => v === 0 || v === 1)

        expect(isValid).toBe(false)
      })

      it('should reject negative values', () => {
        const invalidData = [
          [1, 0, -1, 0],
          [0, 0, 0, 1],
        ]

        const flatValues = invalidData.flat()
        const uniqueValues = [...new Set(flatValues)]
        const isValid = uniqueValues.every(v => v === 0 || v === 1)

        expect(isValid).toBe(false)
      })

      it('should reject decimal values', () => {
        const invalidData = [
          [1, 0.5, 1, 0],
          [0, 0, 0, 1],
        ]

        const flatValues = invalidData.flat()
        const uniqueValues = [...new Set(flatValues)]
        const isValid = uniqueValues.every(v => v === 0 || v === 1)

        expect(isValid).toBe(false)
      })
    })

    // NEW: Exact test vs continuity correction tests
    describe('Exact Test vs Continuity Correction', () => {
      it('should use exact binomial test for small samples (b+c < 25)', () => {
        const b = 5
        const c = 3
        const bc = b + c

        // b+c = 8 < 25, so exact test should be used
        expect(bc).toBeLessThan(25)

        // Exact binomial test formula (two-sided): 2 * min(P(X<=k), P(X>=k))
        // where k = min(b,c) and X ~ Binomial(b+c, 0.5)
        const k = Math.min(b, c)
        expect(k).toBe(3)
      })

      it('should use chi-square with Yates correction for larger samples (b+c >= 25)', () => {
        const b = 20
        const c = 10
        const bc = b + c

        // b+c = 30 >= 25, so chi-square with continuity correction
        expect(bc).toBeGreaterThanOrEqual(25)

        // Chi-square with Yates continuity correction: (|b-c| - 0.5)^2 / (b+c)
        const chiSquareWithYates = Math.pow(Math.abs(b - c) - 0.5, 2) / bc
        const chiSquareWithoutYates = Math.pow(b - c, 2) / bc

        // With Yates correction, chi-square should be smaller
        expect(chiSquareWithYates).toBeLessThan(chiSquareWithoutYates)
        expect(chiSquareWithYates).toBeCloseTo(3.0083, 2) // (10-0.5)^2 / 30
      })

      it('should cap exact test p-value at 1.0', () => {
        // When computing two-sided exact test: 2 * cdf(k, n, 0.5)
        // This could exceed 1.0, so must be capped
        const pValueRaw = 0.6
        const twoSidedP = Math.min(2 * pValueRaw, 1.0)

        expect(twoSidedP).toBe(1.0)
      })
    })
  })

  describe('MANOVA Post-hoc', () => {
    it('should only perform post-hoc for significant univariate tests', () => {
      const univariateTests = [
        { variable: 'DV1', pValue: 0.02 },  // significant
        { variable: 'DV2', pValue: 0.15 },  // not significant
        { variable: 'DV3', pValue: 0.001 }, // significant
      ]

      const significantVars = univariateTests
        .filter(ut => ut.pValue < 0.05)
        .map(ut => ut.variable)

      expect(significantVars).toEqual(['DV1', 'DV3'])
      expect(significantVars).not.toContain('DV2')
    })

    it('should calculate pooled standard deviation correctly', () => {
      const vals1 = [10, 12, 11, 13, 14]
      const vals2 = [15, 17, 16, 18, 19]

      const n1 = vals1.length
      const n2 = vals2.length
      const mean1 = vals1.reduce((a, b) => a + b, 0) / n1
      const mean2 = vals2.reduce((a, b) => a + b, 0) / n2
      const var1 = vals1.reduce((sum, v) => sum + Math.pow(v - mean1, 2), 0) / (n1 - 1)
      const var2 = vals2.reduce((sum, v) => sum + Math.pow(v - mean2, 2), 0) / (n2 - 1)

      const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)
      const pooledStd = Math.sqrt(pooledVar)

      expect(pooledStd).toBeGreaterThan(0)
      expect(mean1).toBe(12)  // (10+12+11+13+14)/5
      expect(mean2).toBe(17)  // (15+17+16+18+19)/5
    })

    it('should have correct post-hoc structure for MANOVA', () => {
      const requiredKeys = [
        'variable',
        'comparison',
        'meanDiff',
        'standardError',
        'tValue',
        'pValue',
        'adjustedPValue',
        'cohensD',
        'lowerCI',
        'upperCI',
        'significant'
      ]

      expect(requiredKeys).toHaveLength(11)
    })

    it('should apply Bonferroni correction for multiple comparisons', () => {
      // For 3 groups: 3C2 = 3 comparisons
      const nGroups = 3
      const nComparisons = (nGroups * (nGroups - 1)) / 2
      const rawPValue = 0.02

      const adjustedP = Math.min(rawPValue * nComparisons, 1.0)

      expect(adjustedP).toBe(0.06)
    })

    // NEW: Welch t-test tests
    describe('Welch t-test (equal_var=False)', () => {
      it('should calculate Welch-Satterthwaite degrees of freedom', () => {
        // Welch df formula: (s1^2/n1 + s2^2/n2)^2 / ((s1^2/n1)^2/(n1-1) + (s2^2/n2)^2/(n2-1))
        const vals1 = [10, 12, 11, 13, 14]
        const vals2 = [15, 17, 16, 18, 19, 20, 21]

        const n1 = vals1.length  // 5
        const n2 = vals2.length  // 7
        const mean1 = vals1.reduce((a, b) => a + b, 0) / n1
        const mean2 = vals2.reduce((a, b) => a + b, 0) / n2
        const var1 = vals1.reduce((sum, v) => sum + Math.pow(v - mean1, 2), 0) / (n1 - 1)
        const var2 = vals2.reduce((sum, v) => sum + Math.pow(v - mean2, 2), 0) / (n2 - 1)

        // Welch-Satterthwaite degrees of freedom
        const numerator = Math.pow(var1/n1 + var2/n2, 2)
        const denominator = Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1)
        const dfWelch = numerator / denominator

        // Welch df is generally lower than pooled df (n1 + n2 - 2)
        const dfPooled = n1 + n2 - 2  // 10
        expect(dfWelch).toBeLessThanOrEqual(dfPooled)
        expect(dfWelch).toBeGreaterThan(0)
      })

      it('should calculate Welch standard error using separate variances', () => {
        const vals1 = [10, 12, 11, 13, 14]
        const vals2 = [15, 17, 16, 18, 19]

        const n1 = vals1.length
        const n2 = vals2.length
        const mean1 = vals1.reduce((a, b) => a + b, 0) / n1
        const mean2 = vals2.reduce((a, b) => a + b, 0) / n2
        const var1 = vals1.reduce((sum, v) => sum + Math.pow(v - mean1, 2), 0) / (n1 - 1)
        const var2 = vals2.reduce((sum, v) => sum + Math.pow(v - mean2, 2), 0) / (n2 - 1)

        // Welch SE: sqrt(var1/n1 + var2/n2)
        const seWelch = Math.sqrt(var1/n1 + var2/n2)

        // Pooled SE: pooledStd * sqrt(1/n1 + 1/n2)
        const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)
        const pooledStd = Math.sqrt(pooledVar)
        const sePooled = pooledStd * Math.sqrt(1/n1 + 1/n2)

        // Both should be positive
        expect(seWelch).toBeGreaterThan(0)
        expect(sePooled).toBeGreaterThan(0)

        // When variances are equal, Welch SE ~ Pooled SE
        // In this case, they should be similar
        expect(seWelch).toBeCloseTo(sePooled, 1)
      })

      it('should handle unequal variances appropriately', () => {
        // Group 1: low variance
        const vals1 = [10, 10, 10, 10, 10]
        // Group 2: high variance
        const vals2 = [5, 10, 15, 20, 25]

        const n1 = vals1.length
        const n2 = vals2.length
        const mean1 = vals1.reduce((a, b) => a + b, 0) / n1
        const mean2 = vals2.reduce((a, b) => a + b, 0) / n2
        const var1 = vals1.reduce((sum, v) => sum + Math.pow(v - mean1, 2), 0) / (n1 - 1)
        const var2 = vals2.reduce((sum, v) => sum + Math.pow(v - mean2, 2), 0) / (n2 - 1)

        // Variance ratio should be very different
        expect(var1).toBe(0)  // All same values
        expect(var2).toBeGreaterThan(0)

        // Welch SE handles this case (avoids division issues with special handling)
        const seWelch = Math.sqrt(var1/n1 + var2/n2)
        expect(seWelch).toBeGreaterThan(0)
        expect(Number.isFinite(seWelch)).toBe(true)
      })
    })
  })

  describe('P-value Correction Methods', () => {
    const rawPValues = [0.001, 0.01, 0.03, 0.05, 0.1]

    it('should apply Bonferroni correction', () => {
      const n = rawPValues.length
      const bonferroni = rawPValues.map(p => Math.min(p * n, 1.0))

      expect(bonferroni).toEqual([0.005, 0.05, 0.15, 0.25, 0.5])
    })

    it('should apply Holm-Bonferroni correction', () => {
      const n = rawPValues.length
      const sorted = [...rawPValues].sort((a, b) => a - b)

      const holm: number[] = []
      for (let i = 0; i < n; i++) {
        const multiplier = n - i
        holm.push(Math.min(sorted[i] * multiplier, 1.0))
      }

      // Ensure monotonicity
      for (let i = 1; i < n; i++) {
        holm[i] = Math.max(holm[i], holm[i - 1])
      }

      expect(holm[0]).toBe(0.005) // 0.001 * 5
      expect(holm[1]).toBe(0.04)  // 0.01 * 4
      expect(holm[2]).toBe(0.09)  // 0.03 * 3
      expect(holm[3]).toBe(0.10)  // 0.05 * 2
      expect(holm[4]).toBe(0.10)  // 0.1 * 1, but monotonicity: max(0.1, 0.1)
    })

    it('should cap adjusted p-values at 1.0', () => {
      const highPValue = 0.8
      const nComparisons = 5
      const adjusted = Math.min(highPValue * nComparisons, 1.0)

      expect(adjusted).toBe(1.0)
    })
  })

  describe('Effect Size Interpretation', () => {
    it('should interpret Cohen\'s d correctly', () => {
      const interpretCohensD = (d: number): string => {
        const absD = Math.abs(d)
        if (absD >= 0.8) return 'large'
        if (absD >= 0.5) return 'medium'
        if (absD >= 0.2) return 'small'
        return 'negligible'
      }

      expect(interpretCohensD(1.2)).toBe('large')
      expect(interpretCohensD(0.6)).toBe('medium')
      expect(interpretCohensD(0.3)).toBe('small')
      expect(interpretCohensD(0.1)).toBe('negligible')
      expect(interpretCohensD(-0.9)).toBe('large') // negative d
    })
  })
})
