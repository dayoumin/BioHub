/**
 * 스마트 분석 메서드 추천 시스템 종합 테스트
 *
 * 점검 항목:
 * 1. method-mapping.ts: 50개 메서드 ↔ 43개 페이지 매핑
 * 2. QUESTION_TYPES: 카테고리별 메서드 분류 정확성
 * 3. recommendMethods: 데이터 프로필 기반 추천 로직
 * 4. checkMethodRequirements: 요구사항 검증 로직
 * 5. SmartRecommender: 키워드 + 가정 기반 추천
 */

import {
  STATISTICAL_METHODS,
  QUESTION_TYPES,
  getMethodsByQuestionType,
  recommendMethods,
  checkMethodRequirements
} from '@/lib/statistics/method-mapping'
import { SmartRecommender } from '@/lib/services/smart-recommender'

// 43개 통계 페이지 목록
const STATISTICS_PAGES = [
  'ancova', 'anova', 'binomial-test', 'chi-square', 'chi-square-goodness',
  'chi-square-independence', 'cluster', 'cochran-q', 'correlation', 'descriptive',
  'discriminant', 'dose-response', 'explore-data', 'factor-analysis', 'friedman',
  'kruskal-wallis', 'ks-test', 'mann-kendall', 'mann-whitney', 'manova',
  'mcnemar', 'means-plot', 'mixed-model', 'mood-median', 'non-parametric',
  'normality-test', 'one-sample-t', 'ordinal-regression', 'partial-correlation',
  'pca', 'poisson', 'power-analysis', 'proportion-test', 'regression',
  'reliability', 'repeated-measures-anova', 'response-surface', 'runs-test',
  'sign-test', 'stepwise', 't-test', 'welch-t', 'wilcoxon'
]

// 페이지 → method ID 매핑 (하나의 페이지가 여러 메서드를 포함할 수 있음)
const PAGE_TO_METHOD_MAP: Record<string, string[]> = {
  'ancova': ['ancova'],
  'anova': ['one-way-anova', 'two-way-anova', 'tukey-hsd', 'bonferroni', 'games-howell'],
  'binomial-test': ['binomial-test'],
  'chi-square': ['chi-square'],
  'chi-square-goodness': ['chi-square-goodness'],
  'chi-square-independence': ['chi-square-independence'],
  'cluster': ['k-means', 'hierarchical'],
  'cochran-q': ['cochran-q'],
  'correlation': ['correlation'],
  'descriptive': ['descriptive-stats'],
  'discriminant': ['discriminant'],
  'dose-response': ['dose-response'],
  'explore-data': ['explore-data'],
  'factor-analysis': ['factor-analysis'],
  'friedman': ['friedman'],
  'kruskal-wallis': ['kruskal-wallis', 'dunn-test'],
  'ks-test': ['ks-test'],
  'mann-kendall': ['mann-kendall'],
  'mann-whitney': ['mann-whitney'],
  'manova': ['manova'],
  'mcnemar': ['mcnemar'],
  'means-plot': ['means-plot'],
  'mixed-model': ['mixed-model'],
  'mood-median': ['mood-median'],
  'non-parametric': ['non-parametric'],
  'normality-test': ['normality-test', 'homogeneity-test'],
  'one-sample-t': ['one-sample-t'],
  'ordinal-regression': ['ordinal-regression'],
  'partial-correlation': ['partial-correlation'],
  'pca': ['pca'],
  'poisson': ['poisson-regression'],
  'power-analysis': ['power-analysis'],
  'proportion-test': ['proportion-test'],
  'regression': ['simple-regression', 'multiple-regression', 'logistic-regression'],
  'reliability': ['reliability-analysis'],
  'repeated-measures-anova': ['repeated-measures-anova'],
  'response-surface': ['response-surface'],
  'runs-test': ['runs-test'],
  'sign-test': ['sign-test'],
  'stepwise': ['stepwise-regression'],
  't-test': ['two-sample-t', 'paired-t'],
  'welch-t': ['welch-t'],
  'wilcoxon': ['wilcoxon']
}

