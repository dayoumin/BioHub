/**
 * Group Module Loading 테스트
 *
 * Day 2-3 검증:
 * 1. 6개 그룹 파일이 정상적으로 로드되는지 확인
 * 2. 각 그룹이 선언한 메서드 개수가 일치하는지 확인
 * 3. 동적 import가 정상 작동하는지 확인
 */

import { describe, it, expect } from '@jest/globals'

describe('Group Module Loading - Day 2-3', () => {
  describe('Descriptive Group', () => {
    it('모듈을 동적으로 로드할 수 있어야 함', async () => {
      const { createDescriptiveGroup } = await import('@/lib/statistics/groups/descriptive.group')
      expect(createDescriptiveGroup).toBeDefined()
      expect(typeof createDescriptiveGroup).toBe('function')
    })

    it('10개 메서드를 포함해야 함', async () => {
      const { createDescriptiveGroup } = await import('@/lib/statistics/groups/descriptive.group')
      const mockContext = { pyodideService: {} } as any
      const group = createDescriptiveGroup(mockContext)

      expect(group.id).toBe('descriptive')
      expect(group.methods).toHaveLength(10)
      expect(Object.keys(group.handlers)).toHaveLength(10)
    })

    it('모든 핸들러가 함수여야 함', async () => {
      const { createDescriptiveGroup } = await import('@/lib/statistics/groups/descriptive.group')
      const mockContext = { pyodideService: {} } as any
      const group = createDescriptiveGroup(mockContext)

      Object.values(group.handlers).forEach(handler => {
        expect(typeof handler).toBe('function')
      })
    })
  })

  describe('Hypothesis Group', () => {
    it('모듈을 동적으로 로드할 수 있어야 함', async () => {
      const { createHypothesisGroup } = await import('@/lib/statistics/groups/hypothesis.group')
      expect(createHypothesisGroup).toBeDefined()
    })

    it('8개 메서드를 포함해야 함', async () => {
      const { createHypothesisGroup } = await import('@/lib/statistics/groups/hypothesis.group')
      const mockContext = { pyodideService: {} } as any
      const group = createHypothesisGroup(mockContext)

      expect(group.id).toBe('hypothesis')
      expect(group.methods).toHaveLength(8)
      expect(Object.keys(group.handlers)).toHaveLength(8)
    })
  })

  describe('Regression Group', () => {
    it('모듈을 동적으로 로드할 수 있어야 함', async () => {
      const { createRegressionGroup } = await import('@/lib/statistics/groups/regression.group')
      expect(createRegressionGroup).toBeDefined()
    })

    it('12개 메서드를 포함해야 함', async () => {
      const { createRegressionGroup } = await import('@/lib/statistics/groups/regression.group')
      const mockContext = { pyodideService: {} } as any
      const group = createRegressionGroup(mockContext)

      expect(group.id).toBe('regression')
      expect(group.methods).toHaveLength(12)
      expect(Object.keys(group.handlers)).toHaveLength(12)
    })
  })

  describe('Nonparametric Group', () => {
    it('모듈을 동적으로 로드할 수 있어야 함', async () => {
      const { createNonparametricGroup } = await import('@/lib/statistics/groups/nonparametric.group')
      expect(createNonparametricGroup).toBeDefined()
    })

    it('9개 메서드를 포함해야 함', async () => {
      const { createNonparametricGroup } = await import('@/lib/statistics/groups/nonparametric.group')
      const mockContext = { pyodideService: {} } as any
      const group = createNonparametricGroup(mockContext)

      expect(group.id).toBe('nonparametric')
      expect(group.methods).toHaveLength(9)
      expect(Object.keys(group.handlers)).toHaveLength(9)
    })
  })

  describe('ANOVA Group', () => {
    it('모듈을 동적으로 로드할 수 있어야 함', async () => {
      const { createAnovaGroup } = await import('@/lib/statistics/groups/anova.group')
      expect(createAnovaGroup).toBeDefined()
    })

    it('9개 메서드를 포함해야 함', async () => {
      const { createAnovaGroup } = await import('@/lib/statistics/groups/anova.group')
      const mockContext = { pyodideService: {} } as any
      const group = createAnovaGroup(mockContext)

      expect(group.id).toBe('anova')
      expect(group.methods).toHaveLength(9)
      expect(Object.keys(group.handlers)).toHaveLength(9)
    })
  })

  describe('Advanced Group', () => {
    it('모듈을 동적으로 로드할 수 있어야 함', async () => {
      const { createAdvancedGroup } = await import('@/lib/statistics/groups/advanced.group')
      expect(createAdvancedGroup).toBeDefined()
    })

    it('12개 메서드를 포함해야 함', async () => {
      const { createAdvancedGroup } = await import('@/lib/statistics/groups/advanced.group')
      const mockContext = { pyodideService: {} } as any
      const group = createAdvancedGroup(mockContext)

      expect(group.id).toBe('advanced')
      expect(group.methods).toHaveLength(12)
      expect(Object.keys(group.handlers)).toHaveLength(12)
    })
  })

  describe('전체 통합 검증', () => {
    it('6개 그룹의 총 메서드 수는 60개', async () => {
      const { createDescriptiveGroup } = await import('@/lib/statistics/groups/descriptive.group')
      const { createHypothesisGroup } = await import('@/lib/statistics/groups/hypothesis.group')
      const { createRegressionGroup } = await import('@/lib/statistics/groups/regression.group')
      const { createNonparametricGroup } = await import('@/lib/statistics/groups/nonparametric.group')
      const { createAnovaGroup } = await import('@/lib/statistics/groups/anova.group')
      const { createAdvancedGroup } = await import('@/lib/statistics/groups/advanced.group')

      const mockContext = { pyodideService: {} } as any

      const groups = [
        createDescriptiveGroup(mockContext),
        createHypothesisGroup(mockContext),
        createRegressionGroup(mockContext),
        createNonparametricGroup(mockContext),
        createAnovaGroup(mockContext),
        createAdvancedGroup(mockContext)
      ]

      const totalMethods = groups.reduce((sum, group) => sum + group.methods.length, 0)
      expect(totalMethods).toBe(60) // 10 + 8 + 12 + 9 + 9 + 12
    })

    it('모든 그룹 ID가 고유해야 함', async () => {
      const { createDescriptiveGroup } = await import('@/lib/statistics/groups/descriptive.group')
      const { createHypothesisGroup } = await import('@/lib/statistics/groups/hypothesis.group')
      const { createRegressionGroup } = await import('@/lib/statistics/groups/regression.group')
      const { createNonparametricGroup } = await import('@/lib/statistics/groups/nonparametric.group')
      const { createAnovaGroup } = await import('@/lib/statistics/groups/anova.group')
      const { createAdvancedGroup } = await import('@/lib/statistics/groups/advanced.group')

      const mockContext = { pyodideService: {} } as any

      const groups = [
        createDescriptiveGroup(mockContext),
        createHypothesisGroup(mockContext),
        createRegressionGroup(mockContext),
        createNonparametricGroup(mockContext),
        createAnovaGroup(mockContext),
        createAdvancedGroup(mockContext)
      ]

      const groupIds = groups.map(g => g.id)
      const uniqueIds = new Set(groupIds)
      expect(uniqueIds.size).toBe(6)
    })
  })
})
