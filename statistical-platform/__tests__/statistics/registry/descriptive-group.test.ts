/**
 * Descriptive Group 테스트
 *
 * 리팩토링 후 mean, median, mode 핸들러 검증
 */

import { createDescriptiveGroup } from '@/lib/statistics/groups/descriptive.group'
import type { CalculatorContext } from '@/lib/statistics/calculator-types'
import type { PyodideStatisticsService } from '@/lib/services/pyodide-statistics'

describe('Descriptive Group - Refactored Handlers', () => {
  let mockPyodideService: jest.Mocked<PyodideStatisticsService>
  let context: CalculatorContext

  beforeEach(() => {
    // Mock PyodideStatisticsService
    mockPyodideService = {
      descriptiveStats: jest.fn(),
      shapiroWilkTest: jest.fn(),
      outlierDetection: jest.fn(),
      oneSampleProportionTest: jest.fn(),
      cronbachAlpha: jest.fn(),
    } as any

    context = {
      pyodideService: mockPyodideService,
    }
  })

  describe('Mean Handler', () => {
    it('should calculate mean using descriptiveStats', async () => {
      // Arrange
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const testData = [
        { age: 25 },
        { age: 30 },
        { age: 35 },
        { age: 40 },
      ]

      mockPyodideService.descriptiveStats.mockResolvedValue({
        mean: 32.5,
        median: 32.5,
        std: 6.455,
        min: 25,
        max: 40,
        q1: 27.5,
        q3: 37.5,
        skewness: 0,
        kurtosis: -1.2,
        n: 4,
        variance: 41.667,
        iqr: 10,
      })

      // Act
      const result = await meanHandler(testData, { column: 'age' })

      // Assert
      expect(result.success).toBe(true)
      expect(result.data?.metrics).toEqual([
        { name: '표본 크기', value: 4 },
        { name: '평균', value: '32.5000' },
      ])
      expect(result.data?.interpretation).toContain('age의 평균은 32.50입니다')

      // Verify Pyodide 호출
      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledWith([25, 30, 35, 40])
    })

    it('should handle invalid column parameter', async () => {
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const result = await meanHandler([], {})

      expect(result.success).toBe(false)
      // 타입 안전성 강화로 '파라미터가 잘못되었습니다' 먼저 체크됨
      expect(result.error).toBe('파라미터가 잘못되었습니다')
    })

    it('should handle empty data', async () => {
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const result = await meanHandler([], { column: 'age' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('유효한 숫자 데이터가 없습니다')
    })

    it('should handle non-numeric values', async () => {
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const testData = [
        { age: 'invalid' },
        { age: null },
        { age: undefined },
      ]

      const result = await meanHandler(testData, { column: 'age' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('유효한 숫자 데이터가 없습니다')
    })

    it('should parse string numbers', async () => {
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const testData = [
        { age: '25' },
        { age: '30' },
        { age: '35' },
      ]

      mockPyodideService.descriptiveStats.mockResolvedValue({
        mean: 30,
        median: 30,
        std: 5,
        min: 25,
        max: 35,
        q1: 27.5,
        q3: 32.5,
        skewness: 0,
        kurtosis: -1.5,
        n: 3,
        variance: 25,
        iqr: 5,
      })

      const result = await meanHandler(testData, { column: 'age' })

      expect(result.success).toBe(true)
      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledWith([25, 30, 35])
    })
  })

  describe('Median Handler', () => {
    it('should calculate median using descriptiveStats', async () => {
      const group = createDescriptiveGroup(context)
      const medianHandler = group.handlers.median

      const testData = [
        { score: 10 },
        { score: 20 },
        { score: 30 },
        { score: 40 },
        { score: 50 },
      ]

      mockPyodideService.descriptiveStats.mockResolvedValue({
        mean: 30,
        median: 30,
        std: 15.811,
        min: 10,
        max: 50,
        q1: 20,
        q3: 40,
        skewness: 0,
        kurtosis: -1.2,
        n: 5,
        variance: 250,
        iqr: 20,
      })

      const result = await medianHandler(testData, { column: 'score' })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toEqual([
        { name: '표본 크기', value: 5 },
        { name: '중앙값', value: '30.0000' },
      ])
      expect(result.data?.interpretation).toContain('score의 중앙값은 30.00입니다')

      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledWith([10, 20, 30, 40, 50])
    })
  })

  describe('Mode Handler', () => {
    it('should calculate mode using descriptiveStats and frequency map', async () => {
      const group = createDescriptiveGroup(context)
      const modeHandler = group.handlers.mode

      const testData = [
        { value: 10 },
        { value: 20 },
        { value: 20 },
        { value: 30 },
        { value: 20 },
      ]

      mockPyodideService.descriptiveStats.mockResolvedValue({
        mean: 20,
        median: 20,
        std: 7.071,
        min: 10,
        max: 30,
        q1: 20,
        q3: 20,
        skewness: 0,
        kurtosis: -1.5,
        n: 5,
        variance: 50,
        iqr: 0,
      })

      const result = await modeHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      expect(result.data?.metrics).toEqual([
        { name: '표본 크기', value: 5 },
        { name: '최빈값', value: '20.0000' },
        { name: '설명', value: 'SciPy stats.mode() 사용' },
      ])
      expect(result.data?.interpretation).toContain('SciPy를 통해 계산했습니다')

      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledWith([10, 20, 20, 30, 20])
    })
  })

  describe('extractNumericValues utility', () => {
    it('should extract numeric values correctly', async () => {
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const testData = [
        { value: 10 },
        { value: '20' },
        { value: 30.5 },
        { value: 'invalid' },
        { value: null },
        { value: undefined },
        { value: NaN },
      ]

      mockPyodideService.descriptiveStats.mockResolvedValue({
        mean: 20.167,
        median: 20,
        std: 10.5,
        min: 10,
        max: 30.5,
        q1: 15,
        q3: 25.25,
        skewness: 0.1,
        kurtosis: -1.5,
        n: 3,
        variance: 110.25,
        iqr: 10.25,
      })

      const result = await meanHandler(testData, { column: 'value' })

      expect(result.success).toBe(true)
      // Should extract: 10, 20, 30.5 (3 valid values)
      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledWith([10, 20, 30.5])
    })
  })

  describe('Type Safety', () => {
    it('should reject invalid params type', async () => {
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const result = await meanHandler([], null)

      expect(result.success).toBe(false)
      expect(result.error).toBe('파라미터가 잘못되었습니다')
    })

    it('should reject non-string column', async () => {
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const result = await meanHandler([], { column: 123 })

      expect(result.success).toBe(false)
      expect(result.error).toBe('분석할 열을 선택하세요')
    })

    it('should handle non-array data gracefully', async () => {
      const group = createDescriptiveGroup(context)
      const meanHandler = group.handlers.mean

      const result = await meanHandler({} as any, { column: 'age' })

      expect(result.success).toBe(false)
      expect(result.error).toBe('유효한 숫자 데이터가 없습니다')
    })
  })

  describe('Integration with descriptiveStats', () => {
    it('should use same Pyodide call for all three handlers', async () => {
      const group = createDescriptiveGroup(context)

      const testData = [{ x: 10 }, { x: 20 }, { x: 30 }]

      const mockResult = {
        mean: 20,
        median: 20,
        std: 10,
        min: 10,
        max: 30,
        q1: 15,
        q3: 25,
        skewness: 0,
        kurtosis: -1.5,
        n: 3,
        variance: 100,
        iqr: 10,
      }

      mockPyodideService.descriptiveStats.mockResolvedValue(mockResult)

      // Call mean
      await group.handlers.mean(testData, { column: 'x' })
      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledTimes(1)

      // Call median
      mockPyodideService.descriptiveStats.mockClear()
      mockPyodideService.descriptiveStats.mockResolvedValue(mockResult)
      await group.handlers.median(testData, { column: 'x' })
      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledTimes(1)

      // Call mode
      mockPyodideService.descriptiveStats.mockClear()
      mockPyodideService.descriptiveStats.mockResolvedValue(mockResult)
      await group.handlers.mode(testData, { column: 'x' })
      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledTimes(1)

      // All should use the same function
      expect(mockPyodideService.descriptiveStats).toHaveBeenCalledWith([10, 20, 30])
    })
  })
})
