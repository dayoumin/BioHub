/**
 * Crosstab (Contingency Table) Tests
 * 교차표 (crosstab) 메서드 단위 테스트
 */

import { createDescriptiveGroup } from '../../../lib/statistics/groups/descriptive.group'
import type { CalculatorContext } from '../../../lib/statistics/calculator-types'
import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('Crosstab Analysis', () => {
  // Crosstab 핸들러는 PyodideCore를 사용하지 않음 (JavaScript로 직접 계산)
  const mockContext: CalculatorContext = {
    pyodideCore: {} as PyodideCoreService
  }

  const descriptiveGroup = createDescriptiveGroup(mockContext)
  const crosstabHandler = descriptiveGroup.handlers.crosstab

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

      // 실제 구현은 rowVariable, columnVariable 파라미터명 사용
      const result = await crosstabHandler(testData, {
        rowVariable: 'gender',
        columnVariable: 'preference'
      })

      expect(result.success).toBe(true)
      expect(result.data?.tables).toHaveLength(1)
      const table = result.data?.tables?.[0].data as Array<Record<string, unknown>>
      expect(table.length).toBeGreaterThan(0)
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

      const result = await crosstabHandler(testData, {
        rowVariable: 'age',
        columnVariable: 'region'
      })

      expect(result.success).toBe(true)
      const table = result.data?.tables?.[0].data as Array<Record<string, unknown>>
      expect(table.length).toBeGreaterThan(2) // 3 rows + 1 total row
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

      const result = await crosstabHandler(testData, {
        rowVariable: 'var1',
        columnVariable: 'var2'
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

      const result = await crosstabHandler(testData, {
        rowVariable: 'var1',
        columnVariable: 'var2'
      })

      expect(result.success).toBe(true)
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

      const result = await crosstabHandler(testData, {
        rowVariable: 'row',
        columnVariable: 'col'
      })

      expect(result.success).toBe(true)
    })
  })

  describe('에러 케이스', () => {
    it('should fail with missing rowVariable parameter', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      const result = await crosstabHandler(testData, { columnVariable: 'var2' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('변수')
    })

    it('should fail with missing columnVariable parameter', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      const result = await crosstabHandler(testData, { rowVariable: 'var1' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('변수')
    })

    it('should fail with same variable for row and column', async () => {
      const testData = [{ var1: 'A' }]

      const result = await crosstabHandler(testData, {
        rowVariable: 'var1',
        columnVariable: 'var1'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('달라야')
    })

    it('should fail with empty data', async () => {
      const testData: unknown[] = []

      const result = await crosstabHandler(testData, {
        rowVariable: 'var1',
        columnVariable: 'var2'
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('데이터')
    })

    it('should fail with non-existent row variable', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      const result = await crosstabHandler(testData, {
        rowVariable: 'nonexistent',
        columnVariable: 'var2'
      })

      expect(result.success).toBe(false)
    })

    it('should fail with non-existent column variable', async () => {
      const testData = [{ var1: 'A', var2: 'X' }]

      const result = await crosstabHandler(testData, {
        rowVariable: 'var1',
        columnVariable: 'nonexistent'
      })

      expect(result.success).toBe(false)
    })

    // Crosstab은 JavaScript로 직접 계산하므로 Pyodide 에러 테스트 불필요
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

      const result = await crosstabHandler(testData, {
        rowVariable: 'category1',
        columnVariable: 'category2'
      })

      expect(result.success).toBe(true)
    })
  })
})
