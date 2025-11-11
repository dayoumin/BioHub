/**
 * Crosstab (Contingency Table) Tests
 * 교차표 (crosstab) 메서드 단위 테스트
 */

import { createDescriptiveGroup } from '../../../lib/statistics/groups/descriptive.group'
import type { CalculatorContext } from '../../../lib/statistics/calculator-types'
import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('Crosstab Analysis', () => {
  // Mock PyodideCore
  const mockPyodideCore = {
    crosstabAnalysis: jest.fn()
  } as unknown as PyodideCoreService

  const mockContext: CalculatorContext = {
    pyodideCore: mockPyodideCore
  }

  const descriptiveGroup = createDescriptiveGroup(mockContext)
  const crosstabHandler = descriptiveGroup.handlers.crosstab

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('기본 케이스 (정상 데이터)', () => {
    it('should create 2x2 contingency table correctly', async () => {
      const testData = [
        { gender: '남', preference: '좋음' },
        { gender: '여', preference: '좋음' },
        { gender: '남', preference: '나쁨' },
        { gender: '여', preference: '좋음' },
        { gender: '남', preference: '좋음' },
        { gender: '여', preference: '나쁨' }
      ]

      const mockPyodideResult = {
        table: {
          '남': { '좋음': 2, '나쁨': 1 },
          '여': { '좋음': 2, '나쁨': 1 }
        },
        rowTotals: { '남': 3, '여': 3 },
        colTotals: { '좋음': 4, '나쁨': 2 },
        total: 6,
        percentages: {
          '남': { '좋음': 33.33, '나쁨': 16.67 },
          '여': { '좋음': 33.33, '나쁨': 16.67 }
        }
      }

      ;(mockPyodideCore.crosstabAnalysis as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await crosstabHandler(testData, {
        rowVar: 'gender',
        colVar: 'preference'
      })

      expect(result.success).toBe(true)
      expect(mockPyodideCore.crosstabAnalysis).toHaveBeenCalledWith(
        ['남', '여', '남', '여', '남', '여'],
        ['좋음', '좋음', '나쁨', '좋음', '좋음', '나쁨']
      )
    })

    it('should handle 3x3 contingency table', async () => {
      const testData = [
        { age: '20대', region: '서울' },
        { age: '30대', region: '부산' },
        { age: '40대', region: '대구' },
        { age: '20대', region: '서울' },
        { age: '30대', region: '서울' },
        { age: '20대', region: '부산' }
      ]

      const mockPyodideResult = {
        table: {
          '20대': { '서울': 2, '부산': 1, '대구': 0 },
          '30대': { '서울': 1, '부산': 1, '대구': 0 },
          '40대': { '서울': 0, '부산': 0, '대구': 1 }
        },
        rowTotals: { '20대': 3, '30대': 2, '40대': 1 },
        colTotals: { '서울': 3, '부산': 2, '대구': 1 },
        total: 6,
        percentages: {
          '20대': { '서울': 33.33, '부산': 16.67, '대구': 0 },
          '30대': { '서울': 16.67, '부산': 16.67, '대구': 0 },
          '40대': { '서울': 0, '부산': 0, '대구': 16.67 }
        }
      }

      ;(mockPyodideCore.crosstabAnalysis as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await crosstabHandler(testData, {
        rowVar: 'age',
        colVar: 'region'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('엣지 케이스', () => {
    it('should handle unbalanced table', async () => {
      const testData = [
        { var1: 'A', var2: 'X' },
        { var1: 'A', var2: 'X' },
        { var1: 'A', var2: 'X' },
        { var1: 'B', var2: 'Y' }
      ]

      const mockPyodideResult = {
        table: {
          A: { X: 3, Y: 0 },
          B: { X: 0, Y: 1 }
        },
        rowTotals: { A: 3, B: 1 },
        colTotals: { X: 3, Y: 1 },
        total: 4,
        percentages: {
          A: { X: 75.0, Y: 0 },
          B: { X: 0, Y: 25.0 }
        }
      }

      ;(mockPyodideCore.crosstabAnalysis as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await crosstabHandler(testData, {
        rowVar: 'var1',
        colVar: 'var2'
      })

      expect(result.success).toBe(true)
    })

    it('should handle missing values', async () => {
      const testData = [
        { var1: 'A', var2: 'X' },
        { var1: null, var2: 'Y' },
        { var1: 'B', var2: null },
        { var1: 'A', var2: 'X' }
      ]

      const mockPyodideResult = {
        table: {
          A: { X: 2 }
        },
        rowTotals: { A: 2 },
        colTotals: { X: 2 },
        total: 2,
        percentages: {
          A: { X: 100.0 }
        }
      }

      ;(mockPyodideCore.crosstabAnalysis as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await crosstabHandler(testData, {
        rowVar: 'var1',
        colVar: 'var2'
      })

      expect(result.success).toBe(true)
      expect(mockPyodideCore.crosstabAnalysis).toHaveBeenCalledWith(['A', 'A'], ['X', 'X']) // null 제외
    })

    it('should handle large contingency table (5x5)', async () => {
      const testData: Array<{ row: string; col: string }> = []
      const rows = ['R1', 'R2', 'R3', 'R4', 'R5']
      const cols = ['C1', 'C2', 'C3', 'C4', 'C5']

      rows.forEach(r => {
        cols.forEach(c => {
          testData.push({ row: r, col: c })
        })
      })

      const mockTable: Record<string, Record<string, number>> = {}
      rows.forEach(r => {
        mockTable[r] = {}
        cols.forEach(c => {
          mockTable[r][c] = 1
        })
      })

      const mockPyodideResult = {
        table: mockTable,
        rowTotals: Object.fromEntries(rows.map(r => [r, 5])),
        colTotals: Object.fromEntries(cols.map(c => [c, 5])),
        total: 25,
        percentages: mockTable
      }

      ;(mockPyodideCore.crosstabAnalysis as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await crosstabHandler(testData, {
        rowVar: 'row',
        colVar: 'col'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('에러 케이스', () => {
    it('should fail with missing rowVar parameter', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      const result = await crosstabHandler(testData, { colVar: 'var2' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('변수')
    })

    it('should fail with missing colVar parameter', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      const result = await crosstabHandler(testData, { rowVar: 'var1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('변수')
    })

    it('should fail with same variable for row and column', async () => {
      const testData = [{ var1: 'A' }]

      const result = await crosstabHandler(testData, {
        rowVar: 'var1',
        colVar: 'var1'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('다른')
    })

    it('should fail with empty data', async () => {
      const testData: unknown[] = []

      const result = await crosstabHandler(testData, {
        rowVar: 'var1',
        colVar: 'var2'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('데이터')
    })

    it('should fail with non-existent row variable', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      const result = await crosstabHandler(testData, {
        rowVar: 'nonexistent',
        colVar: 'var2'
      })

      expect(result.success).toBe(false)
    })

    it('should fail with non-existent column variable', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      const result = await crosstabHandler(testData, {
        rowVar: 'var1',
        colVar: 'nonexistent'
      })

      expect(result.success).toBe(false)
    })

    it('should handle Pyodide error', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      ;(mockPyodideCore.crosstabAnalysis as jest.Mock).mockRejectedValue(
        new Error('Pyodide calculation failed')
      )

      const result = await crosstabHandler(testData, {
        rowVar: 'var1',
        colVar: 'var2'
      })

      expect(result.success).toBe(false)
    })
  })

  describe('대용량 데이터', () => {
    it('should handle large dataset (1000 rows)', async () => {
      const testData = Array.from({ length: 1000 }, (_, i) => ({
        category1: `Cat${i % 10}`,
        category2: `Type${i % 5}`
      }))

      const mockTable: Record<string, Record<string, number>> = {}
      for (let i = 0; i < 10; i++) {
        mockTable[`Cat${i}`] = {}
        for (let j = 0; j < 5; j++) {
          mockTable[`Cat${i}`][`Type${j}`] = 20
        }
      }

      const mockPyodideResult = {
        table: mockTable,
        rowTotals: Object.fromEntries(
          Array.from({ length: 10 }, (_, i) => [`Cat${i}`, 100])
        ),
        colTotals: Object.fromEntries(
          Array.from({ length: 5 }, (_, i) => [`Type${i}`, 200])
        ),
        total: 1000,
        percentages: mockTable
      }

      ;(mockPyodideCore.crosstabAnalysis as jest.Mock).mockResolvedValue(mockPyodideResult)

      const result = await crosstabHandler(testData, {
        rowVar: 'category1',
        colVar: 'category2'
      })

      expect(result.success).toBe(true)
    })
  })
})
