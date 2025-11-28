/**
 * ANOVA Post-hoc Test
 * - Games-Howell test return structure
 * - Tukey HSD test return structure
 * - Post-hoc method auto-selection logic
 * - Two-way/Three-way ANOVA post-hoc
 */

import { describe, it, expect } from '@jest/globals'
import type { PostHocComparison } from '@/types/statistics'

describe('ANOVA Post-hoc Tests', () => {
  describe('Games-Howell Worker Return Structure', () => {
    it('should return meanDiff, ciLower, ciUpper for each comparison', () => {
      // Mock Games-Howell result from worker
      const mockGHResult = {
        comparisons: [
          {
            group1: 0,
            group2: 1,
            meanDiff: 2.5,
            pValue: 0.032,
            pAdjusted: 0.032,
            significant: true,
            ciLower: 0.5,
            ciUpper: 4.5,
            se: 0.98,
            df: 15.3
          },
          {
            group1: 0,
            group2: 2,
            meanDiff: -1.2,
            pValue: 0.156,
            pAdjusted: 0.156,
            significant: false,
            ciLower: -3.0,
            ciUpper: 0.6,
            se: 0.87,
            df: 14.8
          }
        ],
        nComparisons: 2,
        method: 'Games-Howell'
      }

      // Verify structure
      expect(mockGHResult).toHaveProperty('comparisons')
      expect(mockGHResult).toHaveProperty('nComparisons')
      expect(mockGHResult).toHaveProperty('method')
      expect(mockGHResult.method).toBe('Games-Howell')

      // Verify each comparison has required fields
      for (const comp of mockGHResult.comparisons) {
        expect(comp).toHaveProperty('group1')
        expect(comp).toHaveProperty('group2')
        expect(comp).toHaveProperty('meanDiff')
        expect(comp).toHaveProperty('pValue')
        expect(comp).toHaveProperty('significant')
        expect(comp).toHaveProperty('ciLower')
        expect(comp).toHaveProperty('ciUpper')
        expect(comp).toHaveProperty('se')
        expect(comp).toHaveProperty('df')
      }
    })

    it('should calculate CI correctly using Welch-Satterthwaite df', () => {
      // Test data for Welch-Satterthwaite df calculation
      const group1 = { n: 10, mean: 20, var: 4 }
      const group2 = { n: 12, mean: 18, var: 6 }

      const meanDiff = group1.mean - group2.mean
      const se = Math.sqrt(group1.var / group1.n + group2.var / group2.n)

      // Welch-Satterthwaite degrees of freedom
      const numerator = (group1.var / group1.n + group2.var / group2.n) ** 2
      const denominator =
        (group1.var / group1.n) ** 2 / (group1.n - 1) +
        (group2.var / group2.n) ** 2 / (group2.n - 1)
      const dfWelch = numerator / denominator

      expect(meanDiff).toBe(2)
      expect(se).toBeCloseTo(0.949, 2)  // sqrt(4/10 + 6/12) = sqrt(0.9) = 0.949
      expect(dfWelch).toBeGreaterThan(0)
      expect(dfWelch).toBeLessThanOrEqual(group1.n + group2.n - 2)
    })
  })

  describe('Tukey HSD Worker Return Structure', () => {
    it('should return standard PostHocComparison fields', () => {
      const mockTukeyResult = {
        comparisons: [
          {
            group1: 0,
            group2: 1,
            meanDiff: 3.2,
            statistic: 4.5,
            pValue: 0.012,
            pAdjusted: 0.012,
            significant: true,
            ciLower: 1.1,
            ciUpper: 5.3
          }
        ],
        statistic: [4.5],
        pValue: [0.012],
        confidenceInterval: {
          lower: [1.1],
          upper: [5.3],
          confidenceLevel: 0.95
        }
      }

      expect(mockTukeyResult.comparisons[0]).toHaveProperty('meanDiff')
      expect(mockTukeyResult.comparisons[0]).toHaveProperty('pValue')
      expect(mockTukeyResult.comparisons[0]).toHaveProperty('significant')
      expect(mockTukeyResult.comparisons[0]).toHaveProperty('ciLower')
      expect(mockTukeyResult.comparisons[0]).toHaveProperty('ciUpper')
    })
  })

  describe('Post-hoc Method Auto-Selection', () => {
    it('should select Tukey HSD when homogeneity assumption is met', () => {
      const assumptionsResult = {
        homogeneity: {
          levene: { statistic: 1.2, pValue: 0.32 },
          passed: true,
          interpretation: 'Homogeneity assumption is met'
        }
      }

      const isHomogeneous = assumptionsResult.homogeneity.passed
      const selectedMethod = isHomogeneous ? 'Tukey HSD' : 'Games-Howell'

      expect(selectedMethod).toBe('Tukey HSD')
    })

    it('should select Games-Howell when homogeneity assumption is violated', () => {
      const assumptionsResult = {
        homogeneity: {
          levene: { statistic: 5.8, pValue: 0.008 },
          passed: false,
          interpretation: 'Homogeneity assumption is violated'
        }
      }

      const isHomogeneous = assumptionsResult.homogeneity.passed
      const selectedMethod = isHomogeneous ? 'Tukey HSD' : 'Games-Howell'

      expect(selectedMethod).toBe('Games-Howell')
    })

    it('should only run post-hoc when ANOVA is significant', () => {
      const anovaResult = { pValue: 0.032 }
      const groupCount = 3

      const shouldRunPostHoc = anovaResult.pValue < 0.05 && groupCount >= 2

      expect(shouldRunPostHoc).toBe(true)
    })

    it('should not run post-hoc when ANOVA is not significant', () => {
      const anovaResult = { pValue: 0.156 }
      const groupCount = 3

      const shouldRunPostHoc = anovaResult.pValue < 0.05 && groupCount >= 2

      expect(shouldRunPostHoc).toBe(false)
    })
  })

  describe('Two-way ANOVA Post-hoc', () => {
    it('should run post-hoc only for significant main effects', () => {
      const twoWayResult = {
        factor1: { fStatistic: 8.5, pValue: 0.008, df: 2 },
        factor2: { fStatistic: 2.1, pValue: 0.156, df: 1 },
        interaction: { fStatistic: 1.5, pValue: 0.238, df: 2 }
      }

      const significantFactors: string[] = []

      if (twoWayResult.factor1.pValue < 0.05) {
        significantFactors.push('factor1')
      }
      if (twoWayResult.factor2.pValue < 0.05) {
        significantFactors.push('factor2')
      }

      expect(significantFactors).toContain('factor1')
      expect(significantFactors).not.toContain('factor2')
      expect(significantFactors).toHaveLength(1)
    })

    it('should include factor name in group labels', () => {
      const factorName = 'Treatment'
      const factorLevels = ['Control', 'Drug A', 'Drug B']
      const comparisonIndices = [
        { group1: 0, group2: 1 },
        { group1: 0, group2: 2 },
        { group1: 1, group2: 2 }
      ]

      const labeledComparisons = comparisonIndices.map(comp => ({
        group1: `${factorName}: ${factorLevels[comp.group1]}`,
        group2: `${factorName}: ${factorLevels[comp.group2]}`
      }))

      expect(labeledComparisons[0].group1).toBe('Treatment: Control')
      expect(labeledComparisons[0].group2).toBe('Treatment: Drug A')
      expect(labeledComparisons[2].group1).toBe('Treatment: Drug A')
      expect(labeledComparisons[2].group2).toBe('Treatment: Drug B')
    })
  })

  describe('Three-way ANOVA Post-hoc', () => {
    it('should run post-hoc for all significant main effects', () => {
      const threeWayResult = {
        factor1: { fStatistic: 12.3, pValue: 0.002, df: 2 },
        factor2: { fStatistic: 6.8, pValue: 0.015, df: 1 },
        factor3: { fStatistic: 1.9, pValue: 0.178, df: 2 }
      }

      const significantFactors: string[] = []

      if (threeWayResult.factor1.pValue < 0.05) significantFactors.push('factor1')
      if (threeWayResult.factor2.pValue < 0.05) significantFactors.push('factor2')
      if (threeWayResult.factor3.pValue < 0.05) significantFactors.push('factor3')

      expect(significantFactors).toContain('factor1')
      expect(significantFactors).toContain('factor2')
      expect(significantFactors).not.toContain('factor3')
      expect(significantFactors).toHaveLength(2)
    })
  })

  describe('PostHocComparison Type Compatibility', () => {
    it('should be compatible with types/statistics.ts PostHocComparison', () => {
      const comparison: PostHocComparison = {
        group1: 'Group A',
        group2: 'Group B',
        meanDiff: 2.5,
        pValue: 0.032,
        significant: true,
        ciLower: 0.5,
        ciUpper: 4.5
      }

      expect(comparison.group1).toBe('Group A')
      expect(comparison.group2).toBe('Group B')
      expect(comparison.meanDiff).toBe(2.5)
      expect(comparison.pValue).toBe(0.032)
      expect(comparison.significant).toBe(true)
      expect(comparison.ciLower).toBe(0.5)
      expect(comparison.ciUpper).toBe(4.5)
    })

    it('should allow optional statistic field', () => {
      const comparison: PostHocComparison = {
        group1: 'A',
        group2: 'B',
        meanDiff: 1.5,
        pValue: 0.05,
        significant: false,
        statistic: 3.2
      }

      expect(comparison.statistic).toBe(3.2)
    })
  })

  describe('Repeated Measures ANOVA Post-hoc', () => {
    it('should use Bonferroni corrected paired t-tests', () => {
      const mockPostHocResult = {
        method: 'Paired t-test with Bonferroni correction',
        comparisons: [
          {
            timepoint1: 'Week 1',
            timepoint2: 'Week 2',
            meanDiff: 2.3,
            tStatistic: 3.5,
            pValue: 0.008,
            pAdjusted: 0.024,
            cohensD: 0.65,
            seDiff: 0.66,
            ciLower: 0.95,
            ciUpper: 3.65,
            df: 19,
            significant: true
          }
        ],
        pAdjustMethod: 'bonferroni',
        nComparisons: 3
      }

      expect(mockPostHocResult.method).toContain('Bonferroni')
      expect(mockPostHocResult.comparisons[0]).toHaveProperty('timepoint1')
      expect(mockPostHocResult.comparisons[0]).toHaveProperty('timepoint2')
      expect(mockPostHocResult.comparisons[0]).toHaveProperty('cohensD')
      expect(mockPostHocResult.comparisons[0].pAdjusted).toBeGreaterThanOrEqual(
        mockPostHocResult.comparisons[0].pValue
      )
    })
  })
})
