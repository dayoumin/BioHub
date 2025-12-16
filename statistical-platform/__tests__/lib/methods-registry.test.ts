/**
 * Methods Registry 테스트
 *
 * Single Source of Truth 검증
 */

import {
  getWorkerForMethod,
  getMethodDefinition,
  getWorkerMethods,
  methodExists,
  getAllMethods,
  getRegistryStats,
  methodsRegistry
} from '@/lib/constants/methods-registry.types'

describe('Methods Registry', () => {
  describe('getWorkerForMethod', () => {
    it('Worker 1 메서드를 올바르게 찾아야 함', () => {
      expect(getWorkerForMethod('descriptive_stats')).toBe(1)
      expect(getWorkerForMethod('normality_test')).toBe(1)
      expect(getWorkerForMethod('cronbach_alpha')).toBe(1)
    })

    it('Worker 2 메서드를 올바르게 찾아야 함', () => {
      expect(getWorkerForMethod('t_test_two_sample')).toBe(2)
      expect(getWorkerForMethod('chi_square_test')).toBe(2)
      expect(getWorkerForMethod('correlation_test')).toBe(2)
    })

    it('Worker 3 메서드를 올바르게 찾아야 함', () => {
      expect(getWorkerForMethod('mann_whitney_test')).toBe(3)
      expect(getWorkerForMethod('one_way_anova')).toBe(3)
      expect(getWorkerForMethod('tukey_hsd')).toBe(3)
    })

    it('Worker 4 메서드를 올바르게 찾아야 함', () => {
      expect(getWorkerForMethod('linear_regression')).toBe(4)
      expect(getWorkerForMethod('pca_analysis')).toBe(4)
      expect(getWorkerForMethod('cluster_analysis')).toBe(4)
    })

    it('존재하지 않는 메서드는 null 반환', () => {
      expect(getWorkerForMethod('non_existent_method')).toBeNull()
      expect(getWorkerForMethod('')).toBeNull()
    })
  })

  describe('getMethodDefinition', () => {
    it('메서드 정의를 올바르게 반환해야 함', () => {
      const def = getMethodDefinition('t_test_two_sample')
      expect(def).not.toBeNull()
      expect(def?.params).toContain('group1')
      expect(def?.params).toContain('group2')
      expect(def?.returns).toContain('pValue')
      expect(def?.description).toBe('독립표본 t-검정')
    })

    it('옵셔널 파라미터를 포함해야 함', () => {
      const def = getMethodDefinition('t_test_two_sample')
      expect(def?.params).toContain('equalVar?')
    })

    it('존재하지 않는 메서드는 null 반환', () => {
      expect(getMethodDefinition('non_existent')).toBeNull()
    })
  })

  describe('getWorkerMethods', () => {
    it('Worker 1의 모든 메서드를 반환해야 함', () => {
      const methods = getWorkerMethods(1)
      expect(methods).toContain('descriptive_stats')
      expect(methods).toContain('normality_test')
      expect(methods.length).toBeGreaterThan(5)
    })

    it('Worker 3의 모든 메서드를 반환해야 함', () => {
      const methods = getWorkerMethods(3)
      expect(methods).toContain('one_way_anova')
      expect(methods).toContain('tukey_hsd')
      expect(methods).toContain('mann_whitney_test')
    })
  })

  describe('methodExists', () => {
    it('존재하는 메서드는 true 반환', () => {
      expect(methodExists('descriptive_stats')).toBe(true)
      expect(methodExists('t_test_two_sample')).toBe(true)
      expect(methodExists('one_way_anova')).toBe(true)
      expect(methodExists('linear_regression')).toBe(true)
    })

    it('존재하지 않는 메서드는 false 반환', () => {
      expect(methodExists('fake_method')).toBe(false)
      expect(methodExists('')).toBe(false)
    })
  })

  describe('getAllMethods', () => {
    it('모든 메서드를 반환해야 함', () => {
      const all = getAllMethods()
      expect(all.length).toBeGreaterThan(40)

      // Worker 1 메서드 포함 확인
      expect(all.some(m => m.methodName === 'descriptive_stats' && m.workerNum === 1)).toBe(true)

      // Worker 4 메서드 포함 확인
      expect(all.some(m => m.methodName === 'pca_analysis' && m.workerNum === 4)).toBe(true)
    })

    it('각 메서드에 definition이 있어야 함', () => {
      const all = getAllMethods()
      for (const method of all) {
        expect(method.definition).toBeDefined()
        expect(method.definition.params).toBeDefined()
        expect(method.definition.returns).toBeDefined()
        expect(method.definition.description).toBeDefined()
      }
    })
  })

  describe('getRegistryStats', () => {
    it('통계를 올바르게 계산해야 함', () => {
      const stats = getRegistryStats()
      expect(stats.totalMethods).toBeGreaterThan(40)
      expect(stats.methodsByWorker[1]).toBeGreaterThan(5)
      expect(stats.methodsByWorker[2]).toBeGreaterThan(5)
      expect(stats.methodsByWorker[3]).toBeGreaterThan(10)
      expect(stats.methodsByWorker[4]).toBeGreaterThan(10)

      // 합계 검증
      const sum = stats.methodsByWorker[1] + stats.methodsByWorker[2] +
                  stats.methodsByWorker[3] + stats.methodsByWorker[4]
      expect(sum).toBe(stats.totalMethods)
    })
  })

  describe('레지스트리 구조 검증', () => {
    it('모든 Worker가 필수 필드를 가져야 함', () => {
      for (const workerKey of ['worker1', 'worker2', 'worker3', 'worker4'] as const) {
        const worker = methodsRegistry[workerKey]
        expect(worker.name).toBeDefined()
        expect(worker.description).toBeDefined()
        expect(worker.packages).toBeDefined()
        expect(worker.methods).toBeDefined()
        expect(Array.isArray(worker.packages)).toBe(true)
      }
    })

    it('모든 메서드가 필수 필드를 가져야 함', () => {
      const all = getAllMethods()
      for (const { methodName, definition } of all) {
        expect(Array.isArray(definition.params)).toBe(true)
        expect(Array.isArray(definition.returns)).toBe(true)
        expect(typeof definition.description).toBe('string')
        expect(definition.description.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Python Worker 파일과의 일치성', () => {
    // 이 테스트는 실제 Python 파일과의 동기화를 검증
    // worker-function-mapping.test.ts와 연계

    it('주요 메서드가 레지스트리에 등록되어 있어야 함', () => {
      // Worker 1
      expect(methodExists('descriptive_stats')).toBe(true)
      expect(methodExists('normality_test')).toBe(true)
      expect(methodExists('crosstab_analysis')).toBe(true)

      // Worker 2
      expect(methodExists('t_test_two_sample')).toBe(true)
      expect(methodExists('chi_square_test')).toBe(true)
      expect(methodExists('binomial_test')).toBe(true)

      // Worker 3
      expect(methodExists('one_way_anova')).toBe(true)
      expect(methodExists('two_way_anova')).toBe(true)
      expect(methodExists('mcnemar_test')).toBe(true)

      // Worker 4
      expect(methodExists('linear_regression')).toBe(true)
      expect(methodExists('multiple_regression')).toBe(true)
      expect(methodExists('cox_regression')).toBe(true)
    })
  })
})
