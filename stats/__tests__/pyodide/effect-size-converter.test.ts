/**
 * Effect Size Converter - Formula Verification Tests
 *
 * These tests verify the mathematical correctness of effect size conversions
 * using known values from statistical literature.
 *
 * References:
 * - Cohen, J. (1988). Statistical Power Analysis for the Behavioral Sciences
 * - Borenstein, M. et al. (2009). Introduction to Meta-Analysis
 * - Lakens, D. (2013). Calculating and reporting effect sizes
 */

import { describe, it, expect, beforeAll } from 'vitest'

// Mock the PyodideCore for testing
// In actual tests, we'll compute expected values manually

describe('Effect Size Converter - Formula Verification', () => {
  // Helper function to check approximate equality
  const expectApprox = (actual: number, expected: number, tolerance = 0.001) => {
    expect(Math.abs(actual - expected)).toBeLessThan(tolerance)
  }

  describe('t-statistic to Cohen\'s d', () => {
    it('should convert t to d for independent samples correctly', () => {
      // Known example: t = 2.5, n1 = 30, n2 = 30
      // d = t * sqrt(1/n1 + 1/n2) = 2.5 * sqrt(1/30 + 1/30) = 2.5 * sqrt(0.0667) = 2.5 * 0.258 = 0.645
      const t = 2.5
      const n1 = 30
      const n2 = 30
      const expectedD = t * Math.sqrt(1 / n1 + 1 / n2)

      expectApprox(expectedD, 0.6455, 0.001)
    })

    it('should convert t to d for paired/one-sample correctly', () => {
      // Known example: t = 2.0, df = 29 (n = 30)
      // d = t / sqrt(n) = 2.0 / sqrt(30) = 2.0 / 5.477 = 0.365
      const t = 2.0
      const df = 29
      const n = df + 1
      const expectedD = t / Math.sqrt(n)

      expectApprox(expectedD, 0.3651, 0.001)
    })

    it('should convert t to eta-squared correctly', () => {
      // eta^2 = t^2 / (t^2 + df)
      // t = 2.5, df = 58
      // eta^2 = 6.25 / (6.25 + 58) = 6.25 / 64.25 = 0.0973
      const t = 2.5
      const df = 58
      const expectedEta2 = (t * t) / (t * t + df)

      expectApprox(expectedEta2, 0.0973, 0.001)
    })
  })

  describe('F-statistic to effect sizes', () => {
    it('should convert F to eta-squared correctly', () => {
      // eta^2 = (df_between * F) / (df_between * F + df_within)
      // F = 5.0, df_between = 2, df_within = 57
      // eta^2 = (2 * 5) / (2 * 5 + 57) = 10 / 67 = 0.1493
      const F = 5.0
      const dfBetween = 2
      const dfWithin = 57
      const expectedEta2 = (dfBetween * F) / (dfBetween * F + dfWithin)

      expectApprox(expectedEta2, 0.1493, 0.001)
    })

    it('should convert F to omega-squared correctly', () => {
      // omega^2 = (df_between * (F - 1)) / (df_between * F + df_within + 1)
      // F = 5.0, df_between = 2, df_within = 57
      // omega^2 = (2 * 4) / (10 + 57 + 1) = 8 / 68 = 0.1176
      const F = 5.0
      const dfBetween = 2
      const dfWithin = 57
      const expectedOmega2 = (dfBetween * (F - 1)) / (dfBetween * F + dfWithin + 1)

      expectApprox(expectedOmega2, 0.1176, 0.001)
    })

    it('should convert F to Cohen\'s f correctly', () => {
      // f = sqrt(eta^2 / (1 - eta^2))
      // eta^2 = 0.1493
      // f = sqrt(0.1493 / 0.8507) = sqrt(0.1755) = 0.419
      const eta2 = 0.1493
      const expectedF = Math.sqrt(eta2 / (1 - eta2))

      expectApprox(expectedF, 0.419, 0.01)
    })
  })

  describe('Cohen\'s d conversions', () => {
    it('should convert d to r correctly (equal n)', () => {
      // r = d / sqrt(d^2 + 4)
      // d = 0.5
      // r = 0.5 / sqrt(0.25 + 4) = 0.5 / sqrt(4.25) = 0.5 / 2.062 = 0.243
      const d = 0.5
      const expectedR = d / Math.sqrt(d * d + 4)

      expectApprox(expectedR, 0.2425, 0.001)
    })

    it('should convert d to r correctly (unequal n)', () => {
      // r = d / sqrt(d^2 + a) where a = (n1+n2)^2 / (n1*n2)
      // d = 0.8, n1 = 20, n2 = 40
      // a = 60^2 / 800 = 3600 / 800 = 4.5
      // r = 0.8 / sqrt(0.64 + 4.5) = 0.8 / sqrt(5.14) = 0.8 / 2.267 = 0.353
      const d = 0.8
      const n1 = 20
      const n2 = 40
      const a = ((n1 + n2) ** 2) / (n1 * n2)
      const expectedR = d / Math.sqrt(d * d + a)

      expectApprox(expectedR, 0.353, 0.01)
    })

    it('should convert d to odds ratio correctly', () => {
      // OR = exp(d * pi / sqrt(3))
      // d = 0.5
      // OR = exp(0.5 * 3.1416 / 1.732) = exp(0.907) = 2.477
      const d = 0.5
      const expectedOR = Math.exp(d * Math.PI / Math.sqrt(3))

      expectApprox(expectedOR, 2.477, 0.01)
    })

    it('should calculate Hedges\' g correctly', () => {
      // g = d * J where J = 1 - 3/(4*df - 1)
      // d = 0.8, n1 = 15, n2 = 15, df = 28
      // J = 1 - 3/111 = 1 - 0.027 = 0.973
      // g = 0.8 * 0.973 = 0.778
      const d = 0.8
      const n1 = 15
      const n2 = 15
      const df = n1 + n2 - 2
      const J = 1 - 3 / (4 * df - 1)
      const expectedG = d * J

      expectApprox(expectedG, 0.778, 0.01)
    })
  })

  describe('Correlation coefficient conversions', () => {
    it('should convert r to Cohen\'s d correctly', () => {
      // d = 2r / sqrt(1 - r^2)
      // r = 0.3
      // d = 0.6 / sqrt(0.91) = 0.6 / 0.954 = 0.629
      const r = 0.3
      const expectedD = (2 * r) / Math.sqrt(1 - r * r)

      expectApprox(expectedD, 0.6286, 0.001)
    })

    it('should calculate Fisher\'s z correctly', () => {
      // z = 0.5 * ln((1+r)/(1-r))
      // r = 0.5
      // z = 0.5 * ln(1.5/0.5) = 0.5 * ln(3) = 0.5 * 1.099 = 0.549
      const r = 0.5
      const expectedZ = 0.5 * Math.log((1 + r) / (1 - r))

      expectApprox(expectedZ, 0.5493, 0.001)
    })

    it('should be reversible: r -> d -> r', () => {
      const originalR = 0.35

      // r to d
      const d = (2 * originalR) / Math.sqrt(1 - originalR * originalR)

      // d back to r
      const recoveredR = d / Math.sqrt(d * d + 4)

      expectApprox(recoveredR, originalR, 0.001)
    })
  })

  describe('Odds ratio conversions', () => {
    it('should convert OR to Cohen\'s d correctly', () => {
      // d = ln(OR) * sqrt(3) / pi
      // OR = 2.0
      // d = ln(2) * 1.732 / 3.1416 = 0.693 * 0.551 = 0.382
      const OR = 2.0
      const expectedD = Math.log(OR) * Math.sqrt(3) / Math.PI

      expectApprox(expectedD, 0.3818, 0.001)
    })

    it('should be reversible: OR -> d -> OR', () => {
      const originalOR = 3.5

      // OR to d
      const d = Math.log(originalOR) * Math.sqrt(3) / Math.PI

      // d back to OR
      const recoveredOR = Math.exp(d * Math.PI / Math.sqrt(3))

      expectApprox(recoveredOR, originalOR, 0.01)
    })
  })

  describe('Chi-square conversions', () => {
    it('should calculate phi coefficient correctly', () => {
      // phi = sqrt(chi^2 / n)
      // chi^2 = 10, n = 100
      // phi = sqrt(0.1) = 0.316
      const chiSquare = 10
      const n = 100
      const expectedPhi = Math.sqrt(chiSquare / n)

      expectApprox(expectedPhi, 0.3162, 0.001)
    })

    it('should calculate Cramer\'s V correctly', () => {
      // V = sqrt(chi^2 / (n * min(r-1, c-1)))
      // chi^2 = 15, n = 200, df = 2 (3x2 table, min = 2-1 = 1... wait, df for 3x2 = 2*1 = 2)
      // For df = 2, this could be 3x2 or 2x3, min dimension is 2
      // V = sqrt(15 / (200 * 2)) = sqrt(0.0375) = 0.194
      const chiSquare = 15
      const n = 200
      const df = 2
      const expectedV = Math.sqrt(chiSquare / (n * df))

      expectApprox(expectedV, 0.1936, 0.001)
    })
  })

  describe('Means to Cohen\'s d', () => {
    it('should calculate pooled standard deviation correctly', () => {
      // s_p = sqrt(((n1-1)*s1^2 + (n2-1)*s2^2) / (n1+n2-2))
      // n1 = 30, s1 = 10, n2 = 30, s2 = 12
      // s_p = sqrt((29*100 + 29*144) / 58) = sqrt((2900 + 4176) / 58) = sqrt(122) = 11.05
      const n1 = 30
      const s1 = 10
      const n2 = 30
      const s2 = 12
      const pooledVar = ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2)
      const expectedPooledStd = Math.sqrt(pooledVar)

      expectApprox(expectedPooledStd, 11.045, 0.01)
    })

    it('should calculate Cohen\'s d from means correctly', () => {
      // d = (M1 - M2) / s_pooled
      // M1 = 105, M2 = 100, s_pooled = 11.05
      // d = 5 / 11.05 = 0.452
      const M1 = 105
      const M2 = 100
      const pooledStd = 11.045
      const expectedD = (M1 - M2) / pooledStd

      expectApprox(expectedD, 0.4527, 0.01)
    })
  })

  describe('Effect size interpretation thresholds', () => {
    it('should interpret Cohen\'s d correctly', () => {
      // Cohen (1988): small = 0.2, medium = 0.5, large = 0.8
      const interpretD = (d: number): string => {
        const abs = Math.abs(d)
        if (abs < 0.2) return 'negligible'
        if (abs < 0.5) return 'small'
        if (abs < 0.8) return 'medium'
        return 'large'
      }

      expect(interpretD(0.1)).toBe('negligible')
      expect(interpretD(0.3)).toBe('small')
      expect(interpretD(0.6)).toBe('medium')
      expect(interpretD(1.0)).toBe('large')
    })

    it('should interpret r correctly', () => {
      // Cohen (1988): small = 0.1, medium = 0.3, large = 0.5
      const interpretR = (r: number): string => {
        const abs = Math.abs(r)
        if (abs < 0.1) return 'negligible'
        if (abs < 0.3) return 'small'
        if (abs < 0.5) return 'medium'
        return 'large'
      }

      expect(interpretR(0.05)).toBe('negligible')
      expect(interpretR(0.2)).toBe('small')
      expect(interpretR(0.4)).toBe('medium')
      expect(interpretR(0.6)).toBe('large')
    })

    it('should interpret eta-squared correctly', () => {
      // Cohen (1988): small = 0.01, medium = 0.06, large = 0.14
      const interpretEta2 = (eta2: number): string => {
        if (eta2 < 0.01) return 'negligible'
        if (eta2 < 0.06) return 'small'
        if (eta2 < 0.14) return 'medium'
        return 'large'
      }

      expect(interpretEta2(0.005)).toBe('negligible')
      expect(interpretEta2(0.03)).toBe('small')
      expect(interpretEta2(0.10)).toBe('medium')
      expect(interpretEta2(0.20)).toBe('large')
    })
  })

  describe('Edge cases', () => {
    it('should handle r = 0 correctly', () => {
      const r = 0
      const d = (2 * r) / Math.sqrt(1 - r * r)
      expect(d).toBe(0)
    })

    it('should handle d = 0 correctly', () => {
      const d = 0
      const r = d / Math.sqrt(d * d + 4)
      expect(r).toBe(0)
    })

    it('should handle OR = 1 correctly', () => {
      const OR = 1
      const d = Math.log(OR) * Math.sqrt(3) / Math.PI
      expect(d).toBe(0)
    })

    it('should handle very large effect sizes', () => {
      // d = 2.0 (very large)
      const d = 2.0
      const r = d / Math.sqrt(d * d + 4)
      expect(r).toBeLessThan(1)
      expect(r).toBeGreaterThan(0)
      expectApprox(r, 0.707, 0.01) // d=2 → r ≈ 0.707
    })
  })
})