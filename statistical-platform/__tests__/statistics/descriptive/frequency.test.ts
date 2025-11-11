/**
 * Frequency Analysis Tests
 * 빈도분석 (frequency) 메서드 단위 테스트
 */

import { createDescriptiveGroup } from '../../../lib/statistics/groups/descriptive.group'
import type { CalculatorContext } from '../../../lib/statistics/calculator-types'

describe('Frequency Analysis', () => {
  const mockContext: CalculatorContext = {
    callWorkerMethod: jest.fn()
  }

  const descriptiveGroup = createDescriptiveGroup(mockContext)
  const frequencyHandler = descriptiveGroup.handlers.frequency

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('기본 케이스 (정상 데이터)', () => {
    it('should calculate frequency distribution correctly', async () => {
      const testData = [
        { category: 'A' },
        { category: 'B' },
        { category: 'A' },
        { category: 'C' },
        { category: 'A' },
        { category: 'B' }
      ]

      const mockPyodideResult = {
        frequencies: {
          A: 3,
          B: 2,
          C: 1
        },
        percentages: {
          A: 50.0,
          B: 33.33,
          C: 16.67
        },
        total: 6
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        frequencies: expect.objectContaining({
          A: 3,
          B: 2,
          C: 1
        }),
        total: 6
      })
    })

    it('should handle numeric categories', async () => {
      const testData = [
        { score: 1 },
        { score: 2 },
        { score: 1 },
        { score: 3 },
        { score: 2 },
        { score: 1 }
      ]

      const mockPyodideResult = {
        frequencies: {
          '1': 3,
          '2': 2,
          '3': 1
        },
        percentages: {
          '1': 50.0,
          '2': 33.33,
          '3': 16.67
        },
        total: 6
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await frequencyHandler(testData, { column: 'score' })

      expect(result.success).toBe(true)
      expect(result.data?.total).toBe(6)
    })
  })

  describe('엣지 케이스', () => {
    it('should handle single category', async () => {
      const testData = [
        { category: 'A' },
        { category: 'A' },
        { category: 'A' }
      ]

      const mockPyodideResult = {
        frequencies: { A: 3 },
        percentages: { A: 100.0 },
        total: 3
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      expect(result.data?.frequencies).toEqual({ A: 3 })
      expect(result.data?.percentages.A).toBe(100.0)
    })

    it('should handle many categories (>10)', async () => {
      const testData = Array.from({ length: 50 }, (_, i) => ({
        category: `Cat${i % 15}`
      }))

      const mockFreq: Record<string, number> = {}
      for (let i = 0; i < 15; i++) {
        mockFreq[`Cat${i}`] = Math.floor(50 / 15) + (i < 50 % 15 ? 1 : 0)
      }

      const mockPyodideResult = {
        frequencies: mockFreq,
        percentages: Object.fromEntries(
          Object.entries(mockFreq).map(([k, v]) => [k, (v / 50) * 100])
        ),
        total: 50
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      expect(Object.keys(result.data?.frequencies || {}).length).toBe(15)
    })

    it('should handle missing values', async () => {
      const testData = [
        { category: 'A' },
        { category: null },
        { category: 'B' },
        { category: undefined },
        { category: 'A' }
      ]

      const mockPyodideResult = {
        frequencies: {
          A: 2,
          B: 1
        },
        percentages: {
          A: 66.67,
          B: 33.33
        },
        total: 3
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      expect(result.data?.total).toBe(3) // null/undefined 제외
    })

    it('should handle empty strings', async () => {
      const testData = [
        { category: 'A' },
        { category: '' },
        { category: 'B' },
        { category: '  ' },
        { category: 'A' }
      ]

      const mockPyodideResult = {
        frequencies: {
          A: 2,
          B: 1
        },
        percentages: {
          A: 66.67,
          B: 33.33
        },
        total: 3
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
    })
  })

  describe('에러 케이스', () => {
    it('should fail with missing column parameter', async () => {
      const testData = [{ category: 'A' }]

      const result = await frequencyHandler(testData, {})

      expect(result.success).toBe(false)
      expect(result.error).toContain('열')
    })

    it('should fail with empty data', async () => {
      const testData: unknown[] = []

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('데이터')
    })

    it('should fail with non-existent column', async () => {
      const testData = [{ category: 'A' }]

      const result = await frequencyHandler(testData, { column: 'nonexistent' })

      expect(result.success).toBe(false)
    })

    it('should handle Pyodide error', async () => {
      const testData = [{ category: 'A' }]

      ;(mockContext.callWorkerMethod as jest.Mock).mockRejectedValue(
        new Error('Pyodide calculation failed')
      )

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(false)
    })
  })

  describe('대용량 데이터', () => {
    it('should handle large dataset with many duplicates', async () => {
      const categories = ['A', 'B', 'C', 'D', 'E']
      const testData = Array.from({ length: 10000 }, (_, i) => ({
        category: categories[i % categories.length]
      }))

      const mockPyodideResult = {
        frequencies: {
          A: 2000,
          B: 2000,
          C: 2000,
          D: 2000,
          E: 2000
        },
        percentages: {
          A: 20.0,
          B: 20.0,
          C: 20.0,
          D: 20.0,
          E: 20.0
        },
        total: 10000
      }

      ;(mockContext.callWorkerMethod as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      expect(result.data?.total).toBe(10000)
    })
  })
})
