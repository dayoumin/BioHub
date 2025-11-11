/**
 * Descriptive Statistics Tests
 * 기술통계량 (descriptive) 메서드 단위 테스트
 */

import { createDescriptiveGroup } from '../../../lib/statistics/groups/descriptive.group'
import type { CalculatorContext } from '../../../lib/statistics/calculator-types'

describe('Descriptive Statistics', () => {
  // Mock context
  const mockContext: CalculatorContext = {
    callWorkerMethod: jest.fn()
  }

  const descriptiveGroup = createDescriptiveGroup(mockContext)
  const descriptiveHandler = descriptiveGroup.handlers.descriptive

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('기본 케이스 (정상 데이터)', () => {
    it('should calculate descriptive statistics correctly', async () => {
      const testData = [
        { value: 10 },
        { value: 20 },
        { value: 30 },
        { value: 40 },
        { value: 50 }
      ]

      // Mock Pyodide response
      const mockPyodideResult = {
        mean: 30,
        median: 30,
        std: 15.81,
        variance: 250,
        min: 10,
        max: 50,
        q1: 20,
        q3: 40,
        iqr: 20,
        skewness: 0,
        kurtosis: -1.2,
        count: 5
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        mean: 30,
        median: 30,
        std: expect.any(Number),
        min: 10,
        max: 50,
        count: 5
      })
      expect(mockContext.callWorkerMethod).toHaveBeenCalledWith(
        1,
        'descriptiveStats',
        expect.objectContaining({
          data: [10, 20, 30, 40, 50]
        })
      )
    })

    it('should handle floating point numbers', async () => {
      const testData = [
        { score: 85.5 },
        { score: 90.2 },
        { score: 78.8 },
        { score: 92.1 },
        { score: 88.4 }
      ]

      const mockPyodideResult = {
        mean: 87.0,
        median: 88.4,
        std: 5.2,
        variance: 27.04,
        min: 78.8,
        max: 92.1,
        q1: 85.5,
        q3: 90.2,
        iqr: 4.7,
        skewness: -0.15,
        kurtosis: -1.5,
        count: 5
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await descriptiveHandler(testData, { column: 'score' })

      expect(result.success).toBe(true)
      expect(result.data?.mean).toBeCloseTo(87.0, 1)
    })
  })

  describe('엣지 케이스', () => {
    it('should handle small sample size (n=2)', async () => {
      const testData = [
        { value: 5 },
        { value: 10 }
      ]

      const mockPyodideResult = {
        mean: 7.5,
        median: 7.5,
        std: 3.54,
        variance: 12.5,
        min: 5,
        max: 10,
        q1: 5,
        q3: 10,
        iqr: 5,
        skewness: 0,
        kurtosis: 0,
        count: 2
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(result.data?.count).toBe(2)
    })

    it('should handle single value (n=1)', async () => {
      const testData = [{ value: 42 }]

      const mockPyodideResult = {
        mean: 42,
        median: 42,
        std: 0,
        variance: 0,
        min: 42,
        max: 42,
        q1: 42,
        q3: 42,
        iqr: 0,
        skewness: 0,
        kurtosis: 0,
        count: 1
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(result.data?.std).toBe(0)
    })

    it('should handle data with missing values', async () => {
      const testData = [
        { value: 10 },
        { value: null },
        { value: 30 },
        { value: undefined },
        { value: 50 }
      ]

      const mockPyodideResult = {
        mean: 30,
        median: 30,
        std: 20,
        variance: 400,
        min: 10,
        max: 50,
        q1: 20,
        q3: 40,
        iqr: 20,
        skewness: 0,
        kurtosis: -1.5,
        count: 3
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(result.data?.count).toBe(3) // null과 undefined 제외
    })

    it('should handle data with outliers', async () => {
      const testData = [
        { value: 10 },
        { value: 12 },
        { value: 11 },
        { value: 13 },
        { value: 1000 } // 극단적 이상치
      ]

      const mockPyodideResult = {
        mean: 209.2,
        median: 12,
        std: 394.9,
        variance: 155946,
        min: 10,
        max: 1000,
        q1: 11,
        q3: 13,
        iqr: 2,
        skewness: 2.23,
        kurtosis: 5.0,
        count: 5
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(result.data?.skewness).toBeGreaterThan(2) // 극단적 왜도
    })

    it('should handle all identical values (variance=0)', async () => {
      const testData = [
        { value: 5 },
        { value: 5 },
        { value: 5 },
        { value: 5 }
      ]

      const mockPyodideResult = {
        mean: 5,
        median: 5,
        std: 0,
        variance: 0,
        min: 5,
        max: 5,
        q1: 5,
        q3: 5,
        iqr: 0,
        skewness: 0,
        kurtosis: 0,
        count: 4
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(result.data?.variance).toBe(0)
      expect(result.data?.std).toBe(0)
    })
  })

  describe('에러 케이스', () => {
    it('should fail with missing column parameter', async () => {
      const testData = [{ value: 10 }]

      const result = await descriptiveHandler(testData, {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('열')
    })

    it('should fail with invalid column parameter', async () => {
      const testData = [{ value: 10 }]

      const result = await descriptiveHandler(testData, { column: 123 })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should fail with non-existent column', async () => {
      const testData = [{ value: 10 }]

      const result = await descriptiveHandler(testData, { column: 'nonexistent' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('데이터')
    })

    it('should fail with empty data', async () => {
      const testData: unknown[] = []

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('데이터')
    })

    it('should fail with all non-numeric values', async () => {
      const testData = [
        { value: 'text' },
        { value: 'more text' },
        { value: 'not a number' }
      ]

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('숫자')
    })

    it('should handle Pyodide error', async () => {
      const testData = [{ value: 10 }]

      ;(mockContext.callWorkerMethod as jest.Mock).mockRejectedValue(
        new Error('Pyodide calculation failed')
      )

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('계산')
    })
  })

  describe('대용량 데이터', () => {
    it('should handle large dataset (n=1000)', async () => {
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        value: i + 1
      }))

      const mockPyodideResult = {
        mean: 500.5,
        median: 500.5,
        std: 288.82,
        variance: 83416.67,
        min: 1,
        max: 1000,
        q1: 250.75,
        q3: 750.25,
        iqr: 499.5,
        skewness: 0,
        kurtosis: -1.2,
        count: 1000
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(result.data?.count).toBe(1000)
      expect(result.data?.mean).toBeCloseTo(500.5, 1)
    })
  })
})
