/**
 * Frequency Analysis Tests
 * 빈도분석 (frequency) 메서드 단위 테스트
 */

import { createDescriptiveGroup } from '../../../lib/statistics/groups/descriptive.group'
import type { CalculatorContext } from '../../../lib/statistics/calculator-types'
import type { PyodideCoreService } from '@/lib/services/pyodide/core/pyodide-core.service'

describe('Frequency Analysis', () => {
  // Frequency 핸들러는 PyodideCore를 사용하지 않음 (JavaScript로 직접 계산)
  const mockContext: CalculatorContext = {
    pyodideCore: {} as PyodideCoreService
  }

  const descriptiveGroup = createDescriptiveGroup(mockContext)
  const frequencyHandler = descriptiveGroup.handlers.frequency

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

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toBeDefined()
      expect(result.data?.tables).toHaveLength(1)
      // 빈도표에 A가 3번, B가 2번, C가 1번 나타나는지 확인
      const freqTable = result.data?.tables?.[0].data as Array<Record<string, unknown>>
      expect(freqTable).toHaveLength(3)
      expect(freqTable.find(row => row['값'] === 'A')?.['빈도']).toBe(3)
      expect(freqTable.find(row => row['값'] === 'B')?.['빈도']).toBe(2)
      expect(freqTable.find(row => row['값'] === 'C')?.['빈도']).toBe(1)
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

      const result = await frequencyHandler(testData, { column: 'score' })

      expect(result.success).toBe(true)
      const freqTable = result.data?.tables?.[0].data as Array<Record<string, unknown>>
      expect(freqTable.find(row => row['값'] === '1')?.['빈도']).toBe(3)
    })
  })

  describe('엣지 케이스', () => {
    it('should handle single category', async () => {
      const testData = [
        { category: 'A' },
        { category: 'A' },
        { category: 'A' }
      ]

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      const freqTable = result.data?.tables?.[0].data as Array<Record<string, unknown>>
      expect(freqTable).toHaveLength(1)
      expect(freqTable[0]['빈도']).toBe(3)
    })

    it('should handle many categories (>10)', async () => {
      const testData = Array.from({ length: 50 }, (_, i) => ({
        category: `Cat${i % 15}`
      }))

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      const freqTable = result.data?.tables?.[0].data as Array<Record<string, unknown>>
      expect(freqTable).toHaveLength(15)
    })

    it('should handle missing values', async () => {
      const testData = [
        { category: 'A' },
        { category: null },
        { category: 'B' },
        { category: undefined },
        { category: 'A' }
      ]

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      const freqTable = result.data?.tables?.[0].data as Array<Record<string, unknown>>
      expect(freqTable).toHaveLength(2) // null/undefined 제외
      expect(freqTable.find(row => row['값'] === 'A')?.['빈도']).toBe(2)
      expect(freqTable.find(row => row['값'] === 'B')?.['빈도']).toBe(1)
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

    // Frequency는 JavaScript로 직접 계산하므로 Pyodide 에러 테스트 불필요
  })

  describe('대용량 데이터', () => {
    it('should handle large dataset with many duplicates', async () => {
      const categories = ['A', 'B', 'C', 'D', 'E']
      const testData = Array.from({ length: 10000 }, (_, i) => ({
        category: categories[i % categories.length]
      }))

      const result = await frequencyHandler(testData, { column: 'category' })

      expect(result.success).toBe(true)
      const freqTable = result.data?.tables?.[0].data as Array<Record<string, unknown>>
      expect(freqTable).toHaveLength(5)
      expect(freqTable.find(row => row['값'] === 'A')?.['빈도']).toBe(2000)
    })
  })
})
