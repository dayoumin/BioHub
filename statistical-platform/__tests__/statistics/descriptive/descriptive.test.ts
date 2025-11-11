/**
 * Descriptive Statistics Tests
 * 기술통계량 (descriptive) 메서드 단위 테스트
 */

import { createDescriptiveGroup } from '../../../lib/statistics/groups/descriptive.group'
import type { CalculatorContext } from '../../../lib/statistics/calculator-types'
import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('Descriptive Statistics', () => {
  // Mock PyodideCore
  const mockPyodideCore = {
    descriptiveStats: jest.fn(),
    hasStatisticFields: jest.fn(),
    getStatisticValue: jest.fn()
  } as unknown as PyodideCoreService

  const mockContext: CalculatorContext = {
    pyodideCore: mockPyodideCore
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

      ;(mockPyodideCore.descriptiveStats as jest.Mock).mockResolvedValue(mockPyodideResult)
      ;(mockPyodideCore.hasStatisticFields as jest.Mock).mockReturnValue(true)
      ;(mockPyodideCore.getStatisticValue as jest.Mock).mockImplementation((result: unknown, field: string) => {
        const r = result as Record<string, number>
        return r[field]
      })

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(mockPyodideCore.descriptiveStats).toHaveBeenCalledWith([10, 20, 30, 40, 50])
      expect(result.data).toBeDefined()
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

      ;(mockPyodideCore.descriptiveStats as jest.Mock).mockResolvedValue(mockPyodideResult)
      ;(mockPyodideCore.hasStatisticFields as jest.Mock).mockReturnValue(true)
      ;(mockPyodideCore.getStatisticValue as jest.Mock).mockImplementation((result: unknown, field: string) => {
        const r = result as Record<string, number>
        return r[field]
      })

      const result = await descriptiveHandler(testData, { column: 'score' })

      expect(result.success).toBe(true)
      expect(mockPyodideCore.descriptiveStats).toHaveBeenCalledWith([85.5, 90.2, 78.8, 92.1, 88.4])
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

      ;(mockPyodideCore.descriptiveStats as jest.Mock).mockResolvedValue(mockPyodideResult)
      ;(mockPyodideCore.hasStatisticFields as jest.Mock).mockReturnValue(true)
      ;(mockPyodideCore.getStatisticValue as jest.Mock).mockImplementation((result: unknown, field: string) => {
        const r = result as Record<string, number>
        return r[field]
      })

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
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

      ;(mockPyodideCore.descriptiveStats as jest.Mock).mockResolvedValue(mockPyodideResult)
      ;(mockPyodideCore.hasStatisticFields as jest.Mock).mockReturnValue(true)
      ;(mockPyodideCore.getStatisticValue as jest.Mock).mockImplementation((result: unknown, field: string) => {
        const r = result as Record<string, number>
        return r[field]
      })

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(mockPyodideCore.descriptiveStats).toHaveBeenCalledWith([10, 30, 50]) // null/undefined 제외
    })
  })

  describe('에러 케이스', () => {
    it('should fail with missing column parameter', async () => {
      const testData = [{ value: 10 }]

      const result = await descriptiveHandler(testData, {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('열')
    })

    it('should fail with empty data', async () => {
      const testData: unknown[] = []

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('데이터')
    })

    it('should fail with non-existent column', async () => {
      const testData = [{ value: 10 }]

      const result = await descriptiveHandler(testData, { column: 'nonexistent' })

      expect(result.success).toBe(false)
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
      const testData = [{ value: 10 }, { value: 20 }]

      ;(mockPyodideCore.descriptiveStats as jest.Mock).mockRejectedValue(
        new Error('Pyodide calculation failed')
      )

      // 에러가 발생하면 Promise가 reject됩니다 (handler에 try-catch 없음)
      await expect(descriptiveHandler(testData, { column: 'value' })).rejects.toThrow('Pyodide calculation failed')
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

      ;(mockPyodideCore.descriptiveStats as jest.Mock).mockResolvedValue(mockPyodideResult)
      ;(mockPyodideCore.hasStatisticFields as jest.Mock).mockReturnValue(true)
      ;(mockPyodideCore.getStatisticValue as jest.Mock).mockImplementation((result: unknown, field: string) => {
        const r = result as Record<string, number>
        return r[field]
      })

      const result = await descriptiveHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
    })
  })
})
