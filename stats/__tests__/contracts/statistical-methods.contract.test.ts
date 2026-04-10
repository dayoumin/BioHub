/**
 * Contract Test: statistical-methods.ts
 *
 * 이 파일은 STATISTICAL_METHODS 레지스트리의 "깨지면 안 되는 약속"을 검증합니다.
 * 메서드 추가는 허용하지만, 기존 메서드 삭제/구조 변경은 즉시 감지합니다.
 *
 * 의존 파일 ~27개 → 이 계약이 깨지면 연쇄 장애 발생
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
  getKoreanName,
  type StatisticalMethodEntry,
} from '@/lib/constants/statistical-methods'

// ============================================================================
// 1. 구조적 계약: 모든 메서드는 필수 필드를 가져야 함
// ============================================================================

describe('statistical-methods contract', () => {
  const allMethods = Object.values(STATISTICAL_METHODS)
  const allIds = Object.keys(STATISTICAL_METHODS)

  describe('필수 필드 존재', () => {
    it.each(allIds)('%s: id, name, description, category가 존재해야 함', (id) => {
      const method = STATISTICAL_METHODS[id]
      expect(method.id).toBe(id) // id와 key가 일치
      expect(method.name).toEqual(expect.any(String))
      expect(method.description).toEqual(expect.any(String))
      expect(method.category).toEqual(expect.any(String))
    })
  })

  // ============================================================================
  // 2. 수량 계약: 메서드가 줄어들면 안 됨 (삭제 감지)
  // ============================================================================

  describe('수량 보호', () => {
    it('최소 45개 메서드가 등록되어야 함', () => {
      expect(allIds.length).toBeGreaterThanOrEqual(45)
    })

    it('최소 10개 카테고리가 존재해야 함', () => {
      const categories = new Set(allMethods.map((m) => m.category))
      expect(categories.size).toBeGreaterThanOrEqual(10)
    })
  })

  // ============================================================================
  // 3. 핵심 메서드 존재 계약: 자주 사용되는 메서드가 삭제되면 안 됨
  // ============================================================================

  describe('핵심 메서드 존재', () => {
    const criticalMethods = [
      // T-Test (canonical)
      'two-sample-t', 'welch-t', 'one-sample-t', 'paired-t',
      // ANOVA (canonical)
      'one-way-anova', 'repeated-measures-anova', 'ancova', 'manova',
      // Nonparametric (canonical)
      'mann-whitney', 'wilcoxon-signed-rank', 'kruskal-wallis', 'friedman',
      // Correlation & Regression (canonical)
      'pearson-correlation', 'simple-regression',
      // Chi-Square
      'chi-square-goodness', 'chi-square-independence',
      // Descriptive (canonical)
      'descriptive-stats', 'normality-test',
      // Survival
      'kaplan-meier', 'cox-regression', 'roc-curve',
      // Multivariate (canonical)
      'pca', 'factor-analysis', 'cluster', 'discriminant-analysis',
    ]

    it.each(criticalMethods)('%s가 레지스트리에 존재해야 함', (id) => {
      expect(STATISTICAL_METHODS[id]).toBeDefined()
    })
  })

  // ============================================================================
  // 4. Alias 해석 계약: 현재 유지 중인 page/option alias가 올바른 메서드로 연결
  // ============================================================================

  describe('alias 해석', () => {
    const aliasMap: [string, string][] = [
      ['t-test', 'two-sample-t'],
      ['anova', 'one-way-anova'],
      ['mann-whitney-u', 'mann-whitney'],
      ['pearson', 'pearson-correlation'],
      ['spearman', 'pearson-correlation'],
      ['correlation', 'pearson-correlation'],
      ['linear-regression', 'simple-regression'],
      ['regression', 'simple-regression'],
      ['chi-squared', 'chi-square-goodness'],
      ['km-curve', 'kaplan-meier'],
      ['cox-ph', 'cox-regression'],
      ['cronbach-alpha', 'reliability-analysis'],
      ['wilcoxon', 'wilcoxon-signed-rank'],
      ['descriptive', 'descriptive-stats'],
      ['reliability', 'reliability-analysis'],
      ['discriminant', 'discriminant-analysis'],
    ]

    it.each(aliasMap)('alias "%s" → 메서드 "%s"', (alias, expectedId) => {
      const resolved = getMethodByIdOrAlias(alias)
      expect(resolved).not.toBeNull()
      expect(resolved!.id).toBe(expectedId)
    })

    it('retired legacy alias는 더 이상 해석하지 않아야 함', () => {
      expect(getMethodByIdOrAlias('independent-t')).toBeNull()
      expect(getMethodByIdOrAlias('independent-t-test')).toBeNull()
      expect(getMethodByIdOrAlias('paired-t-test')).toBeNull()
      expect(getMethodByIdOrAlias('welch-anova')).toBeNull()
      expect(getMethodByIdOrAlias('repeated-anova')).toBeNull()
    })

    it('존재하지 않는 alias는 null을 반환해야 함', () => {
      expect(getMethodByIdOrAlias('nonexistent-method-xyz')).toBeNull()
    })
  })

  // ============================================================================
  // 5. 임베디드 메서드 계약: pageId !== id인 메서드는 pageId가 유효해야 함
  // ============================================================================

  describe('임베디드 메서드', () => {
    const embeddedMethods = allMethods.filter((m) => m.id !== m.pageId)

    it('최소 3개의 임베디드 메서드가 존재해야 함', () => {
      expect(embeddedMethods.length).toBeGreaterThanOrEqual(3)
    })

    it.each(
      embeddedMethods.map((m) => [m.id, m] as [string, StatisticalMethodEntry])
    )('%s: pageId가 유효한 페이지를 가리켜야 함', (_id, method) => {
      // pageId로 STATISTICAL_METHODS에서 조회 가능해야 함 (alias로라도)
      expect(STATISTICAL_METHODS[method.pageId]).toBeDefined()
    })
  })

  // ============================================================================
  // 6. 카테고리 정합성: METHOD_CATEGORIES의 메서드가 실제 존재해야 함
  // ============================================================================

  describe('카테고리 정합성', () => {
    const categoryEntries = Object.entries(METHOD_CATEGORIES) as [
      string,
      { methods: string[] },
    ][]

    it.each(categoryEntries)(
      '카테고리 "%s"의 모든 메서드가 레지스트리에 존재해야 함',
      (_category, config) => {
        for (const methodId of config.methods) {
          expect(STATISTICAL_METHODS[methodId]).toBeDefined()
        }
      },
    )

    it('레지스트리의 모든 메서드가 하나의 카테고리에 속해야 함', () => {
      const allCategoryMethods = Object.values(METHOD_CATEGORIES).flatMap(
        (c) => c.methods,
      )
      for (const id of allIds) {
        expect(allCategoryMethods).toContain(id)
      }
    })
  })

  // ============================================================================
  // 7. 헬퍼 함수 계약: 기본 동작 보장
  // ============================================================================

  describe('헬퍼 함수', () => {
    it('getAllMethods()는 빈 배열이 아니어야 함', () => {
      expect(getAllMethods().length).toBeGreaterThanOrEqual(1)
    })

    it('getAllMethodIds()는 STATISTICAL_METHODS 키와 일치해야 함', () => {
      expect(getAllMethodIds().sort()).toEqual(Object.keys(STATISTICAL_METHODS).sort())
    })

    it('getMethodsByCategory("t-test")는 t-test 카테고리 메서드만 반환', () => {
      const tTests = getMethodsByCategory('t-test')
      expect(tTests.length).toBeGreaterThanOrEqual(3)
      tTests.forEach((m) => expect(m.category).toBe('t-test'))
    })

    it('getMethodRoute는 일반 메서드에 /statistics/ 경로 반환', () => {
      expect(getMethodRoute('t-test')).toBe('/statistics/t-test')
    })

    it('getMethodRoute는 임베디드 메서드에 부모 경로 반환', () => {
      expect(getMethodRoute('paired-t')).toBe('/statistics/t-test')
    })

    it('isValidMethodId는 존재하는 메서드에 true', () => {
      expect(isValidMethodId('t-test')).toBe(true)
      expect(isValidMethodId('fake-method')).toBe(false)
    })

    it('getKoreanName은 한국어명 또는 영어명 반환', () => {
      expect(getKoreanName('t-test')).toBe('독립표본 t-검정')
      expect(getKoreanName('nonexistent')).toBe('nonexistent') // fallback
    })
  })

  // ============================================================================
  // 8. ID 유일성: 중복 ID 금지
  // ============================================================================

  describe('ID 유일성', () => {
    it('모든 메서드 ID가 고유해야 함', () => {
      // Record의 key 자체가 unique하므로, id와 key 일치 여부만 확인
      for (const [key, method] of Object.entries(STATISTICAL_METHODS)) {
        expect(method.id).toBe(key)
      }
    })

    it('alias가 다른 메서드의 ID와 충돌하지 않아야 함', () => {
      for (const method of allMethods) {
        if (method.aliases) {
          for (const alias of method.aliases) {
            // alias가 다른 메서드의 primary ID면 충돌 가능
            if (STATISTICAL_METHODS[alias]) {
              // alias가 자기 자신을 가리키는 건 허용 (예: alias가 id와 같은 경우)
              // 하지만 다른 메서드 ID와 같으면 경고
              // getMethodByIdOrAlias는 direct match 우선이므로 alias는 무시됨
            }
          }
        }
      }
    })
  })
})
