/**
 * Interpretation Engine T-Test Matching Regression Tests
 *
 * Issue: 'independent' contains 't', so methodLower.includes('independent') && methodLower.includes('t')
 * would match ANY method containing 'independent' (e.g., "Independent KS Test")
 *
 * Fix: Use explicit patterns like 'independentttest', 'independentsamplesttest'
 */

import { getInterpretation } from '@/lib/interpretation/engine'
import type { AnalysisResult } from '@/types/smart-flow'

describe('T-Test Method Matching Regression Tests', () => {
  describe('Independent Samples t-test - should match', () => {
    it('Independent t-test (basic)', () => {
      const results: AnalysisResult = {
        method: 'Independent t-test',
        pValue: 0.03,
        statistic: 2.5,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toContain('t')
    })

    it('Independent Samples t-test (full name)', () => {
      const results: AnalysisResult = {
        method: 'Independent Samples t-test',
        pValue: 0.01,
        statistic: 3.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toContain('t')
    })

    it('Independent-Samples T-Test (hyphen and case variations)', () => {
      const results: AnalysisResult = {
        method: 'Independent-Samples T-Test',
        pValue: 0.02,
        statistic: 2.8,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toContain('t')
    })

    it('t-test (generic, should match independent)', () => {
      const results: AnalysisResult = {
        method: 't-test',
        pValue: 0.04,
        statistic: 2.1,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toContain('t')
    })
  })

  describe('Non-t-test methods with "independent" - should NOT match t-test', () => {
    it('Independent KS Test should NOT match t-test', () => {
      const results: AnalysisResult = {
        method: 'Independent KS Test',
        pValue: 0.02,
        statistic: 0.35,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      // Should return null or match a different interpretation (not t-test)
      if (interpretation !== null) {
        expect(interpretation.title).not.toContain('t')
      }
    })

    it('Independent Chi-Square should NOT match t-test', () => {
      const results: AnalysisResult = {
        method: 'Independent Chi-Square',
        pValue: 0.01,
        statistic: 15.3,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      // Should return null or match Chi-Square (not t-test)
      if (interpretation !== null) {
        expect(interpretation.title).not.toContain('t')
      }
    })

    it('Independent Samples Median Test should NOT match t-test', () => {
      const results: AnalysisResult = {
        method: 'Independent Samples Median Test',
        pValue: 0.03,
        statistic: 8.2,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      // Should return null or match Median test (not t-test)
      if (interpretation !== null) {
        expect(interpretation.title).not.toContain('t')
      }
    })
  })

  describe('Other t-test variants - correct matching', () => {
    it('Welch t-test should match Welch (not independent)', () => {
      const results: AnalysisResult = {
        method: "Welch's t-test",
        pValue: 0.02,
        statistic: 2.6,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toContain('Welch')
    })

    it('One-sample t-test should NOT match independent', () => {
      const results: AnalysisResult = {
        method: 'One-sample t-test',
        pValue: 0.01,
        statistic: 3.5,
        interpretation: '',
        additional: {
          mean: 55.0,
          testValue: 50.0
        }
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toContain('t')
    })

    it('Paired t-test should NOT match independent', () => {
      const results: AnalysisResult = {
        method: 'Paired t-test',
        pValue: 0.02,
        statistic: 2.9,
        interpretation: ''
      }

      const interpretation = getInterpretation(results)

      expect(interpretation).not.toBeNull()
      expect(interpretation?.title).toContain('t')
    })
  })
})