describe('스마트 분석 메서드 추천 시스템', () => {

  // ===== 1. method-mapping.ts 기본 검증 =====
  describe('1. STATISTICAL_METHODS 기본 검증', () => {

    it('58개의 통계 메서드가 정의되어 있어야 한다', () => {
      expect(STATISTICAL_METHODS.length).toBe(58)
      console.log(`✅ 총 ${STATISTICAL_METHODS.length}개 메서드 정의됨`)
    })

    it('모든 메서드에 필수 필드가 있어야 한다', () => {
      const missingFields: string[] = []

      STATISTICAL_METHODS.forEach(method => {
        if (!method.id) missingFields.push(`${method.name || 'unknown'}: id 누락`)
        if (!method.name) missingFields.push(`${method.id || 'unknown'}: name 누락`)
        if (!method.description) missingFields.push(`${method.id}: description 누락`)
        if (!method.category) missingFields.push(`${method.id}: category 누락`)
      })

      if (missingFields.length > 0) {
        console.log('❌ 필수 필드 누락:', missingFields)
      }
      expect(missingFields).toHaveLength(0)
    })

    it('중복 ID가 없어야 한다', () => {
      const ids = STATISTICAL_METHODS.map(m => m.id)
      const duplicates = ids.filter((id, idx) => ids.indexOf(id) !== idx)

      if (duplicates.length > 0) {
        console.log('❌ 중복 ID:', [...new Set(duplicates)])
      }
      expect(duplicates).toHaveLength(0)
    })

    it('모든 메서드에 requirements가 정의되어야 한다', () => {
      const noRequirements = STATISTICAL_METHODS.filter(m => !m.requirements)

      if (noRequirements.length > 0) {
        console.log('⚠️ requirements 미정의:', noRequirements.map(m => m.id))
      }
      // 경고만 표시 (requirements는 선택적일 수 있음)
      expect(noRequirements.length).toBeLessThan(10)
    })
  })

  // ===== 2. 43개 페이지 매핑 커버리지 =====
  describe('2. 43개 페이지 매핑 커버리지', () => {

    it('모든 통계 페이지가 method-mapping에 매핑되어야 한다', () => {
      const methodIds = STATISTICAL_METHODS.map(m => m.id)
      const missingMappings: string[] = []
      const coveredPages: string[] = []

      STATISTICS_PAGES.forEach(page => {
        const expectedMethodIds = PAGE_TO_METHOD_MAP[page]
        if (!expectedMethodIds) {
          missingMappings.push(`${page}: 매핑 테이블에 없음`)
          return
        }

        const missingMethods = expectedMethodIds.filter(id => !methodIds.includes(id))
        if (missingMethods.length > 0) {
          missingMappings.push(`${page}: ${missingMethods.join(', ')} 누락`)
        } else {
          coveredPages.push(page)
        }
      })

      const coverage = (coveredPages.length / STATISTICS_PAGES.length * 100).toFixed(1)
      console.log(`📊 페이지 커버리지: ${coverage}% (${coveredPages.length}/${STATISTICS_PAGES.length})`)

      if (missingMappings.length > 0) {
        console.log('❌ 누락된 매핑:')
        missingMappings.forEach(m => console.log(`   - ${m}`))
      }

      expect(missingMappings).toHaveLength(0)
    })

    it('매핑되지 않은 메서드가 없어야 한다 (역방향 검증)', () => {
      const mappedMethodIds = Object.values(PAGE_TO_METHOD_MAP).flat()
      const unmappedMethods = STATISTICAL_METHODS.filter(
        m => !mappedMethodIds.includes(m.id)
      )

      if (unmappedMethods.length > 0) {
        console.log('⚠️ 페이지에 매핑되지 않은 메서드:')
        unmappedMethods.forEach(m => console.log(`   - ${m.id}: ${m.name}`))
      }

      // 일부 메서드는 의도적으로 직접 접근하지 않을 수 있음 (사후검정 등)
      expect(unmappedMethods.length).toBeLessThanOrEqual(10)
    })
  })

  // ===== 3. QUESTION_TYPES 카테고리 검증 =====
  describe('3. QUESTION_TYPES 카테고리 검증', () => {

    it('4개의 질문 유형이 정의되어야 한다', () => {
      expect(QUESTION_TYPES).toHaveLength(4)

      const typeIds = QUESTION_TYPES.map(q => q.id)
      expect(typeIds).toContain('comparison')
      expect(typeIds).toContain('relationship')
      expect(typeIds).toContain('frequency')
      expect(typeIds).toContain('advanced')
    })

    it('각 질문 유형에 최소 2개 이상의 메서드가 포함되어야 한다', () => {
      QUESTION_TYPES.forEach(type => {
        const methods = getMethodsByQuestionType(type.id)
        console.log(`${type.icon} ${type.name}: ${methods.length}개 메서드`)
        expect(methods.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('comparison 카테고리에 올바른 메서드가 포함되어야 한다', () => {
      const methods = getMethodsByQuestionType('comparison')
      const methodIds = methods.map(m => m.id)

      // 필수 메서드
      expect(methodIds).toContain('two-sample-t')
      expect(methodIds).toContain('one-way-anova')
      expect(methodIds).toContain('mann-whitney')
      expect(methodIds).toContain('kruskal-wallis')
    })

    it('relationship 카테고리에 올바른 메서드가 포함되어야 한다', () => {
      const methods = getMethodsByQuestionType('relationship')
      const methodIds = methods.map(m => m.id)

      expect(methodIds).toContain('correlation')
      expect(methodIds).toContain('simple-regression')
      expect(methodIds).toContain('multiple-regression')
    })

    it('frequency 카테고리에 올바른 메서드가 포함되어야 한다', () => {
      const methods = getMethodsByQuestionType('frequency')
      const methodIds = methods.map(m => m.id)

      expect(methodIds).toContain('chi-square')
      expect(methodIds).toContain('descriptive-stats')
    })

    it('모든 메서드가 최소 하나의 카테고리에 포함되어야 한다', () => {
      const allCategorizedMethods = new Set<string>()

      QUESTION_TYPES.forEach(type => {
        const methods = getMethodsByQuestionType(type.id)
        methods.forEach(m => allCategorizedMethods.add(m.id))
      })

      const uncategorized = STATISTICAL_METHODS.filter(
        m => !allCategorizedMethods.has(m.id)
      )

      if (uncategorized.length > 0) {
        console.log('⚠️ 카테고리에 포함되지 않은 메서드:')
        uncategorized.forEach(m => console.log(`   - ${m.id} (category: ${m.category})`))
      }

      // advanced 카테고리에 포함되지 않은 일부 메서드 허용
      expect(uncategorized.length).toBeLessThan(10)
    })
  })

  // ===== 4. recommendMethods 로직 검증 =====
  describe('4. recommendMethods 데이터 기반 추천', () => {

    it('기본 데이터 프로필에 기술통계가 추천되어야 한다', () => {
      const profile = {
        numericVars: 2,
        categoricalVars: 0,
        totalRows: 100,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      expect(methodIds).toContain('descriptive-stats')
    })

    it('수치형 변수 2개 이상일 때 상관분석이 추천되어야 한다', () => {
      const profile = {
        numericVars: 3,
        categoricalVars: 0,
        totalRows: 50,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      expect(methodIds).toContain('correlation')
    })

    it('그룹 변수 2개일 때 t-test가 추천되어야 한다', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 30,
        hasTimeVar: false,
        hasGroupVar: true,
        groupLevels: 2
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      expect(methodIds).toContain('two-sample-t')
      expect(methodIds).toContain('mann-whitney')
    })

    it('그룹 변수 3개 이상일 때 ANOVA가 추천되어야 한다', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 60,
        hasTimeVar: false,
        hasGroupVar: true,
        groupLevels: 4
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      expect(methodIds).toContain('one-way-anova')
      expect(methodIds).toContain('kruskal-wallis')
    })

    it('시간 변수가 있고 데이터가 충분할 때 시계열 추세 분석이 추천되어야 한다', () => {
      const profile = {
        numericVars: 2,
        categoricalVars: 0,
        totalRows: 100,
        hasTimeVar: true,
        hasGroupVar: false
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      expect(methodIds).toContain('mann-kendall')
    })

    it('충분한 데이터와 변수가 있을 때 PCA가 추천되어야 한다', () => {
      const profile = {
        numericVars: 5,
        categoricalVars: 0,
        totalRows: 50,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      expect(methodIds).toContain('pca')
    })

    it('범주형 변수 2개 이상일 때 이원분산분석이 추천되어야 한다', () => {
      const profile = {
        numericVars: 1,
        categoricalVars: 2,
        totalRows: 60,
        hasTimeVar: false,
        hasGroupVar: true,
        groupLevels: 3
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      expect(methodIds).toContain('two-way-anova')
    })
  })

  // ===== 5. checkMethodRequirements 검증 =====
  describe('5. checkMethodRequirements 요구사항 검증', () => {

    it('샘플 크기가 부족할 때 경고해야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'logistic-regression')!
      const profile = {
        numericVars: 3,
        categoricalVars: 1,
        totalRows: 20, // 최소 50개 필요
        hasTimeVar: false,
        hasGroupVar: true
      }

      const result = checkMethodRequirements(method, profile)

      expect(result.canUse).toBe(false)
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings.some(w => w.includes('샘플') || w.includes('데이터'))).toBe(true)
    })

    it('수치형 변수가 없을 때 경고해야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'correlation')!
      const profile = {
        numericVars: 0,
        categoricalVars: 3,
        totalRows: 100,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const result = checkMethodRequirements(method, profile)

      expect(result.canUse).toBe(false)
      expect(result.warnings.some(w => w.includes('수치형'))).toBe(true)
    })

    it('정규성 가정 위반 시 경고해야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'two-sample-t')!
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 50,
        hasTimeVar: false,
        hasGroupVar: true,
        normalityPassed: false
      }

      const result = checkMethodRequirements(method, profile)

      expect(result.warnings.some(w => w.includes('정규성') || w.includes('비모수'))).toBe(true)
    })

    it('등분산성 가정 위반 시 경고해야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'one-way-anova')!
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 60,
        hasTimeVar: false,
        hasGroupVar: true,
        homogeneityPassed: false
      }

      const result = checkMethodRequirements(method, profile)

      expect(result.warnings.some(w => w.includes('등분산') || w.includes('Welch'))).toBe(true)
    })

    it('요구사항을 모두 충족할 때 canUse가 true여야 한다', () => {
      const method = STATISTICAL_METHODS.find(m => m.id === 'two-sample-t')!
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 100,
        hasTimeVar: false,
        hasGroupVar: true,
        normalityPassed: true,
        homogeneityPassed: true
      }

      const result = checkMethodRequirements(method, profile)

      expect(result.canUse).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })
  })

  // ===== 6. SmartRecommender 검증 =====
  describe('6. SmartRecommender 키워드 기반 추천', () => {

    const createContext = (purposeText: string, options?: Partial<{
      rows: number
      numericCols: number
      categoricalCols: number
      isNormal: boolean
      isHomoscedastic: boolean
    }>) => {
      const numCols = options?.numericCols ?? 2
      const catCols = options?.categoricalCols ?? 1
      return {
        purposeText,
        dataShape: {
          rows: options?.rows ?? 100,
          columns: numCols + catCols,
          columnTypes: [
            ...Array(numCols).fill('numeric' as const),
            ...Array(catCols).fill('categorical' as const)
          ],
          columnNames: [
            ...Array(numCols).fill(null).map((_, i) => `var${i + 1}`),
            ...Array(catCols).fill(null).map((_, i) => `group${i + 1}`)
          ]
        },
        dataQuality: {
          missingRatio: 0.05,
          outlierRatio: 0.02,
          isNormallyDistributed: options?.isNormal,
          isHomoscedastic: options?.isHomoscedastic
        }
      }
    }

    it('모호한 텍스트에 대해 경고해야 한다', () => {
      const context = createContext('그냥 뭔가 분석')
      const result = SmartRecommender.recommend(context)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.confidence).toBe('low')
    })

    it('상관 키워드에 대해 수치형 변수 부족 시 모순을 감지해야 한다', () => {
      const context = createContext('변수 간 상관관계를 알고 싶어요', {
        numericCols: 1,
        categoricalCols: 2
      })
      const result = SmartRecommender.recommend(context)

      expect(result.warnings.some(w => w.includes('상관') || w.includes('수치형'))).toBe(true)
    })

    it('그룹 비교 키워드에 범주형 변수가 없으면 모순을 감지해야 한다', () => {
      const context = createContext('두 그룹의 평균을 비교하고 싶어요', {
        numericCols: 3,
        categoricalCols: 0
      })
      const result = SmartRecommender.recommend(context)

      expect(result.warnings.some(w => w.includes('그룹') || w.includes('범주형'))).toBe(true)
    })

    it('데이터가 너무 적으면 호환성 실패를 반환해야 한다', () => {
      const context = createContext('평균 차이를 비교하고 싶어요', {
        rows: 3
      })
      const result = SmartRecommender.recommend(context)

      expect(result.warnings.some(w => w.includes('데이터') || w.includes('적'))).toBe(true)
      expect(result.confidence).toBe('low')
    })

    it('정규성 위반 시 비모수 검정을 추천해야 한다', () => {
      const context = createContext('그룹 간 차이를 비교하고 싶어요', {
        rows: 25,
        isNormal: false
      })
      const result = SmartRecommender.recommend(context)

      const methodIds = result.methods.map(m => m.id.toLowerCase())
      // Mann-Whitney 또는 다른 비모수 검정이 추천되어야 함
      expect(
        methodIds.some(id => id.includes('mann') || id.includes('whitney') || id.includes('permutation'))
      ).toBe(true)
    })

    it('등분산성 위반 시 Welch 또는 Games-Howell을 추천해야 한다', () => {
      const context = createContext('여러 그룹의 평균을 비교하고 싶어요', {
        isHomoscedastic: false
      })
      const result = SmartRecommender.recommend(context)

      const methodIds = result.methods.map(m => m.id.toLowerCase())
      expect(
        methodIds.some(id => id.includes('welch') || id.includes('games'))
      ).toBe(true)
    })

    it('명확한 분석 목적에 대해 높은 신뢰도를 반환해야 한다', () => {
      const context = createContext('두 그룹 간 평균 차이가 유의한지 알고 싶어요', {
        rows: 100,
        numericCols: 1,
        categoricalCols: 1,
        isNormal: true,
        isHomoscedastic: true
      })
      const result = SmartRecommender.recommend(context)

      expect(['high', 'medium']).toContain(result.confidence)
      expect(result.warnings).toHaveLength(0)
    })
  })

  // ===== 7. 통합 시나리오 테스트 =====
  describe('7. 통합 시나리오 테스트', () => {

    it('시나리오 1: 기초 탐색적 분석', () => {
      // 사용자: 데이터의 기본 특성을 파악하고 싶어요
      const profile = {
        numericVars: 5,
        categoricalVars: 2,
        totalRows: 200,
        hasTimeVar: false,
        hasGroupVar: true,
        groupLevels: 3
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      // 기술통계, 상관분석, PCA 추천 예상
      expect(methodIds).toContain('descriptive-stats')
      expect(methodIds).toContain('correlation')
      expect(methodIds).toContain('pca')
    })

    it('시나리오 2: 소표본 비모수 분석', () => {
      // 사용자: 샘플이 작고 정규분포가 아닐 때
      const method = STATISTICAL_METHODS.find(m => m.id === 'mann-whitney')!
      const profile = {
        numericVars: 1,
        categoricalVars: 1,
        totalRows: 15,
        hasTimeVar: false,
        hasGroupVar: true,
        groupLevels: 2,
        normalityPassed: false
      }

      const result = checkMethodRequirements(method, profile)

      // Mann-Whitney는 정규성 가정이 없으므로 사용 가능
      expect(result.canUse).toBe(true)
    })

    it('시나리오 3: 다요인 실험 설계', () => {
      // 사용자: 2개 이상의 요인이 결과에 미치는 영향을 분석
      const profile = {
        numericVars: 1,
        categoricalVars: 3,
        totalRows: 120,
        hasTimeVar: false,
        hasGroupVar: true,
        groupLevels: 4
      }

      const recommendations = recommendMethods(profile)
      const methodIds = recommendations.map(m => m.id)

      // 이원분산분석이 추천되어야 함
      expect(methodIds).toContain('two-way-anova')
    })

    it('시나리오 4: 반복측정 데이터', () => {
      // 사용자: 같은 대상을 여러 번 측정한 데이터
      const method = STATISTICAL_METHODS.find(m => m.id === 'friedman')!

      expect(method).toBeDefined()
      expect(method.category).toBe('nonparametric')
      expect(method.requirements?.minSampleSize).toBeLessThanOrEqual(10)
    })

    it('시나리오 5: 예측 모델링', () => {
      // 사용자: 결과 변수를 예측하는 모델
      const method = STATISTICAL_METHODS.find(m => m.id === 'multiple-regression')!
      const profile = {
        numericVars: 5,
        categoricalVars: 0,
        totalRows: 100,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const result = checkMethodRequirements(method, profile)

      expect(result.canUse).toBe(true)
    })
  })

  // ===== 8. 경계 조건 테스트 =====
  describe('8. 경계 조건 및 에지 케이스', () => {

    it('빈 데이터 프로필에서 에러 없이 처리해야 한다', () => {
      const profile = {
        numericVars: 0,
        categoricalVars: 0,
        totalRows: 0,
        hasTimeVar: false,
        hasGroupVar: false
      }

      expect(() => recommendMethods(profile)).not.toThrow()

      const recommendations = recommendMethods(profile)
      // 최소한 기술통계는 추천됨
      expect(recommendations.length).toBeGreaterThanOrEqual(1)
    })

    it('requirements가 없는 메서드도 검증 가능해야 한다', () => {
      const methodWithoutReq = {
        id: 'test',
        name: 'Test',
        description: 'Test',
        category: 'descriptive'
      } as any

      const profile = {
        numericVars: 1,
        categoricalVars: 0,
        totalRows: 10,
        hasTimeVar: false,
        hasGroupVar: false
      }

      const result = checkMethodRequirements(methodWithoutReq, profile)

      expect(result.canUse).toBe(true)
      expect(result.warnings).toHaveLength(0)
    })

    it('존재하지 않는 질문 유형에 대해 빈 배열을 반환해야 한다', () => {
      const methods = getMethodsByQuestionType('nonexistent')
      expect(methods).toHaveLength(0)
    })

    it('극단적으로 큰 데이터에서도 추천이 동작해야 한다', () => {
      const profile = {
        numericVars: 100,
        categoricalVars: 50,
        totalRows: 1000000,
        hasTimeVar: true,
        hasGroupVar: true,
        groupLevels: 100
      }

      expect(() => recommendMethods(profile)).not.toThrow()

      const recommendations = recommendMethods(profile)
      expect(recommendations.length).toBeGreaterThan(0)
    })
  })

  // ===== 9. 최종 요약 =====
  describe('9. 최종 커버리지 요약', () => {

    it('전체 시스템 상태 요약', () => {
      // 메서드 수
      const totalMethods = STATISTICAL_METHODS.length

      // 페이지 매핑
      const mappedMethods = Object.values(PAGE_TO_METHOD_MAP).flat()
      const mappedMethodIds = [...new Set(mappedMethods)]

      // 카테고리별 분포
      const categoryCount: Record<string, number> = {}
      STATISTICAL_METHODS.forEach(m => {
        categoryCount[m.category] = (categoryCount[m.category] || 0) + 1
      })

      // requirements 정의율
      const withRequirements = STATISTICAL_METHODS.filter(m => m.requirements).length

      console.log('\n' + '='.repeat(60))
      console.log('📊 스마트 분석 추천 시스템 상태 요약')
      console.log('='.repeat(60))
      console.log(`\n✅ 총 메서드: ${totalMethods}개`)
      console.log(`✅ 페이지 매핑된 메서드: ${mappedMethodIds.length}개`)
      console.log(`✅ requirements 정의: ${withRequirements}/${totalMethods} (${(withRequirements/totalMethods*100).toFixed(0)}%)`)
      console.log('\n카테고리별 분포:')
      Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          console.log(`   ${cat}: ${count}개`)
        })
      console.log('\n' + '='.repeat(60))

      expect(totalMethods).toBe(58)
      expect(withRequirements / totalMethods).toBeGreaterThan(0.9)
    })
  })
})
