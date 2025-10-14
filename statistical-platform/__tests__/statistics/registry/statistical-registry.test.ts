/**
 * StatisticalRegistry 테스트
 *
 * Day 1 검증:
 * 1. 메타데이터 50개 메서드 확인
 * 2. Registry 동작 확인 (그룹 로딩은 Day 2-3 이후)
 * 3. 사용량 통계 확인
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { StatisticalRegistry } from '@/lib/statistics/registry/statistical-registry'
import { METHOD_METADATA, GROUP_METHODS } from '@/lib/statistics/registry/method-metadata'

describe('StatisticalRegistry - Day 1', () => {
  let registry: StatisticalRegistry

  beforeEach(() => {
    registry = new StatisticalRegistry()
  })

  describe('메타데이터 검증', () => {
    it('60개 메서드 메타데이터가 정의되어 있어야 함', () => {
      const methodIds = Object.keys(METHOD_METADATA)
      expect(methodIds).toHaveLength(60)
    })

    it('모든 메서드가 그룹에 속해야 함', () => {
      const methodIds = Object.keys(METHOD_METADATA)
      methodIds.forEach(methodId => {
        const metadata = METHOD_METADATA[methodId]
        expect(metadata.group).toBeDefined()
        expect(['descriptive', 'hypothesis', 'regression', 'nonparametric', 'anova', 'advanced'])
          .toContain(metadata.group)
      })
    })

    it('모든 메서드가 의존성 패키지를 명시해야 함', () => {
      const methodIds = Object.keys(METHOD_METADATA)
      methodIds.forEach(methodId => {
        const metadata = METHOD_METADATA[methodId]
        expect(metadata.deps).toBeDefined()
        expect(metadata.deps.length).toBeGreaterThan(0)
      })
    })

    it('Descriptive 그룹은 10개 메서드', () => {
      expect(GROUP_METHODS.descriptive).toHaveLength(10)
    })

    it('Hypothesis 그룹은 8개 메서드', () => {
      expect(GROUP_METHODS.hypothesis).toHaveLength(8)
    })

    it('Regression 그룹은 12개 메서드', () => {
      expect(GROUP_METHODS.regression).toHaveLength(12)
    })

    it('Nonparametric 그룹은 9개 메서드', () => {
      expect(GROUP_METHODS.nonparametric).toHaveLength(9)
    })

    it('ANOVA 그룹은 9개 메서드', () => {
      expect(GROUP_METHODS.anova).toHaveLength(9)
    })

    it('Advanced 그룹은 12개 메서드', () => {
      expect(GROUP_METHODS.advanced).toHaveLength(12)
    })
  })

  describe('Registry 기본 동작', () => {
    it('Registry 인스턴스 생성 가능', () => {
      expect(registry).toBeInstanceOf(StatisticalRegistry)
    })

    it('초기 상태에서 로드된 그룹이 없어야 함', () => {
      expect(registry.getLoadedGroups()).toHaveLength(0)
    })

    it('알 수 없는 메서드 실행 시 에러 반환', async () => {
      const result = await registry.execute('unknownMethod', [], {})
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unknown method')
    })

    it('사용량 통계 초기값 확인', () => {
      const stats = registry.getUsageStats()
      expect(stats.totalCalls).toBe(0)
      expect(stats.groupCounts.descriptive).toBe(0)
    })
  })

  describe('Worker 매핑 검증', () => {
    it('Worker 1: Descriptive 그룹만', () => {
      GROUP_METHODS.descriptive.forEach(methodId => {
        const metadata = METHOD_METADATA[methodId]
        expect(metadata.group).toBe('descriptive')
      })
    })

    it('Worker 2: Hypothesis 그룹만', () => {
      GROUP_METHODS.hypothesis.forEach(methodId => {
        const metadata = METHOD_METADATA[methodId]
        expect(metadata.group).toBe('hypothesis')
      })
    })

    it('Worker 3: Nonparametric + ANOVA 그룹', () => {
      const worker3Methods = [
        ...GROUP_METHODS.nonparametric,
        ...GROUP_METHODS.anova
      ]
      expect(worker3Methods).toHaveLength(18) // 9 + 9
    })

    it('Worker 4: Regression + Advanced 그룹', () => {
      const worker4Methods = [
        ...GROUP_METHODS.regression,
        ...GROUP_METHODS.advanced
      ]
      expect(worker4Methods).toHaveLength(24) // 12 + 12
    })
  })

  describe('캐시 및 통계 관리', () => {
    it('캐시 정리 가능', () => {
      registry.clearCache()
      expect(registry.getLoadedGroups()).toHaveLength(0)
    })

    it('통계 리셋 가능', () => {
      registry.resetStats()
      const stats = registry.getUsageStats()
      expect(stats.totalCalls).toBe(0)
    })
  })
})
