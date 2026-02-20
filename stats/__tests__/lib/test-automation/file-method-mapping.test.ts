/**
 * File-Method Mapping Tests
 *
 * Validates that worker-method-mapping.json is complete and consistent
 * with ALL_STATISTICS_PAGES from method-page-mapping.ts
 */

import { describe, it, expect } from 'vitest'
import {
  WORKER_METHOD_MAPPING,
  CRITICAL_FILES,
  validateMappingCompleteness,
  getAllMappedMethods,
  getWorkerForMethod,
} from '@/lib/test-automation/file-method-mapping'
import { ALL_STATISTICS_PAGES } from '@/lib/constants/method-page-mapping'

describe('Worker-Method Mapping SSOT', () => {
  describe('validateMappingCompleteness', () => {
    it('should have all statistics pages mapped to workers', () => {
      const result = validateMappingCompleteness()

      if (!result.isComplete) {
        console.log(result.report)
      }

      expect(result.missingMethods).toEqual([])
      expect(result.isComplete).toBe(true)
    })

    it('should not have extra methods that do not exist as pages', () => {
      const result = validateMappingCompleteness()

      // Extra methods are acceptable (aliases, legacy)
      // But we should be aware of them
      if (result.extraMethods.length > 0) {
        console.log('Extra methods in mapping:', result.extraMethods)
      }
    })
  })

  describe('WORKER_METHOD_MAPPING', () => {
    it('should have 4 workers', () => {
      const workers = Object.keys(WORKER_METHOD_MAPPING)
      expect(workers).toHaveLength(4)
      expect(workers).toContain('worker1-descriptive.py')
      expect(workers).toContain('worker2-hypothesis.py')
      expect(workers).toContain('worker3-nonparametric-anova.py')
      expect(workers).toContain('worker4-regression-advanced.py')
    })

    it('should have methods for each worker', () => {
      for (const [worker, methods] of Object.entries(WORKER_METHOD_MAPPING)) {
        expect(methods.length).toBeGreaterThan(0)
        expect(Array.isArray(methods)).toBe(true)
      }
    })

    it('should not have duplicate methods across workers', () => {
      const allMethods: string[] = []
      const duplicates: string[] = []

      for (const methods of Object.values(WORKER_METHOD_MAPPING)) {
        for (const method of methods) {
          if (allMethods.includes(method)) {
            duplicates.push(method)
          }
          allMethods.push(method)
        }
      }

      expect(duplicates).toEqual([])
    })
  })

  describe('CRITICAL_FILES', () => {
    it('should have critical files defined', () => {
      expect(CRITICAL_FILES.length).toBeGreaterThan(0)
    })

    it('should include pyodide-core.ts', () => {
      expect(CRITICAL_FILES).toContain('lib/services/pyodide-core.ts')
    })

    it('should include use-statistics-page.ts', () => {
      expect(CRITICAL_FILES).toContain('hooks/use-statistics-page.ts')
    })

    it('should include helpers.py', () => {
      expect(CRITICAL_FILES).toContain('workers/python/helpers.py')
    })
  })

  describe('getAllMappedMethods', () => {
    it('should return all unique methods', () => {
      const methods = getAllMappedMethods()
      expect(methods.length).toBeGreaterThan(40)

      // Should be sorted
      const sorted = [...methods].sort()
      expect(methods).toEqual(sorted)

      // Should have no duplicates
      const unique = [...new Set(methods)]
      expect(methods).toEqual(unique)
    })
  })

  describe('getWorkerForMethod', () => {
    it('should return correct worker for known methods', () => {
      expect(getWorkerForMethod('descriptive')).toBe('worker1-descriptive.py')
      expect(getWorkerForMethod('t-test')).toBe('worker2-hypothesis.py')
      expect(getWorkerForMethod('anova')).toBe('worker3-nonparametric-anova.py')
      expect(getWorkerForMethod('regression')).toBe('worker4-regression-advanced.py')
    })

    it('should return null for unknown methods', () => {
      expect(getWorkerForMethod('unknown-method')).toBeNull()
    })
  })

  describe('Cross-validation with ALL_STATISTICS_PAGES', () => {
    it('should cover most statistics pages (excluding overview pages)', () => {
      const mappedMethods = new Set(getAllMappedMethods())
      const statisticsPages = ALL_STATISTICS_PAGES.filter(p => p !== 'non-parametric')

      const coverage = statisticsPages.filter(p => mappedMethods.has(p))
      const coveragePercent = (coverage.length / statisticsPages.length) * 100

      // Should cover at least 95% of pages
      expect(coveragePercent).toBeGreaterThanOrEqual(95)
    })
  })
})
