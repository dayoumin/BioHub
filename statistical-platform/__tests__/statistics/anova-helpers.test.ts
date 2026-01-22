/**
 * ANOVA 헬퍼 함수 테스트
 *
 * 목적:
 * - runOneWayANOVA, runTwoWayANOVA, runThreeWayANOVA 함수 검증
 * - 결과 변환 함수 검증
 * - 사후검정 로직 검증
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import {
  calculateGroupStatistics,
  calculateSumOfSquares,
  calculateEffectSizes,
  interpretEffectSize,
  convertOneWayToPageResults,
  convertTwoWayToPageResults,
  convertThreeWayToPageResults,
  type GroupResult,
  type OneWayANOVAResult,
  type TwoWayANOVAResult,
  type ThreeWayANOVAResult,
  type ANOVATableRow
} from '@/lib/statistics/anova-helpers'

describe('ANOVA Helpers', () => {
  describe('1. calculateGroupStatistics', () => {
    it('should calculate correct statistics for each group', () => {
      const groupsMap = new Map<string, number[]>([
        ['A', [10, 12, 14, 11, 13]],
        ['B', [20, 22, 18, 21, 19]],
        ['C', [15, 17, 16, 14, 18]]
      ])
      const groupNames = ['A', 'B', 'C']

      const result = calculateGroupStatistics(groupsMap, groupNames)

      expect(result).toHaveLength(3)

      // Group A
      expect(result[0].name).toBe('A')
      expect(result[0].n).toBe(5)
      expect(result[0].mean).toBeCloseTo(12, 1)

      // Group B
      expect(result[1].name).toBe('B')
      expect(result[1].n).toBe(5)
      expect(result[1].mean).toBeCloseTo(20, 1)

      // Group C
      expect(result[2].name).toBe('C')
      expect(result[2].n).toBe(5)
      expect(result[2].mean).toBeCloseTo(16, 1)
    })

    it('should calculate standard deviation correctly', () => {
      const groupsMap = new Map<string, number[]>([
        ['Test', [2, 4, 4, 4, 5, 5, 7, 9]] // Known std = 2.0
      ])

      const result = calculateGroupStatistics(groupsMap, ['Test'])

      expect(result[0].std).toBeCloseTo(2.138, 2)
    })

    it('should calculate confidence intervals', () => {
      const groupsMap = new Map<string, number[]>([
        ['Group1', [10, 20, 30, 40, 50]]
      ])

      const result = calculateGroupStatistics(groupsMap, ['Group1'])

      // CI should be around the mean (30) ± margin
      expect(result[0].ci[0]).toBeLessThan(result[0].mean)
      expect(result[0].ci[1]).toBeGreaterThan(result[0].mean)
    })
  })

  describe('2. calculateSumOfSquares', () => {
    it('should calculate SS correctly', () => {
      const groupsMap = new Map<string, number[]>([
        ['A', [1, 2, 3]],
        ['B', [4, 5, 6]],
        ['C', [7, 8, 9]]
      ])

      const groups: GroupResult[] = [
        { name: 'A', mean: 2, std: 1, n: 3, se: 0.577, ci: [0, 4] },
        { name: 'B', mean: 5, std: 1, n: 3, se: 0.577, ci: [3, 7] },
        { name: 'C', mean: 8, std: 1, n: 3, se: 0.577, ci: [6, 10] }
      ]

      const grandMean = 5 // (2 + 5 + 8) / 3

      const result = calculateSumOfSquares(groupsMap, groups, grandMean)

      // SS Between = sum of n_i * (mean_i - grand_mean)^2
      // = 3*(2-5)^2 + 3*(5-5)^2 + 3*(8-5)^2 = 3*9 + 0 + 3*9 = 54
      expect(result.ssBetween).toBeCloseTo(54, 0)

      // SS Within = sum of (x_ij - mean_i)^2
      // Group A: (1-2)^2 + (2-2)^2 + (3-2)^2 = 2
      // Group B: (4-5)^2 + (5-5)^2 + (6-5)^2 = 2
      // Group C: (7-8)^2 + (8-8)^2 + (9-8)^2 = 2
      // Total = 6
      expect(result.ssWithin).toBeCloseTo(6, 0)

      expect(result.ssTotal).toBeCloseTo(60, 0)
    })
  })

  describe('3. calculateEffectSizes', () => {
    it('should calculate eta squared correctly', () => {
      const ssBetween = 54
      const ssTotal = 60
      const df1 = 2
      const msWithin = 1

      const result = calculateEffectSizes(ssBetween, ssTotal, df1, msWithin)

      // Eta squared = SS_between / SS_total = 54/60 = 0.9
      expect(result.etaSquared).toBeCloseTo(0.9, 2)
    })

    it('should calculate omega squared correctly', () => {
      const ssBetween = 54
      const ssTotal = 60
      const df1 = 2
      const msWithin = 1

      const result = calculateEffectSizes(ssBetween, ssTotal, df1, msWithin)

      // Omega squared = (SS_between - df1 * MS_within) / (SS_total + MS_within)
      // = (54 - 2*1) / (60 + 1) = 52/61 ≈ 0.852
      expect(result.omegaSquared).toBeCloseTo(0.852, 2)
    })

    it('should calculate Cohens f correctly', () => {
      const result = calculateEffectSizes(54, 60, 2, 1)

      // Cohen's f = sqrt(eta^2 / (1 - eta^2)) = sqrt(0.9 / 0.1) = 3
      expect(result.cohensF).toBeCloseTo(3, 1)
    })
  })

  describe('4. interpretEffectSize', () => {
    it('should interpret large effect size', () => {
      expect(interpretEffectSize(0.20)).toBe('large')
      expect(interpretEffectSize(0.14)).toBe('large')
    })

    it('should interpret medium effect size', () => {
      expect(interpretEffectSize(0.10)).toBe('medium')
      expect(interpretEffectSize(0.06)).toBe('medium')
    })

    it('should interpret small effect size', () => {
      expect(interpretEffectSize(0.05)).toBe('small')
      expect(interpretEffectSize(0.01)).toBe('small')
    })
  })

  describe('5. convertOneWayToPageResults', () => {
    it('should convert OneWayANOVAResult to PageANOVAResults format', () => {
      const oneWayResult: OneWayANOVAResult = {
        fStatistic: 12.5,
        pValue: 0.001,
        dfBetween: 2,
        dfWithin: 27,
        msBetween: 100,
        msWithin: 8,
        etaSquared: 0.48,
        omegaSquared: 0.44,
        powerAnalysis: {
          observedPower: 0.95,
          effectSize: 'large',
          cohensF: 0.96
        },
        groups: [
          { name: 'A', mean: 10, std: 2, n: 10, se: 0.63, ci: [8.77, 11.23] },
          { name: 'B', mean: 15, std: 2.5, n: 10, se: 0.79, ci: [13.45, 16.55] },
          { name: 'C', mean: 20, std: 3, n: 10, se: 0.95, ci: [18.14, 21.86] }
        ],
        postHoc: {
          method: 'Tukey HSD',
          comparisons: [
            { group1: 'A', group2: 'B', meanDiff: -5, pValue: 0.01, significant: true },
            { group1: 'A', group2: 'C', meanDiff: -10, pValue: 0.001, significant: true },
            { group1: 'B', group2: 'C', meanDiff: -5, pValue: 0.01, significant: true }
          ],
          adjustedAlpha: 0.0167
        },
        assumptions: {
          normality: {
            shapiroWilk: { statistic: 0.95, pValue: 0.15 },
            passed: true,
            interpretation: '정규성 가정 만족'
          },
          homogeneity: {
            levene: { statistic: 1.2, pValue: 0.32 },
            passed: true,
            interpretation: '등분산성 가정 만족'
          }
        },
        anovaTable: [
          { source: '그룹 간', ss: 200, df: 2, ms: 100, f: 12.5, p: 0.001 },
          { source: '그룹 내', ss: 216, df: 27, ms: 8, f: null, p: null },
          { source: '전체', ss: 416, df: 29, ms: null, f: null, p: null }
        ]
      }

      const pageResult = convertOneWayToPageResults(oneWayResult)

      expect(pageResult.fStatistic).toBe(12.5)
      expect(pageResult.pValue).toBe(0.001)
      expect(pageResult.dfBetween).toBe(2)
      expect(pageResult.dfWithin).toBe(27)
      expect(pageResult.groups).toHaveLength(3)
      expect(pageResult.postHoc?.method).toBe('Tukey HSD')
      expect(pageResult.assumptions?.normality.passed).toBe(true)
      expect(pageResult.anovaTable).toHaveLength(3)
    })
  })

  describe('6. convertTwoWayToPageResults', () => {
    it('should convert TwoWayANOVAResult to PageANOVAResults format', () => {
      const twoWayResult: TwoWayANOVAResult = {
        factor1: {
          name: 'Treatment',
          fStatistic: 8.5,
          pValue: 0.005,
          df: 2,
          etaSquared: 0.25,
          omegaSquared: 0.22
        },
        factor2: {
          name: 'Time',
          fStatistic: 4.2,
          pValue: 0.04,
          df: 1,
          etaSquared: 0.12,
          omegaSquared: 0.10
        },
        interaction: {
          name: 'Treatment × Time',
          fStatistic: 2.1,
          pValue: 0.13,
          df: 2,
          etaSquared: 0.06,
          omegaSquared: 0.04
        },
        anovaTable: [
          { source: '요인 1 (Treatment)', ss: 100, df: 2, ms: 50, f: 8.5, p: 0.005 },
          { source: '요인 2 (Time)', ss: 50, df: 1, ms: 50, f: 4.2, p: 0.04 },
          { source: '상호작용', ss: 25, df: 2, ms: 12.5, f: 2.1, p: 0.13 },
          { source: '잔차', ss: 150, df: 24, ms: 6.25, f: null, p: null }
        ],
        residualDf: 24,
        postHoc: {
          method: 'Tukey HSD',
          comparisons: [
            { group1: 'Treatment: A', group2: 'Treatment: B', meanDiff: 3, pValue: 0.02, significant: true }
          ],
          adjustedAlpha: 0.05
        }
      }

      const pageResult = convertTwoWayToPageResults(twoWayResult)

      expect(pageResult.fStatistic).toBe(8.5) // Factor 1's F
      expect(pageResult.pValue).toBe(0.005)
      expect(pageResult.dfBetween).toBe(2)
      expect(pageResult.dfWithin).toBe(24)
      expect(pageResult.multiFactorResults?.factor1.name).toBe('Treatment')
      expect(pageResult.multiFactorResults?.factor2?.name).toBe('Time')
      expect(pageResult.multiFactorResults?.interaction12?.name).toBe('Treatment × Time')
      expect(pageResult.postHoc?.method).toBe('Tukey HSD')
    })
  })

  describe('7. convertThreeWayToPageResults', () => {
    it('should convert ThreeWayANOVAResult to PageANOVAResults format', () => {
      const threeWayResult: ThreeWayANOVAResult = {
        factor1: { name: 'A', fStatistic: 10, pValue: 0.002, df: 2, etaSquared: 0.20, omegaSquared: 0.18 },
        factor2: { name: 'B', fStatistic: 5, pValue: 0.03, df: 1, etaSquared: 0.10, omegaSquared: 0.08 },
        factor3: { name: 'C', fStatistic: 3, pValue: 0.08, df: 1, etaSquared: 0.06, omegaSquared: 0.04 },
        interaction12: { name: 'A × B', fStatistic: 2, pValue: 0.15, df: 2, etaSquared: 0.04, omegaSquared: 0.02 },
        interaction13: { name: 'A × C', fStatistic: 1.5, pValue: 0.23, df: 2, etaSquared: 0.03, omegaSquared: 0.01 },
        interaction23: { name: 'B × C', fStatistic: 1, pValue: 0.32, df: 1, etaSquared: 0.02, omegaSquared: 0.01 },
        interaction123: { name: 'A × B × C', fStatistic: 0.5, pValue: 0.61, df: 2, etaSquared: 0.01, omegaSquared: 0.00 },
        anovaTable: [
          { source: '요인 1 (A)', ss: 100, df: 2, ms: 50, f: 10, p: 0.002 },
          { source: '요인 2 (B)', ss: 50, df: 1, ms: 50, f: 5, p: 0.03 },
          { source: '요인 3 (C)', ss: 30, df: 1, ms: 30, f: 3, p: 0.08 },
          { source: '잔차', ss: 200, df: 40, ms: 5, f: null, p: null }
        ],
        residualDf: 40
      }

      const pageResult = convertThreeWayToPageResults(threeWayResult)

      expect(pageResult.fStatistic).toBe(10)
      expect(pageResult.pValue).toBe(0.002)
      expect(pageResult.dfWithin).toBe(40)
      expect(pageResult.multiFactorResults?.factor1.name).toBe('A')
      expect(pageResult.multiFactorResults?.factor2?.name).toBe('B')
      expect(pageResult.multiFactorResults?.factor3?.name).toBe('C')
      expect(pageResult.multiFactorResults?.interaction12?.name).toBe('A × B')
      expect(pageResult.multiFactorResults?.interaction123?.name).toBe('A × B × C')
    })
  })

  describe('8. Edge Cases', () => {
    it('should handle empty groups map', () => {
      const groupsMap = new Map<string, number[]>()
      const result = calculateGroupStatistics(groupsMap, [])
      expect(result).toHaveLength(0)
    })

    it('should handle single value in group', () => {
      const groupsMap = new Map<string, number[]>([
        ['Single', [42]]
      ])

      const result = calculateGroupStatistics(groupsMap, ['Single'])

      expect(result[0].n).toBe(1)
      expect(result[0].mean).toBe(42)
      // std should be NaN for single value (dividing by n-1 = 0)
      expect(result[0].std).toBeNaN()
    })

    it('should handle effect size of 0', () => {
      const result = calculateEffectSizes(0, 100, 2, 10)
      expect(result.etaSquared).toBe(0)
    })

    it('should interpret very small effect size as small', () => {
      expect(interpretEffectSize(0.001)).toBe('small')
      expect(interpretEffectSize(0)).toBe('small')
    })
  })
})
