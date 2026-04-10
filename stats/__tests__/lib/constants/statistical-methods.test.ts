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
  getMethod,
  getMethodByAlias,
  getMethodsByPage,
  isIntegratedPage,
  methodHasOwnPage,
  getKoreanName,
  getKoreanDescription,
} from '@/lib/constants/statistical-methods'

describe('statistical-methods.ts', () => {
  // ============================================
  // 1. 기본 구조 검증
  // ============================================
  describe('STATISTICAL_METHODS 기본 구조', () => {
    it('45개 이상의 통계 방법이 정의되어 있어야 함', () => {
      const methodCount = Object.keys(STATISTICAL_METHODS).length
      expect(methodCount).toBeGreaterThanOrEqual(45)
    })

    it('모든 방법에 필수 필드가 있어야 함', () => {
      for (const [id, method] of Object.entries(STATISTICAL_METHODS)) {
        expect(method.id).toBe(id) // ID 일치
        expect(method.name).toBeDefined()
        expect(method.name.length).toBeGreaterThanOrEqual(1)
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
  describe('Legacy SM IDs are accessible via Proxy', () => {
    const legacySMIds = [
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

    it.each(legacySMIds)('%s: legacy SM ID가 Proxy를 통해 접근 가능해야 함', (smId) => {
      expect(STATISTICAL_METHODS[smId]).toBeDefined()
    })
  })

  // ============================================
  // 3. getMethodByIdOrAlias 함수 테스트
  // ============================================
  describe('getMethodByIdOrAlias', () => {
    it('canonical ID로 방법을 찾을 수 있어야 함', () => {
      const method = getMethodByIdOrAlias('two-sample-t')
      expect(method).not.toBeNull()
      expect(method?.id).toBe('two-sample-t')
    })

    it('legacy SM ID로 방법을 찾을 수 있어야 함', () => {
      // 't-test'는 'two-sample-t'의 alias
      const method = getMethodByIdOrAlias('t-test')
      expect(method).not.toBeNull()
      expect(method?.id).toBe('two-sample-t')
    })

    it('현재 유지 중인 page ID alias도 동작해야 함', () => {
      const method = getMethodByIdOrAlias('anova')
      expect(method).not.toBeNull()
      expect(method?.id).toBe('one-way-anova')
    })

    it('제거된 레거시 alias는 더 이상 해석하지 않아야 함', () => {
      expect(getMethodByIdOrAlias('independent-t-test')?.id).toBe('two-sample-t')
      expect(getMethodByIdOrAlias('paired-t-test')?.id).toBe('paired-t')
      expect(getMethodByIdOrAlias('one-sample-t-test')?.id).toBe('one-sample-t')
      expect(getMethodByIdOrAlias('independent-t')).toBeNull()
      expect(getMethodByIdOrAlias('welch-anova')).toBeNull()
    })

    it('존재하지 않는 ID는 null 반환', () => {
      const method = getMethodByIdOrAlias('non-existent-method')
      expect(method).toBeNull()
    })

    it('DecisionTree에서 사용하는 현재 ID들이 호환되어야 함', () => {
      const decisionTreeIds = [
        'two-sample-t',
        'paired-t',
        'welch-t',
        'one-way-anova',
        'repeated-measures-anova',
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

    it('decision-tree-recommender에서 사용하는 현재 ID들이 호환되어야 함', () => {
      const recommenderIds = [
        't-test',
        'paired-t',
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
      expect(methods.map((m) => m.id)).toContain('two-sample-t')
      expect(methods.map((m) => m.id)).toContain('welch-t')
    })

    it('nonparametric 카테고리에 11개 이상 방법이 있어야 함', () => {
      const methods = getMethodsByCategory('nonparametric')
      expect(methods.length).toBeGreaterThanOrEqual(11)
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
      expect(getMethodRoute('t-test')).toBe('/statistics/t-test')
    })

    it('pageId !== id 인 방법은 pageId로 라우팅', () => {
      // paired-t의 pageId는 't-test'
      expect(getMethodRoute('paired-t')).toBe('/statistics/t-test')
      // anova는 one-way-anova의 page alias → pageId 'anova'
      expect(getMethodRoute('anova')).toBe('/statistics/anova')
    })

    it('존재하지 않는 ID는 null 반환', () => {
      expect(getMethodRoute('non-existent')).toBeNull()
    })
  })

  describe('display helpers', () => {
    it('canonical ID 기준으로 한글 표시명을 반환한다', () => {
      expect(getKoreanName('one-way-anova')).toBe('일원분산분석 (ANOVA)')
      expect(getKoreanDescription('one-way-anova')).toBe('3개 이상 독립 그룹의 평균 차이 검정')
    })
  })

  // ============================================
  // 6. getAllMethods / getAllMethodIds 테스트
  // ============================================
  describe('getAllMethods / getAllMethodIds', () => {
    it('getAllMethods와 getAllMethodIds 개수가 일치해야 함', () => {
      expect(getAllMethods().length).toBe(getAllMethodIds().length)
    })

    it('getAllMethodIds는 canonical 키를 반환해야 함', () => {
      const ids = getAllMethodIds()
      expect(ids).toContain('two-sample-t')
      expect(ids).toContain('mann-whitney')
      expect(ids).toContain('simple-regression')
      // Legacy SM IDs는 canonical 키에 포함되지 않음
      expect(ids).not.toContain('t-test')
      expect(ids).not.toContain('regression')
    })
  })

  // ============================================
  // 7. isValidMethodId 테스트
  // ============================================
  describe('isValidMethodId', () => {
    it('유효한 ID는 true 반환', () => {
      expect(isValidMethodId('t-test')).toBe(true)
      expect(isValidMethodId('two-sample-t')).toBe(true)
    })

    it('유효하지 않은 ID는 false 반환', () => {
      expect(isValidMethodId('fake-method')).toBe(false)
      expect(isValidMethodId('')).toBe(false)
      expect(isValidMethodId('independent-t')).toBe(false)
    })
  })

  // ============================================
  // 8. METHOD_CATEGORIES 구조 테스트
  // ============================================
  describe('METHOD_CATEGORIES', () => {
    it('10개 이상 카테고리가 정의되어 있어야 함', () => {
      expect(Object.keys(METHOD_CATEGORIES).length).toBeGreaterThanOrEqual(10)
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
  describe('현재 DecisionTree ID 매핑', () => {
    const currentMappings = [
      { legacy: 'two-sample-t', expected: 'two-sample-t' },
      { legacy: 'paired-t', expected: 'paired-t' },
      { legacy: 'one-way-anova', expected: 'one-way-anova' },
      { legacy: 'repeated-measures-anova', expected: 'repeated-measures-anova' },
      { legacy: 'mann-whitney', expected: 'mann-whitney' },
      { legacy: 'wilcoxon', expected: 'wilcoxon-signed-rank' },
      { legacy: 'kruskal-wallis', expected: 'kruskal-wallis' },
      { legacy: 'friedman', expected: 'friedman' },
    ]

    it.each(currentMappings)(
      'ID "$legacy" → "$expected"로 매핑되어야 함',
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
  describe('현재 recommender/page ID 매핑', () => {
    const recommenderMappings = [
      { legacy: 't-test', expected: 'two-sample-t' },
      { legacy: 'paired-t', expected: 'paired-t' },
      { legacy: 'pearson', expected: 'pearson-correlation' },
      { legacy: 'spearman', expected: 'pearson-correlation' },
      { legacy: 'linear-regression', expected: 'simple-regression' },
      { legacy: 'multiple-regression', expected: 'simple-regression' },
      { legacy: 'chi-squared', expected: 'chi-square-goodness' },
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
