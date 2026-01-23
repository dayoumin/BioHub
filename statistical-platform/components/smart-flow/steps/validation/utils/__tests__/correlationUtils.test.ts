/**
 * Tests for correlationUtils
 *
 * Validates:
 * 1. getPairedNumericData handles missing values correctly (pairwise deletion)
 * 2. calculateCorrelationMatrix uses pairwise deletion for each pair
 * 3. Results match expected statistical values
 */

import { describe, it, expect } from 'vitest'
import { getPairedNumericData, calculateCorrelationMatrix, calculateCorrelation } from '../correlationUtils'

describe('correlationUtils', () => {
  describe('getPairedNumericData', () => {
    it('should remove rows where either value is missing', () => {
      const data = [
        { x: 1, y: 2 },
        { x: 2, y: null },
        { x: null, y: 4 },
        { x: 4, y: 5 },
        { x: 5, y: undefined },
      ]

      const result = getPairedNumericData(data, 'x', 'y')

      expect(result.x).toEqual([1, 4])
      expect(result.y).toEqual([2, 5])
      expect(result.x.length).toBe(result.y.length)
    })

    it('should handle all valid data', () => {
      const data = [
        { a: 1, b: 2 },
        { a: 2, b: 3 },
        { a: 3, b: 4 },
      ]

      const result = getPairedNumericData(data, 'a', 'b')

      expect(result.x).toEqual([1, 2, 3])
      expect(result.y).toEqual([2, 3, 4])
    })

    it('should handle all missing data', () => {
      const data = [
        { x: null, y: null },
        { x: undefined, y: undefined },
      ]

      const result = getPairedNumericData(data, 'x', 'y')

      expect(result.x).toEqual([])
      expect(result.y).toEqual([])
    })

    it('should handle string numbers', () => {
      const data = [
        { x: '1', y: '2' },
        { x: '2', y: null },
        { x: '3', y: '4' },
      ]

      const result = getPairedNumericData(data, 'x', 'y')

      expect(result.x).toEqual([1, 3])
      expect(result.y).toEqual([2, 4])
    })

    it('should filter out NaN and Infinity', () => {
      const data = [
        { x: 1, y: 2 },
        { x: NaN, y: 3 },
        { x: 3, y: Infinity },
        { x: 4, y: 5 },
      ]

      const result = getPairedNumericData(data, 'x', 'y')

      expect(result.x).toEqual([1, 4])
      expect(result.y).toEqual([2, 5])
    })
  })

  describe('calculateCorrelationMatrix', () => {
    it('should use pairwise deletion for each pair independently', () => {
      // Example data where each pair has different valid observations
      const data = [
        { a: 1, b: 2, c: 3 },
        { a: 2, b: null, c: 4 },  // b missing: affects a-b and b-c
        { a: 3, b: 4, c: null },  // c missing: affects a-c and b-c
        { a: 4, b: 5, c: 6 },
      ]

      const result = calculateCorrelationMatrix(data, ['a', 'b', 'c'])

      // Matrix should be symmetric
      expect(result.matrix.length).toBe(3)
      expect(result.matrix[0].length).toBe(3)

      // Diagonal should be 1
      expect(result.matrix[0][0]).toBe(1)
      expect(result.matrix[1][1]).toBe(1)
      expect(result.matrix[2][2]).toBe(1)

      // Should be symmetric
      expect(result.matrix[0][1]).toBeCloseTo(result.matrix[1][0])
      expect(result.matrix[0][2]).toBeCloseTo(result.matrix[2][0])
      expect(result.matrix[1][2]).toBeCloseTo(result.matrix[2][1])

      // a-b correlation: uses rows 0, 2, 3 (n=3)
      // Expected: perfect correlation since (1,2), (3,4), (4,5) is linear
      expect(result.matrix[0][1]).toBeCloseTo(1, 5)

      // a-c correlation: uses rows 0, 1, 3 (n=3)
      // Expected: perfect correlation since (1,3), (2,4), (4,6) is linear
      expect(result.matrix[0][2]).toBeCloseTo(1, 5)

      // b-c correlation: uses rows 0, 3 (n=2)
      // Expected: perfect correlation since (2,3), (5,6) is linear
      expect(result.matrix[1][2]).toBeCloseTo(1, 5)
    })

    it('should return correct labels', () => {
      const data = [
        { col1: 1, col2: 2, col3: 3 },
      ]

      const result = calculateCorrelationMatrix(data, ['col1', 'col2', 'col3'])

      expect(result.labels).toEqual(['col1', 'col2', 'col3'])
    })

    it('should handle single column', () => {
      const data = [
        { x: 1 },
        { x: 2 },
      ]

      const result = calculateCorrelationMatrix(data, ['x'])

      expect(result.matrix).toEqual([[1]])
      expect(result.labels).toEqual(['x'])
    })

    it('should calculate correct correlations with real data', () => {
      const data = [
        { x: 1, y: 2 },
        { x: 2, y: 4 },
        { x: 3, y: 6 },
        { x: 4, y: 8 },
      ]

      const result = calculateCorrelationMatrix(data, ['x', 'y'])

      // x and y have perfect positive correlation
      expect(result.matrix[0][1]).toBeCloseTo(1, 10)
      expect(result.matrix[1][0]).toBeCloseTo(1, 10)
    })

    it('should handle negative correlation', () => {
      const data = [
        { x: 1, y: 4 },
        { x: 2, y: 3 },
        { x: 3, y: 2 },
        { x: 4, y: 1 },
      ]

      const result = calculateCorrelationMatrix(data, ['x', 'y'])

      // x and y have perfect negative correlation
      expect(result.matrix[0][1]).toBeCloseTo(-1, 10)
    })
  })

  describe('calculateCorrelation', () => {
    it('should calculate Pearson correlation correctly', () => {
      const x = [1, 2, 3, 4, 5]
      const y = [2, 4, 6, 8, 10]

      const r = calculateCorrelation(x, y)

      expect(r).toBeCloseTo(1, 10)
    })

    it('should handle zero variance', () => {
      const x = [1, 1, 1, 1]
      const y = [2, 3, 4, 5]

      const r = calculateCorrelation(x, y)

      expect(r).toBe(0)
    })

    it('should handle empty arrays', () => {
      const r = calculateCorrelation([], [])

      expect(r).toBe(0)
    })
  })

  describe('Bug Fix Validation: Pairwise deletion vs Column-wise filtering', () => {
    it('BUG FIX: should use pairwise deletion, not independent filtering', () => {
      // This test validates the bug fix
      // OLD BUG: filtered each column independently, causing index misalignment
      // NEW FIX: filters rows pairwise, keeping arrays aligned

      const data = [
        { x: 1, y: 10, z: 100 },
        { x: 2, y: null, z: 200 },  // y missing
        { x: null, y: 30, z: 300 }, // x missing
        { x: 4, y: 40, z: null },   // z missing
        { x: 5, y: 50, z: 500 },
      ]

      // Test x-y pair
      const xyPaired = getPairedNumericData(data, 'x', 'y')
      expect(xyPaired.x).toEqual([1, 4, 5])  // rows 0, 3, 4
      expect(xyPaired.y).toEqual([10, 40, 50])
      expect(xyPaired.x.length).toBe(xyPaired.y.length) // CRITICAL: arrays must be same length

      // Test x-z pair
      const xzPaired = getPairedNumericData(data, 'x', 'z')
      expect(xzPaired.x).toEqual([1, 2, 5])  // rows 0, 1, 4 (different from x-y!)
      expect(xzPaired.y).toEqual([100, 200, 500])  // y property contains z values
      expect(xzPaired.x.length).toBe(xzPaired.y.length)

      // Test y-z pair
      const yzPaired = getPairedNumericData(data, 'y', 'z')
      expect(yzPaired.x).toEqual([10, 30, 50])  // rows 0, 2, 4 (different from both above!)
      expect(yzPaired.y).toEqual([100, 300, 500])  // y property contains z values
      expect(yzPaired.x.length).toBe(yzPaired.y.length)

      // This proves each pair uses different valid observations
      // This is the correct statistical approach (pairwise deletion)
    })

    it('BUG FIX: correlation matrix should not fail with missing data', () => {
      const data = [
        { a: 1, b: 10 },
        { a: 2, b: null },
        { a: null, b: 30 },
        { a: 4, b: 40 },
      ]

      // Should not throw error
      expect(() => {
        calculateCorrelationMatrix(data, ['a', 'b'])
      }).not.toThrow()

      const result = calculateCorrelationMatrix(data, ['a', 'b'])

      // Should return valid correlation (using rows 0 and 3)
      expect(result.matrix[0][1]).not.toBeNaN()
      expect(result.matrix[0][1]).toBeCloseTo(1, 5) // (1,10) and (4,40) are perfectly correlated
    })
  })
})
