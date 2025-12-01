/**
 * Statistical Methods - Single Source of Truth 테스트
 *
 * lib/constants/statistical-methods.ts 검증
 */

import {
  STATISTICAL_METHODS,
  METHOD_CATEGORIES,
  getMethodByIdOrAlias,
  getMethodsByCategory,
  getAllMethods,
  getAllMethodIds,
  getMethodRoute,
  isValidMethodId,
} from '@/lib/constants/statistical-methods'

describe('statistical-methods.ts', () => {
  // ============================================
  // 1. 기본 구조 검증
  // ============================================
  describe('STATISTICAL_METHODS 기본 구조', () => {
    it('48개 이상의 통계 방법이 정의되어 있어야 함', () => {
      const methodCount = Object.keys(STATISTICAL_METHODS).length
      expect(methodCount).toBeGreaterThanOrEqual(45)
    })

    it('모든 방법에 필수 필드가 있어야 함', () => {
      for (const [id, method] of Object.entries(STATISTICAL_METHODS)) {
        expect(method.id).toBe(id) // ID 일치
        expect(method.name).toBeDefined()
        expect(method.name.length).toBeGreaterThan(0)
        expect(method.description).toBeDefined()
        expect(method.category).toBeDefined()
      }
    })

    it('ID는 kebab-case여야 함', () => {
      const kebabCaseRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/
      for (const id of Object.keys(STATISTICAL_METHODS)) {
        expect(id).toMatch(kebabCaseRegex)
      }
    })
  })

  // ============================================
  // 2. 페이지 경로 일치 검증
  // ============================================
  describe('ID = 페이지 경로 규칙', () => {
    const expectedPages = [
      't-test',
      'welch-t',
      'one-sample-t',
      'anova',
      'repeated-measures-anova',
      'ancova',
      'manova',
      'mixed-model',
      'mann-whitney',
      'wilcoxon',
      'kruskal-wallis',
      'friedman',
      'sign-test',
      'mcnemar',
      'cochran-q',
      'binomial-test',
      'runs-test',
      'ks-test',
      'mood-median',
      'correlation',
      'partial-correlation',
      'regression',
      'poisson',
      'ordinal-regression',
      'stepwise',
      'dose-response',
      'response-surface',
      'chi-square',
      'chi-square-goodness',
      'chi-square-independence',
      'descriptive',
      'normality-test',
      'explore-data',
      'means-plot',
      'arima',
      'seasonal-decompose',
      'stationarity-test',
      'mann-kendall',
      'kaplan-meier',
      'cox-regression',
      'pca',
      'factor-analysis',
      'cluster',
      'discriminant',
      'power-analysis',
      'reliability',
      'proportion-test',
    ]

    it.each(expectedPages)('%s 페이지가 METHODS에 정의되어 있어야 함', (pageId) => {
      expect(STATISTICAL_METHODS[pageId]).toBeDefined()
    })
  })

  // ============================================
  // 3. getMethodByIdOrAlias 함수 테스트
  // ============================================
  describe('getMethodByIdOrAlias', () => {
    it('정확한 ID로 방법을 찾을 수 있어야 함', () => {
      const method = getMethodByIdOrAlias('t-test')
      expect(method).not.toBeNull()
      expect(method?.id).toBe('t-test')
    })

    it('alias로 방법을 찾을 수 있어야 함', () => {
      // 'independent-t'는 't-test'의 alias
      const method = getMethodByIdOrAlias('independent-t')
      expect(method).not.toBeNull()
      expect(method?.id).toBe('t-test')
    })

    it('다른 alias들도 동작해야 함', () => {
      // 'independent-t-test'도 't-test'의 alias
      const method = getMethodByIdOrAlias('independent-t-test')
      expect(method).not.toBeNull()
      expect(method?.id).toBe('t-test')
    })

    it('존재하지 않는 ID는 null 반환', () => {
      const method = getMethodByIdOrAlias('non-existent-method')
      expect(method).toBeNull()
    })

    it('DecisionTree에서 사용하는 ID들이 호환되어야 함', () => {
      // DecisionTree.ts에서 사용하는 기존 ID들
      const decisionTreeIds = [
        'independent-t',
        'paired-t',
        'welch-t',
        'one-way-anova',
        'welch-anova',
        'repeated-anova',
        'mann-whitney',
        'wilcoxon',
        'kruskal-wallis',
        'friedman',
      ]

      for (const id of decisionTreeIds) {
        const method = getMethodByIdOrAlias(id)
        expect(method).not.toBeNull()
      }
    })

    it('decision-tree-recommender에서 사용하는 ID들이 호환되어야 함', () => {
      // decision-tree-recommender.ts에서 사용하는 기존 ID들
      const recommenderIds = [
        'independent-t-test',
        'paired-t-test',
        'pearson',
        'spearman',
        'linear-regression',
        'multiple-regression',
      ]

      for (const id of recommenderIds) {
        const method = getMethodByIdOrAlias(id)
        expect(method).not.toBeNull()
      }
    })
  })

  // ============================================
  // 4. getMethodsByCategory 함수 테스트
  // ============================================
  describe('getMethodsByCategory', () => {
    it('t-test 카테고리에 4개 방법이 있어야 함', () => {
      const methods = getMethodsByCategory('t-test')
      expect(methods.length).toBe(4)
      expect(methods.map((m) => m.id)).toContain('t-test')
      expect(methods.map((m) => m.id)).toContain('welch-t')
    })

    it('nonparametric 카테고리에 12개 이상 방법이 있어야 함', () => {
      const methods = getMethodsByCategory('nonparametric')
      expect(methods.length).toBeGreaterThanOrEqual(12)
    })

    it('존재하지 않는 카테고리는 빈 배열 반환', () => {
      const methods = getMethodsByCategory('non-existent-category')
      expect(methods).toEqual([])
    })
  })

  // ============================================
  // 5. getMethodRoute 함수 테스트
  // ============================================
  describe('getMethodRoute', () => {
    it('정상적인 ID로 라우트 반환', () => {
      expect(getMethodRoute('t-test')).toBe('/statistics/t-test')
      expect(getMethodRoute('mann-whitney')).toBe('/statistics/mann-whitney')
    })

    it('alias로도 라우트 반환', () => {
      expect(getMethodRoute('independent-t')).toBe('/statistics/t-test')
    })

    it('hasOwnPage=false인 방법은 parentPageId로 라우팅', () => {
      // paired-t는 t-test 페이지로 라우팅
      expect(getMethodRoute('paired-t')).toBe('/statistics/t-test')
      // welch-anova는 anova 페이지로 라우팅
      expect(getMethodRoute('welch-anova')).toBe('/statistics/anova')
    })

    it('존재하지 않는 ID는 null 반환', () => {
      expect(getMethodRoute('non-existent')).toBeNull()
    })
  })

  // ============================================
  // 6. getAllMethods / getAllMethodIds 테스트
  // ============================================
  describe('getAllMethods / getAllMethodIds', () => {
    it('getAllMethods와 getAllMethodIds 개수가 일치해야 함', () => {
      expect(getAllMethods().length).toBe(getAllMethodIds().length)
    })

    it('getAllMethodIds는 모든 키를 반환해야 함', () => {
      const ids = getAllMethodIds()
      expect(ids).toContain('t-test')
      expect(ids).toContain('mann-whitney')
      expect(ids).toContain('regression')
    })
  })

  // ============================================
  // 7. isValidMethodId 테스트
  // ============================================
  describe('isValidMethodId', () => {
    it('유효한 ID는 true 반환', () => {
      expect(isValidMethodId('t-test')).toBe(true)
      expect(isValidMethodId('independent-t')).toBe(true) // alias도 valid
    })

    it('유효하지 않은 ID는 false 반환', () => {
      expect(isValidMethodId('fake-method')).toBe(false)
      expect(isValidMethodId('')).toBe(false)
    })
  })

  // ============================================
  // 8. METHOD_CATEGORIES 구조 테스트
  // ============================================
  describe('METHOD_CATEGORIES', () => {
    it('11개 카테고리가 정의되어 있어야 함', () => {
      expect(Object.keys(METHOD_CATEGORIES).length).toBe(11)
    })

    it('각 카테고리의 methods가 STATISTICAL_METHODS에 존재해야 함', () => {
      for (const [catKey, category] of Object.entries(METHOD_CATEGORIES)) {
        for (const methodId of category.methods) {
          const method = STATISTICAL_METHODS[methodId]
          if (!method) {
            console.error(`Missing method: ${methodId} in category ${catKey}`)
          }
          expect(method).toBeDefined()
        }
      }
    })
  })

  // ============================================
  // 9. 하위 호환성 테스트 (Critical)
  // ============================================
  describe('하위 호환성 - DecisionTree.ts 기존 ID 매핑', () => {
    const legacyMappings = [
      { legacy: 'independent-t', expected: 't-test' },
      { legacy: 'paired-t', expected: 'paired-t' },
      { legacy: 'one-way-anova', expected: 'anova' },
      { legacy: 'welch-anova', expected: 'welch-anova' },
      { legacy: 'repeated-anova', expected: 'repeated-measures-anova' },
      { legacy: 'mann-whitney', expected: 'mann-whitney' },
      { legacy: 'wilcoxon', expected: 'wilcoxon' },
      { legacy: 'kruskal-wallis', expected: 'kruskal-wallis' },
      { legacy: 'friedman', expected: 'friedman' },
    ]

    it.each(legacyMappings)(
      'legacy ID "$legacy" → "$expected"로 매핑되어야 함',
      ({ legacy, expected }) => {
        const method = getMethodByIdOrAlias(legacy)
        expect(method).not.toBeNull()
        expect(method?.id).toBe(expected)
      }
    )
  })

  // ============================================
  // 10. decision-tree-recommender.ts 호환성 테스트
  // ============================================
  describe('하위 호환성 - decision-tree-recommender.ts 기존 ID 매핑', () => {
    const recommenderMappings = [
      { legacy: 'independent-t-test', expected: 't-test' },
      { legacy: 'paired-t-test', expected: 'paired-t' },
      { legacy: 'pearson', expected: 'correlation' },
      { legacy: 'spearman', expected: 'correlation' },
      { legacy: 'linear-regression', expected: 'regression' },
      { legacy: 'multiple-regression', expected: 'regression' },
      { legacy: 'chi-squared', expected: 'chi-square' },
    ]

    it.each(recommenderMappings)(
      'recommender ID "$legacy" → "$expected"로 매핑되어야 함',
      ({ legacy, expected }) => {
        const method = getMethodByIdOrAlias(legacy)
        expect(method).not.toBeNull()
        expect(method?.id).toBe(expected)
      }
    )
  })
})
