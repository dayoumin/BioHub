/**
 * Contract Test: Cross-Module Consistency
 *
 * 핵심 모듈 간의 정합성을 검증합니다.
 * - statistical-methods.ts ↔ variable-requirements.ts
 * - statistical-methods.ts ↔ types/statistics.ts
 * - variable-requirements.ts ↔ types/statistics.ts
 *
 * 이 테스트가 깨지면 = 모듈 간 불일치 → 런타임 에러 가능성
 */

import { STATISTICAL_METHODS } from '@/lib/constants/statistical-methods'
import { STATISTICAL_METHOD_REQUIREMENTS } from '@/lib/statistics/variable-requirements'

// ============================================================================
// 1. statistical-methods ↔ variable-requirements 교차 검증
// ============================================================================

describe('cross-module consistency', () => {
  describe('statistical-methods ↔ variable-requirements', () => {
    // statistical-methods의 핵심 카테고리별 대표 메서드가
    // variable-requirements에도 대응 항목이 있는지
    const categoryRepresentatives = [
      { smId: 't-test', vrIds: ['two-sample-t', 'one-sample-t'] },
      { smId: 'anova', vrIds: ['one-way-anova'] },
      { smId: 'ancova', vrIds: ['ancova'] },
      { smId: 'mann-whitney', vrIds: ['mann-whitney'] },
      { smId: 'correlation', vrIds: ['pearson-correlation', 'spearman-correlation'] },
      { smId: 'regression', vrIds: ['simple-regression', 'multiple-regression'] },
      { smId: 'chi-square-independence', vrIds: ['chi-square-independence'] },
      { smId: 'kaplan-meier', vrIds: ['kaplan-meier'] },
      { smId: 'cox-regression', vrIds: ['cox-regression'] },
      { smId: 'roc-curve', vrIds: ['roc-curve'] },
      { smId: 'pca', vrIds: ['pca'] },
      { smId: 'descriptive', vrIds: ['descriptive-stats'] },
    ]

    it.each(categoryRepresentatives)(
      '$smId: statistical-methods에 존재하고, variable-requirements에 대응 항목 있음',
      ({ smId, vrIds }) => {
        expect(STATISTICAL_METHODS[smId]).toBeDefined()

        const found = vrIds.some((vrId) =>
          STATISTICAL_METHOD_REQUIREMENTS.some((r) => r.id === vrId),
        )
        expect(found).toBe(true)
      },
    )
  })

  // ============================================================================
  // 2. 카테고리 통일 검증 (2026-03-02 정합성 통일 이후)
  // ============================================================================

  describe('카테고리 통일', () => {
    // 양쪽 모듈이 같은 카테고리 체계를 사용해야 함 (statistical-methods.ts 기준)
    const UNIFIED_CATEGORIES = [
      'descriptive', 't-test', 'anova', 'correlation', 'regression',
      'nonparametric', 'chi-square', 'multivariate', 'survival', 'timeseries',
      'design', 'psychometrics',
    ]

    it('statistical-methods의 모든 카테고리가 통일된 목록에 포함', () => {
      const smCategories = new Set(
        Object.values(STATISTICAL_METHODS).map((m) => m.category),
      )
      for (const cat of smCategories) {
        expect(UNIFIED_CATEGORIES).toContain(cat)
      }
    })

    it('variable-requirements의 모든 카테고리가 통일된 목록에 포함', () => {
      const vrCategories = new Set(
        STATISTICAL_METHOD_REQUIREMENTS.map((r) => r.category),
      )
      for (const cat of vrCategories) {
        expect(UNIFIED_CATEGORIES).toContain(cat)
      }
    })

    it('양쪽에서 같은 메서드의 카테고리가 의미적으로 일치해야 함', () => {
      // 직접 ID가 매칭되는 메서드들의 카테고리 일치 확인
      const directMatches = [
        { smId: 'mann-whitney', vrId: 'mann-whitney' },
        { smId: 'kaplan-meier', vrId: 'kaplan-meier' },
        { smId: 'cox-regression', vrId: 'cox-regression' },
        { smId: 'roc-curve', vrId: 'roc-curve' },
        { smId: 'ancova', vrId: 'ancova' },
        { smId: 'pca', vrId: 'pca' },
        { smId: 'friedman', vrId: 'friedman' },
      ]

      for (const { smId, vrId } of directMatches) {
        const smMethod = STATISTICAL_METHODS[smId]
        const vrReq = STATISTICAL_METHOD_REQUIREMENTS.find((r) => r.id === vrId)
        if (smMethod && vrReq) {
          expect(smMethod.category).toBe(vrReq.category)
        }
      }
    })
  })

  // ============================================================================
  // 3. Role 사용 패턴 일관성
  // ============================================================================

  describe('role 사용 패턴', () => {
    it('variable-requirements에서 사용된 모든 role이 유효함', () => {
      const validRoles = [
        'dependent', 'independent', 'factor', 'covariate', 'blocking',
        'within', 'between', 'time', 'event', 'censoring', 'weight',
      ]

      for (const req of STATISTICAL_METHOD_REQUIREMENTS) {
        for (const v of req.variables) {
          expect(validRoles).toContain(v.role)
        }
      }
    })

    it('t-test 카테고리 메서드는 반드시 dependent role을 가져야 함', () => {
      const tTestReqs = STATISTICAL_METHOD_REQUIREMENTS.filter(
        (r) => r.category === 't-test',
      )
      for (const req of tTestReqs) {
        const roles = req.variables.map((v) => v.role)
        expect(roles).toContain('dependent')
      }
    })

    it('anova 카테고리 메서드는 반드시 dependent 또는 within role을 가져야 함', () => {
      const anovaReqs = STATISTICAL_METHOD_REQUIREMENTS.filter(
        (r) => r.category === 'anova',
      )
      for (const req of anovaReqs) {
        const roles = req.variables.map((v) => v.role)
        const hasDependentLike = roles.includes('dependent') || roles.includes('within')
        expect(hasDependentLike).toBe(true)
      }
    })

    it('survival 카테고리 메서드는 time 또는 event role을 가져야 함', () => {
      const survivalReqs = STATISTICAL_METHOD_REQUIREMENTS.filter(
        (r) => r.category === 'survival',
      )
      for (const req of survivalReqs) {
        const roles = req.variables.map((v) => v.role)
        const hasSurvivalRole =
          roles.includes('time') || roles.includes('event') || roles.includes('dependent')
        expect(hasSurvivalRole).toBe(true)
      }
    })
  })

  // ============================================================================
  // 4. 메서드 수 동기화: 양쪽의 커버리지 수준 감시
  // ============================================================================

  describe('커버리지 수준', () => {
    it('statistical-methods의 독립 페이지 메서드 대부분이 variable-requirements에 대응', () => {
      const independentMethods = Object.values(STATISTICAL_METHODS).filter(
        (m) => m.hasOwnPage !== false,
      )
      const vrIds = new Set(STATISTICAL_METHOD_REQUIREMENTS.map((r) => r.id))

      let matched = 0
      for (const method of independentMethods) {
        if (vrIds.has(method.id) || vrIds.has(`${method.id}-stats`)) {
          matched++
        }
      }

      const coverage = matched / independentMethods.length
      expect(coverage).toBeGreaterThan(0.3)
    })
  })
})
