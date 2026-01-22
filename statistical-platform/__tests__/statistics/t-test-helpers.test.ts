/**
 * T-Test 헬퍼 함수 테스트
 *
 * 목적:
 * - 효과크기 해석 함수 검증
 * - 데이터 추출 함수 검증
 * - Cohen's d 계산 함수 검증
 * - Summary/Raw 모드 분기 검증
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import {
  interpretEffectSize,
  extractNumericValues,
  extractGroupData,
  extractPairedData,
  calculateOneSampleCohensD,
  calculatePairedCohensD,
  runOneSampleTTestSummary,
  runTwoSampleTTestSummary,
  runPairedTTestSummary,
  runOneSampleTTestRaw,
  runTwoSampleTTestRaw,
  runPairedTTestRaw,
  runTTest,
  type TTestResult
} from '@/lib/statistics/t-test-helpers'
import { PyodideWorker } from '@/lib/services/pyodide/core/pyodide-worker.enum'

// Mock PyodideCore 생성
function createMockPyodideCore() {
  return {
    callWorkerMethod: vi.fn()
  }
}

describe('T-Test Helpers', () => {
  describe('1. interpretEffectSize', () => {
    it('should interpret large effect size (>= 0.8)', () => {
      expect(interpretEffectSize(0.8)).toBe('큰 효과')
      expect(interpretEffectSize(1.2)).toBe('큰 효과')
      expect(interpretEffectSize(-0.9)).toBe('큰 효과')
    })

    it('should interpret medium effect size (0.5 <= d < 0.8)', () => {
      expect(interpretEffectSize(0.5)).toBe('중간 효과')
      expect(interpretEffectSize(0.65)).toBe('중간 효과')
      expect(interpretEffectSize(-0.7)).toBe('중간 효과')
    })

    it('should interpret small effect size (0.2 <= d < 0.5)', () => {
      expect(interpretEffectSize(0.2)).toBe('작은 효과')
      expect(interpretEffectSize(0.35)).toBe('작은 효과')
      expect(interpretEffectSize(-0.3)).toBe('작은 효과')
    })

    it('should interpret no effect (d < 0.2)', () => {
      expect(interpretEffectSize(0.1)).toBe('효과 없음')
      expect(interpretEffectSize(0)).toBe('효과 없음')
      expect(interpretEffectSize(-0.15)).toBe('효과 없음')
    })
  })

  describe('2. extractNumericValues', () => {
    it('should extract numeric values from data', () => {
      const data = [
        { value: 10, name: 'A' },
        { value: 20, name: 'B' },
        { value: 30, name: 'C' }
      ]
      const result = extractNumericValues(data, 'value')
      expect(result).toEqual([10, 20, 30])
    })

    it('should filter out NaN values', () => {
      const data = [
        { value: 10 },
        { value: 'not a number' },
        { value: 30 },
        { value: undefined }
      ]
      const result = extractNumericValues(data, 'value')
      // Note: Number(null) = 0 (valid), Number(undefined) = NaN
      expect(result).toEqual([10, 30])
    })

    it('should handle empty data', () => {
      const result = extractNumericValues([], 'value')
      expect(result).toEqual([])
    })
  })

  describe('3. extractGroupData', () => {
    it('should extract data for two groups', () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: 12 },
        { group: 'B', value: 20 },
        { group: 'B', value: 22 }
      ]
      const result = extractGroupData(data, 'group', 'value')

      expect(result.groups).toHaveLength(2)
      expect(result.group1Data).toEqual([10, 12])
      expect(result.group2Data).toEqual([20, 22])
    })

    it('should throw error for non-binary groups', () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'B', value: 20 },
        { group: 'C', value: 30 }
      ]

      expect(() => extractGroupData(data, 'group', 'value'))
        .toThrow(/정확히 2개의 값/)
    })

    it('should filter NaN values within groups', () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: 'invalid' },
        { group: 'B', value: 20 },
        { group: 'B', value: undefined }
      ]
      const result = extractGroupData(data, 'group', 'value')
      // Note: Number(null) = 0 (valid), Number(undefined) = NaN
      expect(result.group1Data).toEqual([10])
      expect(result.group2Data).toEqual([20])
    })
  })

  describe('4. extractPairedData', () => {
    it('should extract valid pairs', () => {
      const data = [
        { before: 10, after: 15 },
        { before: 20, after: 25 },
        { before: 30, after: 35 }
      ]
      const result = extractPairedData(data, 'before', 'after')

      expect(result.values1).toEqual([10, 20, 30])
      expect(result.values2).toEqual([15, 25, 35])
      expect(result.differences).toEqual([5, 5, 5])
    })

    it('should filter out pairs with NaN', () => {
      const data = [
        { before: 10, after: 15 },
        { before: 'invalid', after: 25 },
        { before: 30, after: undefined }
      ]
      const result = extractPairedData(data, 'before', 'after')
      // Note: Number(null) = 0 (valid), Number(undefined) = NaN
      expect(result.values1).toEqual([10])
      expect(result.values2).toEqual([15])
      expect(result.differences).toEqual([5])
    })

    it('should calculate differences correctly (after - before)', () => {
      const data = [
        { before: 100, after: 80 }, // -20
        { before: 50, after: 70 }   // +20
      ]
      const result = extractPairedData(data, 'before', 'after')

      expect(result.differences).toEqual([-20, 20])
    })
  })

  describe('5. calculateOneSampleCohensD', () => {
    it('should calculate Cohen\'s d correctly', () => {
      const values = [10, 12, 14, 16, 18] // mean=14, std~=3.16
      const testValue = 10
      const cohensD = calculateOneSampleCohensD(values, testValue)

      // (14 - 10) / 3.16 ≈ 1.26
      expect(cohensD).toBeCloseTo(1.26, 1)
    })

    it('should return 0 for zero std', () => {
      const values = [10, 10, 10, 10, 10] // std = 0
      const testValue = 5
      const cohensD = calculateOneSampleCohensD(values, testValue)

      expect(cohensD).toBe(0)
    })

    it('should handle negative Cohen\'s d', () => {
      const values = [10, 12, 14] // mean=12
      const testValue = 20 // testValue > mean
      const cohensD = calculateOneSampleCohensD(values, testValue)

      expect(cohensD).toBeLessThan(0)
    })
  })

  describe('6. calculatePairedCohensD', () => {
    it('should calculate paired Cohen\'s d correctly', () => {
      const differences = [5, 5, 5, 5, 5] // mean=5, std=0
      const cohensD = calculatePairedCohensD(differences)

      // std=0 이면 0 반환
      expect(cohensD).toBe(0)
    })

    it('should calculate Cohen\'s d with variance', () => {
      const differences = [2, 4, 6, 8, 10] // mean=6, std≈3.16
      const cohensD = calculatePairedCohensD(differences)

      // 6 / 3.16 ≈ 1.9
      expect(cohensD).toBeCloseTo(1.9, 1)
    })
  })

  describe('7. runOneSampleTTestSummary', () => {
    it('should call worker with correct parameters', async () => {
      const mockPyodide = createMockPyodideCore()
      mockPyodide.callWorkerMethod.mockResolvedValue({
        statistic: 2.5,
        pValue: 0.02,
        df: 29,
        meanDiff: 5,
        ciLower: 1,
        ciUpper: 9,
        cohensD: 0.45,
        n: 30,
        mean: 55,
        std: 11
      })

      const result = await runOneSampleTTestSummary(mockPyodide, {
        mean: 55,
        std: 11,
        n: 30,
        popmean: 50
      })

      expect(mockPyodide.callWorkerMethod).toHaveBeenCalledWith(
        PyodideWorker.Hypothesis,
        't_test_one_sample_summary',
        expect.objectContaining({
          mean: 55,
          std: 11,
          n: 30,
          popmean: 50,
          alpha: 0.05
        })
      )

      expect(result.type).toBe('one-sample')
      expect(result.statistic).toBe(2.5)
      expect(result.pvalue).toBe(0.02)
      expect(result.effect_size?.interpretation).toBe('작은 효과')
    })
  })

  describe('8. runTwoSampleTTestSummary', () => {
    it('should call worker with correct parameters', async () => {
      const mockPyodide = createMockPyodideCore()
      mockPyodide.callWorkerMethod.mockResolvedValue({
        statistic: 3.2,
        pValue: 0.003,
        df: 58,
        meanDiff: 10,
        ciLower: 4,
        ciUpper: 16,
        cohensD: 0.85,
        mean1: 60,
        mean2: 50,
        std1: 12,
        std2: 11,
        n1: 30,
        n2: 30
      })

      const result = await runTwoSampleTTestSummary(mockPyodide, {
        mean1: 60,
        std1: 12,
        n1: 30,
        mean2: 50,
        std2: 11,
        n2: 30,
        equalVar: true
      })

      expect(result.type).toBe('two-sample')
      expect(result.sample_stats?.group1?.mean).toBe(60)
      expect(result.sample_stats?.group2?.mean).toBe(50)
      expect(result.effect_size?.interpretation).toBe('큰 효과')
    })
  })

  describe('9. runPairedTTestSummary', () => {
    it('should call worker with correct parameters', async () => {
      const mockPyodide = createMockPyodideCore()
      mockPyodide.callWorkerMethod.mockResolvedValue({
        statistic: 4.5,
        pValue: 0.001,
        df: 24,
        meanDiff: 8,
        ciLower: 5,
        ciUpper: 11,
        cohensD: 0.9,
        nPairs: 25,
        stdDiff: 9
      })

      const result = await runPairedTTestSummary(mockPyodide, {
        meanDiff: 8,
        stdDiff: 9,
        nPairs: 25
      })

      expect(result.type).toBe('paired')
      expect(result.df).toBe(24)
      expect(result.effect_size?.cohens_d).toBe(0.9)
    })
  })

  describe('10. runOneSampleTTestRaw', () => {
    it('should extract values and call worker', async () => {
      const mockPyodide = createMockPyodideCore()
      mockPyodide.callWorkerMethod.mockResolvedValue({
        statistic: 2.0,
        pValue: 0.05,
        sampleMean: 55
      })

      const data = [
        { value: 50 },
        { value: 55 },
        { value: 60 }
      ]

      const result = await runOneSampleTTestRaw(mockPyodide, data, 'value', 45)

      expect(mockPyodide.callWorkerMethod).toHaveBeenCalledWith(
        PyodideWorker.Hypothesis,
        't_test_one_sample',
        expect.objectContaining({
          data: [50, 55, 60],
          popmean: 45
        })
      )

      expect(result.type).toBe('one-sample')
      expect(result.df).toBe(2) // n-1 = 3-1
    })

    it('should throw error for insufficient data', async () => {
      const mockPyodide = createMockPyodideCore()
      const data = [{ value: 50 }] // Only 1 value

      await expect(
        runOneSampleTTestRaw(mockPyodide, data, 'value', 45)
      ).rejects.toThrow(/최소 2개/)
    })
  })

  describe('11. runTwoSampleTTestRaw', () => {
    it('should extract groups and call worker', async () => {
      const mockPyodide = createMockPyodideCore()
      mockPyodide.callWorkerMethod.mockResolvedValue({
        statistic: 2.5,
        pValue: 0.02,
        cohensD: 0.6,
        mean1: 55,
        mean2: 45,
        std1: 10,
        std2: 12,
        n1: 3,
        n2: 3
      })

      const data = [
        { group: 'A', value: 50 },
        { group: 'A', value: 55 },
        { group: 'A', value: 60 },
        { group: 'B', value: 40 },
        { group: 'B', value: 45 },
        { group: 'B', value: 50 }
      ]

      const result = await runTwoSampleTTestRaw(mockPyodide, data, 'group', 'value')

      expect(result.type).toBe('two-sample')
      expect(result.mean_diff).toBe(10) // 55 - 45
    })

    it('should throw error for non-binary groups', async () => {
      const mockPyodide = createMockPyodideCore()
      const data = [
        { group: 'A', value: 50 },
        { group: 'B', value: 55 },
        { group: 'C', value: 60 }
      ]

      await expect(
        runTwoSampleTTestRaw(mockPyodide, data, 'group', 'value')
      ).rejects.toThrow(/정확히 2개/)
    })
  })

  describe('12. runPairedTTestRaw', () => {
    it('should extract pairs and call worker', async () => {
      const mockPyodide = createMockPyodideCore()
      mockPyodide.callWorkerMethod.mockResolvedValue({
        statistic: 3.0,
        pValue: 0.01,
        meanDiff: 5,
        nPairs: 3
      })

      const data = [
        { before: 50, after: 55 },
        { before: 45, after: 50 },
        { before: 55, after: 60 }
      ]

      const result = await runPairedTTestRaw(mockPyodide, data, 'before', 'after')

      expect(result.type).toBe('paired')
      expect(result.df).toBe(2) // nPairs - 1
    })

    it('should throw error for insufficient pairs', async () => {
      const mockPyodide = createMockPyodideCore()
      const data = [
        { before: 50, after: 55 }
      ]

      await expect(
        runPairedTTestRaw(mockPyodide, data, 'before', 'after')
      ).rejects.toThrow(/최소 2개/)
    })
  })

  describe('13. runTTest (Unified Interface)', () => {
    let mockPyodide: ReturnType<typeof createMockPyodideCore>

    beforeEach(() => {
      mockPyodide = createMockPyodideCore()
    })

    it('should route to one-sample summary correctly', async () => {
      mockPyodide.callWorkerMethod.mockResolvedValue({
        statistic: 2.5, pValue: 0.02, df: 29, meanDiff: 5,
        ciLower: 1, ciUpper: 9, cohensD: 0.45, n: 30, mean: 55, std: 11
      })

      const result = await runTTest(mockPyodide, {
        testType: 'one-sample',
        inputMode: 'summary',
        summaryOne: { mean: 55, std: 11, n: 30, popmean: 50 }
      })

      expect(result.type).toBe('one-sample')
    })

    it('should route to two-sample raw correctly', async () => {
      mockPyodide.callWorkerMethod.mockResolvedValue({
        statistic: 2.5, pValue: 0.02, cohensD: 0.6,
        mean1: 55, mean2: 45, std1: 10, std2: 12, n1: 3, n2: 3
      })

      const result = await runTTest(mockPyodide, {
        testType: 'two-sample',
        inputMode: 'raw',
        data: [
          { group: 'A', value: 50 },
          { group: 'A', value: 55 },
          { group: 'A', value: 60 },
          { group: 'B', value: 40 },
          { group: 'B', value: 45 },
          { group: 'B', value: 50 }
        ],
        groupColumn: 'group',
        valueColumn: 'value'
      })

      expect(result.type).toBe('two-sample')
    })

    it('should throw error when data is missing in raw mode', async () => {
      await expect(
        runTTest(mockPyodide, {
          testType: 'one-sample',
          inputMode: 'raw',
          valueColumn: 'value',
          testValue: 50
          // data is missing
        })
      ).rejects.toThrow(/데이터를 업로드/)
    })

    it('should throw error when summary is missing in summary mode', async () => {
      await expect(
        runTTest(mockPyodide, {
          testType: 'one-sample',
          inputMode: 'summary'
          // summaryOne is missing
        })
      ).rejects.toThrow(/요약통계를 입력/)
    })
  })

  describe('14. Edge Cases', () => {
    it('should handle single group error correctly', () => {
      const data = [
        { group: 'A', value: 10 },
        { group: 'A', value: 20 }
      ]

      expect(() => extractGroupData(data, 'group', 'value'))
        .toThrow(/1개/)
    })

    it('should handle empty differences array', () => {
      const cohensD = calculatePairedCohensD([])
      // Empty array: std = 0, so returns 0 (not NaN due to guard clause)
      expect(cohensD).toBe(0)
    })

    it('should interpret edge values correctly', () => {
      expect(interpretEffectSize(0.199)).toBe('효과 없음')
      expect(interpretEffectSize(0.2)).toBe('작은 효과')
      expect(interpretEffectSize(0.499)).toBe('작은 효과')
      expect(interpretEffectSize(0.5)).toBe('중간 효과')
      expect(interpretEffectSize(0.799)).toBe('중간 효과')
      expect(interpretEffectSize(0.8)).toBe('큰 효과')
    })
  })
})
