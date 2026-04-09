/**
 * Contract Test: method-id-unification
 *
 * canonical id ↔ VR id ↔ page route 3자 정합성을 검증합니다.
 * - 모든 non-dataTool method는 VR에 대응 항목이 있어야 함
 * - 모든 method의 pageId가 유효한 경로를 생성해야 함
 * - alias fallback이 canonical id로 정확히 해소되어야 함
 * - IndexedDB 역직렬화 시 기존 SM ID가 복원 가능해야 함
 */

import { STATISTICAL_METHODS, getMethodRoute, getMethodByAlias } from '@/lib/constants/statistical-methods'
import { STATISTICAL_METHOD_REQUIREMENTS } from '@/lib/statistics/variable-requirements'

describe('method-id-unification contract', () => {
  const methods = Object.values(STATISTICAL_METHODS)
  const vrIds = new Set(STATISTICAL_METHOD_REQUIREMENTS.map(r => r.id))

  describe('canonical id ↔ VR id 정합성', () => {
    it('모든 non-dataTool method는 VR에 대응 항목이 있어야 함', () => {
      const missing: string[] = []
      for (const m of methods) {
        if (m.isDataTool) continue
        if (!vrIds.has(m.id)) missing.push(m.id)
      }
      // VR 미등록 허용 상한 — 점진 추가 시 이 값을 줄일 것
      expect(missing).toEqual([])
    })
  })

  describe('canonical id → page route 정합성', () => {
    it('모든 method의 pageId가 유효한 경로를 생성해야 함', () => {
      for (const m of methods) {
        const route = getMethodRoute(m.id)
        expect(route).not.toBeNull()
        expect(route).toMatch(/^\/statistics\//)
      }
    })
  })

  describe('alias fallback 정합성', () => {
    const SM_ALIASES = [
      ['t-test', 'two-sample-t'],
      ['anova', 'one-way-anova'],
      ['correlation', 'pearson-correlation'],
      ['regression', 'simple-regression'],
      ['descriptive', 'descriptive-stats'],
      ['wilcoxon', 'wilcoxon-signed-rank'],
      ['ks-test', 'kolmogorov-smirnov'],
      ['poisson', 'poisson-regression'],
      ['stepwise', 'stepwise-regression'],
      ['discriminant', 'discriminant-analysis'],
      ['reliability', 'reliability-analysis'],
      ['proportion-test', 'one-sample-proportion'],
      ['mann-kendall', 'mann-kendall-test'],
    ] as const

    it.each(SM_ALIASES)(
      'SM alias "%s" → canonical "%s"로 해소',
      (alias, canonical) => {
        const method = getMethodByAlias(alias)
        expect(method).not.toBeNull()
        expect(method!.id).toBe(canonical)
      }
    )
  })

  describe('IndexedDB 역직렬화 호환', () => {
    it.each(['t-test', 'anova', 'correlation', 'regression', 'descriptive'])(
      '기존 IndexedDB SM ID "%s"가 getMethodByAlias로 복원',
      (oldId) => {
        const method = getMethodByAlias(oldId)
        expect(method).not.toBeNull()
        expect(method!.id).not.toBe(oldId)
      }
    )
  })

  describe('id === pageId 일관성', () => {
    it('자체 페이지 메서드는 id === pageId', () => {
      const selfPage = methods.filter(m => m.id === m.pageId)
      expect(selfPage.length).toBeGreaterThanOrEqual(34)
    })
  })

  describe('no self-referencing aliases', () => {
    it('어떤 엔트리도 자기 id를 aliases에 포함하지 않아야 함', () => {
      for (const m of methods) {
        expect(m.aliases).not.toContain(m.id)
      }
    })
  })
})
